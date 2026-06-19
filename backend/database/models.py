from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, JSON
from sqlalchemy.sql import func
from database.connection import Base

class Lead(Base):
    __tablename__ = "leads"

    id          = Column(Integer, primary_key=True, index=True)
    biz_name    = Column(String(255), nullable=False)
    category    = Column(String(100))
    city        = Column(String(100))
    phone       = Column(String(50))
    email       = Column(String(255))
    source      = Column(String(50))   # google_maps | instagram | linkedin
    source_url  = Column(Text)
    score       = Column(Float, default=0)
    has_website = Column(Boolean, default=False)
    status      = Column(String(50), default="new")  # new | email_sent | replied | skipped
    raw_data    = Column(JSON)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())


class Email(Base):
    __tablename__ = "emails"

    id         = Column(Integer, primary_key=True, index=True)
    lead_id    = Column(Integer, nullable=False)
    subject    = Column(Text)
    body       = Column(Text)
    status     = Column(String(50), default="draft")  # draft | sent | opened | replied
    sent_at    = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Settings(Base):
    __tablename__ = "settings"

    id                 = Column(Integer, primary_key=True, index=True)
    your_name          = Column(String(100), default="Samra Ateeque")
    your_email         = Column(String(255))
    your_portfolio     = Column(String(255), default="samrateq.com")
    target_cities      = Column(JSON, default=["Lucknow", "Kanpur", "Agra", "Varanasi"])
    target_categories  = Column(JSON, default=["restaurants", "clinics", "boutiques", "salons"])
    min_score          = Column(Integer, default=60)
    daily_email_limit  = Column(Integer, default=30)
    run_time           = Column(String(10), default="08:00")
    anthropic_api_key  = Column(String(255))
    gmail_user         = Column(String(255))
    gmail_app_password = Column(String(255))
    linkedin_email     = Column(String(255))
    linkedin_password  = Column(String(255))
    custom_prompt      = Column(Text, default="")
    updated_at         = Column(DateTime(timezone=True), onupdate=func.now())


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id           = Column(Integer, primary_key=True, index=True)
    status       = Column(String(50), default="running")  # running | done | failed
    leads_found  = Column(Integer, default=0)
    emails_sent  = Column(Integer, default=0)
    sources      = Column(JSON)
    error        = Column(Text)
    started_at   = Column(DateTime(timezone=True), server_default=func.now())
    finished_at  = Column(DateTime(timezone=True))
