from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import AgentRun
import asyncio
import subprocess
import sys
import os

from pydantic import BaseModel
from typing import List, Optional
from emails.generator import model as gen_model
from database.models import Lead

router = APIRouter()

active_subprocess = None


class CopilotMessage(BaseModel):
    role: str
    content: str


class CopilotRequest(BaseModel):
    messages: List[CopilotMessage]
    lead_id: Optional[int] = None


@router.post("/copilot")
def copilot_chat(req: CopilotRequest, db: Session = Depends(get_db)):
    context = ""
    if req.lead_id:
        lead = db.query(Lead).filter(Lead.id == req.lead_id).first()
        if lead:
            context = f"""
The developer is currently looking at this lead:
- Business Name: {lead.biz_name}
- Category: {lead.category}
- City: {lead.city}
- Platform: {lead.source}
- Phone: {lead.phone or 'Not listed'}
- Email: {lead.email or 'Not listed'}
- Score: {lead.score}
"""

    system_instruction = f"""You are LeadHawk AI Copilot, a helpful AI assistant for freelance web developers.
You help them draft cold emails, WhatsApp messages, handle objections, or think of local SEO strategies.
Be friendly, direct, professional, and concise (under 150 words).

{context}
"""

    # Format history for Gemini call
    prompt_parts = [system_instruction]
    for msg in req.messages[:-1]:
        prompt_parts.append(f"{msg.role.upper()}: {msg.content}")
    
    # Add last user input
    last_msg = req.messages[-1].content
    prompt_parts.append(f"USER: {last_msg}")
    prompt = "\n\n".join(prompt_parts)

    try:
        response = gen_model.generate_content(prompt)
        reply = response.text.strip()
    except Exception as e:
        reply = f"Sorry, I had trouble contacting Gemini API. Error: {str(e)}"

    return {"reply": reply}



@router.post("/run")
def trigger_run(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Trigger the agent to run in the background."""
    background_tasks.add_task(_run_agent_subprocess)
    return {"status": "started", "message": "Agent is running in background"}


@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    """Get the status of the latest agent run."""
    latest = db.query(AgentRun).order_by(AgentRun.id.desc()).first()
    if not latest:
        return {"status": "never_run", "leads_found": 0, "emails_sent": 0}
    return {
        "status":       latest.status,
        "leads_found":  latest.leads_found,
        "emails_sent":  latest.emails_sent,
        "started_at":   latest.started_at.isoformat() if latest.started_at else None,
        "finished_at":  latest.finished_at.isoformat() if latest.finished_at else None,
        "error":        latest.error,
    }


@router.get("/runs")
def get_runs(db: Session = Depends(get_db)):
    runs = db.query(AgentRun).order_by(AgentRun.id.desc()).limit(20).all()
    return [
        {
            "id":          r.id,
            "status":      r.status,
            "leads_found": r.leads_found,
            "emails_sent": r.emails_sent,
            "started_at":  r.started_at.isoformat() if r.started_at else None,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        }
        for r in runs
    ]


@router.post("/stop")
def stop_run(db: Session = Depends(get_db)):
    """Stop the currently running agent subprocess."""
    global active_subprocess
    if active_subprocess and active_subprocess.poll() is None:
        active_subprocess.terminate()
        try:
            active_subprocess.wait(timeout=5)
        except subprocess.TimeoutExpired:
            active_subprocess.kill()
        
        # Mark the latest active run as failed/stopped in the database
        latest = db.query(AgentRun).order_by(AgentRun.id.desc()).first()
        if latest and latest.status == "running":
            latest.status = "failed"
            latest.error = "Agent stopped by user"
            from datetime import datetime
            latest.finished_at = datetime.utcnow()
            db.commit()
            
        active_subprocess = None
        return {"status": "stopped", "message": "Agent has been stopped"}
    
    # Check if DB has a stuck running state
    latest = db.query(AgentRun).order_by(AgentRun.id.desc()).first()
    if latest and latest.status == "running":
        latest.status = "failed"
        latest.error = "Agent stopped by user"
        from datetime import datetime
        latest.finished_at = datetime.utcnow()
        db.commit()
        return {"status": "stopped", "message": "Agent run status reset in database"}
        
    return {"status": "not_running", "message": "Agent is not currently running"}


def _run_agent_subprocess():
    """Run the agent as a subprocess so it doesn't block the API."""
    global active_subprocess
    backend_dir   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scheduler_path = os.path.join(backend_dir, "agent", "scheduler.py")
    python_exe    = sys.executable

    # Copy environment and set UTF-8 encoding variables to prevent Windows stdout crashes
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"

    active_subprocess = subprocess.Popen([python_exe, scheduler_path], cwd=backend_dir, env=env)
    active_subprocess.wait()
    active_subprocess = None
