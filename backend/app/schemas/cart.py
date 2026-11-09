from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class CartItemCreate(BaseModel):
    variant_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CouponApplyRequest(BaseModel):
    coupon_code: Optional[str] = None
    code: Optional[str] = None

class CartItemResponse(BaseModel):
    id: int
    variant_id: int
    product_id: Optional[int] = None
    quantity: int
    product_name: str
    variant_name: str
    sku: str
    unit_price_paise: int
    mrp_paise: int
    total_price_paise: int
    line_total_paise: Optional[int] = None
    image_url: Optional[str] = None
    in_stock: bool = True
    available_qty: int = 0

class CartResponse(BaseModel):
    id: int
    session_token: str
    items: List[CartItemResponse] = []
    coupon_code: Optional[str] = None
    discount_paise: int = 0
    subtotal_paise: int = 0
    estimated_tax_paise: int = 0
    estimated_total_paise: int = 0
    total_price_paise: Optional[int] = 0
    total_items_count: int = 0
