"""
Scraper for Productivity Tools.
- GitHub awesome lists
- Open source tools
- Community-curated lists
"""

import re
from typing import List, Dict
from data_pipeline.utils.scraper_utils import HTTPClient, normalize_item, logger
from data_pipeline.firebase_admin_setup import db


class ProductivityToolsScraper:
    """Collects productivity tools from open sources."""

    def __init__(self):
        self.http_client = HTTPClient(rate_limit=30)
        self.items = []

    # ---------------------------------------------------------
    # 1. Awesome List
    # ---------------------------------------------------------
    def scrape_github_awesome_list(self) -> List[Dict]:
        logger.info("Scraping GitHub awesome list...")

        url = "https://raw.githubusercontent.com/sindresorhus/awesome/main/readme.md"
        response = self.http_client.get(url)
        if not response:
            return []

        try:
            content = response.text
            items = []

            pattern = r'\[([^\]]+)\]\(([^)]+)\)'
            matches = re.findall(pattern, content)

            for title, url_match in matches[:100]:
                if url_match.startswith("http"):
                    item = normalize_item(
                        title=title.strip(),
                        description="From awesome community list",
                        category="Productivity",
                        url=url_match,
                        source_name="Awesome Lists",
                        source_url="https://github.com/sindresorhus/awesome",
                        license_name="CC0 1.0",
                        tags=["curated", "awesome", "community", "tools"],
                        image_url=None,
                        attribution_required=True
                    )
                    items.append(item)

            logger.info(f"Collected {len(items)} tools from awesome list")
            return items

        except Exception as e:
            logger.error(f"Error parsing awesome list: {e}")
            return []

    # ---------------------------------------------------------
    # 2. GitHub Productivity Repos
    # ---------------------------------------------------------
    def scrape_github_productivity_repos(self) -> List[Dict]:
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

            for repo in data.get("items", [])[:40]:
                item = normalize_item(
                    title=repo["name"],
                    description=repo.get("description", "Open source productivity tool")[:200],
                    category="Productivity",
                    url=repo["html_url"],
                    source_name="GitHub",
                    source_url=f"https://github.com/{repo['full_name']}",
                    license_name=repo.get("license", {}).get("name", "Unknown"),
                    tags=repo.get("topics", []) + ["open-source", "github", "productivity"],
                    image_url=repo["owner"].get("avatar_url"),
                    attribution_required=True
                )
                items.append(item)

            logger.info(f"Collected {len(items)} productivity tools from GitHub")
            return items

        except Exception as e:
            logger.error(f"Error parsing GitHub productivity repos: {e}")
            return []

    # ---------------------------------------------------------
    # 3. Known Productivity Tools
    # ---------------------------------------------------------
    def scrape_productivity_resources(self) -> List[Dict]:
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
                "description": "Powerful knowledge base using Markdown"
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
        for r in resources:
            item = normalize_item(
                title=r["title"],
                description=r["description"],
                category="Productivity",
                url=r["url"],
                source_name="Productivity Tools Directory",
                source_url=r["url"],
                license_name="Product Terms of Service",
                tags=["productivity", "tool", "platform"],
                image_url=None,
                attribution_required=True
            )
            items.append(item)

        logger.info(f"Created {len(items)} productivity tool entries")
        return items

    # ---------------------------------------------------------
    # SAVE TO FIRESTORE
    # ---------------------------------------------------------
    def save_productivity(self, items: List[Dict]):
        logger.info("Saving Productivity tools to Firestore...")

        collection = db.collection("productivity")

        for item in items:
            doc_id = re.sub(r"[^a-zA-Z0-9_-]+", "_", item["title"]).lower()
            collection.document(doc_id).set(item)

        logger.info(f"Saved {len(items)} items to Firestore (productivity)")

    # ---------------------------------------------------------
    # RUN
    # ---------------------------------------------------------
    def run(self) -> List[Dict]:
        all_items = []
        all_items.extend(self.scrape_github_awesome_list())
        all_items.extend(self.scrape_github_productivity_repos())
        all_items.extend(self.scrape_productivity_resources())

        self.items = all_items
        self.save_productivity(all_items)

        return all_items

    def close(self):
        self.http_client.close()


if __name__ == "__main__":
    scraper = ProductivityToolsScraper()
    scraper.run()
    scraper.close()


