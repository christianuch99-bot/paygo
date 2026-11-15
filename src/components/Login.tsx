import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HelpCircle, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginProps {
  onSwitchToRegister: () => void;
  onOpenSupport?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onOpenSupport }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let cleanId = identifier.trim().toLowerCase();
    if (!cleanId || !password) {
      setError('Please enter your email/phone and password');
      return;
    }

    // Auto-normalize if phone number or username
    if (!cleanId.includes('@')) {
      const cleanPhone = cleanId.replace(/[^a-z0-9]/g, '');
      cleanId = `${cleanPhone || 'user'}@paygo.com`;
    }

    setIsLoading(true);
    const res = await login(cleanId, password);
    setIsLoading(false);
    if (!res.success && res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-orange-400 flex flex-col justify-between p-4 sm:p-6">
      <div className="flex justify-end pt-2">
        <button
          onClick={onOpenSupport ? onOpenSupport : () => window.open('https://chat.whatsapp.com/EqmzDkOJOdkK86Rw13GQ1P', '_blank')}
          className="flex items-center space-x-1.5 text-white/90 hover:text-white bg-white/15 px-3.5 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm transition-all cursor-pointer"
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Login to continue</h2>
            <p className="text-sm text-gray-500 mt-1">Access your PayGo account and wallet balance across devices</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-center">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Email Address or Phone Number
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Phone (080...) or Email (user@gmail.com)"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none text-gray-900 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none text-gray-900 transition-all text-sm"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer"
            >
              Don't have an account? Register
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
