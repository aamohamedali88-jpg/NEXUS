# HUSIN Data Collection Pipeline

A comprehensive, legally-compliant Python system for collecting data from open APIs and openly-licensed sources with proper attribution.

## Overview

This pipeline collects data across 5 categories:
1. **AI Tools & Models** - From HuggingFace, GitHub, awesome-ai community lists
2. **Islamic Resources** - From Internet Archive, Wikisource, curated Islamic publishers
3. **Educational Resources** - From OpenStax, MIT OCW, OER Library, major platforms
4. **Marketplace** - From Etsy API, open-source platforms
5. **Productivity Tools** - From GitHub awesome lists, productivity repos

**Key Features:**
- ✅ Legitimate data collection from open APIs only
- ✅ Proper source attribution and license metadata for every item
- ✅ Rate limiting respects API terms of service
- ✅ Exponential backoff retry logic (3 attempts max)
- ✅ Automatic deduplication by content checksum
- ✅ HTML generation with attribution notices
- ✅ Modular scraper architecture

## Directory Structure

```
data_pipeline/
├── config/
│   └── sources.py              # Configuration of all open data sources
├── utils/
│   └── scraper_utils.py        # Reusable utilities (RateLimiter, HTTPClient, etc.)
├── scrapers/
│   ├── ai_tools.py            # AI/ML tools scraper
│   ├── islamic.py             # Islamic resources scraper
│   ├── education.py           # Educational resources scraper
│   ├── marketplace.py         # Marketplace scraper
│   └── productivity.py        # Productivity tools scraper
├── html_generator/
│   └── generator.py           # Converts JSON to attributed HTML
├── run_pipeline.py            # Master orchestrator
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

## Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Setup

1. Navigate to the data_pipeline directory:
```bash
cd data_pipeline
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Run Complete Data Collection

```bash
python run_pipeline.py
```

**Options:**
```bash
python run_pipeline.py --output ./data --etsy-key YOUR_ETSY_API_KEY
```

- `--output`: Directory to save collected data (default: `./data`)
- `--etsy-key`: Etsy API key for marketplace data (optional)

**Output Files:**
- `./data/ai_tools.json` - AI tools and models
- `./data/islamic.json` - Islamic resources
- `./data/education.json` - Educational materials
- `./data/marketplace.json` - Marketplace products
- `./data/productivity.json` - Productivity tools
- `./data/all_items.json` - Combined dataset with all items

### Generate HTML

Convert collected JSON data to styled HTML with attribution:

```bash
python html_generator/generator.py --data-dir ./data --output ./index.html
```

This creates a fully-styled HTML page displaying all collected items with:
- Category sections
- Item cards with images (if available)
- Tags and descriptions
- **Mandatory source attribution**
- License information

## Data Schema

Every collected item follows a normalized JSON structure:

```json
{
  "title": "Item Title",
  "description": "Brief description of the resource",
  "category": "ai_tools|islamic|education|marketplace|productivity",
  "tags": ["tag1", "tag2"],
  "url": "https://example.com/item",
  "image_url": "https://example.com/image.jpg",
  "source_url": "https://example.com/api",
  "source_name": "Example API",
  "license": "CC-BY 4.0|MIT|Apache-2.0|etc",
  "attribution_required": true,
  "created_at": "2024-02-21T10:30:00Z",
  "verified": true,
  "checksum": "abc123..."
}
```

**Key Fields for Attribution:**
- `source_url` - Where to find more from this source
- `source_name` - Name of the original source
- `license` - License under which content is shared
- `attribution_required` - Whether attribution is legally required

## Legal Compliance

**This entire system is designed for legal compliance:**

### Data Sources
All data is collected from:
- ✅ Public APIs with official documentation
- ✅ Openly-licensed content (CC-BY, MIT, etc.)
- ✅ Public domain sources (Internet Archive, Wikisource)
- ✅ Platforms that explicitly allow scraping (GitHub with appropriate `.robots` file handling)

### No Third-Party Content Stripping
- ✓ Every item includes original source URL
- ✓ Every item includes source name
- ✓ Every item includes license information
- ✓ Attribution is embedded in JSON and displayed in HTML

### API Rate Limiting
- Respects `requests_per_minute` limits per source
- Implements exponential backoff for retries
- Never exceeds rate limits defined in `config/sources.py`

### Website Display Requirements
When displaying collected items on your website:

1. **Always show source attribution:**
   ```html
   Source: <a href="source_url">source_name</a>
   License: license_type
   ```

