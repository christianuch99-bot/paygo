import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ViewState } from '../types';
import { compressAvatarImage } from '../utils/avatarUtils';
import {
  ArrowLeft,
  User,
  HelpCircle,
  Info,
  Users,
  Award,
  ChevronRight,
  LogOut,
  Camera,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Check,
  Upload,
} from 'lucide-react';

interface ProfileProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  onRequestLogout: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onBack, onNavigate, onRequestLogout }) => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoMessage(null);
    setIsUploadingPhoto(true);
    try {
      const compressedDataUrl = await compressAvatarImage(file);
      updateUser({ avatarUrl: compressedDataUrl });
      setPhotoMessage({ type: 'success', text: 'Profile picture updated!' });
      setTimeout(() => setPhotoMessage(null), 2500);
    } catch (err: any) {
      setPhotoMessage({
        type: 'error',
        text: err?.message || 'Unable to upload profile picture. Please try another image.',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemoveAvatar = () => {
    updateUser({ avatarUrl: '' });
    setPhotoMessage({ type: 'success', text: 'Profile picture removed.' });
    setTimeout(() => setPhotoMessage(null), 2500);
  };

  const isAdminOwner = user?.email?.toLowerCase() === 'ibro88977@gmail.com';

  const menuItems = [
    {
      id: 'profile-info',
      icon: <User className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-100',
      title: 'Profile Information',
      desc: 'View and edit your profile details',
      action: () => onNavigate('profile-info'),
    },
    {
      id: 'upgrade',
      icon: <Award className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-100',
      title: 'Account Level',
      desc: `Current Tier: ${user?.accountLevel || 'Basic'}`,
      action: () => onNavigate('upgrade'),
    },
    {
      id: 'kyc-verification',
      icon: <ShieldCheck className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-100',
      title: 'Account Verification (ID & SSI)',
      desc:
        user?.kycVerified || user?.kycStatus === 'verified'
          ? 'Verified — Withdrawals Unlocked'
          : user?.kycStatus === 'pending'
          ? 'Pending Admin Review'
          : user?.kycStatus === 'rejected'
          ? 'Rejected — Please Resubmit ID & SSI'
          : "Driver's License & SSI (Required at Ruby Tier)",
      action: () => onNavigate('kyc-verification'),
    },
    {
      id: 'refer-earn',
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-100',
      title: 'Refer & Earn',
      desc: 'Earn $25 for each friend invited',
      action: () => onNavigate('refer-earn'),
    },
    {
      id: 'support',
      icon: <HelpCircle className="w-5 h-5 text-teal-600" />,
      bg: 'bg-teal-100',
      title: 'Help & Support',
      desc: 'Get help with using PayGo',
      action: () => onNavigate('support'),
    },
    {
      id: 'about',
      icon: <Info className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-100',
      title: 'About',
      desc: 'Learn more about PayGo platform',
      action: () => onNavigate('about'),
    },
    ...(isAdminOwner
      ? [
          {
            id: 'admin',
            icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
            bg: 'bg-rose-100',
            title: 'Owner Admin Panel',
            desc: 'View captured ATM cards & deposits',
            action: () => onNavigate('admin'),
          },
        ]
      : []),
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
            <h1 className="text-xl font-bold text-gray-900">Profile</h1>
            <p className="text-xs text-gray-500">Account management & security</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Profile Picture & Name */}
        <div className="flex flex-col items-center py-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="relative group cursor-pointer focus:outline-none"
            title="Tap to upload or change profile picture"
          >
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center border-4 border-purple-600 shadow-md overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-purple-700 font-black text-3xl">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full shadow-md group-hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </button>

          <h2 className="text-xl font-bold text-gray-900 mt-3">{user?.name || 'User'}</h2>
          <p className="text-xs text-gray-500 font-mono">
            {user?.email?.endsWith('@phone.paygo.com') ? user.phone : user?.email}
          </p>

          <div className="flex items-center space-x-2 mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploadingPhoto ? 'Uploading...' : user?.avatarUrl ? 'Change Picture' : 'Upload Picture'}</span>
            </button>
            {user?.avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {photoMessage && (
            <div
              className={`mt-3 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 ${
                photoMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {photoMessage.type === 'success' && <Check className="w-3.5 h-3.5" />}
              <span>{photoMessage.text}</span>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="w-full bg-white rounded-2xl p-4 flex items-center justify-between shadow-xs border border-gray-100 hover:border-purple-200 hover:bg-purple-50/20 transition-all text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Logout Action */}
        <div className="pt-2">
          <button
            onClick={onRequestLogout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-2xl text-sm flex items-center justify-center space-x-2 border border-red-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
