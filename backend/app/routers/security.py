from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserSession, AuditLog, AppRole
from app.schemas import RiskAssessmentResponse
from app.services.risk_service import risk_engine
from app.services.auth_service import auth_service
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/security", tags=["Security Monitoring & Risk"])

@router.get("/risk-assessment", response_model=RiskAssessmentResponse, summary="Get deterministic risk assessment for user")
def get_risk_assessment(
    email: Optional[str] = Query(None, description="Target user email (admins only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates explainable signals: repeated denied requests, revoked document queries,
    and download velocity. Returns severity and actionable recommendations.
    """
    target_email = current_user.email
    is_admin = current_user.role in (AppRole.ADMIN, "ADMIN", "admin", "security_officer", "compliance_auditor")
    if email and is_admin:
        target_email = email.lower().strip()

    assessment = risk_engine.calculate_user_risk(db, target_email)
    return RiskAssessmentResponse(**assessment)

@router.get("/fleet-risk", summary="Fleet-wide risk overview for Security Operations Center")
def get_fleet_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns risk status for all users in the organization for dashboard visualization.
    """
    is_admin = current_user.role in (AppRole.ADMIN, "ADMIN", "admin", "security_officer", "compliance_auditor")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin role required to view fleet-wide risk telemetry.")

    users = db.query(User).filter(User.is_active == True).all()
    fleet = []
    high_critical_count = 0

    for u in users:
        assessment = risk_engine.calculate_user_risk(db, u.email)
        fleet.append(assessment)
        if assessment["severity"] in ("HIGH", "CRITICAL"):
            high_critical_count += 1

    return {
        "total_active_users": len(users),
        "high_critical_alerts": high_critical_count,
        "fleet_assessments": fleet
    }

@router.post("/kill-switch/user/{user_id}", summary="Emergency kill switch: revoke all user sessions")
def trigger_user_kill_switch(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Immediate emergency session revocation for suspected credential compromise.
    """
    is_admin = current_user.role in (AppRole.ADMIN, "ADMIN", "admin", "security_officer")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only security officers or admins can trigger the emergency kill switch.")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    revoked_count = auth_service.revoke_all_user_sessions(db, user_id, current_user)
    return {
        "status": "success",
        "revoked_sessions_count": revoked_count,
        "user_email": target_user.email,
        "message": f"Successfully revoked {revoked_count} active sessions for {target_user.email}."
    }

@router.get("/policy", summary="Current security configuration & cryptographic posture")
def get_security_policy():
    """
    Returns active security parameters and cryptographic posture details.
    """
    return {
        "cipher": "AES-256-GCM",
        "key_length_bits": 256,
        "nonce_length_bits": 96,
        "auth_tag_length_bits": 128,
        "audit_integrity": "HMAC-SHA256 Hash Chain",
        "single_active_session_enforced": settings.SINGLE_ACTIVE_SESSION,
        "session_timeout_minutes": settings.SESSION_EXPIRE_MINUTES,
        "max_upload_size_mb": settings.MAX_FILE_SIZE_BYTES / (1024 * 1024),
        "storage_mode": "Isolated Nonce-Separated Local Vault",
        "browser_watermark_status": "Enabled (Canvas Deterrent Overlay)"
    }
