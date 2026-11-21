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
  Check,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { PromotionsCarousel } from './PromotionsCarousel';
import { SpendingBreakdownChart } from './SpendingBreakdownChart';
import { RecentApprovedWithdrawals } from './RecentApprovedWithdrawals';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  onRequestLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onRequestLogout }) => {
  const { user, transactions } = useAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [copiedPayId, setCopiedPayId] = useState(false);
  const OFFICIAL_PAY_ID = 'PG-7474PAYDDT1I2P18837DOEFQ';

  const handleCopyPayId = () => {
    navigator.clipboard.writeText(OFFICIAL_PAY_ID);
    setCopiedPayId(true);
    setTimeout(() => setCopiedPayId(false), 2000);
  };

  const getWeeklyRewardDetails = (level?: string, payIdVerified?: boolean) => {
    if (!payIdVerified) return { reward: '$0.00', tier: 'Locked (Awaiting PAY ID Approval)' };
    if (!level || level === 'Basic') return { reward: '$25.00', tier: 'PAY ID Verified ($25 Weekly)' };
    const l = level.toLowerCase();
    if (l.includes('black')) return { reward: '$500.00', tier: 'Black Tier' };
    if (l.includes('diamond')) return { reward: '$250.00', tier: 'Diamond Tier' };
    if (l.includes('ruby')) return { reward: '$200.00', tier: 'Ruby Tier' };
    if (l.includes('emerald')) return { reward: '$150.00', tier: 'Emerald Tier' };
    if (l.includes('platinum')) return { reward: '$100.00', tier: 'Platinum Tier' };
    if (l.includes('gold')) return { reward: '$75.00', tier: 'Gold Tier' };
    if (l.includes('silver') || l.includes('stage 1')) return { reward: '$50.00', tier: 'Silver Tier' };
    return { reward: '$25.00', tier: level || 'Active' };
  };

  const weeklyInfo = getWeeklyRewardDetails(user?.accountLevel, user?.payIdVerified);

  const quickActions = [
    {
      id: 'buy-pay-id',
      label: 'Buy PAY ID',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-300/25 flex items-center justify-center font-bold">
          <CreditCard className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('buy-pay-id'),
    },
    {
      id: 'gift-cards',
      label: 'Gift Cards',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-purple-400/15 text-purple-300 border border-purple-300/25 flex items-center justify-center">
          <Gift className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('gift-cards'),
    },
    {
      id: 'support',
      label: 'Support',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-teal-400/15 text-teal-300 border border-teal-300/25 flex items-center justify-center">
          <Headphones className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('support'),
    },
    {
      id: 'bills',
      label: 'Bills',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-emerald-400/15 text-emerald-300 border border-emerald-300/25 flex items-center justify-center">
          <Receipt className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('bills'),
    },
    {
      id: 'watch',
      label: 'Watch',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-sky-400/15 text-sky-300 border border-sky-300/25 flex items-center justify-center">
          <Tv className="w-5 h-5" />
        </div>
      ),
      action: () => window.open('https://youtube.com/shorts/o03r3i1YDQk?si=vIgpVZUXDjTCX4lf', '_blank'),
    },
    {
      id: 'group',
      label: 'Group',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-indigo-400/15 text-indigo-300 border border-indigo-300/25 flex items-center justify-center">
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
        <div className="w-11 h-11 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-300/25 flex items-center justify-center">
          <Coins className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('earn-more'),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-rose-400/15 text-rose-300 border border-rose-300/25 flex items-center justify-center">
          <User className="w-5 h-5" />
        </div>
      ),
      action: () => onNavigate('profile'),
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_#251552_0%,_#120e28_48%,_#090d1a_100%)] text-slate-100 pb-14">
      {/* Subtle architectural ambient background glows */}
      <div className="pointer-events-none absolute -top-28 -right-24 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-28 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-72 rounded-full bg-teal-500/10 blur-3xl" />

      {/* Marquee Service Notification Ticker */}
      <div className="relative z-10 bg-slate-950/60 backdrop-blur-md border-b border-amber-400/20 overflow-hidden py-2.5 px-4 flex items-center">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mr-2.5" />
        <div className="overflow-hidden whitespace-nowrap w-full">
          <div className="animate-slide-banner text-amber-100/90 text-xs font-semibold">
            Instant crypto payouts to Binance, Bybit & TrustWallet are active 24/7! • Activate your $25 PAY ID or Gift Card verification anytime • Invite friends for $25 instant bonus!
          </div>
        </div>
      </div>

      {/* Main Header & Wallet Card */}
      <div className="relative z-10 max-w-3xl mx-auto px-3 sm:px-4 pt-4">
        <div className="bg-gradient-to-br from-purple-900/95 via-indigo-950/95 to-slate-900/95 border border-white/15 text-white rounded-3xl p-5 sm:p-6 shadow-2xl shadow-purple-950/50 relative overflow-hidden">
          {/* Subtle card sheen */}
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-44 h-44 bg-purple-400/15 rounded-full blur-2xl pointer-events-none" />

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
                title="View Profile"
                className="w-11 h-11 bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 rounded-full flex items-center justify-center font-black text-lg shadow-md border border-amber-200/60 cursor-pointer overflow-hidden"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </button>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center space-x-1.5">
                  <span>Hi, {user?.name || 'User'}</span>
                  <span>👋</span>
                </h1>
                <p className="text-xs text-purple-200/80 font-medium">Welcome back!</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('transaction-history')}
                title="Transaction History"
                className="min-w-[44px] min-h-[44px] bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={onRequestLogout}
                className="min-h-[44px] bg-white/10 hover:bg-white/20 border border-white/10 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Wallet Balance Display Box */}
          <div className="bg-slate-950/40 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 relative z-10">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-purple-200/80 uppercase tracking-wider">
                Your Balance
              </p>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
                className="text-purple-200 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex flex-col mb-4">
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                {balanceVisible
                  ? `$${(user?.balance ?? 12435.33).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '$***,***.00'}
              </div>
              <p className="text-xs text-emerald-300 font-medium mt-1">
                Weekly Rewards: {weeklyInfo.reward} ({weeklyInfo.tier})
              </p>
              {user?.payIdVerified && (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-3 py-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="text-emerald-200 font-semibold">PAY ID Active:</span>
                    <span className="font-mono font-bold text-white select-all">{OFFICIAL_PAY_ID}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPayId}
                    className="bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    {copiedPayId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPayId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Balance Actions: Deposit, Upgrade & Transfer */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={() => onNavigate('deposit')}
                className="min-h-[44px] bg-white/12 hover:bg-white/22 text-white border border-white/15 font-bold py-3 px-2 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-98 cursor-pointer whitespace-nowrap"
              >
                <CreditCard className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => onNavigate('upgrade')}
                className="min-h-[44px] bg-white/12 hover:bg-white/22 text-white border border-white/15 font-bold py-3 px-2 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-98 cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
                <span>Upgrade</span>
              </button>
              <button
                onClick={() => onNavigate('transfer')}
                className="min-h-[44px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3 px-2 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-98 cursor-pointer whitespace-nowrap"
              >
                <Send className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Transfer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-3xl mx-auto px-3 sm:px-4 mt-6 space-y-6">
        {/* Quick Actions Grid */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-base font-bold text-white">Services & Features</h3>
            <span className="text-xs text-slate-400 font-medium">8 Available</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
            {quickActions.map((item) =>
              item.href ? (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[92px] bg-black/50 hover:bg-black/80 backdrop-blur-md p-3 rounded-2xl shadow-lg shadow-black/30 border border-white/10 hover:border-purple-400/40 flex flex-col items-center justify-center text-center transition-all group active:scale-95"
                >
                  <div className="mb-2 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-100 leading-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </a>
              ) : (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="min-h-[92px] bg-black/50 hover:bg-black/80 backdrop-blur-md p-3 rounded-2xl shadow-lg shadow-black/30 border border-white/10 hover:border-purple-400/40 flex flex-col items-center justify-center text-center transition-all group active:scale-95 cursor-pointer"
                >
                  <div className="mb-2 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-100 leading-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Monthly Spending Habits Breakdown */}
        <SpendingBreakdownChart transactions={transactions} onNavigate={onNavigate} />

        {/* Promotions Carousel */}
        <PromotionsCarousel onNavigate={onNavigate} />

        {/* Recently Approved Accounts & Withdrawals */}
        <RecentApprovedWithdrawals variant="dashboard" />
      </div>
    </div>
  );
};
