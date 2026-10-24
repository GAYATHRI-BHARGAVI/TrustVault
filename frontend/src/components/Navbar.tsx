'use client';

import React from 'react';
import { Shield, RefreshCw, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

interface NavbarProps {
  currentUser: any;
  onOpenDemoSwitcher: () => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: any;
  onOpenProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenDemoSwitcher,
  onLogout,
  activeTab,
  setActiveTab,
  health,
  onOpenProfile,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(116,177,235,0.18)] bg-[#07172C]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Title */}
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none group" 
            onClick={() => setActiveTab('overview')}
          >
            <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#168BFF]/30 to-[#0C2442] border border-[#42D9FF]/40 shadow-[0_0_22px_rgba(66,217,255,0.3)] group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 text-[#42D9FF]" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#42D9FF] animate-ping" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-mono">
                  TRUST<span className="text-[#42D9FF]">VAULT</span>
                </span>
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#0C2442] text-[#42D9FF] border border-[#42D9FF]/35">
                  AES-256
                </span>
              </div>
              <p className="text-xs text-[#B6C9E3] tracking-wide hidden sm:block">
                Secure Document Sharing. Verifiable Trust.
              </p>
            </div>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center space-x-2.5 sm:space-x-4">
            
            {/* System Integrity Pulse */}
            <div className="hidden lg:flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#091D36]/80 border border-[rgba(116,177,235,0.2)] text-xs">
              <span className={`w-2 h-2 rounded-full ${health?.audit_chain_valid ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
              <span className="text-[#DCEEFF] font-medium">
                {health?.audit_chain_valid ? 'Audit Chain Intact' : 'Integrity Attention'}
              </span>
            </div>

            {/* Switch Persona Pill */}
            <button
              onClick={onOpenDemoSwitcher}
              title="Switch demo identity for testing permissions"
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#0C2442]/80 hover:bg-[#12335C] border border-[#42D9FF]/30 hover:border-[#42D9FF]/70 text-[#DCEEFF] text-xs font-semibold transition-all group shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#42D9FF] group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden md:inline">Switch Persona</span>
              <span className="text-[10px] bg-[#168BFF]/25 px-1.5 py-0.5 rounded text-[#42D9FF] font-bold">Demo</span>
            </button>

            {/* Current Persona Badge (Click to open Profile) */}
            {currentUser && (
              <button
                onClick={onOpenProfile}
                title="View & Edit Security Profile (Name, Password)"
                className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl bg-[#08182D] border border-[rgba(116,177,235,0.22)] hover:border-[#42D9FF]/50 transition group cursor-pointer text-left shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#168BFF] to-[#42D9FF] flex items-center justify-center text-xs font-bold text-slate-950 shadow-md group-hover:scale-105 transition-transform">
                  {currentUser.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-[#F4F8FF] leading-tight flex items-center gap-1.5">
                    {currentUser.full_name}
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0F2D54] text-[#42D9FF] uppercase font-semibold">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#859DBE] font-mono truncate max-w-[150px]">
                    {currentUser.email}
                  </div>
                </div>
              </button>
            )}

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Terminate session and logout"
              className="p-2.5 rounded-xl bg-[#08182D] hover:bg-rose-950/50 border border-[rgba(116,177,235,0.2)] hover:border-rose-500/50 text-[#859DBE] hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};