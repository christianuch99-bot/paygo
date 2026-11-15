import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Transaction } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  transactions: Transaction[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, refCode?: string) => Promise<{ success: boolean; error?: string }>;
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
              balance: existing.balance !== undefined ? existing.balance : 50000,
              referralBalance: existing.referralBalance || 0,
              totalReferrals: existing.totalReferrals || 0,
              accountLevel: existing.accountLevel || 'Basic',
            });
            const txs = JSON.parse(localStorage.getItem(`paygo_transactions_${cleanEmail}`) || '[]');
            setTransactions(txs);
          } else {
            // Auto create session if currentEmail exists
            const cleanRefCode = cleanEmail.split('@')[0].toLowerCase();
            const newUser: User = {
              name: cleanEmail.split('@')[0],
              email: cleanEmail,
              balance: 50000,
              referralBalance: 0,
              totalReferrals: 0,
              accountLevel: 'Basic',
              referralCode: cleanRefCode,
            };
            setUser(newUser);
            setTransactions([
              {
                id: `TXN-${Date.now()}`,
                type: 'Welcome Bonus',
                amount: 50000,
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

  // Show refer popup after initial delay if user is on dashboard
  useEffect(() => {
    if (user && isWelcomeComplete && isOnboardingComplete) {
      const timer = setTimeout(() => {
        setShowReferPopup(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [user, isWelcomeComplete, isOnboardingComplete]);

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
        users[inviterIdx].referralBalance = (users[inviterIdx].referralBalance || 0) + 5000;
        users[inviterIdx].totalReferrals = (users[inviterIdx].totalReferrals || 0) + 1;
        localStorage.setItem('paygo_users', JSON.stringify(users));

        // If current user is the inviter, update state as well
        if (user && user.email.toLowerCase() === users[inviterIdx].email.toLowerCase()) {
          setUser({ ...users[inviterIdx] });
        }
      }

      // 2. Cloud Firestore update across all devices!
      try {
        const directDoc = await getDoc(doc(db, 'users', cleanTarget));
        if (directDoc.exists()) {
          const data = directDoc.data();
          await updateDoc(doc(db, 'users', cleanTarget), {
            referralBalance: (data.referralBalance || 0) + 5000,
            totalReferrals: (data.totalReferrals || 0) + 1,
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Query by referralCode
          const q = query(collection(db, 'users'), where('referralCode', '==', cleanTarget));
          const snaps = await getDocs(q);
          snaps.forEach(async (d) => {
            const data = d.data();
            await updateDoc(doc(db, 'users', d.id), {
              referralBalance: (data.referralBalance || 0) + 5000,
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

  const login = async (email: string, _password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return { success: false, error: 'Please enter a valid email address' };
      }

      let users: User[] = JSON.parse(localStorage.getItem('paygo_users') || '[]');
      let found = users.find((u) => u.email.toLowerCase() === cleanEmail);

      // Check Firestore if not found in localStorage
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
        found = {
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          balance: 50000,
          referralBalance: 0,
          totalReferrals: 0,
          accountLevel: 'Basic',
          referralCode: cleanEmail.split('@')[0].toLowerCase(),
        };
        users.push(found);
        localStorage.setItem('paygo_users', JSON.stringify(users));

        // Save to Firestore
        try {
          await setDoc(doc(db, 'users', cleanEmail), found, { merge: true });
        } catch (err) {
          console.warn('Cloud save fallback:', err);
        }
      }

      const userData: User = {
        name: found.name,
        email: found.email,
        balance: found.balance !== undefined ? found.balance : 50000,
        referralBalance: found.referralBalance || 0,
        totalReferrals: found.totalReferrals || 0,
        accountLevel: found.accountLevel || 'Basic',
        avatarUrl: found.avatarUrl,
        referralCode: found.referralCode || found.email.split('@')[0].toLowerCase(),
      };

      setUser(userData);
      localStorage.setItem('paygo_current_user', cleanEmail);

      let txs = JSON.parse(localStorage.getItem(`paygo_transactions_${cleanEmail}`) || '[]');
      if (txs.length === 0) {
        txs = [
          {
            id: `TXN-${Date.now()}`,
            type: 'Welcome Bonus',
            amount: 50000,
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
    _password: string,
    refCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !name) {
        return { success: false, error: 'Please fill in all required fields' };
      }

      const personalCode = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || cleanEmail.split('@')[0];

      const newUser: User = {
        name: name.trim(),
        email: cleanEmail,
        balance: 50000,
        referralBalance: 0,
        totalReferrals: 0,
        accountLevel: 'Basic',
        referralCode: personalCode,
      };

      // 1. Save to local storage for instantaneous responsiveness
      let users: User[] = JSON.parse(localStorage.getItem('paygo_users') || '[]');
      const existingIdx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        users[existingIdx] = newUser;
      } else {
        users.push(newUser);
      }
      localStorage.setItem('paygo_users', JSON.stringify(users));
      localStorage.setItem('paygo_current_user', cleanEmail);

      const initialTx: Transaction = {
        id: `TXN-${Date.now()}`,
        type: 'Welcome Bonus',
        amount: 50000,
        date: new Date().toLocaleString(),
      };
      const initialTxs = [initialTx];
      localStorage.setItem(`paygo_transactions_${cleanEmail}`, JSON.stringify(initialTxs));

      // 2. Persist to Firestore database so all devices have access
      try {
        await setDoc(
          doc(db, 'users', cleanEmail),
          {
            ...newUser,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
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

      return { success: true };
    } catch (e) {
      console.error('Registration error:', e);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setTransactions([]);
    localStorage.removeItem('paygo_current_user');
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
  };

  const updateBalance = (amountToDeduct: number) => {
    if (!user) return;
    const newBalance = Math.max(0, (user.balance || 50000) - amountToDeduct);
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
    const newRefBal = (user.referralBalance || 0) + 5000;
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
        users[idx] = updatedUser;
      } else {
        users.push(updatedUser);
      }
      localStorage.setItem('paygo_users', JSON.stringify(users));

      // Sync update to Firestore
      try {
        await setDoc(doc(db, 'users', updatedUser.email.toLowerCase()), updatedUser, { merge: true });
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
