"""
Re-export email_service functions for compatibility.
"""
from app.services.email_service import (
    send_email,
    send_order_confirmation_email,
    send_password_reset_otp_email,
    send_password_reset_otp_email_sync,
    send_transactional_email,
)

__all__ = [
    "send_email",
    "send_order_confirmation_email",
    "send_password_reset_otp_email",
    "send_password_reset_otp_email_sync",
    "send_transactional_email",
]
