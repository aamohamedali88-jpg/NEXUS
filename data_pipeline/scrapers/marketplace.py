"""
Scraper for Marketplace Products.
- Uses open APIs (Etsy, open platforms)
- Respects robots.txt
- Only collects from platforms that explicitly allow data collection
"""

import json
from typing import List, Dict, Optional
from utils.scraper_utils import HTTPClient, normalize_item, logger


class MarketplaceScraper:
    """Collects marketplace products from open APIs."""
    
    def __init__(self, etsy_api_key: Optional[str] = None):
        self.http_client = HTTPClient(rate_limit=10)
        self.items = []
        self.etsy_api_key = etsy_api_key
    
    def scrape_etsy_api(self) -> List[Dict]:
        """Collect products from Etsy API (requires API key)."""
        if not self.etsy_api_key:
            logger.warning("Etsy API key not provided, skipping Etsy scraper")
            return []
        
        logger.info("Scraping Etsy marketplace...")
        
        url = "https://openapi.etsy.com/v3/application/shops/search"
        headers = {
            "x-api-key": self.etsy_api_key
        }
        params = {
            "limit": 50,
            "sort_on": "created",
            "sort_order": "desc"
        }
        
        response = self.http_client.get(url, params=params)
        if not response:
            return []
        
        try:
            data = response.json()
            items = []
            
            for shop in data.get('results', [])[:20]:
                item = normalize_item(
                    title=shop.get('shop_name', 'Etsy Shop'),
                    description=shop.get('title', 'Marketplace shop')[:200],
                    category="E-Marketplace",
                    url=shop.get('url', ''),
                    source_name="Etsy",
                    source_url=f"https://www.etsy.com/shop/{shop.get('shop_id', '')}",
                    license_name="Etsy ToS",
                    tags=["marketplace", "etsy", "products"],
                    attribution_required=True
                )
                items.append(item)
            
            logger.info(f"Collected {len(items)} Etsy shops")
            return items
        except Exception as e:
            logger.error(f"Error parsing Etsy response: {e}")
            return []
    
    def scrape_open_marketplace_platforms(self) -> List[Dict]:
        """Collect from platforms that provide open data."""
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
        for platform in open_platforms:
            item = normalize_item(
                title=platform['title'],
                description=platform['description'],
                category="E-Marketplace",
                url=platform['url'],
                source_name="Open Marketplace Platform",
                source_url=platform['url'],
                license_name="Platform License",
                tags=["marketplace", "platform", "open-source"],
                attribution_required=True
            )
            items.append(item)
        
        logger.info(f"Created {len(items)} marketplace platform entries")
        return items
    
    def run(self) -> List[Dict]:
        """Run all marketplace scrapers."""
        all_items = []
        all_items.extend(self.scrape_etsy_api())
        all_items.extend(self.scrape_open_marketplace_platforms())
        
        self.items = all_items
        return all_items
    
    def close(self):
        """Cleanup."""
        self.http_client.close()
