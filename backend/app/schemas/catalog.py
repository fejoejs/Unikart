from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True

class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True

class BrandBase(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None
    is_active: bool = True

class BrandResponse(BrandBase):
    id: int

    class Config:
        from_attributes = True

class PriceResponse(BaseModel):
    id: int
    currency: str
    mrp_paise: int
    selling_price_paise: int
    is_active: bool

    class Config:
        from_attributes = True

class StaffPriceResponse(PriceResponse):
    purchase_cost_paise: Optional[int] = None

class ProductImageResponse(BaseModel):
    id: int
    url: str
    alt_text: Optional[str] = None
    sort_order: int
    is_primary: bool

    class Config:
        from_attributes = True

class ProductVariantResponse(BaseModel):
    id: int
    product_id: int
    sku: str
    barcode: Optional[str] = None
    name: str
    color: Optional[str] = None
    storage: Optional[str] = None
    weight_grams: int
    is_active: bool
    prices: List[PriceResponse] = []
    current_price: Optional[PriceResponse] = None
    stock_on_hand: Optional[int] = None
    stock_available: Optional[int] = None

    class Config:
        from_attributes = True

class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    brand_id: int
    category_id: int
    brand: Optional[BrandResponse] = None
    category: Optional[CategoryResponse] = None
    is_active: bool
    requires_serial: bool
    warranty_months: int
    hsn_code: str
    gst_rate: float
    rating: float
    review_count: int
    specifications: Optional[Dict[str, Any]] = None
    variants: List[ProductVariantResponse] = []
    images: List[ProductImageResponse] = []
    primary_image: Optional[str] = None
    price: Optional[float] = None
    selling_price: Optional[float] = None
    originalPrice: Optional[float] = None
    mrp: Optional[float] = None
    purchase_cost: Optional[float] = None
    purchaseCost: Optional[float] = None
    total_stock: Optional[int] = None
    stock_quantity: Optional[int] = None
    stock_status: Optional[str] = "in_stock"

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    brand_id: int
    category_id: int
    requires_serial: bool = False
    warranty_months: int = 12
    hsn_code: str = "8517"
    gst_rate: float = 18.0
    specifications: Optional[Dict[str, Any]] = None
    variants: List[Dict[str, Any]] = []
    images: List[str] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    brand_id: Optional[int] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
    requires_serial: Optional[bool] = None
    warranty_months: Optional[int] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    specifications: Optional[Dict[str, Any]] = None
    images: Optional[List[str]] = None
    variants: Optional[List[Dict[str, Any]]] = None

class ProductReviewCreate(BaseModel):
    author_name: str
    rating: int
    title: Optional[str] = None
    comment: str

class ProductReviewResponse(BaseModel):
    id: int
    product_id: int
    author_name: str
    rating: int
    title: Optional[str] = None
    comment: str
    is_verified_purchase: bool
    created_at: Any

    class Config:
        from_attributes = True

