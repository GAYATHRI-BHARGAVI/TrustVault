import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class AppRole:
    ADMIN = "ADMIN"
    OWNER = "OWNER"
    VIEWER = "VIEWER"

    @classmethod
    def all_roles(cls):
        return [cls.ADMIN, cls.OWNER, cls.VIEWER]

    @classmethod
    def is_valid(cls, role: str) -> bool:
        return role in (cls.ADMIN, cls.OWNER, cls.VIEWER)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=AppRole.OWNER) # ADMIN, OWNER, VIEWER
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    grants_created = relationship("DocumentGrant", back_populates="granted_by", foreign_keys="DocumentGrant.granted_by_id")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_token = Column(String(128), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False) # Secure random isolated filename
    mime_type = Column(String(128), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    nonce_b64 = Column(String(64), nullable=False) # 96-bit AES-GCM nonce in base64
    sha256_plaintext_digest = Column(String(64), nullable=False) # Plaintext digest for decrypt verification
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    classification_level = Column(String(50), default="CONFIDENTIAL", nullable=False) # PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    owner = relationship("User", back_populates="documents")
    grants = relationship("DocumentGrant", back_populates="document", cascade="all, delete-orphan")


class DocumentGrant(Base):
    __tablename__ = "document_grants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    granted_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    permission_level = Column(String(50), default="VIEW", nullable=False) # VIEW, DOWNLOAD, MANAGE
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    revocation_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    document = relationship("Document", back_populates="grants")
    granted_by = relationship("User", foreign_keys=[granted_by_id], back_populates="grants_created")
    recipient = relationship("User", foreign_keys=[recipient_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sequence_number = Column(Integer, nullable=False, unique=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    actor_id = Column(String(36), nullable=True)
    actor_email = Column(String(255), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True) # e.g. DOC_READ, ACCESS_DENIED, AUTH_LOGIN
    resource_type = Column(String(50), nullable=False) # DOCUMENT, GRANT, SESSION, USER, SYSTEM
    resource_id = Column(String(36), nullable=True)
    outcome = Column(String(50), nullable=False) # SUCCESS, DENIED, ERROR, WARNING
    details_json = Column(Text, nullable=False, default="{}")
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False)


class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_email = Column(String(255), nullable=False, index=True)
    risk_score = Column(Integer, nullable=False) # 0-100
    severity = Column(String(50), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    signals_json = Column(Text, nullable=False, default="[]")
    recommended_action = Column(String(255), nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False) # ACTIVE, ACKNOWLEDGED, RESOLVED
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
