/**
 * HUSIN ESHOP — POST /api/shop/trigger
 * FIXED VERSION:
 * - Accepts raw ADMIN_SECRET as token (no HMAC expiry issue)
 * - Runs synchronously — sends Telegram BEFORE responding
 * - Searches 6 sources at a time in batches
 * - 10 second timeout per source
 * PRIVATE — requires x-shop-token header
 */

import { ALL_SOURCES, USD_TO_SAR }  from '../../../lib/sources'
import { applyPricingToAll }        from '../../../lib/pricingEngine'
import { loadExistingFingerprints,
         filterNewProducts,
         saveToInitialList }         from '../../../lib/deduplicator'
import { sendBatchToTelegram }       from '../../../lib/telegramNotifier'
import { db }                        from '../../../lib/firebaseAdmin'

const TIMEOUT_MS    = 10000
const BATCH_SIZE    = 6
const PRODUCTS_EACH = 5

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) return false
  // Accept raw password directly — simple and reliable
  return token === process.env.ADMIN_SECRET
}

async function safeFetch(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    return null
  }
}

async function scrapeSource(source) {
  const query = 'best selling trending 2026'
  const html  = await safeFetch(source.searchUrl(query))
  if (!html) return []

  const items = []

  // Try Next.js __NEXT_DATA__ (Noon, Namshi, Ounass, etc)
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
  if (nextMatch) {
    try {
      const raw    = nextMatch[1]
      const names  = [...raw.matchAll(/"(?:name|title|productName|displayTitle)"\s*:\s*"([^"]{5,120})"/g)].map(m => m[1])
      const prices = [...raw.matchAll(/"(?:price|salePrice|minPrice|finalPrice)"\s*:\s*"?(\d+\.?\d*)"?/g)].map(m => m[1])
      const links  = [...raw.matchAll(/"(?:url|productUrl|href|link)"\s*:\s*"(https?:[^"]{10,200})"/g)].map(m => m[1])
      const images = [...raw.matchAll(/"(?:image|imageUrl|thumbnail|mainImage)"\s*:\s*"(https?:[^"]{10,200})"/g)].map(m => m[1])

      for (let i = 0; i < Math.min(names.length, PRODUCTS_EACH); i++) {
        if (!names[i]) continue
        const rawP = prices[i] ? parseFloat(prices[i]) : null
        const sarP = rawP ? (source.currency === 'SAR' ? rawP : Math.round(rawP * USD_TO_SAR)) : null
        items.push({
          name: names[i].substring(0, 120), rawPrice: sarP, currency: 'SAR',
          sourceLink: links[i] || source.searchUrl(query), image: images[i] || null,
          sourceId: source.id, sourceName: source.name, sourceFlag: source.flag || '',
          category: source.categories?.[0] || 'general',
        })
      }
      if (items.length > 0) return items
    } catch (e) { /* fall through */ }
  }

  // Amazon parser
  if (source.parser === 'amazon') {
    const tR = /class="a-size-medium a-color-base a-text-normal"[^>]*>([^<]{10,150})</g
    const pR = /class="a-price-whole"[^>]*>([^<]{1,12})</g
    const aR = /data-asin="([A-Z0-9]{10})"/g
    const iR = /data-asin="[A-Z0-9]{10}"[\s\S]{0,800}?<img[^>]+src="(https:\/\/m\.media-amazon[^"]+)"/g
    let m
    const titles=[], prices=[], asins=[], images=[]
    while ((m=tR.exec(html))!==null) titles.push(m[1].trim())
    while ((m=pR.exec(html))!==null) prices.push(m[1].replace(/[^0-9.]/g,''))
    while ((m=aR.exec(html))!==null) { if (m[1]!=='undefined') asins.push(m[1]) }
    while ((m=iR.exec(html))!==null) images.push(m[1])
    for (let i=0; i<Math.min(titles.length,PRODUCTS_EACH); i++) {
      if (!titles[i]) continue
      items.push({
        name: titles[i].substring(0,120), rawPrice: prices[i]?parseFloat(prices[i]):null, currency:'SAR',
        sourceLink: asins[i]?`${source.baseUrl}/dp/${asins[i]}`:source.searchUrl(query),
        image: images[i]||null, sourceId:source.id, sourceName:source.name,
        sourceFlag:source.flag||'', category:'general',
      })
    }
    if (items.length > 0) return items
  }

  // eBay parser
  if (source.parser === 'ebay') {
    const tR = /<span[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([\s\S]{5,120}?)<\/span>/g
    const pR = /<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([\s\S]{1,30}?)<\/span>/g
    const lR = /<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]+)"/g
    let m
    const titles=[], prices=[], links=[]
    while ((m=tR.exec(html))!==null) { const t=m[1].replace(/<[^>]+>/g,'').trim(); if(t&&!t.includes('Shop on eBay')) titles.push(t) }
    while ((m=pR.exec(html))!==null) prices.push(m[1].replace(/<[^>]+>/g,'').trim())
    while ((m=lR.exec(html))!==null) links.push(m[1].split('?')[0])
    for (let i=0; i<Math.min(titles.length,PRODUCTS_EACH); i++) {
      if (!titles[i]) continue
      const pm = prices[i]?.match(/[\$£€]?([\d,]+\.?\d*)/)
      const usd = pm?parseFloat(pm[1].replace(',','')):null
      items.push({
        name:titles[i].substring(0,120), rawPrice:usd?Math.round(usd*USD_TO_SAR):null, currency:'SAR',
        sourceLink:links[i]||source.searchUrl(query), image:null,
        sourceId:source.id, sourceName:source.name, sourceFlag:source.flag||'', category:'general',
      })
    }
    if (items.length > 0) return items
  }

  // Generic JSON fallback (AliExpress, Shein, Trendyol, Banggood etc)
  const nR = /"(?:name|title|displayTitle|productName)"\s*:\s*"([^"]{5,120})"/g
  const pR2 = /"(?:price|salePrice|minPrice|amount)"\s*:\s*"?(\d+\.?\d*)"?/g
  const lR2 = /"(?:url|productUrl|link|href)"\s*:\s*"(https?:[^"]{10,200})"/g
  const iR2 = /"(?:image|imageUrl|thumbnail|img)"\s*:\s*"(https?:[^"]{10,200})"/g
  let m2
  const names2=[], prices2=[], links2=[], images2=[]
  while ((m2=nR.exec(html))!==null) names2.push(m2[1])
  while ((m2=pR2.exec(html))!==null) prices2.push(m2[1])
  while ((m2=lR2.exec(html))!==null) links2.push(m2[1])
  while ((m2=iR2.exec(html))!==null) images2.push(m2[1])
  for (let i=0; i<Math.min(names2.length,PRODUCTS_EACH); i++) {
    if (!names2[i]) continue
    const rawP = prices2[i]?parseFloat(prices2[i]):null
    const sarP = rawP?(source.currency==='SAR'?rawP:Math.round(rawP*USD_TO_SAR)):null
    items.push({
      name:names2[i].substring(0,120), rawPrice:sarP, currency:'SAR',
      sourceLink:links2[i]||source.searchUrl(query), image:images2[i]||null,
      sourceId:source.id, sourceName:source.name, sourceFlag:source.flag||'',
      category:source.categories?.[0]||'general',
    })
  }

  return items.slice(0, PRODUCTS_EACH)
}

