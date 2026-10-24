'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, KeyRound, Eye, Share2, Activity, Database, CheckCircle2, 
  AlertTriangle, RefreshCw, ArrowRight, UserCheck, ShieldAlert
} from 'lucide-react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { OverviewTab } from '@/components/OverviewTab';
import { VaultTab } from '@/components/VaultTab';
import { SharingTab } from '@/components/SharingTab';
import { AuditTab } from '@/components/AuditTab';
import { SecurityTab } from '@/components/SecurityTab';
import { SessionsTab } from '@/components/SessionsTab';
import { UploadModal } from '@/components/UploadModal';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { ShareModal } from '@/components/ShareModal';
import { DemoSwitcherModal } from '@/components/DemoSwitcherModal';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Application Data
  const [documents, setDocuments] = useState<Array<any>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<any>>([]);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [sharingDoc, setSharingDoc] = useState<any>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [demoUsers, setDemoUsers] = useState<Array<any>>([]);

  const loadAppData = async () => {
    try {
      const [docs, logs, risk, hlth] = await Promise.all([
        api.listDocuments().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getRiskAssessment().catch(() => null),
        api.getHealth().catch(() => null),
      ]);
      setDocuments(docs);
      setAuditLogs(logs);
      setRiskAssessment(risk);
      setHealth(hlth);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  useEffect(() => {
    // Check initial session
    const token = api.getSessionToken();
    if (token) {
      api.getMe()
        .then((res) => {
          setCurrentUser(res.user);
          loadAppData();
        })
        .catch(() => {
          api.clearSessionToken();
          setCurrentUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Load demo users for initial login screen
    api.getDemoUsers()
      .then((res) => setDemoUsers(res.demo_users))
      .catch(() => {});

    // Listen for unauthorized events from API client
    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter email and password.');
      return;
    }
    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await api.login(loginEmail, loginPassword);
      setCurrentUser(res.user);
      await loadAppData();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDemoSelect = async (email: string) => {
    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await api.switchDemo(email);
      setCurrentUser(res.user);
      await loadAppData();
    } catch (err: any) {
      setLoginError(err.message || 'Demo login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#080C15] space-y-4">
        <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-500/40 shadow-[0_0_25px_rgba(0,240,255,0.3)]">
          <Shield className="w-7 h-7 text-cyan-400 animate-pulse" />
        </div>
        <div className="text-xs font-mono text-cyan-400">Loading TrustVault Secure Enclave...</div>
      </div>
    );
  }

  // If not logged in, render the Login Interface
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#080C15] flex flex-col justify-center items-center p-4 selection:bg-cyan-500/30">
        <div className="w-full max-w-xl space-y-6 animate-fadeIn">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 shadow-[0_0_25px_rgba(0,240,255,0.3)] mb-2">
              <Shield className="w-7 h-7 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight font-mono">
              TRUST<span className="text-cyan-400">VAULT</span>
            </h1>
            <p className="text-xs text-slate-400 tracking-wide">
              Secure Document Sharing. Verifiable Trust.
            </p>
          </div>

          {/* Credentials Login Box */}
          <div className="rounded-2xl p-6 bg-[#0D1322] border border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.12)] space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                Vault Authentication
              </h2>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Identity Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="alice@trustvault.internal"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide shadow-lg shadow-cyan-500/25 active:scale-95 transition disabled:opacity-50"
              >
                {loginLoading ? 'Authenticating & Enforcing Single Session...' : 'Authenticate to Vault'}
              </button>
            </form>
          </div>

          {/* Demo Identity Selector Box */}
          <div className="rounded-2xl p-5 bg-[#0F172A]/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>Isolated Local Demo Personas</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                1-Click Switch
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              For local testing of document permissions, role boundaries, and audit logs. Generates an authentic cryptographic session:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.email}
                  disabled={loginLoading}
                  onClick={() => handleDemoSelect(u.email)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-cyan-500/40 text-left transition flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                      {u.full_name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      {u.role_badge}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>

            <div className="pt-1 text-[10px] text-slate-500 font-mono text-center">
              Never presented as production authentication. Password hashing: PBKDF2-HMAC-SHA256 (300k rounds).
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="min-h-screen bg-[#080C15] flex flex-col">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onOpenDemoSwitcher={() => setIsDemoSwitcherOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 overflow-x-auto border-b border-slate-800/80 pb-2 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'vault', label: 'Document Vault', icon: Lock },
            { id: 'sharing', label: 'Sharing & Grants', icon: Share2 },
            { id: 'audit', label: 'Audit Trail & Integrity', icon: Shield },
            { id: 'security', label: 'Risk Monitoring', icon: ShieldAlert },
            { id: 'sessions', label: 'Sessions & Policy', icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Rendering */}
        {activeTab === 'overview' && (
          <OverviewTab
            currentUser={currentUser}
            documents={documents}
            auditLogs={auditLogs}
            riskAssessment={riskAssessment}
            health={health}
            setActiveTab={setActiveTab}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        )}

        {activeTab === 'vault' && (
          <VaultTab
            documents={documents}
            currentUser={currentUser}
            onRefresh={loadAppData}
            onOpenUpload={() => setIsUploadOpen(true)}
            onViewDocument={(doc) => setViewingDoc(doc)}
            onShareDocument={(doc) => setSharingDoc(doc)}
          />
        )}

        {activeTab === 'sharing' && (
          <SharingTab
            documents={documents}
            currentUser={currentUser}
            onRefresh={loadAppData}
            onOpenShareModal={(doc) => setSharingDoc(doc)}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTab
            auditLogs={auditLogs}
            onRefresh={loadAppData}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            riskAssessment={riskAssessment}
            currentUser={currentUser}
            onRefresh={loadAppData}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsTab
            currentUser={currentUser}
          />
        )}
      </div>

      {/* Global Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={loadAppData}
      />

      <DocumentViewerModal
        isOpen={viewingDoc !== null}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
        currentUser={currentUser}
      />

      <ShareModal
        isOpen={sharingDoc !== null}
        onClose={() => setSharingDoc(null)}
        document={sharingDoc}
        onGrantUpdated={loadAppData}
      />

      <DemoSwitcherModal
        isOpen={isDemoSwitcherOpen}
        onClose={() => setIsDemoSwitcherOpen(false)}
        currentEmail={currentUser?.email || ''}
        onUserSwitched={(newUser) => {
          setCurrentUser(newUser);
          loadAppData();
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#060910] py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TrustVault Enterprise • AES-256-GCM Storage • HMAC-SHA256 Hash Chain Integrity</span>
          <span className="text-cyan-500/80">Local Development Environment Active</span>
        </div>
      </footer>
    </div>
  );
}
