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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
          <Share2 className="w-6 h-6 text-[#42D9FF]" />
          <span>Document Sharing & Delegated Access</span>
        </h2>
        <p className="text-sm text-[#B6C9E3] mt-1">
          Manage explicit recipient permissions, define time-bound expiration, and enforce instant revocation.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-700/60 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Security Architecture Principle Banner */}
      <div className="p-5 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.25)] flex items-start space-x-3.5 text-sm text-[#B6C9E3]">
        <ShieldCheck className="w-5 h-5 text-[#42D9FF] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white">Zero Trust Access Delegation</span>
          <p className="text-xs sm:text-sm text-[#859DBE] leading-relaxed">
            Access grants are evaluated on every single request at the backend layer. Frontend role values or local storage flags are never trusted. Revoking a grant takes effect immediately for all subsequent access attempts.
          </p>
        </div>
      </div>

      {/* Manageable Documents Grid */}
      <div className="space-y-3.5">
        <h3 className="text-base sm:text-lg font-bold text-white">
          Your Documents With Sharing Controls ({manageableDocs.length})
        </h3>

        {manageableDocs.length === 0 ? (
          <div className="p-16 text-center text-sm text-[#859DBE] border border-dashed border-[rgba(116,177,235,0.22)] rounded-2xl glass-card-static">
            You currently have no documents where you are owner or designated manager.
          </div>
        ) : (
          manageableDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl glass-card border border-[rgba(116,177,235,0.22)] hover:border-[#42D9FF]/45 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2.5">
                  <span className="text-base sm:text-lg font-bold text-white">{doc.title}</span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-[#0A223F] text-[#42D9FF] border border-[#168BFF]/30">
                    {doc.classification_level}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-[#859DBE] font-mono">
                  {doc.original_filename} • {doc.active_grants_count} active grant(s)
                </div>
              </div>

              <button
                onClick={() => onOpenShareModal(doc)}
                className="px-4 py-2.5 rounded-xl bg-[#168BFF]/20 hover:bg-[#168BFF]/35 border border-[#168BFF]/45 text-[#DCEEFF] hover:text-white text-xs sm:text-sm font-semibold flex items-center space-x-2 transition active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Manage Permissions</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};