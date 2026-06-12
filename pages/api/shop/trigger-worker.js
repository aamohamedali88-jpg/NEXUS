/**
 * HUSIN ESHOP — POST /api/shop/trigger-worker
 * FREE PLAN COMPATIBLE — processes ONE eBay query per call (~5s each)
 * FINAL FIX — all lib function calls verified against actual source:
 *   calculatePrice(usdPrice, 'USD')          ← pricingEngine.js line 63
 *   loadExistingFingerprints(collectionName) ← deduplicator.js line 28
 *   filterNewProducts(candidates, fpSet)     ← deduplicator.js line 46
 *   saveToInitialList(products, collection)  ← deduplicator.js line 58
 */

import { db }                  from '../../../lib/firebaseAdmin'
import { calculatePrice }      from '../../../lib/pricingEngine'
import {
  loadExistingFingerprints,
  filterNewProducts,
  saveToInitialList,
}                              from '../../../lib/deduplicator'

const EBAY_APP_ID = process.env.EBAY_APP_ID
const EBAY_SECRET = process.env.EBAY_SECRET

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
    signal: AbortSignal.timeout(7000),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('eBay OAuth failed: ' + (data.error_description || ''))
  return data.access_token
}

// ── eBay Search ───────────────────────────────────────────────────────────────
// Returns item summaries — each has price in USD, condition, image
async function searchEbay(token, task) {
  // Build filter — conditionIds filter is optional, skip if causes issues
  const params = new URLSearchParams({
    q:            task.query,
    category_ids: task.ebayCategoryId,
    limit:        '10',
  })

  // Only add condition filter if conditionIds provided
  if (task.conditionIds && task.conditionIds.length > 0) {
    params.set('filter', task.conditionIds.map(id => `conditionIds:{${id}}`).join(','))
  }

  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`
  console.log(`[Worker] Searching: ${task.query}`)

  const res = await fetch(url, {
    headers: {
      'Authorization':           `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type':            'application/json',
    },
    signal: AbortSignal.timeout(7000),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`[Worker] eBay error ${res.status}: ${errText.substring(0, 200)}`)
    return []
  }

  const data  = await res.json()
  const items = data.itemSummaries || []
  console.log(`[Worker] eBay returned ${items.length} items for: "${task.query}"`)
  return items
}

// ── Quality Filter ────────────────────────────────────────────────────────────
function qualityFilter(item, task) {
  const conditionStr = (item.condition || '').toLowerCase()
  const conditionId  = String(item.conditionId || '')
  const title        = (item.title || '').toLowerCase()
  const priceUSD     = parseFloat(item.price?.value || '0')

  // Must have a price
  if (!priceUSD || priceUSD <= 0) return { pass: false, reason: 'No price' }
  if (priceUSD > 5000)            return { pass: false, reason: `Price too high: $${priceUSD}` }

  // Must have image
  const hasImage = !!(item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl)
  if (!hasImage) return { pass: false, reason: 'No image' }

  // Reject clearly bad conditions
  const badConditions = ['used', 'refurbish', 'pre-owned', 'for parts', 'not working', 'open box']
  if (badConditions.some(c => conditionStr.includes(c)))
    return { pass: false, reason: `Bad condition: ${item.condition}` }

  // Reject used condition IDs
  if (['3000', '2000', '7000'].includes(conditionId))
    return { pass: false, reason: `Used conditionId: ${conditionId}` }

  // Strict mode: electronics must be conditionId 1000 (New)
  if (task.strictSpecs) {
    if (conditionId !== '1000' && !conditionStr.startsWith('new'))
      return { pass: false, reason: `Strict: needs New. Got: ${item.condition}` }
  }

  // Reject bad title keywords
  const badWords = ['broken','damaged','parts only','for parts','cracked','as is',
    'untested','defective','lot of','junk','faulty','repair']
  if (badWords.some(w => title.includes(w)))
    return { pass: false, reason: 'Bad keyword in title' }

  // Calculate quality score
  let score = 55
  if (conditionId === '1000')                             score += 20
  if ((item.localizedAspects || []).length >= 5)          score += 15
  if ((item.additionalImages || []).length > 0)           score += 10

  return { pass: true, score: Math.min(score, 100) }
}

