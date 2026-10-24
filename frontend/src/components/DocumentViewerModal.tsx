'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  currentUser: any;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  currentUser,
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState<string>('');

  useEffect(() => {
    if (isOpen && document) {
      setLoading(true);
      setError(null);
      setContent(null);

      // Generate client-side watermark
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      setWatermarkText(`CONFIDENTIAL • ${currentUser?.email} • ${now} • TRUSTVAULT SECURE VIEW`);

      api.viewDocumentContent(document.id)
        .then((data) => {
          setContent(data);
          setLoading(false);
        })
        .catch((err: any) => {
          setError(err.message || 'Decryption failed or access denied.');
          setLoading(false);
        });
    }
  }, [isOpen, document, currentUser]);

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl glass-card-static border border-[rgba(116,177,235,0.3)] shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(116,177,235,0.2)] bg-[#091D36]/90">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2.5 rounded-xl bg-[#0E284A] border border-[#42D9FF]/35 text-[#42D9FF] flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide truncate">
                  {document.title}
                </h3>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#0A223F] text-[#42D9FF] border border-[#168BFF]/30">
                  {document.classification_level}
                </span>
              </div>
              <p className="text-xs text-[#859DBE] font-mono truncate mt-0.5">
                SHA-256 Digest: {document.sha256_digest?.slice(0, 24)}...
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

        {/* Security Alert: Watermark Disclosure */}
        <div className="px-6 py-2.5 bg-[#081B33]/90 border-b border-[rgba(116,177,235,0.18)] flex items-center justify-between text-xs text-[#B6C9E3]">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Decrypted in-memory via AES-256-GCM. Access event recorded in HMAC audit trail.</span>
          </div>
          <span className="text-[11px] font-mono text-[#42D9FF] hidden sm:inline">
            Active User: {currentUser?.email}
          </span>
        </div>

        {/* Viewer Content with Watermark Canvas */}
        <div className="relative flex-1 p-6 overflow-y-auto bg-[#051120] min-h-[350px]">
          {/* Watermark Overlay (Repeated diagonal text) */}
          <div 
            className="pointer-events-none absolute inset-0 select-none opacity-[0.04] flex items-center justify-center overflow-hidden"
            style={{
              backgroundImage: `repeating-linear-gradient(-35deg, transparent, transparent 180px, rgba(66, 217, 255, 0.4) 180px, rgba(66, 217, 255, 0.4) 220px)`,
            }}
          />

          <div className="pointer-events-none absolute inset-0 flex flex-col justify-around items-center select-none opacity-[0.07] text-xs font-mono font-bold text-[#42D9FF] tracking-widest uppercase rotate-[-20deg]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>{watermarkText}</div>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#168BFF]/30 border-t-[#42D9FF] animate-spin" />
              <p className="text-xs text-[#859DBE] font-mono">
                Decrypting ciphertext with authenticated AES-GCM tag...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6 rounded-xl bg-rose-950/60 border border-rose-800/60 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <h4 className="text-sm font-bold text-rose-200">Access Denied or Decryption Failure</h4>
              <p className="text-xs text-rose-300 font-mono max-w-md mx-auto">{error}</p>
              <p className="text-[11px] text-[#859DBE] mt-2">
                This access denial has been recorded in the security audit trail.
              </p>
            </div>
          )}

          {/* Render Decrypted Content */}
          {!loading && !error && content && (
            <div className="relative z-10 font-mono text-xs sm:text-sm text-[#F4F8FF] bg-[#07192F]/80 p-5 rounded-xl border border-[rgba(116,177,235,0.2)] whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
          )}
        </div>

        {/* Modal Footer with Screenshot Limitation Notice */}
        <div className="px-6 py-3.5 border-t border-[rgba(116,177,235,0.2)] bg-[#091D36] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#859DBE]">
          <span>Notice: In-browser watermarks are deterrents. Client controls cannot physically block external hardware recording.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#0E284A] hover:bg-[#163D6C] text-[#DCEEFF] transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};