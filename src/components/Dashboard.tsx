import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ViewState } from '../types';
import {
  CreditCard,
  Tv,
  Gift,
  Headphones,
  Users,
  Coins,
  User,
  History,
  LogOut,
  Eye,
  EyeOff,
  Zap,
  Send,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import { PromotionsCarousel } from './PromotionsCarousel';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  onRequestLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onRequestLogout }) => {
  const { user } = useAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);

  const quickActions = [
    {
      id: 'buy-pay-id',
      label: 'Buy PAY ID',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
          <CreditCard className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('buy-pay-id'),
    },
    {
      id: 'gift-cards',
      label: 'Gift Cards',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
          <Gift className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('gift-cards'),
    },
    {
      id: 'support',
      label: 'Support',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
          <Headphones className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('support'),
    },
    {
      id: 'bills',
      label: 'Bills',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <Receipt className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('bills'),
    },
    {
      id: 'watch',
      label: 'Watch',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
          <Tv className="w-5 h-5" />
        </div>
      ),
      action: () => window.open('https://youtube.com/shorts/o03r3i1YDQk?si=vIgpVZUXDjTCX4lf', '_blank'),
    },
    {
      id: 'group',
      label: 'Group',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
      ),
      href: 'https://t.me/Mike_Aper_PayGo',
      action: () => {},
    },
    {
      id: 'earn-more',
      label: 'Earn More',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <Coins className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('earn-more'),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
          <User className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('profile'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/50 via-gray-50 to-orange-50/30 pb-12">
      {/* Marquee Service Notification Ticker */}
      <div className="bg-amber-50 border-b border-amber-200 overflow-hidden py-2 px-4 shadow-xs flex items-center">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mr-2" />
        <div className="overflow-hidden whitespace-nowrap w-full">
          <div className="animate-slide-banner text-emerald-900 text-xs font-semibold">
            📢 Instant crypto payouts to Binance, Bybit & TrustWallet are active 24/7! • Activate your $25 PAY ID or Gift Card verification anytime • Invite friends for $25 instant bonus!
          </div>
        </div>
      </div>

      {/* Main Header & Wallet Card */}
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-purple-600/30 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-44 h-44 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* User profile row */}
          <div className="flex items-center justify-between mb-5 relative z-10">
            <div className="flex items-center space-x-3">
              <button
                onClick={() =>
                  onNavigate(
                    user?.email?.toLowerCase() === 'ibro88977@gmail.com'
                      ? 'admin'
                      : 'profile'
                  )
                }
                className="w-11 h-11 bg-white text-purple-800 rounded-full flex items-center justify-center font-black text-lg shadow-md border-2 border-white/20"
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </button>
              <div>
                <h1 className="text-lg font-bold flex items-center space-x-1.5">
                  <span>Hi, {user?.name || 'User'}</span>
                  <span>👋</span>
                </h1>
                <p className="text-xs text-purple-200 font-medium">Welcome back!</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('transaction-history')}
                title="Transaction History"
                className="bg-white/15 hover:bg-white/25 text-white p-2.5 rounded-full transition-all"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={onRequestLogout}
                className="bg-white/15 hover:bg-white/25 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Wallet Balance Display Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 relative z-10">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-purple-200 uppercase tracking-wider">
                Your Balance
              </p>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="text-purple-200 hover:text-white p-1 rounded-md transition-colors"
              >
                {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex flex-col mb-4">
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {balanceVisible
                  ? `$${(user?.balance ?? 13000).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '$***,***.00'}
              </div>
              <p className="text-xs text-emerald-300 font-medium mt-1">
                Weekly Rewards: $13,000.00
              </p>
            </div>

            {/* Quick Balance Actions: Deposit, Upgrade & Transfer */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={() => onNavigate('deposit')}
                className="bg-white text-purple-900 hover:bg-purple-50 font-bold py-3 px-2 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-98"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => onNavigate('upgrade')}
                className="bg-white text-purple-900 hover:bg-purple-50 font-bold py-3 px-2 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-98"
              >
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Upgrade</span>
              </button>
              <button
                onClick={() => onNavigate('transfer')}
                className="bg-white text-purple-900 hover:bg-purple-50 font-bold py-3 px-2 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-98"
              >
                <Send className="w-4 h-4 text-purple-700" />
                <span>Transfer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-xl mx-auto px-4 mt-5 space-y-6">
        {/* Quick Actions Grid */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-base font-bold text-gray-900">Services & Features</h3>
            <span className="text-xs text-gray-400 font-medium">8 Available</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
            {quickActions.map((item) =>
              item.href ? (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white hover:bg-purple-50/60 p-3 rounded-2xl shadow-xs hover:shadow-md border border-gray-100 flex flex-col items-center justify-center text-center transition-all group active:scale-95"
                >
                  <div className="mb-2 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">
                    {item.label}
                  </span>
                </a>
              ) : (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="bg-white hover:bg-purple-50/60 p-3 rounded-2xl shadow-xs hover:shadow-md border border-gray-100 flex flex-col items-center justify-center text-center transition-all group active:scale-95 cursor-pointer"
                >
                  <div className="mb-2 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">
                    {item.label}
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Promotions Carousel */}
        <PromotionsCarousel onNavigate={onNavigate} />
      </div>
    </div>
  );
};
