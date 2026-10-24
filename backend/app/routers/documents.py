import io
from typing import List, Optional, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Document, DocumentGrant, User, AppRole, utc_now
from app.schemas import DocumentResponse, DocumentDetailResponse, DocumentGrantResponse, CategorySummary
from app.services.crypto_service import crypto_service
from app.services.storage_service import storage_service
from app.services.authorization_service import authorization_service, PermissionLevel
from app.services.audit_service import audit_service
from app.services.risk_service import risk_engine
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/documents", tags=["Document Vault"])

@router.post("/upload", response_model=DocumentResponse, summary="Encrypt and store confidential document")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    classification_level: str = Form("CONFIDENTIAL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Encrypt document via AES-256-GCM before writing to storage.
    Enforces role authorization (OWNER or ADMIN), size limit, extension whitelist, and path traversal security.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    # Strict Role Authorization: VIEWER cannot upload
    if not authorization_service.can_upload_document(current_user):
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="ACCESS_DENIED_UPLOAD",
            resource_type="DOCUMENT",
            outcome="DENIED",
            details={"reason": "VIEWER role lacks upload authorization"},
            ip_address=client_ip,
            user_agent=user_agent
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Viewers have read-only permissions and cannot upload documents."
        )

    # Read file content safely in memory
    content = await file.read()
    file_size = len(content)

    # 1. Validate file parameters
    is_valid, err_msg = storage_service.validate_file(file.filename, file.content_type or "application/octet-stream", file_size)
    if not is_valid:
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="DOC_UPLOAD_REJECTED",
            resource_type="DOCUMENT",
            outcome="DENIED",
            details={"filename": file.filename, "reason": err_msg, "size": file_size},
            ip_address=client_ip,
            user_agent=user_agent
        )
        raise HTTPException(status_code=400, detail=err_msg)

    # 2. Encrypt document payload with AES-256-GCM
    # Bind document title and owner to authenticated data (AAD)
    aad_string = f"doc:{title}:{current_user.id}"
    try:
        ciphertext, nonce_b64, sha256_digest = crypto_service.encrypt_document(content, associated_data=aad_string)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cryptographic failure during AES-GCM encryption: {str(e)}")

    # 3. Store encrypted ciphertext with random isolated filename
    storage_filename = storage_service.save_encrypted_file(ciphertext)

    # 4. Save metadata to database
    doc = Document(
        title=title.strip(),
        original_filename=file.filename,
        storage_path=storage_filename,
        mime_type=file.content_type or "application/octet-stream",
        file_size_bytes=file_size,
        nonce_b64=nonce_b64,
        sha256_plaintext_digest=sha256_digest,
        owner_id=current_user.id,
        classification_level=classification_level.upper()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 5. Tamper-evident audit logging
    audit_service.record_event(
        db=db,
        actor_email=current_user.email,
        actor_id=current_user.id,
        action="DOC_UPLOAD",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="SUCCESS",
        details={
            "title": doc.title,
            "original_filename": doc.original_filename,
            "classification": doc.classification_level,
            "file_size": file_size,
            "sha256": sha256_digest,
            "encryption": "AES-256-GCM"
        },
        ip_address=client_ip,
        user_agent=user_agent
    )

    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        classification_level=doc.classification_level,
        sha256_digest=doc.sha256_plaintext_digest,
        owner_id=doc.owner_id,
        owner_email=current_user.email,
        created_at=doc.created_at,
        user_permission="OWNER",
        can_manage=True,
        active_grants_count=0
    )

