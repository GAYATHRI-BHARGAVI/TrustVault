from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserSession
from app.services.auth_service import auth_service

def get_current_session(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db)
) -> UserSession:
    """
    Extract session token from Bearer header or X-Session-Token header.
    Validates session expiration, revocation, and active state.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif x_session_token:
        token = x_session_token.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing session credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session = auth_service.validate_session(db, token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired, revoked, or invalid. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return session

def get_current_user(
    session: UserSession = Depends(get_current_session)
) -> User:
    """Return the authenticated user associated with the valid session."""
    if not session.user or not session.user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated or invalid."
        )
    return session.user
