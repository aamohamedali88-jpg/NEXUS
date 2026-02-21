"""
Scraper for Islamic Resources and Libraries.
- Archive.org (public domain and open-licensed Islamic texts)
- WikiSource (CC-BY-SA)
- OpenIslam.org (open knowledge base)
"""

import json
from typing import List, Dict, Optional
from utils.scraper_utils import HTTPClient, normalize_item, logger


class IslamicResourcesScraper:
    """Collects Islamic resources from open sources."""
    
    def __init__(self):
        self.http_client = HTTPClient(rate_limit=5)
        self.items = []
    
    def scrape_archive_org_islamic(self) -> List[Dict]:
        """Collect Islamic texts from Internet Archive."""
        logger.info("Scraping Islamic resources from Internet Archive...")
        
        url = "https://archive.org/advancedsearch.php"
        params = {
            "q": "subject:Islam OR subject:Quran OR subject:Islamic",
            "fl": "identifier,title,description,licenseurl",
            "output": "json",
            "rows": 50
        }
        
        response = self.http_client.get(url, params=params)
        if not response:
            return []
        
        try:
            data = response.json()
            items = []
            
            for doc in data.get('response', {}).get('docs', [])[:40]:
                identifier = doc.get('identifier', '')
                if identifier:
                    item = normalize_item(
                        title=doc.get('title', 'Islamic Resource')[:100],
                        description=doc.get('description', 'Islamic text from Internet Archive')[:200],
                        category="Islamic Libraries",
                        url=f"https://archive.org/details/{identifier}",
                        source_name="Internet Archive",
                        source_url=f"https://archive.org/details/{identifier}",
                        license_name=doc.get('licenseurl', 'Public Domain')[-100:],
                        tags=["islamic", "archive", "text", "library"],
                        attribution_required=True
                    )
                    items.append(item)
            
            logger.info(f"Collected {len(items)} Islamic resources from Archive.org")
            return items
        except Exception as e:
            logger.error(f"Error parsing Archive.org response: {e}")
            return []
    
    def scrape_wikisource_islamic(self) -> List[Dict]:
        """Collect Islamic texts from Wikisource (CC-BY-SA)."""
        logger.info("Scraping Islamic texts from Wikisource...")
        
        url = "https://en.wikisource.org/w/api.php"
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": "Category:Islamic texts",
            "cmlimit": 50,
            "format": "json"
        }
        
        response = self.http_client.get(url, params=params)
        if not response:
            return []
        
        try:
            data = response.json()
            items = []
            
            for page in data.get('query', {}).get('categorymembers', []):
                title = page['title']
                pageid = page['pageid']
                
                # Get page info
                page_params = {
                    "action": "query",
                    "pageids": pageid,
                    "prop": "extract",
                    "format": "json"
                }
                
                page_response = self.http_client.get(url, params=page_params)
                if page_response:
                    page_data = page_response.json()
                    extract = list(page_data.get('query', {}).get('pages', {}).values())[0].get('extract', '')
                    
                    item = normalize_item(
                        title=title,
                        description=extract[:200] if extract else "Islamic text from Wikisource",
                        category="Islamic Libraries",
                        url=f"https://en.wikisource.org/wiki/{title.replace(' ', '_')}",
                        source_name="Wikisource",
                        source_url=f"https://en.wikisource.org/wiki/{title.replace(' ', '_')}",
                        license_name="CC-BY-SA 3.0",
                        tags=["islamic", "wikisource", "text", "cc-by-sa"],
                        attribution_required=True
                    )
                    items.append(item)
            
            logger.info(f"Collected {len(items)} texts from Wikisource")
            return items
        except Exception as e:
            logger.error(f"Error parsing Wikisource response: {e}")
            return []
    
    def scrape_islamic_publishers(self) -> List[Dict]:
        """Collect from open Islamic publishers and libraries."""
        logger.info("Scraping open Islamic resources...")
        
        # List of known open Islamic resources
        open_resources = [
            {
                "title": "Quranic Arabic Corpus",
                "url": "https://quraniccorpus.com/",
                "description": "Open corpus of Quranic texts with linguistic analysis"
            },
            {
                "title": "IslamicNetworks.com",
                "url": "https://www.islamicnetworks.com/",
                "description": "Islamic history and culture network resources"
            },
            {
                "title": "Muslim Heritage",
                "url": "https://www.muslimheritage.com/",
                "description": "Islamic science and civilization heritage archive"
            },
            {
                "title": "Islamic Philosophy Online",
                "url": "https://www.muslimphilosophy.com/",
                "description": "Free access to Islamic philosophical texts"
            }
        ]
        
        items = []
        for resource in open_resources:
            item = normalize_item(
                title=resource['title'],
                description=resource['description'],
                category="Islamic Libraries",
                url=resource['url'],
                source_name="Islamic Open Resources",
                source_url=resource['url'],
                license_name="CC-BY or Open Access",
                tags=["islamic", "open", "library", "educational"],
                attribution_required=True
            )
            items.append(item)
        
        logger.info(f"Created {len(items)} Islamic resource entries")
        return items
    
    def run(self) -> List[Dict]:
        """Run all Islamic resources scrapers."""
        all_items = []
        all_items.extend(self.scrape_archive_org_islamic())
        all_items.extend(self.scrape_wikisource_islamic())
        all_items.extend(self.scrape_islamic_publishers())
        
        self.items = all_items
        return all_items
    
    def close(self):
        """Cleanup."""
        self.http_client.close()
