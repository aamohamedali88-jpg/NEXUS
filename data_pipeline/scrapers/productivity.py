"""
Scraper for Productivity Tools.
- GitHub awesome lists
- Open source tools
- Community-curated lists
"""

import json
import re
from typing import List, Dict, Optional
from utils.scraper_utils import HTTPClient, normalize_item, logger


class ProductivityToolsScraper:
    """Collects productivity tools from open sources."""
    
    def __init__(self):
        self.http_client = HTTPClient(rate_limit=30)
        self.items = []
    
    def scrape_github_awesome_list(self) -> List[Dict]:
        """Collect from sindresorhus/awesome (CC0 1.0)."""
        logger.info("Scraping GitHub awesome list...")
        
        url = "https://raw.githubusercontent.com/sindresorhus/awesome/main/readme.md"
        
        response = self.http_client.get(url)
        if not response:
            return []
        
        try:
            content = response.text
            items = []
            
            # Parse markdown links: [text](url)
            pattern = r'\[([^\]]+)\]\(([^)]+)\)'
            matches = re.findall(pattern, content)
            
            for title, url_match in matches[:100]:  # Limit to 100
                if url_match.startswith('http'):
                    item = normalize_item(
                        title=title.strip(),
                        description="From awesome community list",
                        category="Productivity Tools",
                        url=url_match,
                        source_name="Awesome Lists",
                        source_url="https://github.com/sindresorhus/awesome",
                        license_name="CC0 1.0",
                        tags=["curated", "awesome", "community", "tools"],
                        attribution_required=True
                    )
                    items.append(item)
            
            logger.info(f"Collected {len(items)} tools from awesome list")
            return items
        except Exception as e:
            logger.error(f"Error parsing awesome list: {e}")
            return []
    
    def scrape_github_productivity_repos(self) -> List[Dict]:
        """Collect productivity tools from GitHub."""
        logger.info("Scraping GitHub productivity repositories...")
        
        url = "https://api.github.com/search/repositories"
        params = {
            "q": "topic:productivity OR topic:productivity-tools language:python",
            "sort": "stars",
            "order": "desc",
            "per_page": 50
        }
        
        response = self.http_client.get(url, params=params)
        if not response:
            return []
        
        try:
            data = response.json()
            items = []
            
            for repo in data.get('items', [])[:40]:
                item = normalize_item(
                    title=repo['name'],
                    description=repo.get('description', 'Open source productivity tool')[:200],
                    category="Productivity Tools",
                    url=repo['html_url'],
                    source_name="GitHub",
                    source_url=f"https://github.com/{repo['full_name']}",
                    license_name=repo.get('license', {}).get('name', 'Unknown'),
                    tags=repo.get('topics', []) + ["open-source", "github", "productivity"],
                    image_url=repo['owner'].get('avatar_url'),
                    attribution_required=True
                )
                items.append(item)
            
            logger.info(f"Collected {len(items)} productivity tools from GitHub")
            return items
        except Exception as e:
            logger.error(f"Error parsing GitHub productivity repos: {e}")
            return []
    
    def scrape_productivity_resources(self) -> List[Dict]:
        """Collect from known productivity resources."""
        logger.info("Scraping productivity resources...")
        
        resources = [
            {
                "title": "Notion",
                "url": "https://www.notion.so",
                "description": "All-in-one workspace for notes, databases, and collaboration"
            },
            {
                "title": "Obsidian",
                "url": "https://obsidian.md",
                "description": "Powerful knowledge base on top of local plain-text Markdown files"
            },
            {
                "title": "Todoist",
                "url": "https://todoist.com",
                "description": "Task management and productivity tool"
            },
            {
                "title": "Trello",
                "url": "https://trello.com",
                "description": "Visual project management and collaboration"
            },
            {
                "title": "VSCode",
                "url": "https://code.visualstudio.com",
                "description": "Lightweight code editor with powerful features"
            },
            {
                "title": "Figma",
                "url": "https://www.figma.com",
                "description": "Collaborative design and prototyping platform"
            },
            {
                "title": "Slack",
                "url": "https://slack.com",
                "description": "Team communication and collaboration platform"
            },
            {
                "title": "GitHub",
                "url": "https://github.com",
                "description": "Platform for version control and collaboration"
            }
        ]
        
        items = []
        for resource in resources:
            item = normalize_item(
                title=resource['title'],
                description=resource['description'],
                category="Productivity Tools",
                url=resource['url'],
                source_name="Productivity Tools Directory",
                source_url=resource['url'],
                license_name="Product ToS",
                tags=["productivity", "tool", "platform"],
                attribution_required=True
            )
            items.append(item)
        
        logger.info(f"Created {len(items)} productivity tool entries")
        return items
    
    def run(self) -> List[Dict]:
        """Run all productivity tools scrapers."""
        all_items = []
        all_items.extend(self.scrape_github_awesome_list())
        all_items.extend(self.scrape_github_productivity_repos())
        all_items.extend(self.scrape_productivity_resources())
        
        self.items = all_items
        return all_items
    
    def close(self):
        """Cleanup."""
        self.http_client.close()
