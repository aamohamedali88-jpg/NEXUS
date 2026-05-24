/**
 * HUSIN ESHOP — POST /api/shop/trigger
 * FINAL VERSION — Uses official eBay Browse API
 * Guaranteed real products with titles, prices, images, direct links
 * No scraping — official API data feed — never blocked
 */

import { applyPricingToAll }   from '../../../lib/pricingEngine'
import { loadExistingFingerprints,
         filterNewProducts,
         saveToInitialList }    from '../../../lib/deduplicator'
import { sendBatchToTelegram } from '../../../lib/telegramNotifier'
import { db }                  from '../../../lib/firebaseAdmin'

const EBAY_APP_ID  = process.env.EBAY_APP_ID
const EBAY_SECRET  = process.env.EBAY_SECRET
const USD_TO_SAR   = 3.75

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) return false
  return token === process.env.ADMIN_SECRET
}

// ── Get eBay OAuth token ───────────────────────────────────────────────────────
async function getEbayToken() {
  const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_SECRET}`).toString('base64')
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`eBay auth failed: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

// ── Search eBay Browse API ─────────────────────────────────────────────────────
async function searchEbay(token, query, category, limit = 20) {
  try {
    const encoded = encodeURIComponent(query)
    // Using Browse API v1 — most reliable
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encoded}&limit=${limit}&sort=bestMatch&filter=buyingOptions:{FIXED_PRICE}`

    const res = await fetch(url, {
      headers: {
        'Authorization':         `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type':          'application/json',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      console.log(`[eBay] Query "${query}" returned ${res.status}`)
      return []
    }

    const data  = await res.json()
    const items = data.itemSummaries || []

    return items.map(item => {
      const usdPrice = parseFloat(item.price?.value || '0')
      const sarPrice = Math.round(usdPrice * USD_TO_SAR)

      return {
        name:       item.title?.substring(0, 150) || 'eBay Product',
        rawPrice:   sarPrice,
        currency:   'SAR',
        sourceLink: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
        image:      item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || null,
        sourceId:   'ebay',
        sourceName: 'eBay',
        sourceFlag: '🛍️',
        category,
        specifications: item.condition || null,
      }
    }).filter(p => p.rawPrice > 0 && p.name.length > 5)

  } catch (e) {
    console.error(`[eBay] Error for "${query}":`, e.message)
    return []
  }
}

// ── All search queries targeting Saudi Arabia trending products ───────────────
const SEARCH_QUERIES = [
  // Mobile phones & tablets
  { query: 'iPhone 15 Pro',              category: 'mobiles' },
  { query: 'Samsung Galaxy S24',         category: 'mobiles' },
  { query: 'iPad Air',                   category: 'laptops' },
  { query: 'Samsung Galaxy Tab',         category: 'laptops' },
  // Laptops & computers
  { query: 'MacBook Pro M3',             category: 'laptops' },
  { query: 'Dell XPS laptop',            category: 'laptops' },
  { query: 'HP laptop gaming',           category: 'laptops' },
  // Audio & accessories
  { query: 'AirPods Pro',                category: 'electronics' },
  { query: 'Sony WH-1000XM5 headphones', category: 'electronics' },
  { query: 'Bose QuietComfort',          category: 'electronics' },
  // Smart watches
  { query: 'Apple Watch Series 9',       category: 'electronics' },
  { query: 'Samsung Galaxy Watch',       category: 'electronics' },
  { query: 'Garmin smartwatch',          category: 'electronics' },
  // Men fashion
  { query: 'Nike Air Max sneakers men',  category: 'clothes_men' },
  { query: 'Adidas Ultraboost men',      category: 'clothes_men' },
  { query: 'Ralph Lauren polo shirt',    category: 'clothes_men' },
  { query: 'Tommy Hilfiger men',         category: 'clothes_men' },
  // Women fashion
  { query: 'Zara women dress',           category: 'clothes_women' },
  { query: 'Coach handbag women',        category: 'clothes_women' },
  { query: 'Michael Kors bag',           category: 'clothes_women' },
  { query: 'Nike women shoes',           category: 'clothes_women' },
  // Kids
  { query: 'LEGO set kids',             category: 'toys' },
  { query: 'baby monitor',              category: 'clothes_kids' },
  { query: 'kids learning tablet',      category: 'toys' },
  // Home appliances
  { query: 'Dyson vacuum cleaner',      category: 'home_appliances' },
  { query: 'Nespresso coffee machine',  category: 'home_appliances' },
  { query: 'Philips air fryer',         category: 'home_appliances' },
  { query: 'KitchenAid mixer',          category: 'home_appliances' },
  // Beauty & personal care
  { query: 'La Mer skincare set',       category: 'beauty' },
  { query: 'Dyson Airwrap hair',        category: 'beauty' },
  { query: 'perfume men luxury',        category: 'beauty' },
  { query: 'Charlotte Tilbury makeup',  category: 'beauty' },
  // Jewelry & luxury
  { query: 'gold bracelet 18k women',   category: 'jewelry' },
  { query: 'diamond ring gold',         category: 'jewelry' },
  { query: 'Pandora charm bracelet',    category: 'jewelry' },
  { query: 'luxury watch men gold',     category: 'jewelry' },
  // Sports & fitness
  { query: 'Peloton exercise bike',     category: 'sports' },
  { query: 'gym weights dumbbells set', category: 'sports' },
  { query: 'Nike running shoes',        category: 'sports' },
  { query: 'Fitbit fitness tracker',    category: 'sports' },
  // Gaming
  { query: 'PlayStation 5 PS5',        category: 'electronics' },
  { query: 'Xbox Series X',            category: 'electronics' },
  { query: 'Nintendo Switch OLED',     category: 'electronics' },
  // Cameras
  { query: 'Sony mirrorless camera',   category: 'electronics' },
  { query: 'GoPro Hero 12',            category: 'electronics' },
  { query: 'DJI drone Mini',           category: 'electronics' },
  // General trending
  { query: 'robot vacuum cleaner',     category: 'home_appliances' },
  { query: 'smart home device Alexa',  category: 'electronics' },
  { query: 'portable power bank',      category: 'electronics' },
  { query: 'wireless charger fast',    category: 'electronics' },
]

