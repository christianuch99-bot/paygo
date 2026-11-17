import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { compressAvatarImage } from '../utils/avatarUtils';
import { ArrowLeft, User, Mail, Phone, Award, ShieldCheck, Check, Edit2, Camera, Upload, Trash2 } from 'lucide-react';

interface ProfileInfoProps {
  onBack: () => void;
}

export const ProfileInfo: React.FC<ProfileInfoProps> = ({ onBack }) => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [savedSuccess, setSavedSuccess] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      updateUser({ name: newName.trim() });
      setIsEditing(false);
      setSavedSuccess('Profile name updated successfully!');
      setTimeout(() => setSavedSuccess(''), 2500);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError('');
    setIsUploadingPhoto(true);
    try {
      const compressedDataUrl = await compressAvatarImage(file);
      updateUser({ avatarUrl: compressedDataUrl });
      setSavedSuccess('Profile picture updated successfully!');
      setTimeout(() => setSavedSuccess(''), 2500);
    } catch (err: any) {
      setPhotoError(err?.message || 'Unable to upload profile picture.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemoveAvatar = () => {
    updateUser({ avatarUrl: '' });
    setSavedSuccess('Profile picture removed.');
    setTimeout(() => setSavedSuccess(''), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white p-4 border-b sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Profile Information</h1>
            <p className="text-xs text-gray-500">Account status and personal details</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
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
            className="relative group cursor-pointer focus:outline-none mb-3"
            title="Upload or change profile picture"
          >
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center border-4 border-purple-600 shadow-md overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-purple-600" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full shadow-md group-hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </button>

          <h2 className="text-2xl font-bold text-gray-900">{user?.name || 'User'}</h2>
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
              <span>{isUploadingPhoto ? 'Uploading...' : user?.avatarUrl ? 'Change Picture' : 'Add Picture'}</span>
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
        </div>

        {photoError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {photoError}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{savedSuccess}</span>
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-900">Account Information</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-purple-600 font-semibold hover:underline flex items-center space-x-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel' : 'Edit Name'}</span>
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-sm transition-all"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Full Name</p>
                  <p className="font-bold text-gray-900">{user?.name || 'User'}</p>
                </div>
              </div>

              {!user?.email?.endsWith('@phone.paygo.com') && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Email Address</p>
                    <p className="font-bold text-gray-900 font-mono text-xs">{user?.email}</p>
                  </div>
                </div>
              )}

              {user?.phone && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Phone Number</p>
                    <p className="font-bold text-gray-900 font-mono text-xs">{user.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Account Level</p>
                  <p className="font-bold text-amber-700">{user?.accountLevel || 'Basic'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Account Status</p>
                  <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                    Verified Active
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
