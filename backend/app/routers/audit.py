import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import AuditLog, Document, User, utc_now
from app.schemas import AuditLogResponse, AuditVerificationResponse, TamperSimulationRequest
from app.services.audit_service import audit_service
from app.services.crypto_service import crypto_service
from app.services.storage_service import storage_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit Integrity & Verification"])

@router.get("/logs", response_model=List[AuditLogResponse], summary="Retrieve tamper-evident audit logs")
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action code"),
    outcome: Optional[str] = Query(None, description="Filter by outcome (SUCCESS, DENIED, ERROR)"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch cryptographic audit trail records with HMAC-SHA256 integrity hashes.
    Compliance auditors and admins can view all logs; standard users see logs relevant to them.
    """
    query = db.query(AuditLog)

    # Role-based visibility
    if current_user.role not in ("admin", "security_officer", "compliance_auditor"):
        # Filter to actions performed by user or against documents owned by user
        owned_doc_ids = [d.id for d in db.query(Document.id).filter(Document.owner_id == current_user.id).all()]
        query = query.filter(
            (AuditLog.actor_email == current_user.email) |
            (AuditLog.resource_id.in_(owned_doc_ids))
        )

    if action:
        query = query.filter(AuditLog.action == action)
    if outcome:
        query = query.filter(AuditLog.outcome == outcome)

    records = query.order_by(desc(AuditLog.sequence_number)).limit(limit).all()

    results = []
    for r in records:
        try:
            details_dict = json.loads(r.details_json) if r.details_json else {}
        except Exception:
            details_dict = {"raw": r.details_json}

        results.append(AuditLogResponse(
            id=r.id,
            sequence_number=r.sequence_number,
            timestamp=r.timestamp,
            actor_email=r.actor_email,
            action=r.action,
            resource_type=r.resource_type,
            resource_id=r.resource_id,
            outcome=r.outcome,
            details=details_dict,
            ip_address=r.ip_address,
            previous_hash=r.previous_hash,
            current_hash=r.current_hash
        ))

    return results

@router.get("/verify", response_model=AuditVerificationResponse, summary="Cryptographically verify audit chain integrity")
def verify_audit_chain(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Walk the entire HMAC-SHA256 audit chain from Genesis to current head.
    Detects any event modification, deletion, reordering, or broken links.
    """
    verification = audit_service.verify_chain_integrity(db)
    return AuditVerificationResponse(**verification)

@router.post("/simulate-tamper", summary="Security testing tool: simulate audit or ciphertext tampering")
def simulate_tampering(
    payload: TamperSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Testing endpoint for demonstrating tamper-evidence:
    - audit_record: corrupts an audit log's action/outcome without updating HMAC
    - break_hash_pointer: alters a previous_hash link
    - ciphertext: flips a byte in an encrypted document in vault (triggers AES-GCM InvalidTag)
    - restore: recalculates and restores canonical cryptographic integrity
    """
    if payload.target_type == "audit_record":
        # Corrupt the latest or specified audit record's action string directly
        if payload.record_id:
            record = db.query(AuditLog).filter(AuditLog.id == payload.record_id).first()
        else:
            record = db.query(AuditLog).order_by(desc(AuditLog.sequence_number)).first()

        if not record:
            raise HTTPException(status_code=404, detail="No audit record available to tamper.")

        original_action = record.action
        record.action = "UNAUTHORIZED_ADMIN_TAMPERED"
        db.commit()

        return {
            "status": "tampered",
            "message": f"Audit record seq #{record.sequence_number} altered from '{original_action}' to '{record.action}'. HMAC remains un-updated.",
            "record_id": record.id,
            "tampered_sequence": record.sequence_number
        }

    elif payload.target_type == "break_hash_pointer":
        record = db.query(AuditLog).order_by(desc(AuditLog.sequence_number)).first()
        if not record:
            raise HTTPException(status_code=404, detail="No audit record available.")

        record.previous_hash = "deadbeef" * 8
        db.commit()

        return {
            "status": "tampered",
            "message": f"Audit record seq #{record.sequence_number} previous_hash pointer broken.",
            "record_id": record.id
        }

    elif payload.target_type == "ciphertext":
        # Tamper with actual encrypted file on disk
        if payload.document_id:
            doc = db.query(Document).filter(Document.id == payload.document_id).first()
        else:
            doc = db.query(Document).filter(Document.is_deleted == False).first()

        if not doc:
            raise HTTPException(status_code=404, detail="No document available to tamper.")

        try:
            raw_ciphertext = storage_service.read_encrypted_file(doc.storage_path)
            # Flip middle byte
            tampered_bytes = bytearray(raw_ciphertext)
            tampered_bytes[len(tampered_bytes) // 2] ^= 0xFF
            
            file_path = storage_service.storage_dir / doc.storage_path
            with open(file_path, "wb") as f:
                f.write(bytes(tampered_bytes))

            return {
                "status": "tampered",
                "message": f"Flipped ciphertext byte in document '{doc.title}'. AES-GCM will immediately reject decryption.",
                "document_id": doc.id
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    elif payload.target_type == "restore":
        # Restore entire chain HMACs and hashes to valid state
        logs = db.query(AuditLog).order_by(AuditLog.sequence_number.asc()).all()
        prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"
        
        for idx, entry in enumerate(logs):
            entry.sequence_number = idx + 1
            entry.previous_hash = prev_hash
            # Recompute valid HMAC
            entry.current_hash = crypto_service.compute_audit_hash(
                sequence=entry.sequence_number,
                timestamp_iso=entry.timestamp.isoformat(),
                actor_email=entry.actor_email,
                action=entry.action,
                resource_type=entry.resource_type,
                resource_id=entry.resource_id or "",
                outcome=entry.outcome,
                previous_hash=prev_hash,
                details_canonical=entry.details_json
            )
            prev_hash = entry.current_hash

        db.commit()
        return {"status": "restored", "message": f"Successfully re-signed {len(logs)} audit records. Chain integrity restored."}

    raise HTTPException(status_code=400, detail=f"Unknown target_type '{payload.target_type}'.")
