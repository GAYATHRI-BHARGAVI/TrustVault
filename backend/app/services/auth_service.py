from datetime import timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.config import settings
from app.models import User, UserSession, AppRole, utc_now
from app.services.crypto_service import crypto_service
from app.services.audit_service import audit_service

class AuthService:
    def register_user(
        self,
        db: Session,
        email: str,
        full_name: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Register a new user account with default least-privileged role (OWNER).
        Validates inputs and rejects duplicates. Never trusts client-supplied role.
        """
        clean_email = email.lower().strip()
        clean_name = full_name.strip()

        if not clean_email or "@" not in clean_email:
            return None, "Invalid email address format."

        if len(clean_name) < 2:
            return None, "Full name must be at least 2 characters."

        if len(password) < 8:
            return None, "Password must be at least 8 characters long."

        # Check for existing account
        existing = db.query(User).filter(User.email == clean_email).first()
        if existing:
            return None, "An account with this email address already exists."

        # Always assign AppRole.OWNER to public registrations
        hashed_pw = crypto_service.hash_password(password)
        new_user = User(
            email=clean_email,
            full_name=clean_name,
            hashed_password=hashed_pw,
            role=AppRole.OWNER,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        audit_service.record_event(
            db=db,
            actor_email=clean_email,
            actor_id=new_user.id,
            action="AUTH_REGISTER_SUCCESS",
            resource_type="USER",
            resource_id=new_user.id,
            outcome="SUCCESS",
            details={"email": clean_email, "role": new_user.role, "full_name": clean_name},
            ip_address=ip_address,
            user_agent=user_agent
        )

        return new_user, None

    def authenticate_user(
        self,
        db: Session,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Verify user credentials. Return (User, None) on success, or (None, error_message).
        Produces uniform error without leaking account existence.
        """
        clean_email = email.lower().strip()
        user = db.query(User).filter(User.email == clean_email).first()
        
        if not user:
            audit_service.record_event(
                db=db,
                actor_email=clean_email,
                action="AUTH_LOGIN_FAILED",
                resource_type="USER",
                outcome="DENIED",
                details={"reason": "User not found"},
                ip_address=ip_address,
                user_agent=user_agent
            )
            return None, "Invalid email or password."

        if not user.is_active:
            audit_service.record_event(
                db=db,
                actor_email=clean_email,
                action="AUTH_LOGIN_BLOCKED",
                resource_type="USER",
                outcome="DENIED",
                actor_id=user.id,
                details={"reason": "Account is deactivated"},
                ip_address=ip_address,
                user_agent=user_agent
            )
            return None, "Account is deactivated. Contact an administrator."

        if not crypto_service.verify_password(password, user.hashed_password):
            audit_service.record_event(
                db=db,
                actor_email=clean_email,
                action="AUTH_LOGIN_FAILED",
                resource_type="USER",
                outcome="DENIED",
                actor_id=user.id,
                details={"reason": "Password mismatch"},
                ip_address=ip_address,
                user_agent=user_agent
            )
            return None, "Invalid email or password."

        return user, None

    def create_session(
        self,
        db: Session,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserSession:
        """
        Generate session token and enforce single-active-session policy if enabled.
        """
        now = utc_now()

        # Enforce single-active-session policy
        if settings.SINGLE_ACTIVE_SESSION:
            prior_sessions = db.query(UserSession).filter(
                UserSession.user_id == user.id,
                UserSession.is_active == True
            ).all()

            for s in prior_sessions:
                s.is_active = False
                s.revoked_at = now
                audit_service.record_event(
                    db=db,
                    actor_email=user.email,
                    actor_id=user.id,
                    action="SESSION_REVOKED_SINGLE_POLICY",
                    resource_type="SESSION",
                    resource_id=s.id,
                    outcome="SUCCESS",
                    details={"revoked_token_prefix": s.session_token[:8], "reason": "New session established under single-active-session policy"},
                    ip_address=ip_address,
                    user_agent=user_agent
                )

        token = crypto_service.generate_secure_token(32)
        expires_at = now + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)

        session = UserSession(
            session_token=token,
            user_id=user.id,
            is_active=True,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            expires_at=expires_at
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        audit_service.record_event(
            db=db,
            actor_email=user.email,
            actor_id=user.id,
            action="AUTH_LOGIN_SUCCESS",
            resource_type="SESSION",
            resource_id=session.id,
            outcome="SUCCESS",
            details={"expires_at": expires_at.isoformat(), "ip": ip_address},
            ip_address=ip_address,
            user_agent=user_agent
        )

        return session

    def validate_session(self, db: Session, session_token: str) -> Optional[UserSession]:
        """
        Validate active session and check expiration and account status.
        """
        if not session_token:
            return None

        session = db.query(UserSession).filter(UserSession.session_token == session_token).first()
        if not session:
            return None

        now = utc_now()
        # Check active flag
        if not session.is_active:
            return None

        # Check expiration
        expires = session.expires_at if session.expires_at.tzinfo else session.expires_at.replace(tzinfo=now.tzinfo)
        if expires <= now:
            session.is_active = False
            db.commit()
            return None

        # Check user active status
        if not session.user or not session.user.is_active:
            return None

        return session

    def change_password(
        self,
        db: Session,
        user: User,
        current_password: str,
        new_password: str,
        current_session_token: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify existing password, hash new password, and invalidate all other sessions.
        """
        if not crypto_service.verify_password(current_password, user.hashed_password):
            return False, "Current password is incorrect."

        if len(new_password) < 8:
            return False, "New password must be at least 8 characters long."

        user.hashed_password = crypto_service.hash_password(new_password)
        now = utc_now()

        # Invalidate all OTHER sessions for security
        other_sessions = db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.is_active == True,
            UserSession.session_token != current_session_token
        ).all()

        for s in other_sessions:
            s.is_active = False
            s.revoked_at = now

        db.commit()

        audit_service.record_event(
            db=db,
            actor_email=user.email,
            actor_id=user.id,
            action="PASSWORD_CHANGED",
            resource_type="USER",
            resource_id=user.id,
            outcome="SUCCESS",
            details={"revoked_concurrent_sessions": len(other_sessions)}
        )

        return True, None

    def revoke_session(self, db: Session, session: UserSession, actor_user: User) -> bool:
        """Explicitly revoke a session."""
        session.is_active = False
        session.revoked_at = utc_now()
        db.commit()

        audit_service.record_event(
            db=db,
            actor_email=actor_user.email,
            actor_id=actor_user.id,
            action="SESSION_REVOKED",
            resource_type="SESSION",
            resource_id=session.id,
            outcome="SUCCESS",
            details={"revoked_by": actor_user.email, "session_user_id": session.user_id}
        )
        return True

    def revoke_all_user_sessions(self, db: Session, target_user_id: str, actor_user: User) -> int:
        """Revoke all sessions for a user (e.g. on account deactivation or security alert)."""
        now = utc_now()
        sessions = db.query(UserSession).filter(
            UserSession.user_id == target_user_id,
            UserSession.is_active == True
        ).all()

        count = len(sessions)
        for s in sessions:
            s.is_active = False
            s.revoked_at = now

        db.commit()

        audit_service.record_event(
            db=db,
            actor_email=actor_user.email,
            actor_id=actor_user.id,
            action="ALL_SESSIONS_REVOKED",
            resource_type="USER",
            resource_id=target_user_id,
            outcome="SUCCESS",
            details={"revoked_count": count, "actor": actor_user.email}
        )
        return count

auth_service = AuthService()
