from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from database.connection import get_db
from database.models import Lead, Settings
from emails.generator import generate_whatsapp
from datetime import date
from typing import Optional

router = APIRouter()


@router.get("/")
def get_leads(
    db:      Session         = Depends(get_db),
    status:  Optional[str]   = None,
    source:  Optional[str]   = None,
    city:    Optional[str]   = None,
    date_filter: Optional[str] = Query(None, alias="date"),
    limit:   int             = 50,
    offset:  int             = 0,
):
    q = db.query(Lead)
    if status:
        q = q.filter(Lead.status == status)
    if source:
        q = q.filter(Lead.source == source)
    if city:
        q = q.filter(Lead.city.ilike(f"%{city}%"))
    if date_filter == "today":
        q = q.filter(cast(Lead.created_at, Date) == date.today())

    total  = q.count()
    leads  = q.order_by(Lead.score.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "leads": [_serialize(l) for l in leads],
    }


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    today = date.today()

    today_leads  = db.query(func.count(Lead.id)).filter(
        cast(Lead.created_at, Date) == today).scalar()
    total_leads  = db.query(func.count(Lead.id)).scalar()
    emails_sent  = db.query(func.count(Lead.id)).filter(
        Lead.status.in_(["email_sent", "replied"])).scalar()
    replied      = db.query(func.count(Lead.id)).filter(
        Lead.status == "replied").scalar()
    reply_rate   = round((replied / emails_sent * 100), 1) if emails_sent else 0

    by_source = db.query(Lead.source, func.count(Lead.id)).group_by(Lead.source).all()

    return {
        "today_leads":  today_leads,
        "total_leads":  total_leads,
        "emails_sent":  emails_sent,
        "replied":      replied,
        "reply_rate":   reply_rate,
        "by_source":    {src: cnt for src, cnt in by_source},
    }


@router.patch("/{lead_id}/status")
def update_status(lead_id: int, body: dict, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": "Lead not found"}
    lead.status = body.get("status", lead.status)
    db.commit()
    return _serialize(lead)


@router.patch("/{lead_id}")
def update_lead(lead_id: int, body: dict, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": "Lead not found"}

    if "status" in body:
        lead.status = body["status"]
    if "email" in body:
        # Save empty string as None to align with DB representation
        lead.email = body["email"] if body["email"] else None
    if "phone" in body:
        lead.phone = body["phone"] if body["phone"] else None
    if "biz_name" in body:
        lead.biz_name = body["biz_name"]

    db.commit()
    return _serialize(lead)


@router.post("/{lead_id}/generate-whatsapp")
def generate_whatsapp_route(lead_id: int, db: Session = Depends(get_db)):
    lead     = db.query(Lead).filter(Lead.id == lead_id).first()
    settings = db.query(Settings).first()
    if not lead:
        return {"error": "Lead not found"}

    settings_dict = {
        "your_name":      settings.your_name      if settings else "Samra",
        "your_portfolio": settings.your_portfolio if settings else "samrateq.com",
    }

    message = generate_whatsapp({
        "biz_name": lead.biz_name,
        "category": lead.category,
        "city":     lead.city,
        "source":   lead.source,
    }, settings_dict)

    return {"message": message}


@router.post("/{lead_id}/audit")
def audit_lead_route(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": "Lead not found"}

    # Compute audit checklist
    rating = "0"
    if lead.raw_data and isinstance(lead.raw_data, dict):
        rating = lead.raw_data.get("rating", "0")

    checklist = []
    
    # 1. Website Status (always fail as we search for leads without websites)
    checklist.append({
        "label": "Website Presence",
        "status": "fail",
        "detail": "No official website found. Missing out on direct search traffic."
    })

    # 2. Google Business Rating
    try:
        r_val = float(rating) if rating else 0
    except ValueError:
        r_val = 0

    if r_val >= 4.2:
        checklist.append({
            "label": "Google Maps Rating",
            "status": "pass",
            "detail": f"Strong rating of {rating}/5 stars. Great customer satisfaction!"
        })
    elif r_val > 0:
        checklist.append({
            "label": "Google Maps Rating",
            "status": "warning",
            "detail": f"Rating is {rating}/5 stars. Needs optimization to beat competitors."
        })
    else:
        checklist.append({
            "label": "Google Maps Rating",
            "status": "warning",
            "detail": "No rating or low rating found on Google Maps."
        })

    # 3. Contact Info
    if lead.phone:
        checklist.append({
            "label": "Direct Contact",
            "status": "pass",
            "detail": f"Phone number ({lead.phone}) is listed."
        })
    else:
        checklist.append({
            "label": "Direct Contact",
            "status": "fail",
            "detail": "No phone number listed. Customers cannot call you directly."
        })

    # 4. Social Media
    if lead.source in ["instagram", "linkedin"]:
        checklist.append({
            "label": "Social Channels",
            "status": "pass",
            "detail": f"Found on {lead.source.replace('_', ' ').capitalize()}. Ready for landing page traffic."
        })
    else:
        checklist.append({
            "label": "Social Channels",
            "status": "warning",
            "detail": "No active social profiles detected during scan."
        })

    # Construct the copyable text report
    score_display = int(lead.score) if lead.score else 50
    status_summary = "Needs Attention" if score_display < 80 else "Good Potential"
    
    audit_text = f"🦅 LEADHAWK PRESENCE AUDIT — {lead.biz_name}\n"
    audit_text += "=" * 50 + "\n"
    audit_text += f"Overall Score: {score_display}/100 ({status_summary})\n\n"
    
    for item in checklist:
        mark = "❌" if item["status"] == "fail" else "⚠️" if item["status"] == "warning" else "✅"
        audit_text += f"{mark} {item['label']}\n"
        audit_text += f"   {item['detail']}\n\n"
        
    audit_text += "=" * 50 + "\n"
    audit_text += "Generated by LeadHawk AI 🦅"

    return {
        "score": score_display,
        "checklist": checklist,
        "audit_text": audit_text
    }


def _serialize(l: Lead) -> dict:
    return {
        "id":         l.id,
        "biz_name":   l.biz_name,
        "category":   l.category,
        "city":       l.city,
        "phone":      l.phone,
        "email":      l.email,
        "source":     l.source,
        "source_url": l.source_url,
        "score":      l.score,
        "status":     l.status,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }
