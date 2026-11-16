import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { ViewState } from '../types';
import promoCryptoWithdrawImg from '../assets/images/promo_crypto_withdraw_1794752961148.jpg';
import promoWelcomeBonusImg from '../assets/images/promo_welcome_bonus_1794752975856.jpg';
import promoVipTiersImg from '../assets/images/promo_vip_tiers_1794752960003.jpg';

interface PromoItem {
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  targetView: ViewState;
  image: string;
  fallbackGradient: string;
}

const PROMOS: PromoItem[] = [
  {
    title: 'Instant Crypto Withdrawals',
    subtitle: 'PAY ID • $25 One-Time Activation',
    description:
      'Withdraw your balance directly to Binance, Bybit, TrustWallet, or OKX in minutes once your PAY ID is active.',
    ctaLabel: 'Get PAY ID',
    targetView: 'buy-pay-id',
    image: promoCryptoWithdrawImg,
    fallbackGradient: 'from-purple-950 via-indigo-900 to-slate-900',
  },
  {
    title: '$13,000 Bonus & $25 Invites',
    subtitle: 'Active Referral Rewards',
    description:
      'Start with a $13,000 welcome balance and earn $25 instantly every time a friend joins using your invite link.',
    ctaLabel: 'Invite & Earn $25',
    targetView: 'earn-more',
    image: promoWelcomeBonusImg,
    fallbackGradient: 'from-slate-950 via-purple-900 to-amber-950',
  },
  {
    title: 'Upgrade Tiers • Up to $500/wk',
    subtitle: 'Silver to Black Membership',
    description:
      'Upgrade to Ruby or higher to unlock withdrawals over $5,000, boost weekly rewards, and earn up to $550 per invite.',
    ctaLabel: 'Explore Tiers',
    targetView: 'upgrade',
    image: promoVipTiersImg,
    fallbackGradient: 'from-zinc-950 via-purple-950 to-emerald-950',
  },
];

interface PromotionsCarouselProps {
  onNavigate?: (view: ViewState) => void;
}

export const PromotionsCarousel: React.FC<PromotionsCarouselProps> = ({ onNavigate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMOS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? PROMOS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % PROMOS.length);
  };

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-base font-bold text-white">Current Promotions</h3>
        <div className="flex items-center space-x-1.5">
          {PROMOS.map((promo, idx) => (
            <button
              key={promo.title}
              type="button"
              aria-label={`View promotion: ${promo.title}`}
              onClick={() => setCurrentIndex(idx)}
              className="min-h-[28px] px-0.5 flex items-center justify-center cursor-pointer"
            >
              <span
                className={`block h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'w-6 bg-amber-400' : 'w-2 bg-white/25'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10 group h-[220px] sm:h-[250px] bg-slate-900">
        {PROMOS.map((item, index) => (
          <div
            key={item.title}
            className={`absolute inset-0 bg-gradient-to-br ${item.fallbackGradient} transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            <img
              src={item.image}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15 flex flex-col justify-end p-5 text-white">
              <span className="text-[11px] uppercase font-bold tracking-wider text-amber-400 mb-1">
                {item.subtitle}
              </span>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-lg sm:text-xl font-bold leading-tight">{item.title}</h4>
                  <p className="text-xs text-gray-200 mt-1 line-clamp-2 max-w-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate(item.targetView)}
                    className="shrink-0 min-h-[44px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md flex items-center space-x-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <span>{item.ctaLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          aria-label="Previous promotion"
          onClick={handlePrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          aria-label="Next promotion"
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
