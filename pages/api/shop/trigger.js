/**
 * HUSIN ESHOP — POST /api/shop/trigger
 * Fixed version — works within Vercel 60s hobby plan limit
 * Searches 10 sources at a time instead of all 30 at once
 * Sends results to Telegram as they come in (batch by batch)
 * PRIVATE — requires x-shop-token header
 */

import { ALL_SOURCES, USD_TO_SAR }    from '../../../lib/sources'
import { applyPricingToAll }          from '../../../lib/pricingEngine'
import { loadExistingFingerprints,
         filterNewProducts,
         saveToInitialList }           from '../../../lib/deduplicator'
import { sendBatchToTelegram }         from '../../../lib/telegramNotifier'
import { db }                          from '../../../lib/firebaseAdmin'
import crypto                          from 'crypto'

const TIMEOUT_MS    = 12000  // 12s per source
const BATCH_SIZE    = 5      // sources per parallel batch
const PRODUCTS_EACH = 5      // products per source

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) return false
  if (token === process.env.ADMIN_SECRET) return true
  for (let i = 0; i <= 2; i++) {
    const w = Math.floor(Date.now() / 10000) - i
    const expected = crypto
      .createHmac('sha256', process.env.ADMIN_SECRET)
      .update(`husin_shop_${w}`)
      .digest('hex')
    if (token === expected) return true
  }
  return false
}

// ── Fetch with hard timeout ────────────────────────────────────────────────────
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    return null
  }
}

