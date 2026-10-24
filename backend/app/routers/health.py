from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.services.audit_service import audit_service
from app.config import settings

router = APIRouter(prefix="/api/health", tags=["Health & Status"])

@router.get("", summary="Application health and integrity status")
def health_check(db: Session = Depends(get_db)):
    # Verify DB connectivity
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # Check chain integrity quick status
    chain_status = audit_service.verify_chain_integrity(db)

    return {
        "status": "HEALTHY" if db_ok and chain_status["is_valid"] else "DEGRADED",
        "app_name": settings.APP_NAME,
        "tagline": settings.TAGLINE,
        "database_connected": db_ok,
        "audit_chain_valid": chain_status["is_valid"],
        "audit_total_records": chain_status["total_records"],
        "chain_head_hash": chain_status["chain_head_hash"][:16] + "...",
        "encryption_engine": "AES-256-GCM (Hardware Accelerated)",
        "single_active_session": settings.SINGLE_ACTIVE_SESSION
    }
