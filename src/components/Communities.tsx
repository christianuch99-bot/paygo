import React from 'react';
import { ArrowLeft, MessageCircle, Send, ExternalLink } from 'lucide-react';

interface CommunitiesProps {
  onBack: () => void;
}

export const Communities: React.FC<CommunitiesProps> = ({ onBack }) => {
  const joinWhatsApp = () => {
    window.open('https://chat.whatsapp.com/EqmzDkOJOdkK86Rw13GQ1P', '_blank');
  };

  const TELEGRAM_URL = 'https://t.me/Mike_Aper_PayGo';

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
            <h1 className="text-xl font-bold text-gray-900">Join Our Communities</h1>
            <p className="text-xs text-gray-500">Official PayGo updates and community groups</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="text-center py-2">
          <h2 className="text-2xl font-bold text-purple-700">Connect With Us</h2>
          <p className="text-xs text-gray-500 mt-1">
            Join our official channels for real-time announcements, payment updates, and member support
          </p>
        </div>

        {/* WhatsApp Channel Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-sm">
              💬
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">WhatsApp Channel</h3>
              <p className="text-xs text-gray-500">Official community & updates broadcast</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Get instant notifications about crypto payout status, withdrawal schedules, promotional bonuses, and direct customer care assistance.
          </p>

          <button
            onClick={joinWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Join WhatsApp Channel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Telegram Channel Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-sm">
              ✈️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Telegram Channel</h3>
              <p className="text-xs text-gray-500">Community chat & tips</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Join over 10,000+ active PayGo members on Telegram to exchange referral codes, discuss earning opportunities, and receive fast help.
          </p>

          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Join Telegram Channel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
