import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    approval_type = Column(String(50), nullable=False, index=True) # REFUND_OVERRIDE, DISCOUNT_OVERRIDE, STOCK_WRITEOFF, PRICE_UPDATE, PAYROLL_APPROVAL, ROLE_PERMISSION_CHANGE
    title = Column(String(255), nullable=False)
    requested_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    store_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=False)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    amount_paise = Column(Integer, nullable=True) # e.g. for financial approval thresholds
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="PENDING", nullable=False, index=True) # PENDING, APPROVED, REJECTED
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    requested_by = relationship("User", foreign_keys=[requested_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    store = relationship("Warehouse")

class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    key = Column(String(100), unique=True, index=True, nullable=False) # e.g. "payment_gateway", "cash_on_delivery", "maintenance_mode", "flash_sale_throttle", "pos_offline_tolerance"
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    updated_by = relationship("User")
    history = relationship("FeatureFlagHistory", back_populates="flag", cascade="all, delete-orphan")

class FeatureFlagHistory(Base):
    __tablename__ = "feature_flag_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    flag_id = Column(Integer, ForeignKey("feature_flags.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_value = Column(Boolean, nullable=False)
    new_value = Column(Boolean, nullable=False)
    reason = Column(String(255), nullable=True)
    changed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    flag = relationship("FeatureFlag", back_populates="history")
    changed_by = relationship("User")

class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True, nullable=False) # ORDER_CONFIRMATION, INVOICE_PDF, PAYSLIP_READY, APPROVAL_DISPATCH
    channel = Column(String(20), default="EMAIL", nullable=False) # EMAIL, SMS, WHATSAPP
    subject = Column(String(255), nullable=True)
    body_template = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String(120), unique=True, index=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    last_activity = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User")

class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    email_attempted = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False) # SUCCESS, FAILED_PASSWORD, FAILED_2FA, ACCOUNT_LOCKED
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    user = relationship("User")

class BackupRun(Base):
    __tablename__ = "backup_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    backup_code = Column(String(100), unique=True, index=True, nullable=False) # e.g. "BKP-2026-10-30-001"
    file_path = Column(String(255), nullable=False)
    size_bytes = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="COMPLETED", nullable=False) # COMPLETED, FAILED, RUNNING
    checksum = Column(String(64), nullable=True) # SHA-256
    triggered_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    triggered_by = relationship("User")
