/**
 * HUSIN ESHOP — POST /api/shop/trigger
 * FIXED: Targeted search queries per source + robust product extraction
 * Each source gets a query that actually returns products on that site
 */

import { applyPricingToAll }   from '../../../lib/pricingEngine'
import { loadExistingFingerprints,
         filterNewProducts,
         saveToInitialList }    from '../../../lib/deduplicator'
import { sendBatchToTelegram } from '../../../lib/telegramNotifier'
import { db }                  from '../../../lib/firebaseAdmin'

const USD_TO_SAR = 3.75

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) return false
  return token === process.env.ADMIN_SECRET
}

async function safeFetch(url, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control':   'no-cache',
        ...extraHeaders,
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    return null
  }
}

// Validate product name — reject page fragments
function isValidProduct(name) {
  if (!name || typeof name !== 'string') return false
  const cleaned = name.trim()
  if (cleaned.length < 8 || cleaned.length > 200) return false
  const rejectPatterns = [
    /^(shipping|quality|return|payment|buyer|seller|feedback|protection|default|category|page|home|search|result|filter|sort|view|all|new|sale|top|best)/i,
    /^(null|undefined|true|false|n\/a|na)$/i,
    /^\d+(\.\d+)?(\s*(sar|usd|\$|€|£))?$/i,
    /^[^a-zA-Z0-9\u0600-\u06FF]{0,5}$/,
  ]
  return !rejectPatterns.some(p => p.test(cleaned))
}

// ── eBay — most reliable ───────────────────────────────────────────────────────
async function searchEbay(searchTerms, limit = 25) {
  const items = []
  for (const term of searchTerms) {
    if (items.length >= limit) break
    try {
      const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(term)}&_sop=12&LH_BIN=1&_ipg=48`
      const html = await safeFetch(url)
      if (!html) continue

      // Match s-item blocks
      const itemBlocks = html.match(/class="s-item__pl-on-bottom"[\s\S]{0,2000}?(?=class="s-item__pl-on-bottom"|$)/g) || []

      for (const block of itemBlocks) {
        if (items.length >= limit) break

        const titleM = block.match(/class="s-item__title"[^>]*>([^<]{8,150})/)
          || block.match(/<h3[^>]*>([^<]{8,150})<\/h3>/)
        const priceM = block.match(/class="s-item__price"[^>]*>.*?\$([\d,]+\.?\d*)/s)
        const linkM  = block.match(/href="(https:\/\/www\.ebay\.com\/itm\/[^"?]{20,})"/)
        const imgM   = block.match(/src="(https:\/\/i\.ebayimg\.com\/thumbs\/[^"]+)"/)

        const title = titleM?.[1]?.trim().replace(/\s+/g,' ')
        const price = priceM?.[1]?.replace(/,/g,'')
        const link  = linkM?.[1]
        const img   = imgM?.[1]?.replace('/thumbs/','/images/g/')

        if (!isValidProduct(title) || !price || !link) continue

        const usdP = parseFloat(price)
        if (isNaN(usdP) || usdP <= 0 || usdP > 5000) continue

        items.push({
          name:       title.substring(0,150),
          rawPrice:   Math.round(usdP * USD_TO_SAR),
          currency:   'SAR',
          sourceLink: link,
          image:      img || null,
          sourceId:   'ebay',
          sourceName: 'eBay',
          sourceFlag: '🛍️',
          category:   'general',
        })
      }
    } catch (e) { /* continue */ }
    await new Promise(r => setTimeout(r, 300))
  }
  console.log(`[Trigger] eBay: ${items.length} products`)
  return items
}

// ── Amazon Saudi Arabia ────────────────────────────────────────────────────────
async function searchAmazonSA(searchTerms, limit = 20) {
  const items = []
  for (const term of searchTerms) {
    if (items.length >= limit) break
    try {
      const url = `https://www.amazon.sa/s?k=${encodeURIComponent(term)}&s=review-rank&language=en`
      const html = await safeFetch(url)
      if (!html) continue

      // Extract product JSON from page
      const dataMatch = html.match(/data-asin="([A-Z0-9]{10})"[\s\S]{0,3000}?class="a-price-whole"[^>]*>([\d,]+)/g) || []

      // Also try direct title extraction
      const titleReg = /class="a-size-medium a-color-base a-text-normal"[^>]*>([^<]{8,150})</g
      const priceReg = /class="a-price-whole"[^>]*>([\d,]+)</g
      const asinReg  = /data-asin="([A-Z0-9]{10})"/g
      const imgReg   = /class="s-image"[^>]*src="([^"]+)"/g

      const titles=[], prices=[], asins=[], imgs=[]
      let m
      while ((m=titleReg.exec(html))!==null) titles.push(m[1].trim())
      while ((m=priceReg.exec(html))!==null) prices.push(m[1].replace(/,/g,''))
      while ((m=asinReg.exec(html))!==null) { if(m[1]!=='undefined') asins.push(m[1]) }
      while ((m=imgReg.exec(html))!==null) imgs.push(m[1])

      for (let i=0; i<Math.min(titles.length, 8); i++) {
        if (items.length >= limit) break
        if (!isValidProduct(titles[i])) continue
        const sarP = parseFloat(prices[i])
        if (isNaN(sarP) || sarP <= 0) continue

        items.push({
          name:       titles[i].substring(0,150),
          rawPrice:   sarP,
          currency:   'SAR',
          sourceLink: asins[i] ? `https://www.amazon.sa/dp/${asins[i]}` : url,
          image:      imgs[i] || null,
          sourceId:   'amazon_sa',
          sourceName: 'Amazon.sa',
          sourceFlag: '🇸🇦',
          category:   'general',
        })
      }
    } catch (e) { /* continue */ }
    await new Promise(r => setTimeout(r, 400))
  }
  console.log(`[Trigger] Amazon.sa: ${items.length} products`)
  return items
}

