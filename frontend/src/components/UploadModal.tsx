'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Lock, ShieldCheck, AlertCircle, FileText } from 'lucide-react';
import { api } from '@/lib/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState('CONFIDENTIAL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to encrypt and store.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a document title.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.uploadDocument(file, title.trim(), classification);
      onUploaded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0D1322] border border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Encrypt & Vault Document
              </h3>
              <p className="text-xs text-slate-400">
                AES-256-GCM authenticated encryption at rest
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* File Drop Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Document File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-5 text-center cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="w-7 h-7 text-slate-500 group-hover:text-cyan-400 mx-auto mb-2 transition" />
              {file ? (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-cyan-300 truncate max-w-xs mx-auto">
                    {file.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(file.size / 1024).toFixed(1)} KB • {file.type || 'binary/raw'}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-xs text-slate-300 font-medium">
                    Click to choose file, or drag and drop
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono">
                    PDF, DOCX, XLSX, TXT, MD, CSV, PNG, JSON (Max 25MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Document Display Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 SOC2 Security Assessment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Classification Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Security Classification Level
            </label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="CONFIDENTIAL">CONFIDENTIAL (Highest protection, restricted distribution)</option>
              <option value="RESTRICTED">RESTRICTED (Compliance & Executive only)</option>
              <option value="INTERNAL">INTERNAL (Internal organization staff)</option>
              <option value="PUBLIC">PUBLIC (General distribution)</option>
            </select>
          </div>

          {/* Security Guarantee Summary */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Automated Cryptographic Guarantees</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-400 text-[10px] font-mono">
              <li>Cipher: AES-256-GCM with 96-bit cryptographically random nonce</li>
              <li>Payload stored under opaque random storage token; original filename stripped</li>
              <li>Plaintext SHA-256 digest recorded in HMAC-SHA256 audit block</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide shadow-lg shadow-cyan-500/20 active:scale-95 transition disabled:opacity-50"
            >
              {loading ? 'Encrypting & Storing...' : 'Encrypt & Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
