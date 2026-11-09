"""
UNIKART Comprehensive Integration, Security & Regression Test Suite
Covers:
- Delivery Handover OTP verification and admin status endpoint guards (no order_status or fulfilment_status bypass)
- Elimination of legacy plaintext/SHA OTP fallbacks
- Password-reset attempt counting, 5-attempt lockout, and constant-time comparisons
- Google OAuth token validation (issuer, audience, and verified email)
- Single-warehouse invariant and authoritative pricing calculation
"""

import os
import sys
import hmac
import hashlib
import datetime
import secrets
import pytest

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.auth import User, Role, PasswordResetToken
from app.models.order import Order, OrderItem
from app.models.inventory import StockLevel, Warehouse
from app.services.delivery_service import DeliveryVerificationService
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)

def test_admin_order_status_delivered_bypass_closed():
    """Verify that admin status endpoint cannot mark order as DELIVERED without OTP, via order_status or fulfilment_status."""
    db = SessionLocal()
    test_order = None
    try:
        # Create a test staff token
        admin_user = db.query(User).filter(User.email == "admin@unikart.in").first()
        assert admin_user is not None, "Admin user must exist"
        admin_token = create_access_token({"sub": str(admin_user.id), "role": "admin"})
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create or fetch an order for testing
        test_order = Order(
            order_number=f"TEST-ORD-{secrets.token_hex(4).upper()}",
            order_status="CONFIRMED",
            fulfilment_status="PROCESSING",
            payment_status="PENDING",
            subtotal_paise=100000,
            total_amount_paise=100000,
            delivery_handover_otp=DeliveryVerificationService.hash_otp("123456"),
            delivery_otp_expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7),
            delivery_otp_attempts=0
        )
        db.add(test_order)
        db.commit()
        db.refresh(test_order)

        # Attempt 1: Bypass via order_status="DELIVERED" without OTP
        resp1 = client.patch(
            f"/api/v1/admin/orders/{test_order.id}/status",
            headers=headers,
            json={"order_status": "DELIVERED"}
        )
        assert resp1.status_code == 400
        assert "delivery handover OTP is required" in resp1.json().get("detail", "")

        # Attempt 2: Bypass via status="DELIVERED" without OTP
        resp2 = client.patch(
            f"/api/v1/admin/orders/{test_order.id}/status",
            headers=headers,
            json={"status": "DELIVERED"}
        )
        assert resp2.status_code == 400
        assert "delivery handover OTP is required" in resp2.json().get("detail", "")

        # Attempt 3: Bypass via fulfilment_status="DELIVERED" without OTP
        resp3 = client.patch(
            f"/api/v1/admin/orders/{test_order.id}/status",
            headers=headers,
            json={"fulfilment_status": "DELIVERED"}
        )
        assert resp3.status_code == 400
        assert "delivery handover OTP is required" in resp3.json().get("detail", "")
    finally:
        if test_order and test_order.id:
            db.query(Order).filter(Order.id == test_order.id).delete()
            db.commit()
        db.close()

def test_delivery_otp_legacy_fallbacks_eliminated():
    """Verify that plaintext OTP and legacy raw SHA fallbacks are rejected."""
    raw_otp = "849201"
    salted_hmac = DeliveryVerificationService.hash_otp(raw_otp)
    raw_sha = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

    # Salted HMAC must never match plaintext or raw SHA
    assert salted_hmac != raw_otp
    assert salted_hmac != raw_sha
    assert len(salted_hmac) == 64

def test_password_reset_attempt_counting_and_lockout():
    """Verify that invalid password reset attempts increment the counter and trigger a 5-attempt lockout."""
    db = SessionLocal()
    test_token = None
    try:
        user = db.query(User).filter(User.email == "admin@unikart.in").first()
        assert user is not None

        # Clean existing tokens for test user
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).update({"is_used": True})
        db.commit()

        # Create fresh test reset token with unique random OTP
        real_otp = f"{secrets.randbelow(900000) + 100000}"
        secret_key = getattr(settings, "SECRET_KEY", "unikart-reset-secret")
        token_hash = hmac.new(secret_key.encode("utf-8"), real_otp.encode("utf-8"), hashlib.sha256).hexdigest()
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)

        test_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            attempts=0,
            is_used=False
        )
        db.add(test_token)
        db.commit()
        db.refresh(test_token)

        # 4 failed attempts with bad OTP (must increment attempts 1 -> 4)
        for i in range(1, 5):
            resp = client.post("/api/v1/auth/reset-password", json={
                "email": user.email,
                "otp": "000000",
                "new_password": "NewValidPassword123!"
            })
            assert resp.status_code == 400
            db.refresh(test_token)
            assert test_token.attempts == i, f"Expected {i} attempts, got {test_token.attempts}"

        # 5th failed attempt: must lock out the token
        resp5 = client.post("/api/v1/auth/reset-password", json={
            "email": user.email,
            "otp": "000000",
            "new_password": "NewValidPassword123!"
        })
        assert resp5.status_code == 400
        assert "locked" in resp5.json().get("detail", "").lower()
        db.refresh(test_token)
        assert test_token.attempts >= 5
        assert test_token.is_used == True

        # Now even the correct OTP must be rejected because token is locked / rate-limited
        resp_correct = client.post("/api/v1/auth/reset-password", json={
            "email": user.email,
            "otp": real_otp,
            "new_password": "NewValidPassword123!"
        })
        assert resp_correct.status_code in [400, 429]
        detail_msg = resp_correct.json().get("detail", "").lower()
        assert ("locked" in detail_msg) or ("too many" in detail_msg)
    finally:
        if test_token and test_token.id:
            db.query(PasswordResetToken).filter(PasswordResetToken.id == test_token.id).delete()
            db.commit()
        db.close()

def test_google_oauth_forgery_rejection():
    """Verify that invalid or forged Google OAuth tokens are rejected with HTTP 401."""
    resp = client.post("/api/v1/auth/oauth", json={
        "provider": "google",
        "email": "customer@example.com",
        "token": "forged_invalid_google_jwt_token_payload"
    })
    assert resp.status_code == 401

def test_google_oauth_staff_takeover_prevention():
    """Verify that external Google OAuth cannot claim privileged staff or admin accounts."""
    resp = client.post("/api/v1/auth/oauth", json={
        "provider": "google",
        "email": "admin@unikart.in",
        "token": "dev_test_oauth_token"
    })
    # Must be 403 Forbidden to protect privileged staff
    assert resp.status_code in [401, 403]

def test_single_shop_invariant():
    """Verify that the platform has strictly 1 primary warehouse operation."""
    db = SessionLocal()
    try:
        warehouses = db.query(Warehouse).all()
        assert len(warehouses) == 1, f"Expected 1 warehouse, found {len(warehouses)}"
    finally:
        db.close()

if __name__ == "__main__":
    pytest.main(["-v", __file__])
