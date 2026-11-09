import os
import json
from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Unikart"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration (Supabase PostgreSQL / Cloud Postgres)
    _backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "unikart-super-secure-production-secret-key-at-least-32-chars-long-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours strict lifetime for internal employee sessions
    
    # Google OAuth 2.0
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID", None)

    # Supabase Cloud Integration
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", "https://agldqmiirkxggyifhuti.supabase.co")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", None))
    SUPABASE_ANON_KEY: Optional[str] = os.getenv("SUPABASE_ANON_KEY", None)
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "product-images")

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:5177",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5177",
        "https://unikart.vercel.app",
        "https://unikart-in.vercel.app",
        "https://unikart-storefront.vercel.app",
        "https://unikart-inventory.vercel.app"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ["*"]
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return ["*"]
    
    # Business Rules (India GST & Currency)
    CURRENCY: str = "INR"
    DEFAULT_GST_RATE_PERCENT: float = 18.0  # Electronics standard GST in India (18%)
    STORE_NAME: str = "Unikart Electronics Pvt Ltd"
    STORE_GSTIN: str = "29AAACU9876K1Z8"
    STORE_ADDRESS: str = "Unikart Plaza, Brigade Road, Bangalore, Karnataka - 560001"
    STORE_STATE_CODE: str = "29" # Karnataka
    
    # Payment Gateway
    PAYMENT_GATEWAY_KEY: Optional[str] = os.getenv("PAYMENT_GATEWAY_KEY", None)
    PAYMENT_GATEWAY_SECRET: Optional[str] = os.getenv("PAYMENT_GATEWAY_SECRET", None)
    PAYMENT_WEBHOOK_SECRET: Optional[str] = os.getenv("PAYMENT_WEBHOOK_SECRET", None)

    class Config:
        case_sensitive = True
        _backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        env_file = os.path.join(_backend_dir, ".env")
        extra = "allow"

settings = Settings()

if settings.ENVIRONMENT.lower() == "production":
    _insecure_defaults = {
        "unikart-super-secure-production-secret-key-at-least-32-chars-long-2026",
        "secret",
        "changeme",
        "your-secret-key",
    }
    if not settings.SECRET_KEY or settings.SECRET_KEY in _insecure_defaults or len(settings.SECRET_KEY) < 32:
        raise RuntimeError("Insecure SECRET_KEY detected in production environment! Set a strong random SECRET_KEY (>= 32 chars).")

