import os
import logging
import asyncio
import smtplib
import json
import urllib.request
import urllib.error
from email.message import EmailMessage
from typing import List, Optional

logger = logging.getLogger("email_service")

# Gmail SMTP Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "hirematex@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "dcpqtclfsxiolloh")
SMTP_FROM = os.getenv("SMTP_FROM", f"UNIKART <{SMTP_USER}>")

# Vercel HTTPS Email Relay Configuration (Bypasses Render outbound SMTP port blocking)
VERCEL_EMAIL_RELAY_URL = os.getenv("VERCEL_EMAIL_RELAY_URL", "https://unikart-in.vercel.app/api/send-email")
EMAIL_RELAY_SECRET = os.getenv("EMAIL_RELAY_SECRET", "unikart-relay-sec-2026")

def _send_smtp_sync(to_email: str, subject: str, html_content: str) -> bool:
    """
    Synchronous dispatch:
    1. First attempts HTTPS relay via Vercel (bypasses Render cloud firewall port blocking).
    2. Falls back to direct Gmail SMTP SSL on port 465.
    """
    # 1. Try Vercel HTTPS Relay (Never blocked by Render free tier)
    if VERCEL_EMAIL_RELAY_URL:
        try:
            payload = json.dumps({
                "to": to_email,
                "subject": subject,
                "html": html_content,
                "secret": EMAIL_RELAY_SECRET
            }).encode("utf-8")
            req = urllib.request.Request(
                VERCEL_EMAIL_RELAY_URL,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "x-relay-secret": EMAIL_RELAY_SECRET,
                    "User-Agent": "UNIKART-FastAPI-Backend/1.0"
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    if resp_data.get("success"):
                        logger.info(f"Email successfully delivered to {to_email} via Vercel HTTPS Relay.")
                        return True
        except Exception as e:
            logger.warning(f"Vercel HTTPS relay dispatch notice: {e} (Attempting direct SMTP fallback)")

    # 2. Fallback to direct Gmail SMTP SSL (Used when running locally or on unblocked networks)
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Email not sent.")
        return False

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        msg.set_content("Please view this email with an HTML-compatible client.")
        msg.add_alternative(html_content, subtype="html")

        clean_pass = SMTP_PASSWORD.replace(" ", "")
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.login(SMTP_USER, clean_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(SMTP_USER, clean_pass)
                server.send_message(msg)

        logger.info(f"Email successfully delivered to {to_email} via direct Gmail SMTP.")
        return True
    except Exception as e:
        logger.error(f"Direct Gmail SMTP dispatch failed for {to_email}: {e}")
        return False

async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Asynchronously dispatches email via Gmail SMTP without blocking the FastAPI event loop.
    """
    return await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content)


def get_password_reset_otp_html(otp_code: str, user_name: str = "Customer") -> str:
    """
    Renders clean, modern e-commerce styled HTML template for password reset OTP.
    """
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UNIKART - Password Reset Verification</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- E-Commerce Header with UNIKART Logo -->
    <tr>
      <td style="padding: 28px 32px 20px; border-bottom: 1px solid #f1f5f9; text-align: left;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #E31837; font-family: Arial, sans-serif;">UNI<span style="color: #0f172a;">KART</span></span>
              <span style="display: block; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Your Everyday Marketplace</span>
            </td>
            <td style="text-align: right;">
              <span style="display: inline-block; background-color: #fef2f2; color: #E31837; border: 1px solid #fee2e2; border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 700;">Account Help</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 32px 24px;">
        <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
          Reset Your Password
        </h2>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
          Hi <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
          We received a request to reset the password for your UNIKART account. Enter this one-time verification code to continue:
        </p>

        <!-- Clean E-Commerce OTP Display Box -->
        <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 24px 20px; text-align: center; margin: 24px 0;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">
            One-Time Password (OTP)
          </div>
          <div style="font-size: 40px; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; font-weight: 900; letter-spacing: 12px; color: #E31837; margin: 4px 0 8px; text-indent: 12px;">
            {otp_code}
          </div>
          <div style="font-size: 12px; color: #64748b; font-weight: 500;">
            ⏳ Valid for <strong style="color: #0f172a;">15 minutes</strong> &bull; Do not share this code
          </div>
        </div>

        <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.6; color: #64748b;">
          If you did not request a password reset, no further action is needed. Your account remains completely secure.
        </p>
      </td>
    </tr>

    <!-- Trust Highlights Bar -->
    <tr>
      <td style="padding: 0 32px 28px;">
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px 16px; border: 1px solid #edf2f7;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 11.5px; color: #64748b; font-weight: 600;">
            <tr>
              <td style="text-align: center;">⚡ Lightning Fast</td>
              <td style="text-align: center;">&bull;</td>
              <td style="text-align: center;">🛡️ 100% Buyer Protection</td>
              <td style="text-align: center;">&bull;</td>
              <td style="text-align: center;">💬 24/7 Support</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 32px; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #475569;">
          Questions? We're here to help &bull; <a href="mailto:support@unikart.in" style="color: #E31837; text-decoration: none;">support@unikart.in</a>
        </p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          &copy; 2026 UNIKART Retail Technologies Pvt Ltd. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>"""

def send_password_reset_otp_email_sync(to_email: str, otp_code: str, user_name: str = "Customer") -> bool:
    """
    Synchronously dispatches password reset OTP email to the user's specific email address.
    """
    logger.info(f"[PASSWORD RESET OTP] Sending OTP {otp_code} directly to user recipient: {to_email}")
    html = get_password_reset_otp_html(otp_code, user_name)
    return _send_smtp_sync(to_email, f"UNIKART Password Reset Code: {otp_code}", html)

async def send_password_reset_otp_email(to_email: str, otp_code: str, user_name: str = "Customer") -> bool:
    """
    Asynchronous wrapper for password reset OTP dispatch.
    """
    return await asyncio.to_thread(send_password_reset_otp_email_sync, to_email, otp_code, user_name)

def get_order_confirmation_html(
    customer_name: str,
    order_number: str,
    invoice_number: str,
    total_amount_paise: int,
    handover_otp: str,
    items: List[dict]
) -> str:
    """
    Renders clean, attractive e-commerce HTML invoice & receipt for an order.
    """
    total_inr = f"₹{total_amount_paise / 100:,.2f}"

    items_html = "".join([
        f"""<tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #0f172a; font-weight: 600;">{item.get('product_name') or item.get('name', 'Product')}</td>
            <td style="padding: 12px 10px; text-align: center; color: #64748b; font-weight: 600;">{item.get('quantity', 1)}</td>
            <td style="padding: 12px 10px; text-align: right; color: #0f172a; font-weight: 700;">₹{(item.get('total_paise') or (item.get('unit_price_paise', item.get('price_paise', 0)) * item.get('quantity', 1))) / 100:,.2f}</td>
        </tr>"""
        for item in items
    ])

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UNIKART - Order Confirmation #{order_number}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Brand Header & Order Status Badge -->
    <tr>
      <td style="padding: 28px 32px 20px; border-bottom: 1px solid #f1f5f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #E31837; font-family: Arial, sans-serif;">UNI<span style="color: #0f172a;">KART</span></span>
              <span style="display: block; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Order Receipt & Tax Invoice</span>
            </td>
            <td style="text-align: right;">
              <span style="display: inline-block; background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 20px; padding: 5px 14px; font-size: 11.5px; font-weight: 800;">✓ Confirmed</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Greeting & Order Intro -->
    <tr>
      <td style="padding: 28px 32px 20px;">
        <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
          Thank You For Your Order!
        </h2>
        <p style="margin: 0 0 12px; font-size: 14px; color: #475569; line-height: 1.6;">
          Hi <strong>{customer_name}</strong>, your order <strong>#{order_number}</strong> has been placed and forwarded to our fulfillment hub.
        </p>

        <!-- Delivery Handover Secret PIN Card -->
        <div style="background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%); border: 1.5px dashed #f87171; border-radius: 16px; padding: 20px 24px; text-align: center; margin: 24px 0;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #b91c1c; margin-bottom: 6px;">
            📦 Doorstep Delivery Handover PIN
          </div>
          <div style="font-size: 34px; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, monospace; font-weight: 900; letter-spacing: 10px; color: #b91c1c; margin: 4px 0 6px; text-indent: 10px;">
            {handover_otp}
          </div>
          <div style="font-size: 12px; color: #7f1d1d; font-weight: 500;">
            Share this secret PIN with the delivery courier <strong>only after inspecting your parcel</strong>.
          </div>
        </div>

        <!-- Order Summary & Items Table -->
        <div style="margin: 24px 0 16px;">
          <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin-bottom: 12px;">
            Order Items
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 10px 12px; text-align: left; font-weight: 700; color: #64748b; font-size: 11px; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 12px; text-align: center; font-weight: 700; color: #64748b; font-size: 11px; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #64748b; font-size: 11px; text-transform: uppercase;">Price</th>
              </tr>
            </thead>
            <tbody>
              {items_html}
            </tbody>
          </table>
        </div>

        <!-- Total Paid Highlight -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; border-top: 2px solid #0f172a; padding-top: 12px;">
          <tr>
            <td style="font-size: 14px; font-weight: 800; color: #0f172a; padding: 6px 0;">Total Paid (Incl. GST):</td>
            <td style="font-size: 20px; font-weight: 900; color: #E31837; text-align: right; padding: 6px 0;">{total_inr}</td>
          </tr>
        </table>
        
        <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">
          Invoice: <strong style="color: #64748b;">{invoice_number}</strong> &bull; Payment Status: <strong style="color: #059669;">PAID</strong>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 32px; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #475569;">
          Need help with your order? <a href="mailto:support@unikart.in" style="color: #E31837; text-decoration: none;">Contact Customer Support</a>
        </p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          &copy; 2026 UNIKART Retail Technologies Pvt Ltd. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>"""

def send_order_confirmation_email_sync(
    to_email: str,
    customer_name: str,
    order_number: str,
    invoice_number: str,
    total_amount_paise: int,
    handover_otp: str,
    items: List[dict]
) -> bool:
    """
    Synchronously dispatches order confirmation email directly to the customer's email.
    Executes cleanly in FastAPI BackgroundTasks threadpool.
    """
    logger.info(f"[ORDER CONFIRMATION] Sending order confirmation email for {order_number} to recipient: {to_email}")
    html = get_order_confirmation_html(
        customer_name=customer_name,
        order_number=order_number,
        invoice_number=invoice_number,
        total_amount_paise=total_amount_paise,
        handover_otp=handover_otp,
        items=items
    )
    return _send_smtp_sync(to_email, f"Order Confirmed: {order_number} (Handover OTP: {handover_otp})", html)

async def send_order_confirmation_email(
    to_email: str,
    customer_name: str,
    order_number: str,
    invoice_number: str,
    total_amount_paise: int,
    handover_otp: str,
    items: List[dict]
) -> bool:
    """
    Asynchronous wrapper for order confirmation email dispatch.
    """
    return await asyncio.to_thread(
        send_order_confirmation_email_sync,
        to_email,
        customer_name,
        order_number,
        invoice_number,
        total_amount_paise,
        handover_otp,
        items
    )

def send_transactional_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Synchronous helper for background tasks.
    """
    return _send_smtp_sync(to_email, subject, html_content)
