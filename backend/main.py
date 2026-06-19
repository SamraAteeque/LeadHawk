from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import leads, emails, settings, agent
from database.connection import engine
from database import models

models.Base.metadata.create_all(bind=engine)

# Dynamic schema migrations
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE settings ADD COLUMN IF NOT EXISTS custom_prompt TEXT DEFAULT '';"))
        conn.commit()
    except Exception as e:
        print(f"Migration error (custom_prompt): {e}")

# Clean up any stuck runs from previous sessions on server startup
from database.connection import SessionLocal
from database.models import AgentRun
from sqlalchemy.sql import func

try:
    with SessionLocal() as db:
        db.query(AgentRun).filter(AgentRun.status == "running").update({
            "status": "failed",
            "error": "Stuck run cleaned up on server startup",
            "finished_at": func.now()
        })
        db.commit()
except Exception as e:
    print(f"Error cleaning up stuck agent runs: {e}")


app = FastAPI(title="LeadHawk AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads.router,    prefix="/api/leads",    tags=["leads"])
app.include_router(emails.router,   prefix="/api/emails",   tags=["emails"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(agent.router,    prefix="/api/agent",    tags=["agent"])

@app.get("/")
def root():
    return {"status": "LeadHawk AI running 🦅"}
