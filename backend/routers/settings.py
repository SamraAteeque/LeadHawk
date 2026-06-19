from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Settings

router = APIRouter()


@router.get("/")
def get_settings(db: Session = Depends(get_db)):
    s = db.query(Settings).first()
    if not s:
        # Return defaults
        return {
            "your_name":          "Samra Ateeque",
            "your_email":         "",
            "your_portfolio":     "samrateq.com",
            "target_cities":      ["Lucknow", "Kanpur", "Agra", "Varanasi"],
            "target_categories":  ["restaurants", "clinics", "boutiques", "salons"],
            "min_score":          60,
            "daily_email_limit":  30,
            "run_time":           "08:00",
            "anthropic_api_key":  "",
            "gmail_user":         "",
            "gmail_app_password": "",
            "linkedin_email":     "",
            "linkedin_password":  "",
            "custom_prompt":      "",
        }
    return _serialize(s)


@router.post("/")
def save_settings(body: dict, db: Session = Depends(get_db)):
    s = db.query(Settings).first()
    if not s:
        s = Settings()
        db.add(s)

    for field in [
        "your_name", "your_email", "your_portfolio",
        "target_cities", "target_categories",
        "min_score", "daily_email_limit", "run_time",
        "anthropic_api_key", "gmail_user", "gmail_app_password",
        "linkedin_email", "linkedin_password", "custom_prompt",
    ]:
        if field in body:
            # Prevent overwriting saved passwords with mask strings
            if field in ["gmail_app_password", "linkedin_password"] and body[field] == "***":
                continue
            setattr(s, field, body[field])

    db.commit()
    db.refresh(s)
    return _serialize(s)


def _serialize(s: Settings) -> dict:
    return {
        "your_name":          s.your_name,
        "your_email":         s.your_email,
        "your_portfolio":     s.your_portfolio,
        "target_cities":      s.target_cities or [],
        "target_categories":  s.target_categories or [],
        "min_score":          s.min_score,
        "daily_email_limit":  s.daily_email_limit,
        "run_time":           s.run_time,
        "anthropic_api_key":  s.anthropic_api_key or "",
        "gmail_user":         s.gmail_user or "",
        "gmail_app_password": "***" if s.gmail_app_password else "",
        "linkedin_email":     s.linkedin_email or "",
        "linkedin_password":  "***" if s.linkedin_password else "",
        "custom_prompt":      s.custom_prompt or "",
    }
