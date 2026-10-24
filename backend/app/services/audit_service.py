import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models import AuditLog, utc_now
from app.services.crypto_service import crypto_service

GENESIS_PREVIOUS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def canonical_timestamp(dt: datetime) -> str:
    """Format datetime into a deterministic canonical UTC timestamp string."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

class AuditService:
    @staticmethod
    def _canonicalize_details(details: Dict[str, Any]) -> str:
        """Deterministically sort keys and format json to guarantee hash repeatability."""
        return json.dumps(details or {}, sort_keys=True, separators=(',', ':'))

    def record_event(
        self,
        db: Session,
        actor_email: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        outcome: str = "SUCCESS",
        actor_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Record a tamper-evident audit event cryptographically linked to the previous record.
        """
        details = details or {}
        details_canonical = self._canonicalize_details(details)
        
        # Get latest event in the chain to extract previous_hash and next sequence
        last_event = db.query(AuditLog).order_by(desc(AuditLog.sequence_number)).first()
        
        if last_event:
            sequence_number = last_event.sequence_number + 1
            previous_hash = last_event.current_hash
        else:
            sequence_number = 1
            previous_hash = GENESIS_PREVIOUS_HASH

        now_utc = utc_now()
        timestamp_iso = canonical_timestamp(now_utc)

        # Compute HMAC-SHA256
        current_hash = crypto_service.compute_audit_hash(
            sequence=sequence_number,
            timestamp_iso=timestamp_iso,
            actor_email=actor_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id or "",
            outcome=outcome,
            previous_hash=previous_hash,
            details_canonical=details_canonical
        )

        audit_entry = AuditLog(
            sequence_number=sequence_number,
            timestamp=now_utc,
            actor_id=actor_id,
            actor_email=actor_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            outcome=outcome,
            details_json=details_canonical,
            ip_address=ip_address,
            user_agent=user_agent,
            previous_hash=previous_hash,
            current_hash=current_hash
        )

        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry

    def verify_chain_integrity(self, db: Session) -> Dict[str, Any]:
        """
        Walk the entire audit log chain and verify HMACs, sequences, and previous-hash pointers.
        Detects:
        - Content modifications (tampered fields)
        - Deletions (missing sequence gap or broken hash link)
        - Reorderings or insertions
        """
        logs = db.query(AuditLog).order_by(AuditLog.sequence_number.asc()).all()
        total = len(logs)

        if total == 0:
            return {
                "is_valid": True,
                "total_records": 0,
                "verified_records": 0,
                "chain_head_hash": GENESIS_PREVIOUS_HASH,
                "failure_reason": None,
                "tampered_sequence": None,
                "verified_at": utc_now().isoformat()
            }

        expected_prev_hash = GENESIS_PREVIOUS_HASH
        expected_seq = 1

        for idx, entry in enumerate(logs):
            # 1. Verify sequence continuity
            if entry.sequence_number != expected_seq:
                return {
                    "is_valid": False,
                    "total_records": total,
                    "verified_records": idx,
                    "failure_reason": f"Sequence discontinuity detected: expected {expected_seq}, found {entry.sequence_number}. Possible deletion or reordering.",
                    "tampered_sequence": entry.sequence_number,
                    "tampered_record_id": entry.id,
                    "chain_head_hash": expected_prev_hash,
                    "verified_at": utc_now().isoformat()
                }

            # 2. Verify previous hash pointer
            if entry.previous_hash != expected_prev_hash:
                return {
                    "is_valid": False,
                    "total_records": total,
                    "verified_records": idx,
                    "failure_reason": f"Broken chain pointer at sequence {entry.sequence_number}: previous_hash does not match predecessor's hash.",
                    "tampered_sequence": entry.sequence_number,
                    "tampered_record_id": entry.id,
                    "chain_head_hash": expected_prev_hash,
                    "verified_at": utc_now().isoformat()
                }

            # 3. Recompute HMAC-SHA256 and verify match
            timestamp_iso = canonical_timestamp(entry.timestamp)
            computed_hash = crypto_service.compute_audit_hash(
                sequence=entry.sequence_number,
                timestamp_iso=timestamp_iso,
                actor_email=entry.actor_email,
                action=entry.action,
                resource_type=entry.resource_type,
                resource_id=entry.resource_id or "",
                outcome=entry.outcome,
                previous_hash=entry.previous_hash,
                details_canonical=entry.details_json
            )

            if computed_hash != entry.current_hash:
                return {
                    "is_valid": False,
                    "total_records": total,
                    "verified_records": idx,
                    "failure_reason": f"HMAC cryptographic verification failed at sequence {entry.sequence_number}. Record contents or metadata have been modified.",
                    "tampered_sequence": entry.sequence_number,
                    "tampered_record_id": entry.id,
                    "chain_head_hash": expected_prev_hash,
                    "verified_at": utc_now().isoformat()
                }

            expected_prev_hash = entry.current_hash
            expected_seq += 1

        return {
            "is_valid": True,
            "total_records": total,
            "verified_records": total,
            "chain_head_hash": logs[-1].current_hash,
            "failure_reason": None,
            "tampered_sequence": None,
            "tampered_record_id": None,
            "verified_at": utc_now().isoformat()
        }

audit_service = AuditService()
