"""
Scraper for AI Tools and ML Models from open sources.
- HuggingFace API (CC0, MIT, Apache 2.0, etc)
- GitHub Trending (open source with various licenses)
- Awesome AI lists (CC-BY)
"""

import json
import re
from typing import List, Dict
from data_pipeline.utils.scraper_utils import HTTPClient, normalize_item, logger
from data_pipeline.firebase_admin_setup import db


class AIToolsScraper:
    """Collects AI tools from open APIs and repositories."""

    def __init__(self):
        self.http_client = HTTPClient(rate_limit=60)
        self.items = []

    def scrape_huggingface_models(self) -> List[Dict]:
        logger.info("Scraping HuggingFace models...")

        url = "https://huggingface.co/api/models"
        params = {
            "sort": "downloads",
            "direction": -1,
            "limit": 50,
            "full": False
        }

        response = self.http_client.get(url, params=params)
        if not response:
            return []

        try:
            models = response.json()
            items = []

            for model in models:
                if isinstance(model, dict):
                    item = normalize_item(
                        title=model.get('modelId', 'Unknown'),
                        description=model.get('description', 'ML model from HuggingFace')[:200],
                        category="AI Tools",
                        url=f"https://huggingface.co/{model.get('modelId', '')}",
                        source_name="HuggingFace Hub",
                        source_url="https://huggingface.co/api/models",
                        license_name=model.get('license', 'Unknown'),
                        tags=["machine-learning", "ai", "model", "huggingface"],
                        attribution_required=True
                    )
                    items.append(item)

            logger.info(f"Collected {len(items)} models from HuggingFace")
            return items
        except Exception as e:
            logger.error(f"Error parsing HuggingFace response: {e}")
            return []

    def scrape_github_ai_repos(self) -> List[Dict]:
        logger.info("Scraping GitHub AI repositories...")

        url = "https://api.github.com/search/repositories"
        params = {
            "q": "(topic:machine-learning OR topic:artificial-intelligence) language:python",
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

            for repo in data.get('items', []):
                item = normalize_item(
                    title=repo['name'],
                    description=repo.get('description', 'Open source AI project')[:200],
                    category="AI Tools",
                    url=repo['html_url'],
                    source_name="GitHub",
                    source_url=f"https://github.com/{repo['full_name']}",
                    license_name=repo.get('license', {}).get('name', 'Unknown License'),
                    tags=repo.get('topics', []) + ["open-source", "github"],
                    image_url=repo['owner'].get('avatar_url'),
                    attribution_required=True
                )
                items.append(item)

            logger.info(f"Collected {len(items)} repositories from GitHub")
            return items
        except Exception as e:
            logger.error(f"Error parsing GitHub response: {e}")
            return []

    def scrape_awesome_lists(self) -> List[Dict]:
        logger.info("Scraping awesome lists...")

        url = "https://api.github.com/repos/openai/awesome-ai/readme"

        response = self.http_client.get(url)
        if not response:
            return []

        try:
            content = response.text
            items = []

            pattern = r'\[([^\]]+)\]\(([^)]+)\)'
            matches = re.findall(pattern, content)

            for title, url in matches[:30]:
                if url.startswith('http'):
                    item = normalize_item(
                        title=title.strip(),
                        description="From awesome-ai community list",
                        category="AI Tools",
                        url=url,
                        source_name="Awesome AI List",
                        source_url="https://github.com/openai/awesome-ai",
                        license_name="CC-BY 4.0",
                        tags=["curated", "awesome-list", "community"],
                        attribution_required=True
                    )
                    items.append(item)

            logger.info(f"Collected {len(items)} items from awesome lists")
            return items
        except Exception as e:
            logger.error(f"Error parsing awesome list: {e}")
            return []

    def save_ai_tools(self, tools: List[Dict]):
        logger.info("Saving AI tools to Firestore...")

        # Save to BOTH collections
        collection_main = db.collection("ai_pro")
        collection_sources = db.collection("ai_pro_sources")

        for tool in tools:
            # Safe Firestore document ID
            doc_id = re.sub(r'[^a-zA-Z0-9_-]+', '_', tool["title"]).lower()

            collection_main.document(doc_id).set(tool)
            collection_sources.document(doc_id).set(tool)

        logger.info(f"Saved {len(tools)} AI tools to Firestore (ai_pro + ai_pro_sources)")

    def run(self) -> List[Dict]:
        all_items = []
        all_items.extend(self.scrape_huggingface_models())
        all_items.extend(self.scrape_github_ai_repos())
        all_items.extend(self.scrape_awesome_lists())

        self.items = all_items

        # FIXED: correct function name
        self.save_ai_tools(all_items)

        return all_items

    def close(self):
        self.http_client.close()


if __name__ == "__main__":
    scraper = AIToolsScraper()
    scraper.run()
    scraper.close()
