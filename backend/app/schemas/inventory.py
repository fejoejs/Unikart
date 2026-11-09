from typing import List, Optional, Any
from pydantic import BaseModel

class StockAdjustmentRequest(BaseModel):
    variant_id: Optional[int] = None
    product_id: Optional[int] = None
    productId: Optional[int] = None
    warehouse_id: Optional[int] = 1
    movement_type: Optional[str] = "ADJUSTMENT"
    type: Optional[str] = None
    quantity: int
    reason: str
    notes: Optional[str] = None

class StockLevelResponse(BaseModel):
    id: int
    variant_id: int
    warehouse_id: int
    warehouse_name: str
    product_name: str
    variant_name: str
    category_name: Optional[str] = None
    cost_price_paise: Optional[int] = None
    sku: str
    on_hand: int
    reserved: int
    available: int
    reorder_level: int
    is_low_stock: bool

class InventoryMovementResponse(BaseModel):
    id: int
    variant_id: int
    warehouse_id: int
    movement_type: str
    quantity: int
    previous_on_hand: int
    new_on_hand: int
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    reason: str
    user_name: Optional[str] = None
    created_at: Any
    product_name: Optional[str] = None
    sku: Optional[str] = None

    class Config:
        from_attributes = True

class SerialNumberResponse(BaseModel):
    id: int
    variant_id: int
    serial_number: str
    imei: Optional[str] = None
    status: str
    sku: Optional[str] = None
    product_name: Optional[str] = None
