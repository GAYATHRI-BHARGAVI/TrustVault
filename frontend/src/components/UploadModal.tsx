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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl glass-card-static border border-[rgba(116,177,235,0.3)] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[rgba(116,177,235,0.2)] bg-[#091D36]/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#0E284A] border border-[#42D9FF]/35 text-[#42D9FF]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Encrypt & Vault Document
              </h3>
              <p className="text-xs text-[#B6C9E3]">
                AES-256-GCM authenticated encryption at rest
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* File Drop Area */}
          <div>
            <label className="block text-xs font-semibold text-[#DCEEFF] mb-1.5 uppercase tracking-wider">
              Select Document File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[rgba(116,177,235,0.3)] hover:border-[#42D9FF]/70 rounded-xl p-6 text-center cursor-pointer bg-[#07172C]/70 hover:bg-[#07172C] transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="w-8 h-8 text-[#859DBE] group-hover:text-[#42D9FF] mx-auto mb-2.5 transition" />
              {file ? (
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[#42D9FF] truncate max-w-xs mx-auto">
                    {file.name}
                  </div>
                  <div className="text-xs text-[#B6C9E3] font-mono">
                    {(file.size / 1024).toFixed(1)} KB • {file.type || 'binary/raw'}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-sm text-[#F4F8FF] font-medium">
                    Click to choose file, or drag and drop
                  </span>
                  <p className="text-xs text-[#859DBE] font-mono">
                    PDF, DOCX, XLSX, TXT, MD, CSV, PNG, JSON (Max 25MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-xs font-semibold text-[#DCEEFF] mb-1.5 uppercase tracking-wider">
              Document Display Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 SOC2 Security Assessment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF]"
            />
          </div>

          {/* Classification Level */}
          <div>
            <label className="block text-xs font-semibold text-[#DCEEFF] mb-1.5 uppercase tracking-wider">
              Security Classification Level
            </label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] focus:outline-none focus:border-[#42D9FF]"
            >
              <option value="CONFIDENTIAL">CONFIDENTIAL (Highest protection, restricted distribution)</option>
              <option value="RESTRICTED">RESTRICTED (Compliance & Executive only)</option>
              <option value="INTERNAL">INTERNAL (Internal organization staff)</option>
              <option value="PUBLIC">PUBLIC (General distribution)</option>
            </select>
          </div>

          {/* Security Guarantee Summary */}
          <div className="p-3.5 rounded-xl bg-[#081B33]/80 border border-[rgba(116,177,235,0.2)] text-xs text-[#B6C9E3] space-y-1">
            <div className="flex items-center space-x-1.5 text-[#42D9FF] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Automated Cryptographic Guarantees</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[#859DBE] text-[11px] font-mono">
              <li>Cipher: AES-256-GCM with 96-bit cryptographically random nonce</li>
              <li>Payload stored under opaque random storage token; original filename stripped</li>
              <li>Plaintext SHA-256 digest recorded in HMAC-SHA256 audit block</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm text-[#B6C9E3] hover:text-white hover:bg-[#0E284A] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl btn-primary-blue font-bold text-sm tracking-wide shadow-lg active:scale-95 transition disabled:opacity-50"
            >
              {loading ? 'Encrypting & Storing...' : 'Encrypt & Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};