// ── Main handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const token = req.headers['x-shop-token']
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized — wrong password' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!EBAY_APP_ID || !EBAY_SECRET) {
    return res.status(500).json({ error: 'EBAY_APP_ID or EBAY_SECRET not configured in Vercel env vars' })
  }

  const sessionId = `shop_session_${Date.now()}`
  const searchQuery = req.body?.searchQuery || 'trending products 2026'

  console.log(`[ShopTrigger] Session ${sessionId} — eBay API`)

  try {
    // ── Step 1: Get eBay OAuth token ──────────────────────────────────────────
    console.log('[ShopTrigger] Getting eBay OAuth token...')
    const ebayToken = await getEbayToken()
    console.log('[ShopTrigger] eBay token obtained ✅')

    // ── Step 2: Search all queries in batches of 5 ────────────────────────────
    const allRaw    = []
    const BATCH     = 5

    for (let i = 0; i < SEARCH_QUERIES.length; i += BATCH) {
      const batch   = SEARCH_QUERIES.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map(({ query, category }) => searchEbay(ebayToken, query, category, 5))
      )
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          allRaw.push(...result.value)
          console.log(`[ShopTrigger] "${batch[idx].query}": ${result.value.length} products`)
        }
      })
      // Small pause between batches to respect rate limits
      if (i + BATCH < SEARCH_QUERIES.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    console.log(`[ShopTrigger] Total raw: ${allRaw.length} products`)

    // ── Step 3: Add unique IDs ─────────────────────────────────────────────────
    const withIds = allRaw.map((p, i) => ({
      ...p,
      id: `prod_${Date.now()}_${i}`,
    }))

    // ── Step 4: Deduplicate against history ────────────────────────────────────
    const existingFPs = await loadExistingFingerprints('shop_initial_products')
    const newProducts = filterNewProducts(withIds, existingFPs)
    console.log(`[ShopTrigger] After dedup: ${newProducts.length} new products`)

    // ── Step 5: Apply your pricing rules ──────────────────────────────────────
    const priced = applyPricingToAll(newProducts)
    const ranked = priced.map((p, i) => ({
      ...p,
      rank:       i + 1,
      status:     'pending',
      decision:   'pending',
      searchedAt: new Date().toISOString(),
    }))

    console.log(`[ShopTrigger] Viable products: ${ranked.filter(p => p.pricing?.isViable).length}`)

    // ── Step 6: Save session to Firestore ─────────────────────────────────────
    await db.collection('shop_search_sessions').doc(sessionId).set({
      sessionId,
      searchQuery,
      totalFound:  ranked.length,
      viableCount: ranked.filter(p => p.pricing?.isViable).length,
      status:      'pending_review',
      createdAt:   new Date().toISOString(),
    })

    // Save individual products
    for (let i = 0; i < ranked.length; i += 400) {
      const batch = db.batch()
      ranked.slice(i, i + 400).forEach(p => {
        batch.set(
          db.collection('shop_search_sessions')
            .doc(sessionId)
            .collection('products')
            .doc(p.id),
          { ...p, sessionId }
        )
      })
      await batch.commit()
    }

    // ── Step 7: Save to initial list (no repeats next time) ───────────────────
    await saveToInitialList(ranked, 'shop_initial_products')

    // ── Step 8: Send to Telegram ───────────────────────────────────────────────
    const tgResult = await sendBatchToTelegram(
      ranked, sessionId, { searchQuery }
    )

    // ── Step 9: Update session status ──────────────────────────────────────────
    await db.collection('shop_search_sessions').doc(sessionId).update({
      status:      'sent_to_telegram',
      completedAt: new Date().toISOString(),
    })

    console.log(`[ShopTrigger] ✅ Complete — ${ranked.length} products sent to Telegram`)

    return res.status(200).json({
      success:     true,
      sessionId,
      totalFound:  ranked.length,
      viableCount: ranked.filter(p => p.pricing?.isViable).length,
      telegram:    tgResult,
      message:     `✅ Done! Found ${ranked.length} real products from eBay. Check your Telegram now.`,
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
