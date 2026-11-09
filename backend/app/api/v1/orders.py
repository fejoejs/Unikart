import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.order import Order, OrderItem, Return, ReturnItem, WarrantyClaim, Shipment, ShipmentEvent
from app.models.auth import User
from app.models.customer import Customer
from app.schemas.checkout import OrderResponse, ReturnCreate, WarrantyCreate
from app.api.v1.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/orders", tags=["Orders & After-Sale"])

@router.get("", response_model=List[OrderResponse])
@router.get("/my-orders", response_model=List[OrderResponse])
def get_user_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_roles = [r.name for r in current_user.roles] if getattr(current_user, "roles", None) else []
    if any(r in ["admin", "inventory_staff", "manager", "owner"] for r in user_roles):
        return db.query(Order).order_by(Order.created_at.desc()).all()

    customer = current_user.customer if hasattr(current_user, "customer") and current_user.customer else db.query(Customer).filter((Customer.user_id == current_user.id) | (Customer.email == current_user.email)).first()
    if not customer:
        return []
    orders = db.query(Order).filter(Order.customer_id == customer.id).order_by(Order.created_at.desc()).all()
    return orders

@router.get("/{order_id}", response_model=OrderResponse)
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found.")

    if current_user:
        user_roles = [r.name for r in current_user.roles] if getattr(current_user, "roles", None) else []
        is_staff = any(r in ["admin", "inventory_staff", "manager", "owner"] for r in user_roles)
        customer = current_user.customer if hasattr(current_user, "customer") and current_user.customer else db.query(Customer).filter((Customer.user_id == current_user.id) | (Customer.email == current_user.email)).first()
        if not is_staff and (not customer or order.customer_id != customer.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this order.")
    else:
        raise HTTPException(status_code=401, detail="Authentication required to view detailed order information.")
    return order

from pydantic import BaseModel

class OrderStatusUpdateRequest(BaseModel):
    order_status: Optional[str] = None
    fulfilment_status: Optional[str] = None
    payment_status: Optional[str] = None
    delivery_otp: Optional[str] = None

class VerifyDeliveryOtpRequest(BaseModel):
    otp: str

@router.post("/{order_id}/verify-delivery-otp")
@router.post("/{order_id}/verify-delivery")
def verify_delivery_otp(
    order_id: int,
    payload: VerifyDeliveryOtpRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        order = db.query(Order).filter(Order.order_number == str(order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    from app.services.delivery_service import DeliveryVerificationService
    return DeliveryVerificationService.verify_and_deliver(
        db=db,
        order=order,
        provided_otp=payload.otp,
        staff_user=current_user
    )

@router.patch("/{order_id}/status")
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_roles = [r.name for r in current_user.roles] if getattr(current_user, "roles", None) else []
    if not any(r in ["admin", "inventory_staff", "manager", "owner"] for r in user_roles):
        raise HTTPException(status_code=403, detail="Staff permission required to update order status.")

    if payload.payment_status:
        raise HTTPException(
            status_code=400,
            detail="Payment status cannot be modified via generic status update. Use /admin/orders/{id}/override-payment with mandatory audit reason, or verified gateway webhooks."
        )
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Guard: Marking an order DELIVERED must always execute through the central delivery OTP verification service
    new_order_status = payload.order_status.upper() if payload.order_status else None
    new_fulfilment = payload.fulfilment_status.upper() if payload.fulfilment_status else None

    if new_order_status == "DELIVERED" or new_fulfilment == "DELIVERED":
        from app.services.delivery_service import DeliveryVerificationService
        if not payload.delivery_otp:
            raise HTTPException(
                status_code=400,
                detail="Valid customer delivery handover OTP is required to mark order as DELIVERED."
            )
        DeliveryVerificationService.verify_and_deliver(
            db=db,
            order=order,
            provided_otp=payload.delivery_otp,
            staff_user=current_user
        )
        return {
            "success": True,
            "id": order.id,
            "order_number": order.order_number,
            "order_status": order.order_status,
            "fulfilment_status": order.fulfilment_status,
            "payment_status": order.payment_status
        }
    
    if new_order_status:
        order.order_status = new_order_status
    if new_fulfilment:
        order.fulfilment_status = new_fulfilment

        # Update real courier shipment state and record immutable tracking event
        shipment = db.query(Shipment).filter(Shipment.order_id == order.id).first()
        if shipment:
            shipment.status = new_fulfilment
            if new_fulfilment == "DELIVERED":
                shipment.delivered_at = datetime.datetime.utcnow()
            elif new_fulfilment in ["DISPATCHED", "IN_TRANSIT"]:
                shipment.dispatched_at = datetime.datetime.utcnow()

            ship_addr = order.shipping_address if isinstance(order.shipping_address, dict) else {}
            loc = ship_addr.get("city", "Central Hub")
            desc_map = {
                "PROCESSING": "Order sent to warehouse fulfillment queue",
                "PICKED": "Items picked from warehouse racks",
                "PACKED": "Order packaged and tagged with courier shipping label",
                "DISPATCHED": f"Handed over to {shipment.courier_name} (AWB: {shipment.tracking_number})",
                "IN_TRANSIT": f"In transit via {shipment.courier_name} logistics network",
                "OUT_FOR_DELIVERY": "Courier executive assigned and out for delivery",
                "DELIVERED": "Package successfully delivered to recipient"
            }
            db.add(ShipmentEvent(
                shipment_id=shipment.id,
                status=new_fulfilment,
                location=f"{loc} Station",
                description=desc_map.get(new_fulfilment, f"Status updated to {new_fulfilment}"),
                event_timestamp=datetime.datetime.utcnow()
            ))
    
    order.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(order)
    return {
        "success": True,
        "id": order.id,
        "order_number": order.order_number,
        "order_status": order.order_status,
        "fulfilment_status": order.fulfilment_status,
        "payment_status": order.payment_status
    }

@router.get("/track/{identifier}")
def public_order_tracking(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Public live courier and fulfillment tracking lookup by Order Number or Courier Tracking AWB.
    Rejects sequential database IDs to prevent enumeration scraping.
    Only reveals sensitive financial details and itemized breakdown to authenticated owners or staff.
    """
    clean_id = identifier.strip()
    if not clean_id or len(clean_id) < 5:
        raise HTTPException(status_code=400, detail="Invalid tracking identifier.")

    # Match ONLY by authoritative order_number or shipment tracking_number (reject bare integer IDs)
    order = db.query(Order).filter(Order.order_number == clean_id).first()

    shipment = None
    if not order:
        shipment = db.query(Shipment).filter(Shipment.tracking_number == clean_id).first()
        if shipment and shipment.order_id:
            order = db.query(Order).filter(Order.id == shipment.order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail=f"No order or shipment found for tracking identifier '{clean_id}'.")

    if not shipment:
        shipment = db.query(Shipment).filter(Shipment.order_id == order.id).first()

    # Determine payment method label
    payment_method_label = "Prepaid"
    if order.payments and len(order.payments) > 0:
        payment_method_label = order.payments[0].method if hasattr(order.payments[0], "method") else "Prepaid"
    elif order.payment_status == "PENDING":
        payment_method_label = "Cash on Delivery (COD)"
    elif order.payment_status == "PAID":
        payment_method_label = "UPI / Card Online"

    # Determine tracking status code & numeric progress step (1 to 6)
    current_step = 1
    if order.payment_status == "PAID" or (order.fulfilment_status and order.fulfilment_status in ["PROCESSING", "PICKED"]):
        current_step = 2
    if order.fulfilment_status in ["PACKED", "READY_FOR_DISPATCH"]:
        current_step = 3
    if order.fulfilment_status in ["DISPATCHED", "IN_TRANSIT"] or (shipment and shipment.status in ["MANIFESTED", "IN_TRANSIT"]):
        current_step = 4
    if shipment and shipment.status == "OUT_FOR_DELIVERY":
        current_step = 5
    if order.fulfilment_status == "DELIVERED" or (shipment and shipment.status == "DELIVERED"):
        current_step = 6

    # Build chronological milestones strictly using real database timestamps
    created_dt = order.created_at
    updated_dt = order.updated_at or created_dt

    # Map actual shipment events by status
    event_dict = {}
    if shipment:
        db_events = db.query(ShipmentEvent).filter(ShipmentEvent.shipment_id == shipment.id).order_by(ShipmentEvent.event_timestamp.asc()).all()
        for ev in db_events:
            event_dict[ev.status.upper()] = ev.event_timestamp

    pick_packed_ts = event_dict.get("PACKED") or event_dict.get("PROCESSING") or (updated_dt if current_step >= 3 else None)
    courier_handover_ts = event_dict.get("IN_TRANSIT") or event_dict.get("MANIFESTED") or (updated_dt if current_step >= 4 else None)
    out_for_delivery_ts = event_dict.get("OUT_FOR_DELIVERY") or (updated_dt if current_step >= 5 else None)
    delivered_ts = shipment.delivered_at if (shipment and shipment.delivered_at) else (event_dict.get("DELIVERED") or (updated_dt if current_step >= 6 else None))

    milestones = [
        {
            "step": 1,
            "title": "Order Placed & Confirmed",
            "description": f"Order #{order.order_number} confirmed ({payment_method_label})",
            "status": "COMPLETED",
            "timestamp": created_dt.strftime("%d %b %Y, %I:%M %p")
        },
        {
            "step": 2,
            "title": "Payment Authorized",
            "description": "Payment authorization verified" if current_step >= 2 else "Awaiting payment verification",
            "status": "COMPLETED" if current_step >= 2 else ("CURRENT" if current_step == 1 else "PENDING"),
            "timestamp": updated_dt.strftime("%d %b %Y, %I:%M %p") if current_step >= 2 else None
        },
        {
            "step": 3,
            "title": "Warehouse Pick & Pack",
            "description": "Item packaged and prepared for courier handover" if current_step >= 3 else "Pending warehouse fulfillment",
            "status": "COMPLETED" if current_step >= 3 else ("CURRENT" if current_step == 2 else "PENDING"),
            "timestamp": pick_packed_ts.strftime("%d %b %Y, %I:%M %p") if pick_packed_ts and current_step >= 3 else None
        },
        {
            "step": 4,
            "title": f"Courier Handover ({shipment.courier_name if shipment else 'Logistics Partner'})",
            "description": f"AWB: {shipment.tracking_number}" if shipment else "Awaiting carrier dispatch",
            "status": "COMPLETED" if current_step >= 4 else ("CURRENT" if current_step == 3 else "PENDING"),
            "timestamp": courier_handover_ts.strftime("%d %b %Y, %I:%M %p") if courier_handover_ts and current_step >= 4 else None
        },
        {
            "step": 5,
            "title": "Out for Delivery",
            "description": "Out for doorstep delivery" if current_step >= 5 else "Pending transit completion",
            "status": "COMPLETED" if current_step >= 5 else ("CURRENT" if current_step == 4 else "PENDING"),
            "timestamp": out_for_delivery_ts.strftime("%d %b %Y, %I:%M %p") if out_for_delivery_ts and current_step >= 5 else None
        },
        {
            "step": 6,
            "title": "Delivered",
            "description": "Delivered to recipient" if current_step >= 6 else "Pending delivery",
            "status": "COMPLETED" if current_step >= 6 else ("CURRENT" if current_step == 5 else "PENDING"),
            "timestamp": delivered_ts.strftime("%d %b %Y, %I:%M %p") if delivered_ts and current_step >= 6 else None
        }
    ]

    events = []
    if shipment:
        db_events = db.query(ShipmentEvent).filter(ShipmentEvent.shipment_id == shipment.id).order_by(ShipmentEvent.event_timestamp.desc()).all()
        for ev in db_events:
            events.append({
                "status": ev.status,
                "location": ev.location,
                "description": ev.description,
                "timestamp": ev.event_timestamp.strftime("%d %b %Y, %I:%M %p") if ev.event_timestamp else ""
            })

    # Handover OTP & Ownership check
    user_roles = [r.name for r in current_user.roles] if (current_user and getattr(current_user, "roles", None)) else []
    is_staff = any(r in ["admin", "inventory_staff", "manager", "owner"] for r in user_roles)
    customer = (current_user.customer if hasattr(current_user, "customer") and current_user.customer else db.query(Customer).filter(Customer.user_id == current_user.id).first()) if current_user else None
    is_owner = (customer and order.customer_id == customer.id) or is_staff

    stored_otp = getattr(order, "delivery_handover_otp", None)
    handover_otp = stored_otp if is_owner else "••••"

    ship_addr = order.shipping_address if isinstance(order.shipping_address, dict) else {}
    shipping_city = ship_addr.get("city") or "Bengaluru"
    shipping_pincode = (ship_addr.get("postal_code") or ship_addr.get("pincode") or "560001") if is_owner else "******"

    response = {
        "order_number": order.order_number,
        "order_date": created_dt.strftime("%d %B %Y"),
        "order_status": order.order_status,
        "payment_status": order.payment_status,
        "payment_method": payment_method_label,
        "shipping_city": shipping_city,
        "courier_name": shipment.courier_name if shipment else None,
        "tracking_number": shipment.tracking_number if shipment else None,
        "estimated_delivery": (created_dt + datetime.timedelta(days=2)).strftime("%A, %d %B by 7:00 PM") if current_step < 6 else "Delivered",
        "handover_otp": handover_otp,
        "current_step": current_step,
        "fulfilment_status": order.fulfilment_status,
        "milestones": milestones,
        "events": events
    }

    if is_owner:
        response["order_id"] = order.id
        response["total_amount_paise"] = order.total_amount_paise
        response["shipping_pincode"] = ship_addr.get("postal_code") or ship_addr.get("pincode") or "560001"
        response["items"] = [
            {
                "id": it.id,
                "product_name": it.product_name,
                "variant_name": it.variant_name,
                "quantity": it.quantity,
                "unit_price_paise": it.unit_price_paise,
                "image_url": it.variant.product.images[0].url if (it.variant and it.variant.product and it.variant.product.images) else None
            } for it in order.items
        ]

    return response

@router.get("/{order_id}/tracking")
def get_order_tracking(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    user_roles = [r.name for r in current_user.roles] if getattr(current_user, "roles", None) else []
    is_staff = any(r in ["admin", "inventory_staff", "manager", "owner"] for r in user_roles)
    customer = current_user.customer if hasattr(current_user, "customer") and current_user.customer else db.query(Customer).filter((Customer.user_id == current_user.id) | (Customer.email == current_user.email)).first()
    if not is_staff and (not customer or order.customer_id != customer.id):
        raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view tracking for this order.")

    shipment = db.query(Shipment).filter(Shipment.order_id == order.id).first()
    if not shipment:
        return {
            "order_number": order.order_number,
            "status": order.fulfilment_status,
            "shipment": None,
            "events": []
        }

    db_events = db.query(ShipmentEvent).filter(ShipmentEvent.shipment_id == shipment.id).order_by(ShipmentEvent.event_timestamp.desc()).all()
    return {
        "order_number": order.order_number,
        "courier": shipment.courier_name,
        "tracking_number": shipment.tracking_number,
        "status": shipment.status,
        "estimated_delivery": shipment.estimated_delivery,
        "events": [
            {
                "status": ev.status,
                "location": ev.location,
                "description": ev.description,
                "timestamp": ev.event_timestamp.strftime("%d %b %Y, %I:%M %p") if ev.event_timestamp else ""
            } for ev in db_events
        ]
    }

@router.post("/{order_id}/returns")
def request_order_return(
    order_id: int,
    return_in: ReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    user_roles = [r.name for r in current_user.roles] if getattr(current_user, "roles", None) else []
    is_staff = any(r in ["admin", "manager", "owner"] for r in user_roles)
    customer = current_user.customer if hasattr(current_user, "customer") and current_user.customer else db.query(Customer).filter((Customer.user_id == current_user.id) | (Customer.email == current_user.email)).first()
    if not is_staff and (not customer or order.customer_id != customer.id):
        raise HTTPException(status_code=403, detail="You do not have permission to request returns for this order.")

    # 1. Enforce delivered status
    if order.fulfilment_status != "DELIVERED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Returns can only be requested for orders that have been successfully delivered."
        )

    # 2. Enforce 15-day return window from order creation
    if order.created_at and (datetime.datetime.utcnow() - order.created_at).days > 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The 15-day return window for this order has expired."
        )

    if return_in.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Return quantity must be greater than zero."
        )

    item = db.query(OrderItem).filter(OrderItem.id == return_in.order_item_id, OrderItem.order_id == order_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found.")

    # 3. Check already returned or requested quantity
    existing_returns = (
        db.query(func.coalesce(func.sum(ReturnItem.quantity), 0))
        .join(Return, ReturnItem.return_id == Return.id)
        .filter(
            ReturnItem.order_item_id == item.id,
            Return.status.notin_(["REJECTED", "CANCELLED"])
        )
        .scalar()
    ) or 0

    if (existing_returns + return_in.quantity) > item.quantity:
        remaining = max(0, item.quantity - existing_returns)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot return {return_in.quantity} units. Only {remaining} returnable units remain for this item."
        )

    # 4. Calculate pro-rata refund amount (including applicable taxes and item discounts)
    unit_total = (item.total_paise // item.quantity) if (hasattr(item, "total_paise") and item.total_paise and item.quantity > 0) else item.unit_price_paise
    refund_amount_paise = unit_total * return_in.quantity

    # 5. Collision-resistant return identifier
    ret_num = f"RET-{datetime.datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
    return_req = Return(
        return_number=ret_num,
        order_id=order.id,
        status="REQUESTED",
        reason=return_in.reason,
        notes=return_in.notes
    )
    db.add(return_req)
    db.flush()

    ret_item = ReturnItem(
        return_id=return_req.id,
        order_item_id=item.id,
        quantity=return_in.quantity,
        condition="SEALED",
        restock_action="RESTOCK",
        refund_amount_paise=refund_amount_paise
    )
    db.add(ret_item)
    db.commit()

    return {
        "return_number": ret_num,
        "status": "REQUESTED",
        "refund_amount_paise": refund_amount_paise,
        "message": "Return request submitted successfully. Our team will review and approve return pickup."
    }

@router.post("/{order_id}/warranty")
def file_warranty_claim(
    order_id: int,
    warranty_in: WarrantyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    user_roles = [r.name for r in current_user.roles] if getattr(current_user, "roles", None) else []
    is_staff = any(r in ["admin", "manager", "owner"] for r in user_roles)
    customer = current_user.customer if hasattr(current_user, "customer") and current_user.customer else db.query(Customer).filter((Customer.user_id == current_user.id) | (Customer.email == current_user.email)).first()
    if not is_staff and (not customer or order.customer_id != customer.id):
        raise HTTPException(status_code=403, detail="You do not have permission to file warranty claims for this order.")

    item = db.query(OrderItem).filter(OrderItem.id == warranty_in.order_item_id, OrderItem.order_id == order_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found.")

    claim_num = f"WAR-{datetime.datetime.now().year}-{db.query(WarrantyClaim).count() + 101}"
    claim = WarrantyClaim(
        claim_number=claim_num,
        order_item_id=item.id,
        serial_number=warranty_in.serial_number or item.serial_number,
        issue_description=warranty_in.issue_description,
        status="SUBMITTED"
    )
    db.add(claim)
    db.commit()

    return {
        "claim_number": claim_num,
        "status": "SUBMITTED",
        "message": "Warranty claim filed. An authorised service technician will inspect the device."
    }
