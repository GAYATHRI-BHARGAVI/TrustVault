from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserSession, AppRole, utc_now
from app.schemas import (
    LoginRequest, LoginResponse, UserResponse,
    RegisterRequest, ProfileUpdateRequest, ChangePasswordRequest,
    SwitchDemoUserRequest, UserSessionResponse
)
from app.services.auth_service import auth_service
from app.services.audit_service import audit_service
from app.dependencies import get_current_user, get_current_session

router = APIRouter(prefix="/api/auth", tags=["Authentication & Sessions"])

DEMO_USERS_METADATA = [
    {
        "email": "admin@trustvault.internal",
        "full_name": "Chief Security Officer",
        "role": AppRole.ADMIN,
        "role_badge": "ADMIN",
        "description": "System administrator with platform oversight, user management, and audit verification."
    },
    {
        "email": "alice@trustvault.internal",
        "full_name": "Alice Chen (Principal Architect)",
        "role": AppRole.OWNER,
        "role_badge": "OWNER",
        "description": "Document owner who uploads confidential files and manages explicit recipient grants."
    },
    {
        "email": "bob@trustvault.internal",
        "full_name": "Bob Martinez (DevOps Lead)",
        "role": AppRole.VIEWER,
        "role_badge": "VIEWER",
        "description": "Recipient with legitimate VIEW and DOWNLOAD access grants issued by Alice."
    },
    {
        "email": "charlie@trustvault.internal",
        "full_name": "Charlie Vance (External Contractor)",
        "role": AppRole.VIEWER,
        "role_badge": "VIEWER",
        "description": "Contractor with revoked grants to verify that access denial occurs immediately."
    }
]

@router.get("/demo-users", summary="List pre-seeded demo personas for local testing")
def get_demo_users():
    """Returns the list of configured demo accounts for isolated local development."""
    return {"demo_users": DEMO_USERS_METADATA}

@router.post("/register", response_model=LoginResponse, summary="Register a new user account")
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """
    Register a new user. Rejects duplicate emails, hashes passwords with PBKDF2-HMAC-SHA256,
    and unconditionally assigns the least-privileged normal role (OWNER).
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    user, err = auth_service.register_user(
        db=db,
        email=payload.email,
        full_name=payload.full_name,
        password=payload.password,
        ip_address=client_ip,
        user_agent=user_agent
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err or "Registration failed."
        )

    # Establish initial authenticated session
    session = auth_service.create_session(
        db=db,
        user=user,
        ip_address=client_ip,
        user_agent=user_agent
    )

    return LoginResponse(
        session_token=session.session_token,
        user=UserResponse.model_validate(user),
        expires_at=session.expires_at,
        message="Registration successful. Authenticated session established."
    )

@router.post("/login", response_model=LoginResponse, summary="Authenticate user with password")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate against stored PBKDF2 hash.
    Generates cryptographically random session and enforces single-active-session policy.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    user, err = auth_service.authenticate_user(
        db=db,
        email=payload.email,
        password=payload.password,
        ip_address=client_ip,
        user_agent=user_agent
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=err or "Invalid email or password."
        )

    session = auth_service.create_session(
        db=db,
        user=user,
        ip_address=client_ip,
        user_agent=user_agent
    )

    return LoginResponse(
        session_token=session.session_token,
        user=UserResponse.model_validate(user),
        expires_at=session.expires_at,
        message="Authentication successful. Single-session policy applied."
    )

@router.post("/switch-demo", response_model=LoginResponse, summary="Switch active demo persona")
def switch_demo_user(payload: SwitchDemoUserRequest, request: Request, db: Session = Depends(get_db)):
    """
    Quickly switch identity for isolated local testing.
    Creates a real, authentic backend session for the chosen demo account.
    """
    target_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Demo user {target_email} not found in database.")

    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown-DemoSelector")

    session = auth_service.create_session(
        db=db,
        user=user,
        ip_address=client_ip,
        user_agent=user_agent
    )

    return LoginResponse(
        session_token=session.session_token,
        user=UserResponse.model_validate(user),
        expires_at=session.expires_at,
        message=f"Switched identity to {user.full_name} ({user.email})."
    )

@router.get("/me", summary="Get currently authenticated user and session")
def get_me(
    current_user: User = Depends(get_current_user),
    session: UserSession = Depends(get_current_session)
):
    return {
        "user": UserResponse.model_validate(current_user),
        "session_id": session.id,
        "session_expires_at": session.expires_at,
        "ip_address": session.ip_address
    }

@router.put("/profile", response_model=UserResponse, summary="Update user profile information")
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(current_user)

    audit_service.record_event(
        db=db,
        actor_email=current_user.email,
        actor_id=current_user.id,
        action="USER_PROFILE_UPDATED",
        resource_type="USER",
        resource_id=current_user.id,
        outcome="SUCCESS",
        details={"full_name": current_user.full_name}
    )

    return UserResponse.model_validate(current_user)

@router.post("/change-password", summary="Change user password and invalidate concurrent sessions")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_session: UserSession = Depends(get_current_session)
):
    success, err = auth_service.change_password(
        db=db,
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
        current_session_token=current_session.session_token
    )

    if not success:
        raise HTTPException(status_code=400, detail=err or "Password change failed.")

    return {"message": "Password changed successfully. All other active sessions have been invalidated."}

@router.post("/logout", summary="Revoke current session and log out")
def logout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    session: UserSession = Depends(get_current_session)
):
    auth_service.revoke_session(db, session, current_user)
    return {"message": "Session terminated successfully."}

@router.get("/sessions", response_model=List[UserSessionResponse], summary="List active and recent sessions")
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_session: UserSession = Depends(get_current_session)
):
    sessions = db.query(UserSession).filter(UserSession.user_id == current_user.id).order_by(UserSession.created_at.desc()).limit(20).all()
    results = []
    now = utc_now()
    for s in sessions:
        results.append(UserSessionResponse(
            id=s.id,
            session_token_prefix=f"{s.session_token[:6]}...{s.session_token[-4:]}",
            is_active=s.is_active and (s.expires_at > now),
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            created_at=s.created_at,
            expires_at=s.expires_at,
            revoked_at=s.revoked_at,
            is_current=(s.id == current_session.id)
        ))
    return results

@router.post("/sessions/{session_id}/revoke", summary="Revoke a specific session")
def revoke_specific_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()

    if not target_session:
        raise HTTPException(status_code=404, detail="Session not found.")

    auth_service.revoke_session(db, target_session, current_user)
    return {"message": "Session revoked successfully."}
