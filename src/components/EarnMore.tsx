import React from 'react';
import { ArrowLeft, Users, Zap, Gift, Check, ArrowRight, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EarnMoreProps {
  onBack: () => void;
  onNavigateToUpgrade: () => void;
  onNavigateToRefer: () => void;
}

export const EarnMore: React.FC<EarnMoreProps> = ({
  onBack,
  onNavigateToUpgrade,
  onNavigateToRefer,
}) => {
  const { user } = useAuth();

  const handleShare = () => {
    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : '';
    const refCode =
      user?.referralCode ||
      (user?.name
        ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        : user?.email
        ? user.email.split('@')[0].toLowerCase()
        : 'paygo_vip');
    const referralLink = `${baseUrl}/?ref=${refCode}`;
    const text = encodeURIComponent(
      `Join PayGo and start earning! Get $50,000 welcome bonus when you sign up using my link: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white p-4 border-b sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-black hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Earn More</h1>
            <p className="text-xs text-gray-500">Multiply your daily and weekly income</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Refer & Earn Banner Card */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-xs">
              <Users className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Refer & Earn</h3>
              <p className="text-xs text-purple-200">Earn $5,000 for each friend who joins</p>
            </div>
          </div>

          <p className="text-purple-100 text-xs sm:text-sm leading-relaxed mb-6">
            Invite friends to PayGo and earn $5,000 for each friend who signs up using your referral link and purchases a PAY ID.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShare}
              className="bg-white text-purple-700 hover:bg-purple-50 font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>
            <button
              onClick={onNavigateToRefer}
              className="bg-purple-900/60 hover:bg-purple-900/80 text-white font-semibold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1 border border-white/20 transition-all"
            >
              <span>Referral Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Paygo Pro Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 text-center shadow-sm border border-gray-100 space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
            <Zap className="w-8 h-8 fill-amber-500" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-purple-700">Paygo Pro</h2>
            <p className="text-sm font-semibold text-gray-800 mt-1">
              Take your earnings to the next level with Paygo Pro.
            </p>
          </div>

          <div className="space-y-2 text-xs text-gray-500 max-w-sm mx-auto text-left py-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>Access exclusive VIP features and higher earning tiers</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>Earn up to $550 per referral + $500 weekly bonuses across all 7 stages</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>Join thousands of active users maximizing their income</span>
            </div>
          </div>

          <button
            onClick={onNavigateToUpgrade}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Upgrade to Paygo Pro</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
