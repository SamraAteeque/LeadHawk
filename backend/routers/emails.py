from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Email, Lead, Settings
from emails.generator import generate_email
from emails.sender    import send_email
from datetime         import datetime

router = APIRouter()


@router.get("/")
def get_emails(db: Session = Depends(get_db)):
    emails = db.query(Email).order_by(Email.created_at.desc()).limit(100).all()
    return [_serialize(e) for e in emails]


@router.post("/generate/{lead_id}")
def generate_for_lead(lead_id: int, template: str = "direct", db: Session = Depends(get_db)):
    lead     = db.query(Lead).filter(Lead.id == lead_id).first()
    settings = db.query(Settings).first()
    if not lead:
        return {"error": "Lead not found"}

    settings_dict = {
        "your_name":      settings.your_name      if settings else "Samra",
        "your_portfolio": settings.your_portfolio if settings else "samrateq.com",
        "custom_prompt":  settings.custom_prompt  if settings else "",
    }

    # Pass rating if available in lead
    rating = "0"
    if lead.raw_data and isinstance(lead.raw_data, dict):
        rating = lead.raw_data.get("rating", "0")

    content = generate_email({
        "biz_name": lead.biz_name,
        "category": lead.category,
        "city":     lead.city,
        "source":   lead.source,
        "score":    lead.score,
        "rating":   rating,
    }, settings_dict, template=template)

    email = Email(
        lead_id = lead_id,
        subject = content["subject"],
        body    = content["body"],
        status  = "draft",
    )
    db.add(email)
    db.commit()
    db.refresh(email)
    return _serialize(email)



@router.post("/send/{email_id}")
def send_email_route(email_id: int, db: Session = Depends(get_db)):
    email_row = db.query(Email).filter(Email.id == email_id).first()
    lead      = db.query(Lead).filter(Lead.id == email_row.lead_id).first()
    settings  = db.query(Settings).first()

    if not email_row or not lead or not lead.email:
        return {"error": "Cannot send — missing email or lead"}

    success = send_email(
        to_email           = lead.email,
        subject            = email_row.subject,
        body               = email_row.body,
        gmail_user         = settings.gmail_user         if settings else None,
        gmail_app_password = settings.gmail_app_password if settings else None,
    )

    if success:
        email_row.status  = "sent"
        email_row.sent_at = datetime.utcnow()
        lead.status       = "email_sent"
        db.commit()
        return {"success": True}
    return {"error": "Send failed — check Gmail credentials in Settings"}


def _serialize(e: Email) -> dict:
    return {
        "id":         e.id,
        "lead_id":    e.lead_id,
        "subject":    e.subject,
        "body":       e.body,
        "status":     e.status,
        "sent_at":    e.sent_at.isoformat() if e.sent_at else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
