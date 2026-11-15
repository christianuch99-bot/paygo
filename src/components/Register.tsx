import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  HelpCircle,
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Gift,
  LayoutDashboard,
  Tag,
} from 'lucide-react';

interface RegisterProps {
  onSuccess?: () => void;
  onSwitchToLogin: () => void;
  onOpenSupport?: () => void;
  onContinueToDashboard?: () => void;
}

export const Register: React.FC<RegisterProps> = ({
  onSuccess,
  onSwitchToLogin,
  onOpenSupport,
  onContinueToDashboard,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, user } = useAuth();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        setReferralCodeInput(ref);
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.startsWith('1') && digits.length > 10) {
      digits = digits.slice(1);
    }
    setPhoneDigits(digits.slice(0, 14));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhoneDigits = phoneDigits.replace(/\D/g, '');

    if (!trimmedName || !cleanEmail || !cleanPhoneDigits || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    if (cleanPhoneDigits.length < 10) {
      setError('Please enter a valid phone number starting with +1');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    const fullPhone = `+1${cleanPhoneDigits}`;

    setIsLoading(true);
    const cleanRef = referralCodeInput.trim() || undefined;
    const res = await register(trimmedName, cleanEmail, fullPhone, password, cleanRef);
    setIsLoading(false);

    if (!res.success && res.error) {
      setError(res.error);
    } else {
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      onSuccess?.();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-orange-400 flex flex-col justify-between p-4 sm:p-6">
      <div className="flex justify-between items-center pt-2 max-w-md mx-auto w-full">
        {onContinueToDashboard && user ? (
          <button
            onClick={onContinueToDashboard}
            className="flex items-center space-x-1.5 text-white/90 hover:text-white bg-white/20 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to My Dashboard ({user.name})</span>
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={
            onOpenSupport
              ? onOpenSupport
              : () => window.open('https://chat.whatsapp.com/EqmzDkOJOdkK86Rw13GQ1P', '_blank')
          }
          className="flex items-center space-x-1.5 text-white/90 hover:text-white bg-white/15 px-3.5 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm transition-all ml-auto cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Need Help?</span>
        </button>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-4">
        <div className="text-center mb-6">
          <div className="inline-block bg-white text-purple-700 font-black text-2xl tracking-wider px-6 py-2 rounded-xl shadow-lg mb-3">
            PAYGO
          </div>
          <p className="text-white/90 text-sm font-medium">Your Digital Wallet & Financial Rewards</p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
            <p className="text-xs text-gray-500 mt-1">Universal registration for all devices and networks</p>

            {referralCodeInput && (
              <div className="mt-2.5 p-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-sm space-y-1">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <Gift className="w-4 h-4" />
                  <span>Referral Invitation Active!</span>
                </div>
                <p className="text-xs text-emerald-100">
                  You were invited by <strong className="text-white uppercase">{referralCodeInput}</strong>. You'll receive a $13,000 welcome bonus upon sign up!
                </p>
              </div>
            )}

            <div className="mt-2.5 flex items-center space-x-1.5 bg-purple-50 text-purple-700 p-2.5 rounded-xl border border-purple-100 text-xs font-medium">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Get <strong>$13,000 welcome bonus</strong> instantly upon sign up!</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Adebayo"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none text-gray-900 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none text-gray-900 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Phone Number (+1)
              </label>
              <div className="flex items-center border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-purple-600 focus-within:border-purple-600 overflow-hidden bg-white">
                <div className="flex items-center space-x-1.5 pl-3.5 pr-2.5 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-700 font-semibold text-sm select-none shrink-0">
                  <Phone className="w-4 h-4 text-purple-600" />
                  <span>+1</span>
                </div>
                <input
                  type="tel"
                  value={phoneDigits}
                  onChange={handlePhoneChange}
                  placeholder="(555) 234-5678"
                  className="w-full px-3 py-2.5 outline-none text-gray-900 text-sm font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose password (at least 4 chars)"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none text-gray-900 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none text-gray-900 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Referral Code (Optional)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600" />
                <input
                  type="text"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value.toLowerCase())}
                  placeholder="Enter referral code (e.g. ibro)"
                  className="w-full pl-10 pr-4 py-2.5 border border-purple-200 bg-purple-50/50 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none text-purple-900 font-mono text-sm uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Register & Claim $13,000 Bonus</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer"
            >
              Already have an account? Login
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-white/70 py-2">
        PayGo Financial Services © 2026. All rights reserved.
      </div>
    </div>
  );
};
