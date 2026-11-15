import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Users,
  Copy,
  Check,
  Share2,
  Gift,
  ArrowDownToLine,
  CheckCircle2,
  Sparkles,
  Edit2,
} from 'lucide-react';

interface ReferEarnProps {
  onBack: () => void;
  onNavigateToBuyPayId?: () => void;
}

export const ReferEarn: React.FC<ReferEarnProps> = ({ onBack }) => {
  const { user, updateUser, updateReferralBalance, addBalance, addTransaction } = useAuth();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payId, setPayId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState('');

  const appBaseUrl = typeof window !== 'undefined'
    ? (window.location.origin.includes('localhost')
        ? 'https://ais-pre-afbowaewcnfw73nmyxl4ve-335329458164.europe-west2.run.app'
        : window.location.origin)
    : 'https://ais-pre-afbowaewcnfw73nmyxl4ve-335329458164.europe-west2.run.app';

  // Real, personalized referral code
  const realCode = user?.referralCode || (user?.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '') : (user?.email ? user.email.split('@')[0].toLowerCase() : 'paygo_vip'));
  const referralLink = `${appBaseUrl}/?ref=${realCode}`;
  const referralMsg = `Join PayGo and start earning! Get $13,000 welcome bonus when you sign up using my referral link: ${referralLink}`;

  const fallbackCopyText = (text: string, type: 'link' | 'code' | 'msg') => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedMsg(true);
        setTimeout(() => setCopiedMsg(false), 2000);
      }
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const copyLink = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralLink).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {
        fallbackCopyText(referralLink, 'link');
      });
    } else {
      fallbackCopyText(referralLink, 'link');
    }
  };

  const copyCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(realCode).then(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }).catch(() => {
        fallbackCopyText(realCode, 'code');
      });
    } else {
      fallbackCopyText(realCode, 'code');
    }
  };

  const copyMessage = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralMsg).then(() => {
        setCopiedMsg(true);
        setTimeout(() => setCopiedMsg(false), 2000);
      }).catch(() => {
        fallbackCopyText(referralMsg, 'msg');
      });
    } else {
      fallbackCopyText(referralMsg, 'msg');
    }
  };

  const handleSaveCustomCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customCodeInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (clean) {
      updateUser({ referralCode: clean });
      setIsEditingCode(false);
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(referralMsg)}`, '_blank');
  };

  // Withdrawal timer
  useEffect(() => {
    let timer: any;
    if (isProcessing && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (isProcessing && countdown === 0) {
      const amt = parseFloat(withdrawAmount);
      updateReferralBalance(amt);
      addBalance(amt);
      addTransaction({
        type: 'Referral Withdrawal',
        amount: amt,
        date: new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(),
      });
      setIsProcessing(false);
      setIsSuccess(true);
    }
    return () => clearTimeout(timer);
  }, [isProcessing, countdown]);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!withdrawAmount || !payId) {
      setErrorMsg('Please enter both amount and PAY ID');
      return;
    }

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount');
      return;
    }

    if (amt > (user?.referralBalance || 0)) {
      setErrorMsg('Withdrawal amount exceeds your available referral balance');
      return;
    }

    const validPayIds = ['paygo238', 'PG-7474PAYDDT1I2P18837DOEFQ'];
    if (!validPayIds.includes(payId.trim())) {
      setErrorMsg('Invalid PAY ID code. Only verified PAY IDs are authorized for withdrawals.');
      return;
    }

    setCountdown(10);
    setIsProcessing(true);
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-gray-100 space-y-4">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-gray-900">Processing Referral Withdrawal</h3>
          <p className="text-sm text-gray-500">Transferring referral commission to main wallet...</p>
          <div className="text-3xl font-black text-purple-600 font-mono">{countdown}s</div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-gray-100 space-y-5">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Withdrawal Successful!</h3>
          <p className="text-xs text-gray-500">
            ${parseFloat(withdrawAmount).toLocaleString()} has been added directly to your main wallet balance!
          </p>
          <button
            onClick={() => {
              setIsSuccess(false);
              setWithdrawAmount('');
              setPayId('');
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer"
          >
            Continue
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
            <h1 className="text-lg font-bold">Refer & Earn Dashboard</h1>
            <p className="text-xs text-purple-200">Earn $25 for every verified invite</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Referral Stats Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-orange-500 text-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase font-medium text-purple-100">Referral Balance</p>
              <h2 className="text-3xl font-black mt-0.5">
                ${(user?.referralBalance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xs">
              <Gift className="w-6 h-6 text-amber-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20 text-center">
            <div className="bg-white/10 rounded-xl p-2.5">
              <p className="text-[11px] text-purple-100 uppercase font-medium">Total Referrals</p>
              <p className="text-lg font-black">{user?.totalReferrals || 0}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <p className="text-[11px] text-purple-100 uppercase font-medium">Per Referral</p>
              <p className="text-lg font-black">$25</p>
            </div>
          </div>
        </div>

        {/* Personalized Referral Code & Link Box */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>Your Personal Referral Code</span>
            </h3>
            <button
              onClick={() => {
                setCustomCodeInput(realCode);
                setIsEditingCode(!isEditingCode);
              }}
              className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center space-x-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditingCode ? 'Cancel' : 'Customize'}</span>
            </button>
          </div>

          {isEditingCode ? (
            <form onSubmit={handleSaveCustomCode} className="flex items-center space-x-2">
              <input
                type="text"
                value={customCodeInput}
                onChange={(e) => setCustomCodeInput(e.target.value)}
                placeholder="Enter custom referral code"
                className="flex-1 p-2.5 border border-purple-300 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs"
              >
                Save
              </button>
            </form>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">Referral Code</p>
                <p className="text-xl font-mono font-black text-purple-900">{realCode}</p>
              </div>
              <button
                onClick={copyCode}
                className="bg-white hover:bg-purple-100 text-purple-800 text-xs font-bold px-3 py-2 rounded-xl border border-purple-200 flex items-center space-x-1.5 shadow-xs transition-colors"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-purple-600" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Direct Referral Link (Takes invites straight to Register)
            </label>
            <div className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-transparent text-xs font-mono text-gray-700 outline-none select-all"
              />
              <button
                onClick={copyLink}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Your referral invite message:</p>
            <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100 text-xs text-purple-900 italic">
              "{referralMsg}"
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={copyMessage}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copiedMsg ? 'Message Copied' : 'Copy Message'}</span>
            </button>
            <button
              onClick={shareWhatsApp}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Withdrawal Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
            <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
            <span>Withdraw Referral Earnings</span>
          </h3>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Withdrawal Amount ($)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="e.g. 25"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-bold text-gray-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Enter PAY ID Code
                </label>
                <button
                  type="button"
                  onClick={() => setPayId('paygo238')}
                  className="text-xs text-purple-600 font-semibold hover:underline"
                >
                  Use Code paygo238
                </button>
              </div>
              <input
                type="text"
                value={payId}
                onChange={(e) => setPayId(e.target.value)}
                placeholder="Enter verified PAY ID"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-xs font-mono text-gray-900"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all cursor-pointer"
            >
              Withdraw to Main Balance
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
