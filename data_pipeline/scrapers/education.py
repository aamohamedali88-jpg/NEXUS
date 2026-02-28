"""
Scraper for Education Resources.
- OpenStax (CC-BY 4.0)
- MIT OpenCourseWare (CC-BY-NC-SA)
- OER Library
- Coursera / edX / Khan Academy / TED-Ed
"""

import re
from typing import List, Dict
from data_pipeline.utils.scraper_utils import HTTPClient, normalize_item, logger
from data_pipeline.firebase_admin_setup import db


class EducationScraper:
    """Collects educational resources from open sources."""

    def __init__(self):
        self.http_client = HTTPClient(rate_limit=10)
        self.items = []

    # ---------------------------------------------------------
    # 1. OpenStax
    # ---------------------------------------------------------
    def scrape_openstax_textbooks(self) -> List[Dict]:
        logger.info("Scraping OpenStax textbooks...")

        url = "https://openstax.org/api/books"
        response = self.http_client.get(url)
        if not response:
            return []

        try:
            books = response.json()
            items = []

            for book in books[:40]:
                item = normalize_item(
                    title=book.get("title", "Open Textbook"),
                    description=book.get("description", "Open educational textbook")[:200],
                    category="Education",
                    url=book.get("url", ""),
                    source_name="OpenStax",
                    source_url=f"https://openstax.org/books/{book.get('slug', '')}",
                    license_name="CC-BY 4.0",
                    tags=["textbook", "open-education", "cc-by", book.get("subject", "")],
                    image_url=book.get("cover_url") or None,
                    attribution_required=True
                )
                items.append(item)

            logger.info(f"Collected {len(items)} textbooks from OpenStax")
            return items

        except Exception as e:
            logger.error(f"Error parsing OpenStax response: {e}")
            return []

    # ---------------------------------------------------------
    # 2. MIT OpenCourseWare
    # ---------------------------------------------------------
    def scrape_mit_opencourseware(self) -> List[Dict]:
        logger.info("Scraping MIT OpenCourseWare...")

        url = "https://ocw.mit.edu/api/v2/courses"
        params = {"limit": 50, "offset": 0}

        response = self.http_client.get(url, params=params)
        if not response:
            return []

        try:
            data = response.json()
            items = []

            for course in data.get("results", [])[:40]:
                item = normalize_item(
                    title=course.get("title", "MIT Course"),
                    description=course.get("description", "MIT OpenCourseWare course")[:200],
                    category="Education",
                    url=course.get("url", ""),
                    source_name="MIT OpenCourseWare",
                    source_url=f"https://ocw.mit.edu{course.get('url', '')}",
                    license_name="CC-BY-NC-SA 4.0",
                    tags=["mit", "open-education", "course", course.get("department", "")],
                    image_url=None,  # MIT OCW API does not provide thumbnails
                    attribution_required=True
                )
                items.append(item)

            logger.info(f"Collected {len(items)} courses from MIT OCW")
            return items

        except Exception as e:
            logger.error(f"Error parsing MIT OCW response: {e}")
            return []

    # ---------------------------------------------------------
    # 3. OER Library
    # ---------------------------------------------------------
    def scrape_open_educational_resources(self) -> List[Dict]:
        logger.info("Scraping open educational resources...")

        url = "https://www.oerlibrary.org/api/resources"
        params = {"limit": 50, "format": "json"}

        response = self.http_client.get(url, params=params)
        if not response:
            return []

        try:
            data = response.json()
            items = []

            for resource in data.get("results", [])[:40]:
                item = normalize_item(
                    title=resource.get("title", "Educational Resource"),
                    description=resource.get("description", "Open educational resource")[:200],
                    category="Education",
                    url=resource.get("url", ""),
                    source_name="OER Library",
                    source_url="https://www.oerlibrary.org",
                    license_name=resource.get("license", "CC-BY"),
                    tags=["oer", "open-education", resource.get("subject", "")],
                    image_url=resource.get("thumbnail") or None,
                    attribution_required=True
                )
                items.append(item)

            logger.info(f"Collected {len(items)} resources from OER Library")
            return items

        except Exception as e:
            logger.warning(f"OER Library not available: {e}")
            return []

    # ---------------------------------------------------------
    # 4. Public Platforms (Coursera, edX, Khan, TED)
    # ---------------------------------------------------------
    def scrape_edx_and_coursera_public(self) -> List[Dict]:
        logger.info("Scraping public course platforms...")

        platforms = [
            {
                "title": "Coursera Free Courses",
                "url": "https://www.coursera.org",
                "description": "Free and open courses from top universities"
            },
            {
                "title": "edX Free Courses",
                "url": "https://www.edx.org",
                "description": "Free university-level courses"
            },
            {
                "title": "Khan Academy",
                "url": "https://www.khanacademy.org",
                "description": "Free educational video library"
            },
            {
                "title": "TED-Ed",
                "url": "https://ed.ted.com",
                "description": "Educational videos from TED"
            }
        ]

        items = []
        for p in platforms:
            item = normalize_item(
                title=p["title"],
                description=p["description"],
                category="Education",
                url=p["url"],
                source_name="Open Education Platform",
                source_url=p["url"],
                license_name="CC-BY or CC-BY-NC",
                tags=["platform", "mooc", "free", "open"],
                image_url=None,
                attribution_required=True
            )
            items.append(item)

        logger.info(f"Created {len(items)} education platform entries")
        return items

    # ---------------------------------------------------------
    # SAVE TO FIRESTORE
    # ---------------------------------------------------------
    def save_education(self, items: List[Dict]):
        logger.info("Saving Education resources to Firestore...")

        collection = db.collection("education")

        for item in items:
            doc_id = re.sub(r"[^a-zA-Z0-9_-]+", "_", item["title"]).lower()
            collection.document(doc_id).set(item)

        logger.info(f"Saved {len(items)} items to Firestore (education)")

    # ---------------------------------------------------------
    # RUN
    # ---------------------------------------------------------
    def run(self) -> List[Dict]:
        all_items = []
        all_items.extend(self.scrape_openstax_textbooks())
        all_items.extend(self.scrape_mit_opencourseware())
        all_items.extend(self.scrape_open_educational_resources())
        all_items.extend(self.scrape_edx_and_coursera_public())

        self.items = all_items
        self.save_education(all_items)

        return all_items

    def close(self):
        self.http_client.close()


if __name__ == "__main__":
    scraper = EducationScraper()
    scraper.run()
    scraper.close()

