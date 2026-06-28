/**
 * HUSIN — Discovery Worker (Part 3 hardened)
 * Processes ONE pending search task per invocation. For each eBay candidate:
 *   1. Rate-limited + backoff-wrapped item-detail fetch (anti-ban, Part 3)
 *   2. Intelligent category mapping via categoryMapper.js (Part 3)
 *   3. Hard multi-image requirement (Part 3) — was previously a score bonus only
 *   4. Variant/localizedAspects capture for product page rendering (Part 3)
 */

import { db }              from '../../../lib/firebaseAdmin'
import { calculatePrice }  from '../../../lib/pricingEngine'
import { mapCategory }     from '../../../lib/categoryMapper'
import { notifyProductForApproval } from '../../../lib/telegramNotifier'
import { withBackoff, fixedDelay } from '../../../lib/rateLimiter'

const EBAY_APP_ID    = process.env.EBAY_APP_ID
const EBAY_SECRET    = process.env.EBAY_SECRET
const MIN_IMAGES     = 2 // hard requirement — main image + at least 1 additional

let cachedToken    = null
let cachedTokenExp  = 0

async function getEbayToken() {
  if (cachedToken && Date.now() < cachedTokenExp) return cachedToken

  const res = await withBackoff(
    () => fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${EBAY_APP_ID}:${EBAY_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    }),
    { label: 'eBay OAuth token' }
  )

  const data = await res.json()
  if (!data.access_token) throw new Error('eBay OAuth failed: ' + JSON.stringify(data))

  cachedToken    = data.access_token
  cachedTokenExp = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

async function searchEbay(token, query, categoryId) {
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&category_ids=${categoryId}&limit=20&filter=conditionIds:{1000}`

  const res = await withBackoff(
    () => fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    }),
    { label: `eBay search "${query}"` }
  )

  if (!res.ok) {
    console.error(`[Worker] Search failed (${res.status}) for "${query}"`)
    return []
  }

  const data = await res.json()
  return data.itemSummaries || []
}

async function getItemDetail(token, itemId) {
  const res = await withBackoff(
    () => fetch(`https://api.ebay.com/buy/browse/v1/item/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    }),
    { label: `eBay item detail ${itemId}` }
  )

  if (!res.ok) return null
  return res.json()
}

function passesQualityFilter(detail) {
  const images = [
    detail.image?.imageUrl,
    ...(detail.additionalImages || []).map(i => i.imageUrl),
  ].filter(Boolean)

  if (images.length < MIN_IMAGES) {
    return { pass: false, reason: `Only ${images.length} image(s), need ${MIN_IMAGES}+` }
  }

  if (!detail.price?.value) {
    return { pass: false, reason: 'Missing price' }
  }

  return { pass: true, images }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers['x-shop-token']
  if (token !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const taskSnap = await db.collection('shop_search_tasks')
      .where('status', '==', 'pending')
      .orderBy('createdAt')
      .limit(1)
      .get()

    if (taskSnap.empty) {
      return res.status(200).json({ done: true, message: 'No pending tasks' })
    }

    const taskDoc = taskSnap.docs[0]
    const task    = taskDoc.data()
    await taskDoc.ref.update({ status: 'processing' })

    const ebayToken = await getEbayToken()
    const candidates = await searchEbay(ebayToken, task.query, task.ebayCategoryId)

    let accepted = 0
    let rejected = 0

    for (const candidate of candidates) {
      await fixedDelay() // anti-ban pacing between item-detail calls

      const itemId = candidate.itemId
      const detail = await getItemDetail(ebayToken, itemId)
      if (!detail) { rejected++; continue }

      const quality = passesQualityFilter(detail)
      if (!quality.pass) {
        console.log(`[Worker] Rejected "${detail.title}" — ${quality.reason}`)
        rejected++
        continue
      }

      const mapped = mapCategory({
        title: detail.title || '',
        ebayCategories: detail.categories || [],
        intendedCategory: task.firestoreCategory,
      })

      const sourcePriceUSD = parseFloat(detail.price.value)
      const pricing = calculatePrice(sourcePriceUSD, 'USD')

      const fingerprint = `ebay_${itemId}`
      const existing = await db.collection('shop_approved_products').doc(fingerprint).get()
      if (existing.exists) { rejected++; continue }

      // FIX (2026-06-29): was status:'live' with no Telegram notification at
      // all — products went straight to the live store with zero owner review,
      // and the dashboard's "sent to Telegram for approval" promise was never
      // true for this pipeline. Now writes 'pending' + sends an approve/reject
      // message, reusing the exact callback_data shape webhook.js already
      // parses (see notifyProductForApproval in lib/telegramNotifier.js).
      const newProduct = {
        id: fingerprint,
        name: detail.title,
        image: quality.images[0],
        additionalImages: quality.images.slice(1),
        category: mapped.category,
        categoryConfidence: mapped.confidence,
        isAccessory: mapped.isAccessory,
        localizedAspects: detail.localizedAspects || [],
        sellingPriceSAR: pricing.sellingPriceSAR,
        sellingPriceFormatted: pricing.sellingPriceFormatted,
        _sourcePriceSAR: pricing.sourcePriceSAR,
        _sourceLink: detail.itemWebUrl || '',
        supplierFreeShipping: !detail.shippingOptions?.[0]?.shippingCost?.value,
        supplierShippingCostUSD: parseFloat(detail.shippingOptions?.[0]?.shippingCost?.value || 0),
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      await db.collection('shop_approved_products').doc(fingerprint).set(newProduct)

      try {
        await notifyProductForApproval(newProduct, task.jobId)
      } catch (notifyErr) {
        console.error('[Worker] Telegram notify failed (product still saved as pending):', notifyErr.message)
      }

      accepted++
    }

    await taskDoc.ref.update({
      status: 'done',
      accepted,
      rejected,
      completedAt: new Date().toISOString(),
    })

    return res.status(200).json({ done: false, accepted, rejected, task: task.query })

  } catch (err) {
    console.error('[Worker] Fatal:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
