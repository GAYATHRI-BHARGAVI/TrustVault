'use client';

import React, { useState } from 'react';
import { 
  FileText, Lock, Eye, Download, Share2, Trash2, Search, Filter, 
  ShieldAlert, Plus, CheckCircle, Clock, Key
} from 'lucide-react';
import { api } from '@/lib/api';

interface VaultTabProps {
  documents: Array<any>;
  currentUser: any;
  onRefresh: () => void;
  onOpenUpload: () => void;
  onViewDocument: (doc: any) => void;
  onShareDocument: (doc: any) => void;
}

export const VaultTab: React.FC<VaultTabProps> = ({
  documents,
  currentUser,
  onRefresh,
  onOpenUpload,
  onViewDocument,
  onShareDocument,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) ||
                          doc.original_filename.toLowerCase().includes(search.toLowerCase());
    const matchesClass = selectedClassification === 'ALL' || doc.classification_level === selectedClassification;
    return matchesSearch && matchesClass;
  });

  const handleDownload = async (doc: any) => {
    try {
      setDownloadingId(doc.id);
      setActionError(null);
      await api.downloadDocument(doc.id, doc.original_filename);
    } catch (err: any) {
      setActionError(err.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: any) => {
    if (!confirm(`Are you sure you want to permanently delete '${doc.title}' and purge its encrypted payload from the vault?`)) {
      return;
    }
    try {
      setDeletingId(doc.id);
      setActionError(null);
      await api.deleteDocument(doc.id);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Deletion failed');
    } finally {
      setDeletingId(null);
    }
  };

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'RESTRICTED':
        return 'bg-purple-950/60 text-purple-300 border-purple-800/60';
      case 'CONFIDENTIAL':
        return 'bg-rose-950/60 text-rose-300 border-rose-800/60';
      case 'INTERNAL':
        return 'bg-blue-950/60 text-blue-300 border-blue-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <span>Document Vault</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Zero-knowledge isolated storage. Plaintext exists only in ephemeral memory during authorized requests.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide flex items-center space-x-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Encrypt & Upload Document</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-[#0F172A]/80 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by title or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto">
          <span className="text-[11px] text-slate-400 flex items-center space-x-1 pl-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Classification:</span>
          </span>
          {['ALL', 'CONFIDENTIAL', 'RESTRICTED', 'INTERNAL', 'PUBLIC'].map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClassification(cls)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider transition ${
                selectedClassification === cls
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#0F172A]/40 border border-dashed border-slate-800">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No documents found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || selectedClassification !== 'ALL'
                ? 'No documents matched your current search or classification filter.'
                : 'Your vault is currently empty. Upload your first encrypted document to begin.'}
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isDeleting = deletingId === doc.id;
            const isDownloading = downloadingId === doc.id;

            return (
              <div
                key={doc.id}
                className="p-4 rounded-xl bg-[#0F172A]/70 border border-slate-800/80 hover:border-cyan-500/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Document Information */}
                <div className="flex items-start space-x-3.5 overflow-hidden">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 flex-shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 truncate">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-100 hover:text-cyan-300 cursor-pointer transition" onClick={() => onViewDocument(doc)}>
                        {doc.title}
                      </span>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getClassificationBadge(doc.classification_level)}`}>
                        {doc.classification_level}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-cyan-400 border border-slate-700">
                        {doc.user_permission}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
                      <span>{doc.original_filename}</span>
                      <span>•</span>
                      <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>Owner: {doc.owner_email || 'You'}</span>
                      {doc.active_grants_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400">{doc.active_grants_count} active grant(s)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Actions */}
                <div className="flex items-center space-x-2 w-full md:w-auto justify-end flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                  {/* View Document Inline */}
                  <button
                    onClick={() => onViewDocument(doc)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-medium flex items-center space-x-1.5 transition"
                    title="Decrypt and preview inline in secure canvas"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View</span>
                  </button>

                  {/* Download Document */}
                  <button
                    disabled={isDownloading}
                    onClick={() => handleDownload(doc)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50"
                    title="Download decrypted file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isDownloading ? 'Decrypting...' : 'Download'}</span>
                  </button>

                  {/* Share / Manage Grants */}
                  {doc.can_manage && (
                    <button
                      onClick={() => onShareDocument(doc)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-medium flex items-center space-x-1.5 transition"
                      title="Issue or manage recipient grants"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  )}

                  {/* Delete Document */}
                  {doc.can_manage && (
                    <button
                      disabled={isDeleting}
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs transition disabled:opacity-50"
                      title="Purge encrypted file from vault"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
