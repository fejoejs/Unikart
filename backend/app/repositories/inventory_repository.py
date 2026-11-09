from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.inventory import StockLevel, InventoryMovement, Warehouse

class InventoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_stock(self, variant_id: int, warehouse_id: int) -> Optional[StockLevel]:
        return self.db.query(StockLevel).filter(
            StockLevel.variant_id == variant_id,
            StockLevel.warehouse_id == warehouse_id
        ).first()

    def get_levels_by_warehouse(self, warehouse_id: int) -> List[StockLevel]:
        return self.db.query(StockLevel).filter(StockLevel.warehouse_id == warehouse_id).all()

    def get_movements_by_variant(self, variant_id: int, limit: int = 50) -> List[InventoryMovement]:
        return self.db.query(InventoryMovement).filter(
            InventoryMovement.variant_id == variant_id
        ).order_by(InventoryMovement.created_at.desc()).limit(limit).all()
