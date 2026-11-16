import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Receipt,
  Zap,
  Smartphone,
  Wifi,
  Droplets,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';

interface BillPaymentProps {
  onBack: () => void;
}

interface BillCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  accountLabel: string;
  accountPlaceholder: string;
  providers: string[];
}

const BILL_CATEGORIES: BillCategory[] = [
  {
    id: 'electricity',
    label: 'Electricity',
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    accountLabel: 'Meter / Account Number',
    accountPlaceholder: 'e.g. MTR-48291034',
    providers: ['ConEdison Power', 'PG&E Electric', 'Duke Energy', 'City Power Grid'],
  },
  {
    id: 'internet',
    label: 'Internet & TV',
    icon: <Wifi className="w-5 h-5 text-blue-600" />,
    accountLabel: 'Subscriber / Decoder ID',
    accountPlaceholder: 'e.g. SUB-90412881',
    providers: ['Starlink Internet', 'Xfinity Fiber', 'Verizon Fios', 'AT&T Fiber TV'],
  },
  {
    id: 'water',
    label: 'Water & Gas',
    icon: <Droplets className="w-5 h-5 text-emerald-600" />,
    accountLabel: 'Utility Account Number',
    accountPlaceholder: 'e.g. UTL-33019284',
    providers: ['Metro Water Utility', 'National Grid Gas', 'CleanWater Services', 'City Gas Co.'],
  },
];

const PRESET_AMOUNTS = [25, 50, 100, 250];

export const BillPayment: React.FC<BillPaymentProps> = ({ onBack }) => {
  const { user, updateBalance, addTransaction } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<BillCategory>(BILL_CATEGORIES[0]);
  const [provider, setProvider] = useState<string>(BILL_CATEGORIES[0].providers[0]);
  const [accountRef, setAccountRef] = useState('');
  const [amount, setAmount] = useState('50');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [receiptRef, setReceiptRef] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleCategorySelect = (cat: BillCategory) => {
    setSelectedCategory(cat);
    setProvider(cat.providers[0]);
    setErrorMsg('');
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isProcessing && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (isProcessing && countdown === 0) {
      const paidAmt = parseFloat(amount);
      updateBalance(paidAmt);
      addTransaction({
        type: 'Bill Payment',
        amount: paidAmt,
        billProvider: provider,
        billAccount: accountRef.trim(),
        date: new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(),
      });
      setIsProcessing(false);
      setIsSuccess(true);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isProcessing, countdown]);

  const handlePayBill = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const paidAmt = parseFloat(amount);
    if (!accountRef.trim() || accountRef.trim().length < 4) {
      setErrorMsg(`Please enter a valid ${selectedCategory.accountLabel}`);
      return;
    }

    if (isNaN(paidAmt) || paidAmt <= 0) {
      setErrorMsg('Please enter a valid bill amount');
      return;
    }

    if (paidAmt > (user?.balance ?? 0)) {
      setErrorMsg('Insufficient wallet balance for this bill payment.');
      return;
    }

    setReceiptRef(`BILL-${Date.now().toString().slice(-8)}`);
    setCountdown(4);
    setIsProcessing(true);
  };

  const handleSaveReceipt = () => {
    const content = `
PAYGO BILL PAYMENT RECEIPT
--------------------------
Status: PAID
Reference: ${receiptRef}
Category: ${selectedCategory.label}
Provider: ${provider}
Account / Number: ${accountRef}
Amount Paid: $${parseFloat(amount).toLocaleString()}
Date: ${new Date().toLocaleString()}
--------------------------
Processed by PayGo Bill Pay
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paygo_bill_${receiptRef}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-gray-100 space-y-4">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-gray-900">Processing Bill Payment...</h3>
          <p className="text-sm text-gray-500">
            Settling ${parseFloat(amount).toLocaleString()} with {provider}
          </p>
          <div className="text-3xl font-black text-purple-600 font-mono">{countdown}s</div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-gray-100 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-emerald-600">Bill Paid!</h3>
            <p className="text-xs text-gray-500 mt-1">
              Your payment to {provider} has been completed instantly.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Provider:</span>
              <span className="font-bold text-gray-900">{provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account / Number:</span>
              <span className="font-mono font-semibold text-gray-900">{accountRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Paid:</span>
              <span className="font-black text-gray-900 text-base">
                ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 text-xs">
              <span className="text-gray-400">Reference:</span>
              <span className="font-mono text-gray-700">{receiptRef}</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleSaveReceipt}
              className="w-full min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Save Receipt</span>
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-purple-700 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Pay Bills</h1>
            <p className="text-xs text-purple-200">Instant utility & subscription payments</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Balance Banner */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-purple-200 font-medium">
              Wallet Balance
            </p>
            <h2 className="text-2xl sm:text-3xl font-black mt-1">
              ${(user?.balance ?? 13000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-amber-300" />
          </div>
        </div>

        {/* Category Picker */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2.5 px-1">
            Select Bill Category
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {BILL_CATEGORIES.map((cat) => {
              const active = selectedCategory.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`min-h-[76px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    active
                      ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                      : 'border-gray-100 bg-white text-gray-700 hover:border-purple-200'
                  }`}
                >
                  <div className="mb-1.5">{cat.icon}</div>
                  <span className="text-xs font-bold leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handlePayBill} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Service Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900 bg-white font-medium"
            >
              {selectedCategory.providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              {selectedCategory.accountLabel}
            </label>
            <input
              type="text"
              value={accountRef}
              onChange={(e) => setAccountRef(e.target.value)}
              placeholder={selectedCategory.accountPlaceholder}
              className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Quick Select Amount ($)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={`min-h-[44px] rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    amount === String(preset)
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-gray-50 text-gray-800 border-gray-200 hover:border-purple-300'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-bold text-gray-900"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <Receipt className="w-5 h-5" />
            <span>Pay {amount ? `$${parseFloat(amount).toLocaleString()}` : 'Bill'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
