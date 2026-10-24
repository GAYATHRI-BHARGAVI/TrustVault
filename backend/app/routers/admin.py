from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Document, UserSession, AppRole, utc_now
from app.schemas import AdminUserResponse, AdminUserUpdateStatusRequest, AdminUserUpdateRoleRequest
from app.dependencies import get_current_user
from app.services.auth_service import auth_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/admin", tags=["Administrative User Management"])

def require_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure the requester possesses the ADMIN role."""
    if user.role != AppRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrative privileges required."
        )
    return user

@router.get("/users", response_model=List[AdminUserResponse], summary="List all users with roles and document counts")
def list_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    results = []
    now = utc_now()

    for u in users:
        docs_count = db.query(Document).filter(Document.owner_id == u.id, Document.is_deleted == False).count()
        active_sessions_count = db.query(UserSession).filter(
            UserSession.user_id == u.id,
            UserSession.is_active == True,
            UserSession.expires_at > now
        ).count()

        results.append(AdminUserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            documents_count=docs_count,
            active_sessions_count=active_sessions_count
        ))

    return results

@router.put("/users/{user_id}/status", summary="Activate or deactivate a user account")
def update_user_status(
    user_id: str,
    payload: AdminUserUpdateStatusRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if target.id == admin_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own administrator account.")

    target.is_active = payload.is_active
    db.commit()

    # If deactivating, immediately revoke all active sessions!
    revoked_count = 0
    if not payload.is_active:
        revoked_count = auth_service.revoke_all_user_sessions(db, target.id, admin_user)

    audit_service.record_event(
        db=db,
        actor_email=admin_user.email,
        actor_id=admin_user.id,
        action="ADMIN_USER_STATUS_CHANGED",
        resource_type="USER",
        resource_id=target.id,
        outcome="SUCCESS",
        details={
            "target_email": target.email,
            "new_status": "ACTIVE" if target.is_active else "DEACTIVATED",
            "revoked_sessions": revoked_count
        }
    )

    return {
        "message": f"User {target.email} status updated to {'ACTIVE' if target.is_active else 'DEACTIVATED'}.",
        "user_id": target.id,
        "is_active": target.is_active,
        "revoked_sessions": revoked_count
    }

@router.put("/users/{user_id}/role", summary="Change user application role (ADMIN, OWNER, VIEWER)")
def update_user_role(
    user_id: str,
    payload: AdminUserUpdateRoleRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    new_role = payload.role.upper().strip()
    if not AppRole.is_valid(new_role):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(AppRole.all_roles())}."
        )

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    # Guard: prevent removing the last remaining ADMIN
    if target.role == AppRole.ADMIN and new_role != AppRole.ADMIN:
        admin_count = db.query(User).filter(User.role == AppRole.ADMIN, User.is_active == True).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last remaining active administrator.")

    old_role = target.role
    target.role = new_role
    db.commit()

    audit_service.record_event(
        db=db,
        actor_email=admin_user.email,
        actor_id=admin_user.id,
        action="ADMIN_USER_ROLE_CHANGED",
        resource_type="USER",
        resource_id=target.id,
        outcome="SUCCESS",
        details={
            "target_email": target.email,
            "old_role": old_role,
            "new_role": new_role
        }
    )

    return {
        "message": f"Role for {target.email} updated from {old_role} to {new_role}.",
        "user_id": target.id,
        "role": target.role
    }
