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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl glass-card-static border border-[rgba(116,177,235,0.3)] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[rgba(116,177,235,0.2)] bg-[#091D36]/90">
          <div className="flex items-center space-x-3 truncate">
            <div className="p-2.5 rounded-xl bg-[#0E284A] border border-[#42D9FF]/35 text-[#42D9FF] flex-shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-lg font-bold text-white tracking-wide truncate">
                Permissions & Sharing: {document.title}
              </h3>
              <p className="text-xs text-[#B6C9E3]">
                Issue time-bound grants or enforce immediate cryptographic revocation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#859DBE] hover:text-white hover:bg-[#0E2C52] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Issue New Grant Form */}
          <form onSubmit={handleCreateGrant} className="p-5 rounded-2xl bg-[#07172C]/80 border border-[rgba(116,177,235,0.22)] space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-[#42D9FF]" />
              <span>Grant New Access</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Recipient Email */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-[#DCEEFF] mb-1">
                  Recipient Identity (Email)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. bob@trustvault.internal"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#051120] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF] font-mono"
                />
              </div>

              {/* Permission Level */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#DCEEFF] mb-1">
                  Permission Level
                </label>
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#051120] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] focus:outline-none focus:border-[#42D9FF]"
                >
                  <option value="VIEW">VIEW (In-browser preview with watermark)</option>
                  <option value="DOWNLOAD">DOWNLOAD (Decrypt and save locally)</option>
                  <option value="MANAGE">MANAGE (Delegate sharing & revocation rights)</option>
                </select>
              </div>

              {/* Expiration Hours */}
              <div>
                <label className="block text-xs font-semibold text-[#DCEEFF] mb-1">
                  Access Expiration
                </label>
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#051120] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] focus:outline-none focus:border-[#42D9FF] font-mono"
                >
                  <option value={1}>1 Hour</option>
                  <option value={24}>24 Hours</option>
                  <option value={168}>7 Days</option>
                  <option value={720}>30 Days</option>
                  <option value="">No Expiry</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl btn-primary-blue font-bold text-xs sm:text-sm tracking-wide shadow-md active:scale-95 transition disabled:opacity-50"
              >
                {loading ? 'Issuing Grant...' : 'Issue Access Grant'}
              </button>
            </div>
          </form>

          {/* Active and Historical Grants List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#B6C9E3] uppercase tracking-wider">
              Existing Grants ({grants.length})
            </h4>

            {grants.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#859DBE] border border-dashed border-[rgba(116,177,235,0.2)] rounded-xl">
                No recipient grants have been issued for this document yet.
              </div>
            ) : (
              grants.map((grant) => {
                const isRevoking = revokingId === grant.id;

                return (
                  <div
                    key={grant.id}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      grant.is_revoked
                        ? 'bg-rose-950/25 border-rose-900/40 opacity-70'
                        : grant.is_active_now
                        ? 'bg-[#07172C]/80 border-[rgba(116,177,235,0.22)]'
                        : 'bg-amber-950/25 border-amber-900/40 opacity-75'
                    }`}
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-sm font-bold text-white font-mono">
                          {grant.recipient_email}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0A223F] text-[#42D9FF] border border-[#168BFF]/30">
                          {grant.permission_level}
                        </span>
                        {grant.is_revoked ? (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                            REVOKED
                          </span>
                        ) : grant.is_active_now ? (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                            EXPIRED
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-[#859DBE] font-mono">
                        <span>Issued by: {grant.granted_by_email}</span>
                        {grant.expires_at && (
                          <span>Expires: {new Date(grant.expires_at).toLocaleString()}</span>
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
                        className="px-3.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/60 hover:border-rose-500 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition flex-shrink-0 disabled:opacity-50"
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
        <div className="px-6 sm:px-8 py-4 border-t border-[rgba(116,177,235,0.2)] bg-[#091D36] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0E284A] hover:bg-[#163D6C] text-[#DCEEFF] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};