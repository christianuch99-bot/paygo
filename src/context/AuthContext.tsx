import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Transaction } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { COUNTRY_DIAL_CODES } from '../data/countryCodes';

const ADMIN_OWNER_EMAIL = 'ibro88977@gmail.com';
export const SAVED_LOGIN_STORAGE_KEY = 'paygo_saved_login';

export interface SavedLoginDetails {
  method: 'email' | 'phone';
  email?: string;
  dialCode?: string;
  phoneDigits?: string;
}

const hashPassword = async (rawPassword: string, accountKey: string): Promise<string> => {
  const input = `paygo_cred_v1:${accountKey.trim().toLowerCase()}:${rawPassword}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback deterministic 64-char hex below
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`.repeat(4).slice(0, 64);
};

const splitPhoneParts = (fullNumber: string): { dialCode: string; phoneDigits: string } => {
  const matched = COUNTRY_DIAL_CODES.slice()
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => fullNumber.startsWith(c.code));
  if (matched) {
    return { dialCode: matched.code, phoneDigits: fullNumber.slice(matched.code.length) };
  }
  return { dialCode: '+1', phoneDigits: fullNumber.replace(/\D/g, '') };
};

export const saveRememberedLogin = (details: SavedLoginDetails) => {
  try {
    localStorage.setItem(SAVED_LOGIN_STORAGE_KEY, JSON.stringify(details));
  } catch {
    // ignore storage errors
  }
};

