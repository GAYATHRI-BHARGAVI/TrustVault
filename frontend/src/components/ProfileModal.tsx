'use client';

import React, { useState } from 'react';
import { X, User, KeyRound, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { api } from '@/lib/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onProfileUpdated: (updatedUser: any) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    try {
      setProfileLoading(true);
      setProfileError(null);
      setProfileMsg(null);
      const res = await api.updateProfile(fullName);
      setProfileMsg('Profile information updated successfully.');
      onProfileUpdated(res);
    } catch (err: any) {
      setProfileError(err.message || 'Profile update failed.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError(null);
      setPasswordMsg(null);
      const res = await api.changePassword(currentPassword, newPassword);
      setPasswordMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Password update failed.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl glass-card-static border border-[rgba(116,177,235,0.3)] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[rgba(116,177,235,0.2)] bg-[#091D36]/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#0E284A] border border-[#42D9FF]/35 text-[#42D9FF]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                User Security Profile
              </h3>
              <p className="text-xs text-[#B6C9E3]">
                Update account details and cryptographic credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#859DBE] hover:text-white hover:bg-[#0E2C52] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Section 1: Legal Name */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <User className="w-4 h-4 text-[#42D9FF]" />
              <span>Identity Profile Details</span>
            </h4>

            {profileMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{profileMsg}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#DCEEFF] mb-1">
                  Email Address (Immutable)
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser?.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#051120] border border-[rgba(116,177,235,0.18)] text-sm text-[#859DBE] font-mono opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#DCEEFF] mb-1">
                  Application Role
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#0C2442] text-[#42D9FF] border border-[#168BFF]/40 font-bold uppercase">
                    {currentUser?.role}
                  </span>
                  <span className="text-xs text-[#859DBE]">
                    Managed by administrative access control
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#DCEEFF] mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] focus:outline-none focus:border-[#42D9FF]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-5 py-2.5 rounded-xl btn-primary-blue text-xs font-bold tracking-wide shadow-md active:scale-95 transition disabled:opacity-50"
              >
                {profileLoading ? 'Saving...' : 'Update Name'}
              </button>
            </div>
          </form>

          {/* Section 2: Password Update */}
          <div className="pt-4 border-t border-[rgba(116,177,235,0.18)]">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-[#42D9FF]" />
                <span>Cryptographic Password Rotation</span>
              </h4>

              <p className="text-xs text-[#859DBE]">
                Changing your password verifies your existing password and immediately revokes all other active sessions across devices.
              </p>

              {passwordMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-xs text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{passwordMsg}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#DCEEFF] mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] focus:outline-none focus:border-[#42D9FF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#DCEEFF] mb-1">
                      New Password (min 8)
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] focus:outline-none focus:border-[#42D9FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#DCEEFF] mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] focus:outline-none focus:border-[#42D9FF]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 rounded-xl btn-primary-blue text-xs font-bold tracking-wide shadow-md active:scale-95 transition disabled:opacity-50"
                >
                  {passwordLoading ? 'Rotating Password...' : 'Rotate Password'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-[rgba(116,177,235,0.2)] bg-[#091D36] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0E284A] hover:bg-[#163D6C] text-[#DCEEFF] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};