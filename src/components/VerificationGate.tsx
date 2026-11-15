import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider } from '../lib/firebase';
import {
  sendEmailVerification,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { COUNTRY_DIAL_CODES, validatePhoneWithCountry } from '../data/countryCodes';
import { CountryPhoneInput } from './CountryPhoneInput';
import {
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Send,
  LogOut,
  KeyRound,
} from 'lucide-react';

export const VerificationGate: React.FC = () => {
  const { user, updateUser, logout } = useAuth();

  // Email OTP + Verification state
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isEmailBusy, setIsEmailBusy] = useState(false);

  // Phone SMS OTP state
  const [dialCode, setDialCode] = useState('+1');
  const [localPhoneDigits, setLocalPhoneDigits] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneStatusMsg, setPhoneStatusMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isPhoneBusy, setIsPhoneBusy] = useState(false);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (user?.phone) {
      const matched = COUNTRY_DIAL_CODES.slice()
        .sort((a, b) => b.code.length - a.code.length)
        .find((c) => user.phone?.startsWith(c.code));
      if (matched) {
        setDialCode(matched.code);
        setLocalPhoneDigits(user.phone.slice(matched.code.length));
      } else {
        setLocalPhoneDigits(user.phone.replace(/\D/g, ''));
      }
    }
    return () => {
      try {
        recaptchaRef.current?.clear();
      } catch {
        // ignore cleanup error
      }
      recaptchaRef.current = null;
    };
  }, [user?.phone]);

  if (!user) return null;

  const isPhoneAccount =
    user.authMethod === 'phone' || user.email.toLowerCase().endsWith('@phone.paygo.com');
  const isEmailVerified = Boolean(user.emailVerified);
  const isPhoneVerified = Boolean(user.phoneVerified);

  const handleSendEmailOtp = async () => {
    setEmailError('');
    setEmailStatusMsg('');
    setIsEmailBusy(true);
    try {
      const res = await fetch('/api/otp/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setEmailError(data?.error || 'Unable to send 6-digit Email OTP right now.');
        return;
      }
      setEmailOtpSent(true);
      setEmailStatusMsg(
        data.message || `6-digit Email OTP sent to ${user.email}. Check your inbox and Spam folder.`
      );
    } catch {
      setEmailError('Network error sending Email OTP. Please check your connection and try again.');
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailStatusMsg('');

    const cleanCode = emailOtpCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setEmailError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    setIsEmailBusy(true);
    try {
      const res = await fetch('/api/otp/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, code: cleanCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.verified) {
        setEmailError(data?.error || 'Incorrect or expired Email OTP code.');
        return;
      }
      updateUser({ emailVerified: true });
      setEmailStatusMsg('Email OTP verified! Entering your wallet...');
    } catch {
      setEmailError('Network error verifying Email OTP. Please try again.');
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleSendEmailLink = async () => {
    setEmailError('');
    setEmailStatusMsg('');
    setIsEmailBusy(true);
    try {
      if (!auth.currentUser) {
        setEmailError(
          'Use "Send 6-Digit Email OTP" above or "Verify Instantly with Google Sign-In" below.'
        );
        return;
      }
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        updateUser({ emailVerified: true });
        setEmailStatusMsg('Your email is already verified!');
        return;
      }
      await sendEmailVerification(auth.currentUser);
      setEmailStatusMsg(
        `Verification link sent to ${user.email}. Click the link in your inbox, then tap "Confirm Link Status".`
      );
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/too-many-requests') {
        setEmailError('Too many verification emails sent recently. Please check your inbox or wait a few minutes.');
      } else {
        setEmailError(err?.message || 'Unable to send verification link right now.');
      }
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleCheckEmailVerified = async () => {
    setEmailError('');
    setEmailStatusMsg('');
    setIsEmailBusy(true);
    try {
      if (!auth.currentUser) {
        setEmailError('No active Firebase link session. Enter your 6-digit Email OTP above or use Google Sign-In.');
        return;
      }
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        updateUser({ emailVerified: true });
        setEmailStatusMsg('Email verified successfully!');
      } else {
        setEmailError('Not verified yet. Open the verification email in your inbox, click the link, then try again.');
      }
    } catch (err: any) {
      setEmailError(err?.message || 'Could not refresh email verification status.');
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleVerifyWithGoogle = async () => {
    setEmailError('');
    setEmailStatusMsg('');
    setIsEmailBusy(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const googleEmail = res.user.email?.toLowerCase();
      if (!googleEmail || !res.user.emailVerified) {
        setEmailError('Google account email is not verified.');
        return;
      }
      if (googleEmail !== user.email.toLowerCase()) {
        setEmailError(
          `Signed in as ${googleEmail}, which does not match your registered email (${user.email}). Please choose ${user.email}.`
        );
        return;
      }
      updateUser({
        email: googleEmail,
        emailVerified: true,
      });
      setEmailStatusMsg(`Email ${googleEmail} verified via Google!`);
    } catch (err: any) {
      setEmailError(err?.message || 'Google email verification was cancelled or failed.');
    } finally {
      setIsEmailBusy(false);
    }
  };

  const getOrCreateRecaptcha = () => {
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear();
      } catch {
        // ignore
      }
    }
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-phone-container', {
      size: 'invisible',
    });
    recaptchaRef.current = verifier;
    return verifier;
  };

  const handleSendSmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneStatusMsg('');

    const phoneValidation = validatePhoneWithCountry(dialCode, localPhoneDigits);
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error || 'Please enter a valid phone number');
      return;
    }

    setIsPhoneBusy(true);
    try {
      const verifier = getOrCreateRecaptcha();
      let result: ConfirmationResult;

      if (auth.currentUser && !auth.currentUser.phoneNumber) {
        result = await linkWithPhoneNumber(auth.currentUser, phoneValidation.fullNumber, verifier);
      } else {
        result = await signInWithPhoneNumber(auth, phoneValidation.fullNumber, verifier);
      }

      if (user.phone !== phoneValidation.fullNumber) {
        updateUser({ phone: phoneValidation.fullNumber });
      }
      setConfirmationResult(result);
      setPhoneStatusMsg(`6-digit OTP verification code sent via SMS to ${phoneValidation.fullNumber}.`);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setPhoneError(
          'SMS Phone OTP is not enabled yet in Firebase Console (Authentication → Sign-in method → Phone).'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setPhoneError(
          'This domain is not authorized yet in Firebase Console → Authentication → Settings → Authorized domains.'
        );
      } else if (code === 'auth/too-many-requests') {
        setPhoneError('Too many OTP attempts. Please wait a few minutes and try again.');
      } else if (code === 'auth/invalid-phone-number') {
        setPhoneError('Invalid phone number format. Check your country code and digits.');
      } else {
        setPhoneError(err?.message || 'Failed to send SMS OTP code.');
      }
    } finally {
      setIsPhoneBusy(false);
    }
  };

  const handleConfirmSmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneStatusMsg('');

    const cleanCode = smsCode.replace(/\D/g, '');
    if (cleanCode.length < 6) {
      setPhoneError('Please enter the 6-digit OTP code');
      return;
    }
    if (!confirmationResult) {
      setPhoneError('Request an SMS OTP code first before confirming.');
      return;
    }

    setIsPhoneBusy(true);
    try {
      await confirmationResult.confirm(cleanCode);
      const phoneValidation = validatePhoneWithCountry(dialCode, localPhoneDigits);
      updateUser({
        phone: phoneValidation.valid ? phoneValidation.fullNumber : user.phone,
        phoneVerified: true,
      });
      setPhoneStatusMsg('Phone OTP verified!');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-verification-code') {
        setPhoneError('Incorrect OTP code. Double-check the 6 digits sent to your phone.');
      } else if (code === 'auth/code-expired') {
        setPhoneError('OTP code expired. Please send a new SMS code.');
      } else {
        setPhoneError(err?.message || 'OTP verification failed.');
      }
    } finally {
      setIsPhoneBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-700 to-indigo-900 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {isPhoneAccount ? 'Verify Phone with OTP' : 'Verify Email with OTP'}
          </h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            {isPhoneAccount ? (
              <>
                Enter the <strong>6-digit SMS OTP code</strong> sent to your real phone number to activate your PayGo account.
              </>
            ) : (
              <>
                Request and enter the <strong>6-digit Email OTP code</strong> sent to your inbox to activate your PayGo account.
              </>
            )}
          </p>
        </div>

        {isPhoneAccount ? (
          /* Phone SMS OTP Verification (only for Phone accounts) */
          <div
            className={`rounded-2xl p-5 border-2 space-y-3 ${
              isPhoneVerified ? 'bg-emerald-50/70 border-emerald-300' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isPhoneVerified ? 'bg-emerald-600 text-white' : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {isPhoneVerified ? <CheckCircle2 className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Phone SMS OTP Verification</h2>
                  <p className="text-xs text-gray-500 font-mono">
                    {user.phone || `${dialCode}${localPhoneDigits || '...'}`}
                  </p>
                </div>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  isPhoneVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isPhoneVerified ? 'Verified' : 'OTP Required'}
              </span>
            </div>

            {!isPhoneVerified && (
              <div className="space-y-3 pt-1">
                {phoneError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{phoneError}</span>
                  </div>
                )}
                {phoneStatusMsg && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl">
                    {phoneStatusMsg}
                  </div>
                )}

                <form onSubmit={handleSendSmsOtp} className="space-y-2.5">
                  <CountryPhoneInput
                    dialCode={dialCode}
                    onDialCodeChange={setDialCode}
                    phoneDigits={localPhoneDigits}
                    onPhoneDigitsChange={setLocalPhoneDigits}
                    required
                    ariaLabel="Verification phone number"
                  />

                  <button
                    type="submit"
                    disabled={isPhoneBusy}
                    className="w-full min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{confirmationResult ? 'Resend SMS OTP Code' : 'Send SMS OTP Code'}</span>
                  </button>
                </form>

                {confirmationResult && (
                  <form onSubmit={handleConfirmSmsOtp} className="flex space-x-2 pt-1">
                    <div className="relative flex-1">
                      <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit OTP code"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isPhoneBusy}
                      className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-xl text-xs cursor-pointer disabled:opacity-60"
                    >
                      Verify OTP
                    </button>
                  </form>
                )}

                <div id="recaptcha-phone-container" />
              </div>
            )}
          </div>
        ) : (
          /* Email / Gmail 6-Digit OTP Verification */
          <div
            className={`rounded-2xl p-5 border-2 space-y-3.5 ${
              isEmailVerified ? 'bg-emerald-50/70 border-emerald-300' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isEmailVerified ? 'bg-emerald-600 text-white' : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {isEmailVerified ? <CheckCircle2 className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Email / Gmail OTP Verification</h2>
                  <p className="text-xs text-gray-500 font-mono truncate max-w-[230px]">
                    {user.email}
                  </p>
                </div>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  isEmailVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isEmailVerified ? 'Verified' : 'OTP Required'}
              </span>
            </div>

            {!isEmailVerified && (
              <div className="space-y-3 pt-1">
                {emailError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{emailError}</span>
                  </div>
                )}
                {emailStatusMsg && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl">
                    {emailStatusMsg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={isEmailBusy}
                  className="w-full min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{emailOtpSent ? 'Resend 6-Digit Email OTP' : 'Send 6-Digit Email OTP'}</span>
                </button>

                {emailOtpSent && (
                  <form onSubmit={handleVerifyEmailOtp} className="flex space-x-2">
                    <div className="relative flex-1">
                      <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit Email OTP"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isEmailBusy}
                      className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-xl text-xs cursor-pointer disabled:opacity-60"
                    >
                      Verify OTP
                    </button>
                  </form>
                )}

                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 text-center">
                    Alternative Instant Verification Options
                  </p>
                  <button
                    type="button"
                    onClick={handleVerifyWithGoogle}
                    disabled={isEmailBusy}
                    className="w-full min-h-[42px] bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verify Instantly with Google Sign-In</span>
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleSendEmailLink}
                      disabled={isEmailBusy}
                      className="min-h-[40px] bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Verification Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckEmailVerified}
                      disabled={isEmailBusy}
                      className="min-h-[40px] bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Confirm Link Status</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="w-full min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Use Different Email or Phone (Logout)</span>
        </button>
      </div>
    </div>
  );
};
