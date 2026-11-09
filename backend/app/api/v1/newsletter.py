import re
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.finance import NewsletterSubscriber

router = APIRouter(prefix="/newsletter", tags=["Newsletter"])

class NewsletterSubscribeRequest(BaseModel):
    email: EmailStr

@router.post("/subscribe")
def subscribe_to_newsletter(
    req: NewsletterSubscribeRequest,
    db: Session = Depends(get_db)
):
    """
    Subscribes a customer email address to UNIKART VIP newsletter alerts.
    Gracefully handles duplicates by confirming existing active subscription.
    Persists real subscriber record in database.
    """
    email_clean = req.email.strip().lower()
    
    # Check if subscriber already exists
    existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == email_clean).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            return {
                "success": True,
                "message": "Welcome back! Your UNIKART VIP newsletter subscription has been reactivated.",
                "email": email_clean
            }
        return {
            "success": True,
            "already_subscribed": True,
            "message": "You are already an active subscriber to UNIKART VIP newsletter alerts!",
            "email": email_clean
        }

    # Record new subscriber
    sub = NewsletterSubscriber(
        email=email_clean,
        is_active=True,
        subscribed_at=datetime.datetime.utcnow()
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    return {
        "success": True,
        "message": "Thank you! You have successfully subscribed to UNIKART VIP member privileges and deals.",
        "email": email_clean
    }
