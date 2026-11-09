from typing import List, Optional, Any
from pydantic import BaseModel

class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: str
    gstin: Optional[str] = None
    address: str
    city: str
    state: str
    state_code: str
    payment_terms_days: int = 30

class SupplierResponse(SupplierCreate):
    id: int
    is_active: bool
    created_at: Any

    class Config:
        from_attributes = True

class PurchaseOrderItemCreate(BaseModel):
    variant_id: int
    quantity_ordered: int
    unit_cost_paise: int
    tax_rate: float = 18.0

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    warehouse_id: int
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderItemResponse(BaseModel):
    id: int
    variant_id: int
    sku: Optional[str] = None
    product_name: Optional[str] = None
    variant_name: Optional[str] = None
    quantity_ordered: int
    quantity_received: int
    unit_cost_paise: int
    tax_rate: float
    total_cost_paise: int

class PurchaseOrderResponse(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    supplier_name: Optional[str] = None
    warehouse_id: int
    warehouse_name: Optional[str] = None
    status: str
    total_amount_paise: int
    notes: Optional[str] = None
    created_at: Any
    items: List[PurchaseOrderItemResponse] = []

class GoodsReceiptItemCreate(BaseModel):
    po_item_id: int
    variant_id: int
    quantity_accepted: int
    quantity_rejected: int = 0
    rejection_reason: Optional[str] = None
    serials: Optional[List[str]] = None

class GoodsReceiptCreate(BaseModel):
    po_id: int
    supplier_invoice_number: Optional[str] = None
    notes: Optional[str] = None
    items: List[GoodsReceiptItemCreate]
