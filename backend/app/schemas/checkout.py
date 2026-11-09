from typing import List, Optional, Dict, Any
from pydantic import BaseModel, field_validator
import re

class ShippingAddressInput(BaseModel):
    recipient_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    state: str
    state_code: str # e.g. "29" for Karnataka, "32" for Kerala, "27" for Maharashtra
    postal_code: str

    @field_validator("recipient_name")
    def validate_recipient_name(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Recipient name must have at least 2 characters.")
        if v.lower() in ["placeholder", "n/a", "none", "null"]:
            raise ValueError("Please provide a valid recipient name.")
        return v

    @field_validator("phone")
    def validate_phone(cls, v):
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 13:
            raise ValueError("Phone number must contain a valid 10-digit mobile number.")
        return v

    @field_validator("address_line1")
    def validate_address_line1(cls, v):
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Address Line 1 must contain at least 5 characters (building/street details).")
        if v.lower() in ["test", "test address", "asdf", "placeholder", "n/a"]:
            raise ValueError("Please provide a real delivery address.")
        return v

    @field_validator("postal_code")
    def validate_postal_code(cls, v):
        clean = v.strip()
        if not re.match(r"^\d{6}$", clean):
            raise ValueError("Postal PIN code must be exactly 6 numeric digits.")
        return clean

    @field_validator("city", "state")
    def validate_location(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("City and state must be at least 2 characters.")
        return v

class CheckoutQuoteRequest(BaseModel):
    session_token: Optional[str] = None
    items: Optional[List[Dict[str, int]]] = None # [{"variant_id": 1, "quantity": 1}]
    shipping_address: ShippingAddressInput
    coupon_code: Optional[str] = None
    delivery_option: Optional[str] = "standard"

class TaxBreakdown(BaseModel):
    is_interstate: bool # True: IGST, False: CGST + SGST
    cgst_rate: float
    cgst_paise: int
    sgst_rate: float
    sgst_paise: int
    igst_rate: float
    igst_paise: int
    total_tax_paise: int

class CheckoutQuoteResponse(BaseModel):
    subtotal_paise: int
    discount_paise: int
    shipping_fee_paise: int
    tax: TaxBreakdown
    total_amount_paise: int
    currency: str = "INR"
    coupon_applied: Optional[str] = None
    item_count: int
    can_proceed: bool
    validation_messages: List[str] = []

class OrderCreateRequest(BaseModel):
    session_token: Optional[str] = None
    items: Optional[List[Dict[str, int]]] = None
    shipping_address: ShippingAddressInput
    billing_address: Optional[ShippingAddressInput] = None
    coupon_code: Optional[str] = None
    payment_method: str = "UPI" # UPI, CARD, NET_BANKING, CASH
    idempotency_key: str
    notes: Optional[str] = None
    delivery_option: Optional[str] = "standard"

class PaymentVerifyRequest(BaseModel):
    order_number: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None

class OrderItemResponse(BaseModel):
    id: int
    variant_id: int
    product_name: str
    variant_name: str
    sku: str
    hsn_code: str
    unit_price_paise: int
    quantity: int
    discount_paise: int
    tax_rate: float
    tax_paise: int
    cgst_paise: int
    sgst_paise: int
    igst_paise: int
    total_paise: int
    serial_number: Optional[str] = None

    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    amount_paise: int
    method: str
    provider: str
    provider_payment_id: Optional[str] = None
    status: str
    created_at: Any

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    order_number: str
    invoice_number: Optional[str] = None
    customer_id: Optional[int] = None
    channel: str
    order_status: str
    payment_status: str
    fulfilment_status: str
    currency: str
    subtotal_paise: int
    discount_paise: int
    tax_paise: int
    cgst_paise: int
    sgst_paise: int
    igst_paise: int
    shipping_fee_paise: int
    total_amount_paise: int
    shipping_address: Optional[Dict[str, Any]] = None
    billing_address: Optional[Dict[str, Any]] = None
    coupon_code: Optional[str] = None
    created_at: Any
    items: List[OrderItemResponse] = []
    payments: List[PaymentResponse] = []

    class Config:
        from_attributes = True

class ReturnCreate(BaseModel):
    order_item_id: int
    quantity: int = 1
    reason: str
    notes: Optional[str] = None

class WarrantyCreate(BaseModel):
    order_item_id: int
    issue_description: str
    serial_number: Optional[str] = None