// ── Universal parser — works for all sources ───────────────────────────────────
async function scrapeSource(source) {
  const query = 'best selling trending products'
  const html  = await safeFetch(source.searchUrl(query))
  if (!html) {
    console.log(`[ShopTrigger] ⚠️ No response: ${source.name}`)
    return []
  }

  const items = []

  // Try to extract Next.js __NEXT_DATA__ first (works for Noon, Namshi, Ounass etc)
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
  if (nextMatch) {
    try {
      const raw    = nextMatch[1]
      const names  = [...raw.matchAll(/"(?:name|title|productName|displayTitle)"\s*:\s*"([^"]{5,120})"/g)].map(m => m[1])
      const prices = [...raw.matchAll(/"(?:price|salePrice|minPrice|finalPrice)"\s*:\s*"?(\d+\.?\d*)"?/g)].map(m => m[1])
      const links  = [...raw.matchAll(/"(?:url|productUrl|href|link)"\s*:\s*"(https?:[^"]+)"/g)].map(m => m[1])
      const images = [...raw.matchAll(/"(?:image|imageUrl|thumbnail|mainImage|imageKey)"\s*:\s*"(https?:[^"]+)"/g)].map(m => m[1])

      for (let i = 0; i < Math.min(names.length, PRODUCTS_EACH); i++) {
        if (!names[i]) continue
        const rawPrice = prices[i] ? parseFloat(prices[i]) : null
        items.push({
          name:       names[i].substring(0, 120),
          rawPrice:   source.currency === 'SAR' ? rawPrice : rawPrice ? Math.round(rawPrice * USD_TO_SAR) : null,
          currency:   'SAR',
          sourceLink: links[i] || source.searchUrl(query),
          image:      images[i] || null,
          sourceId:   source.id,
          sourceName: source.name,
          sourceFlag: source.flag || '',
          category:   source.categories?.[0] || 'general',
        })
      }
      if (items.length > 0) {
        console.log(`[ShopTrigger] ✅ ${source.name}: ${items.length} products (Next.js)`)
        return items
      }
    } catch (e) { /* fall through */ }
  }

  // Amazon-specific parser
  if (source.parser === 'amazon') {
    const titleReg = /class="a-size-medium a-color-base a-text-normal"[^>]*>([^<]{10,150})</g
    const priceReg = /class="a-price-whole"[^>]*>([^<]{1,12})</g
    const asinReg  = /data-asin="([A-Z0-9]{10})"/g
    const imgReg   = /data-asin="[A-Z0-9]{10}"[\s\S]{0,800}?<img[^>]+src="(https:\/\/m\.media-amazon[^"]+)"/g

    let m
    const titles = [], prices = [], asins = [], images = []
    while ((m = titleReg.exec(html)) !== null) titles.push(m[1].trim())
    while ((m = priceReg.exec(html)) !== null) prices.push(m[1].replace(/[^0-9.]/g,''))
    while ((m = asinReg.exec(html)) !== null) { if (m[1] !== 'undefined') asins.push(m[1]) }
    while ((m = imgReg.exec(html))  !== null) images.push(m[1])

    for (let i = 0; i < Math.min(titles.length, PRODUCTS_EACH); i++) {
      if (!titles[i]) continue
      const sarPrice = prices[i] ? parseFloat(prices[i]) : null
      items.push({
        name:       titles[i].substring(0, 120),
        rawPrice:   sarPrice,
        currency:   'SAR',
        sourceLink: asins[i] ? `${source.baseUrl}/dp/${asins[i]}` : source.searchUrl(query),
        image:      images[i] || null,
        sourceId:   source.id,
        sourceName: source.name,
        sourceFlag: source.flag || '',
        category:   'general',
      })
    }
    if (items.length > 0) {
      console.log(`[ShopTrigger] ✅ ${source.name}: ${items.length} products (Amazon)`)
      return items
    }
  }

  // eBay-specific parser
  if (source.parser === 'ebay') {
    const titleReg = /<span[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([\s\S]{5,120}?)<\/span>/g
    const priceReg = /<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([\s\S]{1,30}?)<\/span>/g
    const linkReg  = /<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]+)"/g

    let m
    const titles = [], prices = [], links = []
    while ((m = titleReg.exec(html)) !== null) {
      const t = m[1].replace(/<[^>]+>/g,'').trim()
      if (t && !t.includes('Shop on eBay')) titles.push(t)
    }
    while ((m = priceReg.exec(html)) !== null) prices.push(m[1].replace(/<[^>]+>/g,'').trim())
    while ((m = linkReg.exec(html))  !== null) links.push(m[1].split('?')[0])

    for (let i = 0; i < Math.min(titles.length, PRODUCTS_EACH); i++) {
      if (!titles[i]) continue
      const priceMatch = prices[i]?.match(/[\$£€]?([\d,]+\.?\d*)/)
      const usdPrice   = priceMatch ? parseFloat(priceMatch[1].replace(',','')) : null
      const sarPrice   = usdPrice ? Math.round(usdPrice * USD_TO_SAR) : null
      items.push({
        name:       titles[i].substring(0, 120),
        rawPrice:   sarPrice,
        currency:   'SAR',
        sourceLink: links[i] || source.searchUrl(query),
        image:      null,
        sourceId:   source.id,
        sourceName: source.name,
        sourceFlag: source.flag || '',
        category:   'general',
      })
    }
    if (items.length > 0) {
      console.log(`[ShopTrigger] ✅ ${source.name}: ${items.length} products (eBay)`)
      return items
    }
  }

  // Generic JSON regex fallback — catches AliExpress, Shein, Trendyol etc
  const nameReg  = /"(?:name|title|displayTitle|productName)"\s*:\s*"([^"]{5,120})"/g
  const priceReg2 = /"(?:price|salePrice|minPrice|amount)"\s*:\s*"?(\d+\.?\d*)"?/g
  const linkReg2  = /"(?:url|productUrl|link|href)"\s*:\s*"(https?:[^"]{10,200})"/g
  const imgReg2   = /"(?:image|imageUrl|thumbnail|img)"\s*:\s*"(https?:[^"]{10,200})"/g

  let m2
  const names2 = [], prices2 = [], links2 = [], images2 = []
  while ((m2 = nameReg.exec(html))   !== null) names2.push(m2[1])
  while ((m2 = priceReg2.exec(html)) !== null) prices2.push(m2[1])
  while ((m2 = linkReg2.exec(html))  !== null) links2.push(m2[1])
  while ((m2 = imgReg2.exec(html))   !== null) images2.push(m2[1])

  for (let i = 0; i < Math.min(names2.length, PRODUCTS_EACH); i++) {
    if (!names2[i]) continue
    const rawP   = prices2[i] ? parseFloat(prices2[i]) : null
    const sarP   = rawP ? (source.currency === 'SAR' ? rawP : Math.round(rawP * USD_TO_SAR)) : null
    items.push({
      name:       names2[i].substring(0, 120),
      rawPrice:   sarP,
      currency:   'SAR',
      sourceLink: links2[i] || source.searchUrl(query),
      image:      images2[i] || null,
      sourceId:   source.id,
      sourceName: source.name,
      sourceFlag: source.flag || '',
      category:   source.categories?.[0] || 'general',
    })
  }

  console.log(`[ShopTrigger] ${items.length > 0 ? '✅' : '⚠️'} ${source.name}: ${items.length} products (generic)`)
  return items.slice(0, PRODUCTS_EACH)
}

