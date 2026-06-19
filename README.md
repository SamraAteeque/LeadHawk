# 🦅 LeadHawk AI

> Autonomous lead generation agent for freelance web developers.  
> Finds businesses without websites on Google Maps, Instagram & LinkedIn — generates personalized cold emails via Claude AI — sends them automatically.

---

## What it does

- 🔍 Scrapes **Google Maps, Instagram, LinkedIn** daily
- 🎯 Finds businesses with **NO website**
- 🤖 Writes personalized cold emails using **Claude AI**
- 📤 Auto-sends via **Gmail SMTP**
- 📊 **Dashboard** with metrics, lead table, email preview, filters

---

## Tech Stack

| Layer     | Tech                                         |
|-----------|----------------------------------------------|
| Frontend  | Next.js 14, TypeScript, Tailwind CSS         |
| Backend   | Python, FastAPI, SQLAlchemy                  |
| Scraping  | Playwright (headless Chromium)               |
| AI        | Claude API (Anthropic) — claude-sonnet-4-6   |
| Email     | Gmail SMTP + App Password                    |
| Database  | PostgreSQL                                   |

---

## Setup Guide (Windows)

### 1. Install Prerequisites

- **Python 3.12**: https://python.org/downloads (✅ tick "Add to PATH")
- **Node.js 18+**: https://nodejs.org
- **PostgreSQL**: https://postgresql.org/download/windows (remember password: `postgres`)

### 2. Extract Project

```
leadhawk-ai/
├── backend/
└── frontend/
```

### 3. Backend Setup

```bash
cd leadhawk-ai/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

Copy and fill `.env`:
```bash
copy .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leadhawk
ANTHROPIC_API_KEY=sk-ant-api03-...        # console.anthropic.com
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   # see below
LINKEDIN_EMAIL=your_linkedin@email.com    # optional
LINKEDIN_PASSWORD=your_password           # optional
```

**Gmail App Password:**
1. myaccount.google.com
2. Security → 2-Step Verification → ON
3. Search "App Passwords" → Create one → Copy 16-char password

### 4. Create Database

Open **pgAdmin** → Servers → PostgreSQL → Databases → right-click → **Create → Database** → Name: `leadhawk` → Save

### 5. Run Backend

```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```

Backend at: **http://localhost:8000**  
API docs at: **http://localhost:8000/docs**

### 6. Frontend Setup

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Dashboard at: **http://localhost:3000**

---

## First Run

1. Open **http://localhost:3000/settings**
2. Fill in your name, email, portfolio
3. Add your API keys and Gmail credentials
4. Set target cities + categories
5. Go to **Dashboard** → click **"Run Agent Now"**
6. Watch leads come in! 🦅

---

## Auto-Run Daily (Windows Task Scheduler)

1. Open **Task Scheduler** (search in Start menu)
2. **Create Basic Task** → Daily → 8:00 AM
3. Action: **Start a program**
4. Program: `C:\path\to\leadhawk-ai\backend\venv\Scripts\python.exe`
5. Arguments: `agent\scheduler.py`
6. Start in: `C:\path\to\leadhawk-ai\backend`

---

## Pages

| Page       | URL              | Description                              |
|------------|------------------|------------------------------------------|
| Dashboard  | /                | Metrics, today's leads, email preview    |
| All Leads  | /leads           | Full lead list with filters & pagination |
| Emails     | /emails          | All AI-generated emails + status         |
| Settings   | /settings        | Agent config, API keys, cities, schedule |

---

## Project Structure

```
leadhawk-ai/
├── backend/
│   ├── agent/
│   │   └── scheduler.py          # Daily runner (orchestrates everything)
│   ├── scrapers/
│   │   ├── google_maps.py        # Playwright scraper
│   │   ├── instagram.py          # Hashtag + profile scraper
│   │   └── linkedin.py           # Company page scraper
│   ├── emails/
│   │   ├── generator.py          # Claude API email writer
│   │   └── sender.py             # Gmail SMTP sender
│   ├── database/
│   │   ├── models.py             # SQLAlchemy models
│   │   └── connection.py         # DB session
│   ├── routers/
│   │   ├── leads.py              # GET/PATCH leads API
│   │   ├── emails.py             # Generate + send emails API
│   │   ├── settings.py           # Config API
│   │   └── agent.py              # Trigger + status API
│   ├── main.py                   # FastAPI app
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx              # Dashboard
    │   ├── leads/page.tsx        # All Leads
    │   ├── emails/page.tsx       # Emails
    │   └── settings/page.tsx     # Settings
    ├── components/
    │   └── Sidebar.tsx           # Sidebar + agent pulse
    ├── globals.css               # Design system
    └── package.json
```

---

## Resume Description

> Built an autonomous AI lead generation agent using Python, FastAPI, Playwright & Claude API that scrapes Google Maps, Instagram, and LinkedIn daily, identifies businesses without websites, and sends AI-personalized cold outreach emails via Gmail — fully automated with a Next.js + TypeScript dashboard featuring real-time agent status, lead scoring, email preview, and a full settings panel.

---

Built by **Samra Ateeque** — [samrateq.com](https://samrateq.com)
