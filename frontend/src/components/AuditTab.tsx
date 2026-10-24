'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, 
  Terminal, Lock, Link as LinkIcon, Database, ChevronDown, ChevronRight, Play, Wrench
} from 'lucide-react';
import { api } from '@/lib/api';

interface AuditTabProps {
  auditLogs: Array<any>;
  onRefresh: () => void;
  currentUser: any;
}

export const AuditTab: React.FC<AuditTabProps> = ({
  auditLogs,
  onRefresh,
  currentUser,
}) => {
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [tamperingAction, setTamperingAction] = useState<string | null>(null);
  const [labMessage, setLabMessage] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const res = await api.verifyAuditChain();
      setVerificationResult(res);
      onRefresh();
    } catch (err: any) {
      setVerificationResult({
        is_valid: false,
        failure_reason: err.message,
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTamper = async (mode: 'audit_record' | 'break_hash_pointer' | 'ciphertext' | 'restore') => {
    try {
      setTamperingAction(mode);
      setLabMessage(null);
      const res = await api.simulateTamper(mode);
      setLabMessage(res.message);
      // Run verify immediately to demonstrate detection
      const verifyRes = await api.verifyAuditChain();
      setVerificationResult(verifyRes);
      onRefresh();
    } catch (err: any) {
      setLabMessage(`Error: ${err.message}`);
    } finally {
      setTamperingAction(null);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = !filterAction || log.action.includes(filterAction);
    const matchesOutcome = !filterOutcome || log.outcome === filterOutcome;
    return matchesAction && matchesOutcome;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-[#42D9FF]" />
            <span>Cryptographic Audit Trail</span>
          </h2>
          <p className="text-sm text-[#B6C9E3] mt-1">
            HMAC-SHA256 monotonic hash chain linking all security events into a tamper-evident sequence.
          </p>
        </div>

        <button
          disabled={verifying}
          onClick={handleVerifyChain}
          className="px-5 py-3 rounded-xl btn-primary-blue font-bold text-sm tracking-wide flex items-center space-x-2 shadow-lg active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
          <span>{verifying ? 'Verifying Chain...' : 'Verify Chain Integrity'}</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div
          className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            verificationResult.is_valid
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
              : 'bg-rose-950/50 border-rose-500/60 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
          }`}
        >
          <div className="flex items-start space-x-3.5">
            {verificationResult.is_valid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-base tracking-wide text-white">
                {verificationResult.is_valid
                  ? 'Cryptographic Audit Chain: FULLY VERIFIED'
                  : 'TAMPER DETECTED: Audit Chain Integrity Broken'}
              </div>
              <p className="text-xs sm:text-sm mt-0.5 opacity-90 leading-relaxed">
                {verificationResult.is_valid
                  ? `Successfully validated ${verificationResult.total_records} events from Genesis to Block #${verificationResult.total_records}. All HMAC signatures and previous-hash pointers match.`
                  : verificationResult.failure_reason}
              </p>
              <div className="text-xs font-mono mt-1.5 opacity-80">
                Head Hash: {verificationResult.chain_head_hash} • Verified at {new Date(verificationResult.verified_at).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {!verificationResult.is_valid && (
            <button
              onClick={() => handleSimulateTamper('restore')}
              className="px-4 py-2 rounded-xl bg-rose-900/90 hover:bg-rose-800 text-white text-xs font-bold flex items-center space-x-1.5 flex-shrink-0 transition"
            >
              <Wrench className="w-4 h-4" />
              <span>Restore Chain HMACs</span>
            </button>
          )}
        </div>
      )}

      {/* Interactive Tamper Simulation Lab */}
      <div className="rounded-2xl p-6 glass-card-static border border-[rgba(116,177,235,0.25)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-[#42D9FF]" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
              Interactive Security Lab: Tamper Detection Demonstration
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-[#0A223F] text-[#42D9FF] border border-[#168BFF]/35">
            Real-Time Integrity Proving
          </span>
        </div>

        <p className="text-xs sm:text-sm text-[#B6C9E3] leading-relaxed">
          Test TrustVault&apos;s cryptographic verification in real time. Simulate unauthorized database modifications to observe immediate detection by the verification algorithm.
        </p>

        {labMessage && (
          <div className="p-3.5 rounded-xl bg-[#07172C] border border-[#42D9FF]/30 text-xs text-[#DCEEFF] font-mono">
            {labMessage}
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            disabled={tamperingAction !== null}
            onClick={() => handleSimulateTamper('audit_record')}
            className="px-3.5 py-2 rounded-xl bg-[#091D36] hover:bg-rose-950/60 border border-[rgba(116,177,235,0.22)] hover:border-rose-500/50 text-[#DCEEFF] hover:text-rose-300 text-xs font-mono flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Log Content Tamper</span>
          </button>

          <button
            disabled={tamperingAction !== null}
            onClick={() => handleSimulateTamper('break_hash_pointer')}
            className="px-3.5 py-2 rounded-xl bg-[#091D36] hover:bg-amber-950/60 border border-[rgba(116,177,235,0.22)] hover:border-amber-500/50 text-[#DCEEFF] hover:text-amber-300 text-xs font-mono flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Broken Chain Pointer</span>
          </button>

          <button
            disabled={tamperingAction !== null}
            onClick={() => handleSimulateTamper('ciphertext')}
            className="px-3.5 py-2 rounded-xl bg-[#091D36] hover:bg-purple-950/60 border border-[rgba(116,177,235,0.22)] hover:border-purple-500/50 text-[#DCEEFF] hover:text-purple-300 text-xs font-mono flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>Simulate Vault Ciphertext Bit-Flip</span>
          </button>

          <button
            disabled={tamperingAction !== null}
            onClick={() => handleSimulateTamper('restore')}
            className="px-3.5 py-2 rounded-xl bg-[#091D36] hover:bg-emerald-950/60 border border-[rgba(116,177,235,0.22)] hover:border-emerald-500/50 text-[#DCEEFF] hover:text-emerald-300 text-xs font-mono flex items-center space-x-1.5 transition disabled:opacity-50 ml-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restore & Re-sign Chain</span>
          </button>
        </div>
      </div>

      {/* Production Limitations Notice */}
      <div className="p-5 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.2)] text-xs sm:text-sm text-[#B6C9E3] space-y-1.5">
        <div className="flex items-center space-x-2 text-white font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Production Security Disclaimer: Hash Chain Threat Model</span>
        </div>
        <p className="text-xs text-[#859DBE] leading-relaxed">
          An HMAC-SHA256 hash chain provides tamper-evidence against unauthorized database modification, injection, or deletion by attackers who do not possess the audit key. However, a privileged attacker with simultaneous root access to both the database AND the cryptographic key could recalculate signatures. True enterprise immutability requires pairing hash chains with Write-Once-Read-Many (WORM) storage, remote SIEM append-only log forwarders, or public transparency ledgers.
        </p>
      </div>

      {/* Audit Log Table Header & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.22)]">
        <span className="text-sm font-bold text-white">
          Recorded Audit Blocks ({filteredLogs.length})
        </span>

        <div className="flex items-center space-x-2.5">
          <input
            type="text"
            placeholder="Filter action (e.g. DOC_READ)..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-xs text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF] font-mono"
          />
          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-xs text-[#F4F8FF] focus:outline-none focus:border-[#42D9FF]"
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="DENIED">DENIED</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>
      </div>

      {/* Audit Events Chain View */}
      <div className="space-y-3">
        {filteredLogs.map((log) => {
          const isExpanded = expandedLogId === log.id;

          return (
            <div
              key={log.id}
              className="rounded-2xl glass-card border border-[rgba(116,177,235,0.2)] hover:border-[#42D9FF]/40 transition-all overflow-hidden"
            >
              {/* Event Row Summary */}
              <div
                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center space-x-3.5 overflow-hidden">
                  <span className="text-xs font-mono text-[#42D9FF] bg-[#0A223F] px-2.5 py-1 rounded-md border border-[#168BFF]/35 flex-shrink-0 font-bold">
                    #{log.sequence_number}
                  </span>
                  <div className="truncate">
                    <div className="text-sm font-bold text-white truncate flex items-center space-x-2">
                      <span>{log.action}</span>
                      <span className="text-xs font-mono text-[#859DBE]">
                        [{log.resource_type}]
                      </span>
                    </div>
                    <div className="text-xs text-[#859DBE] font-mono truncate mt-0.5">
                      {log.actor_email} • {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span
                    className={`text-xs font-mono px-2.5 py-0.5 rounded-md font-semibold ${
                      log.outcome === 'SUCCESS'
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                        : log.outcome === 'DENIED'
                        ? 'bg-rose-950/70 text-rose-400 border border-rose-800/50'
                        : 'bg-amber-950/70 text-amber-400 border border-amber-800/50'
                    }`}
                  >
                    {log.outcome}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[#859DBE]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#859DBE]" />
                  )}
                </div>
              </div>

              {/* Expanded Cryptographic Hashes and Details JSON */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-[rgba(116,177,235,0.18)] bg-[#051120]/70 space-y-3 text-xs font-mono">
                  {/* Previous and Current Hash Chain Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#07192F] border border-[rgba(116,177,235,0.2)]">
                      <div className="text-[#859DBE] text-[10px] uppercase font-bold">Previous Block HMAC (Pointer)</div>
                      <div className="text-[#B6C9E3] truncate mt-1 font-mono text-xs">
                        {log.previous_hash}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0A223F] border border-[#168BFF]/40">
                      <div className="text-[#42D9FF] text-[10px] uppercase font-bold">Current Block HMAC (Seal)</div>
                      <div className="text-[#DCEEFF] truncate mt-1 font-mono text-xs font-semibold">
                        {log.current_hash}
                      </div>
                    </div>
                  </div>

                  {/* Metadata and Details JSON */}
                  <div className="p-4 rounded-xl bg-[#07192F] border border-[rgba(116,177,235,0.2)] text-xs text-[#DCEEFF]">
                    <div className="text-[#859DBE] text-[10px] uppercase font-bold mb-1.5">Payload Context Details:</div>
                    <pre className="text-[#42D9FF] whitespace-pre-wrap overflow-x-auto text-xs leading-relaxed">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};