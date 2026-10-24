'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Activity, AlertTriangle, ShieldCheck, Zap, 
  UserX, RefreshCw, Eye, CheckCircle2, FileWarning
} from 'lucide-react';
import { api } from '@/lib/api';

interface SecurityTabProps {
  riskAssessment: any;
  currentUser: any;
  onRefresh: () => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  riskAssessment,
  currentUser,
  onRefresh,
}) => {
  const [fleetRisk, setFleetRisk] = useState<any>(null);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [killSwitching, setKillSwitching] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const isPrivileged = currentUser?.role === 'ADMIN' || currentUser?.role === 'admin' || currentUser?.role === 'security_officer';

  useEffect(() => {
    if (isPrivileged) {
      setLoadingFleet(true);
      api.getFleetRisk()
        .then((data) => setFleetRisk(data))
        .catch(() => {})
        .finally(() => setLoadingFleet(false));
    }
  }, [currentUser, isPrivileged]);

  const handleKillSwitch = async (userId: string) => {
    if (!confirm('EMERGENCY KILL SWITCH: Immediately terminate all active sessions for this account? User will be forced to re-authenticate.')) {
      return;
    }
    try {
      setKillSwitching(true);
      setActionMsg(null);
      const res = await api.killSwitch(userId);
      setActionMsg(res.message);
      onRefresh();
    } catch (err: any) {
      setActionMsg(`Failed: ${err.message}`);
    } finally {
      setKillSwitching(false);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-950/80 text-rose-300 border-rose-700',
          dial: 'text-rose-400 stroke-rose-500',
          card: 'border-rose-700/60 bg-rose-950/20 shadow-[0_0_30px_rgba(244,63,94,0.15)]',
        };
      case 'HIGH':
        return {
          badge: 'bg-amber-950/80 text-amber-300 border-amber-700',
          dial: 'text-amber-400 stroke-amber-500',
          card: 'border-amber-700/60 bg-amber-950/20',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-yellow-950/80 text-yellow-300 border-yellow-700',
          dial: 'text-yellow-400 stroke-yellow-500',
          card: 'border-yellow-700/60 bg-yellow-950/20',
        };
      default:
        return {
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700',
          dial: 'text-emerald-400 stroke-emerald-500',
          card: 'border-[rgba(116,177,235,0.25)] glass-card-static',
        };
    }
  };

  const currentSeverity = riskAssessment?.severity || 'LOW';
  const styles = getSeverityStyle(currentSeverity);
  const score = riskAssessment?.risk_score ?? 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Activity className="w-6 h-6 text-[#42D9FF]" />
            <span>Deterministic Risk Scoring & Security Monitoring</span>
          </h2>
          <p className="text-sm text-[#B6C9E3] mt-1">
            Explainable signals: repeated access denials, revoked grant queries, download velocity spikes, and multi-IP anomalies.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2.5 rounded-xl bg-[#091D36] hover:bg-[#0E2C52] border border-[rgba(116,177,235,0.25)] text-[#DCEEFF] text-xs sm:text-sm font-semibold flex items-center space-x-2 transition"
        >
          <RefreshCw className="w-4 h-4 text-[#42D9FF]" />
          <span>Refresh Signals</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-xl bg-[#0C2442] border border-[#42D9FF]/40 text-xs sm:text-sm text-[#DCEEFF] font-mono">
          {actionMsg}
        </div>
      )}

      {/* Critical Architecture Rule Banner */}
      <div className="p-5 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.25)] flex items-start space-x-3.5 text-sm text-[#B6C9E3]">
        <ShieldCheck className="w-5 h-5 text-[#42D9FF] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white">Zero Trust Architectural Principle</span>
          <p className="text-xs sm:text-sm text-[#859DBE] leading-relaxed">
            <strong className="text-white">Risk scoring never replaces server-side authorization.</strong> A low risk score never grants access to unauthorized documents, and a high risk score does not alter cryptographic invariants. Risk scoring operates strictly as an explainable observability and alerting engine for the SOC.
          </p>
        </div>
      </div>

      {/* Main Risk Card & Dial */}
      <div className={`p-6 sm:p-8 rounded-2xl border transition-all ${styles.card} flex flex-col md:flex-row items-center justify-between gap-6`}>
        {/* Score Dial & Metric */}
        <div className="flex items-center space-x-6 sm:space-x-8">
          <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
            {/* SVG circular progress */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-[#091D36] fill-none"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className={`fill-none ${styles.dial}`}
                strokeWidth="8"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * score) / 100}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white">{score}</span>
              <span className="text-xs font-mono text-[#859DBE]">/ 100</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="text-lg sm:text-xl font-bold text-white tracking-wide">
                User Threat Profile: {currentUser?.email}
              </span>
              <span className={`text-xs font-mono uppercase px-3 py-0.5 rounded-full border font-bold ${styles.badge}`}>
                {currentSeverity}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#B6C9E3] max-w-md leading-relaxed">
              Score calculated deterministically from audit telemetry in the last 15–60 minutes.
            </p>
            <div className="text-xs text-[#859DBE] font-mono">
              Evaluated at: {riskAssessment?.evaluated_at ? new Date(riskAssessment.evaluated_at).toLocaleTimeString() : 'Current'}
            </div>
          </div>
        </div>

        {/* Emergency Kill Switch Button */}
        {isPrivileged && (
          <button
            disabled={killSwitching}
            onClick={() => handleKillSwitch(currentUser.id)}
            className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-lg shadow-rose-600/30 active:scale-95 transition disabled:opacity-50 flex-shrink-0"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>{killSwitching ? 'Revoking...' : 'Trigger User Kill-Switch'}</span>
          </button>
        )}
      </div>

      {/* SOC Recommended Action */}
      <div className="p-5 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.22)] space-y-1.5">
        <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-[#42D9FF] uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" />
          <span>Recommended Security Response</span>
        </div>
        <p className="text-sm sm:text-base text-white font-mono leading-relaxed pl-6">
          {riskAssessment?.recommended_action || 'No action required. Normal baseline activity.'}
        </p>
      </div>

      {/* Contributing Signals Breakdown */}
      <div className="space-y-3.5">
        <h3 className="text-base sm:text-lg font-bold text-white">
          Contributing Threat Signals ({riskAssessment?.contributing_signals?.length || 0})
        </h3>

        {!riskAssessment?.contributing_signals || riskAssessment.contributing_signals.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#859DBE] border border-dashed border-[rgba(116,177,235,0.2)] rounded-2xl glass-card-static">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <span>No anomalous or threat signals triggered for this account. Clean security standing.</span>
          </div>
        ) : (
          riskAssessment.contributing_signals.map((sig: any, idx: number) => (
            <div
              key={idx}
              className="p-5 rounded-2xl glass-card border border-[rgba(116,177,235,0.2)] flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2.5">
                  <span className="text-sm sm:text-base font-bold text-white font-mono">{sig.signal}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0A223F] text-[#42D9FF] border border-[#168BFF]/30">
                    +{sig.score_added} pts
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#091D36] text-[#B6C9E3]">
                    {sig.severity}
                  </span>
                </div>
                <p className="text-sm text-[#B6C9E3]">{sig.description}</p>
                <div className="text-xs text-[#859DBE] font-mono">
                  Evidence: {sig.evidence}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fleet-Wide Risk Overview (For Admins and Security Officers) */}
      {fleetRisk && (
        <div className="rounded-2xl p-6 glass-card-static border border-[rgba(116,177,235,0.25)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="w-5 h-5 text-[#42D9FF]" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                Fleet Risk Overview (Organization-Wide)
              </h3>
            </div>
            <span className="text-xs sm:text-sm text-[#859DBE] font-mono">
              {fleetRisk.high_critical_alerts} elevated threat(s) across {fleetRisk.total_active_users} accounts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {fleetRisk.fleet_assessments?.map((userAssessment: any) => (
              <div
                key={userAssessment.user_email}
                className="p-4 rounded-xl bg-[#07172C]/80 border border-[rgba(116,177,235,0.2)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-white font-mono truncate max-w-[170px]">
                    {userAssessment.user_email}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${getSeverityStyle(userAssessment.severity).badge}`}>
                    {userAssessment.severity}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#859DBE]">Score: {userAssessment.risk_score}/100</span>
                  <span className="text-[#859DBE]">{userAssessment.contributing_signals?.length} signals</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};