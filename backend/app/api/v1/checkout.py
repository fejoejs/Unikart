import hmac
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.cart import Cart
from app.models.auth import User
from app.models.order import Order
from app.models.customer import Customer
from app.schemas.checkout import (
    CheckoutQuoteRequest, CheckoutQuoteResponse, OrderCreateRequest,
    OrderResponse, TaxBreakdown, PaymentVerifyRequest
)
from app.services.pricing_service import PricingService
from app.services.order_service import OrderService
from app.api.v1.realtime import broadcast_order_created
from app.services.email_service import send_order_confirmation_email, send_order_confirmation_email_sync
from app.api.v1.deps import get_current_user_optional

router = APIRouter(prefix="/checkout", tags=["Checkout"])

@router.post("/quote", response_model=CheckoutQuoteResponse)
def get_checkout_quote(
    quote_in: CheckoutQuoteRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    items_to_price = []
    if quote_in.items:
        items_to_price = quote_in.items
    elif quote_in.session_token:
        cart = db.query(Cart).filter(Cart.session_token == quote_in.session_token).first()
        if cart:
            items_to_price = [{"variant_id": it.variant_id, "quantity": it.quantity} for it in cart.items]
    elif user:
        cust = db.query(Customer).filter((Customer.user_id == user.id) | (Customer.email == user.email)).first()
        if cust:
            cart = db.query(Cart).filter(Cart.customer_id == cust.id).first()
            if cart:
                items_to_price = [{"variant_id": it.variant_id, "quantity": it.quantity} for it in cart.items]

    if not items_to_price:
        raise HTTPException(status_code=400, detail="Cannot generate checkout quote for an empty cart.")

    try:
        pricing = PricingService.calculate_cart_or_order_pricing(
            db=db,
            items_requested=items_to_price,
            destination_state_code=quote_in.shipping_address.state_code,
            coupon_code=quote_in.coupon_code,
            delivery_option=quote_in.delivery_option or "standard"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    tax_breakdown = TaxBreakdown(
        is_interstate=pricing["is_interstate"],
        cgst_rate=9.0 if not pricing["is_interstate"] else 0.0,
        cgst_paise=pricing["cgst_paise"],
        sgst_rate=9.0 if not pricing["is_interstate"] else 0.0,
        sgst_paise=pricing["sgst_paise"],
        igst_rate=18.0 if pricing["is_interstate"] else 0.0,
        igst_paise=pricing["igst_paise"],
        total_tax_paise=pricing["total_tax_paise"]
    )

    return CheckoutQuoteResponse(
        subtotal_paise=pricing["subtotal_paise"],
        discount_paise=pricing["discount_paise"],
        shipping_fee_paise=pricing["shipping_fee_paise"],
        tax=tax_breakdown,
        total_amount_paise=pricing["total_amount_paise"],
        currency="INR",
        coupon_applied=pricing["coupon_applied"],
        item_count=len(pricing["items"]),
        can_proceed=True,
        validation_messages=[]
    )

@router.post("/order", response_model=OrderResponse)
def place_order(
    order_in: OrderCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    # 0. Early Idempotency Check (prevent empty-cart error on duplicate click/network retry)
    if order_in.idempotency_key and order_in.idempotency_key.strip():
        existing_order = db.query(Order).filter(Order.idempotency_key == order_in.idempotency_key.strip()).first()
        if existing_order:
            return existing_order

    items_to_order = []
    if order_in.items:
        items_to_order = order_in.items
    elif order_in.session_token:
        cart = db.query(Cart).filter(Cart.session_token == order_in.session_token).first()
        if cart:
            items_to_order = [{"variant_id": it.variant_id, "quantity": it.quantity} for it in cart.items]
    elif user:
        cust = db.query(Customer).filter((Customer.user_id == user.id) | (Customer.email == user.email)).first()
        if cust:
            cart = db.query(Cart).filter(Cart.customer_id == cust.id).first()
            if cart:
                items_to_order = [{"variant_id": it.variant_id, "quantity": it.quantity} for it in cart.items]

    if not items_to_order:
        raise HTTPException(status_code=400, detail="Cannot place order with no items.")

    method_clean = (order_in.payment_method or "").strip().upper()
    if method_clean in ["CARD", "UPI", "NET_BANKING"]:
        raise HTTPException(
            status_code=400,
            detail="Online payment gateway (Card/UPI/NetBanking) is temporarily paused for scheduled provider maintenance. Please choose Cash on Delivery (COD)."
        )

    customer_id = None
    if user:
        cust = user.customer if hasattr(user, "customer") and user.customer else db.query(Customer).filter((Customer.user_id == user.id) | (Customer.email == user.email)).first()
        if cust:
            customer_id = cust.id

    try:
        order = OrderService.create_online_order(
            db=db,
            items_requested=items_to_order,
            shipping_address=order_in.shipping_address.dict(),
            billing_address=order_in.billing_address.dict() if order_in.billing_address else None,
            payment_method=order_in.payment_method,
            idempotency_key=order_in.idempotency_key,
            customer_id=customer_id,
            coupon_code=order_in.coupon_code,
            notes=order_in.notes,
            delivery_option=order_in.delivery_option or "standard"
        )

        # Clear cart if session_token or user was provided
        if order_in.session_token:
            cart = db.query(Cart).filter(Cart.session_token == order_in.session_token).first()
            if cart:
                cart.items = []
                db.commit()
        elif user and customer_id:
            cart = db.query(Cart).filter(Cart.customer_id == customer_id).first()
            if cart:
                cart.items = []
                db.commit()

        # Real-time SSE Live Event Broadcast
        try:
            broadcast_order_created(
                order_number=order.order_number,
                channel="ONLINE",
                total_amount_paise=order.total_amount_paise,
                items_count=len(order.items) if hasattr(order, "items") and order.items else 1
            )
        except Exception:
            pass

        # Transactional GST Order Confirmation Email — Dispatched to customer's email address
        cust_email = user.email if user else None
        if not cust_email and order.customer and order.customer.email:
            cust_email = order.customer.email
        if cust_email:
            cust_name = order_in.shipping_address.recipient_name or (user.full_name if user else "Customer")
            background_tasks.add_task(
                send_order_confirmation_email_sync,
                to_email=cust_email.strip().lower(),
                customer_name=cust_name,
                order_number=order.order_number,
                invoice_number=order.invoice_number or f"INV-{order.order_number}",
                total_amount_paise=order.total_amount_paise,
                handover_otp=getattr(order, "_raw_delivery_otp", None) or "Dispatched upon courier allocation",
                items=[{
                    "product_name": it.product_name,
                    "variant_name": it.variant_name,
                    "quantity": it.quantity,
                    "unit_price_paise": it.unit_price_paise,
                    "total_paise": it.total_paise
                } for it in order.items]
            )

        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to place order: {str(e)}")

@router.post("/verify-payment")
def verify_payment_signature(
    verify_in: PaymentVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Verifies payment gateway cryptographic signature (HMAC SHA-256).
    Upon successful signature validation, commits reserved stock to completed sale.
    Security Rules:
    - Never bypass signature verification for any caller.
    - If gateway secret is unconfigured, reject request (503).
    - If signature, order_id, or payment_id is missing or invalid, reject (400).
    - Timing-safe constant-time comparison prevents timing attacks.
    - Idempotent: Already paid orders return status ALREADY_PAID without duplicate state transition.
    """
    order = db.query(Order).filter(Order.order_number == verify_in.order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order '{verify_in.order_number}' not found.")

    if order.order_status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Cannot verify payment for a cancelled order.")

    if order.payment_status == "PAID":
        return {"success": True, "status": "ALREADY_PAID", "order_number": order.order_number}

    secret = settings.PAYMENT_GATEWAY_SECRET
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment gateway verification is unavailable. PAYMENT_GATEWAY_SECRET is not configured on the server."
        )

    if not (verify_in.razorpay_order_id and verify_in.razorpay_payment_id and verify_in.razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required payment gateway verification parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature)."
        )

    # Verify payment belongs to specified order if order was initiated with provider order ID
    from app.models.order import Payment
    existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if existing_payment and existing_payment.provider_order_id:
        if existing_payment.provider_order_id != verify_in.razorpay_order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider order ID does not match the payment registered for this order."
            )

    # Canonical HMAC-SHA256 payload mandated by Razorpay/UPI gateway specification
    message = f"{verify_in.razorpay_order_id}|{verify_in.razorpay_payment_id}".encode("utf-8")
    expected_sig = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_sig, verify_in.razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment signature verification failed. Untrusted or forged payment credentials."
        )

    # Authorize payment and commit sale reservation
    updated_order = OrderService.confirm_payment_and_commit_sale(
        db=db,
        order=order,
        payment_reference=verify_in.razorpay_payment_id
    )

    return {
        "success": True,
        "status": "PAID",
        "order_number": updated_order.order_number,
        "payment_status": updated_order.payment_status,
        "fulfilment_status": updated_order.fulfilment_status
    }

@router.post("/webhook")
async def payment_gateway_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Asynchronous payment provider webhook listener with mandatory signature verification.
    Strictly verifies payload HMAC, matches amount and currency against order,
    and protects against double-processing.
    """
    webhook_secret = settings.PAYMENT_WEBHOOK_SECRET
    if not webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment gateway webhook listener is disabled. PAYMENT_WEBHOOK_SECRET is not configured."
        )

    sig_header = request.headers.get("X-Razorpay-Signature") or request.headers.get("X-Webhook-Signature")
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing webhook signature header (X-Razorpay-Signature)."
        )

    body = await request.body()
    expected_sig = hmac.new(webhook_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, sig_header):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature.")

    try:
        import json
        data = json.loads(body.decode("utf-8"))
        event = data.get("event")
        payload = data.get("payload", {})

        if event in ["payment.captured", "order.paid"]:
            payment_entity = payload.get("payment", {}).get("entity", {})
            provider_order_id = payment_entity.get("order_id")
            payment_amount_paise = payment_entity.get("amount")
            payment_currency = payment_entity.get("currency", "INR")
            notes = payment_entity.get("notes", {})
            order_number = notes.get("order_number")

            order = None
            if order_number:
                order = db.query(Order).filter(Order.order_number == order_number).first()
            if not order and provider_order_id:
                from app.models.order import Payment
                pm = db.query(Payment).filter(Payment.provider_order_id == provider_order_id).first()
                if pm:
                    order = pm.order

            if not order:
                raise HTTPException(status_code=404, detail="Order referenced in payment webhook payload was not found.")

            # Validate currency matches
            if payment_currency and payment_currency.upper() != (order.currency or "INR").upper():
                raise HTTPException(status_code=400, detail="Currency mismatch in payment webhook.")

            # Validate amount is mandatory and matches order total in paise
            if payment_amount_paise is None:
                raise HTTPException(status_code=400, detail="Payment amount is required in webhook payload.")
            if int(payment_amount_paise) != int(order.total_amount_paise):
                raise HTTPException(status_code=400, detail="Payment amount mismatch between webhook and order total.")

            # Idempotency check: Repeated webhook requests cannot process payment twice
            if order.payment_status == "PAID":
                return {"status": "already_processed", "order_number": order.order_number}

            OrderService.confirm_payment_and_commit_sale(
                db=db,
                order=order,
                payment_reference=payment_entity.get("id")
            )

        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing error: {str(e)}")
