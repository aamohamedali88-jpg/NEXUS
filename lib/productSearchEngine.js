/**
 * HUSIN — Product Search Engine
 * Scrapes 5 products from each of 30 sources = 150 products per cycle
 * Runs in parallel batches to complete fast
 * All products verified real-time — no cached/mocked data
 */

import { ALL_SOURCES, USD_TO_SAR } from './sources.js'

const PRODUCTS_PER_SOURCE = 5
const TIMEOUT_MS = 15000

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Cache-Control': 'no-cache',
}

// ── Fetch with timeout ─────────────────────────────────────────────────────────
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...HEADERS, ...(options.headers || {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (e) {
    console.warn(`[Fetch] Failed: ${url.substring(0, 60)} — ${e.message}`)
    return null
  }
}

// ── Source-specific parsers ────────────────────────────────────────────────────

async function parseAmazon(source, searchQuery) {
  const html = await safeFetch(source.searchUrl(searchQuery))
  if (!html) return []
  const items = []

  const titleReg = /class="a-size-medium a-color-base a-text-normal"[^>]*>([^<]{10,150})</g
  const priceReg = /class="a-price-whole"[^>]*>([^<]{1,12})</g
  const asinReg = /data-asin="([A-Z0-9]{10})"/g
  const imgReg = /data-asin="[A-Z0-9]{10}"[\s\S]{0,500}?<img[^>]+src="(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/g

  const titles = [], prices = [], asins = [], images = []
  let m
  while ((m = titleReg.exec(html)) !== null) titles.push(m[1].trim())
  while ((m = priceReg.exec(html)) !== null) prices.push(m[1].replace(/,/g,'').trim())
  while ((m = asinReg.exec(html)) !== null) { if (m[1] !== 'undefined') asins.push(m[1]) }
  while ((m = imgReg.exec(html)) !== null) images.push(m[1])

  for (let i = 0; i < Math.min(titles.length, PRODUCTS_PER_SOURCE); i++) {
    if (!titles[i]) continue
    items.push({
      name: titles[i].substring(0, 150),
      rawPrice: prices[i] ? parseFloat(prices[i]) : null,
      currency: source.currency,
      sourceLink: asins[i] ? `${source.baseUrl}/dp/${asins[i]}` : source.searchUrl(searchQuery),
      image: images[i] || null,
      specifications: null,
      sourceId: source.id,
      sourceName: source.name,
    })
  }
  return items.slice(0, PRODUCTS_PER_SOURCE)
}

async function parseNoon(source, searchQuery) {
  const html = await safeFetch(source.searchUrl(searchQuery))
  if (!html) return []
  const items = []

  // Try Next.js hydration data
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1])
      const hits = data?.props?.pageProps?.catalog?.hits ||
                   data?.props?.pageProps?.initialData?.hits || []
      hits.slice(0, PRODUCTS_PER_SOURCE).forEach(h => {
        if (!h.name) return
        items.push({
          name: h.name.substring(0, 150),
          rawPrice: h.price ? parseFloat(h.price) : null,
          currency: 'SAR',
          sourceLink: h.sku ? `${source.baseUrl}/saudi-en/${h.sku}/p/` : source.searchUrl(searchQuery),
          image: h.image_keys?.[0] ? `https://f.nooncdn.com/p/${h.image_keys[0]}_A.jpg` : null,
          specifications: h.brand ? `Brand: ${h.brand}` : null,
          sourceId: source.id,
          sourceName: source.name,
        })
      })
    } catch (e) { /* fall through */ }
  }

  // Regex fallback
  if (items.length === 0) {
    const nameReg = /"name":"([^"]{5,150})"/g
    const priceReg = /"price":(\d+\.?\d*)/g
    const skuReg = /"sku":"([A-Z0-9a-z_]{5,40})"/g
    let nm, pm, sm
    const names = [], prices = [], skus = []
    while ((nm = nameReg.exec(html)) !== null) names.push(nm[1])
    while ((pm = priceReg.exec(html)) !== null) prices.push(pm[1])
    while ((sm = skuReg.exec(html)) !== null) skus.push(sm[1])
    for (let i = 0; i < Math.min(names.length, PRODUCTS_PER_SOURCE); i++) {
      items.push({
        name: names[i].substring(0, 150),
        rawPrice: prices[i] ? parseFloat(prices[i]) : null,
        currency: 'SAR',
        sourceLink: skus[i] ? `${source.baseUrl}/saudi-en/${skus[i]}/p/` : source.searchUrl(searchQuery),
        image: null, specifications: null,
        sourceId: source.id, sourceName: source.name,
      })
    }
  }
  return items.slice(0, PRODUCTS_PER_SOURCE)
}

