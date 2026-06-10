/**
 * HUSIN ESHOP — POST /api/shop/trigger
 * eBay Browse API product search with:
 * ✅ Category-targeted search (owner selects category from dashboard)
 * ✅ NEW products only (condition filter)
 * ✅ Full specifications required (localizedAspects min threshold)
 * ✅ Multiple images required
 * ✅ Electronics exception: must have FULL specs to be accepted
 * ✅ Quality scoring — rejects low-detail products
 * ✅ Deduplication + pricing engine + Telegram notification
 */

import { db }              from '../../../lib/firebaseAdmin'
import { applyMarkup }     from '../../../lib/pricingEngine'
import { isDuplicate }     from '../../../lib/deduplicator'
import { sendToTelegram }  from '../../../lib/telegramNotifier'

const EBAY_APP_ID = process.env.EBAY_APP_ID
const EBAY_SECRET = process.env.EBAY_SECRET
const USD_TO_SAR  = 3.75

// ── eBay OAuth ────────────────────────────────────────────────────────────────
async function getEbayToken() {
  const creds = Buffer.from(`${EBAY_APP_ID}:${EBAY_SECRET}`).toString('base64')
  const res   = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method:  'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    signal:  AbortSignal.timeout(10000),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('eBay OAuth failed')
  return data.access_token
}

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORY SEARCH CONFIG
// Each category has: queries, eBay category IDs, min specs required
// ══════════════════════════════════════════════════════════════════════════════
const CATEGORY_CONFIG = {

  // ── MEN'S WEAR ──────────────────────────────────────────────────────────────
  clothes_men: {
    label:    "Men's Wear",
    queries: [
      'Nike Air Max men shoes new',
      'Adidas sneakers men new with box',
      'polo ralph lauren shirt men new',
      'tommy hilfiger men shirt new',
      'Calvin Klein men jeans new',
      'Hugo Boss men suit new',
      'Gucci men belt new with box',
      'Armani Exchange men shirt new',
      'Nike running shoes men new',
      'Lacoste polo shirt men new',
      'Levi\'s 501 jeans men new',
      'Under Armour men jacket new',
    ],
    ebayCategoryId: '1059',  // Men's Clothing
    minAspects: 5,
    requiredAspects: ['size', 'color', 'brand'],
    conditionIds: ['1000', '1500'], // New, New with tags
    firestoreCategory: 'clothes_men',
  },

  // ── WOMEN'S WEAR ────────────────────────────────────────────────────────────
  clothes_women: {
    label:    "Women's Wear",
    queries: [
      'Michael Kors women handbag new',
      'Coach women bag new with tags',
      'Nike women sneakers new with box',
      'Zara women dress new with tags',
      'Louis Vuitton women scarf new',
      'Gucci women belt new',
      'Calvin Klein women jeans new',
      'Victoria Secret perfume women new',
      'Steve Madden women heels new',
      'Kate Spade women purse new',
      'Lululemon women leggings new',
      'Adidas women shoes new with box',
    ],
    ebayCategoryId: '15724', // Women's Clothing
    minAspects: 5,
    requiredAspects: ['size', 'color', 'brand'],
    conditionIds: ['1000', '1500'],
    firestoreCategory: 'clothes_women',
  },

  // ── ELECTRONICS ─────────────────────────────────────────────────────────────
  electronics: {
    label:    'Electronics',
    queries: [
      'iPhone 15 Pro Max new sealed',
      'Samsung Galaxy S24 Ultra new',
      'Apple MacBook Pro M3 new sealed',
      'Sony WH-1000XM5 headphones new',
      'Apple Watch Ultra 2 new sealed',
      'iPad Pro M4 new sealed',
      'Samsung Galaxy Tab S9 new',
      'DJI Mini 4 Pro drone new',
      'GoPro Hero 12 new sealed',
      'Apple AirPods Pro 2 new',
      'Dyson Airwrap new sealed',
      'PlayStation 5 Slim new sealed',
      'Xbox Series X new sealed',
      'Nintendo Switch OLED new',
      'Bose QuietComfort 45 new',
    ],
    ebayCategoryId: '58058', // Consumer Electronics
    minAspects: 8,           // STRICT — electronics need MORE specs
    requiredAspects: ['brand', 'model', 'storage', 'color'],
    conditionIds: ['1000'],  // New ONLY — no "new other" for electronics
    firestoreCategory: 'electronics',
    strictSpecs: true,       // Electronics: reject if specs incomplete
  },

  // ── MOBILES ─────────────────────────────────────────────────────────────────
  mobiles: {
    label:    'Mobiles',
    queries: [
      'iPhone 15 new sealed unlocked',
      'iPhone 14 Pro new sealed',
      'Samsung Galaxy S24 new sealed',
      'Samsung Galaxy A55 new',
      'Google Pixel 8 Pro new sealed',
      'OnePlus 12 new sealed',
      'Xiaomi 14 Pro new sealed',
    ],
    ebayCategoryId: '9355',  // Cell Phones & Smartphones
    minAspects: 8,
    requiredAspects: ['brand', 'model', 'storage', 'color', 'network'],
    conditionIds: ['1000'],
    firestoreCategory: 'mobiles',
    strictSpecs: true,
  },

  // ── LAPTOPS ─────────────────────────────────────────────────────────────────
  laptops: {
    label:    'Laptops',
    queries: [
      'MacBook Pro M3 new sealed',
      'MacBook Air M2 new sealed',
      'Dell XPS 15 new sealed',
      'HP Spectre x360 new',
      'Lenovo ThinkPad X1 Carbon new',
      'ASUS ROG gaming laptop new',
      'Microsoft Surface Pro new',
    ],
    ebayCategoryId: '111422', // PC Laptops
    minAspects: 8,
    requiredAspects: ['brand', 'processor', 'ram', 'storage', 'screen size'],
    conditionIds: ['1000'],
    firestoreCategory: 'laptops',
    strictSpecs: true,
  },

  // ── JEWELRY ─────────────────────────────────────────────────────────────────
  jewelry: {
    label:    'Jewelry',
    queries: [
      '18k gold bracelet new with certificate',
      'diamond ring 14k gold new',
      'Pandora charm bracelet new',
      'Cartier love bracelet new',
      'gold necklace 18k new',
      'diamond earrings new with certificate',
      'Tiffany silver bracelet new',
    ],
    ebayCategoryId: '281',   // Jewelry
    minAspects: 5,
    requiredAspects: ['metal', 'brand'],
    conditionIds: ['1000', '1500'],
    firestoreCategory: 'jewelry',
  },

  // ── BEAUTY ──────────────────────────────────────────────────────────────────
  beauty: {
    label:    'Beauty',
    queries: [
      'Charlotte Tilbury lipstick new',
      'La Mer moisturizer cream new',
      'Dior perfume new sealed',
      'Chanel No 5 perfume new sealed',
      'Tom Ford cologne new sealed',
      'SK-II facial treatment new',
      'YSL lipstick new',
      'Armani beauty foundation new',
    ],
    ebayCategoryId: '26395', // Fragrances + Skin Care
    minAspects: 4,
    requiredAspects: ['brand', 'type'],
    conditionIds: ['1000', '1500'],
    firestoreCategory: 'beauty',
  },

  // ── HOME APPLIANCES ─────────────────────────────────────────────────────────
  home_appliances: {
    label:    'Home Appliances',
    queries: [
      'Dyson V15 vacuum new sealed',
      'KitchenAid stand mixer new',
      'Nespresso coffee machine new',
      'Instant Pot pressure cooker new',
      'Philips air fryer new sealed',
      'Dyson Purifier new sealed',
      'iRobot Roomba new sealed',
    ],
    ebayCategoryId: '20625', // Major Appliances
    minAspects: 5,
    requiredAspects: ['brand', 'model', 'color'],
    conditionIds: ['1000'],
    firestoreCategory: 'home_appliances',
    strictSpecs: false,
  },

  // ── SPORTS ──────────────────────────────────────────────────────────────────
  sports: {
    label:    'Sports',
    queries: [
      'Nike Air Jordan new with box',
      'Adidas Ultraboost new with box',
      'Under Armour training shoes new',
      'Nike gym bag new',
      'Garmin Forerunner watch new',
      'Fitbit Sense 2 new sealed',
    ],
    ebayCategoryId: '888',   // Sporting Goods
    minAspects: 5,
    requiredAspects: ['brand', 'size', 'color'],
    conditionIds: ['1000', '1500'],
    firestoreCategory: 'sports',
  },

  // ── TOYS ────────────────────────────────────────────────────────────────────
  toys: {
    label:    'Toys',
    queries: [
      'LEGO Technic new sealed',
      'LEGO Star Wars new sealed',
      'Hot Wheels collector new',
      'Barbie Dreamhouse new sealed',
      'Nerf Elite blaster new',
    ],
    ebayCategoryId: '220',   // Toys & Hobbies
    minAspects: 4,
    requiredAspects: ['brand', 'age range'],
    conditionIds: ['1000'],
    firestoreCategory: 'toys',
    strictSpecs: false,
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY FILTER ENGINE
// Determines if a product meets our quality standards
// Returns { pass: bool, reason: string, score: number }
// ══════════════════════════════════════════════════════════════════════════════
function qualityFilter(item, categoryConfig) {
  const aspects      = item.localizedAspects || []
  const images       = [item.image, ...(item.additionalImages || [])].filter(Boolean)
  const conditionId  = item.conditionId || ''
  const conditionStr = (item.condition || '').toLowerCase()

  // ── 1. CONDITION CHECK ────────────────────────────────────────────────────
  // Only "New" conditions accepted (exception: electronics must be 1000 = New)
  const allowedConditions = categoryConfig.conditionIds || ['1000']
  const isNewCondition = (
    allowedConditions.includes(conditionId) ||
    conditionStr === 'new' ||
    conditionStr.startsWith('new with') ||
    conditionStr === 'brand new'
  )

  // Strict NEW only — reject used, refurbished, open box for non-electronics
  const isUsed = (
    conditionStr.includes('used') ||
    conditionStr.includes('refurbish') ||
    conditionStr.includes('pre-owned') ||
    conditionStr.includes('open box') ||
    conditionStr.includes('for parts') ||
    conditionId === '3000' || // Used
    conditionId === '2000' || // Refurbished
    conditionId === '7000'    // For parts
  )

  if (isUsed) return { pass: false, reason: 'Used/refurbished — only new accepted', score: 0 }

  // Electronics: STRICTLY new only (conditionId 1000)
  if (categoryConfig.strictSpecs && conditionId !== '1000') {
    if (!conditionStr.includes('new with') && conditionStr !== 'new') {
      return { pass: false, reason: `Electronics must be 100% new. Got: ${item.condition}`, score: 0 }
    }
  }

  // ── 2. SPECIFICATIONS CHECK ───────────────────────────────────────────────
  const aspectNames  = aspects.map(a => a.name?.toLowerCase() || '')
  const aspectCount  = aspects.length
  const minRequired  = categoryConfig.minAspects || 4
  const requiredKeys = categoryConfig.requiredAspects || []

  // Must have minimum number of specs
  if (aspectCount < minRequired) {
    return {
      pass:   false,
      reason: `Insufficient specs: ${aspectCount}/${minRequired} required`,
      score:  0,
    }
  }

  // Must have all required aspect types
  const missingAspects = requiredKeys.filter(required => {
    return !aspectNames.some(name => name.includes(required.toLowerCase()))
  })

  // For strict categories (electronics) — ALL required aspects must be present
  if (categoryConfig.strictSpecs && missingAspects.length > 0) {
    return {
      pass:   false,
      reason: `Missing required specs: ${missingAspects.join(', ')}`,
      score:  0,
    }
  }

  // For non-strict — allow 1 missing required aspect
  if (!categoryConfig.strictSpecs && missingAspects.length > 1) {
    return {
      pass:   false,
      reason: `Missing specs: ${missingAspects.join(', ')}`,
      score:  0,
    }
  }

  // ── 3. IMAGE CHECK ────────────────────────────────────────────────────────
  // Must have at least 2 images (main + at least 1 additional)
  if (images.length < 2) {
    return {
      pass:   false,
      reason: `Only ${images.length} image(s) — minimum 2 required`,
      score:  0,
    }
  }

  // ── 4. PRICE CHECK ────────────────────────────────────────────────────────
  const price = parseFloat(item.price?.value || '0')
  if (!price || price <= 0) {
    return { pass: false, reason: 'No valid price', score: 0 }
  }
  if (price > 5000) {
    return { pass: false, reason: `Price $${price} exceeds $5000 limit`, score: 0 }
  }

  // ── 5. NAME QUALITY CHECK ─────────────────────────────────────────────────
  const name = (item.title || '').trim()
  if (!name || name.length < 10) {
    return { pass: false, reason: 'Product name too short or missing', score: 0 }
  }

  // Reject listings that look like parts/broken items
  const badKeywords = ['broken', 'damaged', 'parts only', 'for parts', 'cracked', 'as is', 'untested', 'defective', 'lot of', 'bundle lot']
  const nameLower   = name.toLowerCase()
  const isBad       = badKeywords.some(kw => nameLower.includes(kw))
  if (isBad) {
    return { pass: false, reason: `Bad keyword in title: "${name.substring(0,40)}"`, score: 0 }
  }

  // ── QUALITY SCORE (0–100) ─────────────────────────────────────────────────
  let score = 50 // base
  score += Math.min(aspectCount * 3, 25)            // more specs = higher score (max +25)
  score += Math.min((images.length - 1) * 5, 15)   // more images = higher score (max +15)
  if (conditionId === '1000') score += 10           // perfect new = +10
  if (missingAspects.length === 0) score += 10      // all required specs = +10

  return { pass: true, reason: 'Passed all quality checks', score: Math.min(score, 100) }
}

// ══════════════════════════════════════════════════════════════════════════════
// eBay SEARCH — fetches items for a single query
// ══════════════════════════════════════════════════════════════════════════════
async function searchEbay(token, query, categoryId, conditionIds, limit = 10) {
  const conditionFilter = conditionIds.map(id => `conditionIds:{${id}}`).join(',')
  const params = new URLSearchParams({
    q:              query,
    category_ids:   categoryId,
    filter:         conditionFilter,
    limit:          String(limit),
    fieldgroups:    'ASPECT_REFINEMENTS',
  })

  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        'Authorization':           `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type':            'application/json',
      },
      signal: AbortSignal.timeout(12000),
    }
  )

  if (!res.ok) return []
  const data = await res.json()
  return data.itemSummaries || []
}

// ── Fetch full item details (for aspects + additional images) ─────────────────
async function getItemDetails(token, itemId) {
  try {
    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item/v1|${itemId}|0`,
      {
        headers: {
          'Authorization':           `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth check
  const token = req.headers['x-shop-token']
  if (token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Get selected category from request body
  // If no category specified, run ALL categories
  const { category: selectedCategory, maxProducts = 60 } = req.body

  let categoriesToSearch = []
  if (selectedCategory && CATEGORY_CONFIG[selectedCategory]) {
    categoriesToSearch = [selectedCategory]
  } else if (selectedCategory === 'all' || !selectedCategory) {
    categoriesToSearch = Object.keys(CATEGORY_CONFIG)
  } else {
    return res.status(400).json({ error: `Unknown category: ${selectedCategory}` })
  }

  console.log(`[Trigger] Starting search for categories: ${categoriesToSearch.join(', ')}`)

  // Respond immediately — processing happens async
  res.status(200).json({
    success:    true,
    message:    `Searching ${categoriesToSearch.map(c => CATEGORY_CONFIG[c].label).join(', ')}...`,
    categories: categoriesToSearch,
  })

  // ── ASYNC PROCESSING ──────────────────────────────────────────────────────
  ;(async () => {
    try {
      const ebayToken    = await getEbayToken()
      let totalAccepted  = 0
      let totalRejected  = 0
      let totalSent      = 0

      // Create session in Firestore
      const sessionId  = `session_${Date.now()}`
      const sessionRef = db.collection('shop_search_sessions').doc(sessionId)
      await sessionRef.set({
        sessionId,
        categories:  categoriesToSearch,
        startedAt:   new Date().toISOString(),
        status:      'running',
        accepted:    0,
        rejected:    0,
      })

      for (const catKey of categoriesToSearch) {
        const catConfig  = CATEGORY_CONFIG[catKey]
        const queries    = catConfig.queries.slice(0, 6) // max 6 queries per category run
        const perQuery   = Math.ceil(maxProducts / queries.length / categoriesToSearch.length)
        const perQueryN  = Math.min(perQuery, 10) // eBay max per call

        console.log(`[Trigger] Searching ${catConfig.label} with ${queries.length} queries`)

        for (const query of queries) {
          try {
            const items = await searchEbay(
              ebayToken,
              query,
              catConfig.ebayCategoryId,
              catConfig.conditionIds,
              perQueryN
            )

            for (const item of items) {
              // Get full details for quality check (aspects + images)
              const ebayItemId = item.itemId?.split('|')?.[1] || item.itemId
              const details    = await getItemDetails(ebayToken, ebayItemId)
              if (!details) continue

              // Merge summary + details
              const fullItem = {
                ...item,
                localizedAspects: details.localizedAspects || [],
                additionalImages: details.additionalImages || [],
                description:      details.description,
                conditionId:      details.conditionId || item.conditionId,
                condition:        details.condition   || item.condition,
              }

              // ── QUALITY FILTER ──────────────────────────────────────────
              const quality = qualityFilter(fullItem, catConfig)
              if (!quality.pass) {
                console.log(`[Reject] ${item.title?.substring(0,40)} — ${quality.reason}`)
                totalRejected++

                // Log rejection to Firestore
                db.collection('shop_rejected_products').add({
                  name:      item.title,
                  reason:    quality.reason,
                  category:  catKey,
                  sessionId,
                  rejectedAt: new Date().toISOString(),
                }).catch(() => {})
                continue
              }

              // ── DEDUPLICATION ────────────────────────────────────────────
              const sourceUrl  = details.itemWebUrl || ''
              const sourceName = (item.title || '').toLowerCase().replace(/\s+/g, '-').substring(0, 60)
              const dupCheck   = await isDuplicate(sourceName, 'shop_initial_products')
              if (dupCheck) {
                console.log(`[Duplicate] ${item.title?.substring(0,40)}`)
                continue
              }

              // ── PRICING ──────────────────────────────────────────────────
              const priceUSD    = parseFloat(item.price?.value || '0')
              const priceSAR    = Math.round(priceUSD * USD_TO_SAR)
              const sellingData = applyMarkup(priceSAR)
              if (!sellingData) continue

              // ── BUILD PRODUCT ─────────────────────────────────────────────
              // Extract key aspects
              const aspects     = fullItem.localizedAspects || []
              const getAspect   = (key) => {
                const found = aspects.find(a =>
                  a.name?.toLowerCase().includes(key.toLowerCase())
                )
                return Array.isArray(found?.value) ? found.value.join(', ') : (found?.value || null)
              }

              const brand    = getAspect('brand')
              const color    = getAspect('color') || getAspect('colour')
              const size     = getAspect('size')
              const model    = getAspect('model')
              const storage  = getAspect('storage')

              // Build clean specifications string
              const specParts = [
                item.condition,
                brand    ? `Brand: ${brand}`   : null,
                color    ? `Color: ${color}`   : null,
                size     ? `Size: ${size}`     : null,
                model    ? `Model: ${model}`   : null,
                storage  ? `Storage: ${storage}` : null,
              ].filter(Boolean)

              // All images
              const mainImage = (details.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '')
                .replace(/\/s-l\d+\./, '/s-l500.')
              const additionalImgs = (details.additionalImages || [])
                .map(img => img.imageUrl?.replace(/\/s-l\d+\./, '/s-l500.'))
                .filter(Boolean)
                .slice(0, 7)

              const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2,6)}`

              const product = {
                id:                    productId,
                name:                  item.title,
                image:                 mainImage,
                additionalImages:      additionalImgs,
                sellingPriceSAR:       sellingData.sellingPriceSAR,
                sellingPriceFormatted: sellingData.formatted,
                _sourcePriceSAR:       priceSAR,
                _sourceLink:           sourceUrl, // HIDDEN from public
                category:              catConfig.firestoreCategory,
                specifications:        specParts[0] || item.condition || 'New',
                aspects:               aspects.map(a => ({
                  name:  a.name,
                  value: Array.isArray(a.value) ? a.value.join(', ') : a.value,
                })),
                condition:             item.condition,
                brand,
                color,
                size,
                qualityScore:          quality.score,
                status:                'pending',
                sessionId,
                searchQuery:           query,
                createdAt:             new Date().toISOString(),
                views:                 0,
                sales:                 0,
              }

              // Save to Firestore pending + session subcollection
              await db.collection('shop_approved_products').doc(productId).set(product)
              await sessionRef.collection('products').doc(productId).set({ productId, name: item.title })

              // Send to Telegram for approval
              await sendToTelegram(product)
              totalAccepted++
              totalSent++

              console.log(`[Accept] ${item.title?.substring(0,40)} — Score: ${quality.score}`)

              // Throttle — don't hammer eBay
              await new Promise(r => setTimeout(r, 300))
            }

            // Pause between queries
            await new Promise(r => setTimeout(r, 800))

          } catch (queryErr) {
            console.error(`[Trigger] Query error "${query}":`, queryErr.message)
          }
        }
      }

      // Update session complete
      await sessionRef.update({
        status:     'completed',
        accepted:   totalAccepted,
        rejected:   totalRejected,
        sent:       totalSent,
        completedAt: new Date().toISOString(),
      })

      console.log(`[Trigger] Done — Accepted: ${totalAccepted}, Rejected: ${totalRejected}`)

    } catch (err) {
      console.error('[Trigger] Fatal error:', err.message)
    }
  })()
}