// ── Noon.com ──────────────────────────────────────────────────────────────────
async function searchNoon(searchTerms, limit = 20) {
  const items = []
  for (const term of searchTerms) {
    if (items.length >= limit) break
    try {
      const url = `https://www.noon.com/saudi-en/search/?q=${encodeURIComponent(term)}&sort%5Bby%5D=popularity`
      const html = await safeFetch(url)
      if (!html) continue

      // Try __NEXT_DATA__
      const nextM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
      if (nextM) {
        try {
          const data = JSON.parse(nextM[1])
          const hits = data?.props?.pageProps?.catalog?.hits
            || data?.props?.pageProps?.initialData?.hits || []

          for (const h of hits.slice(0, 8)) {
            if (items.length >= limit) break
            if (!isValidProduct(h.name)) continue
            const price = parseFloat(h.price)
            if (isNaN(price) || price <= 0) continue

            items.push({
              name:       h.name.substring(0,150),
              rawPrice:   price,
              currency:   'SAR',
              sourceLink: h.sku ? `https://www.noon.com/saudi-en/${h.sku}/p/` : url,
              image:      h.image_keys?.[0] ? `https://f.nooncdn.com/p/${h.image_keys[0]}_A.jpg` : null,
              sourceId:   'noon_sa',
              sourceName: 'Noon.com',
              sourceFlag: '🟡',
              category:   'general',
            })
          }
        } catch (e) { /* try regex */ }
      }

      // Regex fallback
      if (items.length === 0) {
        const nameReg  = /"name"\s*:\s*"([^"]{8,150})"/g
        const priceReg = /"price"\s*:\s*(\d+\.?\d*)/g
        const skuReg   = /"sku"\s*:\s*"([^"]{5,50})"/g
        let m
        const names=[], prices=[], skus=[]
        while ((m=nameReg.exec(html))!==null) names.push(m[1])
        while ((m=priceReg.exec(html))!==null) prices.push(m[1])
        while ((m=skuReg.exec(html))!==null) skus.push(m[1])

        for (let i=0; i<Math.min(names.length,8); i++) {
          if (items.length >= limit) break
          if (!isValidProduct(names[i])) continue
          const sarP = parseFloat(prices[i])
          if (isNaN(sarP) || sarP<=0) continue
          items.push({
            name:       names[i].substring(0,150),
            rawPrice:   sarP,
            currency:   'SAR',
            sourceLink: skus[i] ? `https://www.noon.com/saudi-en/${skus[i]}/p/` : url,
            image:      null,
            sourceId:   'noon_sa',
            sourceName: 'Noon.com',
            sourceFlag: '🟡',
            category:   'general',
          })
        }
      }
    } catch (e) { /* continue */ }
    await new Promise(r => setTimeout(r, 400))
  }
  console.log(`[Trigger] Noon: ${items.length} products`)
  return items
}

