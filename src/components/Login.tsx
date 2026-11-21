import React, { useState } from 'react';
import {
  useAuth,
  getRememberedLogin,
  saveRememberedLogin,
  clearRememberedLogin,
} from '../context/AuthContext';
import { HelpCircle, Eye, EyeOff, Lock, Mail, Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  validateEmailInput,
  validatePhoneWithCountry,
} from '../data/countryCodes';
import { CountryPhoneInput } from './CountryPhoneInput';

interface LoginProps {
  onSwitchToRegister: () => void;
  onOpenSupport?: () => void;
  onBackToHome?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onOpenSupport, onBackToHome }) => {
  const savedLogin = getRememberedLogin();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>(
    savedLogin?.method || 'phone'
  );
  const [email, setEmail] = useState(savedLogin?.email || '');
  const [dialCode, setDialCode] = useState(savedLogin?.dialCode || '+1');
  const [phoneDigits, setPhoneDigits] = useState(savedLogin?.phoneDigits || '');
  const [password, setPassword] = useState('');
  const [rememberDetails, setRememberDetails] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (loginMethod === 'email') {
      const emailCheck = validateEmailInput(email);
      if (!emailCheck.valid) {
        setError(emailCheck.error || 'Please enter a valid email address');
        return;
      }
      setIsLoading(true);
      const res = await login(emailCheck.clean, password, 'email');
      setIsLoading(false);
      if (!res.success && res.error) {
        setError(res.error);
      } else if (res.success) {
        if (rememberDetails) {
          saveRememberedLogin({ method: 'email', email: emailCheck.clean });
        } else {
          clearRememberedLogin();
        }
      }
    } else {
      const phoneCheck = validatePhoneWithCountry(dialCode, phoneDigits);
      if (!phoneCheck.valid) {
        setError(phoneCheck.error || 'Please enter a valid phone number');
        return;
      }
      setIsLoading(true);
      const res = await login(phoneCheck.fullNumber, password, 'phone');
      setIsLoading(false);
      if (!res.success && res.error) {
        setError(res.error);
      } else if (res.success) {
        if (rememberDetails) {
          saveRememberedLogin({ method: 'phone', dialCode, phoneDigits });
        } else {
          clearRememberedLogin();
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-orange-400 flex flex-col justify-between p-4 sm:p-6">
      <div className="flex justify-between items-center pt-2 max-w-md mx-auto w-full">
        {onBackToHome ? (
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center space-x-1.5 text-white/90 hover:text-white bg-white/15 px-3.5 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
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
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900">Login to continue</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in with your saved Phone Number or Email details</p>
          </div>

          {/* Segmented Switch: Show ONLY Phone OR Email, never both at once */}
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('phone');
                setError('');
              }}
              className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                loginMethod === 'phone'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5 text-purple-600" />
              <span>Phone Number</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('email');
                setError('');
              }}
              className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                loginMethod === 'email'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-purple-600" />
              <span>Email / Gmail</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-center">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMethod === 'email' ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Email / Gmail Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@gmail.com"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none text-gray-900 transition-all text-sm"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Phone Number (All Countries • +1 Default)
                </label>
                <CountryPhoneInput
                  dialCode={dialCode}
                  onDialCodeChange={setDialCode}
                  phoneDigits={phoneDigits}
                  onPhoneDigitsChange={setPhoneDigits}
                  required
                  ariaLabel="Login phone number"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
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

            <label className="flex items-center space-x-2.5 text-xs text-gray-600 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={rememberDetails}
                onChange={(e) => setRememberDetails(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
              />
              <span>Save my login details on this device</span>
            </label>

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
