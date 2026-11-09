import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. "EMP-2026-001"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    full_name = Column(String(255), nullable=False)
    photo_url = Column(String(500), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    designation = Column(String(100), default="Staff Member", nullable=True)
    department = Column(String(100), default="Store Operations", nullable=False)
    store_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True, index=True)
    joining_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    pan_number = Column(String(20), nullable=True)
    aadhaar_number = Column(String(20), nullable=True)
    bank_name = Column(String(100), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    bank_ifsc_code = Column(String(20), nullable=True)
    employment_status = Column(String(30), default="ACTIVE", nullable=False) # ACTIVE, PROBATION, NOTICE_PERIOD, TERMINATED, RESIGNED
    is_active = Column(Boolean, default=True, nullable=False)
    reporting_manager_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True)
    employment_type = Column(String(50), default="FULL_TIME", nullable=False) # FULL_TIME, PART_TIME, CONTRACT, INTERN, PROBATION
    permitted_apps = Column(JSON, nullable=True) # list of app identifiers
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    user = relationship("User")
    store = relationship("Warehouse")
    reporting_manager = relationship("Employee", remote_side=[id], backref="direct_reports")
    salary_structure = relationship("SalaryStructure", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    documents = relationship("EmployeeDocument", back_populates="employee", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    payslips = relationship("Payslip", back_populates="employee")

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(50), nullable=False) # AADHAAR, PAN, RESUME, OFFER_LETTER, PREVIOUS_PAYSLIP
    document_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    employee = relationship("Employee", back_populates="documents")

class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    monthly_base_paise = Column(Integer, nullable=False) # e.g. 3500000 = Rs 35,000
    monthly_hra_paise = Column(Integer, default=0, nullable=False)
    monthly_conveyance_paise = Column(Integer, default=0, nullable=False)
    monthly_medical_allowance_paise = Column(Integer, default=0, nullable=False)
    monthly_special_allowance_paise = Column(Integer, default=0, nullable=False)
    
    # Statutory deductions (Configurable)
    provident_fund_employee_percent = Column(Float, default=12.0, nullable=False)
    provident_fund_employer_percent = Column(Float, default=12.0, nullable=False)
    esi_percent = Column(Float, default=0.75, nullable=False)
    professional_tax_monthly_paise = Column(Integer, default=20000, nullable=False) # Rs 200 Karnataka standard
    tds_monthly_paise = Column(Integer, default=0, nullable=False)
    
    effective_from = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    employee = relationship("Employee", back_populates="salary_structure")

    @property
    def total_monthly_gross_paise(self) -> int:
        return (
            self.monthly_base_paise
            + self.monthly_hra_paise
            + self.monthly_conveyance_paise
            + self.monthly_medical_allowance_paise
            + self.monthly_special_allowance_paise
        )

class IncentiveRule(Base):
    __tablename__ = "incentive_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String(50), nullable=False, index=True) # cashier, manager, sales_exec
    target_sales_monthly_paise = Column(Integer, nullable=False)
    commission_basis = Column(String(30), default="PERCENTAGE_OF_SALES", nullable=False) # PERCENTAGE_OF_SALES, FLAT_TIER
    commission_rate_percent = Column(Float, default=1.0, nullable=False)
    min_accuracy_percent = Column(Float, default=98.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

class SalaryAdvance(Base):
    __tablename__ = "salary_advances"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_paise = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    deduct_monthly_paise = Column(Integer, nullable=False)
    status = Column(String(20), default="REQUESTED", nullable=False) # REQUESTED, APPROVED, REJECTED, PAID_OUT, REPAID
    approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    employee = relationship("Employee")
    approved_by = relationship("User")

class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    month = Column(Integer, nullable=False) # 1-12
    year = Column(Integer, nullable=False) # 2026
    store_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(20), default="PREVIEW", nullable=False) # PREVIEW, REVIEWED, APPROVED, LOCKED
    
    total_gross_paise = Column(Integer, default=0, nullable=False)
    total_deductions_paise = Column(Integer, default=0, nullable=False)
    total_net_payout_paise = Column(Integer, default=0, nullable=False)
    employee_count = Column(Integer, default=0, nullable=False)
    
    # Auto-created Salaries Expense linkage so Net Profit is always 100% accurate
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="SET NULL"), nullable=True, index=True)
    approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    locked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    store = relationship("Warehouse")
    expense = relationship("Expense")
    approved_by = relationship("User")
    payslips = relationship("Payslip", back_populates="payroll_run", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("month", "year", "store_id", name="uq_payroll_period_store"),
    )

class Payslip(Base):
    __tablename__ = "payslips"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    payslip_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. "PAY-2026-10-001"
    
    # Earnings
    gross_pay_paise = Column(Integer, nullable=False)
    basic_pay_paise = Column(Integer, nullable=False)
    hra_paise = Column(Integer, default=0, nullable=False)
    allowances_paise = Column(Integer, default=0, nullable=False)
    incentives_paise = Column(Integer, default=0, nullable=False)
    
    # Deductions
    pf_deduction_paise = Column(Integer, default=0, nullable=False)
    esi_deduction_paise = Column(Integer, default=0, nullable=False)
    prof_tax_paise = Column(Integer, default=0, nullable=False)
    tds_paise = Column(Integer, default=0, nullable=False)
    advance_deduction_paise = Column(Integer, default=0, nullable=False)
    total_deductions_paise = Column(Integer, default=0, nullable=False)
    
    net_pay_paise = Column(Integer, nullable=False)
    
    working_days = Column(Integer, default=30, nullable=False)
    present_days = Column(Integer, default=30, nullable=False)
    leave_days = Column(Integer, default=0, nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    payroll_run = relationship("PayrollRun", back_populates="payslips")
    employee = relationship("Employee", back_populates="payslips")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    clock_in = Column(DateTime, nullable=True)
    clock_out = Column(DateTime, nullable=True)
    cashier_session_id = Column(Integer, ForeignKey("cashier_sessions.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default="PRESENT", nullable=False) # PRESENT, LATE, HALF_DAY, ABSENT, ON_LEAVE, HOLIDAY
    manual_correction_reason = Column(String(255), nullable=True)
    corrected_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    employee = relationship("Employee", back_populates="attendance_records")
    cashier_session = relationship("CashierSession")
    corrected_by = relationship("User")

class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(30), unique=True, index=True, nullable=False) # CASUAL, SICK, EARNED, MATERNITY
    name = Column(String(50), nullable=False)
    annual_days = Column(Integer, default=12, nullable=False)

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id", ondelete="RESTRICT"), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    days = Column(Float, default=1.0, nullable=False)
    reason = Column(String(255), nullable=False)
    status = Column(String(20), default="PENDING", nullable=False) # PENDING, APPROVED, REJECTED
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_comment = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    employee = relationship("Employee", back_populates="leave_requests")
    leave_type = relationship("LeaveType")
    reviewed_by = relationship("User")

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(DateTime, unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    is_mandatory = Column(Boolean, default=True, nullable=False)
