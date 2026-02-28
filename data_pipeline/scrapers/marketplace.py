"""
Scraper for Marketplace Products.
- Etsy API (if API key provided)
- Open marketplace platforms
"""

import re
from typing import List, Dict
from data_pipeline.utils.scraper_utils import HTTPClient, normalize_item, logger
from data_pipeline.firebase_admin_setup import db


class MarketplaceScraper:
    """Collects marketplace products from open APIs."""

    def __init__(self, etsy_api_key: Optional[str] = None):
        self.http_client = HTTPClient(rate_limit=10)
        self.items = []
        self.etsy_api_key = etsy_api_key

    # ---------------------------------------------------------
    # 1. Etsy API
    # ---------------------------------------------------------
    def scrape_etsy_api(self) -> List[Dict]:
        if not self.etsy_api_key:
            logger.warning("Etsy API key not provided, skipping Etsy scraper")
            return []

        logger.info("Scraping Etsy marketplace...")

        url = "https://openapi.etsy.com/v3/application/shops/search"
        headers = {"x-api-key": self.etsy_api_key}
        params = {"limit": 50, "sort_on": "created", "sort_order": "desc"}

        response = self.http_client.get(url, params=params)
        if not response:
            return []

        try:
            data = response.json()
            items = []

            for shop in data.get("results", [])[:20]:
                item = normalize_item(
                    title=shop.get("shop_name", "Etsy Shop"),
                    description=shop.get("title", "Marketplace shop")[:200],
                    category="Marketplace",
                    url=shop.get("url", ""),
                    source_name="Etsy",
                    source_url=f"https://www.etsy.com/shop/{shop.get('shop_id', '')}",
                    license_name="Etsy Terms of Service",
                    tags=["marketplace", "etsy", "products"],
                    image_url=None,
                    attribution_required=True
                )
                items.append(item)

            logger.info(f"Collected {len(items)} Etsy shops")
            return items

        except Exception as e:
            logger.error(f"Error parsing Etsy response: {e}")
            return []

    # ---------------------------------------------------------
    # 2. Open Marketplace Platforms
    # ---------------------------------------------------------
    def scrape_open_marketplace_platforms(self) -> List[Dict]:
        logger.info("Scraping open marketplace platforms...")

        open_platforms = [
            {
                "title": "LibreCart Open Market",
                "url": "https://www.librecart.io",
                "description": "Open-source marketplace software"
            },
            {
                "title": "Shuup Open Commerce",
                "url": "https://shuup.io",
                "description": "Open source e-commerce platform"
            },
            {
                "title": "WooCommerce Stores",
                "url": "https://www.woocommerce.com",
                "description": "WordPress-based marketplace"
            }
        ]

        items = []
        for p in open_platforms:
            item = normalize_item(
                title=p["title"],
                description=p["description"],
                category="Marketplace",
                url=p["url"],
                source_name="Open Marketplace Platform",
                source_url=p["url"],
                license_name="Platform License",
                tags=["marketplace", "platform", "open-source"],
                image_url=None,
                attribution_required=True
            )
            items.append(item)

        logger.info(f"Created {len(items)} marketplace platform entries")
        return items

    # ---------------------------------------------------------
    # SAVE TO FIRESTORE
    # ---------------------------------------------------------
    def save_marketplace(self, items: List[Dict]):
        logger.info("Saving Marketplace items to Firestore...")

        collection = db.collection("marketplace")

        for item in items:
            doc_id = re.sub(r"[^a-zA-Z0-9_-]+", "_", item["title"]).lower()
            collection.document(doc_id).set(item)

        logger.info(f"Saved {len(items)} items to Firestore (marketplace)")

    # ---------------------------------------------------------
    # RUN
    # ---------------------------------------------------------
    def run(self) -> List[Dict]:
        all_items = []
        all_items.extend(self.scrape_etsy_api())
        all_items.extend(self.scrape_open_marketplace_platforms())

        self.items = all_items
        self.save_marketplace(all_items)

        return all_items

    def close(self):
        self.http_client.close()


if __name__ == "__main__":
    scraper = MarketplaceScraper()
    scraper.run()
    scraper.close()

