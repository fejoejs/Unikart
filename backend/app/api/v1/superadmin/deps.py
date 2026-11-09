from typing import List, Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password
from app.models.auth import User, Role

security = HTTPBearer()

def get_current_superadmin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        scope: str = payload.get("scope")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload."
            )

        # Enforce scope if present
        if scope and scope not in ["superadmin", "admin", "staff", "access_token"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Token scope is unauthorized for administrative actions."
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate Admin credentials."
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is deactivated.")

    # Always enforce CURRENT authoritative roles directly from the database (never trust stale JWT claims)
    current_db_roles = [r.name for r in user.roles] if hasattr(user, "roles") else []
    if not any(r in ["owner", "admin"] for r in current_db_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Owner role required to access this action."
        )

    return user

get_current_admin = get_current_superadmin

def require_hr_permission(permission_code: str):
    def dependency(
        current_user: User = Depends(get_current_superadmin)
    ):
        user_role_names = [r.name for r in current_user.roles]
        if "owner" in user_role_names:
            return current_user # Owner has all permissions by default

        # Check permissions attached to roles
        user_permissions = []
        for r in current_user.roles:
            for p in r.permissions:
                if p.code not in user_permissions:
                    user_permissions.append(p.code)

        if permission_code not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: '{permission_code}'"
            )
        return current_user

    return dependency
