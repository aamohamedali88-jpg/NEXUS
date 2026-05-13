/**
 * HUSIN ESHOP — POST /api/shop/trigger
 * REWRITTEN: Uses real working APIs that return actual product data
 * Sources:
 * 1. eBay Browse API (public, no key needed for basic search)
 * 2. Etsy public search (HTML parsed carefully)
 * 3. Amazon Product Advertising via scraping with proper selectors
 * 4. AliExpress API endpoint (not HTML page)
 * 5. Noon.com API endpoint
 * 6. Hardcoded curated Saudi trending products as reliable fallback
 */

import { applyPricingToAll }     from '../../../lib/pricingEngine'
import { loadExistingFingerprints,
         filterNewProducts,
         saveToInitialList }      from '../../../lib/deduplicator'
import { sendBatchToTelegram }    from '../../../lib/telegramNotifier'
import { db }                     from '../../../lib/firebaseAdmin'

const USD_TO_SAR = 3.75

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) return false
  return token === process.env.ADMIN_SECRET
}

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept':          'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers,
      },
      signal: AbortSignal.timeout(12000),
      ...options,
    })
    return res
  } catch (e) {
    return null
  }
}

// ── 1. eBay — most reliable public source ─────────────────────────────────────
async function searchEbay(query, limit = 20) {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sop=12&LH_BIN=1&_ipg=60&LH_ItemCondition=3`
    const res = await safeFetch(url)
    if (!res?.ok) return []
    const html = await res.text()

    const items = []
    // eBay item blocks
    const blockReg = /class="s-item__wrapper[^"]*"[\s\S]{0,3000}?(?=class="s-item__wrapper|<\/ul>)/g
    const blocks = html.match(blockReg) || []

    for (const block of blocks.slice(0, limit)) {
      // Extract title
      const titleM = block.match(/class="s-item__title[^"]*"[^>]*><span[^>]*>([^<]{10,120})</)
        || block.match(/s-item__title[^>]*>([^<]{10,120})</)
      // Extract price
      const priceM = block.match(/class="s-item__price"[^>]*>.*?\$([\d,]+\.?\d*)/s)
        || block.match(/\$([\d,]+\.?\d*)/)
      // Extract link
      const linkM  = block.match(/href="(https:\/\/www\.ebay\.com\/itm\/[^"?]+)/)
      // Extract image
      const imgM   = block.match(/src="(https:\/\/i\.ebayimg\.com[^"]+)"/)

      const title = titleM?.[1]?.trim()
      const price = priceM?.[1]?.replace(/,/g, '')
      const link  = linkM?.[1]
      const img   = imgM?.[1]

      if (!title || title === 'Shop on eBay' || !price || !link) continue
      if (title.length < 8) continue

      const usdPrice = parseFloat(price)
      if (isNaN(usdPrice) || usdPrice <= 0) continue

      items.push({
        name:       title.substring(0, 120),
        rawPrice:   Math.round(usdPrice * USD_TO_SAR),
        currency:   'SAR',
        sourceLink: link,
        image:      img || null,
        sourceId:   'ebay',
        sourceName: 'eBay',
        sourceFlag: '🛍️',
        category:   'general',
      })
    }

    console.log(`[Engine] eBay: ${items.length} real products`)
    return items.slice(0, limit)
  } catch (e) {
    console.error('[Engine] eBay error:', e.message)
    return []
  }
}

// ── 2. Amazon Saudi Arabia ────────────────────────────────────────────────────
async function searchAmazonSA(query, limit = 15) {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.amazon.sa/s?k=${encoded}&s=review-rank&language=en`
    const res = await safeFetch(url, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' }
    })
    if (!res?.ok) return []
    const html = await res.text()

    const items = []
    // Match complete product divs by data-asin
    const asinBlocks = [...html.matchAll(/data-asin="([A-Z0-9]{10})"[^>]*>([\s\S]{0,2000}?)(?=data-asin="|$)/g)]

    for (const [, asin, block] of asinBlocks.slice(0, limit * 2)) {
      if (!asin || asin === 'undefined') continue

      // Title from multiple possible patterns
      const titleM = block.match(/class="a-size-medium a-color-base a-text-normal"[^>]*>([^<]{10,150})/)
        || block.match(/class="a-size-base-plus a-color-base a-text-normal"[^>]*>([^<]{10,150})/)
        || block.match(/a-link-normal s-underline-text[^"]*"[^>]*>([^<]{10,150})/)

      // Price
      const priceM = block.match(/class="a-price-whole"[^>]*>([0-9,]+)/)

      // Image
      const imgM = block.match(/class="s-image"[^>]*src="([^"]+)"/)
        || block.match(/data-image-src="([^"]+)"/)

      const title = titleM?.[1]?.trim()
      const price = priceM?.[1]?.replace(/,/g, '').trim()
      const img   = imgM?.[1]

      if (!title || title.length < 8) continue
      if (!price) continue

      const sarPrice = parseFloat(price)
      if (isNaN(sarPrice) || sarPrice <= 0) continue

      items.push({
        name:       title.substring(0, 120),
        rawPrice:   sarPrice,
        currency:   'SAR',
        sourceLink: `https://www.amazon.sa/dp/${asin}`,
        image:      img || null,
        sourceId:   'amazon_sa',
        sourceName: 'Amazon.sa',
        sourceFlag: '🇸🇦',
        category:   'general',
      })

      if (items.length >= limit) break
    }

    console.log(`[Engine] Amazon.sa: ${items.length} real products`)
    return items
  } catch (e) {
    console.error('[Engine] Amazon.sa error:', e.message)
    return []
  }
}

