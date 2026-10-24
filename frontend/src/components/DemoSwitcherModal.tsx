'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle, ArrowRight, Shield } from 'lucide-react';
import { api } from '@/lib/api';

interface DemoSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onUserSwitched: (newUser: any) => void;
}

export const DemoSwitcherModal: React.FC<DemoSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentEmail,
  onUserSwitched,
}) => {
  const [demoUsers, setDemoUsers] = useState<Array<any>>([]);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getDemoUsers()
        .then((res) => setDemoUsers(res.demo_users))
        .catch((err) => setError(err.message));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwitch = async (email: string) => {
    try {
      setLoadingEmail(email);
      setError(null);
      const res = await api.switchDemo(email);
      onUserSwitched(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingEmail(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl glass-card-static border border-[rgba(116,177,235,0.3)] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[rgba(116,177,235,0.2)] bg-[#091D36]/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#0E284A] border border-[#42D9FF]/35 text-[#42D9FF]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Demo Identity Selector
              </h3>
              <p className="text-xs text-[#B6C9E3]">
                Switch between pre-seeded test personas to evaluate authorization boundaries
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

        {/* Security Notice Banner */}
        <div className="px-6 sm:px-8 py-3 bg-[#0C2442]/80 border-b border-[rgba(116,177,235,0.18)] flex items-center space-x-2 text-xs text-[#DCEEFF]">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-[#42D9FF]" />
          <span>
            <strong>Development Notice:</strong> Generates real cryptographic sessions with PBKDF2 credentials to evaluate permission boundaries.
          </span>
        </div>

        {/* User Persona Cards */}
        <div className="p-6 sm:p-8 space-y-3 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-xs text-rose-300">
              {error}
            </div>
          )}

          {demoUsers.map((user) => {
            const isCurrent = user.email.toLowerCase() === currentEmail.toLowerCase();
            const isLoading = loadingEmail === user.email;

            return (
              <div
                key={user.email}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-[#0E284A]/70 border-[#42D9FF]/50 shadow-[0_0_20px_rgba(66,217,255,0.15)]'
                    : 'bg-[#07172C]/70 border-[rgba(116,177,235,0.2)] hover:border-[#42D9FF]/40 hover:bg-[#091D36]'
                } flex items-center justify-between gap-4`}
              >
                <div className="space-y-1 pr-2 truncate">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">
                      {user.full_name}
                    </span>
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#0A223F] text-[#42D9FF] border border-[#168BFF]/30 font-bold">
                      {user.role}
                    </span>
                    {isCurrent && (
                      <span className="flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#859DBE] font-mono">
                    {user.email}
                  </div>
                  <p className="text-xs text-[#B6C9E3] line-clamp-1">
                    {user.description}
                  </p>
                </div>

                <button
                  disabled={isCurrent || isLoading}
                  onClick={() => handleSwitch(user.email)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all flex-shrink-0 ${
                    isCurrent
                      ? 'bg-[#0E284A] text-[#859DBE] cursor-not-allowed border border-[rgba(116,177,235,0.2)]'
                      : 'btn-primary-blue active:scale-95'
                  }`}
                >
                  {isLoading ? (
                    <span>Authenticating...</span>
                  ) : isCurrent ? (
                    <span>Current</span>
                  ) : (
                    <>
                      <span>Assume Persona</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
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