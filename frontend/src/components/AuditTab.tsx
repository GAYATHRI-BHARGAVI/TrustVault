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
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Cryptographic Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            HMAC-SHA256 monotonic hash chain linking all security events into a tamper-evident sequence.
          </p>
        </div>

        <button
          disabled={verifying}
          onClick={handleVerifyChain}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide flex items-center space-x-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
          <span>{verifying ? 'Verifying Chain...' : 'Verify Chain Integrity'}</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            verificationResult.is_valid
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/60 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
          }`}
        >
          <div className="flex items-start space-x-3">
            {verificationResult.is_valid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-sm tracking-wide">
                {verificationResult.is_valid
                  ? 'Cryptographic Audit Chain: FULLY VERIFIED'
                  : 'TAMPER DETECTED: Audit Chain Integrity Broken'}
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {verificationResult.is_valid
                  ? `Successfully validated ${verificationResult.total_records} events from Genesis to Block #${verificationResult.total_records}. All HMAC signatures and previous-hash pointers match.`
                  : verificationResult.failure_reason}
              </p>
              <div className="text-[10px] font-mono mt-1.5 opacity-75">
                Head Hash: {verificationResult.chain_head_hash} • Verified at {new Date(verificationResult.verified_at).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {!verificationResult.is_valid && (
            <button
              onClick={() => handleSimulateTamper('restore')}
              className="px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-xs font-semibold flex items-center space-x-1.5 flex-shrink-0 transition"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Restore Chain HMACs</span>
            </button>
          )}
        </div>
      )}

      {/* Interactive Tamper Simulation Lab */}
      <div className="rounded-2xl p-5 bg-[#0D1525] border border-cyan-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Interactive Security Lab: Tamper Detection Demonstration
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
            Real-Time Integrity Proving
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Test TrustVault&apos;s cryptographic verification in real time. Simulate unauthorized database modifications to observe immediate detection by the verification algorithm.
        </p>

        {labMessage && (
          <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-cyan-300 font-mono">
            {labMessage}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            disabled={tamperingAction !== null}
            onClick={() => handleSimulateTamper('audit_record')}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 text-xs font-mono flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Log Content Tamper</span>
          </button>

          <button
            disabled={tamperingAction !== null}
            onClick={() => handleSimulateTamper('break_hash_pointer')}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 text-xs font-mono flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Broken Chain Pointer</span>
          </button>

          <button
            disabled={tamperingAction !== null}
            onClick={() => handleSimulateTamper('ciphertext')}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-purple-950/50 border border-slate-700 hover:border-purple-500/50 text-slate-300 hover:text-purple-300 text-xs font-mono flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>Simulate Vault Ciphertext Bit-Flip</span>
          </button>

          <button
            disabled={tamperingAction !== null}
            onClick={() => handleSimulateTamper('restore')}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-emerald-950/50 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 text-xs font-mono flex items-center space-x-1.5 transition disabled:opacity-50 ml-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restore & Re-sign Chain</span>
          </button>
        </div>
      </div>

      {/* Production Limitations Notice */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="flex items-center space-x-2 text-slate-300 font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Production Security Disclaimer: Hash Chain Threat Model</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          An HMAC-SHA256 hash chain provides tamper-evidence against unauthorized database modification, injection, or deletion by attackers who do not possess the audit key. However, a privileged attacker with simultaneous root access to both the database AND the cryptographic key could recalculate signatures. True enterprise immutability requires pairing hash chains with Write-Once-Read-Many (WORM) storage, remote SIEM append-only log forwarders, or public transparency ledgers.
        </p>
      </div>

      {/* Audit Log Table Header & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0F172A]/80 border border-slate-800">
        <span className="text-xs font-bold text-slate-200">
          Recorded Audit Blocks ({filteredLogs.length})
        </span>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Filter action (e.g. DOC_READ)..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="DENIED">DENIED</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>
      </div>

      {/* Audit Events Chain View */}
      <div className="space-y-2.5">
        {filteredLogs.map((log) => {
          const isExpanded = expandedLogId === log.id;

          return (
            <div
              key={log.id}
              className="rounded-xl bg-[#0F172A]/70 border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
            >
              {/* Event Row Summary */}
              <div
                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 flex-shrink-0">
                    #{log.sequence_number}
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-200 truncate flex items-center space-x-2">
                      <span>{log.action}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        [{log.resource_type}]
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {log.actor_email} • {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      log.outcome === 'SUCCESS'
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                        : log.outcome === 'DENIED'
                        ? 'bg-rose-950/50 text-rose-400 border border-rose-800/40'
                        : 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
                    }`}
                  >
                    {log.outcome}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Cryptographic Hashes and Details JSON */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/50 space-y-2.5 text-xs font-mono">
                  {/* Previous and Current Hash Chain Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px] uppercase">Previous Block HMAC (Pointer)</div>
                      <div className="text-slate-300 truncate mt-0.5 font-mono text-[10px]">
                        {log.previous_hash}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-cyan-950/20 border border-cyan-800/40">
                      <div className="text-cyan-400 text-[10px] uppercase">Current Block HMAC (Seal)</div>
                      <div className="text-cyan-200 truncate mt-0.5 font-mono text-[10px]">
                        {log.current_hash}
                      </div>
                    </div>
                  </div>

                  {/* Metadata and Details JSON */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                    <div className="text-slate-500 text-[10px] uppercase mb-1">Payload Context Details:</div>
                    <pre className="text-cyan-300 whitespace-pre-wrap overflow-x-auto text-[10px]">
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
