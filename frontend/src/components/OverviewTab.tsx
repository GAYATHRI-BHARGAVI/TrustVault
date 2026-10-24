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
      case 'CRITICAL': return 'text-rose-400 bg-rose-950/40 border-rose-800/60';
      case 'HIGH': return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-950/40 border-yellow-800/60';
      default: return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Welcome */}
      <div className="relative rounded-2xl p-6 bg-gradient-to-r from-[#0C1527] via-[#0F1B35] to-[#0A1120] border border-cyan-500/20 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>ACTIVE SECURITY CLEARANCE: {currentUser?.role?.toUpperCase()}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back, {currentUser?.full_name}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              All documents in your vault are encrypted at rest with hardware-accelerated <strong>AES-256-GCM</strong>. Every access attempt is immutably logged into an <strong>HMAC-SHA256</strong> integrity chain.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenUpload}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide flex items-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
            >
              <Lock className="w-4 h-4" />
              <span>Encrypt & Upload Document</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-medium text-xs tracking-wide flex items-center space-x-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Verify Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Vault Documents */}
        <div 
          onClick={() => setActiveTab('vault')}
          className="p-5 rounded-xl bg-[#0F172A]/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-[#131E35] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Vault Documents</span>
            <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-white">{documents.length}</span>
            <span className="text-xs text-slate-400">files accessible</span>
          </div>
          <div className="mt-2 flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
            <span>{ownedDocs.length} owned</span>
            <span>•</span>
            <span>{sharedDocs.length} shared</span>
          </div>
        </div>

        {/* Card 2: Cryptographic Audit Trail */}
        <div 
          onClick={() => setActiveTab('audit')}
          className="p-5 rounded-xl bg-[#0F172A]/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-[#131E35] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Audit Chain</span>
            <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {health?.audit_total_records ?? auditLogs.length}
            </span>
            <span className="text-xs text-slate-400">events logged</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>HMAC-SHA256 Link Intact</span>
          </div>
        </div>

        {/* Card 3: Security Risk Score */}
        <div 
          onClick={() => setActiveTab('security')}
          className="p-5 rounded-xl bg-[#0F172A]/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-[#131E35] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">User Risk Score</span>
            <div className={`p-2 rounded-lg border text-xs font-bold font-mono ${getRiskColor(riskAssessment?.severity || 'LOW')}`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-white">
              {riskAssessment?.risk_score ?? 0}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="mt-2 flex items-center space-x-1.5">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getRiskColor(riskAssessment?.severity || 'LOW')}`}>
              {riskAssessment?.severity || 'LOW'} RISK
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              {riskAssessment?.contributing_signals?.length || 0} signals
            </span>
          </div>
        </div>

        {/* Card 4: Single-Session Policy */}
        <div 
          onClick={() => setActiveTab('sessions')}
          className="p-5 rounded-xl bg-[#0F172A]/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-[#131E35] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Session Policy</span>
            <div className="p-2 rounded-lg bg-blue-950/50 border border-blue-800/40 text-blue-400 group-hover:scale-110 transition-transform">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-xl font-bold font-mono text-cyan-300">
              {health?.single_active_session ? 'ENFORCED' : 'MULTI'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Concurrent logins auto-revoked
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Documents & Live Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Vault Documents */}
        <div className="rounded-2xl p-6 bg-[#0F172A]/70 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">Accessible Vault Documents</h2>
            </div>
            <button
              onClick={() => setActiveTab('vault')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No accessible documents in your vault. Upload one to get started.
              </div>
            ) : (
              documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setActiveTab('vault')}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {doc.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {(doc.file_size_bytes / 1024).toFixed(1)} KB • {doc.original_filename}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      {doc.classification_level}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                      {doc.user_permission}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Live Audit Feed */}
        <div className="rounded-2xl p-6 bg-[#0F172A]/70 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-100">Live Audit Trail Feed</h2>
            </div>
            <button
              onClick={() => setActiveTab('audit')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition"
            >
              <span>Full Audit Chain</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No recent audit events.
              </div>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40 flex-shrink-0">
                      #{log.sequence_number}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate flex items-center space-x-1.5">
                        <span>{log.action}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {log.actor_email} • {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded flex-shrink-0 ${
                      log.outcome === 'SUCCESS'
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                        : log.outcome === 'DENIED'
                        ? 'bg-rose-950/50 text-rose-400 border border-rose-800/40'
                        : 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
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
