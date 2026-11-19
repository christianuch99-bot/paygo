import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Gift } from 'lucide-react';

export const WelcomeBonus: React.FC = () => {
  const { completeWelcome } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-orange-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-white text-purple-600 font-black text-2xl px-6 py-2 rounded-xl shadow-lg mx-auto w-fit tracking-wider">
            PAYGO
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center border border-white/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400" />

          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-purple-600 animate-bounce" />
          </div>

          <h2 className="text-3xl font-extrabold text-purple-600 mb-4">
            Welcome to PayGo!
          </h2>

          <p className="text-gray-600 mb-3 text-sm">
            As a new user, you'll receive a generous welcome bonus of
          </p>

          <div className="inline-flex items-center justify-center space-x-2 bg-purple-50 border border-purple-200 px-6 py-3 rounded-2xl mb-4 shadow-inner">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-3xl font-black text-purple-700 tracking-tight">$12,435.33</span>
          </div>

          <p className="text-gray-600 mb-8 text-sm leading-relaxed">
            which can be withdrawn at any time. Yes, you read that right - it's yours to keep!
          </p>

          <button
            onClick={completeWelcome}
            className="w-full bg-gradient-to-r from-purple-600 to-orange-400 hover:from-purple-700 hover:to-orange-500 text-white py-4 text-lg font-semibold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
