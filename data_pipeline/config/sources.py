"""
Configuration for open, legitimate data sources.
All sources listed here are:
- Public APIs with clear ToS allowing data collection
- Public domain or open-licensed content
- Explicitly permit scraping/reuse in their terms
- Include proper attribution requirements
"""

SOURCES = {
    "ai_tools": {
        "huggingface": {
            "api_url": "https://huggingface.co/api/models",
            "description": "Open-source ML models and datasets",
            "license": "Various (CC0, MIT, Apache 2.0, etc)",
            "requires_attribution": True,
            "rate_limit": 10,  # requests per minute
            "scraper": "scrapers.ai_tools"
        },
        "github_trending": {
            "api_url": "https://api.github.com/search/repositories",
            "description": "Open source AI/ML repositories with trending stats",
            "license": "Various (check individual repos)",
            "requires_attribution": True,
            "rate_limit": 60,  # GitHub allows 60 req/min unauthenticated
            "scraper": "scrapers.ai_tools"
        },
        "awesome_ai": {
            "url": "https://raw.githubusercontent.com/openai/awesome-ai/main/README.md",
            "description": "Curated list of AI resources (CC-BY license)",
            "license": "CC-BY 4.0",
            "requires_attribution": True,
            "rate_limit": 5,
            "scraper": "scrapers.ai_tools"
        }
    },
    "islamic_resources": {
        "archive_org_quran": {
            "api_url": "https://archive.org/advancedsearch.php",
            "description": "Islamic texts and Quran resources from Internet Archive",
            "license": "CC0, Public Domain, varies",
            "requires_attribution": True,
            "rate_limit": 5,
            "scraper": "scrapers.islamic"
        },
        "wikisource": {
            "api_url": "https://en.wikisource.org/w/api.php",
            "description": "Open library of public domain texts",
            "license": "CC-BY-SA 3.0",
            "requires_attribution": True,
            "rate_limit": 5,
            "scraper": "scrapers.islamic"
        },
        "openislam": {
            "url": "https://www.openislam.org",
            "description": "Public Islamic knowledge base",
            "license": "Creative Commons (check per resource)",
            "requires_attribution": True,
            "rate_limit": 5,
            "scraper": "scrapers.islamic"
        }
    },
    "education": {
        "open_course_ware": {
            "api_url": "https://www.opencourseware.org",
            "description": "MIT OpenCourseWare and open educational resources",
            "license": "CC-BY-NC-SA",
            "requires_attribution": True,
            "rate_limit": 5,
            "scraper": "scrapers.education"
        },
        "openstax": {
            "api_url": "https://openstax.org/api/books",
            "description": "Free open-source textbooks",
            "license": "CC-BY 4.0",
            "requires_attribution": True,
            "rate_limit": 10,
            "scraper": "scrapers.education"
        },
        "coursera_openlearning": {
            "url": "https://www.coursera.org",
            "description": "Open learning courses (respecting robots.txt)",
            "license": "Various",
            "requires_attribution": True,
            "rate_limit": 2,
            "scraper": "scrapers.education"
        }
    },
    "marketplaces": {
        "etsy_api": {
            "api_url": "https://www.etsy.com/api",
            "description": "Etsy public API for marketplace items",
            "license": "Etsy ToS",
            "requires_attribution": True,
            "requires_api_key": True,
            "rate_limit": 10,
            "scraper": "scrapers.marketplace"
        },
        "opencart_stores": {
            "description": "Public OpenCart stores with robots.txt allowing",
            "license": "Various product licenses",
            "requires_attribution": True,
            "rate_limit": 5,
            "scraper": "scrapers.marketplace"
        }
    },
    "productivity_tools": {
        "github_awesome_lists": {
            "url": "https://github.com/sindresorhus/awesome",
            "description": "Community-curated list of productivity tools",
            "license": "CC0 1.0",
            "requires_attribution": True,
            "rate_limit": 5,
            "scraper": "scrapers.productivity"
        },
        "open_source_tools": {
            "url": "https://api.github.com/search/repositories",
            "description": "Open source productivity tools",
            "license": "Various (check per repo)",
            "requires_attribution": True,
            "rate_limit": 60,
            "scraper": "scrapers.productivity"
        }
    }
}

# JSON Output Schema - ALL items must include these fields
OUTPUT_SCHEMA = {
    "title": "string",
    "description": "string",
    "category": "string",
    "tags": ["strings"],
    "url": "string",
    "image_url": "string (optional)",
    "license": "string",
    "source_url": "string",  # Where we got the data from
    "source_name": "string",  # Name of the source
    "attribution_required": "boolean",
    "created_at": "ISO 8601 timestamp",
    "verified": "boolean"
}

# Rate limiting and retry config
RETRY_CONFIG = {
    "max_retries": 3,
    "retry_delay": 5,  # seconds
    "timeout": 30  # seconds
}