2. **Include footer notice:**
   ```
   All data collected from open APIs and openly-licensed sources
   with proper attribution to original creators.
   ```

3. **Link back to original sources** when possible

## Architecture

### Collection Pipeline Flow

```
┌─────────────────┐
│ run_pipeline.py │
└────────┬────────┘
         │
    ┌────┴────┬────────┬──────────┬────────────┐
    ▼         ▼        ▼          ▼            ▼
[AI Tools] [Islamic] [Edu] [Marketplace] [Productivity]
    │         │        │          │            │
    └────┬────┴────┬───┴────┬─────┴────┬──────┘
         │         │        │          │
         ▼         ▼        ▼          ▼
    ┌─────────────────────────────────┐
    │ Validate & Deduplicate          │
    │ (by content checksum)           │
    └────────────┬────────────────────┘
                 │
         ┌───────┴────────┐
         ▼                ▼
    Individual      Combined
    JSONs          all_items.json
    (5 files)
         │
         └──────────────┬──────────────┐
                        ▼              ▼
                   HTML Output:   Next.js Pages
                   - Styled      - Dynamic routes
                   - Responsive  - Real-time data
                   - Attributed
```

### Rate Limiting & Retry Logic

```python
# Rate limiter enforces minimum interval between requests
interval = (60 / requests_per_minute) seconds between requests

# Exponential backoff on failures
Attempt 1: Immediate
Attempt 2: Wait 2 seconds, retry
Attempt 3: Wait 4 seconds, retry
After 3 failures: Log error, move to next source
```

## Configuration

Edit `config/sources.py` to:
- Add new data sources
- Adjust rate limits (requests per minute)
- Change API endpoints
- Add authentication headers

Example source configuration:
```python
'huggingface': {
    'name': 'HuggingFace Model Hub',
    'api_url': 'https://huggingface.co/api/models',
    'requests_per_minute': 60,
    'license': 'Varies (CC-BY, MIT, etc)',
    'attribution_required': True,
},
```

## Troubleshooting

### API Rate Limit Errors
Check the source's current rate limit in `config/sources.py` and reduce `requests_per_minute` if needed.

### Missing Data for a Category
Some scrapers use hardcoded fallback sources. Check logs for specific API failures.

### HTML Generation Fails
Ensure JSON files exist in the `--data-dir` directory and are valid JSON.

## Integration with Next.js

### Load JSON Data in Pages

```javascript
// pages/categories/[type].js
import fs from 'fs';
import path from 'path';

export async function getStaticProps({ params }) {
  const filePath = path.join(process.cwd(), 'data_pipeline', 'data', `${params.type}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  return {
    props: { items: data },
    revalidate: 86400, // ISR: regenerate daily
  };
}

export default function CategoryPage({ items }) {
  return (
    <div>
      {items.map(item => (
        <div key={item.checksum}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <small>
            Source: <a href={item.source_url}>{item.source_name}</a>
          </small>
        </div>
      ))}
    </div>
  );
}
```

### Automated Data Updates

Add to `package.json`:
```json
"scripts": {
  "update-data": "cd data_pipeline && python run_pipeline.py --output ../public/data",
  "build": "npm run update-data && next build"
}
```

## Performance Notes

- Initial collection: ~2-5 minutes (depends on API response times)
- Deduplication: O(n) with MD5 checksums
- HTML generation: <1 second for 500+ items
- JSON file sizes: 100-500 KB per category

## Support & Legal

### Open Licenses Used
- **CC-BY 4.0** - OpenStax, MIT OCW
- **CC-BY-SA 3.0** - Wikisource
- **CC0 1.0** - sindresorhus/awesome
- **Public Domain** - Internet Archive
- **Varies** - GitHub repos, HuggingFace models

### API Terms Compliance
All scrapers respect:
- Rate limits (configurable)
- User-Agent headers
- robots.txt (where applicable)
- License attributions

## Contributing

To add a new data source:

1. Create new scraper in `scrapers/new_source.py`
2. Add configuration to `config/sources.py`
3. Import and add to `run_pipeline.py`
4. Follow the same normalized JSON schema

All items MUST include:
- `source_url`, `source_name`, `license`, `attribution_required`

## License

The pipeline itself is provided as-is. Collected data retains licenses from original sources (CC-BY, MIT, etc). Always attribute according to source license requirements.

---

**Last Updated:** February 21, 2024
**Python Version:** 3.8+
**Status:** Production Ready ✅
