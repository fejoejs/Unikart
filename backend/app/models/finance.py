import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    expense_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. "EXP-2026-001"
    category = Column(String(100), nullable=False, index=True) # Rent, Utilities, Salaries, Marketing, Packaging, Logistics, Store Maintenance, Miscellaneous
    amount_paise = Column(Integer, nullable=False)
    payment_method = Column(String(50), default="BANK_TRANSFER", nullable=False) # BANK_TRANSFER, CASH, CARD, UPI
    expense_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    attachment_url = Column(String(500), nullable=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_reversed = Column(Boolean, default=False, nullable=False)
    reversal_reason = Column(String(255), nullable=True)
    reversed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    recorded_by = relationship("User", foreign_keys=[recorded_by_id])
    reversed_by = relationship("User", foreign_keys=[reversed_by_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True) # e.g., "PRICE_UPDATE", "STOCK_ADJUSTMENT", "ROLE_ASSIGNMENT", "REFUND_APPROVED"
    entity_type = Column(String(50), nullable=False, index=True) # e.g., "ProductVariant", "StockLevel", "Order", "Expense"
    entity_id = Column(String(50), nullable=False)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    user = relationship("User")

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    key = Column(String(120), unique=True, index=True, nullable=False)
    operation = Column(String(100), nullable=False) # e.g., "CREATE_ORDER", "POS_TRANSACTION", "PAYMENT_CAPTURE"
    result_reference = Column(String(100), nullable=True) # e.g., "ORD-2026-1001"
    response_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

class NotificationEvent(Base):
    __tablename__ = "notification_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    channel = Column(String(20), default="EMAIL", nullable=False) # EMAIL, SMS, IN_APP
    recipient = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    status = Column(String(20), default="PENDING", nullable=False) # PENDING, SENT, FAILED
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    sent_at = Column(DateTime, nullable=True)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    updated_by = relationship("User")

class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    subscribed_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


