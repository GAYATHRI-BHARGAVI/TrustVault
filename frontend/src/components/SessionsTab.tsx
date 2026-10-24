'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Key, Laptop, Smartphone, AlertTriangle, Ban, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface SessionsTabProps {
  currentUser: any;
}

export const SessionsTab: React.FC<SessionsTabProps> = ({ currentUser }) => {
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessList, pol] = await Promise.all([
        api.getSessions(),
        api.getPolicy(),
      ]);
      setSessions(sessList);
      setPolicy(pol);
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await api.revokeSession(sessionId);
      setMsg('Session revoked successfully.');
      await loadData();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <span>Session & Cryptographic Policy Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real backend session revocation, concurrent login prevention, and cryptographic posture inspection.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-cyan-950/50 border border-cyan-800/60 text-xs text-cyan-300 font-mono">
          {msg}
        </div>
      )}

      {/* Single Active Session Policy Banner */}
      <div className="p-5 rounded-2xl bg-[#0D1525] border border-cyan-500/20 space-y-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Single-Active-Session Enforcement Policy: <span className="text-cyan-400">ACTIVE</span>
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          TrustVault is configured with a strict single-active-session policy. Establishing a new authenticated session immediately revokes prior session tokens for that user account. Old sessions attempting API queries receive an immediate HTTP 401 Unauthorized rejection, preventing session hijacking and credential reuse.
        </p>
      </div>

      {/* Cryptographic Posture Card */}
      {policy && (
        <div className="rounded-2xl p-5 bg-[#0F172A]/70 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Active Cryptographic Parameters</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Vault Cipher</span>
              <span className="text-cyan-300 font-bold">{policy.cipher}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Key / Nonce / Tag</span>
              <span className="text-slate-200">256b / 96b / 128b</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Audit Chain</span>
              <span className="text-emerald-400 font-bold">HMAC-SHA256</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Session Timeout</span>
              <span className="text-slate-200">{policy.session_timeout_minutes} minutes</span>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">
          User Sessions History ({sessions.length})
        </h3>

        <div className="space-y-2.5">
          {sessions.map((sess) => {
            const isRevoking = revokingId === sess.id;

            return (
              <div
                key={sess.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  sess.is_current
                    ? 'bg-cyan-950/20 border-cyan-500/40'
                    : sess.is_active
                    ? 'bg-slate-900/70 border-slate-800'
                    : 'bg-slate-900/30 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                    <Laptop className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-200 font-mono">
                        Token: {sess.session_token_prefix}
                      </span>
                      {sess.is_current && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                          THIS DEVICE (CURRENT)
                        </span>
                      )}
                      {sess.is_active ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                          REVOKED / EXPIRED
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 font-mono">
                      <span>IP: {sess.ip_address || '127.0.0.1'}</span>
                      <span>•</span>
                      <span>Created: {new Date(sess.created_at).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>Expires: {new Date(sess.expires_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {sess.is_active && !sess.is_current && (
                  <button
                    disabled={isRevoking}
                    onClick={() => handleRevokeSession(sess.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isRevoking ? 'Revoking...' : 'Revoke Session'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