export default async function handler(req, res) {
  // ── Auth: accept raw password directly ────────────────────────────────────
  const token = req.headers['x-shop-token']
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized — wrong password' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sessionId   = `shop_session_${Date.now()}`
  const searchQuery = req.body?.searchQuery || 'best selling trending products Saudi Arabia 2026'

  console.log(`[ShopTrigger] Session ${sessionId} — ${ALL_SOURCES.length} sources`)

  try {
    // ── Step 1: Search all 30 sources in batches ───────────────────────────
    const allProducts   = []
    const sourceResults = []

    for (let i = 0; i < ALL_SOURCES.length; i += BATCH_SIZE) {
      const batch   = ALL_SOURCES.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map(s => scrapeSource(s)))
      results.forEach((result, idx) => {
        const source   = batch[idx]
        const products = result.status === 'fulfilled' ? result.value : []
        sourceResults.push({ sourceId: source.id, sourceName: source.name, type: source.type, found: products.length })
        allProducts.push(...products)
      })
      if (i + BATCH_SIZE < ALL_SOURCES.length) await new Promise(r => setTimeout(r, 300))
    }

    console.log(`[ShopTrigger] Raw: ${allProducts.length} from ${sourceResults.filter(s=>s.found>0).length}/${ALL_SOURCES.length} sources`)

    // ── Step 2: Deduplicate ────────────────────────────────────────────────
    const existingFPs = await loadExistingFingerprints('shop_initial_products')
    const withIds     = allProducts.map((p, i) => ({ ...p, id: `prod_${Date.now()}_${i}` }))
    const newProducts = filterNewProducts(withIds, existingFPs)

    // ── Step 3: Apply pricing ──────────────────────────────────────────────
    const pricedProducts = applyPricingToAll(newProducts)
    const rankedProducts = pricedProducts.map((p, i) => ({
      ...p, rank: i + 1, status: 'pending', decision: 'pending',
      searchedAt: new Date().toISOString(),
    }))

    console.log(`[ShopTrigger] After dedup+pricing: ${rankedProducts.length} products`)

    // ── Step 4: Save to Firestore ──────────────────────────────────────────
    await db.collection('shop_search_sessions').doc(sessionId).set({
      sessionId, searchQuery,
      totalFound:  rankedProducts.length,
      viableCount: rankedProducts.filter(p => p.pricing?.isViable).length,
      sourceResults, status: 'pending_review',
      createdAt: new Date().toISOString(),
    })

    for (let i = 0; i < rankedProducts.length; i += 400) {
      const batch = db.batch()
      rankedProducts.slice(i, i + 400).forEach(p => {
        batch.set(
          db.collection('shop_search_sessions').doc(sessionId).collection('products').doc(p.id),
          { ...p, sessionId }
        )
      })
      await batch.commit()
    }

    // ── Step 5: Save to initial list ──────────────────────────────────────
    await saveToInitialList(rankedProducts, 'shop_initial_products')

    // ── Step 6: Send to Telegram ───────────────────────────────────────────
    const tgResult = await sendBatchToTelegram(rankedProducts, sessionId, { searchQuery })

    // ── Step 7: Update session status ──────────────────────────────────────
    await db.collection('shop_search_sessions').doc(sessionId).update({
      status: 'sent_to_telegram', completedAt: new Date().toISOString(),
    })

    console.log(`[ShopTrigger] ✅ Done — ${rankedProducts.length} products sent to Telegram`)

    // Respond AFTER everything is done
    return res.status(200).json({
      success:     true,
      sessionId,
      totalFound:  rankedProducts.length,
      viableCount: rankedProducts.filter(p => p.pricing?.isViable).length,
      telegram:    tgResult,
      message:     `Search complete! Found ${rankedProducts.length} new products. Check your Telegram now.`,
    })

  } catch (error) {
    console.error(`[ShopTrigger] ❌ Error:`, error.message)
    return res.status(500).json({ error: error.message })
  }
}

export const config = {
  api: { responseLimit: false, externalResolver: true },
  maxDuration: 60,
}