// ── Desertcart Saudi Arabia ───────────────────────────────────────────────────
async function searchDesertcart(searchTerms, limit = 15) {
  const items = []
  for (const term of searchTerms) {
    if (items.length >= limit) break
    try {
      const url = `https://www.desertcart.sa/products?query=${encodeURIComponent(term)}`
      const html = await safeFetch(url)
      if (!html) continue

      const nameReg  = /class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]{8,150})</gi
      const priceReg = /class="[^"]*price[^"]*"[^>]*>[\s\S]{0,50}?SAR\s*([\d,]+\.?\d*)/g
      const linkReg  = /href="(https:\/\/www\.desertcart\.sa\/products\/[^"]+)"/g
      const imgReg   = /class="[^"]*product[^"]*image[^"]*"[\s\S]{0,200}?src="([^"]+)"/g

      let m
      const names=[], prices=[], links=[], imgs=[]
      while ((m=nameReg.exec(html))!==null) names.push(m[1].trim())
      while ((m=priceReg.exec(html))!==null) prices.push(m[1].replace(/,/g,''))
      while ((m=linkReg.exec(html))!==null) links.push(m[1])
      while ((m=imgReg.exec(html))!==null) imgs.push(m[1])

      for (let i=0; i<Math.min(names.length,8); i++) {
        if (items.length >= limit) break
        if (!isValidProduct(names[i])) continue
        const sarP = parseFloat(prices[i])
        if (isNaN(sarP) || sarP<=0) continue
        items.push({
          name:       names[i].substring(0,150),
          rawPrice:   sarP,
          currency:   'SAR',
          sourceLink: links[i] || url,
          image:      imgs[i] || null,
          sourceId:   'desertcart',
          sourceName: 'Desertcart',
          sourceFlag: '🏜️',
          category:   'general',
        })
      }
    } catch (e) { /* continue */ }
    await new Promise(r => setTimeout(r, 300))
  }
  console.log(`[Trigger] Desertcart: ${items.length} products`)
  return items
}

// ── Ubuy Saudi Arabia ─────────────────────────────────────────────────────────
async function searchUbuy(searchTerms, limit = 15) {
  const items = []
  for (const term of searchTerms) {
    if (items.length >= limit) break
    try {
      const url = `https://www.ubuy.com.sa/en/search/?q=${encodeURIComponent(term)}`
      const html = await safeFetch(url)
      if (!html) continue

      const nameReg  = /"name"\s*:\s*"([^"]{8,150})"/g
      const priceReg = /"price"\s*:\s*"?([\d.]+)"?/g
      const urlReg   = /"url"\s*:\s*"(https?:\/\/www\.ubuy[^"]+)"/g
      const imgReg   = /"image"\s*:\s*"(https?:[^"]+)"/g

      let m
      const names=[], prices=[], urls=[], imgs=[]
      while ((m=nameReg.exec(html))!==null) names.push(m[1])
      while ((m=priceReg.exec(html))!==null) prices.push(m[1])
      while ((m=urlReg.exec(html))!==null) urls.push(m[1])
      while ((m=imgReg.exec(html))!==null) imgs.push(m[1])

      for (let i=0; i<Math.min(names.length,8); i++) {
        if (items.length >= limit) break
        if (!isValidProduct(names[i])) continue
        const sarP = parseFloat(prices[i])
        if (isNaN(sarP) || sarP<=0) continue
        items.push({
          name:       names[i].substring(0,150),
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
    } catch (e) { /* continue */ }
    await new Promise(r => setTimeout(r, 300))
  }
  console.log(`[Trigger] Ubuy: ${items.length} products`)
  return items
}

