import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class PosTerminal(Base):
    __tablename__ = "pos_terminals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    terminal_code = Column(String(50), unique=True, index=True, nullable=False) # e.g., "POS-TERM-01"
    name = Column(String(100), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_heartbeat = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    warehouse = relationship("Warehouse", back_populates="pos_terminals")
    sessions = relationship("CashierSession", back_populates="terminal")

class CashierSession(Base):
    __tablename__ = "cashier_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_code = Column(String(50), unique=True, index=True, nullable=False) # e.g., "SESS-2026-1001"
    terminal_id = Column(Integer, ForeignKey("pos_terminals.id", ondelete="RESTRICT"), nullable=False, index=True)
    cashier_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    opened_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    opening_cash_paise = Column(Integer, default=0, nullable=False)
    closing_cash_paise = Column(Integer, default=0, nullable=False)
    total_sales_paise = Column(Integer, default=0, nullable=False)
    total_cash_sales_paise = Column(Integer, default=0, nullable=False)
    total_upi_sales_paise = Column(Integer, default=0, nullable=False)
    total_card_sales_paise = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="OPEN", nullable=False) # OPEN, CLOSED
    notes = Column(Text, nullable=True)

    terminal = relationship("PosTerminal", back_populates="sessions")
    cashier = relationship("User", back_populates="cashier_sessions")
    transactions = relationship("PosTransaction", back_populates="session")

class PosTransaction(Base):
    __tablename__ = "pos_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_uuid = Column(String(100), unique=True, index=True, nullable=False)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    session_id = Column(Integer, ForeignKey("cashier_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    terminal_id = Column(Integer, ForeignKey("pos_terminals.id", ondelete="RESTRICT"), nullable=False)
    cashier_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    
    subtotal_paise = Column(Integer, nullable=False)
    discount_paise = Column(Integer, default=0, nullable=False)
    tax_paise = Column(Integer, default=0, nullable=False)
    total_amount_paise = Column(Integer, nullable=False)
    payment_method = Column(String(30), default="CASH", nullable=False) # CASH, UPI, CARD, SPLIT
    split_payments = Column(JSON, nullable=True) # e.g. [{"method": "CASH", "amount": 50000}, {"method": "UPI", "amount": 50000}]
    
    is_offline_synced = Column(Boolean, default=False, nullable=False)
    offline_created_at = Column(DateTime, nullable=True)
    synced_at = Column(DateTime, nullable=True)
    status = Column(String(30), default="COMPLETED", nullable=False) # COMPLETED, CANCELLED, REFUNDED
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    session = relationship("CashierSession", back_populates="transactions")
    customer = relationship("Customer", back_populates="pos_transactions")
    order = relationship("Order")

class OfflineSyncEvent(Base):
    __tablename__ = "offline_sync_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_id = Column(String(100), index=True, nullable=False)
    terminal_id = Column(Integer, ForeignKey("pos_terminals.id", ondelete="RESTRICT"), nullable=False)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    payload = Column(JSON, nullable=False)
    sync_status = Column(String(20), default="SUCCESS", nullable=False) # SUCCESS, CONFLICT, REJECTED
    error_message = Column(Text, nullable=True)
    processed_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
