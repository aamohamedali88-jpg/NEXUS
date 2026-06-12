/**
 * HUSIN ESHOP — POST /api/shop/trigger-worker
 * FREE PLAN COMPATIBLE — processes ONE eBay query per call (~5s each)
 * FIXED: Uses correct function names from actual lib files:
 *   - calculatePrice() from pricingEngine (NOT applyMarkup)
 *   - loadExistingFingerprints() + filterNewProducts() from deduplicator (NOT isDuplicate)
 *   - Inline Telegram sender (NOT sendToTelegram which doesn't exist)
 */

import { db }                     from '../../../lib/firebaseAdmin'
import { calculatePrice }          from '../../../lib/pricingEngine'
import {
  loadExistingFingerprints,
  filterNewProducts,
  saveToInitialList,
}                                  from '../../../lib/deduplicator'

const EBAY_APP_ID = process.env.EBAY_APP_ID
const EBAY_SECRET = process.env.EBAY_SECRET
const USD_TO_SAR  = 3.75

// ── eBay OAuth ────────────────────────────────────────────────────────────────
async function getEbayToken() {
  const creds = Buffer.from(`${EBAY_APP_ID}:${EBAY_SECRET}`).toString('base64')
  const res   = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body:   'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    signal: AbortSignal.timeout(6000),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('eBay OAuth failed: ' + JSON.stringify(data))
  return data.access_token
}

