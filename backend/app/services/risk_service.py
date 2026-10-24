from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import AuditLog, UserSession, SecurityAlert, utc_now

class RiskEngine:
    @staticmethod
    def calculate_user_risk(db: Session, user_email: str) -> Dict[str, Any]:
        """
        Deterministic, explainable risk scoring based on verifiable audit signals.
        Score range: 0 - 100.
        """
        now = utc_now()
        fifteen_mins_ago = now - timedelta(minutes=15)
        one_hour_ago = now - timedelta(hours=1)

        contributing_signals: List[Dict[str, Any]] = []
        score = 0

        # Signal 1: Denied requests in last 15 minutes
        denied_logs = db.query(AuditLog).filter(
            AuditLog.actor_email == user_email,
            AuditLog.outcome == "DENIED",
            AuditLog.timestamp >= fifteen_mins_ago
        ).all()
        denied_count = len(denied_logs)

        if denied_count >= 5:
            added = 55
            score += added
            contributing_signals.append({
                "signal": "HIGH_FREQUENCY_DENIALS",
                "severity": "HIGH",
                "score_added": added,
                "description": f"{denied_count} access denials recorded in the last 15 minutes.",
                "evidence": f"Count: {denied_count}"
            })
        elif denied_count >= 3:
            added = 35
            score += added
            contributing_signals.append({
                "signal": "REPEATED_ACCESS_DENIALS",
                "severity": "MEDIUM",
                "score_added": added,
                "description": f"{denied_count} unauthorized document access attempts detected.",
                "evidence": f"Count: {denied_count}"
            })
        elif denied_count >= 1:
            added = 10
            score += added
            contributing_signals.append({
                "signal": "ISOLATED_DENIAL",
                "severity": "LOW",
                "score_added": added,
                "description": "Single access denial recorded recently.",
                "evidence": f"Count: {denied_count}"
            })

        # Signal 2: Revoked document access attempts in last hour
        revoked_attempts = db.query(AuditLog).filter(
            AuditLog.actor_email == user_email,
            AuditLog.action == "ACCESS_DENIED_REVOKED",
            AuditLog.timestamp >= one_hour_ago
        ).count()

        if revoked_attempts > 0:
            added = min(40, revoked_attempts * 20)
            score += added
            contributing_signals.append({
                "signal": "REVOKED_GRANT_ACCESS_ATTEMPT",
                "severity": "HIGH",
                "score_added": added,
                "description": f"{revoked_attempts} attempt(s) to access explicitly revoked documents.",
                "evidence": f"Revoked accesses attempted: {revoked_attempts}"
            })

        # Signal 3: Rapid download velocity / potential exfiltration spike (last 5 minutes)
        five_mins_ago = now - timedelta(minutes=5)
        download_count = db.query(AuditLog).filter(
            AuditLog.actor_email == user_email,
            AuditLog.action == "DOC_DOWNLOAD",
            AuditLog.outcome == "SUCCESS",
            AuditLog.timestamp >= five_mins_ago
        ).count()

        if download_count >= 10:
            added = 40
            score += added
            contributing_signals.append({
                "signal": "RAPID_DOWNLOAD_EXFILTRATION_SPIKE",
                "severity": "CRITICAL",
                "score_added": added,
                "description": f"Unusual download frequency: {download_count} files downloaded in 5 minutes.",
                "evidence": f"Downloads: {download_count}"
            })
        elif download_count >= 5:
            added = 20
            score += added
            contributing_signals.append({
                "signal": "ELEVATED_DOWNLOAD_FREQUENCY",
                "severity": "MEDIUM",
                "score_added": added,
                "description": f"{download_count} documents downloaded within a short window.",
                "evidence": f"Downloads: {download_count}"
            })

        # Signal 4: Disparate IP sessions
        active_sessions = db.query(UserSession).filter(
            UserSession.user.has(email=user_email),
            UserSession.is_active == True,
            UserSession.expires_at > now
        ).all()
        distinct_ips = set(s.ip_address for s in active_sessions if s.ip_address)
        if len(distinct_ips) > 1:
            added = 25
            score += added
            contributing_signals.append({
                "signal": "MULTIPLE_DISPARATE_IPS",
                "severity": "HIGH",
                "score_added": added,
                "description": f"Simultaneous sessions active across {len(distinct_ips)} different IP addresses.",
                "evidence": f"IPs: {', '.join(distinct_ips)}"
            })

        # Clamp score between 0 and 100
        final_score = min(100, max(0, score))

        # Severity categorization
        if final_score >= 75:
            severity = "CRITICAL"
            recommended_action = "Revoke all active sessions immediately, lock account credentials, and inspect forensic audit logs."
        elif final_score >= 50:
            severity = "HIGH"
            recommended_action = "Require immediate re-authentication, restrict high-volume downloads, and notify security officer."
        elif final_score >= 25:
            severity = "MEDIUM"
            recommended_action = "Review recent grant revocations and investigate unauthorized document queries."
        else:
            severity = "LOW"
            recommended_action = "No intervention necessary. Normal operational baseline."

        return {
            "user_email": user_email,
            "risk_score": final_score,
            "severity": severity,
            "contributing_signals": contributing_signals,
            "recommended_action": recommended_action,
            "evaluated_at": now.isoformat()
        }

    @staticmethod
    def get_watermark_text(user_email: str, client_ip: str = "127.0.0.1") -> str:
        """
        Generate watermark string for in-browser confidential viewer.
        Note: Browser overlays provide visual deterrents but cannot prevent
        external screen captures or device cameras.
        """
        now_str = utc_now().strftime("%Y-%m-%d %H:%M:%S UTC")
        return f"CONFIDENTIAL - {user_email} - {client_ip} - {now_str} - TRUSTVAULT PROTECTED"

risk_engine = RiskEngine()