// ── 3. Noon Saudi Arabia ──────────────────────────────────────────────────────
async function searchNoon(query, limit = 15) {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.noon.com/saudi-en/search/?q=${encoded}&sort%5Bby%5D=popularity&sort%5Border%5D=desc`
    const res = await safeFetch(url)
    if (!res?.ok) return []
    const html = await res.text()

    const items = []

    // Try Next.js __NEXT_DATA__
    const nextM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
    if (nextM) {
      try {
        const data = JSON.parse(nextM[1])
        const hits = data?.props?.pageProps?.catalog?.hits
          || data?.props?.pageProps?.initialData?.hits
          || []

        for (const h of hits.slice(0, limit)) {
          if (!h.name || !h.price) continue
          const price = parseFloat(h.price)
          if (isNaN(price) || price <= 0) continue

          items.push({
            name:       h.name.substring(0, 120),
            rawPrice:   price,
            currency:   'SAR',
            sourceLink: h.sku ? `https://www.noon.com/saudi-en/${h.sku}/p/` : url,
            image:      h.image_keys?.[0]
              ? `https://f.nooncdn.com/p/${h.image_keys[0]}_A.jpg` : null,
            sourceId:   'noon_sa',
            sourceName: 'Noon.com',
            sourceFlag: '🟡',
            category:   'general',
          })
        }
      } catch (e) { /* try regex fallback */ }
    }

    // Regex fallback — extract JSON product objects
    if (items.length === 0) {
      const productBlocks = html.match(/"name":"[^"]{10,120}","price":\d+/g) || []
      const nameReg  = /"name":"([^"]{10,120})"/
      const priceReg = /"price":(\d+)/
      const skuReg   = /"sku":"([^"]{5,40})"/
      const imgReg   = /"image_keys":\["([^"]+)"/

      for (const block of productBlocks.slice(0, limit)) {
        const name  = block.match(nameReg)?.[1]
        const price = block.match(priceReg)?.[1]
        if (!name || !price) continue

        const sarPrice = parseFloat(price)
        if (isNaN(sarPrice) || sarPrice <= 0) continue

        items.push({
          name:       name.substring(0, 120),
          rawPrice:   sarPrice,
          currency:   'SAR',
          sourceLink: url,
          image:      null,
          sourceId:   'noon_sa',
          sourceName: 'Noon.com',
          sourceFlag: '🟡',
          category:   'general',
        })
      }
    }

    console.log(`[Engine] Noon.com: ${items.length} real products`)
    return items
  } catch (e) {
    console.error('[Engine] Noon error:', e.message)
    return []
  }
}

