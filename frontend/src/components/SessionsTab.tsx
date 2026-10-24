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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Lock className="w-6 h-6 text-[#42D9FF]" />
            <span>Session & Cryptographic Policy Management</span>
          </h2>
          <p className="text-sm text-[#B6C9E3] mt-1">
            Real backend session revocation, concurrent login prevention, and cryptographic posture inspection.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-[#091D36] border border-[rgba(116,177,235,0.25)] text-[#DCEEFF] hover:text-[#42D9FF] transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-[#0C2442] border border-[#42D9FF]/40 text-xs sm:text-sm text-[#DCEEFF] font-mono">
          {msg}
        </div>
      )}

      {/* Single Active Session Policy Banner */}
      <div className="p-6 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.25)] space-y-2">
        <div className="flex items-center space-x-2.5">
          <ShieldCheck className="w-5 h-5 text-[#42D9FF]" />
          <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Single-Active-Session Enforcement Policy: <span className="text-[#42D9FF]">ACTIVE</span>
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-[#B6C9E3] leading-relaxed max-w-3xl">
          TrustVault is configured with a strict single-active-session policy. Establishing a new authenticated session immediately revokes prior session tokens for that user account. Old sessions attempting API queries receive an immediate HTTP 401 Unauthorized rejection, preventing session hijacking and credential reuse.
        </p>
      </div>

      {/* Cryptographic Posture Card */}
      {policy && (
        <div className="rounded-2xl p-6 glass-card-static border border-[rgba(116,177,235,0.22)] space-y-3.5">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
            <Key className="w-4 h-4 text-[#42D9FF]" />
            <span>Active Cryptographic Parameters</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.2)]">
              <span className="text-[10px] text-[#859DBE] block uppercase font-bold">Vault Cipher</span>
              <span className="text-[#42D9FF] font-bold text-sm mt-0.5 block">{policy.cipher}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.2)]">
              <span className="text-[10px] text-[#859DBE] block uppercase font-bold">Key / Nonce / Tag</span>
              <span className="text-[#F4F8FF] text-sm mt-0.5 block">256b / 96b / 128b</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.2)]">
              <span className="text-[10px] text-[#859DBE] block uppercase font-bold">Audit Chain</span>
              <span className="text-emerald-400 font-bold text-sm mt-0.5 block">HMAC-SHA256</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.2)]">
              <span className="text-[10px] text-[#859DBE] block uppercase font-bold">Session Timeout</span>
              <span className="text-[#F4F8FF] text-sm mt-0.5 block">{policy.session_timeout_minutes} min</span>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-3.5">
        <h3 className="text-base sm:text-lg font-bold text-white">
          User Sessions History ({sessions.length})
        </h3>

        <div className="space-y-3">
          {sessions.map((sess) => {
            const isRevoking = revokingId === sess.id;

            return (
              <div
                key={sess.id}
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                  sess.is_current
                    ? 'bg-[#0E284A]/70 border-[#42D9FF]/45 shadow-[0_0_25px_rgba(66,217,255,0.12)]'
                    : sess.is_active
                    ? 'bg-[#07172C]/70 border-[rgba(116,177,235,0.22)]'
                    : 'bg-[#07172C]/30 border-[rgba(116,177,235,0.12)] opacity-60'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-[#091D36] border border-[rgba(116,177,235,0.25)] text-[#42D9FF]">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-sm font-bold text-white font-mono">
                        Token: {sess.session_token_prefix}
                      </span>
                      {sess.is_current && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0A223F] text-[#42D9FF] border border-[#168BFF]/40 font-bold">
                          THIS DEVICE (CURRENT)
                        </span>
                      )}
                      {sess.is_active ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                          REVOKED / EXPIRED
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-[#859DBE] font-mono">
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
                    className="px-3.5 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                  >
                    <Ban className="w-4 h-4" />
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