from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.hr import Employee

class EmployeeService:
    @staticmethod
    def get_employee_by_id(db: Session, employee_id: int) -> Optional[Employee]:
        return db.query(Employee).filter(Employee.id == employee_id).first()

    @staticmethod
    def get_employee_by_code(db: Session, code: str) -> Optional[Employee]:
        return db.query(Employee).filter(Employee.code == code).first()

    @staticmethod
    def get_active_employees(db: Session, limit: int = 100) -> List[Employee]:
        return db.query(Employee).filter(Employee.employment_status == "ACTIVE").limit(limit).all()
