import React from 'react';
import { Users, Gift, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ReferPopupProps {
  onClose: () => void;
}

export const ReferPopup: React.FC<ReferPopupProps> = ({ onClose }) => {
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
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="relative bg-gradient-to-r from-purple-600 to-purple-800 p-4 text-white">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-purple-200" />
            <span className="text-base font-semibold">Refer & Earn</span>
          </div>
        </div>

        <div className="p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center ring-8 ring-amber-50">
              <Gift className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Earn $5,000!
          </h3>

          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Invite your friends using your referral link. Earn $5,000 for each friend who signs up. Start earning and save on PAY ID costs today!
          </p>

          <button
            onClick={handleShare}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-md transition-all flex items-center justify-center space-x-2 mb-2.5"
          >
            <span>Share on WhatsApp</span>
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium text-sm transition-all"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