@router.get("/categories/summary", summary="Get document counts by classification category")
def get_categories_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns breakdown of accessible document counts grouped by security classification.
    """
    all_accessible = list_documents(db=db, current_user=current_user)
    counts: Dict[str, int] = {}
    for doc in all_accessible:
        cat = doc.classification_level or "UNCLASSIFIED"
        counts[cat] = counts.get(cat, 0) + 1

    return {"categories": [{"category": cat, "count": count} for cat, count in counts.items()]}

@router.get("", response_model=List[DocumentResponse], summary="List accessible documents with search and categories")
def list_documents(
    search: Optional[str] = Query(None, description="Search by title or filename"),
    category: Optional[str] = Query(None, description="Filter by classification level"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all documents owned by user, shared via active explicit grants,
    or accessible to ADMIN users under administrative oversight.
    """
    now = utc_now()

    if current_user.role == AppRole.ADMIN:
        # Admin can view all documents across the vault for oversight
        all_docs = db.query(Document).filter(Document.is_deleted == False).all()
        valid_grants_by_doc = {}
    else:
        # 1. Documents owned by user
        owned_docs = db.query(Document).filter(
            Document.owner_id == current_user.id,
            Document.is_deleted == False
        ).all()

        # 2. Documents shared with user
        grants = db.query(DocumentGrant).filter(
            or_(DocumentGrant.recipient_id == current_user.id, DocumentGrant.recipient_email == current_user.email),
            DocumentGrant.is_revoked == False
        ).all()

        valid_grants_by_doc = {}
        for g in grants:
            if g.expires_at:
                exp = g.expires_at if g.expires_at.tzinfo else g.expires_at.replace(tzinfo=timezone.utc)
                if exp <= now:
                    continue
            valid_grants_by_doc[g.document_id] = g

        shared_doc_ids = list(valid_grants_by_doc.keys())
        shared_docs = db.query(Document).filter(
            Document.id.in_(shared_doc_ids),
            Document.is_deleted == False
        ).all() if shared_doc_ids else []

        all_docs_dict = {d.id: d for d in (owned_docs + shared_docs)}
        all_docs = list(all_docs_dict.values())

    results = []
    for doc in all_docs:
        # Apply search filter
        if search:
            s = search.lower().strip()
            if s not in doc.title.lower() and s not in doc.original_filename.lower():
                continue

        # Apply category filter
        if category and category.upper() != "ALL":
            if doc.classification_level.upper() != category.upper():
                continue

        is_owner = (doc.owner_id == current_user.id)
        is_admin = (current_user.role == AppRole.ADMIN)

        if is_owner:
            permission = "OWNER"
            can_manage = True
        elif is_admin:
            permission = "ADMIN"
            can_manage = True
        else:
            grant = valid_grants_by_doc.get(doc.id)
            permission = grant.permission_level if grant else "VIEW"
            can_manage = (permission == "MANAGE")

        active_grants_cnt = db.query(DocumentGrant).filter(
            DocumentGrant.document_id == doc.id,
            DocumentGrant.is_revoked == False
        ).count()

        results.append(DocumentResponse(
            id=doc.id,
            title=doc.title,
            original_filename=doc.original_filename,
            mime_type=doc.mime_type,
            file_size_bytes=doc.file_size_bytes,
            classification_level=doc.classification_level,
            sha256_digest=doc.sha256_plaintext_digest,
            owner_id=doc.owner_id,
            owner_email=doc.owner.email if doc.owner else "Unknown",
            created_at=doc.created_at,
            user_permission=permission,
            can_manage=can_manage,
            active_grants_count=active_grants_cnt
        ))

    return results

@router.get("/{document_id}", response_model=DocumentDetailResponse, summary="Get document details & grants")
def get_document(
    document_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get document metadata. If caller has MANAGE permission, returns grant list.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    allowed, doc, denial_reason, status_code = authorization_service.check_document_access(
        db=db,
        document_id=document_id,
        user=current_user,
        requested_action=PermissionLevel.VIEW
    )

    if not allowed:
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="ACCESS_DENIED_VIEW",
            resource_type="DOCUMENT",
            resource_id=document_id,
            outcome="DENIED",
            details={"reason": denial_reason},
            ip_address=client_ip
        )
        raise HTTPException(status_code=status_code, detail=denial_reason)

    is_owner = (doc.owner_id == current_user.id)
    is_admin = (current_user.role == AppRole.ADMIN)
    can_manage = authorization_service.can_manage_grants(db, document_id, current_user)

    grants_resp = []
    if can_manage:
        grants = db.query(DocumentGrant).filter(DocumentGrant.document_id == document_id).order_by(DocumentGrant.created_at.desc()).all()
        now = utc_now()
        for g in grants:
            is_active_now = not g.is_revoked
            if g.expires_at:
                exp = g.expires_at if g.expires_at.tzinfo else g.expires_at.replace(tzinfo=timezone.utc)
                if exp <= now:
                    is_active_now = False

            grants_resp.append(DocumentGrantResponse(
                id=g.id,
                document_id=g.document_id,
                document_title=doc.title,
                recipient_email=g.recipient_email,
                permission_level=g.permission_level,
                expires_at=g.expires_at,
                is_revoked=g.is_revoked,
                revoked_at=g.revoked_at,
                revocation_reason=g.revocation_reason,
                granted_by_email=g.granted_by.email if g.granted_by else "System",
                created_at=g.created_at,
                is_active_now=is_active_now
            ))

    watermark = risk_engine.get_watermark_text(current_user.email, client_ip)

    return DocumentDetailResponse(
        id=doc.id,
        title=doc.title,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        classification_level=doc.classification_level,
        sha256_digest=doc.sha256_plaintext_digest,
        owner_id=doc.owner_id,
        owner_email=doc.owner.email if doc.owner else "Unknown",
        created_at=doc.created_at,
        user_permission="OWNER" if is_owner else ("ADMIN" if is_admin else ("MANAGE" if can_manage else "VIEW")),
        can_manage=can_manage,
        active_grants_count=len([g for g in grants_resp if g.is_active_now]),
        grants=grants_resp,
        watermark_preview=watermark
    )

