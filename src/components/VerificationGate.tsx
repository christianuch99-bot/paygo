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

  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isEmailBusy, setIsEmailBusy] = useState(false);

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

  const isEmailVerified = Boolean(user.emailVerified);
  const isPhoneVerified = Boolean(user.phoneVerified);
  const isPhoneSyntheticEmail = user.email.endsWith('@phone.paygo.com');

  const handleSendEmailLink = async () => {
    setEmailError('');
    setEmailStatusMsg('');
    setIsEmailBusy(true);
    try {
      if (!auth.currentUser) {
        setEmailError(
          'Please click "Verify Instantly with Google" below (or enable Email/Password sign-in in Firebase Console) to verify your email.'
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
        `Verification link sent to ${user.email}. Open your inbox (check Spam if needed), click the link, then tap "Confirm Email Status".`
      );
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/too-many-requests') {
        setEmailError('Too many verification emails sent recently. Please check your inbox or wait a few minutes.');
      } else {
        setEmailError(err?.message || 'Unable to send verification email right now.');
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
        setEmailError('No active Firebase session found. Use "Verify Instantly with Google" to confirm your email.');
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
      if (!isPhoneSyntheticEmail && googleEmail !== user.email.toLowerCase()) {
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

  const handleSendSmsCode = async (e: React.FormEvent) => {
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
      setPhoneStatusMsg(`6-digit SMS verification code sent to ${phoneValidation.fullNumber}.`);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setPhoneError(
          'SMS Phone Authentication is not enabled yet in Firebase Console (Authentication → Sign-in method → Phone).'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setPhoneError(
          'This domain is not authorized yet in Firebase Console → Authentication → Settings → Authorized domains.'
        );
      } else if (code === 'auth/too-many-requests') {
        setPhoneError('Too many SMS attempts. Please wait a few minutes and try again.');
      } else if (code === 'auth/invalid-phone-number') {
        setPhoneError('Invalid phone number format. Check your country code and digits.');
      } else {
        setPhoneError(err?.message || 'Failed to send SMS verification code.');
      }
    } finally {
      setIsPhoneBusy(false);
    }
  };

  const handleConfirmSmsCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneStatusMsg('');

    const cleanCode = smsCode.replace(/\D/g, '');
    if (cleanCode.length < 6) {
      setPhoneError('Please enter the 6-digit SMS verification code');
      return;
    }
    if (!confirmationResult) {
      setPhoneError('Request an SMS code first before confirming.');
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
      setPhoneStatusMsg('Phone number verified!');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-verification-code') {
        setPhoneError('Incorrect SMS code. Double-check the 6 digits sent to your phone.');
      } else if (code === 'auth/code-expired') {
        setPhoneError('Verification code expired. Please send a new SMS code.');
      } else {
        setPhoneError(err?.message || 'Verification code failed.');
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
          <h1 className="text-2xl font-extrabold text-gray-900">Verify Your Account</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            Both your <strong>Email / Gmail</strong> and <strong>Phone Number (SMS Code)</strong> must be verified before opening your PayGo account.
          </p>
        </div>

        {/* Step 1: Email / Gmail Verification */}
        <div
          className={`rounded-2xl p-5 border-2 space-y-3 ${
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
                <h2 className="text-sm font-bold text-gray-900">1. Email / Gmail Verification</h2>
                <p className="text-xs text-gray-500 font-mono truncate max-w-[230px]">
                  {isPhoneSyntheticEmail ? 'Verify your Gmail account' : user.email}
                </p>
              </div>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                isEmailVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isEmailVerified ? 'Verified' : 'Required'}
            </span>
          </div>

          {!isEmailVerified && (
            <div className="space-y-2.5 pt-1">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {!isPhoneSyntheticEmail && (
                  <>
                    <button
                      type="button"
                      onClick={handleSendEmailLink}
                      disabled={isEmailBusy}
                      className="min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Verification Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckEmailVerified}
                      disabled={isEmailBusy}
                      className="min-h-[44px] bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Confirm Email Status</span>
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleVerifyWithGoogle}
                disabled={isEmailBusy}
                className="w-full min-h-[44px] bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verify Instantly with Google Sign-In</span>
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Phone SMS Code Verification */}
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
                <h2 className="text-sm font-bold text-gray-900">2. Phone SMS Code Verification</h2>
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
              {isPhoneVerified ? 'Verified' : 'Required'}
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

              <form onSubmit={handleSendSmsCode} className="space-y-2.5">
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white">
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    aria-label="Country dial code"
                    className="bg-gray-50 border-r border-gray-200 px-2.5 py-2.5 text-xs font-semibold text-gray-800 outline-none max-w-[130px]"
                  >
                    {COUNTRY_DIAL_CODES.map((c) => (
                      <option key={`${c.iso}-${c.code}`} value={c.code}>
                        {c.flag} {c.code} ({c.iso})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={localPhoneDigits}
                    onChange={(e) => setLocalPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    placeholder={dialCode === '+1' ? '(555) 234-5678' : 'Enter phone digits'}
                    className="w-full px-3 py-2.5 outline-none text-gray-900 text-sm font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPhoneBusy}
                  className="w-full min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{confirmationResult ? 'Resend SMS Code' : 'Send SMS Verification Code'}</span>
                </button>
              </form>

              {confirmationResult && (
                <form onSubmit={handleConfirmSmsCode} className="flex space-x-2 pt-1">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit SMS code"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPhoneBusy}
                    className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-xl text-xs cursor-pointer disabled:opacity-60"
                  >
                    Verify Code
                  </button>
                </form>
              )}

              <div id="recaptcha-phone-container" />
            </div>
          )}
        </div>

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
