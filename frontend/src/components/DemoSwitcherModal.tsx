'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle, ArrowRight, UserCheck, Shield } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0D1322] border border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.15)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Demo Identity Selector
              </h3>
              <p className="text-xs text-slate-400">
                Isolated local development role simulator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice Banner */}
        <div className="px-6 py-2.5 bg-amber-950/40 border-b border-amber-800/40 flex items-center space-x-2 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>
            <strong>Development Notice:</strong> This switcher is for isolated local testing. In production, real authentication with Argon2/PBKDF2 credentials and MFA is strictly enforced.
          </span>
        </div>

        {/* User Persona Cards */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
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
                    ? 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                } flex items-center justify-between`}
              >
                <div className="space-y-1 pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-slate-100">
                      {user.full_name}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {user.role_badge}
                    </span>
                    {isCurrent && (
                      <span className="flex items-center space-x-1 text-[11px] text-cyan-400 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {user.email}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {user.description}
                  </p>
                </div>

                <button
                  disabled={isCurrent || isLoading}
                  onClick={() => handleSwitch(user.email)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all flex-shrink-0 ${
                    isCurrent
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 active:scale-95'
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
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0F172A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