// ── eBay Search ───────────────────────────────────────────────────────────────
async function searchEbay(token, task) {
  const conditionFilter = task.conditionIds.map(id => `conditionIds:{${id}}`).join(',')
  const params = new URLSearchParams({
    q:            task.query,
    category_ids: task.ebayCategoryId,
    filter:       conditionFilter,
    limit:        '8',
  })

  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        'Authorization':           `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type':            'application/json',
      },
      signal: AbortSignal.timeout(6000),
    }
  )
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`eBay search failed: ${res.status} — ${errText.substring(0, 100)}`)
  }
  const data = await res.json()
  return data.itemSummaries || []
}

// ── Quality Filter ────────────────────────────────────────────────────────────
function qualityFilter(item, task) {
  const conditionStr = (item.condition || '').toLowerCase()
  const conditionId  = item.conditionId || ''
  const name         = (item.title     || '').toLowerCase()
  const price        = parseFloat(item.price?.value || '0')

  if (!price || price <= 0 || price > 5000)
    return { pass: false, reason: `Invalid price: $${price}` }

  const badConditions = ['used', 'refurbish', 'pre-owned', 'for parts', 'open box', 'not working']
  if (badConditions.some(c => conditionStr.includes(c)))
    return { pass: false, reason: `Bad condition: ${item.condition}` }

  if (['3000','2000','7000'].includes(conditionId))
    return { pass: false, reason: `Used/refurb conditionId: ${conditionId}` }

  if (task.strictSpecs && conditionId !== '1000') {
    if (!conditionStr.includes('new with') && conditionStr !== 'new')
      return { pass: false, reason: `Electronics needs 100% new. Got: ${item.condition}` }
  }

  const badWords = ['broken','damaged','parts only','for parts','cracked','as is','untested','defective','lot of','junk','faulty']
  if (badWords.some(w => name.includes(w)))
    return { pass: false, reason: 'Bad keyword in title' }

  if (!item.image?.imageUrl && !item.thumbnailImages?.[0]?.imageUrl)
    return { pass: false, reason: 'No image' }

  let score = 55
  if (conditionId === '1000') score += 20
  if ((item.localizedAspects || []).length >= 5) score += 15
  if (item.additionalImages?.length > 0) score += 10

  return { pass: true, score: Math.min(score, 100) }
}

// ── Inline Telegram Sender ────────────────────────────────────────────────────
// Self-contained — no imports from lib/telegramNotifier needed
async function sendProductToTelegram(product, sessionId) {
  const BOT  = process.env.TELEGRAM_BOT_TOKEN
  const CHAT = process.env.TELEGRAM_CHAT_ID

  if (!BOT || !CHAT) {
    console.log('[Worker] Telegram env vars missing — skipping')
    return
  }

  const price = product.sellingPriceSAR
    ? `${product.sellingPriceSAR.toLocaleString('en-SA')} SAR`
    : 'N/A'

  const sourceSAR = product._sourcePriceSAR
    ? `${product._sourcePriceSAR.toLocaleString('en-SA')} SAR`
    : 'N/A'

  const profitSAR = (product.sellingPriceSAR && product._sourcePriceSAR)
    ? `${(product.sellingPriceSAR - product._sourcePriceSAR).toLocaleString('en-SA')} SAR`
    : 'N/A'

  const text = [
    `🛒 NEW PRODUCT — ${(product.category||'').replace(/_/g,' ').toUpperCase()}`,
    ``,
    `📦 ${product.name}`,
    `💰 Your Sell Price: ${price}`,
    `🏷️ Source Cost: ${sourceSAR}`,
    `💵 Your Profit: ${profitSAR}`,
    `📋 Condition: ${product.condition || 'New'}`,
    product.brand ? `🏷️ Brand: ${product.brand}` : null,
    product.color ? `🎨 Color: ${product.color}` : null,
    product.size  ? `📐 Size: ${product.size}`   : null,
    `⭐ Quality: ${product.qualityScore || 60}/100`,
    ``,
    `Approve to publish to marketplace ↓`,
  ].filter(Boolean).join('\n')

  // callback_data format: "approve_<productId>_<sessionId>"
  // webhook.js parses this to find the product and update Firestore
  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Approve → Live', callback_data: `approve_${product.id}_${sessionId}` },
      { text: '❌ Reject',         callback_data: `reject_${product.id}_${sessionId}`  },
    ]]
  }

  try {
    if (product.image) {
      const r = await fetch(`https://api.telegram.org/bot${BOT}/sendPhoto`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id:CHAT, photo:product.image, caption:text, reply_markup:keyboard }),
        signal:  AbortSignal.timeout(6000),
      })
      const d = await r.json()
      if (d.ok) return
    }
    // Fallback text
    await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id:CHAT, text, reply_markup:keyboard }),
      signal:  AbortSignal.timeout(6000),
    })
  } catch (e) {
    console.log('[Worker] Telegram send error:', e.message)
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers['x-shop-token']
  if (token !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' })

  const { jobId } = req.body
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  try {
    const jobRef = db.collection('shop_search_jobs').doc(jobId)
    const jobDoc = await jobRef.get()
    if (!jobDoc.exists) return res.status(404).json({ error: 'Job not found' })

    const job = jobDoc.data()
    if (job.status === 'completed')
      return res.status(200).json({ done: true, message: 'Job already completed' })

    // Get all pending tasks — sort in JS (no Firestore composite index needed)
    const tasksSnap = await jobRef.collection('tasks')
      .where('status', '==', 'pending')
      .get()

    if (tasksSnap.empty) {
      await jobRef.update({ status: 'completed', completedAt: new Date().toISOString() })
      return res.status(200).json({
        done:     true,
        accepted: job.accepted || 0,
        rejected: job.rejected || 0,
        message:  `Search complete! ${job.accepted || 0} products sent to Telegram.`,
      })
    }

    // Sort by qi in JS — pick lowest qi (first in queue)
    const sortedDocs = tasksSnap.docs.sort((a, b) => (a.data().qi || 0) - (b.data().qi || 0))
    const taskDoc    = sortedDocs[0]
    const task       = taskDoc.data()
    const taskRef    = taskDoc.ref

    await taskRef.update({ status: 'processing', startedAt: new Date().toISOString() })

    let accepted = 0
    let rejected = 0

    try {
      // 1. Get eBay token
      const ebayToken = await getEbayToken()

      // 2. Search eBay for this ONE query
      const items = await searchEbay(ebayToken, task)
      console.log(`[Worker] Query "${task.query}" → ${items.length} items`)

      // 3. Load existing fingerprints for deduplication
      const existingFingerprints = await loadExistingFingerprints('shop_initial_products')

      // 4. Process each item
      const newItems = []
      for (const item of items) {
        // Quality filter
        const quality = qualityFilter(item, task)
        if (!quality.pass) {
          console.log(`[Worker] Reject: ${item.title?.substring(0,40)} — ${quality.reason}`)
          rejected++
          continue
        }

        // Build candidate for deduplication check
        const candidate = {
          name:     item.title,
          rawPrice: item.price?.value,
          sourceId: 'ebay',
        }
        const filtered = filterNewProducts([candidate], existingFingerprints)
        if (filtered.length === 0) {
          console.log(`[Worker] Duplicate: ${item.title?.substring(0,40)}`)
          continue
        }

        newItems.push({ item, quality })
      }

      // 5. Price and save each new item
      for (const { item, quality } of newItems) {
        const priceUSD  = parseFloat(item.price?.value || '0')
        const priceSAR  = Math.round(priceUSD * USD_TO_SAR)

        // calculatePrice takes (sourcePrice, currency) — pass SAR price directly
        const pricing   = calculatePrice(priceSAR, 'SAR')
        if (!pricing?.isViable) {
          console.log(`[Worker] Not viable: ${item.title?.substring(0,40)}`)
          rejected++
          continue
        }

        const mainImage = (item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '')
          .replace(/\/s-l\d+\./, '/s-l500.')

        const aspects   = item.localizedAspects || []
        const getAspect = (key) => {
          const found = aspects.find(a => a.name?.toLowerCase().includes(key))
          return Array.isArray(found?.value) ? found.value.join(', ') : (found?.value || null)
        }

        const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2,6)}`

        const product = {
          id:                    productId,
          name:                  item.title,
          image:                 mainImage,
          additionalImages:      (item.additionalImages||[])
            .map(img => img.imageUrl?.replace(/\/s-l\d+\./,'/s-l500.')).filter(Boolean).slice(0,7),
          sellingPriceSAR:       pricing.sellingPriceSAR,
          sellingPriceFormatted: pricing.sellingPriceFormatted,
          _sourcePriceSAR:       priceSAR,
          _sourceLink:           item.itemWebUrl || '',
          category:              task.firestoreCategory,
          specifications:        item.condition || 'New',
          aspects,
          condition:             item.condition,
          brand:                 getAspect('brand'),
          color:                 getAspect('color') || getAspect('colour'),
          size:                  getAspect('size'),
          qualityScore:          quality.score || 60,
          jobId,
          // Pricing object (webhook needs this structure)
          pricing: {
            sellingPriceSAR:       pricing.sellingPriceSAR,
            sellingPriceFormatted: pricing.sellingPriceFormatted,
            sourcePriceSAR:        priceSAR,
            profitSAR:             pricing.profitSAR,
            isViable:              true,
          },
          // Source info (webhook needs these)
          sourceLink:  item.itemWebUrl || '',
          sourceName:  'eBay',
          sourceId:    'ebay',
          searchQuery: task.query,
          decision:    'pending',
          createdAt:   new Date().toISOString(),
          views:       0,
          sales:       0,
        }

        // Save to shop_search_sessions so webhook.js can find it by sessionId
        await db.collection('shop_search_sessions').doc(jobId)
          .collection('products').doc(productId).set(product)

        // Save pending record to shop_approved_products
        await db.collection('shop_approved_products').doc(productId).set({
          ...product,
          sessionId: jobId,
          status:    'pending',
        })

        // Save fingerprint to prevent future duplicates
        await saveToInitialList([{
          id:          productId,
          name:        item.title,
          rawPrice:    item.price?.value,
          sourceId:    'ebay',
          sourceName:  'eBay',
          sourceLink:  item.itemWebUrl || '',
          image:       mainImage,
          category:    task.firestoreCategory,
          fingerprint: filterNewProducts([{
            name: item.title, rawPrice: item.price?.value, sourceId: 'ebay'
          }], new Set())[0]?.fingerprint,
        }])

        // Send to Telegram
        await sendProductToTelegram(product, jobId)

        accepted++
        console.log(`[Worker] ✅ Accepted: ${item.title?.substring(0,40)} — ${pricing.sellingPriceSAR} SAR`)
      }

    } catch (queryErr) {
      console.error(`[Worker] Query error: ${queryErr.message}`)
      rejected++
    }

    // Mark task done
    await taskRef.update({
      status:      'done',
      accepted,
      rejected,
      completedAt: new Date().toISOString(),
    })

    // Update job totals
    const newCompleted = (job.completedTasks || 0) + 1
    const newAccepted  = (job.accepted || 0) + accepted
    const newRejected  = (job.rejected || 0) + rejected
    await jobRef.update({
      completedTasks: newCompleted,
      accepted:       newAccepted,
      rejected:       newRejected,
      status:         'running',
    })

    // Check remaining tasks
    const remainingSnap = await jobRef.collection('tasks')
      .where('status', '==', 'pending')
      .limit(1).get()

    const hasMore = !remainingSnap.empty

    if (!hasMore) {
      await jobRef.update({ status: 'completed', completedAt: new Date().toISOString() })
    }

    return res.status(200).json({
      done:           !hasMore,
      accepted,
      rejected,
      completedTasks: newCompleted,
      totalTasks:     job.totalTasks,
      currentQuery:   task.query,
      message: hasMore
        ? `Query ${newCompleted}/${job.totalTasks}: "${task.query}" — ${accepted} found`
        : `All done! ${newAccepted} products sent to Telegram ✅`,
    })

  } catch (err) {
    console.error('[Worker] Fatal:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