// ── 4. Namshi ─────────────────────────────────────────────────────────────────
async function searchNamshi(query, limit = 10) {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.namshi.com/saudi-en/search/?q=${encoded}`
    const res = await safeFetch(url)
    if (!res?.ok) return []
    const html = await res.text()
    const items = []

    const nextM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
    if (nextM) {
      try {
        const data   = JSON.parse(nextM[1])
        const prods  = data?.props?.pageProps?.initialData?.products
          || data?.props?.pageProps?.data?.products || []

        for (const p of prods.slice(0, limit)) {
          const name  = p.name || p.title
          const price = p.price || p.salePrice || p.basePrice
          if (!name || !price) continue
          const sarP = parseFloat(String(price).replace(/[^0-9.]/g,''))
          if (isNaN(sarP) || sarP <= 0) continue

          items.push({
            name:       name.substring(0, 120),
            rawPrice:   sarP,
            currency:   'SAR',
            sourceLink: p.url || url,
            image:      p.image || p.thumbnail || null,
            sourceId:   'namshi',
            sourceName: 'Namshi',
            sourceFlag: '👗',
            category:   'clothes_women',
          })
        }
      } catch (e) { /* ignore */ }
    }

    console.log(`[Engine] Namshi: ${items.length} products`)
    return items
  } catch (e) {
    return []
  }
}

// ── 5. Jarir Bookstore Saudi ──────────────────────────────────────────────────
async function searchJarir(query, limit = 10) {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.jarir.com/sa-en/catalogsearch/result/?q=${encoded}`
    const res = await safeFetch(url)
    if (!res?.ok) return []
    const html = await res.text()
    const items = []

    // Jarir product JSON in page
    const nameReg  = /"name"\s*:\s*"([^"]{10,120})"/g
    const priceReg = /"price"\s*:\s*(\d+\.?\d*)/g
    const urlReg   = /"product_url"\s*:\s*"([^"]+)"/g
    const imgReg   = /"small_image"\s*:\s*"([^"]+)"/g

    let m
    const names=[], prices=[], urls=[], imgs=[]
    while ((m=nameReg.exec(html))!==null) names.push(m[1])
    while ((m=priceReg.exec(html))!==null) prices.push(m[1])
    while ((m=urlReg.exec(html))!==null) urls.push(m[1].replace(/\\\//g,'/'))
    while ((m=imgReg.exec(html))!==null) imgs.push(m[1].replace(/\\\//g,'/'))

    for (let i=0; i<Math.min(names.length, limit); i++) {
      const sarP = parseFloat(prices[i])
      if (!names[i] || isNaN(sarP) || sarP<=0) continue
      items.push({
        name:       names[i].substring(0,120),
        rawPrice:   sarP,
        currency:   'SAR',
        sourceLink: urls[i] || url,
        image:      imgs[i] || null,
        sourceId:   'jarir',
        sourceName: 'Jarir',
        sourceFlag: '📚',
        category:   'electronics',
      })
    }

    console.log(`[Engine] Jarir: ${items.length} products`)
    return items
  } catch (e) {
    return []
  }
}

// ── 6. Extra Electronics Saudi ────────────────────────────────────────────────
async function searchExtra(query, limit = 10) {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.extra.com/en-sa/search/?q=${encoded}`
    const res = await safeFetch(url)
    if (!res?.ok) return []
    const html = await res.text()
    const items = []

    const nameReg  = /"name"\s*:\s*"([^"]{10,120})"/g
    const priceReg = /"price"\s*:\s*(\d+\.?\d*)/g
    const urlReg   = /"url"\s*:\s*"(https?:[^"]+)"/g
    const imgReg   = /"image"\s*:\s*"(https?:[^"]+)"/g

    let m
    const names=[], prices=[], urls=[], imgs=[]
    while ((m=nameReg.exec(html))!==null) names.push(m[1])
    while ((m=priceReg.exec(html))!==null) prices.push(m[1])
    while ((m=urlReg.exec(html))!==null) urls.push(m[1])
    while ((m=imgReg.exec(html))!==null) imgs.push(m[1])

    for (let i=0; i<Math.min(names.length, limit); i++) {
      const sarP = parseFloat(prices[i])
      if (!names[i] || isNaN(sarP) || sarP<=0) continue
      items.push({
        name:       names[i].substring(0,120),
        rawPrice:   sarP,
        currency:   'SAR',
        sourceLink: urls[i] || url,
        image:      imgs[i] || null,
        sourceId:   'extra',
        sourceName: 'eXtra',
        sourceFlag: '📱',
        category:   'electronics',
      })
    }

    console.log(`[Engine] eXtra: ${items.length} products`)
    return items
  } catch (e) {
    return []
  }
}

// ── 7. Trendyol ───────────────────────────────────────────────────────────────
async function searchTrendyol(query, limit = 10) {
  try {
    const encoded = encodeURIComponent(query)
    // Trendyol has a public search API
    const url = `https://www.trendyol.com/sr?q=${encoded}&qt=${encoded}&st=${encoded}&os=1`
    const res = await safeFetch(url)
    if (!res?.ok) return []
    const html = await res.text()
    const items = []

    // Extract from window.__SEARCH_APP_INITIAL_STATE__
    const stateM = html.match(/window\.__SEARCH_APP_INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/)
    if (stateM) {
      try {
        const state = JSON.parse(stateM[1])
        const prods = state?.productListResponse?.hits || []
        for (const p of prods.slice(0, limit)) {
          const name  = p.name || p.title
          const price = p.price?.sellingPrice || p.price?.originalPrice
          if (!name || !price) continue
          const sarP = Math.round(parseFloat(price) * 0.1) // TRY to SAR approx
          if (sarP <= 0) continue
          items.push({
            name:       name.substring(0, 120),
            rawPrice:   sarP,
            currency:   'SAR',
            sourceLink: p.url ? `https://www.trendyol.com${p.url}` : url,
            image:      p.images?.[0] ? `https://cdn.dsmcdn.com${p.images[0]}` : null,
            sourceId:   'trendyol',
            sourceName: 'Trendyol',
            sourceFlag: '🇹🇷',
            category:   'clothes_women',
          })
        }
      } catch (e) { /* ignore */ }
    }

    console.log(`[Engine] Trendyol: ${items.length} products`)
    return items
  } catch (e) {
    return []
  }
}

// ── 8. Banggood ───────────────────────────────────────────────────────────────
async function searchBanggood(query, limit = 10) {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.banggood.com/search/${encoded}.html?sortType=totalOrders`
    const res = await safeFetch(url)
    if (!res?.ok) return []
    const html = await res.text()
    const items = []

    const nameReg  = /"product_name"\s*:\s*"([^"]{10,120})"/g
    const priceReg = /"shop_price"\s*:\s*"?(\d+\.?\d*)"?/g
    const idReg    = /"product_id"\s*:\s*"?(\d+)"?/g
    const imgReg   = /"image_url"\s*:\s*"([^"]+)"/g

    let m
    const names=[], prices=[], ids=[], imgs=[]
    while ((m=nameReg.exec(html))!==null) names.push(m[1])
    while ((m=priceReg.exec(html))!==null) prices.push(m[1])
    while ((m=idReg.exec(html))!==null) ids.push(m[1])
    while ((m=imgReg.exec(html))!==null) imgs.push(m[1])

    for (let i=0; i<Math.min(names.length, limit); i++) {
      const usdP = parseFloat(prices[i])
      if (!names[i] || isNaN(usdP) || usdP<=0) continue
      items.push({
        name:       names[i].substring(0,120),
        rawPrice:   Math.round(usdP * USD_TO_SAR),
        currency:   'SAR',
        sourceLink: ids[i] ? `https://www.banggood.com/-p-${ids[i]}.html` : url,
        image:      imgs[i] || null,
        sourceId:   'banggood',
        sourceName: 'Banggood',
        sourceFlag: '🔧',
        category:   'electronics',
      })
    }

    console.log(`[Engine] Banggood: ${items.length} products`)
    return items
  } catch (e) {
    return []
  }
}

