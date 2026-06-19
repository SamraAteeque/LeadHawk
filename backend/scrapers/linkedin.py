"""
LinkedIn scraper — finds small business pages / solo founders with no website.
Uses Google Search to bypass LinkedIn's CAPTCHA and login requirements.
"""
import asyncio
import re
from playwright.async_api import async_playwright
from typing import List, Dict


async def scrape_linkedin(
    city: str,
    category: str,
    max_results: int = 15,
    email: str = None,
    password: str = None
) -> List[Dict]:
    leads = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        query = f"site:linkedin.com/company \"{city}\" \"{category}\""
        google_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"

        try:
            await page.goto(google_url, timeout=30000)
            await page.wait_for_timeout(3000)

            links = await page.query_selector_all("a")
            for link in links:
                if len(leads) >= max_results:
                    break
                
                href = await link.get_attribute("href")
                h3 = await link.query_selector("h3")
                
                if href and h3 and "linkedin.com/company" in href:
                    title = await h3.inner_text()
                    
                    # Clean title (e.g. "Tasty Bites: About | LinkedIn")
                    name = title.split("|")[0].split(":")[0].replace("LinkedIn", "").strip()
                    if not name:
                        continue

                    # Trace parent and look for snippet
                    parent = link
                    desc = ""
                    for _ in range(6):
                        parent_handle = await parent.get_property("parentNode")
                        if not parent_handle:
                            break
                        parent_el = parent_handle.as_element()
                        if not parent_el:
                            break
                        parent = parent_el
                        snippet_el = await parent.query_selector("div.VwiC3b, div.Y5FYJe, div.MU112")
                        if snippet_el:
                            desc = await snippet_el.inner_text()
                            break
                        
                    score = _calculate_score(desc)

                    leads.append({
                        "biz_name":    name.strip(),
                        "category":    category,
                        "city":        city,
                        "phone":       None,
                        "email":       None,
                        "source":      "linkedin",
                        "source_url":  href,
                        "score":       score,
                        "has_website": False,
                        "raw_data":    {"description": desc[:300], "source": "google_search"},
                    })
        except Exception as e:
            print(f"[LinkedIn] Google search failed: {e}")
            
        await browser.close()

    return leads


def _calculate_score(size: str) -> float:
    score = 60.0
    if "Self-employed" in size or "1-10" in size or "2-10" in size:
        score += 20   # Tiny business — high need for a website
    elif "11-50" in size:
        score += 10
    return min(score, 100.0)
