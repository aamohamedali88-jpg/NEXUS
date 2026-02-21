"""
Scraper for Education Resources.
- OpenStax (CC-BY 4.0 open textbooks)
- MIT OpenCourseWare (CC-BY-NC-SA)
- Open Educational Resources (OER)
"""

import json
from typing import List, Dict, Optional
from utils.scraper_utils import HTTPClient, normalize_item, logger


class EducationScraper:
    """Collects educational resources from open sources."""
    
    def __init__(self):
        self.http_client = HTTPClient(rate_limit=10)
        self.items = []
    
    def scrape_openstax_textbooks(self) -> List[Dict]:
        """Collect open textbooks from OpenStax (CC-BY 4.0)."""
        logger.info("Scraping OpenStax textbooks...")
        
        url = "https://openstax.org/api/books"
        
        response = self.http_client.get(url)
        if not response:
            return []
        
        try:
            books = response.json()
            items = []
            
            for book in books[:40]:  # Limit to 40
                item = normalize_item(
                    title=book.get('title', 'Open Textbook'),
                    description=book.get('description', 'Open educational textbook')[:200],
                    category="Education",
                    url=book.get('url', ''),
                    source_name="OpenStax",
                    source_url=f"https://openstax.org/books/{book.get('slug', '')}",
                    license_name="CC-BY 4.0",
                    tags=["textbook", "open-education", "cc-by", book.get('subject', '')],
                    image_url=book.get('cover_url'),
                    attribution_required=True
                )
                items.append(item)
            
            logger.info(f"Collected {len(items)} textbooks from OpenStax")
            return items
        except Exception as e:
            logger.error(f"Error parsing OpenStax response: {e}")
            return []
    
    def scrape_mit_opencourseware(self) -> List[Dict]:
        """Collect courses from MIT OpenCourseWare (CC-BY-NC-SA)."""
        logger.info("Scraping MIT OpenCourseWare...")
        
        url = "https://ocw.mit.edu/api/v2/courses"
        params = {
            "limit": 50,
            "offset": 0
        }
        
        response = self.http_client.get(url, params=params)
        if not response:
            return []
        
        try:
            data = response.json()
            items = []
            
            for course in data.get('results', [])[:40]:
                item = normalize_item(
                    title=course.get('title', 'MIT Course'),
                    description=course.get('description', 'MIT OpenCourseWare course')[:200],
                    category="Education",
                    url=course.get('url', ''),
                    source_name="MIT OpenCourseWare",
                    source_url=f"https://ocw.mit.edu{course.get('url', '')}",
                    license_name="CC-BY-NC-SA 4.0",
                    tags=["mit", "open-education", "course", course.get('department', '')],
                    attribution_required=True
                )
                items.append(item)
            
            logger.info(f"Collected {len(items)} courses from MIT OCW")
            return items
        except Exception as e:
            logger.error(f"Error parsing MIT OCW response: {e}")
            return []
    
    def scrape_open_educational_resources(self) -> List[Dict]:
        """Collect OER resources from various open databases."""
        logger.info("Scraping open educational resources...")
        
        url = "https://www.oerlibrary.org/api/resources"
        params = {
            "limit": 50,
            "format": "json"
        }
        
        response = self.http_client.get(url, params=params)
        if not response:
            return []
        
        try:
            data = response.json()
            items = []
            
            for resource in data.get('results', [])[:40]:
                item = normalize_item(
                    title=resource.get('title', 'Educational Resource'),
                    description=resource.get('description', 'Open educational resource')[:200],
                    category="Education",
                    url=resource.get('url', ''),
                    source_name="OER Library",
                    source_url=f"https://www.oerlibrary.org",
                    license_name=resource.get('license', 'CC-BY'),
                    tags=["oer", "open-education", resource.get('subject', '')],
                    image_url=resource.get('thumbnail'),
                    attribution_required=True
                )
                items.append(item)
            
            logger.info(f"Collected {len(items)} resources from OER Library")
            return items
        except Exception as e:
            logger.warning(f"OER Library not available (may need API key): {e}")
            return []
    
    def scrape_edx_and_coursera_public(self) -> List[Dict]:
        """Collect free courses from reputable open platforms."""
        logger.info("Scraping public course platforms...")
        
        open_platforms = [
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
                "description": "Free educational video library (CC-BY or CC-BY-NC)"
            },
            {
                "title": "TED-Ed",
                "url": "https://ed.ted.com",
                "description": "Educational videos from TED (CC or custom licensed)"
            }
        ]
        
        items = []
        for platform in open_platforms:
            item = normalize_item(
                title=platform['title'],
                description=platform['description'],
                category="Education",
                url=platform['url'],
                source_name="Open Education Platform",
                source_url=platform['url'],
                license_name="CC-BY or CC-BY-NC",
                tags=["platform", "mooc", "free", "open"],
                attribution_required=True
            )
            items.append(item)
        
        logger.info(f"Created {len(items)} education platform entries")
        return items
    
    def run(self) -> List[Dict]:
        """Run all education scrapers."""
        all_items = []
        all_items.extend(self.scrape_openstax_textbooks())
        all_items.extend(self.scrape_mit_opencourseware())
        all_items.extend(self.scrape_open_educational_resources())
        all_items.extend(self.scrape_edx_and_coursera_public())
        
        self.items = all_items
        return all_items
    
    def close(self):
        """Cleanup."""
        self.http_client.close()