// ── Inline Telegram Sender ────────────────────────────────────────────────────
async function sendProductToTelegram(product, sessionId) {
  const BOT  = process.env.TELEGRAM_BOT_TOKEN
  const CHAT = process.env.TELEGRAM_CHAT_ID
  if (!BOT || !CHAT) return

  const price     = product.sellingPriceSAR
    ? `${product.sellingPriceSAR.toLocaleString('en-SA')} SAR` : 'N/A'
  const costSAR   = product.sourcePriceSAR
    ? `${Math.round(product.sourcePriceSAR).toLocaleString('en-SA')} SAR` : 'N/A'
  const profitSAR = (product.sellingPriceSAR && product.sourcePriceSAR)
    ? `${Math.round(product.sellingPriceSAR - product.sourcePriceSAR).toLocaleString('en-SA')} SAR`
    : 'N/A'

  const text = [
    `🛒 NEW PRODUCT — ${(product.category||'').replace(/_/g,' ').toUpperCase()}`,
    ``,
    `📦 ${product.name}`,
    `💰 Sell Price: ${price}`,
    `🏷️ Source Cost: ${costSAR}`,
    `💵 Profit: ${profitSAR}`,
    `📋 Condition: ${product.condition || 'New'}`,
    product.brand ? `🔖 Brand: ${product.brand}` : null,
    product.color ? `🎨 Color: ${product.color}` : null,
    product.size  ? `📐 Size: ${product.size}`   : null,
    `⭐ Quality: ${product.qualityScore}/100`,
    ``,
    `Approve to publish live ↓`,
  ].filter(Boolean).join('\n')

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
      if (d.ok) { console.log(`[Worker] ✅ Telegram sent: ${product.name?.substring(0,30)}`); return }
    }
    // Fallback: text message
    await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id:CHAT, text, reply_markup:keyboard }),
      signal:  AbortSignal.timeout(6000),
    })
    console.log(`[Worker] ✅ Telegram text sent: ${product.name?.substring(0,30)}`)
  } catch (e) {
    console.error('[Worker] Telegram error:', e.message)
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

    // Fetch all pending tasks — sort in JS (no composite index needed)
    const tasksSnap = await jobRef.collection('tasks')
      .where('status', '==', 'pending')
      .get()

    if (tasksSnap.empty) {
      await jobRef.update({ status: 'completed', completedAt: new Date().toISOString() })
      return res.status(200).json({
        done:     true,
        accepted: job.accepted || 0,
        rejected: job.rejected || 0,
        message:  `All done! ${job.accepted || 0} products sent to Telegram ✅`,
      })
    }

    // Sort by qi in JS — lowest qi = first in queue
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

      // 2. Search eBay — ONE query
      const items = await searchEbay(ebayToken, task)

      if (items.length === 0) {
        console.log(`[Worker] No items returned for: "${task.query}"`)
        await taskRef.update({ status: 'done', accepted: 0, rejected: 0, completedAt: new Date().toISOString() })
        await jobRef.update({
          completedTasks: (job.completedTasks || 0) + 1,
          status: 'running',
        })
        const rem = await jobRef.collection('tasks').where('status','==','pending').limit(1).get()
        if (rem.empty) await jobRef.update({ status:'completed', completedAt:new Date().toISOString() })
        return res.status(200).json({
          done:           rem.empty,
          accepted:       0,
          rejected:       0,
          completedTasks: (job.completedTasks || 0) + 1,
          totalTasks:     job.totalTasks,
          currentQuery:   task.query,
          message:        `Query ${(job.completedTasks||0)+1}/${job.totalTasks}: "${task.query}" — 0 found`,
        })
      }

      // 3. Load dedup fingerprints
      const existingFps = await loadExistingFingerprints('shop_initial_products')

      // 4. Build candidates for dedup check
      // filterNewProducts needs: { name, rawPrice, sourceId }
      // rawPrice = eBay USD price string, sourceId = 'ebay'
      const candidates = items.map(item => ({
        name:     item.title || '',
        rawPrice: item.price?.value || '0',
        sourceId: 'ebay',
      }))

      const newCandidates = filterNewProducts(candidates, existingFps)
      console.log(`[Worker] After dedup: ${newCandidates.length}/${items.length} new`)

      // Match new candidates back to original items
      const newItems = items.filter(item => {
        const title = item.title || ''
        return newCandidates.some(c => c.name === title)
      })

      // 5. Process each new item
      const savedProducts = []

      for (const item of newItems) {
        // Quality check
        const quality = qualityFilter(item, task)
        if (!quality.pass) {
          console.log(`[Worker] Reject: ${item.title?.substring(0,40)} — ${quality.reason}`)
          rejected++
          continue
        }

        // Pricing — calculatePrice(sourcePrice, currency)
        // eBay prices are in USD — pass USD price directly
        const priceUSD = parseFloat(item.price?.value || '0')
        const pricing  = calculatePrice(priceUSD, 'USD')

        if (!pricing.isViable) {
          console.log(`[Worker] Not viable: ${item.title?.substring(0,40)} — ${pricing.viabilityNote}`)
          rejected++
          continue
        }

        // Images
        const mainImage = (item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '')
          .replace(/\/s-l\d+\./, '/s-l500.')

        const additionalImages = (item.additionalImages || [])
          .map(img => img.imageUrl?.replace(/\/s-l\d+\./, '/s-l500.')).filter(Boolean).slice(0, 7)

        // Aspects (limited in summary — enriched later on product page)
        const aspects    = item.localizedAspects || []
        const getAspect  = (key) => {
          const f = aspects.find(a => a.name?.toLowerCase().includes(key))
          return Array.isArray(f?.value) ? f.value.join(', ') : (f?.value || null)
        }

        const productId  = `prod_${Date.now()}_${Math.random().toString(36).substr(2,6)}`

        const product = {
          id:                    productId,
          name:                  item.title,
          image:                 mainImage,
          additionalImages,
          // Pricing fields
          sellingPriceSAR:       pricing.sellingPriceSAR,
          sellingPriceFormatted: pricing.sellingPriceFormatted,
          sourcePriceSAR:        pricing.sourcePriceSAR,   // for Telegram display
          sourcePriceUSD:        pricing.sourcePriceUSD,
          _sourcePriceSAR:       pricing.sourcePriceSAR,   // for webhook compatibility
          _sourceLink:           item.itemWebUrl || '',
          // Category & specs
          category:              task.firestoreCategory,
          specifications:        item.condition || 'New',
          aspects,
          condition:             item.condition || 'New',
          brand:                 getAspect('brand'),
          color:                 getAspect('color') || getAspect('colour'),
          size:                  getAspect('size'),
          qualityScore:          quality.score,
          // Job tracking
          jobId,
          searchQuery:           task.query,
          // For webhook.js compatibility
          pricing: {
            sellingPriceSAR:       pricing.sellingPriceSAR,
            sellingPriceFormatted: pricing.sellingPriceFormatted,
            sourcePriceSAR:        pricing.sourcePriceSAR,
            profitSAR:             pricing.profitSAR,
            isViable:              true,
          },
          sourceLink:  item.itemWebUrl || '',
          sourceName:  'eBay',
          sourceId:    'ebay',
          decision:    'pending',
          createdAt:   new Date().toISOString(),
          views:       0,
          sales:       0,
        }

        // Save to shop_search_sessions (webhook finds product here via sessionId)
        await db.collection('shop_search_sessions').doc(jobId)
          .collection('products').doc(productId).set(product)

        // Save pending to shop_approved_products (goes live after Telegram approve)
        await db.collection('shop_approved_products').doc(productId).set({
          ...product,
          sessionId: jobId,
          status:    'pending',
        })

        // Send to Telegram with approve/reject buttons
        await sendProductToTelegram(product, jobId)

        savedProducts.push({
          id:         productId,
          name:       item.title,
          rawPrice:   item.price?.value || '0',
          sourceId:   'ebay',
          sourceName: 'eBay',
          sourceLink: item.itemWebUrl || '',
          image:      mainImage,
          category:   task.firestoreCategory,
          fingerprint:newCandidates.find(c => c.name === item.title)?.fingerprint,
        })

        accepted++
        console.log(`[Worker] ✅ Saved: ${item.title?.substring(0,40)} — ${pricing.sellingPriceSAR} SAR`)
      }

      // 6. Save fingerprints to prevent future duplicates
      if (savedProducts.length > 0) {
        await saveToInitialList(savedProducts, 'shop_initial_products')
      }

    } catch (queryErr) {
      console.error(`[Worker] Error: ${queryErr.message}`)
      rejected++
    }

    // Mark task done
    await taskRef.update({ status:'done', accepted, rejected, completedAt:new Date().toISOString() })

    // Update job totals
    const newCompleted = (job.completedTasks || 0) + 1
    const newAccepted  = (job.accepted  || 0) + accepted
    const newRejected  = (job.rejected  || 0) + rejected
    await jobRef.update({ completedTasks:newCompleted, accepted:newAccepted, rejected:newRejected, status:'running' })

    // Check remaining
    const remSnap = await jobRef.collection('tasks').where('status','==','pending').limit(1).get()
    const hasMore = !remSnap.empty
    if (!hasMore) await jobRef.update({ status:'completed', completedAt:new Date().toISOString() })

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
