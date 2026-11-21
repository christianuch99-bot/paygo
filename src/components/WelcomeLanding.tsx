import React, { useState } from 'react';
import {
  Landmark,
  LogIn,
  UserPlus,
  Menu,
  X,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import heroBgImg from '../assets/images/landing_hero_woman_card_1795243574026.jpg';

interface WelcomeLandingProps {
  onLogin: () => void;
  onRegister: () => void;
  onOpenSupport?: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({
  onLogin,
  onRegister,
  onOpenSupport,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSupportClick = () => {
    setMenuOpen(false);
    if (onOpenSupport) {
      onOpenSupport();
    } else {
      window.open('https://t.me/Mike_Aper_PayGo', '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white select-none">
      {/* Top Clean Navigation Header */}
      <header className="relative z-30 bg-white text-slate-900 border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 to-purple-600 flex items-center justify-center shadow-sm">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
              PAYGO
            </span>
          </div>

          {/* Desktop Quick Actions */}
          <div className="hidden sm:flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSupportClick}
              className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              Need Help?
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-purple-700 hover:bg-purple-800 text-white shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              Open Account
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="sm:hidden w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {menuOpen && (
          <div className="sm:hidden absolute top-16 inset-x-0 bg-white border-b border-slate-200 shadow-xl px-4 py-4 space-y-2 z-40">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onRegister();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-purple-50 text-purple-800 font-semibold text-sm cursor-pointer"
            >
              <span className="flex items-center space-x-2.5">
                <UserPlus className="w-4 h-4" />
                <span>Open Account Today</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onLogin();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 font-semibold text-sm cursor-pointer"
            >
              <span className="flex items-center space-x-2.5">
                <LogIn className="w-4 h-4 text-purple-700" />
                <span>Login to PayGo</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={handleSupportClick}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-700 font-medium text-sm cursor-pointer"
            >
              <span className="flex items-center space-x-2.5">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>Support &amp; Help Center</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}
      </header>

      {/* Full-Bleed Lifestyle Photo Hero Stage */}
      <main className="relative flex-1 flex flex-col justify-center overflow-hidden">
        {/* Background Photo (cropped slightly at top to remove top light band seamlessly) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={heroBgImg}
            alt="PayGo client holding mobile phone and digital card"
            className="absolute -top-[10%] left-0 w-full h-[112%] object-cover object-top"
          />
          {/* Rich Contrast Scrim */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/65 to-slate-950/92" />
          <div className="absolute inset-0 bg-purple-950/25 mix-blend-multiply" />
        </div>

        {/* Hero Centerpiece */}
        <div className="relative z-10 max-w-xl w-full mx-auto px-5 sm:px-8 py-10 sm:py-14 flex flex-col items-center text-center">
          {/* Frosted Glass Brand Icon Lockup */}
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-2xl mb-6">
            <Landmark className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-2.5 drop-shadow-sm">
            PayGo
          </h1>

          <p className="text-base sm:text-lg font-medium text-white/95 mb-5">
            Your Digital Financial Partner
          </p>

          <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-md mb-8">
            We do digital finance differently. We believe that people come first,
            and that everyone deserves a seamless experience every step of the way.
          </p>

          {/* Primary & Secondary Action Stack */}
          <div className="w-full max-w-sm space-y-3">
            <button
              type="button"
              onClick={onRegister}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-base shadow-xl shadow-purple-950/40 flex items-center justify-center space-x-2.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-5 h-5 shrink-0" />
              <span>Open Account Today</span>
            </button>

            <button
              type="button"
              onClick={onLogin}
              className="w-full py-3.5 px-5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-bold text-base shadow-lg flex items-center justify-center space-x-2.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-5 h-5 shrink-0" />
              <span>Login to PayGo</span>
            </button>
          </div>

          {/* Key Proof Metrics Strip */}
          <div className="w-full max-w-sm grid grid-cols-2 gap-6 pt-9 mt-8 border-t border-white/20">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums tracking-tight">
                50K+
              </div>
              <div className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                Happy Users
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums tracking-tight">
                $2.5B+
              </div>
              <div className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                Volume Managed
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center space-x-1.5 text-xs text-white/70">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Protected by PayGo Financial Services</span>
          </div>
        </div>
      </main>

      {/* Bottom Split Bar (Login | Register) */}
      <footer className="relative z-20 grid grid-cols-2 shrink-0 border-t border-slate-200/20 shadow-2xl">
        <button
          type="button"
          onClick={onLogin}
          className="h-14 bg-white hover:bg-slate-50 text-purple-700 font-bold text-sm sm:text-base flex items-center justify-center space-x-2 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Login</span>
        </button>
        <button
          type="button"
          onClick={onRegister}
          className="h-14 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold text-sm sm:text-base flex items-center justify-center space-x-2 transition-colors cursor-pointer whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Register</span>
        </button>
      </footer>
    </div>
  );
};
