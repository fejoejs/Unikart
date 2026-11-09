import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    products = relationship("Product", back_populates="category")

class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    products = relationship("Product", back_populates="brand")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), index=True, nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    short_description = Column(String(500), nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="RESTRICT"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    requires_serial = Column(Boolean, default=False, nullable=False)
    warranty_months = Column(Integer, default=12, nullable=False)
    hsn_code = Column(String(20), default="8517", nullable=False)  # Electronics standard HSN
    gst_rate = Column(Float, default=18.0, nullable=False)  # e.g., 18.0%
    rating = Column(Float, default=4.5, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)
    specifications = Column(JSON, nullable=True)  # Key-value specs e.g. {"Processor": "M3", "RAM": "16GB"}
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    brand = relationship("Brand", back_populates="products", lazy="joined")
    category = relationship("Category", back_populates="products", lazy="joined")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan", lazy="joined")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", lazy="joined")

class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    barcode = Column(String(100), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=False)  # e.g., "Space Gray, 256GB"
    color = Column(String(50), nullable=True)
    storage = Column(String(50), nullable=True)
    attributes = Column(JSON, nullable=True)
    weight_grams = Column(Integer, default=500, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="variants")
    prices = relationship("Price", back_populates="variant", cascade="all, delete-orphan", lazy="joined")
    stock_levels = relationship("StockLevel", back_populates="variant")
    images = relationship("ProductImage", back_populates="variant")

class Price(Base):
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    currency = Column(String(3), default="INR", nullable=False)
    mrp_paise = Column(Integer, nullable=False)  # Maximum Retail Price in paise
    selling_price_paise = Column(Integer, nullable=False)  # Current retail selling price in paise
    purchase_cost_paise = Column(Integer, default=0, nullable=False)  # Unit cost in paise for profit calculations
    valid_from = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    valid_to = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    variant = relationship("ProductVariant", back_populates="prices")

class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    url = Column(String(500), nullable=False)
    alt_text = Column(String(255), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)

    product = relationship("Product", back_populates="images")
    variant = relationship("ProductVariant", back_populates="images")

class ProductReview(Base):
    __tablename__ = "product_reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author_name = Column(String(100), nullable=False)
    rating = Column(Integer, nullable=False)  # 1 to 5 stars
    title = Column(String(150), nullable=True)
    comment = Column(Text, nullable=False)
    is_verified_purchase = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    product = relationship("Product", backref="reviews")

