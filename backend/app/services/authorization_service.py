from typing import Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Document, DocumentGrant, User, AppRole, utc_now

class PermissionLevel:
    VIEW = "VIEW"
    DOWNLOAD = "DOWNLOAD"
    MANAGE = "MANAGE"

class AuthorizationService:
    @staticmethod
    def is_permission_sufficient(granted_permission: str, requested_action: str) -> bool:
        """
        Verify if granted permission level satisfies requested action:
        Hierarchy: MANAGE >= DOWNLOAD >= VIEW
        """
        levels = {
            PermissionLevel.VIEW: 1,
            PermissionLevel.DOWNLOAD: 2,
            PermissionLevel.MANAGE: 3,
        }
        granted_rank = levels.get(granted_permission, 0)
        requested_rank = levels.get(requested_action, 99)
        return granted_rank >= requested_rank

    def check_document_access(
        self,
        db: Session,
        document_id: str,
        user: User,
        requested_action: str = PermissionLevel.VIEW
    ) -> Tuple[bool, Optional[Document], Optional[str], int]:
        """
        Centralized server-side authorization check for viewing or downloading a document.
        Returns:
            (allowed: bool, document: Optional[Document], denial_reason: Optional[str], http_status_code: int)
        """
        # Look up document
        doc = db.query(Document).filter(Document.id == document_id, Document.is_deleted == False).first()
        if not doc:
            # Consistent denial: prevent leaking whether document ID exists
            return False, None, "Document not found or access denied.", 404

        # 1. ADMIN policy: full oversight access
        if user.role == AppRole.ADMIN:
            return True, doc, None, 200

        # 2. Document Owner: unconditional access to own documents
        if doc.owner_id == user.id:
            return True, doc, None, 200

        # 3. Check explicit grants for user (matching user ID or email)
        grants = db.query(DocumentGrant).filter(
            DocumentGrant.document_id == document_id,
            (DocumentGrant.recipient_id == user.id) | (DocumentGrant.recipient_email == user.email)
        ).all()

        if not grants:
            # Consistent denial: prevent leaking existence
            return False, None, "Document not found or access denied.", 404

        has_revoked_grant = False
        has_expired_grant = False

        now = utc_now()
        for grant in grants:
            if grant.is_revoked:
                has_revoked_grant = True
                continue

            if grant.expires_at is not None:
                expires_at = grant.expires_at if grant.expires_at.tzinfo else grant.expires_at.replace(tzinfo=timezone.utc)
                if expires_at <= now:
                    has_expired_grant = True
                    continue

            # Active grant: verify permission level
            if self.is_permission_sufficient(grant.permission_level, requested_action):
                return True, doc, None, 200

        # If user had grants but none valid
        if has_revoked_grant:
            return False, None, "Access to this document has been revoked.", 403
        if has_expired_grant:
            return False, None, "Access grant has expired.", 403

        return False, None, "Insufficient permissions for requested action.", 403

    def can_upload_document(self, user: User) -> bool:
        """
        Only ADMIN and OWNER roles can upload documents.
        VIEWER role is strictly read-only and cannot upload.
        """
        return user.role in (AppRole.ADMIN, AppRole.OWNER)

    def can_manage_grants(self, db: Session, document_id: str, user: User) -> bool:
        """
        Only the document owner or an authorized ADMIN can issue or revoke grants.
        Viewers or owners of unrelated documents cannot manage grants.
        """
        doc = db.query(Document).filter(Document.id == document_id, Document.is_deleted == False).first()
        if not doc:
            return False

        if user.role == AppRole.ADMIN:
            return True

        if doc.owner_id == user.id and user.role == AppRole.OWNER:
            return True

        # Delegated manager grant (if applicable)
        manage_grant = db.query(DocumentGrant).filter(
            DocumentGrant.document_id == document_id,
            (DocumentGrant.recipient_id == user.id) | (DocumentGrant.recipient_email == user.email),
            DocumentGrant.is_revoked == False,
            DocumentGrant.permission_level == PermissionLevel.MANAGE
        ).first()

        if manage_grant:
            if manage_grant.expires_at:
                now = utc_now()
                expires_at = manage_grant.expires_at if manage_grant.expires_at.tzinfo else manage_grant.expires_at.replace(tzinfo=timezone.utc)
                if expires_at <= now:
                    return False
            return True

        return False

    def can_delete_document(self, db: Session, document_id: str, user: User) -> bool:
        """
        Only the document owner or an authorized ADMIN can delete documents.
        Viewers or owners of unrelated documents cannot delete documents.
        """
        doc = db.query(Document).filter(Document.id == document_id, Document.is_deleted == False).first()
        if not doc:
            return False

        if user.role == AppRole.ADMIN:
            return True

        if doc.owner_id == user.id and user.role == AppRole.OWNER:
            return True

        return False

authorization_service = AuthorizationService()
