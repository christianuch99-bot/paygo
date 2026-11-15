import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Trash2,
  Gift,
  Send,
  Smartphone,
  Database,
  Award,
  CreditCard,
  CheckCircle2,
  Receipt,
} from 'lucide-react';

interface TransactionHistoryProps {
  onBack: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ onBack }) => {
  const { transactions, clearTransactions } = useAuth();
  const [filter, setFilter] = useState<'All' | 'Transfers' | 'Gift Cards' | 'Bonuses'>('All');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const getFilteredTransactions = () => {
    if (filter === 'Transfers') {
      return transactions.filter((t) => t.type === 'Transfer');
    }
    if (filter === 'Gift Cards') {
      return transactions.filter((t) => t.type === 'Gift Card Purchase');
    }
    if (filter === 'Bonuses') {
      return transactions.filter((t) => t.type === 'Welcome Bonus' || t.type === 'Referral Withdrawal');
    }
    return transactions;
  };

  const filtered = getFilteredTransactions();

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'Welcome Bonus':
        return <Gift className="w-5 h-5 text-emerald-600" />;
      case 'Transfer':
        return <Send className="w-5 h-5 text-purple-600" />;
      case 'Gift Card Purchase':
        return <Gift className="w-5 h-5 text-amber-600" />;
      case 'PAY ID Purchase':
        return <CreditCard className="w-5 h-5 text-indigo-600" />;
      case 'Account Upgrade':
        return <Award className="w-5 h-5 text-rose-600" />;
      case 'Card Deposit':
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'Bill Payment':
        return <Receipt className="w-5 h-5 text-teal-600" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-gray-600" />;
    }
  };

  const isCredit = (type: string) => {
    return type === 'Welcome Bonus' || type === 'Referral Withdrawal' || type === 'Card Deposit';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-purple-700 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Transaction History</h1>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-100 font-semibold px-3 py-1.5 rounded-xl border border-red-300/30 flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-200" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {(['All', 'Transfers', 'Gift Cards', 'Bonuses'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === tab
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Your Transactions</h2>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-xs">
              <p className="text-gray-500 text-sm">No transactions found for this filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((tx) => {
                const credit = isCredit(tx.type);
                return (
                  <div
                    key={tx.id}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex items-center justify-between hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                        {getTxIcon(tx.type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">{tx.type}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{tx.date}</p>
                        {tx.recipientName && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            To: {tx.recipientName} ({tx.cryptoExchange || tx.bankName || 'Crypto'})
                          </p>
                        )}
                        {tx.billProvider && (
                          <p className="text-[11px] text-teal-700 font-medium mt-0.5">
                            {tx.billProvider} {tx.billAccount ? `• ${tx.billAccount}` : ''}
                          </p>
                        )}
                        {tx.giftCardName && (
                          <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                            {tx.giftCardName} • Code: <span className="font-mono">{tx.giftCardCode}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-black text-sm ${
                          credit ? 'text-emerald-600' : 'text-gray-900'
                        }`}
                      >
                        {credit ? '+' : '-'}${tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                        Successful
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Clear History</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to clear your saved transaction records from this device?
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearTransactions();
                  setShowClearConfirm(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-semibold"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
