from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    token: Optional[str] = None
    user_id: Any
    email: str
    full_name: str
    name: Optional[str] = None
    role_level: Optional[int] = 1
    roleLevel: Optional[int] = 1
    roles: List[str] = []
    permissions: List[str] = []
    apps: Optional[List[str]] = []
    user: Optional[Any] = None

class UserLogin(BaseModel):
    email: Optional[str] = None
    employeeId: Optional[str] = None
    password: str
    totp_code: Optional[str] = None
    otp: Optional[str] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: Any
    email: str
    full_name: str
    phone: Optional[str] = None
    is_active: bool
    roles: List[str] = []
    permissions: List[str] = []
    role_level: Optional[int] = 1
    roleLevel: Optional[int] = 1
    apps: Optional[List[str]] = []

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: Optional[str] = None
    otp: Optional[str] = None
    reset_token: Optional[str] = None
    token: Optional[str] = None
    new_password: str

class OAuthLoginRequest(BaseModel):
    provider: str = "google"
    email: EmailStr
    token: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None
    current_password: Optional[str] = None
    new_password: str

class CustomerAddressCreate(BaseModel):
    recipient_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    state: str
    state_code: Optional[str] = "29"
    postal_code: str
    address_type: Optional[str] = "shipping"
    is_default: Optional[bool] = False

class CustomerAddressResponse(BaseModel):
    id: int
    customer_id: int
    recipient_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    state: str
    state_code: str
    postal_code: str
    address_type: str
    is_default: bool
    created_at: Any

    class Config:
        from_attributes = True

class WishlistActionRequest(BaseModel):
    product_id: int



