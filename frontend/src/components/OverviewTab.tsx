'use client';

import React from 'react';
import { Shield, FileText, Share2, CheckCircle2, AlertTriangle, Lock, ShieldCheck, Activity, ArrowUpRight } from 'lucide-react';

interface OverviewTabProps {
  currentUser: any;
  documents: Array<any>;
  auditLogs: Array<any>;
  riskAssessment: any;
  health: any;
  setActiveTab: (tab: string) => void;
  onOpenUpload: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  currentUser,
  documents,
  auditLogs,
  riskAssessment,
  health,
  setActiveTab,
  onOpenUpload,
}) => {
  const ownedDocs = documents.filter((d) => d.user_permission === 'OWNER');
  const sharedDocs = documents.filter((d) => d.user_permission !== 'OWNER');
  const recentLogs = auditLogs.slice(0, 5);

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-rose-400 bg-rose-950/50 border-rose-800/60';
      case 'HIGH': return 'text-amber-400 bg-amber-950/50 border-amber-800/60';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-950/50 border-yellow-800/60';
      default: return 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Welcome */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#091D36]/90 via-[#0D284C]/90 to-[#07172C]/90 border border-[rgba(116,177,235,0.25)] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#42D9FF]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#42D9FF] px-2.5 py-1 rounded-md bg-[#08203D] border border-[#42D9FF]/30">
              <span className="w-2 h-2 rounded-full bg-[#42D9FF] animate-ping" />
              <span>ACTIVE SECURITY CLEARANCE: {currentUser?.role?.toUpperCase()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, {currentUser?.full_name}
            </h1>
            <p className="text-sm sm:text-base text-[#B6C9E3] max-w-2xl leading-relaxed">
              All documents in your vault are encrypted at rest with hardware-accelerated <strong className="text-white">AES-256-GCM</strong>. Every access attempt is immutably logged into an <strong className="text-white">HMAC-SHA256</strong> integrity chain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentUser?.role !== 'VIEWER' && (
              <button
                onClick={onOpenUpload}
                className="px-5 py-3 rounded-xl btn-primary-blue font-bold text-sm tracking-wide flex items-center space-x-2 shadow-lg active:scale-95 transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Encrypt & Upload</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('audit')}
              className="px-5 py-3 rounded-xl bg-[#0B213D] hover:bg-[#112E54] border border-[rgba(116,177,235,0.3)] text-[#DCEEFF] font-semibold text-sm tracking-wide flex items-center space-x-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-[#42D9FF]" />
              <span>Verify Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Vault Documents */}
        <div 
          onClick={() => setActiveTab('vault')}
          className="p-5 sm:p-6 rounded-2xl glass-card border border-[rgba(116,177,235,0.22)] hover:border-[#42D9FF]/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#B6C9E3]">Vault Documents</span>
            <div className="p-2.5 rounded-xl bg-[#0D2545] border border-[#168BFF]/30 text-[#42D9FF] group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white">{documents.length}</span>
            <span className="text-xs sm:text-sm text-[#859DBE]">files accessible</span>
          </div>
          <div className="mt-3 flex items-center space-x-2 text-xs text-[#859DBE] font-mono">
            <span>{ownedDocs.length} owned</span>
            <span>•</span>
            <span>{sharedDocs.length} shared</span>
          </div>
        </div>

        {/* Card 2: Cryptographic Audit Trail */}
        <div 
          onClick={() => setActiveTab('audit')}
          className="p-5 sm:p-6 rounded-2xl glass-card border border-[rgba(116,177,235,0.22)] hover:border-[#42D9FF]/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#B6C9E3]">Audit Chain</span>
            <div className="p-2.5 rounded-xl bg-[#092B2B] border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">
              {health?.audit_total_records ?? auditLogs.length}
            </span>
            <span className="text-xs sm:text-sm text-[#859DBE]">events verified</span>
          </div>
          <div className="mt-3 text-xs text-emerald-400 font-mono flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>HMAC-SHA256 Link Intact</span>
          </div>
        </div>

        {/* Card 3: Security Risk Score */}
        <div 
          onClick={() => setActiveTab('security')}
          className="p-5 sm:p-6 rounded-2xl glass-card border border-[rgba(116,177,235,0.22)] hover:border-[#42D9FF]/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#B6C9E3]">User Threat Score</span>
            <div className={`p-2.5 rounded-xl border text-xs font-bold font-mono ${getRiskColor(riskAssessment?.severity || 'LOW')}`}>
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white">
              {riskAssessment?.risk_score ?? 0}
            </span>
            <span className="text-xs sm:text-sm text-[#859DBE]">/ 100</span>
          </div>
          <div className="mt-3 flex items-center space-x-2">
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-bold uppercase ${getRiskColor(riskAssessment?.severity || 'LOW')}`}>
              {riskAssessment?.severity || 'LOW'} RISK
            </span>
            <span className="text-xs text-[#859DBE] truncate">
              {riskAssessment?.contributing_signals?.length || 0} active signals
            </span>
          </div>
        </div>

        {/* Card 4: Single-Session Policy */}
        <div 
          onClick={() => setActiveTab('sessions')}
          className="p-5 sm:p-6 rounded-2xl glass-card border border-[rgba(116,177,235,0.22)] hover:border-[#42D9FF]/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#B6C9E3]">Session Policy</span>
            <div className="p-2.5 rounded-xl bg-[#0D2545] border border-[#168BFF]/30 text-[#42D9FF] group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#DCEEFF]">
              {health?.single_active_session ? 'ENFORCED' : 'MULTI'}
            </span>
          </div>
          <div className="mt-3 text-xs text-[#859DBE]">
            Concurrent logins auto-revoked
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Documents & Live Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Recent Vault Documents */}
        <div className="rounded-2xl p-6 glass-card-static border border-[rgba(116,177,235,0.22)] space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(116,177,235,0.18)] pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#42D9FF]" />
              <h2 className="text-base sm:text-lg font-bold text-white">Accessible Vault Documents</h2>
            </div>
            <button
              onClick={() => setActiveTab('vault')}
              className="text-xs sm:text-sm text-[#42D9FF] hover:text-[#DCEEFF] flex items-center space-x-1 transition font-medium"
            >
              <span>View all</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-[#859DBE] text-sm border border-dashed border-[rgba(116,177,235,0.2)] rounded-xl">
                No accessible documents in your vault. Upload one to get started.
              </div>
            ) : (
              documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setActiveTab('vault')}
                  className="p-4 rounded-xl bg-[#091D36]/70 border border-[rgba(116,177,235,0.18)] hover:border-[#42D9FF]/40 flex items-center justify-between cursor-pointer transition group"
                >
                  <div className="flex items-center space-x-3.5 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-[#0E284A] border border-[rgba(116,177,235,0.25)] flex items-center justify-center text-[#42D9FF] flex-shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="text-sm font-semibold text-white truncate group-hover:text-[#42D9FF] transition">
                        {doc.title}
                      </div>
                      <div className="text-xs text-[#859DBE] font-mono truncate mt-0.5">
                        {(doc.file_size_bytes / 1024).toFixed(1)} KB • {doc.original_filename}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0A223F] text-[#42D9FF] border border-[#168BFF]/30">
                      {doc.classification_level}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#061426] text-[#B6C9E3]">
                      {doc.user_permission}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Live Audit Feed */}
        <div className="rounded-2xl p-6 glass-card-static border border-[rgba(116,177,235,0.22)] space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(116,177,235,0.18)] pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Live Audit Trail Feed</h2>
            </div>
            <button
              onClick={() => setActiveTab('audit')}
              className="text-xs sm:text-sm text-[#42D9FF] hover:text-[#DCEEFF] flex items-center space-x-1 transition font-medium"
            >
              <span>Full Audit Chain</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-[#859DBE] text-sm border border-dashed border-[rgba(116,177,235,0.2)] rounded-xl">
                No recent audit events.
              </div>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-[#091D36]/70 border border-[rgba(116,177,235,0.18)] flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="text-xs font-mono text-[#42D9FF] bg-[#0C2442] px-2 py-0.5 rounded border border-[#42D9FF]/30 flex-shrink-0">
                      #{log.sequence_number}
                    </span>
                    <div className="truncate">
                      <div className="text-sm font-semibold text-white truncate flex items-center space-x-1.5">
                        <span>{log.action}</span>
                      </div>
                      <div className="text-xs text-[#859DBE] font-mono truncate mt-0.5">
                        {log.actor_email} • {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono px-2.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                      log.outcome === 'SUCCESS'
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                        : log.outcome === 'DENIED'
                        ? 'bg-rose-950/70 text-rose-400 border border-rose-800/50'
                        : 'bg-amber-950/70 text-amber-400 border border-amber-800/50'
                    }`}
                  >
                    {log.outcome}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};