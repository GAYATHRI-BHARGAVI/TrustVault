'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck, Download, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
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
  const [contentType, setContentType] = useState<string>('');
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

      const token = api.getSessionToken();
      fetch(`http://127.0.0.1:8000/api/documents/${document.id}/view`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(async (res) => {
          if (!res.ok) {
            let detail = 'Access denied or decryption failed';
            try {
              const err = await res.json();
              detail = err.detail || detail;
            } catch {}
            throw new Error(detail);
          }
          const type = res.headers.get('content-type') || '';
          setContentType(type);
          return res.text();
        })
        .then((data) => {
          setContent(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [isOpen, document, currentUser]);

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#0D1322] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide truncate">
                  {document.title}
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  {document.classification_level}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                SHA-256 Digest: {document.sha256_digest?.slice(0, 24)}...
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Alert: Watermark Disclosure */}
        <div className="px-6 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Decrypted in-memory via AES-256-GCM. Session logged in HMAC audit trail.</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 hidden sm:inline">
            Active User: {currentUser?.email}
          </span>
        </div>

        {/* Viewer Content with Watermark Canvas */}
        <div className="relative flex-1 p-6 overflow-y-auto bg-[#080C15] min-h-[350px]">
          {/* Watermark Overlay (Repeated diagonal text) */}
          <div 
            className="pointer-events-none absolute inset-0 select-none opacity-[0.06] flex items-center justify-center overflow-hidden"
            style={{
              backgroundImage: `repeating-linear-gradient(-35deg, transparent, transparent 180px, rgba(0, 240, 255, 0.4) 180px, rgba(0, 240, 255, 0.4) 220px)`,
            }}
          />

          <div className="pointer-events-none absolute inset-0 flex flex-col justify-around items-center select-none opacity-[0.08] text-xs font-mono font-bold text-cyan-400 tracking-widest uppercase rotate-[-20deg]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>{watermarkText}</div>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
              <p className="text-xs text-slate-400 font-mono">
                Decrypting ciphertext with authenticated AES-GCM tag...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <h4 className="text-sm font-bold text-rose-200">Access Denied or Decryption Failure</h4>
              <p className="text-xs text-rose-300 font-mono max-w-md mx-auto">{error}</p>
              <p className="text-[11px] text-slate-400 mt-2">
                This event has been logged to the security audit trail.
              </p>
            </div>
          )}

          {/* Render Decrypted Content */}
          {!loading && !error && content && (
            <div className="relative z-10 font-mono text-xs text-slate-200 bg-slate-900/60 p-5 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
          )}
        </div>

        {/* Modal Footer with Screenshot Limitation Notice */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0F172A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <span>Notice: In-browser watermarks are deterrents. Client controls cannot physically block external hardware recording.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
