import React from 'react';
import { ShieldAlert, Ban, CheckCircle2, Clock } from 'lucide-react';

interface GiftCardVerdictModalProps {
  verdict: { type: 'used' | 'fake'; message: string } | null;
  onClose: () => void;
}

export const GiftCardVerdictModal: React.FC<GiftCardVerdictModalProps> = ({ verdict, onClose }) => {
  if (!verdict) return null;

  const isUsed = verdict.type === 'used';

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-2 border-red-200 space-y-4 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50">
          {isUsed ? <Ban className="w-9 h-9" /> : <ShieldAlert className="w-9 h-9" />}
        </div>

        <span className="inline-block bg-red-100 text-red-800 border border-red-200 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
          {isUsed ? 'Status: Already Used Gift Card' : 'Status: Fake / Invalid Gift Card'}
        </span>

        <h3 className="text-xl font-extrabold text-gray-900">
          {isUsed ? 'Used Gift Card Detected' : 'Fake or Wrong Gift Card Detected'}
        </h3>

        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{verdict.message}</p>

        <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-left text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">Real / Not Fake Check:</span>
            <span className={`font-bold ${isUsed ? 'text-amber-700' : 'text-red-700'}`}>
              {isUsed ? 'Previously Submitted' : 'FAILED (Fake / Invalid)'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">Unused Card Check:</span>
            <span className="font-bold text-red-700">
              {isUsed ? 'FAILED (Already Used)' : 'NOT ACCEPTED'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm shadow-sm cursor-pointer"
        >
          Drop a Real Unused Gift Card Instead
        </button>
      </div>
    </div>
  );
};

export const GiftCardCheckChecklist: React.FC = () => (
  <div className="w-full max-w-sm bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-left text-xs space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 text-emerald-700 font-semibold">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Real Card Check (Not Fake)</span>
      </div>
      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
        PASSED
      </span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 text-amber-700 font-semibold">
        <Clock className="w-4 h-4 shrink-0" />
        <span>Used Card Verification</span>
      </div>
      <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
        CHECKING...
      </span>
    </div>
  </div>
);
