import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from app.core.config import settings

def verify_oauth_token(token: Optional[str], expected_email: str) -> Dict[str, Any]:
    """
    Verifies OAuth identity directly with identity provider (Google TokenInfo or Supabase Auth API).
    Validates signature, issuer, expiry, audience, email verification, and returns subject identifier.
    Guarantees that an attacker cannot submit another user's email to gain access.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OAuth token is required for identity verification."
        )

    clean_token = token.strip()
    if clean_token.lower().startswith("bearer "):
        clean_token = clean_token[7:].strip()
    clean_expected = expected_email.strip().lower()

    # 1. Attempt Google OAuth TokenInfo API verification
    google_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={clean_token}"
    try:
        req = urllib.request.Request(google_url, headers={"User-Agent": "Unikart-Backend/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                verified_email = (data.get("email") or "").lower().strip()
                email_verified = data.get("email_verified") in [True, "true", "True", 1]
                issuer = data.get("iss", "")
                sub = data.get("sub", "")

                if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid Google OAuth token issuer."
                    )

                # Validate expected Google OAuth Audience (Client ID)
                google_client_id = getattr(settings, "GOOGLE_CLIENT_ID", None)
                aud = data.get("aud", "")
                if google_client_id and aud != google_client_id:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Google OAuth token audience mismatch: expected '{google_client_id}', received '{aud}'."
                    )

                if not email_verified:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Google account email is not verified."
                    )

                if verified_email != clean_expected:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="OAuth identity mismatch: Verified token email does not match requested email."
                    )

                return {
                    "provider": "google",
                    "subject_id": sub,
                    "email": verified_email,
                    "name": data.get("name")
                }
    except urllib.error.HTTPError:
        pass
    except HTTPException:
        raise
    except Exception:
        pass

    # 2. Attempt Supabase Auth Token verification (when client uses Supabase Google Provider)
    supabase_url = getattr(settings, "SUPABASE_URL", None)
    anon_key = getattr(settings, "SUPABASE_ANON_KEY", None) or getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
    if supabase_url and anon_key:
        sb_user_url = f"{supabase_url.rstrip('/')}/auth/v1/user"
        try:
            req = urllib.request.Request(
                sb_user_url,
                headers={
                    "Authorization": f"Bearer {clean_token}",
                    "apikey": anon_key,
                    "User-Agent": "Unikart-Backend/1.0"
                }
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    verified_email = (data.get("email") or "").lower().strip()
                    sub = data.get("id", "")

                    # Verify that the authenticated identity actually originated from the Google provider
                    app_meta = data.get("app_metadata", {}) or {}
                    identities = data.get("identities", []) or []
                    provider = app_meta.get("provider", "")
                    has_google_identity = (provider == "google") or any(
                        (id_item.get("provider") == "google") for id_item in identities if isinstance(id_item, dict)
                    )
                    if not has_google_identity:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="OAuth identity must be authenticated specifically through the Google provider."
                        )

                    if verified_email != clean_expected:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="OAuth identity mismatch: Verified token email does not match requested email."
                        )

                    return {
                        "provider": "supabase_google",
                        "subject_id": sub,
                        "email": verified_email,
                        "name": data.get("user_metadata", {}).get("full_name") or data.get("user_metadata", {}).get("name")
                    }
        except urllib.error.HTTPError:
            pass
        except HTTPException:
            raise
        except Exception:
            pass

    # 3. Development / Test Token bypass for automated suites
    if getattr(settings, "ENVIRONMENT", "").lower() in ["development", "test", "testing"] and clean_token.startswith("dev_test_oauth_"):
        return {
            "provider": "test_google",
            "subject_id": f"sub_{clean_expected}",
            "email": clean_expected,
            "name": "Dev Verified"
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or unverified OAuth token. Signature and identity could not be verified."
    )
