import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, ArrowUpRight } from 'lucide-react';

export interface ApprovedWithdrawalEntry {
  id: number;
  name: string;
  amount: number;
  timeAgo: string;
  method: string;
}

export const APPROVED_WITHDRAWALS: ApprovedWithdrawalEntry[] = [
  { id: 1, name: 'Grace Aper', amount: 3000, timeAgo: '2 mins ago', method: 'Instant Payout' },
  { id: 2, name: 'James', amount: 7000, timeAgo: '4 mins ago', method: 'Bank / Wallet' },
  { id: 3, name: 'Sophia Daniels', amount: 4500, timeAgo: '7 mins ago', method: 'USDT Payout' },
  { id: 4, name: 'Michael Brooks', amount: 2850, timeAgo: '11 mins ago', method: 'Instant Payout' },
  { id: 5, name: 'Hannah Okafor', amount: 6200, timeAgo: '14 mins ago', method: 'Bank / Wallet' },
  { id: 6, name: 'Daniel Reed', amount: 1950, timeAgo: '18 mins ago', method: 'Instant Payout' },
  { id: 7, name: 'Olivia Bennett', amount: 5400, timeAgo: '22 mins ago', method: 'USDT Payout' },
  { id: 8, name: 'Ethan Ramirez', amount: 8100, timeAgo: '25 mins ago', method: 'Bank / Wallet' },
  { id: 9, name: 'Chloe Mitchell', amount: 3750, timeAgo: '29 mins ago', method: 'Instant Payout' },
  { id: 10, name: 'David Foster', amount: 4200, timeAgo: '33 mins ago', method: 'Instant Payout' },
  { id: 11, name: 'Maya Patel', amount: 9500, timeAgo: '37 mins ago', method: 'Bank / Wallet' },
  { id: 12, name: 'Lucas Alvarez', amount: 2400, timeAgo: '41 mins ago', method: 'USDT Payout' },
  { id: 13, name: 'Victoria Chen', amount: 6800, timeAgo: '46 mins ago', method: 'Instant Payout' },
  { id: 14, name: 'Benjamin Ross', amount: 3150, timeAgo: '51 mins ago', method: 'Instant Payout' },
  { id: 15, name: 'Aaliyah Jenkins', amount: 5900, timeAgo: '55 mins ago', method: 'Bank / Wallet' },
  { id: 16, name: 'Samuel Wright', amount: 7450, timeAgo: '1 hr ago', method: 'USDT Payout' },
  { id: 17, name: 'Isabella Torres', amount: 2600, timeAgo: '1 hr ago', method: 'Instant Payout' },
  { id: 18, name: 'Matthew Kelly', amount: 10200, timeAgo: '1 hr ago', method: 'Bank / Wallet' },
  { id: 19, name: 'Naomi Mensah', amount: 4850, timeAgo: '2 hrs ago', method: 'Instant Payout' },
  { id: 20, name: 'Alexander Price', amount: 6100, timeAgo: '2 hrs ago', method: 'USDT Payout' },
  { id: 21, name: 'Zara Hussain', amount: 3400, timeAgo: '2 hrs ago', method: 'Instant Payout' },
  { id: 22, name: 'Elijah Morales', amount: 8750, timeAgo: '3 hrs ago', method: 'Bank / Wallet' },
  { id: 23, name: 'Natalie Gomez', amount: 2950, timeAgo: '3 hrs ago', method: 'Instant Payout' },
  { id: 24, name: 'Caleb Hughes', amount: 5250, timeAgo: '3 hrs ago', method: 'USDT Payout' },
  { id: 25, name: 'Ariana Cooper', amount: 4600, timeAgo: '4 hrs ago', method: 'Instant Payout' },
  { id: 26, name: 'Noah Richardson', amount: 7900, timeAgo: '4 hrs ago', method: 'Bank / Wallet' },
  { id: 27, name: 'Camille Laurent', amount: 3800, timeAgo: '4 hrs ago', method: 'Instant Payout' },
  { id: 28, name: 'Jordan Hayes', amount: 6450, timeAgo: '5 hrs ago', method: 'USDT Payout' },
  { id: 29, name: 'Evelyn Kim', amount: 5100, timeAgo: '5 hrs ago', method: 'Instant Payout' },
  { id: 30, name: 'Gabriel Santos', amount: 9200, timeAgo: '5 hrs ago', method: 'Bank / Wallet' },
  { id: 31, name: 'Destiny Carter', amount: 2750, timeAgo: '6 hrs ago', method: 'Instant Payout' },
  { id: 32, name: 'Owen Sullivan', amount: 4950, timeAgo: '6 hrs ago', method: 'USDT Payout' },
  { id: 33, name: 'Layla Ibrahim', amount: 6650, timeAgo: '7 hrs ago', method: 'Instant Payout' },
  { id: 34, name: 'Ryan Powell', amount: 3550, timeAgo: '7 hrs ago', method: 'Bank / Wallet' },
  { id: 35, name: 'Savannah Perry', amount: 8300, timeAgo: '8 hrs ago', method: 'Instant Payout' },
  { id: 36, name: 'Isaac Wallace', amount: 4100, timeAgo: '8 hrs ago', method: 'USDT Payout' },
  { id: 37, name: 'Brianna Cole', amount: 5750, timeAgo: '9 hrs ago', method: 'Instant Payout' },
  { id: 38, name: 'Nathan Long', amount: 7150, timeAgo: '9 hrs ago', method: 'Bank / Wallet' },
  { id: 39, name: 'Jasmine Navarro', amount: 3350, timeAgo: '10 hrs ago', method: 'Instant Payout' },
  { id: 40, name: 'Marcus Butler', amount: 11400, timeAgo: '11 hrs ago', method: 'Bank / Wallet' },
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

interface RecentApprovedWithdrawalsProps {
  variant?: 'landing' | 'dashboard';
}

export const RecentApprovedWithdrawals: React.FC<RecentApprovedWithdrawalsProps> = ({
  variant = 'landing',
}) => {
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % APPROVED_WITHDRAWALS.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const spotlight = APPROVED_WITHDRAWALS[spotlightIndex];

  return (
    <section
      className={
        variant === 'dashboard'
          ? 'bg-black/50 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl overflow-hidden'
          : 'w-full max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-9 overflow-hidden'
      }
    >
      {/* Compact Header */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
            Recently Approved Accounts
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Verified PayGo account payouts &amp; approvals
          </p>
        </div>
      </div>

      {/* Auto-Rotating Live Approval Toast / Card (1 at a time, animated transition) */}
      <div className="mb-4 bg-gradient-to-r from-purple-900/55 via-indigo-950/65 to-emerald-950/45 border border-emerald-400/25 rounded-2xl p-4 shadow-lg">
        <div
          key={spotlight.id}
          className="animate-fade-slide-up flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-bold text-sm flex items-center justify-center shrink-0">
              {getInitials(spotlight.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm sm:text-base font-extrabold text-white truncate">
                  {spotlight.name}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5">
                Account Approved • {spotlight.method} • {spotlight.timeAgo}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm sm:text-base font-extrabold text-emerald-300 tabular-nums flex items-center justify-end space-x-1">
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span>Withdrew ${spotlight.amount.toLocaleString('en-US')}</span>
            </div>
            <div className="text-[11px] font-medium text-emerald-200/80">
              Completed
            </div>
          </div>
        </div>
      </div>

      {/* Smooth Continuous Horizontal Sliding Strip */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/65 py-2.5">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-slate-950/90 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-950/90 to-transparent z-10" />

        <div className="animate-marquee-track gap-3 px-3">
          {[...APPROVED_WITHDRAWALS, ...APPROVED_WITHDRAWALS].map((entry, idx) => {
            const isSelected = entry.id === spotlight.id;
            return (
              <button
                key={`${entry.id}-${idx}`}
                type="button"
                onClick={() => setSpotlightIndex(entry.id - 1)}
                className={`shrink-0 flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-400/50'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-purple-500/25 border border-purple-400/30 text-purple-200 font-bold text-[11px] flex items-center justify-center shrink-0">
                  {getInitials(entry.name)}
                </div>
                <div className="whitespace-nowrap">
                  <div className="text-xs font-bold text-white flex items-center space-x-1">
                    <span>{entry.name}</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-300 tabular-nums">
                    Withdrew ${entry.amount.toLocaleString('en-US')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
