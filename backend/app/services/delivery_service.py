import hmac
import hashlib
import datetime
import secrets
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.order import Order, Shipment, ShipmentEvent
from app.models.auth import User
from app.services.inventory_service import InventoryService

STAFF_ROLES = {"admin", "inventory_staff", "manager", "owner", "delivery"}

class DeliveryVerificationService:
    @staticmethod
    def hash_otp(otp: str) -> str:
        secret = getattr(settings, "SECRET_KEY", "unikart-fallback-secret-salt")
        return hmac.new(secret.encode("utf-8"), otp.strip().encode("utf-8"), hashlib.sha256).hexdigest()

    @staticmethod
    def generate_delivery_otp(expiry_days: int = 7) -> Tuple[str, str, datetime.datetime]:
        """Generates a 6-digit numeric OTP, returns (plain_otp, otp_hash, expires_at)."""
        raw_otp = f"{secrets.randbelow(900000) + 100000}"
        otp_hash = DeliveryVerificationService.hash_otp(raw_otp)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=expiry_days)
        return raw_otp, otp_hash, expires_at

    @staticmethod
    def verify_and_deliver(
        db: Session,
        order: Order,
        provided_otp: str,
        staff_user: User
    ) -> dict:
        """
        Centrally verifies delivery OTP and atomically confirms delivery + inventory commitment.
        Enforces strict role checks, rate limiting, expiry, and zero order-number fallbacks.
        """
        # 1. Staff Authorization Check
        user_roles = {r.name for r in staff_user.roles} if getattr(staff_user, "roles", None) else set()
        if not user_roles.intersection(STAFF_ROLES):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff permission required to verify delivery OTP."
            )

        # 2. Idempotency Check
        if order.fulfilment_status == "DELIVERED":
            return {
                "success": True,
                "message": "Order is already marked as DELIVERED.",
                "order_id": order.id,
                "order_number": order.order_number,
                "fulfilment_status": "DELIVERED",
                "payment_status": order.payment_status
            }

        # 3. Expiry and Attempt Limits
        now = datetime.datetime.utcnow()
        if order.delivery_otp_expires_at and order.delivery_otp_expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Delivery handover OTP has expired. Please contact dispatch supervisor."
            )

        if (order.delivery_otp_attempts or 0) >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Delivery OTP verification locked due to too many failed attempts (5/5). Supervisor override required."
            )

        # 4. Secure Hash Matching (Strict - NO order_number fallback)
        clean_provided = (provided_otp or "").strip()
        if not clean_provided or len(clean_provided) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid delivery handover OTP is required."
            )

        expected_hash = order.delivery_handover_otp
        if not expected_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No delivery OTP is configured for this order. Please contact dispatch supervisor."
            )

        calculated_hmac = DeliveryVerificationService.hash_otp(clean_provided)

        # Strict constant-time HMAC-SHA256 comparison against salted hash
        # Zero plaintext or legacy SHA fallbacks
        is_valid = hmac.compare_digest(calculated_hmac, expected_hash)

        if not is_valid:
            order.delivery_otp_attempts = (order.delivery_otp_attempts or 0) + 1
            order.updated_at = now
            db.commit()
            remaining = max(0, 5 - order.delivery_otp_attempts)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid delivery handover OTP. {remaining} attempt(s) remaining."
            )

        # 5. ATOMIC DELIVERY & INVENTORY COMMIT TRANSACTION
        try:
            # A. Deduct / Commit warehouse inventory reservation
            for it in order.items:
                if it.variant_id and it.quantity > 0:
                    InventoryService.commit_reservation_to_sale(
                        db=db,
                        variant_id=it.variant_id,
                        quantity=it.quantity,
                        warehouse_id=1,
                        reference_id=order.order_number,
                        reference_type="ORDER_SALE",
                        reason=f"Doorstep handover confirmed with OTP for {order.order_number}",
                        user_id=staff_user.id
                    )

            # B. State Transitions
            order.fulfilment_status = "DELIVERED"
            order.order_status = "DELIVERED"
            order.delivery_verified_at = now
            order.updated_at = now

            if order.payments and order.payments[0].method in ["COD", "CASH"]:
                order.payment_status = "PAID"
                order.payments[0].status = "SUCCESS"

            # C. Shipment Event Update
            shipment = db.query(Shipment).filter(Shipment.order_id == order.id).first()
            if shipment:
                shipment.status = "DELIVERED"
                shipment.delivered_at = now
                ship_addr = order.shipping_address if isinstance(order.shipping_address, dict) else {}
                loc = ship_addr.get("city", "Customer Destination")
                db.add(ShipmentEvent(
                    shipment_id=shipment.id,
                    status="DELIVERED",
                    location=f"{loc}",
                    description="Package successfully handed over to customer upon verified delivery OTP",
                    event_timestamp=now
                ))

            db.commit()
            db.refresh(order)

            return {
                "success": True,
                "message": "Delivery OTP verified successfully. Order marked as DELIVERED.",
                "order_id": order.id,
                "order_number": order.order_number,
                "fulfilment_status": "DELIVERED",
                "payment_status": order.payment_status
            }
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to confirm delivery and commit inventory: {str(e)}"
            )
