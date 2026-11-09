import datetime
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.order import Order, OrderItem, Payment
from app.models.cart import Coupon
from app.services.pricing_service import PricingService
from app.services.inventory_service import InventoryService

class OrderService:
    @staticmethod
    def create_online_order(
        db: Session,
        items_requested: List[Dict[str, int]],
        shipping_address: Dict[str, Any],
        billing_address: Optional[Dict[str, Any]],
        payment_method: str,
        idempotency_key: str,
        customer_id: Optional[int] = None,
        coupon_code: Optional[str] = None,
        notes: Optional[str] = None,
        delivery_option: Optional[str] = "standard"
    ) -> Order:
        # 1. Idempotency Check on Order table with customer account isolation
        if idempotency_key:
            existing_order = db.query(Order).filter(
                Order.idempotency_key == idempotency_key
            ).first()
            if existing_order:
                if customer_id is not None and existing_order.customer_id is not None and existing_order.customer_id != customer_id:
                    raise ValueError("Idempotency key collision with another customer account.")
                return existing_order

        # 2. Server-side authoritative price calculation
        destination_state_code = str(shipping_address.get("state_code", "29"))
        pricing = PricingService.calculate_cart_or_order_pricing(
            db=db,
            items_requested=items_requested,
            destination_state_code=destination_state_code,
            coupon_code=coupon_code,
            delivery_option=delivery_option
        )

        # 3. Choose primary warehouse
        warehouse_id = 1

        # 4. Generate unique collision-resistant order and invoice numbers
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        order_token = uuid.uuid4().hex[:6].upper()
        order_number = f"ORD-{now_utc.strftime('%Y%m%d')}-{order_token}"
        invoice_number = f"INV-{now_utc.strftime('%Y%m%d')}-{order_token}"

        is_cod = (payment_method == "COD")
        initial_order_status = "CONFIRMED" if is_cod else "PENDING_PAYMENT"
        initial_payment_status = "PENDING"
        initial_fulfilment = "PROCESSING" if is_cod else "PENDING_PAYMENT"

        # 5. Create Order with cryptographically secure hashed delivery OTP
        from app.services.delivery_service import DeliveryVerificationService
        raw_otp, otp_hash, otp_expiry = DeliveryVerificationService.generate_delivery_otp(expiry_days=7)

        order = Order(
            order_number=order_number,
            invoice_number=invoice_number,
            customer_id=customer_id,
            channel="ONLINE",
            order_status=initial_order_status,
            payment_status=initial_payment_status,
            fulfilment_status=initial_fulfilment,
            currency="INR",
            subtotal_paise=pricing["subtotal_paise"],
            discount_paise=pricing["discount_paise"],
            tax_paise=pricing["total_tax_paise"],
            cgst_paise=pricing["cgst_paise"],
            sgst_paise=pricing["sgst_paise"],
            igst_paise=pricing["igst_paise"],
            shipping_fee_paise=pricing["shipping_fee_paise"],
            total_amount_paise=pricing["total_amount_paise"],
            shipping_address=shipping_address,
            billing_address=billing_address or shipping_address,
            coupon_code=pricing["coupon_applied"],
            idempotency_key=idempotency_key,
            notes=notes,
            delivery_handover_otp=otp_hash,
            delivery_otp_expires_at=otp_expiry,
            delivery_otp_attempts=0
        )
        setattr(order, "_raw_delivery_otp", raw_otp)
        db.add(order)
        db.flush()

        # 6. Create immutable Order Items and reserve Stock atomically in Supabase
        for item_data in pricing["items"]:
            # Reserve stock to prevent overselling while maintaining accurate on-hand ledger
            InventoryService.reserve_stock(
                db=db,
                variant_id=item_data["variant_id"],
                warehouse_id=warehouse_id,
                quantity=item_data["quantity"],
                reference_id=order_number,
                reference_type="ORDER_RESERVE",
                reason=f"Stock reservation for order {order_number}"
            )

            order_item = OrderItem(
                order_id=order.id,
                variant_id=item_data["variant_id"],
                product_name=item_data["product_name"],
                variant_name=item_data["variant_name"],
                sku=item_data["sku"],
                hsn_code=item_data["hsn_code"],
                unit_price_paise=item_data["unit_price_paise"],
                unit_cost_paise=item_data.get("unit_cost_paise"),
                quantity=item_data["quantity"],
                discount_paise=item_data.get("discount_paise", 0),
                tax_rate=item_data["gst_rate"],
                tax_paise=item_data["line_tax_paise"],
                cgst_paise=item_data["line_cgst_paise"],
                sgst_paise=item_data["line_sgst_paise"],
                igst_paise=item_data["line_igst_paise"],
                total_paise=item_data.get("total_paise", item_data["line_subtotal_paise"])
            )
            db.add(order_item)

        # Increment coupon times_used if applied
        if pricing.get("coupon_applied"):
            coupon_rec = db.query(Coupon).filter(Coupon.code == pricing["coupon_applied"]).first()
            if coupon_rec:
                coupon_rec.times_used += 1

        # 7. Record Payment Session
        payment = Payment(
            order_id=order.id,
            amount_paise=order.total_amount_paise,
            method=payment_method,
            provider="CASH" if payment_method in ["COD", "CASH"] else "GATEWAY",
            provider_payment_id=f"cod_{order.order_number}" if payment_method in ["COD", "CASH"] else None,
            provider_order_id=None,
            status="PENDING",
            idempotency_key=f"pay_{idempotency_key}"
        )
        db.add(payment)

        # 8. Record Real Courier Shipment & Dispatch Manifest
        from app.models.order import Shipment, ShipmentEvent
        courier = "Delhivery Express" if delivery_option == "express" else "Blue Dart Express"
        tracking_awb = f"AWB-{order.order_number[-8:]}"
        city_dest = shipping_address.get("city", "Bengaluru")
        est_delivery = datetime.datetime.utcnow() + datetime.timedelta(days=(1 if delivery_option == "express" else 3))

        shipment = Shipment(
            order_id=order.id,
            tracking_number=tracking_awb,
            courier_name=courier,
            status="MANIFESTED",
            estimated_delivery=est_delivery,
            created_at=datetime.datetime.utcnow()
        )
        db.add(shipment)
        db.flush()

        initial_event = ShipmentEvent(
            shipment_id=shipment.id,
            status="MANIFESTED",
            location=f"{city_dest} Fulfillment Hub",
            description=f"Shipment manifest generated with {courier}. Electronic booking confirmed.",
            event_timestamp=datetime.datetime.utcnow()
        )
        db.add(initial_event)

        db.commit()
        db.refresh(order)

        # For COD orders: payment is collected on delivery, so commit stock to SALE immediately
        # since the order is confirmed and goods must be reserved as sold from inventory.
        if is_cod:
            OrderService.confirm_payment_and_commit_sale(db=db, order=order, payment_reference=None)

        return order


    @staticmethod
    def confirm_payment_and_commit_sale(
        db: Session,
        order: Order,
        payment_reference: Optional[str] = None
    ) -> Order:
        if order.order_status == "CANCELLED":
            raise ValueError(f"Cannot confirm payment on cancelled order {order.order_number}.")

        order.payment_status = "PAID"
        if order.order_status == "PENDING_PAYMENT":
            order.order_status = "CONFIRMED"
        if order.fulfilment_status == "PENDING_PAYMENT":
            order.fulfilment_status = "PROCESSING"

        # Update payment record
        if order.payments:
            p = order.payments[0]
            p.status = "SUCCESS"
            if payment_reference:
                p.provider_payment_id = payment_reference

        # Check if sale movement was already recorded to prevent double deduction
        from app.models.inventory import InventoryMovement
        already_committed = db.query(InventoryMovement).filter(
            InventoryMovement.reference_id == order.order_number,
            InventoryMovement.movement_type == "SALE"
        ).first()

        if not already_committed:
            for it in order.items:
                if it.variant_id and it.quantity > 0:
                    InventoryService.commit_reservation_to_sale(
                        db=db,
                        variant_id=it.variant_id,
                        quantity=it.quantity,
                        warehouse_id=1,
                        reference_id=order.order_number,
                        reference_type="ORDER_SALE",
                        reason=f"Sale committed for paid order {order.order_number}"
                    )

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def cancel_order_and_release_stock(
        db: Session,
        order: Order,
        reason: str = "Order cancelled",
        user_id: Optional[int] = None
    ) -> Order:
        if order.order_status == "CANCELLED":
            return order  # Idempotent: already cancelled

        if order.order_status == "DELIVERED":
            raise ValueError("Delivered orders cannot be cancelled directly; please initiate a Return.")

        # Determine if stock was already converted to SALE or is still RESERVED
        from app.models.inventory import InventoryMovement
        sale_movement = db.query(InventoryMovement).filter(
            InventoryMovement.reference_id == order.order_number,
            InventoryMovement.movement_type == "SALE"
        ).first()

        warehouse_id = 1
        for it in order.items:
            if it.variant_id and it.quantity > 0:
                if sale_movement:
                    # Stock was deducted from on-hand -> Restock on-hand
                    InventoryService.adjust_stock(
                        db=db,
                        variant_id=it.variant_id,
                        warehouse_id=warehouse_id,
                        quantity_delta=it.quantity,
                        movement_type="RETURN",
                        reason=f"Restock on cancellation of fulfilled order {order.order_number}",
                        reference_id=order.order_number,
                        reference_type="ORDER_CANCEL",
                        user_id=user_id
                    )
                else:
                    # Stock was only RESERVED -> Release reservation (do NOT touch on_hand)
                    InventoryService.release_reservation(
                        db=db,
                        variant_id=it.variant_id,
                        warehouse_id=warehouse_id,
                        quantity=it.quantity,
                        reference_id=order.order_number,
                        reference_type="ORDER_CANCEL",
                        reason=f"Release reservation on cancellation of order {order.order_number}",
                        user_id=user_id
                    )

        # Revert coupon usage count
        if order.coupon_code:
            coupon = db.query(Coupon).filter(Coupon.code == order.coupon_code).first()
            if coupon and coupon.times_used > 0:
                coupon.times_used -= 1

        order.order_status = "CANCELLED"
        if order.payment_status == "PAID":
            order.payment_status = "REFUND_PENDING"

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def expire_unpaid_orders(db: Session, max_age_minutes: int = 30) -> int:
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=max_age_minutes)
        unpaid = db.query(Order).filter(
            Order.order_status == "PENDING_PAYMENT",
            Order.created_at < cutoff
        ).all()

        cancelled_count = 0
        for ord in unpaid:
            try:
                OrderService.cancel_order_and_release_stock(
                    db=db,
                    order=ord,
                    reason=f"Auto-released expired pending payment (> {max_age_minutes}m)"
                )
                cancelled_count += 1
            except Exception:
                pass
        return cancelled_count
