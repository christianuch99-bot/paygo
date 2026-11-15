import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Gift, CreditCard, Smartphone, ArrowDownToLine, Sparkles, X, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const totalSteps = 5;

  const stepsData = [
    {
      icon: <Gift className="w-12 h-12 text-purple-600" />,
      title: "Welcome Bonus",
      description: "You've received a welcome bonus of $13,000! This amount is already in your account and can be withdrawn after purchasing a PAY ID."
    },
    {
      icon: <CreditCard className="w-12 h-12 text-blue-600" />,
      title: "Get Your PAY ID",
      description: "To withdraw funds, you'll need to purchase a PAY ID for $25. This is a one-time purchase that unlocks all features of the app."
    },
    {
      icon: <Smartphone className="w-12 h-12 text-green-600" />,
      title: "Airtime & Data",
      description: "You can purchase airtime and data for all major networks directly from the app. Simply select the service, enter the phone number, choose your plan, and complete your purchase."
    },
    {
      icon: <ArrowDownToLine className="w-12 h-12 text-red-500" />,
      title: "Withdrawal Process",
      description: 'To withdraw your funds, tap the "Transfer" button on your dashboard, enter your crypto wallet details and PAY ID, and submit your request. Withdrawals are processed within 24 hours.'
    },
    {
      icon: <Sparkles className="w-12 h-12 text-amber-500" />,
      title: "Ready to Start",
      description: "You're all set! Explore the dashboard, manage your balance, make transfers, buy services, and enjoy all the features PayGo has to offer."
    }
  ];

  const current = stepsData[step - 1];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-purple-900 text-white p-6 relative">
          <button
            onClick={onComplete}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold mb-1">
            Welcome to PayGo, {user?.name || 'User'}!
          </h2>
          <p className="text-sm text-purple-200 mb-4">
            Step {step} of {totalSteps}
          </p>

          <div className="flex space-x-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  idx < step ? 'bg-white' : 'bg-white/25'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs">
            {current.icon}
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {current.title}
          </h3>

          <p className="text-gray-600 text-sm leading-relaxed mb-8 px-2 min-h-[72px]">
            {current.description}
          </p>

          <div className="flex items-center space-x-3">
            {step > 1 && (
              <button
                onClick={handlePrev}
                className="px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>{step === totalSteps ? 'Get Started' : 'Next Step'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
