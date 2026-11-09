import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.totp import generate_totp_secret, verify_totp_code
from app.models.auth import User, Role
from app.models.governance import LoginHistory, UserSession
from app.models.finance import AuditLog
from app.api.v1.superadmin.deps import get_current_superadmin

router = APIRouter(prefix="/auth", tags=["Admin Authentication"])

class SuperAdminLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

class VerifySensitiveAction(BaseModel):
    password: str
    action_description: str

class TwoFASetupResponse(BaseModel):
    secret: str
    otpauth_url: str

class TwoFAVerifyRequest(BaseModel):
    totp_code: str

@router.post("/login")
def login_superadmin(
    login_data: SuperAdminLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else "127.0.0.1"
    req_email = login_data.email.lower().strip()
    req_pass = login_data.password.strip()
    
    # Check user by email
    user = db.query(User).filter(User.email == req_email).first()

    password_valid = False
    if user and user.hashed_password:
        password_valid = verify_password(req_pass, user.hashed_password)

    if not user or not password_valid:
        # Record failed login
        history = LoginHistory(
            user_id=user.id if user else None,
            email_attempted=req_email,
            ip_address=ip_address,
            user_agent=request.headers.get("user-agent", ""),
            status="FAILED_PASSWORD"
        )
        db.add(history)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials or invalid access."
        )

    # Check if user has Owner or Admin role
    user_role_names = [r.name for r in user.roles]
    if not any(r in ["owner", "admin"] for r in user_role_names):
        history = LoginHistory(
            user_id=user.id,
            email_attempted=req_email,
            ip_address=ip_address,
            user_agent=request.headers.get("user-agent", ""),
            status="ACCOUNT_LOCKED"
        )
        db.add(history)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to platform Administrators."
        )

    # If 2FA enabled, verify TOTP code
    if user.is_totp_enabled:
        if not login_data.totp_code:
            return {
                "requires_2fa": True,
                "email": user.email,
                "message": "Enter your 6-digit TOTP authenticator code."
            }
        if not user.totp_secret or not verify_totp_code(user.totp_secret, login_data.totp_code):
            history = LoginHistory(
                user_id=user.id,
                email_attempted=req_email,
                ip_address=ip_address,
                user_agent=request.headers.get("user-agent", ""),
                status="FAILED_2FA"
            )
            db.add(history)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid two-factor authentication code."
            )

    # Collect permissions
    roles = [r.name for r in user.roles]
    permissions = []
    for r in user.roles:
        for p in r.permissions:
            if p.code not in permissions:
                permissions.append(p.code)

    # Issue JWT with scope="superadmin"
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "roles": roles,
            "scope": "superadmin"
        }
    )

    # Record successful login history
    history = LoginHistory(
        user_id=user.id,
        email_attempted=req_email,
        ip_address=ip_address,
        user_agent=request.headers.get("user-agent", ""),
        status="SUCCESS"
    )
    db.add(history)
    user.last_login_at = datetime.datetime.utcnow()
    db.commit()

    user_dict = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "roles": roles,
        "permissions": permissions,
        "is_totp_enabled": user.is_totp_enabled
    }
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "scope": "superadmin",
        "user": user_dict,
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "roles": roles,
        "permissions": permissions,
        "is_totp_enabled": user.is_totp_enabled
    }

@router.post("/verify-password")
def verify_sensitive_action(
    req: VerifySensitiveAction,
    current_user: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Re-authenticates current user password for high-security actions
    (e.g., revealing masked salary, unlocking kill switch, approving payroll).
    """
    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password verification failed. Action denied."
        )

    # Log password re-entry verification to audit trail
    audit = AuditLog(
        user_id=current_user.id,
        action="SENSITIVE_ACTION_AUTHORIZED",
        entity_type="SecurityGate",
        entity_id=str(current_user.id),
        new_values={"action": req.action_description}
    )
    db.add(audit)
    db.commit()

    return {"verified": True, "message": "Sensitive authorization confirmed."}

@router.get("/me")
def get_superadmin_profile(
    current_user: User = Depends(get_current_superadmin)
):
    roles = [r.name for r in current_user.roles]
    permissions = []
    for r in current_user.roles:
        for p in r.permissions:
            if p.code not in permissions:
                permissions.append(p.code)

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "roles": roles,
        "permissions": permissions,
        "is_totp_enabled": current_user.is_totp_enabled,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None
    }

@router.post("/2fa/setup")
def setup_2fa(
    current_user: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    secret = generate_totp_secret()
    current_user.totp_secret = secret
    otpauth_url = f"otpauth://totp/UnikartAdmin:{current_user.email}?secret={secret}&issuer=Unikart"
    db.commit()
    return {"secret": secret, "otpauth_url": otpauth_url}

@router.post("/2fa/verify")
def verify_and_enable_2fa(
    req: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    if not current_user.totp_secret or not verify_totp_code(current_user.totp_secret, req.totp_code):
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    current_user.is_totp_enabled = True
    db.commit()
    return {"message": "Two-factor authentication enabled successfully."}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post('/change-password')
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    if not verify_password(req.current_password, current_user.hashed_password) :
        raise HTTPException(status_code=400, detail='Current password is incorrect.')
    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {'message': 'Password updated successfully.'}
