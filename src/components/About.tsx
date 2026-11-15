import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface AboutProps {
  onBack: () => void;
}

export const About: React.FC<AboutProps> = ({ onBack }) => {
  const perks = [
    'Purchase airtime and data for all major networks',
    'Transfer funds to any commercial & microfinance bank account',
    'Earn rewards and cashback on transactions',
    'Track your transaction history in real-time',
    'Participate in the high-yield referral program',
  ];

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
            <h1 className="text-xl font-bold text-gray-900">About PayGo</h1>
            <p className="text-xs text-gray-500">Digital financial services</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-orange-500 rounded-2xl p-6 shadow-md text-center text-white w-full">
            <h1 className="text-2xl font-black tracking-widest">DIGITAL PAYGO</h1>
            <p className="text-xs text-purple-100 mt-1 font-medium">Your All-In-One Digital Wallet</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-5 text-gray-700 leading-relaxed text-sm">
          <h2 className="text-2xl font-bold text-purple-700 text-center">About PayGo</h2>

          <p>
            PayGo is a leading financial services platform that provides users with convenient access to digital transactions, airtime and data purchases, and fund withdrawals.
          </p>

          <p>
            Our mission is to make financial services accessible to everyone, with a user-friendly interface, reliable service, and exciting reward mechanisms.
          </p>

          <div className="pt-2">
            <h3 className="font-bold text-gray-900 mb-3 text-base">With PayGo, you can:</h3>
            <ul className="space-y-2.5">
              {perks.map((p, idx) => (
                <li key={idx} className="flex items-start space-x-2.5 text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
