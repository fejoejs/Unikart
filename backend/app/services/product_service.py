from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.catalog import Product, ProductVariant

class ProductService:
    @staticmethod
    def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).filter(Product.id == product_id).first()

    @staticmethod
    def get_product_by_slug(db: Session, slug: str) -> Optional[Product]:
        return db.query(Product).filter(Product.slug == slug, Product.is_active == True).first()

    @staticmethod
    def get_active_products(db: Session, limit: int = 50, offset: int = 0) -> List[Product]:
        return db.query(Product).filter(Product.is_active == True).offset(offset).limit(limit).all()
