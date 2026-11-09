import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.core.database import Base

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g., "WH-BLR-01", "STORE-BLR-01"
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    state_code = Column(String(10), nullable=False)
    is_store = Column(Boolean, default=False, nullable=False)  # True for physical retail store location
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    stock_levels = relationship("StockLevel", back_populates="warehouse")
    movements = relationship("InventoryMovement", back_populates="warehouse")
    pos_terminals = relationship("PosTerminal", back_populates="warehouse")

class StockLevel(Base):
    __tablename__ = "stock_levels"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    on_hand = Column(Integer, default=0, nullable=False)
    reserved = Column(Integer, default=0, nullable=False)
    reorder_level = Column(Integer, default=5, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("variant_id", "warehouse_id", name="uq_variant_warehouse"),
    )

    variant = relationship("ProductVariant", back_populates="stock_levels")
    warehouse = relationship("Warehouse", back_populates="stock_levels")

    @property
    def available(self) -> int:
        return max(0, self.on_hand - self.reserved)

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True)
    movement_type = Column(String(30), nullable=False, index=True)  # RECEIPT, SALE, RETURN, TRANSFER, DAMAGE, ADJUSTMENT
    quantity = Column(Integer, nullable=False)  # positive for additions, negative for reductions
    previous_on_hand = Column(Integer, nullable=False)
    new_on_hand = Column(Integer, nullable=False)
    reference_id = Column(String(100), nullable=True)  # e.g., PO-101, ORD-202, POS-303
    reference_type = Column(String(50), nullable=True)  # PURCHASE_ORDER, ORDER, POS_BILL, MANUAL_ADJUSTMENT
    reason = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    variant = relationship("ProductVariant")
    warehouse = relationship("Warehouse", back_populates="movements")
    user = relationship("User")

class StockReservation(Base):
    __tablename__ = "stock_reservations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    order_id = Column(Integer, nullable=True, index=True)
    cart_token = Column(String(100), nullable=True, index=True)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, COMMITTED, RELEASED
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    variant = relationship("ProductVariant")
    warehouse = relationship("Warehouse")

class SerialNumber(Base):
    __tablename__ = "serial_numbers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    imei = Column(String(50), unique=True, index=True, nullable=True)
    status = Column(String(20), default="IN_STOCK", nullable=False, index=True)  # IN_STOCK, RESERVED, SOLD, DEFECTIVE, RETURNED
    order_item_id = Column(Integer, nullable=True, index=True)
    pos_transaction_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    variant = relationship("ProductVariant")
    warehouse = relationship("Warehouse")

class ProductBatch(Base):
    __tablename__ = "product_batches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_number = Column(String(50), index=True, nullable=False)
    manufacturing_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, index=True, nullable=False) # FEFO primary key sorting
    quantity_on_hand = Column(Integer, default=0, nullable=False)
    mrp_paise = Column(Integer, default=0, nullable=False)
    cost_price_paise = Column(Integer, default=0, nullable=False)
    bin_location = Column(String(50), nullable=True, default="Aisle-1-Rack-A-Bin-01")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    variant = relationship("ProductVariant")
    warehouse = relationship("Warehouse")

class PickWave(Base):
    __tablename__ = "pick_waves"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    wave_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. "WAVE-2026-1001"
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    assigned_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(30), default="PENDING", nullable=False) # PENDING, IN_PROGRESS, COMPLETED
    total_orders = Column(Integer, default=1, nullable=False)
    total_items = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    warehouse = relationship("Warehouse")
    user = relationship("User")
    items = relationship("PickWaveItem", back_populates="wave", cascade="all, delete-orphan")

class PickWaveItem(Base):
    __tablename__ = "pick_wave_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    wave_id = Column(Integer, ForeignKey("pick_waves.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False)
    batch_id = Column(Integer, ForeignKey("product_batches.id", ondelete="SET NULL"), nullable=True)
    sku = Column(String(50), nullable=False)
    product_name = Column(String(255), nullable=False)
    bin_location = Column(String(50), nullable=False, default="Aisle-1-Rack-A-Bin-01")
    barcode = Column(String(50), nullable=False)
    quantity_requested = Column(Integer, nullable=False)
    quantity_picked = Column(Integer, default=0, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    wave = relationship("PickWave", back_populates="items")
    order = relationship("Order")
    variant = relationship("ProductVariant")
    batch = relationship("ProductBatch")

class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    stn_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. "STN-2026-1001"
    source_warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True)
    destination_warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(30), default="DISPATCHED", nullable=False, index=True) # DISPATCHED, IN_TRANSIT, RECEIVED_AT_STORE, CANCELLED
    vehicle_number = Column(String(50), nullable=True)
    driver_name = Column(String(100), nullable=True)
    driver_phone = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    dispatched_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    received_at = Column(DateTime, nullable=True)

    source_warehouse = relationship("Warehouse", foreign_keys=[source_warehouse_id])
    destination_warehouse = relationship("Warehouse", foreign_keys=[destination_warehouse_id])
    created_by = relationship("User")
    items = relationship("StockTransferItem", back_populates="transfer", cascade="all, delete-orphan", lazy="joined")

class StockTransferItem(Base):
    __tablename__ = "stock_transfer_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transfer_id = Column(Integer, ForeignKey("stock_transfers.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False)
    quantity_dispatched = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0, nullable=False)
    quantity_damaged = Column(Integer, default=0, nullable=False)
    damage_notes = Column(String(255), nullable=True)

    transfer = relationship("StockTransfer", back_populates="items")
    variant = relationship("ProductVariant", lazy="joined")

