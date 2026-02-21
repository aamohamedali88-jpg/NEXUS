"""
Utility functions for web scraping with proper error handling, rate limiting,
and attribution tracking.
"""

import requests
import json
import time
import logging
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple rate limiter to respect API limits."""
    
    def __init__(self, requests_per_minute: int):
        self.requests_per_minute = requests_per_minute
        self.min_interval = 60.0 / requests_per_minute
        self.last_request = 0
    
    def wait_if_needed(self):
        """Wait if necessary to respect rate limit."""
        elapsed = time.time() - self.last_request
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_request = time.time()


class HTTPClient:
    """HTTP client with rate limiting, retries, and proper headers."""
    
    def __init__(self, rate_limit: int = 10, timeout: int = 30):
        self.rate_limiter = RateLimiter(rate_limit)
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'HUSIN-DataCollector/1.0 (+https://husin.nexus/about)'
        })
    
    def get(self, url: str, params: Optional[Dict] = None, max_retries: int = 3) -> Optional[requests.Response]:
        """GET request with rate limiting and retries."""
        self.rate_limiter.wait_if_needed()
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Fetching: {url} (attempt {attempt + 1}/{max_retries})")
                response = self.session.get(url, params=params, timeout=self.timeout)
                response.raise_for_status()
                return response
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed: {e}")
                if attempt < max_retries - 1:
                    delay = 5 * (attempt + 1)  # Exponential backoff
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    logger.error(f"Failed to fetch {url} after {max_retries} attempts")
                    return None
        
        return None
    
    def close(self):
        """Close the session."""
        self.session.close()


def normalize_item(
    title: str,
    description: str,
    category: str,
    url: str,
    source_name: str,
    source_url: str,
    license_name: str,
    tags: Optional[List[str]] = None,
    image_url: Optional[str] = None,
    attribution_required: bool = True
) -> Dict:
    """
    Normalize scraped data to standard JSON format.
    All items include source attribution.
    """
    return {
        "title": title.strip(),
        "description": description.strip(),
        "category": category,
        "tags": tags or [],
        "url": url,
        "image_url": image_url,
        "license": license_name,
        "source_url": source_url,
        "source_name": source_name,
        "attribution_required": attribution_required,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "verified": False,
        "checksum": hashlib.md5(f"{title}{url}".encode()).hexdigest()
    }


def save_json(data: List[Dict], filepath: str) -> bool:
    """Save data to JSON file with proper formatting."""
    try:
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved {len(data)} items to {filepath}")
        return True
    except Exception as e:
        logger.error(f"Failed to save JSON: {e}")
        return False


def load_json(filepath: str) -> Optional[List[Dict]]:
    """Load JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load JSON: {e}")
        return None


def deduplicate_items(items: List[Dict]) -> List[Dict]:
    """Remove duplicate items by checksum."""
    seen = set()
    deduplicated = []
    for item in items:
        checksum = item.get('checksum')
        if checksum not in seen:
            seen.add(checksum)
            deduplicated.append(item)
    logger.info(f"Deduplicated: {len(items)} -> {len(deduplicated)} items")
    return deduplicated


def validate_item(item: Dict) -> bool:
    """Validate that item has all required fields."""
    required_fields = [
        'title', 'description', 'category', 'url',
        'source_url', 'source_name', 'license', 'created_at'
    ]
    return all(field in item and item[field] for field in required_fields)


def filter_valid_items(items: List[Dict]) -> List[Dict]:
    """Filter out invalid items."""
    valid_items = [item for item in items if validate_item(item)]
    removed = len(items) - len(valid_items)
    if removed > 0:
        logger.warning(f"Removed {removed} invalid items")
    return valid_items


def merge_json_files(filepaths: List[str], output_path: str) -> bool:
    """Merge multiple JSON files into one."""
    all_items = []
    for filepath in filepaths:
        items = load_json(filepath)
        if items:
            all_items.extend(items)
    
    all_items = deduplicate_items(all_items)
    all_items = filter_valid_items(all_items)
    
    return save_json(all_items, output_path)