// ── Namshi ────────────────────────────────────────────────────────────────────
async function searchNamshi(searchTerms, limit = 15) {
  const items = []
  for (const term of searchTerms) {
    if (items.length >= limit) break
    try {
      const url = `https://www.namshi.com/saudi-en/search/?q=${encodeURIComponent(term)}`
      const html = await safeFetch(url)
      if (!html) continue

      const nextM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
      if (nextM) {
        try {
          const data  = JSON.parse(nextM[1])
          const prods = data?.props?.pageProps?.initialData?.products
            || data?.props?.pageProps?.data?.products || []

          for (const p of prods.slice(0,8)) {
            if (items.length >= limit) break
            const name  = p.name || p.title
            const price = p.price || p.salePrice
            if (!isValidProduct(name) || !price) continue
            const sarP = parseFloat(String(price).replace(/[^0-9.]/g,''))
            if (isNaN(sarP) || sarP<=0) continue
            items.push({
              name:       name.substring(0,150),
              rawPrice:   sarP,
              currency:   'SAR',
              sourceLink: p.url || url,
              image:      p.image || null,
              sourceId:   'namshi',
              sourceName: 'Namshi',
              sourceFlag: '👗',
              category:   'clothes_women',
            })
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* continue */ }
    await new Promise(r => setTimeout(r, 300))
  }
  console.log(`[Trigger] Namshi: ${items.length} products`)
  return items
}

// ── Main handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const token = req.headers['x-shop-token']
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized — wrong password' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sessionId   = `shop_session_${Date.now()}`
  const searchQuery = req.body?.searchQuery || 'trending products 2026'

  // Targeted search terms that work well on each platform
  const ebayTerms       = ['iPhone 15','Samsung Galaxy S24','Nike shoes men','Adidas sneakers','laptop Dell','Sony headphones','Apple Watch','Samsung TV','KitchenAid mixer','Dyson vacuum']
  const amazonTerms     = ['iPhone','Samsung','laptop','headphones','smart watch','perfume','sunglasses','coffee maker','air fryer','gaming chair']
  const noonTerms       = ['iPhone','Samsung','laptop','perfume men','Nike','Adidas','headphones','smart watch','coffee machine','vacuum cleaner']
  const desertcartTerms = ['Apple iPhone','Samsung Galaxy','Sony PlayStation','Nintendo Switch','Bose headphones','GoPro camera']
  const ubuyTerms       = ['iPhone accessories','Samsung accessories','fitness tracker','bluetooth speaker','electric toothbrush']
  const namshiTerms     = ['Nike','Adidas','Zara','Calvin Klein','Tommy Hilfiger','Guess bag','Ray-Ban']

  console.log(`[ShopTrigger] Session ${sessionId} starting`)

  try {
    // Run all sources in parallel
    const [ebay, amazon, noon, desertcart, ubuy, namshi] = await Promise.allSettled([
      searchEbay(ebayTerms, 25),
      searchAmazonSA(amazonTerms, 20),
      searchNoon(noonTerms, 20),
      searchDesertcart(desertcartTerms, 15),
      searchUbuy(ubuyTerms, 15),
      searchNamshi(namshiTerms, 15),
    ])

    const sourceResults = []
    const allRaw = []

    const collect = (result, id, name) => {
      const prods = result.status === 'fulfilled' ? result.value : []
      const valid = prods.filter(p => isValidProduct(p.name))
      sourceResults.push({ sourceId: id, sourceName: name, found: valid.length })
      allRaw.push(...valid)
    }

    collect(ebay,       'ebay',       'eBay')
    collect(amazon,     'amazon_sa',  'Amazon.sa')
    collect(noon,       'noon_sa',    'Noon.com')
    collect(desertcart, 'desertcart', 'Desertcart')
    collect(ubuy,       'ubuy',       'Ubuy')
    collect(namshi,     'namshi',     'Namshi')

    console.log(`[ShopTrigger] Raw valid: ${allRaw.length} from ${sourceResults.filter(s=>s.found>0).length} sources`)

    // Add IDs
    const withIds = allRaw.map((p, i) => ({
      ...p, id: `prod_${Date.now()}_${i}`,
    }))

    // Deduplicate
    const existingFPs = await loadExistingFingerprints('shop_initial_products')
    const newProducts = filterNewProducts(withIds, existingFPs)

    // Apply pricing
    const priced  = applyPricingToAll(newProducts)
    const ranked  = priced.map((p, i) => ({
      ...p, rank: i+1, status: 'pending', decision: 'pending',
      searchedAt: new Date().toISOString(),
    }))

    console.log(`[ShopTrigger] Final: ${ranked.length} (${ranked.filter(p=>p.pricing?.isViable).length} viable)`)

    // Save session
    await db.collection('shop_search_sessions').doc(sessionId).set({
      sessionId, searchQuery,
      totalFound:  ranked.length,
      viableCount: ranked.filter(p=>p.pricing?.isViable).length,
      sourceResults,
      status:    'pending_review',
      createdAt: new Date().toISOString(),
    })

    // Save products
    for (let i=0; i<ranked.length; i+=400) {
      const batch = db.batch()
      ranked.slice(i,i+400).forEach(p => {
        batch.set(
          db.collection('shop_search_sessions').doc(sessionId)
            .collection('products').doc(p.id),
          { ...p, sessionId }
        )
      })
      await batch.commit()
    }

    // Save to initial list
    await saveToInitialList(ranked, 'shop_initial_products')

    // Send to Telegram
    const tgResult = await sendBatchToTelegram(ranked, sessionId, { searchQuery })

    await db.collection('shop_search_sessions').doc(sessionId).update({
      status: 'sent_to_telegram', completedAt: new Date().toISOString(),
    })

    console.log(`[ShopTrigger] ✅ Done — ${ranked.length} products sent to Telegram`)

    return res.status(200).json({
      success:     true,
      sessionId,
      totalFound:  ranked.length,
      viableCount: ranked.filter(p=>p.pricing?.isViable).length,
      sourceResults,
      telegram:    tgResult,
      message:     `Done! Found ${ranked.length} real products from ${sourceResults.filter(s=>s.found>0).length} sources. Check your Telegram!`,
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
