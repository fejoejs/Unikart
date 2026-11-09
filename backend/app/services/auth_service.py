from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.auth import User
from app.core.security import verify_password, create_access_token
from app.core.config import settings

class AuthService:
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.hashed_password:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def create_user_token(user: User) -> Dict[str, Any]:
        roles = [r.name for r in user.roles]
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "roles": roles,
        }
        access_token = create_access_token(data=token_data)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "roles": roles,
            }
        }
