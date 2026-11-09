import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    invoice_number = Column(String(50), unique=True, index=True, nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    channel = Column(String(20), default="ONLINE", nullable=False)  # ONLINE, POS
    
    order_status = Column(String(30), default="CREATED", nullable=False, index=True) # CREATED, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
    payment_status = Column(String(30), default="PENDING", nullable=False, index=True) # PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED
    fulfilment_status = Column(String(30), default="UNFULFILLED", nullable=False, index=True) # UNFULFILLED, PROCESSING, SHIPPED, DELIVERED, RETURNED

    currency = Column(String(3), default="INR", nullable=False)
    
    subtotal_paise = Column(Integer, nullable=False)
    discount_paise = Column(Integer, default=0, nullable=False)
    tax_paise = Column(Integer, default=0, nullable=False)
    cgst_paise = Column(Integer, default=0, nullable=False)
    sgst_paise = Column(Integer, default=0, nullable=False)
    igst_paise = Column(Integer, default=0, nullable=False)
    shipping_fee_paise = Column(Integer, default=0, nullable=False)
    total_amount_paise = Column(Integer, nullable=False)
    
    shipping_address = Column(JSON, nullable=True)
    billing_address = Column(JSON, nullable=True)
    coupon_code = Column(String(50), nullable=True)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=True)
    notes = Column(Text, nullable=True)
    delivery_handover_otp = Column(String(128), nullable=True)
    delivery_otp_expires_at = Column(DateTime, nullable=True)
    delivery_otp_attempts = Column(Integer, default=0, nullable=False)
    delivery_verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="joined")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan", lazy="joined")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    product_name = Column(String(255), nullable=False)
    variant_name = Column(String(255), nullable=False)
    sku = Column(String(50), nullable=False)
    hsn_code = Column(String(20), nullable=False)
    
    unit_price_paise = Column(Integer, nullable=False)
    unit_cost_paise = Column(Integer, default=0, nullable=False)
    quantity = Column(Integer, nullable=False)
    discount_paise = Column(Integer, default=0, nullable=False)
    
    tax_rate = Column(Float, default=18.0, nullable=False)
    tax_paise = Column(Integer, default=0, nullable=False)
    cgst_paise = Column(Integer, default=0, nullable=False)
    sgst_paise = Column(Integer, default=0, nullable=False)
    igst_paise = Column(Integer, default=0, nullable=False)
    
    total_paise = Column(Integer, nullable=False)
    serial_number = Column(String(100), nullable=True)

    order = relationship("Order", back_populates="items")
    variant = relationship("ProductVariant")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_paise = Column(Integer, nullable=False)
    method = Column(String(30), nullable=False)  # UPI, CARD, NET_BANKING, CASH, SPLIT
    provider = Column(String(50), default="RAZORPAY", nullable=False)
    provider_payment_id = Column(String(150), unique=True, index=True, nullable=True)
    provider_order_id = Column(String(150), index=True, nullable=True)
    status = Column(String(30), default="INITIATED", nullable=False, index=True)
    idempotency_key = Column(String(100), unique=True, nullable=True)
    payment_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="payments")

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    payment_id = Column(Integer, nullable=True)
    order_id = Column(Integer, nullable=True)
    amount_paise = Column(Integer, default=0)
    reason = Column(String(255), default="")
    provider_refund_id = Column(String(150), nullable=True)
    status = Column(String(30), default="PROCESSED")
    approved_by_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Return(Base):
    __tablename__ = "returns"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    return_number = Column(String(50), default="RET-01")
    order_id = Column(Integer, nullable=True)
    status = Column(String(30), default="REQUESTED")
    reason = Column(String(255), default="")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ReturnItem(Base):
    __tablename__ = "return_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    return_id = Column(Integer, nullable=True)
    order_item_id = Column(Integer, nullable=True)
    quantity = Column(Integer, default=1)
    condition = Column(String(50), default="SEALED")
    restock_action = Column(String(50), default="RESTOCK")
    refund_amount_paise = Column(Integer, default=0)

class WarrantyClaim(Base):
    __tablename__ = "warranty_claims"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    claim_number = Column(String(50), default="CLM-01")
    order_item_id = Column(Integer, nullable=True)
    serial_number = Column(String(100), nullable=True)
    vendor_name = Column(String(100), nullable=True)
    rma_number = Column(String(50), nullable=True)
    vendor_tracking_number = Column(String(100), nullable=True)
    issue_description = Column(Text, default="")
    status = Column(String(30), default="SUBMITTED")
    resolution_notes = Column(Text, nullable=True)
    claimed_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, nullable=True)
    tracking_number = Column(String(100), default="TRK-01")
    courier_name = Column(String(100), default="BlueDart Express")
    status = Column(String(50), default="MANIFESTED")
    estimated_delivery = Column(DateTime, nullable=True)
    dispatched_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ShipmentEvent(Base):
    __tablename__ = "shipment_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    shipment_id = Column(Integer, nullable=True)
    status = Column(String(50), default="")
    location = Column(String(100), default="")
    description = Column(String(255), default="")
    event_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
