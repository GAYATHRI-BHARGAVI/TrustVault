from typing import List, Optional
from datetime import timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document, DocumentGrant, User, utc_now
from app.schemas import CreateGrantRequest, RevokeGrantRequest, DocumentGrantResponse
from app.services.authorization_service import authorization_service, PermissionLevel
from app.services.audit_service import audit_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["Document Sharing & Grants"])

@router.post("/documents/{document_id}/grants", response_model=DocumentGrantResponse, summary="Create document access grant")
def create_grant(
    document_id: str,
    payload: CreateGrantRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Share document with explicit recipient email and permission level.
    Only the document owner or users with MANAGE permission can grant access.
    Viewers cannot grant themselves access.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    doc = db.query(Document).filter(Document.id == document_id, Document.is_deleted == False).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Strict server-side check: caller must have MANAGE rights
    if not authorization_service.can_manage_grants(db, document_id, current_user):
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="ACCESS_DENIED_GRANT_CREATE",
            resource_type="GRANT",
            resource_id=document_id,
            outcome="DENIED",
            details={"reason": "Caller lacks MANAGE permissions to create grants on this document"},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only document owners or users with MANAGE authority may issue grants."
        )

    # Validate permission level
    clean_perm = payload.permission_level.upper().strip()
    if clean_perm not in (PermissionLevel.VIEW, PermissionLevel.DOWNLOAD, PermissionLevel.MANAGE):
        raise HTTPException(status_code=400, detail="Invalid permission level. Choose VIEW, DOWNLOAD, or MANAGE.")

    recipient_email = payload.recipient_email.lower().strip()
    recipient_user = db.query(User).filter(User.email == recipient_email).first()

    expires_at = None
    if payload.expires_in_hours and payload.expires_in_hours > 0:
        expires_at = utc_now() + timedelta(hours=payload.expires_in_hours)

    # Check if there is an existing revoked grant for this recipient on this document; replace or reactivate
    existing_grant = db.query(DocumentGrant).filter(
        DocumentGrant.document_id == document_id,
        DocumentGrant.recipient_email == recipient_email
    ).first()

    if existing_grant:
        existing_grant.permission_level = clean_perm
        existing_grant.expires_at = expires_at
        existing_grant.is_revoked = False
        existing_grant.revoked_at = None
        existing_grant.revocation_reason = None
        existing_grant.granted_by_id = current_user.id
        existing_grant.created_at = utc_now()
        grant = existing_grant
    else:
        grant = DocumentGrant(
            document_id=document_id,
            granted_by_id=current_user.id,
            recipient_email=recipient_email,
            recipient_id=recipient_user.id if recipient_user else None,
            permission_level=clean_perm,
            expires_at=expires_at,
            is_revoked=False
        )
        db.add(grant)

    db.commit()
    db.refresh(grant)

    # Record tamper-evident audit log
    audit_service.record_event(
        db=db,
        actor_email=current_user.email,
        actor_id=current_user.id,
        action="GRANT_CREATE",
        resource_type="GRANT",
        resource_id=grant.id,
        outcome="SUCCESS",
        details={
            "document_id": doc.id,
            "document_title": doc.title,
            "recipient_email": recipient_email,
            "permission_level": clean_perm,
            "expires_at": expires_at.isoformat() if expires_at else None
        },
        ip_address=client_ip
    )

    return DocumentGrantResponse(
        id=grant.id,
        document_id=grant.document_id,
        document_title=doc.title,
        recipient_email=grant.recipient_email,
        permission_level=grant.permission_level,
        expires_at=grant.expires_at,
        is_revoked=grant.is_revoked,
        revoked_at=grant.revoked_at,
        revocation_reason=grant.revocation_reason,
        granted_by_email=current_user.email,
        created_at=grant.created_at,
        is_active_now=True
    )

@router.post("/grants/{grant_id}/revoke", response_model=DocumentGrantResponse, summary="Immediately revoke document grant")
def revoke_grant(
    grant_id: str,
    payload: RevokeGrantRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Immediately invalidate access grant. Subsequent access attempts will be rejected.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    grant = db.query(DocumentGrant).filter(DocumentGrant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found.")

    doc = grant.document
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Associated document not found.")

    if not authorization_service.can_manage_grants(db, doc.id, current_user):
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="ACCESS_DENIED_GRANT_REVOKE",
            resource_type="GRANT",
            resource_id=grant_id,
            outcome="DENIED",
            details={"reason": "Caller lacks MANAGE permission on document to revoke grant"},
            ip_address=client_ip
        )
        raise HTTPException(status_code=403, detail="Forbidden: Caller lacks permission to revoke this grant.")

    # Apply immediate revocation
    now = utc_now()
    grant.is_revoked = True
    grant.revoked_at = now
    grant.revoked_by_id = current_user.id
    grant.revocation_reason = payload.reason or "Administrative revocation"

    db.commit()
    db.refresh(grant)

    # Audit event
    audit_service.record_event(
        db=db,
        actor_email=current_user.email,
        actor_id=current_user.id,
        action="GRANT_REVOKE",
        resource_type="GRANT",
        resource_id=grant.id,
        outcome="SUCCESS",
        details={
            "document_id": doc.id,
            "document_title": doc.title,
            "recipient_email": grant.recipient_email,
            "revoked_by": current_user.email,
            "reason": grant.revocation_reason
        },
        ip_address=client_ip
    )

    return DocumentGrantResponse(
        id=grant.id,
        document_id=grant.document_id,
        document_title=doc.title,
        recipient_email=grant.recipient_email,
        permission_level=grant.permission_level,
        expires_at=grant.expires_at,
        is_revoked=True,
        revoked_at=grant.revoked_at,
        revocation_reason=grant.revocation_reason,
        granted_by_email=grant.granted_by.email if grant.granted_by else "System",
        created_at=grant.created_at,
        is_active_now=False
    )
