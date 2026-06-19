"""
Google Maps scraper using Playwright.
Finds businesses in target cities/categories that have no website.
"""
import asyncio
import re
from playwright.async_api import async_playwright
from typing import List, Dict


async def scrape_google_maps(city: str, category: str, max_results: int = 20) -> List[Dict]:
    leads = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        query = f"{category} in {city}"
        url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"

        await page.goto(url, timeout=30000)
        await page.wait_for_timeout(3000)

        # Scroll to load more results
        for _ in range(5):
            await page.keyboard.press("End")
            await page.wait_for_timeout(1000)

        result_items = await page.query_selector_all("a[href*='/maps/place/']")

        for item in result_items[:max_results]:
            try:
                await item.click()
                await page.wait_for_timeout(2000)

                name_el    = await page.query_selector("h1.DUwDvf")
                phone_el   = await page.query_selector("button[data-tooltip='Copy phone number']")
                website_el = await page.query_selector("a[data-tooltip='Open website']")
                rating_el  = await page.query_selector("span.MW4etd")

                name    = await name_el.inner_text()    if name_el    else None
                phone   = await phone_el.get_attribute("data-item-id") if phone_el else None
                website = await website_el.get_attribute("href")       if website_el else None
                rating  = await rating_el.inner_text()  if rating_el  else "0"

                if name and not website:
                    # Clean phone number
                    if phone:
                        phone = re.sub(r"phone:", "", phone)

                    score = _calculate_score(rating, phone, category)
                    current_url = page.url

                    leads.append({
                        "biz_name":    name.strip(),
                        "category":    category,
                        "city":        city,
                        "phone":       phone,
                        "email":       None,
                        "source":      "google_maps",
                        "source_url":  current_url,
                        "score":       score,
                        "has_website": False,
                        "raw_data":    {"rating": rating, "query": query},
                    })

                await page.go_back()
                await page.wait_for_timeout(1500)

            except Exception as e:
                print(f"[Maps] Error on item: {e}")
                continue

        await browser.close()

    return leads


def _calculate_score(rating: str, phone: str, category: str) -> float:
    score = 50.0
    try:
        r = float(rating)
        score += r * 8        # Up to +40 for 5-star rating
    except Exception:
        pass
    if phone:
        score += 10           # Has contact info
    high_value = ["clinic", "dental", "hospital", "restaurant", "hotel", "salon"]
    if any(h in category.lower() for h in high_value):
        score += 5
    return min(score, 100.0)
