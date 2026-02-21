"""
HTML Generator - Converts collected JSON data into website HTML sections
with proper source attribution.
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HTMLGenerator:
    """Generates HTML from collected data with proper attribution."""
    
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir)
    
    def load_category_data(self, category: str) -> List[Dict]:
        """Load data for a specific category."""
        filepath = self.data_dir / f"{category}.json"
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load {category} data: {e}")
            return []
    
    def generate_item_card_html(self, item: Dict, show_attribution: bool = True) -> str:
        """Generate HTML for a single item card."""
        title = item.get('title', 'Unknown')
        description = item.get('description', '')
        url = item.get('url', '#')
        image_url = item.get('image_url')
        source_name = item.get('source_name', 'Unknown Source')
        source_url = item.get('source_url', '#')
        license_name = item.get('license', 'Unknown License')
        tags = item.get('tags', [])
        
        tags_html = ''.join(
            f'<span class="tag">{tag}</span>' for tag in tags[:5]
        )
        
        image_section = ''
        if image_url:
            image_section = f'''
            <div class="item-image">
              <img src="{image_url}" alt="{title}" loading="lazy" />
            </div>
            '''
        
        attribution_section = ''
        if show_attribution and item.get('attribution_required'):
            attribution_section = f'''
            <div class="item-attribution">
              <small>
                Source: <a href="{source_url}" target="_blank" rel="noopener">{source_name}</a>
                | License: {license_name}
              </small>
            </div>
            '''
        
        html = f'''
        <div class="item-card">
          {image_section}
          <div class="item-content">
            <h3 class="item-title">
              <a href="{url}" target="_blank" rel="noopener">{title}</a>
            </h3>
            <p class="item-description">{description}</p>
            <div class="item-tags">
              {tags_html}
            </div>
            {attribution_section}
          </div>
        </div>
        '''
        return html
    
    def generate_category_section(self, category: str, title: str, show_attribution: bool = True) -> str:
        """Generate complete HTML section for a category."""
        items = self.load_category_data(category)
        
        if not items:
            logger.warning(f"No data found for category: {category}")
            return ""
        
        items_html = ''.join(
            self.generate_item_card_html(item, show_attribution)
            for item in items[:50]  # Limit to 50 items per category
        )
        
        html = f'''
        <section class="category-section" id="{category}">
          <div class="category-container">
            <h2 class="category-title">{title}</h2>
            <div class="items-grid">
              {items_html}
            </div>
          </div>
        </section>
        '''
        return html
    
    def generate_full_page_html(self) -> str:
        """Generate complete HTML page with all categories."""
        categories = [
            ('ai_tools', 'AI Tools & Models'),
            ('islamic', 'Islamic Resources & Libraries'),
            ('education', 'Educational Resources'),
            ('marketplace', 'Marketplace & Products'),
            ('productivity', 'Productivity Tools')
        ]
        
        sections = ''.join(
            self.generate_category_section(cat_id, title)
            for cat_id, title in categories
        )
        
        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HUSIN - Data Collections</title>
    <style>
        :root {{
            --color-primary: #1a1a2e;
            --color-secondary: #16213e;
            --color-accent: #0f3460;
            --color-text: #eaeaea;
            --color-border: #e94560;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--color-primary);
            color: var(--color-text);
            line-height: 1.6;
        }}
        
        .category-section {{
            padding: 60px 20px;
            border-bottom: 2px solid var(--color-accent);
        }}
        
        .category-container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        
        .category-title {{
            font-size: 2.5rem;
            margin-bottom: 40px;
            color: var(--color-accent);
            border-bottom: 3px solid var(--color-border);
            padding-bottom: 15px;
        }}
        
        .items-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
        }}
        
        .item-card {{
            background: var(--color-secondary);
            border: 1px solid var(--color-accent);
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
        }}
        
        .item-card:hover {{
            transform: translateY(-5px);
            border-color: var(--color-border);
            box-shadow: 0 10px 25px rgba(233, 69, 96, 0.2);
        }}
        
        .item-image {{
            width: 100%;
            height: 150px;
            overflow: hidden;
            background: var(--color-accent);
        }}
        
        .item-image img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
        }}
        
        .item-content {{
            padding: 20px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }}
        
        .item-title {{
            font-size: 1.3rem;
            margin-bottom: 10px;
        }}
        
        .item-title a {{
            color: var(--color-border);
            text-decoration: none;
            transition: color 0.2s;
        }}
        
        .item-title a:hover {{
            color: #ff6b8a;
        }}
        
        .item-description {{
            font-size: 0.9rem;
            color: #bbb;
            margin-bottom: 15px;
            flex-grow: 1;
        }}
        
        .item-tags {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 15px;
        }}
        
        .tag {{
            background: var(--color-accent);
            color: var(--color-text);
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.75rem;
            border: 1px solid var(--color-border);
        }}
        
        .item-attribution {{
            border-top: 1px solid var(--color-accent);
            padding-top: 10px;
            font-size: 0.8rem;
            color: #999;
        }}
        
        .item-attribution a {{
            color: var(--color-border);
            text-decoration: none;
        }}
        
        .item-attribution a:hover {{
            text-decoration: underline;
        }}
        
        @media (max-width: 768px) {{
            .category-title {{
                font-size: 1.8rem;
            }}
            
            .items-grid {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <main>
        {sections}
    </main>
    
    <footer style="text-align: center; padding: 40px 20px; border-top: 2px solid var(--color-accent); margin-top: 60px;">
        <p style="color: #999; font-size: 0.9rem; margin-bottom: 10px;">
            All data collected from open APIs, public domains, and openly-licensed sources.
        </p>
        <p style="color: #999; font-size: 0.9rem;">
            Each item includes proper attribution to its original source and license information.
        </p>
    </footer>
</body>
</html>
'''
        return html
    
    def save_html(self, html: str, output_path: str = "./index.html") -> bool:
        """Save generated HTML to file."""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html)
            logger.info(f"✓ Saved HTML to {output_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save HTML: {e}")
            return False
    
    def generate(self, output_path: str = "./index.html") -> bool:
        """Generate and save complete HTML."""
        logger.info("Generating HTML from collected data...")
        html = self.generate_full_page_html()
        return self.save_html(html, output_path)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Generate HTML from collected data'
    )
    parser.add_argument(
        '--data-dir',
        default='./data',
        help='Directory containing JSON data files'
    )
    parser.add_argument(
        '--output',
        default='./index.html',
        help='Output HTML file path'
    )
    
    args = parser.parse_args()
    
    generator = HTMLGenerator(data_dir=args.data_dir)
    if generator.generate(output_path=args.output):
        logger.info(f"✓ HTML generated successfully at {args.output}")
    else:
        logger.error("✗ Failed to generate HTML")


if __name__ == '__main__':
    main()
