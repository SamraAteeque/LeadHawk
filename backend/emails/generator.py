import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")


def generate_email(lead: dict, settings: dict, template: str = "direct") -> dict:

    source_label = {
        "google_maps": "Google Maps",
        "instagram": "Instagram",
        "linkedin": "LinkedIn",
    }.get(lead.get("source", ""), "online")

    rating = lead.get("rating", "0")
    rating_str = f"{rating}/5 stars" if rating != "0" else "no ratings yet"

    # Define template-specific instructions
    if template == "audit":
        template_instruction = f"""
Focus on a "Web Presence & Local SEO Audit". Mention that their rating of {rating_str} on {source_label} shows great customer interest, but they are leaving money on the table because without a website, they cannot capture Google search traffic. Suggest a quick audit check.
"""
    elif template == "mockup":
        template_instruction = """
Focus on a "Free Visual Mockup". Mention you loved their brand image and spent 15 minutes drafting a clean homepage layout concept customized for them. Ask if you can email or WhatsApp them a screenshot of this mockup to see what they think.
"""
    elif template == "social_proof":
        template_instruction = f"""
Focus on "Social Proof & Local Impact". Highlight that you help other local {lead.get('category')} businesses get discovered online. Explain how a fast, responsive site helps turn searchers into paying clients.
"""
    else: # direct
        template_instruction = """
Focus on a "Direct Value Pitch". Keep it extremely brief and direct. Say you noticed they don't have a website yet, and you build clean, modern websites for local businesses that help them look professional and get more clients.
"""

    custom_style = ""
    if settings.get("custom_prompt"):
        custom_style = f"\nAdditional styling/tone instructions: {settings.get('custom_prompt')}"

    prompt = f"""
You are writing a short, personalized cold email from a freelance web developer to a business owner.

Business details:
- Name: {lead.get('biz_name')}
- Category: {lead.get('category')}
- City: {lead.get('city')}
- Found on: {source_label}
- Rating: {rating_str}
- Website: They have NO website

Developer details:
- Name: {settings.get('your_name', 'Samra')}
- Portfolio: {settings.get('your_portfolio', 'samrateq.com')}

Outreach Pitch Style:
{template_instruction}
{custom_style}

Write a cold email with:
1. A compelling, specific subject line (mention their business name)
2. A short email body (max 120 words)
3. Sound human, authentic, warm, and avoid spammy or sales-heavy words. Do not sound like a template.

Respond ONLY in this JSON format:
{{"subject":"...","body":"..."}}
"""

    response = model.generate_content(prompt)

    text = response.text.strip()

    # Remove markdown if Gemini adds it
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except Exception:
        return {
            "subject": f"Website proposal for {lead.get('biz_name')}",
            "body": text
        }


def generate_whatsapp(lead: dict, settings: dict) -> str:
    source_label = {
        "google_maps": "Google Maps",
        "instagram": "Instagram",
        "linkedin": "LinkedIn",
    }.get(lead.get("source", ""), "online")

    prompt = f"""
You are writing a very short, friendly, personalized cold WhatsApp message from a freelance web developer to a small business owner.

Business details:
- Name: {lead.get('biz_name')}
- Category: {lead.get('category')}
- City: {lead.get('city')}
- Found on: {source_label}
- They have NO website

Developer details:
- Name: {settings.get('your_name', 'Samra')}
- Portfolio: {settings.get('your_portfolio', 'samrateq.com')}

Write a short, professional but friendly WhatsApp message (max 60 words).
Keep it conversational, casual, and brief. Mention their business name and that you noticed they don't have a website yet. Avoid formal email-like greetings (no "Dear Sir/Madam", keep it to "Hi!" or "Hello!"). End with a brief, friendly call to action.
Only return the plain text of the message, nothing else. Do not wrap in JSON or quotes.
"""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Hi! I noticed {lead.get('biz_name')} doesn't have a website yet. I build clean, fast websites for local businesses. Let me know if you'd be open to a quick chat! - {settings.get('your_name', 'Samra')}"