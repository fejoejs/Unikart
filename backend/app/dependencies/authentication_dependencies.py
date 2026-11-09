"""
Authentication & Authorization Dependencies for UNIKART FastAPI Backend.
Handles OAuth2 token extraction, user validation, and role/permission-based access checks.
"""

from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.core.security import decode_access_token
from app.models.auth import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    """Retrieves current authenticated user if valid token exists, else returns None."""
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == int(user_id), User.is_active == True).first()

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    """Enforces authentication: extracts JWT token and validates active user."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")
    return user

def require_roles(allowed_roles: List[str]):
    """Factory creating dependency to enforce specific user roles (e.g. admin, inventory_staff)."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_names = [r.name for r in current_user.roles]
        if "admin" in user_role_names or "owner" in user_role_names:
            return current_user  # Admin override
        for r in allowed_roles:
            if r in user_role_names:
                return current_user
            if r == "inventory_staff" and any(alt in user_role_names for alt in ["inventory", "warehouse", "inventory_manager", "staff"]):
                return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required roles: {allowed_roles}"
        )
    return role_checker

def require_permissions(required_permission: str):
    """Factory creating dependency to enforce specific granular permissions."""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_names = [r.name for r in current_user.roles]
        if "admin" in user_role_names or "owner" in user_role_names:
            return current_user
        all_perms = set()
        for role in current_user.roles:
            for p in role.permissions:
                all_perms.add(p.code)
        if required_permission not in all_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Missing permission: {required_permission}"
            )
        return current_user
    return permission_checker

require_admin = require_roles(["admin", "owner"])
require_inventory_staff = require_roles(["inventory_staff", "inventory", "warehouse"])
