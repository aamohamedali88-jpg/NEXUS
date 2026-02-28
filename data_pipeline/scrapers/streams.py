"""
Scraper for Free Streaming Sources (Movies & Documentaries).
- Internet Archive (public domain / CC movies & documentaries)
- Legal free streaming platforms (ad-supported, open access)
- Curated documentary directories

Inspired by fmhy-style link aggregation, but restricted to legal / open sources only.
"""

import re
from typing import List, Dict
from utils.scraper_utils import HTTPClient, normalize_item, logger
from data_pipeline.firebase_admin_setup import db


class StreamsScraper:
    """Collects free & legal streaming sources for movies and documentaries."""

    def __init__(self):
        self.http_client = HTTPClient(rate_limit=10)
        self.items: List[Dict] = []

    # ---------------------------------------------------------
    # 1. Internet Archive - Movies
    # ---------------------------------------------------------
    def scrape_internet_archive_movies(self) -> List[Dict]:
        """
        Collect public domain / CC movies from Internet Archive.
        We only store the collection entry, not every single movie.
        """
        logger.info("Scraping Internet Archive movie collections...")

        # We don't fetch every movie; we link to curated collections.
        collections = [
            {
                "title": "Internet Archive Feature Films",
                "url": "https://archive.org/details/feature_films",
                "description": "Public domain and open-licensed feature films on Internet Archive."
            },
            {
                "title": "Internet Archive Sci-Fi / Horror",
                "url": "https://archive.org/details/science_fiction",
                "description": "Classic science fiction and horror films in the public domain."
            },
            {
                "title": "Internet Archive Film Noir",
                "url": "https://archive.org/details/film_noir",
                "description": "Film noir classics in the public domain and open licenses."
            },
        ]

        items: List[Dict] = []
        for c in collections:
            item = normalize_item(
                title=c["title"],
                description=c["description"],
                category="Streams",
                url=c["url"],
                source_name="Internet Archive",
                source_url=c["url"],
                license_name="Public Domain / Creative Commons (varies by item)",
                tags=["movies", "public-domain", "archive", "classic"],
                image_url=None,
                attribution_required=True,
            )
            items.append(item)

        logger.info(f"Created {len(items)} Internet Archive movie collection entries")
        return items

    # ---------------------------------------------------------
    # 2. Internet Archive - Documentaries
    # ---------------------------------------------------------
    def scrape_internet_archive_documentaries(self) -> List[Dict]:
        """
        Collect documentary collections from Internet Archive.
        Again, we link to collections, not every single video.
        """
        logger.info("Scraping Internet Archive documentary collections...")

        collections = [
            {
                "title": "Internet Archive Documentary Films",
                "url": "https://archive.org/details/documentary_films",
                "description": "Documentary films available in public domain or under open licenses."
            },
            {
                "title": "Internet Archive Educational Films",
                "url": "https://archive.org/details/educationalfilms",
                "description": "Educational and documentary-style films from various eras."
            },
        ]

        items: List[Dict] = []
        for c in collections:
            item = normalize_item(
                title=c["title"],
                description=c["description"],
                category="Streams",
                url=c["url"],
                source_name="Internet Archive",
                source_url=c["url"],
                license_name="Public Domain / Creative Commons (varies by item)",
                tags=["documentaries", "education", "archive", "public-domain"],
                image_url=None,
                attribution_required=True,
            )
            items.append(item)

        logger.info(f"Created {len(items)} Internet Archive documentary collection entries")
        return items

    # ---------------------------------------------------------
    # 3. Free & Legal Streaming Platforms (Movies & Docs)
    # ---------------------------------------------------------
    def scrape_free_streaming_platforms(self) -> List[Dict]:
        """
        Curated list of legal, free (ad-supported or open) streaming platforms.
        We do not scrape their catalogs; we only link to their home / browse pages.
        """
        logger.info("Creating entries for free streaming platforms...")

        platforms = [
            {
                "title": "Pluto TV",
                "url": "https://pluto.tv",
                "description": "Free live TV and on-demand movies & series (ad-supported)."
            },
            {
                "title": "Tubi",
                "url": "https://tubitv.com",
                "description": "Free movies and TV shows (ad-supported, region-dependent)."
            },
            {
                "title": "The Roku Channel",
                "url": "https://therokuchannel.roku.com",
                "description": "Free movies, TV, and live channels (ad-supported)."
            },
            {
                "title": "Plex Free Movies & TV",
                "url": "https://watch.plex.tv",
                "description": "Free on-demand movies and TV shows (ad-supported)."
            },
            {
                "title": "Crackle",
                "url": "https://www.crackle.com",
                "description": "Free movies and TV shows (ad-supported)."
            },
            {
                "title": "Kanopy",
                "url": "https://www.kanopy.com",
                "description": "Free movies and documentaries via libraries and universities."
            },
            {
                "title": "Documentary Mania",
                "url": "https://www.documentarymania.com",
                "description": "Curated collection of documentaries available to watch online."
            },
            {
                "title": "Top Documentary Films",
                "url": "https://topdocumentaryfilms.com",
                "description": "Directory of documentaries available for free streaming."
            },
        ]

        items: List[Dict] = []
        for p in platforms:
            item = normalize_item(
                title=p["title"],
                description=p["description"],
                category="Streams",
                url=p["url"],
                source_name="Free Streaming Platform",
                source_url=p["url"],
                license_name="Platform Terms of Service",
                tags=["streaming", "movies", "documentaries", "free"],
                image_url=None,
                attribution_required=True,
            )
            items.append(item)

        logger.info(f"Created {len(items)} free streaming platform entries")
        return items

    # ---------------------------------------------------------
    # 4. Curated Documentary Directories
    # ---------------------------------------------------------
    def scrape_documentary_directories(self) -> List[Dict]:
        """
        Additional curated directories that index free / legal documentaries.
        """
        logger.info("Creating entries for documentary directories...")

        directories = [
            {
                "title": "Open Culture Free Movies",
                "url": "https://www.openculture.com/freemoviesonline",
                "description": "Curated list of free movies & classics from legal sources."
            },
            {
                "title": "Open Culture Free Documentaries",
                "url": "https://www.openculture.com/freedocumentariesonline",
                "description": "Curated list of free documentaries from legal sources."
            },
        ]

        items: List[Dict] = []
        for d in directories:
            item = normalize_item(
                title=d["title"],
                description=d["description"],
                category="Streams",
                url=d["url"],
                source_name="Open Culture",
                source_url=d["url"],
                license_name="Curated links to legal sources",
                tags=["documentaries", "movies", "curated", "directory"],
                image_url=None,
                attribution_required=True,
            )
            items.append(item)

        logger.info(f"Created {len(items)} documentary directory entries")
        return items

    # ---------------------------------------------------------
    # SAVE TO FIRESTORE
    # ---------------------------------------------------------
    def save_streams(self, items: List[Dict]):
        logger.info("Saving Streams items to Firestore...")

        collection = db.collection("streams")

        for item in items:
            doc_id = re.sub(r"[^a-zA-Z0-9_-]+", "_", item["title"]).lower()
            collection.document(doc_id).set(item)

        logger.info(f"Saved {len(items)} items to Firestore (streams)")

    # ---------------------------------------------------------
    # RUN
    # ---------------------------------------------------------
    def run(self) -> List[Dict]:
        all_items: List[Dict] = []
        all_items.extend(self.scrape_internet_archive_movies())
        all_items.extend(self.scrape_internet_archive_documentaries())
        all_items.extend(self.scrape_free_streaming_platforms())
        all_items.extend(self.scrape_documentary_directories())

        self.items = all_items
        self.save_streams(all_items)

        return all_items

    def close(self):
        self.http_client.close()


if __name__ == "__main__":
    scraper = StreamsScraper()
    scraper.run()
    scraper.close()
