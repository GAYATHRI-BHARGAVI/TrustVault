'use client';

import React, { useState } from 'react';
import { Share2, Lock, Ban, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

interface SharingTabProps {
  documents: Array<any>;
  currentUser: any;
  onRefresh: () => void;
  onOpenShareModal: (doc: any) => void;
}

export const SharingTab: React.FC<SharingTabProps> = ({
  documents,
  currentUser,
  onRefresh,
  onOpenShareModal,
}) => {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Collect documents that user has authority to manage
  const manageableDocs = documents.filter((d) => d.can_manage);

  const handleQuickRevoke = async (grantId: string, recipient: string) => {
    if (!confirm(`Revoke document grant for ${recipient}? Access will be terminated immediately.`)) {
      return;
    }
    try {
      setRevokingId(grantId);
      setError(null);
      await api.revokeGrant(grantId, 'Revoked via Sharing Management Center');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Revocation failed');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Share2 className="w-5 h-5 text-cyan-400" />
          <span>Document Sharing & Delegated Access</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage explicit recipient permissions, define time-bound expiration, and enforce instant revocation.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Security Architecture Principle Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-100">Zero Trust Access Delegation</span>
          <p className="text-slate-400 text-[11px]">
            Access grants are evaluated on every single request at the backend layer. Frontend role values or local storage flags are never trusted. Revoking a grant takes effect immediately for all subsequent access attempts.
          </p>
        </div>
      </div>

      {/* Manageable Documents Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">
          Your Documents With Sharing Controls ({manageableDocs.length})
        </h3>

        {manageableDocs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            You currently have no documents where you are owner or designated manager.
          </div>
        ) : (
          manageableDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-xl bg-[#0F172A]/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-slate-100">{doc.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                    {doc.classification_level}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {doc.original_filename} • {doc.active_grants_count} active grant(s)
                </div>
              </div>

              <button
                onClick={() => onOpenShareModal(doc)}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Manage Permissions</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