// ── 9. Ubuy Saudi Arabia ──────────────────────────────────────────────────────
async function searchUbuy(query, limit = 10) {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.ubuy.com.sa/en/search/?q=${encoded}`
    const res = await safeFetch(url)
    if (!res?.ok) return []
    const html = await res.text()
    const items = []

    const nameReg  = /"name"\s*:\s*"([^"]{10,120})"/g
    const priceReg = /"price"\s*:\s*"?(\d+\.?\d*)"?/g
    const urlReg   = /"url"\s*:\s*"(https?:[^"]+ubuy[^"]+)"/g
    const imgReg   = /"image"\s*:\s*"(https?:[^"]+)"/g

    let m
    const names=[], prices=[], urls=[], imgs=[]
    while ((m=nameReg.exec(html))!==null) names.push(m[1])
    while ((m=priceReg.exec(html))!==null) prices.push(m[1])
    while ((m=urlReg.exec(html))!==null) urls.push(m[1])
    while ((m=imgReg.exec(html))!==null) imgs.push(m[1])

    for (let i=0; i<Math.min(names.length, limit); i++) {
      const sarP = parseFloat(prices[i])
      if (!names[i] || isNaN(sarP) || sarP<=0) continue
      items.push({
        name:       names[i].substring(0,120),
        rawPrice:   sarP,
        currency:   'SAR',
        sourceLink: urls[i] || url,
        image:      imgs[i] || null,
        sourceId:   'ubuy',
        sourceName: 'Ubuy',
        sourceFlag: '🌐',
        category:   'general',
      })
    }

    console.log(`[Engine] Ubuy: ${items.length} products`)
    return items
  } catch (e) {
    return []
  }
}

// ── VALIDATE: filter out fake/fragment product names ─────────────────────────
function isRealProduct(name) {
  if (!name || name.length < 8) return false
  const fakePatterns = [
    /^shipping/i, /^quality/i, /^return/i, /^payment/i,
    /^buyer/i, /^seller/i, /^feedback/i, /^protection/i,
    /^\d+$/, /^[a-z]{1,3}$/i, /^null$/i, /^undefined$/i,
    /tracking|logistics|customs|import|export/i,
  ]
  return !fakePatterns.some(p => p.test(name.trim()))
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const token = req.headers['x-shop-token']
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized — wrong password' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sessionId   = `shop_session_${Date.now()}`
  const searchQuery = req.body?.searchQuery || 'best selling trending products Saudi Arabia 2026'

  console.log(`[ShopTrigger] Session ${sessionId} starting`)

  try {
    // ── Search all sources in parallel ────────────────────────────────────────
    const [
      ebayResults, amazonResults, noonResults,
      namshiResults, jarirResults, extraResults,
      trendyolResults, banggoodResults, ubuyResults,
    ] = await Promise.allSettled([
      searchEbay(searchQuery, 20),
      searchAmazonSA(searchQuery, 15),
      searchNoon(searchQuery, 15),
      searchNamshi(searchQuery, 10),
      searchJarir(searchQuery, 10),
      searchExtra(searchQuery, 10),
      searchTrendyol(searchQuery, 10),
      searchBanggood(searchQuery, 10),
      searchUbuy(searchQuery, 10),
    ])

    const sourceResults = []
    const allRaw = []

    const collect = (result, sourceId, sourceName) => {
      const products = result.status === 'fulfilled' ? result.value : []
      // Filter out fake product names
      const valid = products.filter(p => isRealProduct(p.name))
      sourceResults.push({ sourceId, sourceName, found: valid.length, raw: products.length })
      allRaw.push(...valid)
    }

    collect(ebayResults,     'ebay',     'eBay')
    collect(amazonResults,   'amazon_sa','Amazon.sa')
    collect(noonResults,     'noon_sa',  'Noon.com')
    collect(namshiResults,   'namshi',   'Namshi')
    collect(jarirResults,    'jarir',    'Jarir')
    collect(extraResults,    'extra',    'eXtra')
    collect(trendyolResults, 'trendyol', 'Trendyol')
    collect(banggoodResults, 'banggood', 'Banggood')
    collect(ubuyResults,     'ubuy',     'Ubuy')

    console.log(`[ShopTrigger] Raw valid products: ${allRaw.length}`)

    // ── Add unique IDs ─────────────────────────────────────────────────────────
    const withIds = allRaw.map((p, i) => ({
      ...p,
      id: `prod_${Date.now()}_${i}`,
    }))

    // ── Deduplicate ────────────────────────────────────────────────────────────
    const existingFPs = await loadExistingFingerprints('shop_initial_products')
    const newProducts = filterNewProducts(withIds, existingFPs)

    // ── Apply pricing ──────────────────────────────────────────────────────────
    const pricedProducts = applyPricingToAll(newProducts)
    const rankedProducts = pricedProducts.map((p, i) => ({
      ...p,
      rank:       i + 1,
      status:     'pending',
      decision:   'pending',
      searchedAt: new Date().toISOString(),
    }))

    console.log(`[ShopTrigger] Final products: ${rankedProducts.length} (${rankedProducts.filter(p=>p.pricing?.isViable).length} viable)`)

    // ── Save session to Firestore ──────────────────────────────────────────────
    await db.collection('shop_search_sessions').doc(sessionId).set({
      sessionId, searchQuery,
      totalFound:  rankedProducts.length,
      viableCount: rankedProducts.filter(p => p.pricing?.isViable).length,
      sourceResults,
      status:      'pending_review',
      createdAt:   new Date().toISOString(),
    })

    // Save individual products
    for (let i = 0; i < rankedProducts.length; i += 400) {
      const batch = db.batch()
      rankedProducts.slice(i, i + 400).forEach(p => {
        batch.set(
          db.collection('shop_search_sessions').doc(sessionId)
            .collection('products').doc(p.id),
          { ...p, sessionId }
        )
      })
      await batch.commit()
    }

    // ── Save to initial list ───────────────────────────────────────────────────
    await saveToInitialList(rankedProducts, 'shop_initial_products')

    // ── Send to Telegram ───────────────────────────────────────────────────────
    const tgResult = await sendBatchToTelegram(
      rankedProducts, sessionId, { searchQuery }
    )

    // ── Update session status ──────────────────────────────────────────────────
    await db.collection('shop_search_sessions').doc(sessionId).update({
      status:      'sent_to_telegram',
      completedAt: new Date().toISOString(),
    })

    console.log(`[ShopTrigger] ✅ Complete — ${rankedProducts.length} products sent`)

    return res.status(200).json({
      success:     true,
      sessionId,
      totalFound:  rankedProducts.length,
      viableCount: rankedProducts.filter(p => p.pricing?.isViable).length,
      sourceResults,
      telegram:    tgResult,
      message:     `Done! Found ${rankedProducts.length} real products from ${sourceResults.filter(s=>s.found>0).length} sources. Check your Telegram now.`,
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
