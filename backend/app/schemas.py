from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ----------------- User & Auth Schemas -----------------

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

class RegisterRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)

class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    documents_count: int = 0
    active_sessions_count: int = 0

class AdminUserUpdateStatusRequest(BaseModel):
    is_active: bool

class AdminUserUpdateRoleRequest(BaseModel):
    role: str

class CategorySummary(BaseModel):
    category: str
    count: int

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    session_token: str
    user: UserResponse
    expires_at: datetime
    message: str = "Authentication successful"

class SwitchDemoUserRequest(BaseModel):
    email: str

class UserSessionResponse(BaseModel):
    id: str
    session_token_prefix: str
    is_active: bool
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    expires_at: datetime
    revoked_at: Optional[datetime]
    is_current: bool

# ----------------- Document Schemas -----------------

class DocumentResponse(BaseModel):
    id: str
    title: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    classification_level: str
    sha256_digest: str
    owner_id: str
    owner_email: Optional[str] = None
    created_at: datetime
    user_permission: str # "OWNER", "MANAGE", "DOWNLOAD", "VIEW"
    can_manage: bool
    active_grants_count: int = 0

class DocumentDetailResponse(DocumentResponse):
    grants: List["DocumentGrantResponse"] = []
    watermark_preview: Optional[str] = None

# ----------------- Grant Schemas -----------------

class CreateGrantRequest(BaseModel):
    recipient_email: str
    permission_level: str = Field(default="VIEW", description="VIEW, DOWNLOAD, or MANAGE")
    expires_in_hours: Optional[float] = Field(default=None, description="Expiration time in hours from now. None means no expiry.")

class RevokeGrantRequest(BaseModel):
    reason: Optional[str] = "Administrative revocation"

class DocumentGrantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    document_title: Optional[str] = None
    recipient_email: str
    permission_level: str
    expires_at: Optional[datetime]
    is_revoked: bool
    revoked_at: Optional[datetime]
    revocation_reason: Optional[str]
    granted_by_email: Optional[str]
    created_at: datetime
    is_active_now: bool

# ----------------- Audit Schemas -----------------

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sequence_number: int
    timestamp: datetime
    actor_email: str
    action: str
    resource_type: str
    resource_id: Optional[str]
    outcome: str
    details: Dict[str, Any]
    ip_address: Optional[str]
    previous_hash: str
    current_hash: str

class AuditVerificationResponse(BaseModel):
    is_valid: bool
    total_records: int
    verified_records: int
    chain_head_hash: str
    failure_reason: Optional[str] = None
    tampered_sequence: Optional[int] = None
    tampered_record_id: Optional[str] = None
    verified_at: str
    verification_algorithm: str = "HMAC-SHA256"

# ----------------- Security & Risk Schemas -----------------

class RiskSignal(BaseModel):
    signal: str
    severity: str
    score_added: int
    description: str
    evidence: str

class RiskAssessmentResponse(BaseModel):
    user_email: str
    risk_score: int
    severity: str
    contributing_signals: List[RiskSignal]
    recommended_action: str
    evaluated_at: str

class TamperSimulationRequest(BaseModel):
    target_type: str # "audit_record", "ciphertext", "break_hash_pointer"
    record_id: Optional[str] = None
    document_id: Optional[str] = None
