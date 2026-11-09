import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.auth import User
from app.models.governance import ApprovalRequest
from app.models.finance import AuditLog
from app.api.v1.superadmin.deps import get_current_superadmin

router = APIRouter(prefix="/approvals", tags=["Admin Approvals Center"])

class ApprovalCreate(BaseModel):
    approval_type: str # REFUND_OVERRIDE, DISCOUNT_OVERRIDE, STOCK_WRITEOFF, PRICE_UPDATE, PAYROLL_APPROVAL, ROLE_PERMISSION_CHANGE
    title: str
    store_id: Optional[int] = None
    entity_type: str
    entity_id: str
    amount_paise: Optional[int] = None
    reason: str
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None

class ApprovalReview(BaseModel):
    status: str # APPROVED, REJECTED
    comment: Optional[str] = None
    reviewer_remarks: Optional[str] = None

@router.get("")
def list_approval_requests(
    status_filter: Optional[str] = Query(None),
    approval_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    q = db.query(ApprovalRequest)
    if status_filter:
        q = q.filter(ApprovalRequest.status == status_filter.upper())
    if approval_type:
        q = q.filter(ApprovalRequest.approval_type == approval_type.upper())

    approvals = q.order_by(ApprovalRequest.created_at.desc()).all()
    results = []
    for a in approvals:
        results.append({
            "id": a.id,
            "approval_type": a.approval_type,
            "title": a.title,
            "requested_by": a.requested_by.full_name if a.requested_by else "Staff",
            "requested_by_email": a.requested_by.email if a.requested_by else "",
            "store_name": a.store.name if a.store else "Global / HQ",
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "amount_paise": a.amount_paise,
            "reason": a.reason,
            "status": a.status,
            "before_state": a.before_state,
            "after_state": a.after_state,
            "reviewed_by": a.reviewed_by.full_name if a.reviewed_by else None,
            "reviewed_at": a.reviewed_at.isoformat() if a.reviewed_at else None,
            "review_comment": a.review_comment,
            "created_at": a.created_at.isoformat()
        })
    return results

@router.post("")
def create_approval_request(
    app_in: ApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    new_req = ApprovalRequest(
        approval_type=app_in.approval_type.upper().strip(),
        title=app_in.title.strip(),
        requested_by_id=current_user.id,
        store_id=app_in.store_id,
        entity_type=app_in.entity_type.strip(),
        entity_id=app_in.entity_id.strip(),
        amount_paise=app_in.amount_paise,
        reason=app_in.reason.strip(),
        before_state=app_in.before_state,
        after_state=app_in.after_state,
        status="PENDING"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return {"message": "Approval request submitted", "id": new_req.id}

@router.patch("/{approval_id}/review")
def review_approval_request(
    approval_id: int,
    review_in: ApprovalReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin)
):
    req = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found.")
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="This request has already been reviewed.")

    req.status = review_in.status.upper().strip()
    req.review_comment = review_in.comment or review_in.reviewer_remarks
    req.reviewed_by_id = current_user.id
    req.reviewed_at = datetime.datetime.utcnow()

    audit = AuditLog(
        user_id=current_user.id,
        action=f"APPROVAL_{req.status}",
        entity_type="ApprovalRequest",
        entity_id=str(req.id),
        new_values={"status": req.status, "type": req.approval_type, "comment": req.review_comment}
    )
    db.add(audit)
    db.commit()

    return {"message": f"Approval request {req.status.lower()} successfully", "id": req.id, "status": req.status}
