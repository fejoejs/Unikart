import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.models.auth import User, Role
from app.models.hr import (
    Employee, EmployeeDocument, SalaryStructure, PayrollRun,
    Payslip, AttendanceRecord, LeaveType, LeaveRequest, Holiday
)
from app.models.finance import Expense, AuditLog
from app.models.inventory import Warehouse
from app.api.v1.superadmin.deps import get_current_superadmin, require_hr_permission

router = APIRouter(prefix="/hr", tags=["Admin HR & Payroll"])

# Pydantic Schemas
class EmployeeCreate(BaseModel):
    employee_code: Optional[str] = None
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    designation: Optional[str] = "Staff Member"
    department: str = "Admin"
    reporting_manager_id: Optional[int] = None
    employment_type: Optional[str] = "FULL_TIME"
    store_id: Optional[int] = None
    monthly_base_paise: Optional[int] = 3500000
    monthly_hra_paise: int = 0
    monthly_conveyance_paise: int = 0
    monthly_medical_allowance_paise: int = 0
    monthly_special_allowance_paise: int = 0
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    roles: Optional[List[str]] = None
    permitted_apps: Optional[List[str]] = None
    temporary_password: Optional[str] = "Welcome@123"


class SalaryRevealRequest(BaseModel):
    password: str

class EmployeeRoleUpdate(BaseModel):
    role_names: Optional[List[str]] = None
    roles: Optional[List[str]] = None


class EmployeeUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class CustomerStatusUpdateRequest(BaseModel):
    is_active: bool
    reason: Optional[str] = "Customer status updated by administrator"

class CustomerPromoteRequest(BaseModel):
    role: Optional[str] = "inventory_staff"
    designation: Optional[str] = "Inventory Staff"
    department: Optional[str] = "Operations"

class EmployeePromotionRequest(BaseModel):
    new_designation: str
    new_department: Optional[str] = None
    new_roles: Optional[List[str]] = None
    new_monthly_base_paise: Optional[int] = None
    promotion_reason: Optional[str] = None
    reason: Optional[str] = None
    effective_date: Optional[datetime.datetime] = None

class EmployeeTransferRequest(BaseModel):
    new_department: str
    new_designation: Optional[str] = None
    new_reporting_manager_id: Optional[int] = None
    reason: Optional[str] = "Department transfer by administrator"

class EmployeeOffboardRequest(BaseModel):
    offboarding_type: str = "RESIGNED"  # RESIGNED, TERMINATED
    reason: str
    notes: Optional[str] = None
    handover_confirmed: bool = True

class EmployeeStatusUpdateRequest(BaseModel):
    employment_status: str  # ACTIVE, SUSPENDED, DEACTIVATED, TERMINATED, RESIGNED
    is_active: Optional[bool] = None
    reason: Optional[str] = None

class EmployeeAppAccessUpdateRequest(BaseModel):
    permitted_apps: List[str]

class EmployeePasswordResetRequest(BaseModel):
    new_password: str
    force_change_on_login: Optional[bool] = False

def check_circular_reporting(employee_id: int, target_manager_id: int, db: Session) -> bool:
    if employee_id == target_manager_id:
        return True
    curr_id = target_manager_id
    visited = set()
    while curr_id:
        if curr_id == employee_id:
            return True
        if curr_id in visited:
            return True
        visited.add(curr_id)
        mgr = db.query(Employee).filter(Employee.id == curr_id).first()
        if not mgr or not mgr.reporting_manager_id:
            break
        curr_id = mgr.reporting_manager_id
    return False


class AttendanceClockRequest(BaseModel):
    employee_id: int
    clock_type: str # IN, OUT

class AttendanceCorrectionRequest(BaseModel):
    clock_in: Optional[datetime.datetime] = None
    clock_out: Optional[datetime.datetime] = None
    status: str
    reason: str

class LeaveApplyRequest(BaseModel):
    employee_id: int
    leave_type_code: str
    start_date: datetime.datetime
    end_date: datetime.datetime
    days: float
    reason: str

class LeaveReviewRequest(BaseModel):
    status: str # APPROVED, REJECTED
    comment: Optional[str] = None

class PayrollPreviewRequest(BaseModel):
    month: int
    year: int
    store_id: Optional[int] = None

class PayrollApproveRequest(BaseModel):
    password: str

# 0. Central HR Dashboard Stats & Reporting Hierarchy
@router.get("/stats")
def get_hr_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    employees = db.query(Employee).all()
    total = len(employees)
    active = sum(1 for e in employees if e.is_active and e.employment_status == "ACTIVE")
    inactive = sum(1 for e in employees if not e.is_active or e.employment_status in ["TERMINATED", "RESIGNED"])
    suspended = sum(1 for e in employees if e.employment_status == "SUSPENDED" or (e.user and not e.user.is_active and e.is_active))
    pending_invite = sum(1 for e in employees if not e.user or not e.user_id)
    
    # Manager & Supervisor counts
    managers = sum(1 for e in employees if any(kw in (e.designation or '').lower() for kw in ["manager", "director", "head", "ceo", "lead"]) or (e.user and any(r.name in ["manager", "owner", "admin", "erp_admin", "inventory_manager"] for r in e.user.roles)))
    supervisors = sum(1 for e in employees if "supervisor" in (e.designation or '').lower() or "inspector" in (e.designation or '').lower())
    regular = max(0, total - managers - supervisors)

    departments = {}
    for e in employees:
        dept = e.department or "General"
        departments[dept] = departments.get(dept, 0) + 1

    return {
        "total_employees": total,
        "active_employees": active,
        "inactive_employees": inactive,
        "suspended_accounts": suspended,
        "pending_invitations": pending_invite,
        "managers_count": managers,
        "supervisors_count": supervisors,
        "regular_employees_count": regular,
        "departments": departments
    }

