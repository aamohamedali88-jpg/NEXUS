"""
Master pipeline orchestrator.
Runs all scrapers, cleans data, deduplicates, and generates output.
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime
import logging

# Add scrapers to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scrapers'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))

from scrapers.ai_tools import AIToolsScraper
from scrapers.islamic import IslamicResourcesScraper
from scrapers.education import EducationScraper
from scrapers.marketplace import MarketplaceScraper
from scrapers.productivity import ProductivityToolsScraper

from utils.scraper_utils import (
    save_json, load_json, deduplicate_items, 
    filter_valid_items, merge_json_files
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DataCollectionPipeline:
    """Main pipeline for collecting, processing, and saving all data."""
    
    def __init__(self, output_dir: str = "./data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.all_items = []
    
    def run_all_scrapers(self, etsy_api_key: str = None) -> dict:
        """Run all scrapers and collect data."""
        logger.info("=" * 60)
        logger.info("Starting comprehensive data collection pipeline")
        logger.info("=" * 60)
        
        results = {}
        
        # AI Tools
        logger.info("\n--- Running AI Tools Scraper ---")
        try:
            ai_scraper = AIToolsScraper()
            ai_items = ai_scraper.run()
            ai_scraper.close()
            results['ai_tools'] = ai_items
            logger.info(f"✓ Collected {len(ai_items)} AI tools")
        except Exception as e:
            logger.error(f"✗ AI Tools scraper failed: {e}")
            results['ai_tools'] = []
        
        # Islamic Resources
        logger.info("\n--- Running Islamic Resources Scraper ---")
        try:
            islamic_scraper = IslamicResourcesScraper()
            islamic_items = islamic_scraper.run()
            islamic_scraper.close()
            results['islamic'] = islamic_items
            logger.info(f"✓ Collected {len(islamic_items)} Islamic resources")
        except Exception as e:
            logger.error(f"✗ Islamic Resources scraper failed: {e}")
            results['islamic'] = []
        
        # Education
        logger.info("\n--- Running Education Scraper ---")
        try:
            edu_scraper = EducationScraper()
            edu_items = edu_scraper.run()
            edu_scraper.close()
            results['education'] = edu_items
            logger.info(f"✓ Collected {len(edu_items)} educational resources")
        except Exception as e:
            logger.error(f"✗ Education scraper failed: {e}")
            results['education'] = []
        
        # Marketplace
        logger.info("\n--- Running Marketplace Scraper ---")
        try:
            marketplace_scraper = MarketplaceScraper(etsy_api_key=etsy_api_key)
            marketplace_items = marketplace_scraper.run()
            marketplace_scraper.close()
            results['marketplace'] = marketplace_items
            logger.info(f"✓ Collected {len(marketplace_items)} marketplace items")
        except Exception as e:
            logger.error(f"✗ Marketplace scraper failed: {e}")
            results['marketplace'] = []
        
        # Productivity Tools
        logger.info("\n--- Running Productivity Tools Scraper ---")
        try:
            productivity_scraper = ProductivityToolsScraper()
            productivity_items = productivity_scraper.run()
            productivity_scraper.close()
            results['productivity'] = productivity_items
            logger.info(f"✓ Collected {len(productivity_items)} productivity tools")
        except Exception as e:
            logger.error(f"✗ Productivity Tools scraper failed: {e}")
            results['productivity'] = []
        
        return results
    
    def process_and_save(self, results: dict) -> None:
        """Process and save all collected data."""
        logger.info("\n" + "=" * 60)
        logger.info("Processing and saving data")
        logger.info("=" * 60)
        
        # Save individual category files
        for category, items in results.items():
            # Clean data
            valid_items = filter_valid_items(items)
            deduplicated_items = deduplicate_items(valid_items)
            
            # Save
            output_file = self.output_dir / f"{category}.json"
            if save_json(deduplicated_items, str(output_file)):
                logger.info(f"✓ Saved {len(deduplicated_items)} {category} items")
                self.all_items.extend(deduplicated_items)
            else:
                logger.error(f"✗ Failed to save {category} data")
        
        # Save combined file
        logger.info("\n--- Creating master dataset ---")
        combined_file = self.output_dir / "all_items.json"
        combined_items = deduplicate_items(filter_valid_items(self.all_items))
        if save_json(combined_items, str(combined_file)):
            logger.info(f"✓ Created master dataset with {len(combined_items)} total items")
        
        # Generate report
        self._generate_report(results)
    
    def _generate_report(self, results: dict) -> None:
        """Generate collection report."""
        logger.info("\n" + "=" * 60)
        logger.info("DATA COLLECTION REPORT")
        logger.info("=" * 60)
        
        total_items = sum(len(items) for items in results.values())
        total_unique = len(deduplicate_items(self.all_items))
        
        logger.info(f"\nCollection Summary:")
        logger.info(f"  Total categories: {len(results)}")
        logger.info(f"  Total items collected: {total_items}")
        logger.info(f"  Total unique items: {total_unique}")
        logger.info(f"  Output directory: {self.output_dir.absolute()}")
        
        logger.info(f"\nBreakdown by category:")
        for category, items in results.items():
            valid = len(filter_valid_items(items))
            logger.info(f"  - {category}: {valid} items")
        
        logger.info(f"\nLicense Attribution Notice:")
        logger.info(f"  All collected items include:")
        logger.info(f"  - Original source URL")
        logger.info(f"  - Source name")
        logger.info(f"  - License information")
        logger.info(f"  - Attribution requirement flag")
        logger.info(f"\n  When displaying these items on your website,")
        logger.info(f"  ensure proper attribution to all sources.")
        
        logger.info(f"\n{'=' * 60}")
        logger.info("Pipeline complete!")
        logger.info(f"{'=' * 60}\n")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Data collection pipeline for HUSIN website'
    )
    parser.add_argument(
        '--output',
        default='./data',
        help='Output directory for collected data'
    )
    parser.add_argument(
        '--etsy-key',
        default=None,
        help='Etsy API key (optional)'
    )
    
    args = parser.parse_args()
    
    pipeline = DataCollectionPipeline(output_dir=args.output)
    results = pipeline.run_all_scrapers(etsy_api_key=args.etsy_key)
    pipeline.process_and_save(results)


if __name__ == '__main__':
    main()