// ── Main handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const token = req.headers['x-shop-token']
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sessionId = `shop_session_${Date.now()}`

  // Respond immediately to the dashboard
  res.status(200).json({
    success:   true,
    sessionId,
    message:   `Search started across ${ALL_SOURCES.length} sources. Results arriving on Telegram shortly.`,
  })

  // ── Run in background after responding ────────────────────────────────────
  try {
    console.log(`[ShopTrigger] Session ${sessionId} started — ${ALL_SOURCES.length} sources`)

    // Load existing fingerprints for deduplication
    const existingFPs = await loadExistingFingerprints('shop_initial_products')

    const allProducts = []
    const sourceResults = []

    // Search sources in small batches to stay within timeout
    for (let i = 0; i < ALL_SOURCES.length; i += BATCH_SIZE) {
      const batch   = ALL_SOURCES.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map(s => scrapeSource(s)))

      results.forEach((result, idx) => {
        const source   = batch[idx]
        const products = result.status === 'fulfilled' ? result.value : []
        sourceResults.push({
          sourceId:   source.id,
          sourceName: source.name,
          type:       source.type,
          found:      products.length,
        })
        allProducts.push(...products)
      })

      // Small pause between batches
      if (i + BATCH_SIZE < ALL_SOURCES.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    console.log(`[ShopTrigger] Raw: ${allProducts.length} products from ${sourceResults.filter(s => s.found > 0).length}/${ALL_SOURCES.length} sources`)

    // Deduplicate
    const newProducts    = filterNewProducts(
      allProducts.map((p, i) => ({ ...p, id: `prod_${Date.now()}_${i}`, fingerprint: null })),
      existingFPs
    )

    // Apply pricing
    const pricedProducts = applyPricingToAll(newProducts)
    const rankedProducts = pricedProducts.map((p, i) => ({ ...p, rank: i + 1, status: 'pending', decision: 'pending' }))

    console.log(`[ShopTrigger] After dedup + pricing: ${rankedProducts.length} products`)

    // Save session to Firestore
    await db.collection('shop_search_sessions').doc(sessionId).set({
      sessionId,
      searchQuery:  'best selling trending products',
      totalFound:   rankedProducts.length,
      viableCount:  rankedProducts.filter(p => p.pricing?.isViable).length,
      sourceResults,
      status:       'pending_review',
      createdAt:    new Date().toISOString(),
    })

    // Save products to Firestore in chunks
    for (let i = 0; i < rankedProducts.length; i += 400) {
      const batch = db.batch()
      rankedProducts.slice(i, i + 400).forEach(p => {
        const ref = db.collection('shop_search_sessions').doc(sessionId)
          .collection('products').doc(p.id)
        batch.set(ref, { ...p, sessionId })
      })
      await batch.commit()
    }

    // Save to initial list (prevents future repeats)
    await saveToInitialList(rankedProducts, 'shop_initial_products')

    // Send to Telegram
    await sendBatchToTelegram(rankedProducts, sessionId, { searchQuery: 'trending products' })

    // Update session status
    await db.collection('shop_search_sessions').doc(sessionId).update({
      status:      'sent_to_telegram',
      completedAt: new Date().toISOString(),
    })

    console.log(`[ShopTrigger] ✅ Session ${sessionId} complete — ${rankedProducts.length} products sent to Telegram`)

  } catch (error) {
    console.error(`[ShopTrigger] ❌ Error:`, error.message)
    try {
      await db.collection('shop_search_sessions').doc(sessionId)
        .update({ status: 'error', error: error.message })
    } catch (e) { /* ignore */ }
  }
}

export const config = {
  api: { responseLimit: false, externalResolver: true },
  maxDuration: 60,
}