async function parseEbay(source, searchQuery) {
  const html = await safeFetch(source.searchUrl(searchQuery))
  if (!html) return []
  const items = []

  const titleReg = /<span[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([\s\S]{5,150}?)<\/span>/g
  const priceReg = /<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([\s\S]{1,30}?)<\/span>/g
  const linkReg = /<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]+)"/g
  const imgReg = /<img[^>]*class="[^"]*s-item__image-img[^"]*"[^>]*src="([^"]+)"/g

  let tm, pm, lm, im
  const titles = [], prices = [], links = [], images = []
  while ((tm = titleReg.exec(html)) !== null) {
    const t = tm[1].replace(/<[^>]+>/g, '').trim()
    if (t && !t.includes('Shop on eBay')) titles.push(t)
  }
  while ((pm = priceReg.exec(html)) !== null) prices.push(pm[1].replace(/<[^>]+>/g,'').trim())
  while ((lm = linkReg.exec(html)) !== null) links.push(lm[1].split('?')[0])
  while ((im = imgReg.exec(html)) !== null) images.push(im[1])

  for (let i = 0; i < Math.min(titles.length, PRODUCTS_PER_SOURCE); i++) {
    if (!titles[i]) continue
    const priceMatch = prices[i]?.match(/[\$£€]?([\d,]+\.?\d*)/)
    const usdPrice = priceMatch ? parseFloat(priceMatch[1].replace(',','')) : null
    items.push({
      name: titles[i].substring(0, 150),
      rawPrice: usdPrice,
      currency: 'USD',
      sourceLink: links[i] || source.searchUrl(searchQuery),
      image: images[i] || null,
      specifications: null,
      sourceId: source.id,
      sourceName: source.name,
    })
  }
  return items.slice(0, PRODUCTS_PER_SOURCE)
}

async function parseAliExpress(source, searchQuery) {
  const html = await safeFetch(source.searchUrl(searchQuery))
  if (!html) return []
  const items = []

  const titleReg = /"displayTitle"\s*:\s*"([^"]{5,150})"/g
  const priceReg = /"minPrice"\s*:\s*"?(\d+\.?\d*)"?/g
  const idReg = /"productId"\s*:\s*"?(\d{5,20})"?/g
  const imgReg = /"imageUrl"\s*:\s*"(https?:[^"]+)"/g

  let tm, pm, im, igm
  const titles = [], prices = [], ids = [], images = []
  while ((tm = titleReg.exec(html)) !== null) titles.push(tm[1])
  while ((pm = priceReg.exec(html)) !== null) prices.push(pm[1])
  while ((im = idReg.exec(html)) !== null) ids.push(im[1])
  while ((igm = imgReg.exec(html)) !== null) images.push(igm[1])

  for (let i = 0; i < Math.min(titles.length, PRODUCTS_PER_SOURCE); i++) {
    if (!titles[i]) continue
    items.push({
      name: titles[i].substring(0, 150),
      rawPrice: prices[i] ? parseFloat(prices[i]) : null,
      currency: 'USD',
      sourceLink: ids[i] ? `${source.baseUrl}/item/${ids[i]}.html` : source.searchUrl(searchQuery),
      image: images[i] || null,
      specifications: null,
      sourceId: source.id,
      sourceName: source.name,
    })
  }
  return items.slice(0, PRODUCTS_PER_SOURCE)
}