@router.get("/{document_id}/view", summary="Stream decrypted document for authenticated in-browser preview")
def view_document_content(
    document_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Decrypts AES-256-GCM ciphertext on-the-fly and streams directly with Content-Disposition inline.
    Audits the access event. Never writes decrypted plaintext to disk.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    allowed, doc, denial_reason, status_code = authorization_service.check_document_access(
        db=db,
        document_id=document_id,
        user=current_user,
        requested_action=PermissionLevel.VIEW
    )

    if not allowed:
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="ACCESS_DENIED_READ",
            resource_type="DOCUMENT",
            resource_id=document_id,
            outcome="DENIED",
            details={"reason": denial_reason},
            ip_address=client_ip,
            user_agent=user_agent
        )
        raise HTTPException(status_code=status_code, detail=denial_reason)

    try:
        ciphertext = storage_service.read_encrypted_file(doc.storage_path)
        aad_string = f"doc:{doc.title}:{doc.owner_id}"
        plaintext = crypto_service.decrypt_document(ciphertext, doc.nonce_b64, associated_data=aad_string)
        
        # Verify SHA-256 digest match
        computed_digest = crypto_service.compute_sha256(plaintext)
        if computed_digest != doc.sha256_plaintext_digest:
            audit_service.record_event(
                db=db,
                actor_email=current_user.email,
                actor_id=current_user.id,
                action="TAMPER_DETECTED_DIGEST_MISMATCH",
                resource_type="DOCUMENT",
                resource_id=doc.id,
                outcome="ERROR",
                details={"stored_sha": doc.sha256_plaintext_digest, "computed_sha": computed_digest},
                ip_address=client_ip
            )
            raise HTTPException(status_code=500, detail="Document integrity verification failed! Ciphertext may have been modified.")

    except Exception as e:
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="CIPHERTEXT_DECRYPTION_FAILED",
            resource_type="DOCUMENT",
            resource_id=doc.id,
            outcome="ERROR",
            details={"error": str(e)},
            ip_address=client_ip
        )
        raise HTTPException(status_code=500, detail=f"Decryption error: {str(e)}")

    # Record successful document view event in tamper-evident chain
    audit_service.record_event(
        db=db,
        actor_email=current_user.email,
        actor_id=current_user.id,
        action="DOC_READ",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="SUCCESS",
        details={"title": doc.title, "mode": "preview_inline"},
        ip_address=client_ip,
        user_agent=user_agent
    )

    return Response(
        content=plaintext,
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{doc.original_filename}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate, private"
        }
    )

@router.get("/{document_id}/download", summary="Decrypt and download document attachment")
def download_document_content(
    document_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Decrypts AES-256-GCM ciphertext on-the-fly and downloads as file attachment.
    Requires DOWNLOAD permission level.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    allowed, doc, denial_reason, status_code = authorization_service.check_document_access(
        db=db,
        document_id=document_id,
        user=current_user,
        requested_action=PermissionLevel.DOWNLOAD
    )

    if not allowed:
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="ACCESS_DENIED_DOWNLOAD",
            resource_type="DOCUMENT",
            resource_id=document_id,
            outcome="DENIED",
            details={"reason": denial_reason},
            ip_address=client_ip,
            user_agent=user_agent
        )
        raise HTTPException(status_code=status_code, detail=denial_reason)

    try:
        ciphertext = storage_service.read_encrypted_file(doc.storage_path)
        aad_string = f"doc:{doc.title}:{doc.owner_id}"
        plaintext = crypto_service.decrypt_document(ciphertext, doc.nonce_b64, associated_data=aad_string)
    except Exception as e:
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="CIPHERTEXT_DECRYPTION_FAILED",
            resource_type="DOCUMENT",
            resource_id=doc.id,
            outcome="ERROR",
            details={"error": str(e)},
            ip_address=client_ip
        )
        raise HTTPException(status_code=500, detail=f"Decryption error: {str(e)}")

    # Audit download
    audit_service.record_event(
        db=db,
        actor_email=current_user.email,
        actor_id=current_user.id,
        action="DOC_DOWNLOAD",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="SUCCESS",
        details={"title": doc.title, "size": len(plaintext)},
        ip_address=client_ip,
        user_agent=user_agent
    )

    return Response(
        content=plaintext,
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{doc.original_filename}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate, private"
        }
    )

@router.delete("/{document_id}", summary="Delete document and purge encrypted vault payload")
def delete_document(
    document_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permanently purge document ciphertext from vault.
    Requires ownership or ADMIN role. Viewers cannot delete.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    doc = db.query(Document).filter(Document.id == document_id, Document.is_deleted == False).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not authorization_service.can_delete_document(db, document_id, current_user):
        audit_service.record_event(
            db=db,
            actor_email=current_user.email,
            actor_id=current_user.id,
            action="ACCESS_DENIED_DELETE",
            resource_type="DOCUMENT",
            resource_id=document_id,
            outcome="DENIED",
            details={"reason": "User lacks delete authority"},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only document owners or administrators can delete documents."
        )

    # Mark deleted in DB
    doc.is_deleted = True
    db.commit()

    # Delete encrypted file payload from disk
    storage_service.delete_encrypted_file(doc.storage_path)

    audit_service.record_event(
        db=db,
        actor_email=current_user.email,
        actor_id=current_user.id,
        action="DOC_DELETE",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="SUCCESS",
        details={"title": doc.title, "purged_file": doc.storage_path},
        ip_address=client_ip
    )

    return {"message": "Document and encrypted vault payload deleted successfully."}
