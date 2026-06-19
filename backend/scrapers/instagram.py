"""
Instagram scraper — finds business accounts in target cities that have no website link.
Uses Google Search to bypass Instagram's login walls.
"""
import asyncio
import re
from playwright.async_api import async_playwright
from typing import List, Dict


async def scrape_instagram(city: str, category: str, max_results: int = 15) -> List[Dict]:
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

        query = f"site:instagram.com \"{city}\" \"{category}\""
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
                
                # Filter out posts, tags, reels, and popular page lists
                if href and h3 and "instagram.com" in href and "/p/" not in href and "/tags/" not in href and "/reel/" not in href and "/popular/" not in href:
                    title = await h3.inner_text()
                    
                    # Clean title to get business/profile name
                    name = title.split("•")[0].split("(")[0].replace("Instagram", "").replace("photos", "").strip()
                    if not name:
                        continue

                    # Trace parent and look for snippet
                    parent = link
                    bio = ""
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
                            bio = await snippet_el.inner_text()
                            break

                    email = _extract_email_from_bio(bio)
                    phone = _extract_phone_from_bio(bio)
                    score = _calculate_score(bio, email)

                    leads.append({
                        "biz_name":    name.strip(),
                        "category":    category,
                        "city":        city,
                        "phone":       phone,
                        "email":       email,
                        "source":      "instagram",
                        "source_url":  href,
                        "score":       score,
                        "has_website": False,
                        "raw_data":    {"bio": bio[:300], "source": "google_search"},
                    })
        except Exception as e:
            print(f"[Instagram] Google search failed: {e}")
            
        await browser.close()

    return leads


def _extract_email_from_bio(bio: str) -> str | None:
    match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", bio)
    return match.group(0) if match else None


def _extract_phone_from_bio(bio: str) -> str | None:
    match = re.search(r"(\+91[\-\s]?)?[6-9]\d{9}", bio)
    return match.group(0) if match else None


def _calculate_score(bio: str, email: str | None) -> float:
    score = 55.0
    if email:
        score += 15
    if len(bio) > 80:
        score += 10   # Active account with detailed bio
    business_words = ["order", "contact", "dm", "shop", "book", "call", "whatsapp"]
    if any(w in bio.lower() for w in business_words):
        score += 10
    return min(score, 100.0)