// Generic JSON-data parser for Next.js powered sites (Namshi, Ounass, etc)
async function parseNextJSSite(source, searchQuery) {
  const html = await safeFetch(source.searchUrl(searchQuery))
  if (!html) return []
  const items = []

  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
  if (nextMatch) {
    try {
      const raw = nextMatch[1]
      // Generic extractors
      const names = [...raw.matchAll(/"(?:name|title|productName)"\s*:\s*"([^"]{5,150})"/g)].map(m => m[1])
      const prices = [...raw.matchAll(/"(?:price|salePrice|finalPrice)"\s*:\s*"?(\d+\.?\d*)"?/g)].map(m => m[1])
      const links = [...raw.matchAll(/"(?:url|productUrl|href)"\s*:\s*"(https?:[^"]+)"/g)].map(m => m[1])
      const images = [...raw.matchAll(/"(?:image|imageUrl|thumbnail|mainImage)"\s*:\s*"(https?:[^"]+)"/g)].map(m => m[1])

      for (let i = 0; i < Math.min(names.length, PRODUCTS_PER_SOURCE); i++) {
        items.push({
          name: names[i].substring(0, 150),
          rawPrice: prices[i] ? parseFloat(prices[i]) : null,
          currency: source.currency,
          sourceLink: links[i] || source.searchUrl(searchQuery),
          image: images[i] || null,
          specifications: null,
          sourceId: source.id,
          sourceName: source.name,
        })
      }
    } catch (e) { /* JSON parse failed */ }
  }

  // HTML regex fallback for any remaining sources
  if (items.length === 0) {
    const nameReg = /(?:product-title|item-name|product-name)[^>]*>([^<]{5,150})</gi
    const priceReg = /(?:price|amount)[^>]*>\s*[\$£€SAR]?\s*([\d,]+\.?\d*)/gi
    let nm, pm
    const names = [], prices = []
    while ((nm = nameReg.exec(html)) !== null) names.push(nm[1].trim())
    while ((pm = priceReg.exec(html)) !== null) prices.push(pm[1].replace(/,/,''))
    for (let i = 0; i < Math.min(names.length, PRODUCTS_PER_SOURCE); i++) {
      items.push({
        name: names[i].substring(0, 150),
        rawPrice: prices[i] ? parseFloat(prices[i]) : null,
        currency: source.currency,
        sourceLink: source.searchUrl(searchQuery),
        image: null, specifications: null,
        sourceId: source.id, sourceName: source.name,
      })
    }
  }
  return items.slice(0, PRODUCTS_PER_SOURCE)
}

// ── Parser router ─────────────────────────────────────────────────────────────
async function scrapeSource(source, searchQuery) {
  console.log(`[Search] Scraping: ${source.name}`)
  try {
    switch (source.parser) {
      case 'amazon':     return await parseAmazon(source, searchQuery)
      case 'noon':       return await parseNoon(source, searchQuery)
      case 'ebay':       return await parseEbay(source, searchQuery)
      case 'aliexpress': return await parseAliExpress(source, searchQuery)
      default:           return await parseNextJSSite(source, searchQuery)
    }
  } catch (e) {
    console.error(`[Search] Error scraping ${source.name}:`, e.message)
    return []
  }
}

// ── Master search — 30 sources in parallel batches ────────────────────────────
export async function searchAllSources(searchQuery = 'best selling products') {
  console.log(`[SearchEngine] Starting full cycle: "${searchQuery}"`)
  console.log(`[SearchEngine] Searching ${ALL_SOURCES.length} sources × ${PRODUCTS_PER_SOURCE} products = ${ALL_SOURCES.length * PRODUCTS_PER_SOURCE} target`)

  const BATCH_SIZE = 6 // run 6 sources at once to avoid rate limiting
  const allProducts = []
  const sourceResults = []

  for (let i = 0; i < ALL_SOURCES.length; i += BATCH_SIZE) {
    const batch = ALL_SOURCES.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(source => scrapeSource(source, searchQuery))
    )

    results.forEach((result, idx) => {
      const source = batch[idx]
      const products = result.status === 'fulfilled' ? result.value : []
      sourceResults.push({
        sourceId: source.id,
        sourceName: source.name,
        type: source.type,
        found: products.length,
        status: result.status,
      })
      allProducts.push(...products)
    })

    // Brief pause between batches to be respectful
    if (i + BATCH_SIZE < ALL_SOURCES.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Add unique IDs to all products
  const timestampedProducts = allProducts.map((p, i) => ({
    ...p,
    id: `prod_${Date.now()}_${i}`,
    status: 'pending',
    searchedAt: new Date().toISOString(),
  }))

  console.log(`[SearchEngine] Raw results: ${timestampedProducts.length} products from ${sourceResults.filter(s => s.found > 0).length}/${ALL_SOURCES.length} sources`)

  return {
    products: timestampedProducts,
    sourceResults,
    searchQuery,
    searchedAt: new Date().toISOString(),
  }
}
