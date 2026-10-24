'use client';

import React, { useState, useEffect } from 'react';
import { X, Share2, Shield, Clock, AlertCircle, Trash2, CheckCircle2, UserPlus, Ban } from 'lucide-react';
import { api } from '@/lib/api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  onGrantUpdated: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  document,
  onGrantUpdated,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('VIEW');
  const [expiresInHours, setExpiresInHours] = useState<number | ''>(24);
  const [grants, setGrants] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDocumentGrants = async () => {
    if (!document) return;
    try {
      const docDetail = await api.getDocument(document.id);
      setGrants(docDetail.grants || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (isOpen && document) {
      setError(null);
      setSuccessMsg(null);
      loadDocumentGrants();
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleCreateGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      setError('Recipient email is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      await api.createGrant(
        document.id,
        recipientEmail.trim(),
        permissionLevel,
        expiresInHours === '' ? undefined : Number(expiresInHours)
      );
      setRecipientEmail('');
      setSuccessMsg(`Access grant successfully issued for ${recipientEmail}!`);
      await loadDocumentGrants();
      onGrantUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to create grant');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeGrant = async (grantId: string, email: string) => {
    if (!confirm(`Are you sure you want to immediately revoke access for ${email}? All subsequent requests will be blocked.`)) {
      return;
    }
    try {
      setRevokingId(grantId);
      setError(null);
      await api.revokeGrant(grantId, 'Explicit revocation by document manager');
      await loadDocumentGrants();
      onGrantUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke grant');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0D1322] border border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center space-x-3 truncate">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 flex-shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-base font-bold text-white tracking-wide truncate">
                Permissions & Sharing: {document.title}
              </h3>
              <p className="text-xs text-slate-400">
                Issue time-bound grants or enforce immediate cryptographic revocation
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Issue New Grant Form */}
          <form onSubmit={handleCreateGrant} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Grant New Access</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Recipient Email */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Recipient Identity (Email)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. bob@trustvault.internal"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              {/* Permission Level */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Permission Level
                </label>
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="VIEW">VIEW (In-browser preview with watermark)</option>
                  <option value="DOWNLOAD">DOWNLOAD (Decrypt and save locally)</option>
                  <option value="MANAGE">MANAGE (Delegate sharing & revocation rights)</option>
                </select>
              </div>

              {/* Expiration Hours */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Access Expiration
                </label>
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                >
                  <option value={1}>1 Hour</option>
                  <option value={24}>24 Hours</option>
                  <option value={168}>7 Days</option>
                  <option value={720}>30 Days</option>
                  <option value="">No Expiry</option>
                </select>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide shadow-md shadow-cyan-500/20 active:scale-95 transition disabled:opacity-50"
              >
                {loading ? 'Issuing Grant...' : 'Issue Access Grant'}
              </button>
            </div>
          </form>

          {/* Active and Historical Grants List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Existing Grants ({grants.length})
            </h4>

            {grants.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No recipient grants have been issued for this document yet.
              </div>
            ) : (
              grants.map((grant) => {
                const isRevoking = revokingId === grant.id;

                return (
                  <div
                    key={grant.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      grant.is_revoked
                        ? 'bg-rose-950/20 border-rose-900/40 opacity-70'
                        : grant.is_active_now
                        ? 'bg-slate-900/70 border-slate-800'
                        : 'bg-amber-950/20 border-amber-900/40 opacity-75'
                    }`}
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-100 font-mono">
                          {grant.recipient_email}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                          {grant.permission_level}
                        </span>
                        {grant.is_revoked ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                            REVOKED
                          </span>
                        ) : grant.is_active_now ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                            EXPIRED
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 font-mono">
                        <span>Issued by: {grant.granted_by_email}</span>
                        {grant.expires_at && (
                          <span>Expires: {new Date(grant.expires_at).toLocaleDateString()} {new Date(grant.expires_at).toLocaleTimeString()}</span>
                        )}
                        {grant.revoked_at && (
                          <span className="text-rose-400">Revoked at: {new Date(grant.revoked_at).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Immediate Revocation Action */}
                    {!grant.is_revoked && (
                      <button
                        disabled={isRevoking}
                        onClick={() => handleRevokeGrant(grant.id, grant.recipient_email)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/60 hover:border-rose-500 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition flex-shrink-0 disabled:opacity-50"
                        title="Immediately revoke grant"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{isRevoking ? 'Revoking...' : 'Revoke'}</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0F172A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
