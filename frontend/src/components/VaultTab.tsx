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
        return 'bg-purple-950/70 text-purple-300 border-purple-700/60';
      case 'CONFIDENTIAL':
        return 'bg-rose-950/70 text-rose-300 border-rose-700/60';
      case 'INTERNAL':
        return 'bg-blue-950/70 text-blue-300 border-blue-700/60';
      default:
        return 'bg-[#0E284A] text-[#B6C9E3] border-[rgba(116,177,235,0.25)]';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Lock className="w-6 h-6 text-[#42D9FF]" />
            <span>Document Vault</span>
          </h2>
          <p className="text-sm text-[#B6C9E3] mt-1">
            Zero-knowledge isolated storage. Plaintext exists only in ephemeral memory during authorized requests.
          </p>
        </div>

        {currentUser?.role !== 'VIEWER' && (
          <button
            onClick={onOpenUpload}
            className="px-5 py-3 rounded-xl btn-primary-blue font-bold text-sm tracking-wide flex items-center space-x-2 shadow-lg active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Encrypt & Upload Document</span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-700/60 text-sm text-rose-200 flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.22)]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#859DBE]" />
          <input
            type="text"
            placeholder="Search documents by title or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.22)] text-sm text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF] font-mono transition"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs text-[#B6C9E3] flex items-center space-x-1 pl-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Classification:</span>
          </span>
          {['ALL', 'CONFIDENTIAL', 'RESTRICTED', 'INTERNAL', 'PUBLIC'].map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClassification(cls)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition ${
                selectedClassification === cls
                  ? 'bg-[#168BFF] text-white font-bold shadow-md shadow-[#168BFF]/30'
                  : 'bg-[#091D36] text-[#B6C9E3] hover:text-white hover:bg-[#0E2C52]'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3.5">
        {filteredDocs.length === 0 ? (
          <div className="p-16 text-center rounded-2xl glass-card-static border border-dashed border-[rgba(116,177,235,0.22)]">
            <FileText className="w-10 h-10 text-[#859DBE] mx-auto mb-3 opacity-60" />
            <h4 className="text-base font-bold text-white">No documents found</h4>
            <p className="text-sm text-[#B6C9E3] mt-1 max-w-md mx-auto">
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
                className="p-5 rounded-2xl glass-card border border-[rgba(116,177,235,0.22)] hover:border-[#42D9FF]/45 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Document Information */}
                <div className="flex items-start space-x-4 overflow-hidden">
                  <div className="p-3 rounded-xl bg-[#091D36] border border-[rgba(116,177,235,0.25)] text-[#42D9FF] flex-shrink-0 mt-0.5">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 truncate">
                    <div className="flex items-center space-x-2.5">
                      <span 
                        className="text-base sm:text-lg font-bold text-white hover:text-[#42D9FF] cursor-pointer transition truncate" 
                        onClick={() => onViewDocument(doc)}
                      >
                        {doc.title}
                      </span>
                      <span className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${getClassificationBadge(doc.classification_level)}`}>
                        {doc.classification_level}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#0C2442] text-[#42D9FF] border border-[#168BFF]/30">
                        {doc.user_permission}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-[#859DBE] font-mono">
                      <span>{doc.original_filename}</span>
                      <span>•</span>
                      <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>Owner: {doc.owner_email || 'You'}</span>
                      {doc.active_grants_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#42D9FF] font-semibold">{doc.active_grants_count} active grant(s)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Actions */}
                <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[rgba(116,177,235,0.18)]">
                  {/* View Document Inline */}
                  <button
                    onClick={() => onViewDocument(doc)}
                    className="px-3.5 py-2 rounded-xl bg-[#091D36] hover:bg-[#0E2C52] border border-[rgba(116,177,235,0.25)] hover:border-[#42D9FF]/50 text-[#DCEEFF] hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                    title="Decrypt and preview inline in secure canvas"
                  >
                    <Eye className="w-4 h-4 text-[#42D9FF]" />
                    <span>View</span>
                  </button>

                  {/* Download Document */}
                  <button
                    disabled={isDownloading}
                    onClick={() => handleDownload(doc)}
                    className="px-3.5 py-2 rounded-xl bg-[#091D36] hover:bg-[#0E2C52] border border-[rgba(116,177,235,0.25)] hover:border-[#42D9FF]/50 text-[#DCEEFF] hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                    title="Download decrypted file"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'Decrypting...' : 'Download'}</span>
                  </button>

                  {/* Share / Manage Grants */}
                  {doc.can_manage && (
                    <button
                      onClick={() => onShareDocument(doc)}
                      className="px-3.5 py-2 rounded-xl bg-[#168BFF]/20 hover:bg-[#168BFF]/35 border border-[#168BFF]/45 text-[#DCEEFF] hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                      title="Issue or manage recipient grants"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  )}

                  {/* Delete Document */}
                  {doc.can_manage && (
                    <button
                      disabled={isDeleting}
                      onClick={() => handleDelete(doc)}
                      className="p-2 rounded-xl bg-[#091D36] hover:bg-rose-950/60 border border-[rgba(116,177,235,0.2)] hover:border-rose-500/50 text-[#859DBE] hover:text-rose-300 transition disabled:opacity-50"
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