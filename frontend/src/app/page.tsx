'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, KeyRound, Eye, EyeOff, Share2, Activity, Database, CheckCircle2, 
  AlertTriangle, RefreshCw, ArrowRight, UserCheck, ShieldAlert, Users,
  UserPlus, LogIn, Check, Copy, Wifi, WifiOff, Server, FileText, CheckCircle,
  FileCheck, ShieldCheck, UserCheck2
} from 'lucide-react';
import { api } from '@/lib/api';
import { MoonlitSky } from '@/components/MoonlitSky';
import { Navbar } from '@/components/Navbar';
import { OverviewTab } from '@/components/OverviewTab';
import { VaultTab } from '@/components/VaultTab';
import { SharingTab } from '@/components/SharingTab';
import { AuditTab } from '@/components/AuditTab';
import { SecurityTab } from '@/components/SecurityTab';
import { SessionsTab } from '@/components/SessionsTab';
import { AdminUsersTab } from '@/components/AdminUsersTab';
import { ProfileModal } from '@/components/ProfileModal';
import { UploadModal } from '@/components/UploadModal';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { ShareModal } from '@/components/ShareModal';
import { DemoSwitcherModal } from '@/components/DemoSwitcherModal';

const DEMO_PERSONAS = [
  {
    name: 'Alice Chen',
    email: 'alice@trustvault.internal',
    password: 'AlicePass123!#',
    role: 'OWNER',
    roleBadge: 'Document Owner',
    purpose: 'Restricted architecture specs • Full author management',
  },
  {
    name: 'Bob Martinez',
    email: 'bob@trustvault.internal',
    password: 'BobPass123!#',
    role: 'VIEWER',
    roleBadge: 'Collaborator (VIEW/DOWNLOAD)',
    purpose: 'Active VIEW & DOWNLOAD grant on Alice’s documents',
  },
  {
    name: 'Charlie Vance',
    email: 'charlie@trustvault.internal',
    password: 'CharliePass123!#',
    role: 'VIEWER',
    roleBadge: 'Contractor',
    purpose: 'Explicitly REVOKED grant for testing 404/403 denial behavior',
  },
  {
    name: 'Chief Security Officer',
    email: 'admin@trustvault.internal',
    password: 'AdminPass123!#',
    role: 'ADMIN',
    roleBadge: 'Admin Officer',
    purpose: 'System oversight, user management & emergency kill switch',
  },
  {
    name: 'SOC Lead Analyst',
    email: 'security@trustvault.internal',
    password: 'SecOfficer123!#',
    role: 'ADMIN',
    roleBadge: 'Security Officer',
    purpose: 'Fleet-wide risk scoring, telemetry & account mitigation',
  },
  {
    name: 'Compliance Officer',
    email: 'auditor@trustvault.internal',
    password: 'AuditorPass123!#',
    role: 'VIEWER',
    roleBadge: 'Auditor',
    purpose: 'HMAC-SHA256 audit chain verification & tamper forensics',
  },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Application Data
  const [documents, setDocuments] = useState<Array<any>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<any>>([]);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [sharingDoc, setSharingDoc] = useState<any>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('alice@trustvault.internal');
  const [loginPassword, setLoginPassword] = useState('AlicePass123!#');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [showDemoList, setShowDemoList] = useState(true);

  const checkBackendHealth = async () => {
    try {
      const hlth = await api.getHealth();
      setHealth(hlth);
      setBackendOnline(true);
      return hlth;
    } catch {
      setBackendOnline(false);
      return null;
    }
  };

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
      setBackendOnline(hlth !== null);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  useEffect(() => {
    checkBackendHealth();

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
      setLoginError('Please enter your email and password.');
      return;
    }
    try {
      setLoginLoading(true);
      setLoginError(null);
      setAuthSuccessMsg(null);
      const res = await api.login(loginEmail, loginPassword);
      setCurrentUser(res.user);
      await loadAppData();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please verify credentials or backend connection.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword) {
      setLoginError('All registration fields are required.');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setLoginError('Passwords do not match.');
      return;
    }
    if (registerPassword.length < 8) {
      setLoginError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError(null);
      setAuthSuccessMsg(null);
      const res = await api.register(registerName.trim(), registerEmail.trim(), registerPassword);
      setCurrentUser(res.user);
      setAuthSuccessMsg('Account registered successfully! Welcome to TrustVault.');
      await loadAppData();
    } catch (err: any) {
      setLoginError(err.message || 'Registration failed. User may already exist.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDemoSelect = async (email: string) => {
    try {
      setLoginLoading(true);
      setLoginError(null);
      setAuthSuccessMsg(null);
      const res = await api.switchDemo(email);
      setCurrentUser(res.user);
      await loadAppData();
    } catch (err: any) {
      setLoginError(err.message || 'Demo persona login failed. Is the backend running?');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFillCredentials = (email: string, pass: string) => {
    setAuthMode('login');
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoginError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyPassword = (pass: string, email: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setLoginEmail('alice@trustvault.internal');
    setLoginPassword('AlicePass123!#');
  };

  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#061426] space-y-4">
        <MoonlitSky />
        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0C2442] border border-[#42D9FF]/40 shadow-[0_0_35px_rgba(66,217,255,0.3)]">
            <Shield className="w-8 h-8 text-[#42D9FF] animate-pulse" />
          </div>
          <div className="text-sm font-medium tracking-wide text-[#DCEEFF]">
            Initializing TrustVault Cryptographic Enclave...
          </div>
        </div>
      </div>
    );
  }

  // If not logged in, render the Moonlit Landing & Authentication Interface
  if (!currentUser) {
    return (
      <div className="relative min-h-screen bg-[#061426] text-[#F4F8FF] flex flex-col justify-between selection:bg-[#168BFF]/40">
        <MoonlitSky />

        {/* Top Minimal Header */}
        <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#168BFF]/30 to-[#0A2E5C]/60 border border-[#42D9FF]/40 shadow-[0_0_20px_rgba(66,217,255,0.25)]">
              <Shield className="w-6 h-6 text-[#42D9FF]" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight font-mono text-white">
                TRUST<span className="text-[#42D9FF]">VAULT</span>
              </span>
            </div>
          </div>

          {/* Backend Status Pill */}
          {backendOnline === false ? (
            <div className="px-3 py-1.5 rounded-full bg-rose-950/70 border border-rose-700/60 text-xs text-rose-300 flex items-center space-x-2">
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Backend Offline (port 8000)</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-full bg-[#0C2442]/80 border border-[#74B1EB]/30 text-xs text-[#DCEEFF] flex items-center space-x-2 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[12px]">AES-256-GCM • HMAC Hash Chain</span>
            </div>
          )}
        </header>

        {/* Main Content: Balanced 2-Column Desktop Grid */}
        <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Hero Section */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Eyebrow */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0E2A4D]/80 border border-[#42D9FF]/35 text-[#42D9FF] text-xs font-bold tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#42D9FF] animate-ping" />
                <span>Secure Access. Verified Trust.</span>
              </div>

              {/* Main Headline (~48-52px on desktop) */}
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-white tracking-tight leading-[1.12]">
                Your digital world, secured beneath one sky.
              </h1>

              {/* Supporting Text (~17-18px) */}
              <p className="text-base sm:text-lg text-[#B6C9E3] leading-relaxed max-w-2xl font-normal">
                Protect confidential documents with controlled access, verified identities, and an auditable trail of every critical action.
              </p>

              {/* Three Concise Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="p-4 rounded-xl glass-card border border-[rgba(116,177,235,0.22)] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#113259] flex items-center justify-center text-[#42D9FF]">
                    <UserCheck2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#F4F8FF]">Identity Verification</h3>
                  <p className="text-xs text-[#B6C9E3] leading-snug">
                    Strict authenticated sessions with single-active policy.
                  </p>
                </div>

                <div className="p-4 rounded-xl glass-card border border-[rgba(116,177,235,0.22)] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#113259] flex items-center justify-center text-[#42D9FF]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#F4F8FF]">Precision Access</h3>
                  <p className="text-xs text-[#B6C9E3] leading-snug">
                    Server-enforced grants with instant revocation.
                  </p>
                </div>

                <div className="p-4 rounded-xl glass-card border border-[rgba(116,177,235,0.22)] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#113259] flex items-center justify-center text-[#42D9FF]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#F4F8FF]">Verifiable Audit Trail</h3>
                  <p className="text-xs text-[#B6C9E3] leading-snug">
                    HMAC-SHA256 monotonic chain detects tampering.
                  </p>
                </div>
              </div>

              {/* Offline Warning Notice if Backend is unreachable */}
              {backendOnline === false && (
                <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-xs text-rose-200 space-y-1 shadow-lg">
                  <div className="font-bold flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Local Security Backend Unreachable</span>
                  </div>
                  <p className="text-rose-300 leading-relaxed text-[12px]">
                    To enable authentication and cryptography, start the FastAPI server:
                  </p>
                  <code className="block bg-black/60 p-2 rounded text-[11px] font-mono text-[#DCEEFF] select-all">
                    python -m uvicorn backend.app.main:app --port 8000 --reload
                  </code>
                </div>
              )}
            </div>

            {/* Right Authentication Panel */}
            <div className="lg:col-span-5">
              <div className="glass-card-static rounded-2xl p-7 sm:p-8 border border-[rgba(116,177,235,0.3)] shadow-[0_16px_50px_rgba(0,0,0,0.5)] space-y-6">
                
                {/* Heading & Description */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {authMode === 'login' ? 'Welcome back' : 'Create an Account'}
                  </h2>
                  <p className="text-sm text-[#B6C9E3] mt-1">
                    {authMode === 'login' 
                      ? 'Verify your identity to enter your secure workspace.'
                      : 'Register for encrypted vault storage and access control.'}
                  </p>
                </div>

                {/* Tabs for Login vs Register */}
                <div className="flex rounded-xl bg-[#08182D] p-1 border border-[rgba(116,177,235,0.2)]">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setLoginError(null); setAuthSuccessMsg(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
                      authMode === 'login'
                        ? 'bg-[#168BFF] text-white shadow-md shadow-[#168BFF]/30'
                        : 'text-[#B6C9E3] hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setLoginError(null); setAuthSuccessMsg(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
                      authMode === 'register'
                        ? 'bg-[#168BFF] text-white shadow-md shadow-[#168BFF]/30'
                        : 'text-[#B6C9E3] hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                </div>

                {/* Accessible Error / Success Banners */}
                {loginError && (
                  <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-700/60 text-xs text-rose-200 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                {authSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-xs text-emerald-200 flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{authSuccessMsg}</span>
                  </div>
                )}

                {/* Login Form */}
                {authMode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#DCEEFF] mb-1.5">
                        Identity Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="alice@trustvault.internal"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF] focus:ring-1 focus:ring-[#42D9FF] transition font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#DCEEFF] mb-1.5">
                        Master Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full px-4 py-2.5 pr-11 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF] focus:ring-1 focus:ring-[#42D9FF] transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#859DBE] hover:text-[#42D9FF] transition p-1"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-3 rounded-xl btn-primary-blue font-bold text-sm tracking-wide shadow-lg active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {loginLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying Identity & Enforcing Session...</span>
                        </>
                      ) : (
                        <span>Enter Secure Workspace</span>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Register Form */
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div>
                      <label className="block text-sm font-medium text-[#DCEEFF] mb-1">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Diana Prince"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF] transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#DCEEFF] mb-1">
                        Identity Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="diana@trustvault.internal"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-sm text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF] font-mono transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#DCEEFF] mb-1">
                          Password (min 8)
                        </label>
                        <input
                          type={showRegisterPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••••••"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-xs text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF] transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#DCEEFF] mb-1">
                          Confirm Password
                        </label>
                        <input
                          type={showRegisterPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••••••"
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-xs text-[#F4F8FF] placeholder-[#5A7698] focus:outline-none focus:border-[#42D9FF] transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-3 rounded-xl btn-primary-blue font-bold text-sm tracking-wide shadow-lg active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {loginLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Registering Account...</span>
                        </>
                      ) : (
                        <span>Complete Registration</span>
                      )}
                    </button>
                  </form>
                )}

                {/* Demo Personas Drawer Toggle */}
                <div className="pt-2 border-t border-[rgba(116,177,235,0.2)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#B6C9E3] uppercase tracking-wider">
                      Test Identity Selector
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDemoList(!showDemoList)}
                      className="text-xs text-[#42D9FF] hover:underline font-medium"
                    >
                      {showDemoList ? 'Hide Personas' : 'Show 6 Personas'}
                    </button>
                  </div>

                  {showDemoList && (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {DEMO_PERSONAS.map((p) => (
                        <div
                          key={p.email}
                          className="p-2.5 rounded-xl bg-[#081930] border border-[rgba(116,177,235,0.18)] hover:border-[#42D9FF]/40 transition flex items-center justify-between gap-2"
                        >
                          <div className="truncate">
                            <div className="text-xs font-bold text-[#F4F8FF] flex items-center space-x-1.5 truncate">
                              <span>{p.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0E2C52] text-[#42D9FF] font-semibold">
                                {p.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#859DBE] font-mono truncate">
                              {p.email}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleFillCredentials(p.email, p.password)}
                              className="px-2 py-1 rounded bg-[#102B4C] hover:bg-[#163D6C] text-[#B6C9E3] hover:text-white text-[10px] font-medium transition"
                            >
                              Fill
                            </button>
                            <button
                              type="button"
                              disabled={loginLoading}
                              onClick={() => handleDemoSelect(p.email)}
                              className="px-2.5 py-1 rounded bg-[#168BFF]/20 hover:bg-[#168BFF]/35 border border-[#168BFF]/50 text-[#DCEEFF] text-[10px] font-bold flex items-center space-x-1 transition"
                            >
                              <span>⚡ 1-Click</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-[rgba(116,177,235,0.15)] bg-[#05101E]/80 backdrop-blur-md py-4 text-center text-xs text-[#859DBE] font-mono">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>TrustVault Enterprise • Hardware AES-256-GCM Storage • Monotonic HMAC-SHA256 Hash Chain</span>
            <span className="text-[#42D9FF]">Moonlit Security Enclave Active</span>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="relative min-h-screen bg-[#061426] text-[#F4F8FF] flex flex-col selection:bg-[#168BFF]/40">
      <MoonlitSky />

      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onOpenDemoSwitcher={() => setIsDemoSwitcherOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
      />

      {/* Main Container */}
      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto border-b border-[rgba(116,177,235,0.2)] pb-3 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'vault', label: 'Document Vault', icon: Lock },
            { id: 'sharing', label: 'Sharing & Grants', icon: Share2 },
            { id: 'audit', label: 'Audit Trail & Integrity', icon: Shield },
            { id: 'security', label: 'Risk Monitoring', icon: ShieldAlert },
            { id: 'sessions', label: 'Sessions & Policy', icon: KeyRound },
            ...(currentUser?.role === 'ADMIN' ? [{ id: 'admin-users', label: 'Admin Users & Roles', icon: Users }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-[#168BFF]/25 border border-[#42D9FF]/60 text-white shadow-[0_0_20px_rgba(66,217,255,0.25)]'
                    : 'text-[#B6C9E3] hover:text-white hover:bg-[#0C2442]/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#42D9FF]' : 'text-[#859DBE]'}`} />
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

        {activeTab === 'admin-users' && currentUser?.role === 'ADMIN' && (
          <AdminUsersTab
            currentUser={currentUser}
            onRefresh={loadAppData}
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

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updatedUser) => {
          setCurrentUser(updatedUser);
          loadAppData();
        }}
      />

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(116,177,235,0.15)] bg-[#05101E]/80 backdrop-blur-md py-4 text-center text-xs text-[#859DBE] font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TrustVault Enterprise • Hardware AES-256-GCM Storage • Monotonic HMAC-SHA256 Hash Chain</span>
          <span className="text-[#42D9FF]">Moonlit Security Enclave Active</span>
        </div>
      </footer>
    </div>
  );
}