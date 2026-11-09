import base64
import hashlib
import hmac
import secrets
import struct
import time
from typing import Optional

def generate_totp_secret() -> str:
    """Generate a cryptographically secure 160-bit Base32 secret for standard TOTP."""
    return base64.b32encode(secrets.token_bytes(20)).decode("utf-8")

def generate_totp_code(secret: str, time_step: int = 30, digits: int = 6) -> str:
    """Computes standard RFC 6238 TOTP 6-digit code for the current time window."""
    key = base64.b32decode(secret, casefold=True)
    counter = int(time.time() // time_step)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % (10**digits)
    return str(code).zfill(digits)

def verify_totp_code(secret: Optional[str], code: Optional[str], window: int = 1, time_step: int = 30) -> bool:
    """
    Verifies a 6-digit TOTP code against a Base32 secret using timing-attack resistant comparison.
    window=1 allows +-1 step (30 seconds) clock drift.
    """
    if not secret or not code:
        return False
    clean_code = str(code).strip()
    if not clean_code.isdigit() or len(clean_code) != 6:
        return False
    try:
        key = base64.b32decode(secret, casefold=True)
        now = int(time.time() // time_step)
        for i in range(-window, window + 1):
            msg = struct.pack(">Q", now + i)
            digest = hmac.new(key, msg, hashlib.sha1).digest()
            offset = digest[-1] & 0x0F
            calc_code = str((struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % 1000000).zfill(6)
            if hmac.compare_digest(calc_code, clean_code):
                return True
        return False
    except Exception:
        return False