@router.get("/hierarchy")
def get_org_hierarchy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    employees = db.query(Employee).all()
    emp_map = {}
    for emp in employees:
        apps = emp.permitted_apps or []
        if not apps and emp.user:
            user_roles = [r.name for r in emp.user.roles]
            if "owner" in user_roles or "admin" in user_roles:
                apps = ["admin", "inventory"]
            else:
                apps = ["inventory"]

        emp_map[emp.id] = {
            "id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
            "email": emp.email,
            "phone": emp.phone,
            "designation": emp.designation,
            "department": emp.department,
            "employment_type": emp.employment_type or "FULL_TIME",
            "employment_status": emp.employment_status,
            "is_active": emp.is_active,
            "reporting_manager_id": emp.reporting_manager_id,
            "roles": [r.name for r in emp.user.roles] if emp.user else [],
            "permitted_apps": apps,
            "children": []
        }

    roots = []
    for emp in employees:
        if emp.reporting_manager_id and emp.reporting_manager_id in emp_map:
            emp_map[emp.reporting_manager_id]["children"].append(emp_map[emp.id])
        else:
            roots.append(emp_map[emp.id])

    return roots

# 1. Employees Directory
@router.get("/employees")
def list_employees(
    store_id: Optional[int] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    # Auto-sync staff users into Employee table if missing
    staff_roles = ['admin', 'owner', 'inventory_staff', 'inventory', 'manager']
    all_users = db.query(User).all()
    for u in all_users:
        u_roles = [r.name for r in u.roles] if u.roles else []
        if any(r in staff_roles for r in u_roles):
            existing_emp = db.query(Employee).filter(Employee.user_id == u.id).first()
            if not existing_emp:
                code = f"EMP-{u.id:03d}"
                desig = "System Administrator" if "admin" in u_roles else "Inventory Staff"
                dept = "Executive Management" if "admin" in u_roles else "Operations"
                new_emp = Employee(
                    employee_code=code,
                    user_id=u.id,
                    full_name=u.full_name or u.email.split('@')[0],
                    email=u.email,
                    phone=u.phone or "+91 98765 43210",
                    designation=desig,
                    department=dept,
                    employment_status="ACTIVE",
                    is_active=u.is_active
                )
                db.add(new_emp)
    try:
        db.commit()
    except Exception:
        db.rollback()

    q = db.query(Employee)
    if store_id and isinstance(store_id, int):
        q = q.filter(Employee.store_id == store_id)
    if status and isinstance(status, str) and status != 'ALL':
        q = q.filter(Employee.employment_status == status)
    if department and isinstance(department, str) and department != 'ALL':
        q = q.filter(Employee.department == department)

    employees = q.order_by(Employee.id.asc()).all()
    results = []
    for emp in employees:
        if emp.user:
            u_roles = [r.name for r in emp.user.roles] if emp.user.roles else []
            if u_roles == ['customer'] or ('customer' in u_roles and not any(r in staff_roles for r in u_roles)):
                continue

        if search:
            s = search.lower()
            name_m = (emp.full_name or "").lower()
            code_m = (emp.employee_code or "").lower()
            mail_m = (emp.email or "").lower()
            desig_m = (emp.designation or "").lower()
            if not (s in name_m or s in code_m or s in mail_m or s in desig_m):
                continue

        # Determine account activation status
        if not emp.user:
            account_status = "PENDING_INVITE"
        elif not emp.user.is_active:
            account_status = "DISABLED"
        elif emp.employment_status == "SUSPENDED":
            account_status = "SUSPENDED"
        else:
            account_status = "ACTIVE"

        kyc_status = "VERIFIED" if (emp.pan_number and emp.aadhaar_number) else "PENDING"

        apps = emp.permitted_apps or []
        if not apps and emp.user:
            user_roles = [r.name for r in emp.user.roles]
            if "owner" in user_roles or "admin" in user_roles:
                apps = ["admin", "inventory"]
            else:
                apps = ["inventory"]

        results.append({
            "id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
            "photo_url": emp.photo_url,
            "email": emp.email,
            "phone": emp.phone,
            "designation": emp.designation,
            "department": emp.department,
            "employment_type": emp.employment_type or "FULL_TIME",
            "store_id": emp.store_id,
            "store_name": emp.store.name if emp.store else "Unassigned",
            "reporting_manager_id": emp.reporting_manager_id,
            "reporting_manager_name": emp.reporting_manager.full_name if emp.reporting_manager else None,
            "reporting_manager_code": emp.reporting_manager.employee_code if emp.reporting_manager else None,
            "employment_status": emp.employment_status,
            "account_status": account_status,
            "kyc_status": kyc_status,
            "is_active": emp.is_active,
            "joining_date": emp.joining_date.isoformat() if emp.joining_date else None,
            "user_id": emp.user_id,
            "roles": [r.name for r in emp.user.roles] if emp.user else [],
            "permitted_apps": apps,
            "is_salary_configured": emp.salary_structure is not None
        })
    return results

@router.post("/employees")
def create_employee(
    emp_in: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    email = emp_in.email.lower().strip()
    full_name = emp_in.full_name.strip() if emp_in.full_name else f"{emp_in.first_name or ''} {emp_in.last_name or ''}".strip()
    if not full_name:
        full_name = "UNIKART Employee"
        
    code = emp_in.employee_code.upper().strip() if emp_in.employee_code else f"EMP-2026-{(db.query(Employee).count() + 1):03d}"

    existing = db.query(Employee).filter(
        (Employee.email == email) |
        (Employee.employee_code == code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"An employee with email '{email}' or code '{code}' already exists.")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail=f"A user with email '{email}' already exists in the system. Go to Customer Directory and click 'Promote to Role' to transfer them to Staff."
        )

    new_emp = Employee(
        employee_code=code,
        full_name=full_name,
        email=email,
        phone=emp_in.phone.strip() if emp_in.phone else "+91 98765 00000",
        designation=emp_in.designation.strip() if emp_in.designation else "Store Specialist",
        department=emp_in.department.strip() if emp_in.department else "Admin",
        employment_type=emp_in.employment_type or "FULL_TIME",
        reporting_manager_id=emp_in.reporting_manager_id,
        store_id=emp_in.store_id,
        pan_number=emp_in.pan_number,
        aadhaar_number=emp_in.aadhaar_number,
        bank_name=emp_in.bank_name,
        bank_account_number=emp_in.bank_account_number,
        bank_ifsc_code=emp_in.bank_ifsc_code,
        permitted_apps=emp_in.permitted_apps or ["inventory"],
        employment_status="ACTIVE",
        is_active=True
    )
    db.add(new_emp)
    db.flush()

    # Provision user account in users table if not exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        temp_pass = emp_in.temporary_password.strip() if emp_in.temporary_password else "Welcome@123"
        user = User(
            email=email,
            full_name=full_name,
            phone=new_emp.phone,
            hashed_password=get_password_hash(temp_pass),
            is_active=True,
            must_change_password=True
        )
        db.add(user)
        db.flush()

    # Assign roles
    assigned_roles = emp_in.roles or ["inventory_staff"]
    roles = db.query(Role).filter(Role.name.in_(assigned_roles)).all()
    if roles:
        user.roles = roles
    new_emp.user_id = user.id

    # Create salary structure
    base_paise = emp_in.monthly_base_paise if (emp_in.monthly_base_paise and emp_in.monthly_base_paise > 0) else 3500000
    salary = SalaryStructure(
        employee_id=new_emp.id,
        monthly_base_paise=base_paise,
        monthly_hra_paise=emp_in.monthly_hra_paise,
        monthly_conveyance_paise=emp_in.monthly_conveyance_paise,
        monthly_medical_allowance_paise=emp_in.monthly_medical_allowance_paise,
        monthly_special_allowance_paise=emp_in.monthly_special_allowance_paise
    )
    db.add(salary)

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_CREATED",
        entity_type="Employee",
        entity_id=str(new_emp.id),
        new_values={
            "code": new_emp.employee_code,
            "name": new_emp.full_name,
            "designation": new_emp.designation,
            "department": new_emp.department,
            "reporting_manager_id": new_emp.reporting_manager_id,
            "roles": assigned_roles,
            "permitted_apps": new_emp.permitted_apps
        }
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Employee onboarded successfully into UNIKART Central Registry",
        "id": new_emp.id,
        "employee_code": new_emp.employee_code,
        "full_name": new_emp.full_name,
        "email": new_emp.email,
        "designation": new_emp.designation,
        "department": new_emp.department,
        "reporting_manager_id": new_emp.reporting_manager_id,
        "reporting_manager_name": new_emp.reporting_manager.full_name if new_emp.reporting_manager else None,
        "roles": [r.name for r in user.roles],
        "permitted_apps": new_emp.permitted_apps,
        "is_active": new_emp.is_active,
        "employment_status": new_emp.employment_status,
        "joining_date": new_emp.joining_date.isoformat()
    }


@router.get("/employees/{emp_id}")
def get_employee_detail(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    # Determine account status
    if not emp.user:
        account_status = "PENDING_INVITE"
    elif not emp.user.is_active:
        account_status = "DISABLED"
    elif emp.employment_status == "SUSPENDED":
        account_status = "SUSPENDED"
    else:
        account_status = "ACTIVE"

    kyc_status = "VERIFIED" if (emp.pan_number and emp.aadhaar_number) else "PENDING"

    apps = emp.permitted_apps or []
    if not apps and emp.user:
        user_roles = [r.name for r in emp.user.roles]
        if "owner" in user_roles or "admin" in user_roles:
            apps = ["admin", "inventory"]
        else:
            apps = ["inventory"]

    # Recent employee audit history
    audits = db.query(AuditLog).filter(
        AuditLog.entity_type == "Employee",
        AuditLog.entity_id == str(emp.id)
    ).order_by(AuditLog.id.desc()).limit(20).all()

    audit_list = [{
        "id": a.id,
        "action": a.action,
        "user_id": a.user_id,
        "old_values": a.old_values,
        "new_values": a.new_values,
        "timestamp": a.created_at.isoformat() if a.created_at else None
    } for a in audits]

    direct_reports = [{
        "id": r.id,
        "employee_code": r.employee_code,
        "full_name": r.full_name,
        "designation": r.designation,
        "department": r.department,
        "employment_status": r.employment_status
    } for r in emp.direct_reports]

    return {
        "id": emp.id,
        "employee_code": emp.employee_code,
        "full_name": emp.full_name,
        "email": emp.email,
        "phone": emp.phone,
        "designation": emp.designation,
        "department": emp.department,
        "employment_type": emp.employment_type or "FULL_TIME",
        "store_id": emp.store_id,
        "store_name": emp.store.name if emp.store else "Unassigned",
        "reporting_manager_id": emp.reporting_manager_id,
        "reporting_manager_name": emp.reporting_manager.full_name if emp.reporting_manager else None,
        "reporting_manager_code": emp.reporting_manager.employee_code if emp.reporting_manager else None,
        "employment_status": emp.employment_status,
        "account_status": account_status,
        "kyc_status": kyc_status,
        "is_active": emp.is_active,
        "joining_date": emp.joining_date.isoformat(),
        "address": emp.address,
        "emergency_contact_name": emp.emergency_contact_name,
        "emergency_contact_phone": emp.emergency_contact_phone,
        "pan_number": emp.pan_number,
        "aadhaar_number": f"XXXX-XXXX-{emp.aadhaar_number[-4:]}" if emp.aadhaar_number else None,
        "bank_name": emp.bank_name,
        "bank_account_number": f"XXXXXX{emp.bank_account_number[-4:]}" if emp.bank_account_number else None,
        "bank_ifsc_code": emp.bank_ifsc_code,
        "user_id": emp.user_id,
        "roles": [r.name for r in emp.user.roles] if emp.user else [],
        "permitted_apps": apps,
        "direct_reports": direct_reports,
        "audit_logs": audit_list,
        # Masked salary structure returned by default
        "salary_masked": True
    }

@router.patch("/employees/{emp_id}/roles")
def update_employee_roles(
    emp_id: int,
    roles_in: EmployeeRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    user = emp.user
    if not user:
        # Check if user already exists by email
        user = db.query(User).filter(User.email == emp.email).first()
        if not user:
            # Auto-provision user account for employee with default credentials
            user = User(
                email=emp.email,
                full_name=emp.full_name,
                hashed_password=get_password_hash("Welcome@123"),
                phone=emp.phone,
                is_active=True
            )
            db.add(user)
            db.flush()
        emp.user_id = user.id

    old_roles = [r.name for r in user.roles]
    target_roles = roles_in.role_names or roles_in.roles or []
    roles = db.query(Role).filter(Role.name.in_(target_roles)).all()
    user.roles = roles

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_ROLES_UPDATED",
        entity_type="Employee",
        entity_id=str(emp.id),
        old_values={"roles": old_roles},
        new_values={"roles": target_roles}
    )
    db.add(audit)
    db.commit()

    return {
        "employee_id": emp.id,
        "employee_code": emp.employee_code,
        "full_name": emp.full_name,
        "user_id": user.id,
        "roles": [r.name for r in user.roles]
    }

@router.post("/employees/{emp_id}/promote")
def promote_employee(
    emp_id: int,
    req: EmployeePromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    caller_roles = [r.name for r in current_user.roles]
    is_owner = "owner" in caller_roles

    # Only Owner can appoint or promote someone to Owner or Admin level
    if req.new_roles and ("owner" in req.new_roles or "admin" in req.new_roles) and not is_owner:
        raise HTTPException(status_code=403, detail="Only the Company Owner can grant Owner or Admin privileges.")

    old_designation = emp.designation
    old_dept = emp.department
    old_roles = [r.name for r in emp.user.roles] if emp.user else []

    emp.designation = req.new_designation.strip()
    if req.new_department:
        emp.department = req.new_department.strip()

    if req.new_roles:
        if not emp.user:
            user = db.query(User).filter(User.email == emp.email).first()
            if not user:
                user = User(
                    email=emp.email,
                    full_name=emp.full_name,
                    hashed_password=get_password_hash("Welcome@123"),
                    phone=emp.phone,
                    is_active=True
                )
                db.add(user)
                db.flush()
            emp.user_id = user.id
        
        roles = db.query(Role).filter(Role.name.in_(req.new_roles)).all()
        emp.user.roles = roles

    if req.new_monthly_base_paise and req.new_monthly_base_paise > 0:
        if emp.salary_structure:
            emp.salary_structure.monthly_base_paise = req.new_monthly_base_paise
        else:
            salary = SalaryStructure(
                employee_id=emp.id,
                monthly_base_paise=req.new_monthly_base_paise
            )
            db.add(salary)

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_PROMOTED",
        entity_type="Employee",
        entity_id=str(emp.id),
        old_values={"designation": old_designation, "department": old_dept, "roles": old_roles},
        new_values={
            "designation": emp.designation,
            "department": emp.department,
            "roles": req.new_roles or old_roles,
            "reason": req.promotion_reason
        }
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Employee {emp.full_name} promoted to {emp.designation} successfully.",
        "employee": {
            "id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
            "designation": emp.designation,
            "department": emp.department,
            "roles": [r.name for r in emp.user.roles] if emp.user else []
        }
    }

@router.patch("/employees/{emp_id}/status")
def update_employee_status(
    emp_id: int,
    req: EmployeeStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    # Guard the root Company Owner
    if emp.email == "owner@unikart.in" or (emp.user and "owner" in [r.name for r in emp.user.roles]):
        if not req.is_active or req.employment_status != "ACTIVE":
            raise HTTPException(status_code=403, detail="The root Company Owner account cannot be deactivated or suspended.")

    old_status = emp.employment_status
    old_active = emp.is_active

    emp.employment_status = req.employment_status.upper()
    emp.is_active = (req.employment_status.upper() == "ACTIVE") if req.is_active is None else req.is_active

    # Instant session revocation: if deactivated or suspended, disable associated User account
    if emp.user:
        emp.user.is_active = emp.is_active

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_STATUS_CHANGED",
        entity_type="Employee",
        entity_id=str(emp.id),
        old_values={"employment_status": old_status, "is_active": old_active},
        new_values={"employment_status": emp.employment_status, "is_active": emp.is_active, "reason": req.reason}
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Employee status updated to {emp.employment_status}.",
        "employee_id": emp.id,
        "employment_status": emp.employment_status,
        "is_active": emp.is_active
    }

@router.patch("/employees/{emp_id}/apps")
def update_employee_app_access(
    emp_id: int,
    req: EmployeeAppAccessUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    emp.permitted_apps = req.permitted_apps

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_APP_ACCESS_UPDATED",
        entity_type="Employee",
        entity_id=str(emp.id),
        new_values={"permitted_apps": req.permitted_apps}
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Application permissions updated for {emp.full_name}.",
        "employee_id": emp.id,
        "permitted_apps": req.permitted_apps
    }

@router.patch("/employees/{emp_id}/transfer")
def transfer_employee(
    emp_id: int,
    req: EmployeeTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if emp.email == "owner@unikart.in" and req.new_reporting_manager_id is not None:
        raise HTTPException(status_code=403, detail="The root Company Owner cannot report to any other employee.")

    if req.new_reporting_manager_id:
        mgr = db.query(Employee).filter(Employee.id == req.new_reporting_manager_id).first()
        if not mgr:
            raise HTTPException(status_code=404, detail="Target reporting manager not found.")
        if check_circular_reporting(emp.id, req.new_reporting_manager_id, db):
            raise HTTPException(status_code=400, detail="Circular reporting detected! An employee cannot report to themselves or a direct/indirect subordinate.")

    old_dept = emp.department
    old_designation = emp.designation
    old_mgr_id = emp.reporting_manager_id

    emp.department = req.new_department.strip()
    if req.new_designation:
        emp.designation = req.new_designation.strip()
    if req.new_reporting_manager_id is not None:
        emp.reporting_manager_id = req.new_reporting_manager_id

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_TRANSFERRED",
        entity_type="Employee",
        entity_id=str(emp.id),
        old_values={"department": old_dept, "designation": old_designation, "reporting_manager_id": old_mgr_id},
        new_values={
            "department": emp.department,
            "designation": emp.designation,
            "reporting_manager_id": emp.reporting_manager_id,
            "reason": req.reason
        }
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Employee {emp.full_name} transferred to {emp.department} successfully.",
        "employee_id": emp.id,
        "department": emp.department,
        "designation": emp.designation,
        "reporting_manager_id": emp.reporting_manager_id,
        "reporting_manager_name": emp.reporting_manager.full_name if emp.reporting_manager else None
    }

@router.post("/employees/{emp_id}/offboard")
def offboard_employee(
    emp_id: int,
    req: EmployeeOffboardRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if emp.email == "owner@unikart.in":
        raise HTTPException(status_code=403, detail="The root Company Owner account cannot be offboarded.")

    old_status = emp.employment_status
    emp.employment_status = req.offboarding_type.upper()
    emp.is_active = False

    if emp.user:
        emp.user.is_active = False

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_OFFBOARDED",
        entity_type="Employee",
        entity_id=str(emp.id),
        old_values={"employment_status": old_status, "is_active": True},
        new_values={
            "employment_status": emp.employment_status,
            "is_active": False,
            "offboarding_type": req.offboarding_type,
            "reason": req.reason,
            "notes": req.notes,
            "handover_confirmed": req.handover_confirmed
        }
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Employee {emp.full_name} offboarded ({req.offboarding_type}). System access revoked immediately.",
        "employee_id": emp.id,
        "employment_status": emp.employment_status,
        "is_active": False
    }

@router.post("/employees/{emp_id}/reset-password")
def reset_employee_password(
    emp_id: int,
    req: EmployeePasswordResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if not emp.user:
        user = db.query(User).filter(User.email == emp.email).first()
        if not user:
            user = User(
                email=emp.email,
                full_name=emp.full_name,
                hashed_password=get_password_hash(req.new_password.strip()),
                phone=emp.phone,
                is_active=True
            )
            db.add(user)
            db.flush()
        emp.user_id = user.id
    
    emp.user.hashed_password = get_password_hash(req.new_password.strip())

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_PASSWORD_RESET_BY_ADMIN",
        entity_type="Employee",
        entity_id=str(emp.id)
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Password reset successfully for {emp.full_name} ({emp.email})."
    }


@router.post("/employees/{emp_id}/salary-reveal")
def reveal_employee_salary(
    emp_id: int,
    req: SalaryRevealRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    """
    Requires password re-entry. Logs audit event and returns unmasked salary structure.
    """
    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Password verification failed. Access denied.")

    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")
    if not emp.salary_structure:
        raise HTTPException(status_code=404, detail="Salary structure not configured for this employee.")

    # Immutable forensic audit logging
    audit = AuditLog(
        user_id=current_user.id,
        action="SALARY_VIEWED",
        entity_type="EmployeeSalary",
        entity_id=str(emp.id),
        new_values={"employee_code": emp.employee_code, "viewer": current_user.email}
    )
    db.add(audit)
    db.commit()

    s = emp.salary_structure
    return {
        "employee_id": emp.id,
        "employee_code": emp.employee_code,
        "full_name": emp.full_name,
        "monthly_base_paise": s.monthly_base_paise,
        "monthly_hra_paise": s.monthly_hra_paise,
        "monthly_conveyance_paise": s.monthly_conveyance_paise,
        "monthly_medical_allowance_paise": s.monthly_medical_allowance_paise,
        "monthly_special_allowance_paise": s.monthly_special_allowance_paise,
        "total_monthly_gross_paise": s.total_monthly_gross_paise,
        "provident_fund_employee_percent": s.provident_fund_employee_percent,
        "esi_percent": s.esi_percent,
        "professional_tax_monthly_paise": s.professional_tax_monthly_paise,
        "tds_monthly_paise": s.tds_monthly_paise
    }

# 2. Attendance & Shifts
@router.get("/attendance")
def list_attendance(
    employee_id: Optional[int] = Query(None),
    date_str: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    q = db.query(AttendanceRecord)
    if employee_id:
        q = q.filter(AttendanceRecord.employee_id == employee_id)
    if date_str:
        dt = datetime.datetime.fromisoformat(date_str)
        q = q.filter(func.date(AttendanceRecord.date) == dt.date())

    records = q.order_by(AttendanceRecord.date.desc()).limit(100).all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "employee_id": r.employee_id,
            "employee_name": r.employee.full_name if r.employee else "Unknown",
            "employee_code": r.employee.employee_code if r.employee else "",
            "store_name": r.employee.store.name if (r.employee and r.employee.store) else "HQ",
            "date": r.date.strftime("%Y-%m-%d"),
            "clock_in": r.clock_in.strftime("%H:%M:%S") if r.clock_in else None,
            "clock_out": r.clock_out.strftime("%H:%M:%S") if r.clock_out else None,
            "status": r.status,
            "has_cashier_shift": r.cashier_session_id is not None,
            "manual_correction_reason": r.manual_correction_reason
        })
    return results

@router.patch("/attendance/{record_id}/correct")
def correct_attendance(
    record_id: int,
    req: AttendanceCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    old_status = rec.status
    if req.clock_in: rec.clock_in = req.clock_in
    if req.clock_out: rec.clock_out = req.clock_out
    rec.status = req.status
    rec.manual_correction_reason = req.reason
    rec.corrected_by_id = current_user.id

    audit = AuditLog(
        user_id=current_user.id,
        action="ATTENDANCE_CORRECTED",
        entity_type="AttendanceRecord",
        entity_id=str(rec.id),
        old_values={"status": old_status},
        new_values={"status": rec.status, "reason": req.reason}
    )
    db.add(audit)
    db.commit()

    return {"message": "Attendance record updated", "id": rec.id, "status": rec.status}

# 3. Leave Management
@router.get("/leave")
def list_leaves(
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    q = db.query(LeaveRequest)
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    if status:
        q = q.filter(LeaveRequest.status == status)

    leaves = q.order_by(LeaveRequest.created_at.desc()).all()
    results = []
    for l in leaves:
        results.append({
            "id": l.id,
            "employee_id": l.employee_id,
            "employee_name": l.employee.full_name if l.employee else "Unknown",
            "employee_code": l.employee.employee_code if l.employee else "",
            "leave_type": l.leave_type.name if l.leave_type else "Leave",
            "start_date": l.start_date.strftime("%Y-%m-%d"),
            "end_date": l.end_date.strftime("%Y-%m-%d"),
            "days": l.days,
            "reason": l.reason,
            "status": l.status,
            "review_comment": l.review_comment,
            "reviewed_by": l.reviewed_by.full_name if l.reviewed_by else None
        })
    return results

@router.patch("/leave/{leave_id}/review")
def review_leave(
    leave_id: int,
    req: LeaveReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    l = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    l.status = req.status
    l.review_comment = req.comment
    l.reviewed_by_id = current_user.id
    l.reviewed_at = datetime.datetime.utcnow()

    audit = AuditLog(
        user_id=current_user.id,
        action=f"LEAVE_{req.status}",
        entity_type="LeaveRequest",
        entity_id=str(l.id),
        new_values={"status": req.status, "comment": req.comment}
    )
    db.add(audit)
    db.commit()

    return {"message": f"Leave request {req.status.lower()} successfully", "id": l.id, "status": l.status}

# 4. Monthly Payroll Wizard & Payslips Engine
@router.post("/payroll/runs/preview")
def preview_monthly_payroll(
    req: PayrollPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    """
    Simulates monthly payroll run across active employees,
    calculating gross earnings, PF, ESI, Professional Tax, TDS, and Net Payout.
    """
    emp_q = db.query(Employee).filter(Employee.is_active == True)
    if req.store_id:
        emp_q = emp_q.filter(Employee.store_id == req.store_id)
    employees = emp_q.all()

    items = []
    total_gross = 0
    total_deductions = 0
    total_net = 0

    for emp in employees:
        s = emp.salary_structure
        if not s:
            continue

        gross = s.total_monthly_gross_paise
        # PF 12% of basic
        pf = int(s.monthly_base_paise * (s.provident_fund_employee_percent / 100.0))
        # ESI 0.75% of gross if gross <= Rs 21,000 (2100000 paise)
        esi = int(gross * (s.esi_percent / 100.0)) if gross <= 2100000 else 0
        prof_tax = s.professional_tax_monthly_paise
        tds = s.tds_monthly_paise
        
        deductions = pf + esi + prof_tax + tds
        net = max(0, gross - deductions)

        total_gross += gross
        total_deductions += deductions
        total_net += net

        items.append({
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
            "employee_name": emp.full_name,
            "designation": emp.designation,
            "gross_paise": gross,
            "basic_paise": s.monthly_base_paise,
            "hra_paise": s.monthly_hra_paise,
            "pf_paise": pf,
            "esi_paise": esi,
            "prof_tax_paise": prof_tax,
            "tds_paise": tds,
            "total_deductions_paise": deductions,
            "net_pay_paise": net
        })

    return {
        "month": req.month,
        "year": req.year,
        "store_id": req.store_id,
        "employee_count": len(items),
        "total_gross_paise": total_gross,
        "total_deductions_paise": total_deductions,
        "total_net_payout_paise": total_net,
        "items": items
    }

@router.post("/payroll/runs/{month}/{year}/approve")
def approve_payroll_run(
    month: int,
    year: int,
    req: PayrollApproveRequest,
    store_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    """
    Requires password re-entry.
    Locks payroll run, generates immutable payslips,
    AND AUTOMATICALLY POSTS A SALARY EXPENSE VOUCHER to keep P&L 100% accurate!
    """
    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Password verification failed. Authorization denied.")

    existing_run = db.query(PayrollRun).filter(
        PayrollRun.month == month,
        PayrollRun.year == year,
        PayrollRun.store_id == store_id
    ).first()

    if existing_run and existing_run.status in ["APPROVED", "LOCKED"]:
        raise HTTPException(status_code=400, detail="Payroll for this month/year has already been approved and locked.")

    # Calculate run items
    preview = preview_monthly_payroll(PayrollPreviewRequest(month=month, year=year, store_id=store_id), db, current_user)
    if preview["employee_count"] == 0:
        raise HTTPException(status_code=400, detail="No active employees found to run payroll.")

    # 1. Create or update PayrollRun
    run = existing_run or PayrollRun(month=month, year=year, store_id=store_id)
    run.status = "APPROVED"
    run.total_gross_paise = preview["total_gross_paise"]
    run.total_deductions_paise = preview["total_deductions_paise"]
    run.total_net_payout_paise = preview["total_net_payout_paise"]
    run.employee_count = preview["employee_count"]
    run.approved_by_id = current_user.id
    run.approved_at = datetime.datetime.utcnow()
    db.add(run)
    db.flush()

    # 2. Automatically create Salaries Expense in finance ledger
    exp_num = f"EXP-SAL-{year}-{month:02d}-{run.id}"
    salary_expense = db.query(Expense).filter(Expense.expense_number == exp_num).first()
    if not salary_expense:
        salary_expense = Expense(
            expense_number=exp_num,
            category="Salaries",
            amount_paise=run.total_net_payout_paise,
            payment_method="BANK_TRANSFER",
            expense_date=datetime.datetime.utcnow(),
            notes=f"Monthly Staff Payroll Disbursement for {month:02d}/{year} ({run.employee_count} employees)",
            recorded_by_id=current_user.id,
            is_reversed=False
        )
        db.add(salary_expense)
        db.flush()

    run.expense_id = salary_expense.id

    # 3. Create individual immutable payslips
    for item in preview["items"]:
        ps_num = f"PAY-{year}-{month:02d}-{item['employee_id']:04d}"
        existing_ps = db.query(Payslip).filter(Payslip.payslip_number == ps_num).first()
        if not existing_ps:
            ps = Payslip(
                payroll_run_id=run.id,
                employee_id=item["employee_id"],
                payslip_number=ps_num,
                gross_pay_paise=item["gross_paise"],
                basic_pay_paise=item["basic_paise"],
                hra_paise=item["hra_paise"],
                allowances_paise=0,
                incentives_paise=0,
                pf_deduction_paise=item["pf_paise"],
                esi_deduction_paise=item["esi_paise"],
                prof_tax_paise=item["prof_tax_paise"],
                tds_paise=item["tds_paise"],
                advance_deduction_paise=0,
                total_deductions_paise=item["total_deductions_paise"],
                net_pay_paise=item["net_pay_paise"],
                working_days=30,
                present_days=30,
                leave_days=0
            )
            db.add(ps)

    # 4. Forensic Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="PAYROLL_APPROVED_AND_LOCKED",
        entity_type="PayrollRun",
        entity_id=str(run.id),
        new_values={
            "period": f"{month:02d}/{year}",
            "net_payout_paise": run.total_net_payout_paise,
            "expense_number": salary_expense.expense_number,
            "employee_count": run.employee_count
        }
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Payroll approved, payslips generated, and salary expense posted successfully.",
        "payroll_run_id": run.id,
        "total_net_payout_paise": run.total_net_payout_paise,
        "expense_number": salary_expense.expense_number,
        "employee_count": run.employee_count
    }

@router.get("/payslips/{payslip_id}")
def get_payslip(
    payslip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    ps = db.query(Payslip).filter(Payslip.id == payslip_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Payslip not found.")

    emp = ps.employee
    return {
        "id": ps.id,
        "payslip_number": ps.payslip_number,
        "generated_at": ps.generated_at.strftime("%Y-%m-%d"),
        "period": f"{ps.payroll_run.month:02d}/{ps.payroll_run.year}",
        "employee": {
            "name": emp.full_name,
            "code": emp.employee_code,
            "designation": emp.designation,
            "department": emp.department,
            "store": emp.store.name if emp.store else "HQ",
            "pan": emp.pan_number,
            "bank_name": emp.bank_name,
            "bank_account": f"XXXXXX{emp.bank_account_number[-4:]}" if emp.bank_account_number else ""
        },
        "earnings": {
            "basic_paise": ps.basic_pay_paise,
            "hra_paise": ps.hra_paise,
            "allowances_paise": ps.allowances_paise,
            "incentives_paise": ps.incentives_paise,
            "gross_pay_paise": ps.gross_pay_paise
        },
        "deductions": {
            "pf_paise": ps.pf_deduction_paise,
            "esi_paise": ps.esi_deduction_paise,
            "prof_tax_paise": ps.prof_tax_paise,
            "tds_paise": ps.tds_paise,
            "total_deductions_paise": ps.total_deductions_paise
        },
        "net_pay_paise": ps.net_pay_paise
    }

@router.get("/commissions")
def get_commissions_leaderboard(
    month: int = Query(10),
    year: int = Query(2026),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    results = []
    rank = 1
    for emp in employees:
        achieved = 0
        target = 10000000
        results.append({
            "employee_id": emp.id,
            "full_name": emp.full_name,
            "performance_tier": emp.designation or "Staff Associate",
            "store_name": emp.store.name if emp.store else "Consolidated Retail",
            "target_paise": target,
            "achieved_paise": achieved,
            "achievement_pct": round((achieved / target * 100), 1) if target > 0 else 0,
            "incentive_paise": int(achieved * 0.05),
            "rank": rank
        })
        rank += 1
    return results



# 2. Customers Directory & Promotion — Lists ALL registered shoppers (Email & Google)
@router.get("/customers")
def list_customers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    from app.models.customer import Customer
    from app.models.order import Order

    staff_roles = {"admin", "inventory_staff", "owner", "manager", "inventory"}
    cust_role = db.query(Role).filter(Role.name == "customer").first()
    customers_list = []

    # Query all users and include any shopper (registered via email or google)
    all_users = db.query(User).order_by(User.id.desc()).all()
    
    for u in all_users:
        u_roles = [r.name for r in u.roles] if u.roles else []
        # Exclude administrative and inventory staff accounts
        if any(r in staff_roles for r in u_roles):
            continue

        # Auto-heal: Ensure customer role is associated with all shopper users
        if cust_role and cust_role not in u.roles:
            u.roles.append(cust_role)
            try:
                db.commit()
            except Exception:
                db.rollback()

        # Retrieve profile details from linked Customer profile table if present
        cust_profile = db.query(Customer).filter((Customer.user_id == u.id) | (Customer.email == u.email)).first()
        full_name = u.full_name or (f"{cust_profile.first_name} {cust_profile.last_name}".strip() if cust_profile else "") or u.email.split("@")[0]
        phone = u.phone or (cust_profile.phone if cust_profile else None) or "Not provided"

        if search:
            s = search.lower().strip()
            if s and not (s in full_name.lower() or s in u.email.lower() or s in phone.lower()):
                continue

        orders_count = db.query(Order).filter(Order.customer_id == u.id).count() if hasattr(Order, 'customer_id') else 0

        customers_list.append({
            "id": u.id,
            "user_id": u.id,
            "full_name": full_name,
            "email": u.email,
            "phone": phone,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if getattr(u, 'created_at', None) else None,
            "orders_count": orders_count,
            "role": "Customer"
        })

    return customers_list

@router.post("/customers/{user_id}/promote")
def promote_customer_to_staff(
    user_id: int,
    payload: CustomerPromoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Customer user not found.")

    target_role_name = (payload.role or "inventory_staff").strip().lower()
    target_role = db.query(Role).filter(Role.name == target_role_name).first()
    if not target_role:
        target_role = Role(name=target_role_name, description=f"{target_role_name.replace('_', ' ').title()} Role", is_system=True, is_active=True)
        db.add(target_role)
        db.flush()

    # Update user roles: remove customer, add target role
    cust_role = db.query(Role).filter(Role.name == "customer").first()
    new_roles = [r for r in target_user.roles if r.name != "customer"]
    if target_role not in new_roles:
        new_roles.append(target_role)
    target_user.roles = new_roles

    # Create corresponding Employee record
    emp = db.query(Employee).filter(Employee.user_id == target_user.id).first()
    emp_code = f"EMP-{target_user.id:03d}"
    desig = payload.designation or ("System Administrator" if target_role_name == "admin" else "Inventory Staff")
    dept = payload.department or ("Executive Management" if target_role_name == "admin" else "Operations")

    if not emp:
        emp = Employee(
            employee_code=emp_code,
            user_id=target_user.id,
            full_name=target_user.full_name or target_user.email.split("@")[0],
            email=target_user.email,
            phone=target_user.phone or "+91 98765 43210",
            designation=desig,
            department=dept,
            employment_status="ACTIVE",
            is_active=True
        )
        db.add(emp)
    else:
        emp.designation = desig
        emp.department = dept
        emp.is_active = True
        emp.employment_status = "ACTIVE"

    db.commit()
    return {
        "success": True,
        "message": f"Successfully promoted {target_user.full_name} to {target_role_name.replace('_', ' ').title()}! Record transferred to Employee Directory.",
        "employee_id": emp.id,
        "employee_code": emp.employee_code
    }

@router.patch("/employees/{emp_id}/update")
def update_employee_details(
    emp_id: int,
    payload: EmployeeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if payload.full_name is not None:
        emp.full_name = payload.full_name.strip()
        if emp.user:
            emp.user.full_name = payload.full_name.strip()

    if payload.phone is not None:
        emp.phone = payload.phone.strip()
        if emp.user:
            emp.user.phone = payload.phone.strip()

    if payload.designation is not None:
        emp.designation = payload.designation.strip()

    if payload.department is not None:
        emp.department = payload.department.strip()

    if payload.is_active is not None:
        emp.is_active = payload.is_active
        emp.employment_status = "ACTIVE" if payload.is_active else "SUSPENDED"
        if emp.user:
            emp.user.is_active = payload.is_active

    if payload.role is not None and emp.user:
        r_name = payload.role.strip().lower()
        if r_name == "customer":
            customer_role = db.query(Role).filter(Role.name == "customer").first()
            if not customer_role:
                customer_role = Role(name="customer", description="Customer Role", is_system=True, is_active=True)
                db.add(customer_role)
                db.flush()
            emp.user.roles = [customer_role]
            emp.user.is_active = True
            user_name = emp.full_name
            db.delete(emp)
            db.commit()
            return {
                "success": True,
                "message": f"Successfully transferred {user_name} to Customer! Record moved to Customer Directory.",
                "transferred_to_customer": True
            }
        else:
            role_obj = db.query(Role).filter(Role.name == r_name).first()
            if role_obj:
                emp.user.roles = [role_obj]

    db.commit()
    return {
        "success": True,
        "message": f"Employee {emp.full_name} updated successfully.",
        "employee": {
            "id": emp.id,
            "full_name": emp.full_name,
            "email": emp.email,
            "phone": emp.phone,
            "designation": emp.designation,
            "department": emp.department,
            "is_active": emp.is_active
        }
    }


@router.post("/employees/{emp_id}/demote-to-customer")
def demote_employee_to_customer(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if emp.email in ["admin@unikart.in", "owner@unikart.in"]:
        raise HTTPException(status_code=403, detail="The root Administrator/Owner account cannot be converted to a customer.")

    target_user = emp.user or db.query(User).filter(User.id == emp.user_id).first()
    if not target_user:
        target_user = db.query(User).filter(User.email == emp.email).first()

    if target_user and target_user.id == current_user.id:
        raise HTTPException(status_code=403, detail="You cannot convert your own active administrator account to a customer.")

    customer_role = db.query(Role).filter(Role.name == "customer").first()
    if not customer_role:
        customer_role = Role(name="customer", description="Customer Role", is_system=True, is_active=True)
        db.add(customer_role)
        db.flush()

    emp_name = emp.full_name
    emp_email = emp.email

    if target_user:
        target_user_roles = [r.name for r in target_user.roles] if target_user.roles else []
        if "owner" in target_user_roles:
            raise HTTPException(status_code=403, detail="The root Company Owner account cannot be converted to a customer.")
        
        target_user.roles = [customer_role]
        target_user.is_active = True

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_CONVERTED_TO_CUSTOMER",
        entity_type="Employee",
        entity_id=str(emp.id),
        old_values={"email": emp_email, "name": emp_name, "designation": emp.designation},
        new_values={"role": "customer"}
    )
    db.add(audit)

    db.delete(emp)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully transferred {emp_name} to Customer! Record moved to Customer Directory."
    }

@router.delete("/employees/{emp_id}")
def delete_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if emp.email in ["admin@unikart.in", "owner@unikart.in"]:
        raise HTTPException(status_code=403, detail="The root Administrator/Owner account cannot be deleted.")

    if emp.user_id == current_user.id or emp.email == current_user.email:
        raise HTTPException(status_code=403, detail="You cannot delete your own active administrator account.")

    emp_name = emp.full_name
    emp_email = emp.email
    target_user_id = emp.user_id

    # Clean up dependent records
    db.query(SalaryStructure).filter(SalaryStructure.employee_id == emp.id).delete(synchronize_session=False)
    db.query(AttendanceRecord).filter(AttendanceRecord.employee_id == emp.id).delete(synchronize_session=False)
    db.query(LeaveRequest).filter(LeaveRequest.employee_id == emp.id).delete(synchronize_session=False)
    db.query(Payslip).filter(Payslip.employee_id == emp.id).delete(synchronize_session=False)
    db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == emp.id).delete(synchronize_session=False)

    db.delete(emp)
    
    # Also delete user account if they don't have other dependencies
    if target_user_id:
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if target_user and target_user.id != current_user.id and target_user.email not in ["admin@unikart.in", "owner@unikart.in"]:
            db.delete(target_user)

    audit = AuditLog(
        user_id=current_user.id,
        action="EMPLOYEE_DELETED",
        entity_type="Employee",
        entity_id=str(emp_id),
        old_values={"email": emp_email, "name": emp_name}
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Personnel record for '{emp_name}' ({emp_email}) permanently deleted from system."
    }

@router.delete("/customers/{user_id}")
def delete_customer(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    from app.models.customer import Customer
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Customer account not found.")

    if target_user.id == current_user.id or target_user.email in ["admin@unikart.in", "owner@unikart.in"]:
        raise HTTPException(status_code=403, detail="Cannot delete administrative user accounts.")

    cust_name = target_user.full_name or target_user.email
    cust_email = target_user.email

    # Also clean up Customer record if exists
    cust = db.query(Customer).filter((Customer.user_id == user_id) | (Customer.email == cust_email)).first()
    if cust:
        db.delete(cust)

    # Clean up any Employee record linked
    emp = db.query(Employee).filter((Employee.user_id == user_id) | (Employee.email == cust_email)).first()
    if emp:
        db.delete(emp)

    db.delete(target_user)

    audit = AuditLog(
        user_id=current_user.id,
        action="CUSTOMER_DELETED",
        entity_type="User",
        entity_id=str(user_id),
        old_values={"email": cust_email, "name": cust_name}
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Customer account '{cust_name}' ({cust_email}) permanently removed from database."
    }

@router.patch("/customers/{user_id}/status")
def update_customer_status(
    user_id: int,
    payload: CustomerStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    from app.models.customer import Customer
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Customer user not found.")

    if target_user.id == current_user.id or target_user.email in ["admin@unikart.in", "owner@unikart.in"]:
        raise HTTPException(status_code=403, detail="Cannot suspend or deactivate root administrative accounts.")

    target_user.is_active = payload.is_active
    
    # Sync Customer table if exists
    cust = db.query(Customer).filter((Customer.user_id == user_id) | (Customer.email == target_user.email)).first()
    if cust and hasattr(cust, 'is_active'):
        cust.is_active = payload.is_active

    action_text = "Reactivated" if payload.is_active else "Banned / Suspended"
    audit = AuditLog(
        user_id=current_user.id,
        action="CUSTOMER_STATUS_CHANGED",
        entity_type="User",
        entity_id=str(user_id),
        new_values={"is_active": payload.is_active, "reason": payload.reason}
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "is_active": target_user.is_active,
        "message": f"Customer '{target_user.full_name or target_user.email}' has been successfully {action_text.lower()}."
    }


