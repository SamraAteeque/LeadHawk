"""
LeadHawk AI — daily agent runner.
Orchestrates scraping → dedup → scoring → email generation → sending.

Run manually:  python agent/scheduler.py
Auto-run:      Windows Task Scheduler (see README)
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Force UTF-8 encoding for stdout/stderr to avoid Windows charmap encoding crashes
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from datetime import datetime, date
from database.connection import SessionLocal
from database.models import Lead, Email, Settings, AgentRun
from scrapers.google_maps import scrape_google_maps
from scrapers.instagram   import scrape_instagram
from scrapers.linkedin    import scrape_linkedin
from emails.generator     import generate_email
from emails.sender        import send_email


async def run_agent():
    db = SessionLocal()
    run = AgentRun(status="running", sources=["google_maps", "instagram", "linkedin"])
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        settings_row = db.query(Settings).first()
        if not settings_row:
            print("[Agent] No settings configured. Go to /settings first.")
            run.status = "failed"
            run.error  = "No settings configured"
            db.commit()
            return

        settings = {
            "your_name":          settings_row.your_name,
            "your_email":         settings_row.your_email,
            "your_portfolio":     settings_row.your_portfolio,
            "gmail_user":         settings_row.gmail_user,
            "gmail_app_password": settings_row.gmail_app_password,
            "linkedin_email":     settings_row.linkedin_email,
            "linkedin_password":  settings_row.linkedin_password,
        }

        cities     = settings_row.target_cities     or ["Lucknow"]
        categories = settings_row.target_categories or ["restaurants"]
        min_score  = settings_row.min_score         or 60
        email_limit = settings_row.daily_email_limit or 30

        emails_sent = 0

        def process_and_save_leads(leads_list):
            nonlocal emails_sent
            if not leads_list:
                return
            print(f"[Agent] Processing {len(leads_list)} raw leads...", flush=True)
            for lead_data in leads_list:
                exists = db.query(Lead).filter(
                    Lead.biz_name == lead_data["biz_name"],
                    Lead.city     == lead_data["city"],
                ).first()
                if exists:
                    continue

                lead = Lead(**lead_data)
                db.add(lead)
                db.flush()

                run.leads_found = (run.leads_found or 0) + 1
                print(f"[Agent] Saved new lead: {lead.biz_name} in {lead.city} (Score: {lead.score})", flush=True)

                # ── Generate + send email if score high enough & has email ─────
                if (lead_data["score"] >= min_score
                        and lead_data.get("email")
                        and emails_sent < email_limit):
                    try:
                        email_content = generate_email(lead_data, settings)
                        email_row = Email(
                            lead_id = lead.id,
                            subject = email_content["subject"],
                            body    = email_content["body"],
                            status  = "draft",
                        )
                        db.add(email_row)
                        db.flush()

                        success = send_email(
                            to_email           = lead_data["email"],
                            subject            = email_content["subject"],
                            body               = email_content["body"],
                            gmail_user         = settings["gmail_user"],
                            gmail_app_password = settings["gmail_app_password"],
                        )

                        if success:
                            email_row.status  = "sent"
                            email_row.sent_at = datetime.utcnow()
                            lead.status       = "email_sent"
                            emails_sent      += 1
                            run.emails_sent   = emails_sent
                            print(f"[Agent] Sent email to {lead.biz_name} ({lead_data['email']})", flush=True)

                    except Exception as e:
                        print(f"[Agent] Email error for {lead_data['biz_name']}: {e}", flush=True)
            db.commit()

        # ── Scrape all sources ────────────────────────────────────────────────
        for city in cities:
            for category in categories:
                print(f"\n[Agent] --- Scopes: {category} in {city} ---", flush=True)
                
                print(f"[Agent] Scraping Google Maps...", flush=True)
                gm = await scrape_google_maps(city, category)
                process_and_save_leads(gm)

                print(f"[Agent] Scraping Instagram...", flush=True)
                ig = await scrape_instagram(city, category)
                process_and_save_leads(ig)

                print(f"[Agent] Scraping LinkedIn...", flush=True)
                li = await scrape_linkedin(
                    city,
                    category,
                    email=settings["linkedin_email"],
                    password=settings["linkedin_password"]
                )
                process_and_save_leads(li)

        run.status      = "done"
        run.finished_at = datetime.utcnow()
        db.commit()
        print(f"\n[Agent] Done. Total Leads Saved: {run.leads_found} | Emails sent: {run.emails_sent}", flush=True)

    except Exception as e:
        print(f"[Agent] Fatal error: {e}")
        run.status = "failed"
        run.error  = str(e)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run_agent())