export const clearRememberedLogin = () => {
  try {
    localStorage.removeItem(SAVED_LOGIN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

export const getRememberedLogin = (): SavedLoginDetails | null => {
  try {
    const raw = localStorage.getItem(SAVED_LOGIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.method === 'email' || parsed.method === 'phone')) {
      return parsed as SavedLoginDetails;
    }
  } catch {
    // ignore parse errors
  }
  return null;
};

interface AuthContextType {
  user: User | null;
  transactions: Transaction[];
  login: (identifier: string, password: string, method?: 'email' | 'phone') => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
    refCode?: string,
    method?: 'email' | 'phone'
  ) => Promise<{ success: boolean; error?: string; verificationNotice?: string }>;
  logout: () => void;
  isOnboardingComplete: boolean;
  isWelcomeComplete: boolean;
  showReferPopup: boolean;
  completeOnboarding: () => void;
  completeWelcome: () => void;
  hideReferPopup: () => void;
  updateBalance: (amountToDeduct: number) => void;
  addBalance: (amountToAdd: number) => void;
  updateReferralBalance: (amountToDeduct: number) => void;
  addReferral: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  clearTransactions: () => void;
  updateUser: (fields: Partial<User>) => void;
  creditReferralBonus: (refCode: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizePhone = (raw: string): string => {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`;
  }
  return `+1${digits}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(true);
  const [isWelcomeComplete, setIsWelcomeComplete] = useState<boolean>(true);
  const [showReferPopup, setShowReferPopup] = useState<boolean>(false);

  // Initialize session from localStorage or sync with Firestore
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentEmail = localStorage.getItem('paygo_current_user');
        if (currentEmail) {
          const cleanEmail = currentEmail.trim().toLowerCase();
          const users: User[] = JSON.parse(localStorage.getItem('paygo_users') || '[]');
          let existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

          // If not in local storage, check Firestore
          if (!existing) {
            try {
              const remoteDoc = await getDoc(doc(db, 'users', cleanEmail));
              if (remoteDoc.exists()) {
                existing = remoteDoc.data() as User;
                users.push(existing);
                localStorage.setItem('paygo_users', JSON.stringify(users));
              }
            } catch (cloudErr) {
              console.warn('Initial cloud user fetch fallback:', cloudErr);
            }
          }

          if (existing) {
            const cleanRefCode =
              existing.referralCode ||
              (existing.name
                ? existing.name.toLowerCase().replace(/[^a-z0-9]/g, '')
                : cleanEmail.split('@')[0].toLowerCase());
            setUser({
              ...existing,
              referralCode: cleanRefCode,
              balance: existing.balance !== undefined ? existing.balance : 12435.33,
              referralBalance: existing.referralBalance || 0,
              totalReferrals: existing.totalReferrals || 0,
              accountLevel: existing.accountLevel || 'Basic',
              kycVerified: existing.kycVerified ?? false,
              kycStatus: existing.kycStatus || (existing.kycVerified ? 'verified' : 'unverified'),
              kycRejectionReason: existing.kycRejectionReason,
              kycStatusId: existing.kycStatusId,
              cardRejectionReason: existing.cardRejectionReason,
            });
            const txs = JSON.parse(localStorage.getItem(`paygo_transactions_${cleanEmail}`) || '[]');
            setTransactions(txs);
          } else {
            const cleanRefCode = cleanEmail.split('@')[0].toLowerCase();
            const newUser: User = {
              name: cleanEmail.split('@')[0],
              email: cleanEmail,
              balance: 12435.33,
              referralBalance: 0,
              totalReferrals: 0,
              accountLevel: 'Basic',
              referralCode: cleanRefCode,
              kycVerified: false,
              kycStatus: 'unverified',
            };
            setUser(newUser);
            setTransactions([
              {
                id: `TXN-${Date.now()}`,
                type: 'Welcome Bonus',
                amount: 12435.33,
                date: new Date().toLocaleString(),
              },
            ]);
          }
          setIsOnboardingComplete(localStorage.getItem(`paygo_onboarding_${cleanEmail}`) === 'true');
          setIsWelcomeComplete(localStorage.getItem(`paygo_welcome_${cleanEmail}`) === 'true');
        }
      } catch (e) {
        console.error('Session restoration error:', e);
      }
    };

    initAuth();
  }, []);

  // Real-time cloud sync for active user (e.g., if admin approves/revokes PAY ID, tier, or KYC verification)
  useEffect(() => {
    const cleanEmail = user?.email?.trim().toLowerCase();
    if (!cleanEmail) return;

    const unsub = onSnapshot(
      doc(db, 'users', cleanEmail),
      (snap) => {
        if (!snap.exists()) return;
        const remote = snap.data() as User;
        setUser((prev) => {
          if (!prev || prev.email.toLowerCase() !== cleanEmail) return prev;
          if (
            prev.payIdVerified === remote.payIdVerified &&
            prev.accountLevel === remote.accountLevel &&
            prev.kycVerified === remote.kycVerified &&
            prev.kycStatus === remote.kycStatus &&
            prev.kycRejectionReason === remote.kycRejectionReason &&
            prev.kycStatusId === remote.kycStatusId &&
            prev.cardRejectionReason === remote.cardRejectionReason &&
            prev.emailVerified === remote.emailVerified &&
            prev.phoneVerified === remote.phoneVerified &&
            prev.referralBalance === remote.referralBalance &&
            prev.totalReferrals === remote.totalReferrals &&
            prev.avatarUrl === remote.avatarUrl &&
            prev.passwordHash === (remote.passwordHash || prev.passwordHash)
          ) {
            return prev;
          }
          const merged: User = {
            ...prev,
            payIdVerified: remote.payIdVerified,
            accountLevel: remote.accountLevel || prev.accountLevel,
            kycVerified: remote.kycVerified ?? prev.kycVerified,
            kycStatus: remote.kycStatus || prev.kycStatus,
            kycRejectionReason: remote.kycRejectionReason ?? prev.kycRejectionReason,
            kycStatusId: remote.kycStatusId || prev.kycStatusId,
            cardRejectionReason: remote.cardRejectionReason ?? prev.cardRejectionReason,
            emailVerified: remote.emailVerified ?? prev.emailVerified,
            phoneVerified: remote.phoneVerified ?? prev.phoneVerified,
            referralBalance: remote.referralBalance ?? prev.referralBalance,
            totalReferrals: remote.totalReferrals ?? prev.totalReferrals,
            avatarUrl: remote.avatarUrl !== undefined ? remote.avatarUrl : prev.avatarUrl,
            passwordHash: remote.passwordHash || prev.passwordHash,
          };
          try {
            const users: User[] = JSON.parse(localStorage.getItem('paygo_users') || '[]');
            const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
            if (idx !== -1) {
              users[idx] = merged;
              localStorage.setItem('paygo_users', JSON.stringify(users));
            }
          } catch {
            // ignore storage errors
          }
          return merged;
        });
      },
      (err) => {
        console.warn('User profile sync listener warning:', err);
      }
    );

    return () => unsub();
  }, [user?.email]);

  // Show Refer & Earn share popup every 10 minutes instead of on every render/login
  useEffect(() => {
    if (!user || !isWelcomeComplete || !isOnboardingComplete) {
      setShowReferPopup(false);
      return;
    }

    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const storageKey = `paygo_refer_popup_last_shown_${user.email.toLowerCase()}`;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextPopup = () => {
      const stored = localStorage.getItem(storageKey);
      const now = Date.now();
      let lastShown = stored ? parseInt(stored, 10) : NaN;

      if (Number.isNaN(lastShown)) {
        lastShown = now;
        localStorage.setItem(storageKey, String(now));
      }

      const elapsed = now - lastShown;
      const delay = elapsed >= TEN_MINUTES_MS ? TEN_MINUTES_MS : TEN_MINUTES_MS - elapsed;

      timeoutId = setTimeout(() => {
        localStorage.setItem(storageKey, String(Date.now()));
        setShowReferPopup(true);
        scheduleNextPopup();
      }, delay);
    };

    scheduleNextPopup();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user?.email, isWelcomeComplete, isOnboardingComplete]);

  const creditReferralBonus = async (refCode: string) => {
    if (!refCode) return;
    try {
      const cleanTarget = refCode.trim().toLowerCase();

      // 1. Update local storage for current device
      const users: User[] = JSON.parse(localStorage.getItem('paygo_users') || '[]');
      const inviterIdx = users.findIndex(
        (u) =>
          (u.referralCode && u.referralCode.toLowerCase() === cleanTarget) ||
          u.email.toLowerCase().includes(cleanTarget) ||
          (u.name && u.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget)
      );

      if (inviterIdx !== -1) {
        users[inviterIdx].referralBalance = (users[inviterIdx].referralBalance || 0) + 25;
        users[inviterIdx].totalReferrals = (users[inviterIdx].totalReferrals || 0) + 1;
        localStorage.setItem('paygo_users', JSON.stringify(users));

        if (user && user.email.toLowerCase() === users[inviterIdx].email.toLowerCase()) {
          setUser({ ...users[inviterIdx] });
        }
      }

      // 2. Cloud Firestore update across all devices
      try {
        const directDoc = await getDoc(doc(db, 'users', cleanTarget));
        if (directDoc.exists()) {
          const data = directDoc.data();
          await updateDoc(doc(db, 'users', cleanTarget), {
            referralBalance: (data.referralBalance || 0) + 25,
            totalReferrals: (data.totalReferrals || 0) + 1,
            updatedAt: new Date().toISOString(),
          });
        } else {
          const q = query(collection(db, 'users'), where('referralCode', '==', cleanTarget));
          const snaps = await getDocs(q);
          snaps.forEach(async (d) => {
            const data = d.data();
            await updateDoc(doc(db, 'users', d.id), {
              referralBalance: (data.referralBalance || 0) + 25,
              totalReferrals: (data.totalReferrals || 0) + 1,
              updatedAt: new Date().toISOString(),
            });
          });
        }
      } catch (cloudErr) {
        console.warn('Cloud referral credit fallback:', cloudErr);
      }
    } catch (e) {
      console.error('Error crediting referral bonus:', e);
    }
  };

  const login = async (
    identifier: string,
    password: string,
    method: 'email' | 'phone' = 'email'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const trimmed = identifier.trim();
      if (!trimmed) {
        return {
          success: false,
          error: method === 'phone' ? 'Please enter a valid phone number' : 'Please enter a valid email address',
        };
      }
      if (!password) {
        return { success: false, error: 'Please enter your password' };
      }

      let users: User[] = JSON.parse(localStorage.getItem('paygo_users') || '[]');
      let found: User | undefined;
      let cleanEmail = '';

      if (method === 'phone') {
        const normalizedPhone = normalizePhone(trimmed);
        const phoneDigitCount = normalizedPhone.replace(/\D/g, '').length;
        if (!normalizedPhone || phoneDigitCount < 7) {
          return { success: false, error: 'Please enter a valid phone number with country code' };
        }

        const digitsOnly = normalizedPhone.replace(/\D/g, '');
        const fallbackPhoneKey = `${digitsOnly}@phone.paygo.com`;

        found = users.find(
          (u) =>
            (u.phone && normalizePhone(u.phone) === normalizedPhone) ||
            u.email.toLowerCase() === fallbackPhoneKey
        );

        if (!found) {
          try {
            const directDoc = await getDoc(doc(db, 'users', fallbackPhoneKey));
            if (directDoc.exists()) {
              found = directDoc.data() as User;
            } else {
              const q = query(collection(db, 'users'), where('phone', '==', normalizedPhone));
              const snaps = await getDocs(q);
              if (!snaps.empty) {
                found = snaps.docs[0].data() as User;
              }
            }
            if (found) {
              users.push(found);
              localStorage.setItem('paygo_users', JSON.stringify(users));
            }
          } catch (remoteErr) {
            console.warn('Remote phone user check fallback:', remoteErr);
          }
        }

        if (!found) {
          return {
            success: false,
            error: 'No account found with this phone number. Please create an account first.',
          };
        }

        cleanEmail = found.email.toLowerCase();
      } else {
        cleanEmail = trimmed.toLowerCase();
        if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
          return { success: false, error: 'Please enter a valid email address (e.g. name@gmail.com)' };
        }

        const isAdminEmail = cleanEmail === ADMIN_OWNER_EMAIL;
        let firebaseEmailVerified = false;
        let firebaseAuthenticated = false;

        if (!isAdminEmail && password) {
          try {
            const authPassword = password.length >= 6 ? password : `${password}__pg`;
            const cred = await signInWithEmailAndPassword(auth, cleanEmail, authPassword);
            firebaseEmailVerified = cred.user.emailVerified;
            firebaseAuthenticated = true;
          } catch (authErr: any) {
            if (authErr?.code === 'auth/wrong-password') {
              return { success: false, error: 'Incorrect password. Please try again.' };
            }
          }
        }

        found = users.find((u) => u.email.toLowerCase() === cleanEmail);

        if (!found) {
          try {
            const remoteDoc = await getDoc(doc(db, 'users', cleanEmail));
            if (remoteDoc.exists()) {
              found = remoteDoc.data() as User;
              users.push(found);
              localStorage.setItem('paygo_users', JSON.stringify(users));
            }
          } catch (remoteErr) {
            console.warn('Remote user check fallback:', remoteErr);
          }
        }

        if (!found) {
          if (isAdminEmail || firebaseAuthenticated) {
            found = {
              name: cleanEmail.split('@')[0],
              email: cleanEmail,
              balance: 12435.33,
              referralBalance: 0,
              totalReferrals: 0,
              accountLevel: 'Basic',
              referralCode: cleanEmail.split('@')[0].toLowerCase(),
              emailVerified: isAdminEmail || firebaseEmailVerified,
              phoneVerified: isAdminEmail,
              authMethod: 'email',
            };
          } else {
            return {
              success: false,
              error: 'No account found with this email address. Please create an account first.',
            };
          }
        } else if (firebaseEmailVerified && !found.emailVerified) {
          found = { ...found, emailVerified: true };
        }
      }

      // Verify saved credential hash (and backfill legacy accounts that didn't store passwordHash yet)
      const enteredHash = await hashPassword(password, found.email.toLowerCase());
      if (found.passwordHash) {
        if (found.passwordHash !== enteredHash) {
          return { success: false, error: 'Incorrect password. Please try again.' };
        }
      } else {
        found = { ...found, passwordHash: enteredHash };
        const idx = users.findIndex((u) => u.email.toLowerCase() === found!.email.toLowerCase());
        if (idx !== -1) {
          users[idx] = found;
        } else {
          users.push(found);
        }
        localStorage.setItem('paygo_users', JSON.stringify(users));
        try {
          await setDoc(
            doc(db, 'users', found.email.toLowerCase()),
            { passwordHash: enteredHash, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        } catch (err) {
          console.warn('Cloud credential backfill fallback:', err);
        }
      }

      const isAdminEmail = cleanEmail === ADMIN_OWNER_EMAIL;
      const resolvedAuthMethod: 'email' | 'phone' =
        found.authMethod ||
        (cleanEmail.endsWith('@phone.paygo.com') ? 'phone' : method);
      const userData: User = {
        name: found.name,
        email: found.email,
        phone: found.phone,
        balance: found.balance !== undefined ? found.balance : 12435.33,
        referralBalance: found.referralBalance || 0,
        totalReferrals: found.totalReferrals || 0,
        accountLevel: found.accountLevel || 'Basic',
        avatarUrl: found.avatarUrl,
        referralCode: found.referralCode || found.email.split('@')[0].toLowerCase(),
        payIdVerified: found.payIdVerified,
        kycVerified: found.kycVerified ?? false,
        kycStatus: found.kycStatus || (found.kycVerified ? 'verified' : 'unverified'),
        kycRejectionReason: found.kycRejectionReason,
        kycStatusId: found.kycStatusId,
        emailVerified: true,
        phoneVerified: true,
        authMethod: resolvedAuthMethod,
        passwordHash: found.passwordHash,
      };

      setUser(userData);
      localStorage.setItem('paygo_current_user', cleanEmail);

      let txs = JSON.parse(localStorage.getItem(`paygo_transactions_${cleanEmail}`) || '[]');
      if (txs.length === 0) {
        txs = [
          {
            id: `TXN-${Date.now()}`,
            type: 'Welcome Bonus',
            amount: 12435.33,
            date: new Date().toLocaleString(),
          },
        ];
        localStorage.setItem(`paygo_transactions_${cleanEmail}`, JSON.stringify(txs));
      }
      setTransactions(txs);
      setIsWelcomeComplete(true);
      setIsOnboardingComplete(true);

      return { success: true };
    } catch (e) {
      console.error('Login error:', e);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    refCode?: string,
    method: 'email' | 'phone' = 'email'
  ): Promise<{ success: boolean; error?: string; verificationNotice?: string }> => {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return { success: false, error: 'Please enter your full name' };
      }

      let cleanEmail = email.trim().toLowerCase();
      const normalizedPhone = phone ? normalizePhone(phone) : '';
      const phoneDigitCount = normalizedPhone.replace(/\D/g, '').length;

      if (method === 'phone') {
        if (!normalizedPhone || phoneDigitCount < 7) {
          return { success: false, error: 'Please enter a valid phone number with country code' };
        }
        const digitsOnly = normalizedPhone.replace(/\D/g, '');
        if (!cleanEmail) {
          cleanEmail = `${digitsOnly}@phone.paygo.com`;
        }
      } else {
        if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
          return { success: false, error: 'Please enter a valid email address (e.g. name@gmail.com)' };
        }
      }

      const isAdminEmail = cleanEmail === ADMIN_OWNER_EMAIL;
      const users: User[] = JSON.parse(localStorage.getItem('paygo_users') || '[]');

      // Check for duplicate existing account on this device or Firestore
      if (!isAdminEmail) {
        let existingUser = users.find(
          (u) =>
            u.email.toLowerCase() === cleanEmail ||
            (method === 'phone' && normalizedPhone && u.phone && normalizePhone(u.phone) === normalizedPhone)
        );
        if (!existingUser) {
          try {
            const directDoc = await getDoc(doc(db, 'users', cleanEmail));
            if (directDoc.exists()) {
              existingUser = directDoc.data() as User;
            } else if (method === 'phone' && normalizedPhone) {
              const q = query(collection(db, 'users'), where('phone', '==', normalizedPhone));
              const snaps = await getDocs(q);
              if (!snaps.empty) {
                existingUser = snaps.docs[0].data() as User;
              }
            }
          } catch (dupErr) {
            console.warn('Duplicate account check fallback:', dupErr);
          }
        }
        if (existingUser && existingUser.passwordHash) {
          return {
            success: false,
            error: 'An account with these details already exists. Please use Login instead.',
          };
        }
      }

      let firebaseEmailVerified = isAdminEmail;
      let verificationNotice: string | undefined;

      // For email sign-up (except admin), initialize Firebase Auth user if enabled
      if (method === 'email' && !isAdminEmail) {
        try {
          const authPassword = password.length >= 6 ? password : `${password}__pg`;
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, authPassword);
          firebaseEmailVerified = cred.user.emailVerified;
        } catch (fbErr: any) {
          if (fbErr?.code === 'auth/email-already-in-use') {
            try {
              const authPassword = password.length >= 6 ? password : `${password}__pg`;
              const signInCred = await signInWithEmailAndPassword(auth, cleanEmail, authPassword);
              firebaseEmailVerified = signInCred.user.emailVerified;
            } catch {
              // Handled in VerificationGate via 6-digit Email OTP or Google Sign-In
            }
          } else {
            console.warn('Firebase email registration notice:', fbErr?.code || fbErr?.message);
          }
        }
      }

      const personalCode = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '') || cleanEmail.split('@')[0];
      const passwordHash = await hashPassword(password, cleanEmail);

      const newUser: User = {
        name: trimmedName,
        email: cleanEmail,
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        balance: 12435.33,
        referralBalance: 0,
        totalReferrals: 0,
        accountLevel: 'Basic',
        referralCode: personalCode,
        kycVerified: false,
        kycStatus: 'unverified',
        emailVerified: isAdminEmail ? true : method === 'email' ? firebaseEmailVerified : false,
        phoneVerified: isAdminEmail ? true : false,
        authMethod: method,
        passwordHash,
      };

      // 1. Save to local storage for instantaneous responsiveness & credential persistence
      const existingIdx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        users[existingIdx] = newUser;
      } else {
        users.push(newUser);
      }
      localStorage.setItem('paygo_users', JSON.stringify(users));
      localStorage.setItem('paygo_current_user', cleanEmail);

      // Save non-sensitive device login identifier so Login pre-fills automatically
      if (method === 'phone' && normalizedPhone) {
        const parts = splitPhoneParts(normalizedPhone);
        saveRememberedLogin({
          method: 'phone',
          dialCode: parts.dialCode,
          phoneDigits: parts.phoneDigits,
        });
      } else {
        saveRememberedLogin({
          method: 'email',
          email: cleanEmail,
        });
      }

      const initialTx: Transaction = {
        id: `TXN-${Date.now()}`,
        type: 'Welcome Bonus',
        amount: 12435.33,
        date: new Date().toLocaleString(),
      };
      const initialTxs = [initialTx];
      localStorage.setItem(`paygo_transactions_${cleanEmail}`, JSON.stringify(initialTxs));

      // 2. Persist to Firestore database so all devices can log in with the same details
      try {
        const firestorePayload = Object.fromEntries(
          Object.entries({
            ...newUser,
            createdAt: new Date().toISOString(),
          }).filter(([, val]) => val !== undefined)
        );
        await setDoc(doc(db, 'users', cleanEmail), firestorePayload, { merge: true });
      } catch (cloudErr) {
        console.warn('Cloud save fallback on register:', cloudErr);
      }

      // 3. Credit the inviter across devices if a referral code was passed
      if (refCode) {
        creditReferralBonus(refCode);
      }

      setUser(newUser);
      setTransactions(initialTxs);
      setIsWelcomeComplete(false);
      setIsOnboardingComplete(false);
      localStorage.setItem(`paygo_welcome_${cleanEmail}`, 'false');
      localStorage.setItem(`paygo_onboarding_${cleanEmail}`, 'false');

      return { success: true, verificationNotice };
    } catch (e) {
      console.error('Registration error:', e);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setShowReferPopup(false);
    setUser(null);
    setTransactions([]);
    localStorage.removeItem('paygo_current_user');
    signOut(auth).catch(() => {});
  };

  const completeWelcome = () => {
    setIsWelcomeComplete(true);
    if (user) {
      localStorage.setItem(`paygo_welcome_${user.email}`, 'true');
    }
  };

  const completeOnboarding = () => {
    setIsOnboardingComplete(true);
    if (user) {
      localStorage.setItem(`paygo_onboarding_${user.email}`, 'true');
    }
  };

  const hideReferPopup = () => {
    setShowReferPopup(false);
    if (user) {
      localStorage.setItem(
        `paygo_refer_popup_last_shown_${user.email.toLowerCase()}`,
        String(Date.now())
      );
    }
  };

  const updateBalance = (amountToDeduct: number) => {
    if (!user) return;
    const newBalance = Math.max(0, (user.balance || 12435.33) - amountToDeduct);
    const updated = { ...user, balance: newBalance };
    setUser(updated);
    updateLocalStorageUser(updated);
  };

  const addBalance = (amountToAdd: number) => {
    if (!user) return;
    const newBalance = (user.balance || 0) + amountToAdd;
    const updated = { ...user, balance: newBalance };
    setUser(updated);
    updateLocalStorageUser(updated);
  };

  const updateReferralBalance = (amountToDeduct: number) => {
    if (!user) return;
    const newRefBal = Math.max(0, (user.referralBalance || 0) - amountToDeduct);
    const updated = { ...user, referralBalance: newRefBal };
    setUser(updated);
    updateLocalStorageUser(updated);
  };

  const addReferral = () => {
    if (!user) return;
    const newRefBal = (user.referralBalance || 0) + 25;
    const newCount = (user.totalReferrals || 0) + 1;
    const updated = { ...user, referralBalance: newRefBal, totalReferrals: newCount };
    setUser(updated);
    updateLocalStorageUser(updated);
  };

  const updateLocalStorageUser = async (updatedUser: User) => {
    try {
      const users: User[] = JSON.parse(localStorage.getItem('paygo_users') || '[]');
      const idx = users.findIndex((u) => u.email.toLowerCase() === updatedUser.email.toLowerCase());
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updatedUser };
      } else {
        users.push(updatedUser);
      }
      localStorage.setItem('paygo_users', JSON.stringify(users));

      // Sync update to Firestore (strip undefined values)
      try {
        const cleanUser = Object.fromEntries(
          Object.entries({
            ...updatedUser,
            updatedAt: new Date().toISOString(),
          }).filter(([, val]) => val !== undefined)
        );
        await setDoc(doc(db, 'users', updatedUser.email.toLowerCase()), cleanUser, { merge: true });
      } catch (cloudErr) {
        console.warn('Cloud update fallback:', cloudErr);
      }
    } catch (e) {
      console.error('Error updating user storage:', e);
    }
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    const newTx: Transaction = {
      ...transaction,
      id: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    localStorage.setItem(`paygo_transactions_${user.email}`, JSON.stringify(updated));
  };

  const clearTransactions = () => {
    if (!user) return;
    setTransactions([]);
    localStorage.removeItem(`paygo_transactions_${user.email}`);
  };

  const updateUser = (fields: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...fields };
    setUser(updated);
    updateLocalStorageUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        transactions,
        login,
        register,
        logout,
        isWelcomeComplete,
        isOnboardingComplete,
        showReferPopup,
        completeOnboarding,
        completeWelcome,
        hideReferPopup,
        updateBalance,
        addBalance,
        updateReferralBalance,
        addReferral,
        addTransaction,
        clearTransactions,
        updateUser,
        creditReferralBonus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
