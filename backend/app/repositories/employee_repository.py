from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.hr import Employee

class EmployeeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, employee_id: int) -> Optional[Employee]:
        return self.db.query(Employee).filter(Employee.id == employee_id).first()

    def get_by_email(self, email: str) -> Optional[Employee]:
        return self.db.query(Employee).filter(Employee.email == email).first()

    def get_all(self, limit: int = 100, offset: int = 0) -> List[Employee]:
        return self.db.query(Employee).offset(offset).limit(limit).all()

    def create(self, employee: Employee) -> Employee:
        self.db.add(employee)
        self.db.flush()
        return employee
