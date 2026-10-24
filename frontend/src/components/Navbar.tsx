'use client';

import React from 'react';
import { Shield, ShieldAlert, KeyRound, UserCheck, RefreshCw, LogOut, Lock } from 'lucide-react';

interface NavbarProps {
  currentUser: any;
  onOpenDemoSwitcher: () => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: any;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenDemoSwitcher,
  onLogout,
  activeTab,
  setActiveTab,
  health,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0A0E1A]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
              <Shield className="w-5 h-5 text-cyan-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">
                  TRUST<span className="text-cyan-400">VAULT</span>
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  AES-256
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide hidden sm:block">
                Secure Document Sharing. Verifiable Trust.
              </p>
            </div>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center space-x-3">
            {/* System Integrity Pulse */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <span className={`w-2 h-2 rounded-full ${health?.audit_chain_valid ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
              <span className="text-slate-300">
                {health?.audit_chain_valid ? 'Audit Chain Intact' : 'Integrity Attention'}
              </span>
            </div>

            {/* Demo Identity Switcher Pill */}
            <button
              onClick={onOpenDemoSwitcher}
              title="Switch demo identity for testing permissions"
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-medium transition-all group"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden md:inline">Switch Persona</span>
              <span className="text-[10px] bg-cyan-500/20 px-1 py-0.5 rounded text-cyan-300">Demo</span>
            </button>

            {/* Current Persona Badge */}
            {currentUser && (
              <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {currentUser.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight flex items-center gap-1.5">
                    {currentUser.full_name}
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 uppercase">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                    {currentUser.email}
                  </div>
                </div>
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Terminate session and logout"
              className="p-2 rounded-lg bg-slate-900/60 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
