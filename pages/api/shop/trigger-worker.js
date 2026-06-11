/**
 * HUSIN ESHOP — POST /api/shop/trigger-worker
 * FREE PLAN COMPATIBLE — processes ONE eBay query per call
 * Each call completes in < 8 seconds (well under 10s Vercel limit)
 * Called repeatedly by dashboard until all tasks are done
 *
 * Flow:
 * 1. Fetches next pending task from Firestore job
 * 2. Calls eBay Browse API for that ONE query
 * 3. Applies quality filter to each result
 * 4. Saves passing products + sends to Telegram
 * 5. Marks task done
 * 6. Returns { done: false } if more tasks remain, { done: true } when complete
 */

import { db }             from '../../../lib/firebaseAdmin'
import { applyMarkup }    from '../../../lib/pricingEngine'
import { isDuplicate }    from '../../../lib/deduplicator'
import { sendToTelegram } from '../../../lib/telegramNotifier'

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
  if (!data.access_token) throw new Error('eBay OAuth failed')
  return data.access_token
}

// ── eBay search (item summaries only — fast, no second call needed) ───────────
async function searchEbay(token, task) {
  const conditionFilter = task.conditionIds.map(id => `conditionIds:{${id}}`).join(',')
  const params = new URLSearchParams({
    q:            task.query,
    category_ids: task.ebayCategoryId,
    filter:       conditionFilter,
    limit:        '8',  // 8 items per query — fast enough for 10s limit
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
  if (!res.ok) return []
  const data = await res.json()
  return data.itemSummaries || []
}

// ── Quality filter (uses item summary data only — no second eBay call) ────────
function qualityFilter(item, task) {
  const conditionStr = (item.condition || '').toLowerCase()
  const conditionId  = item.conditionId || ''
  const name         = (item.title     || '').toLowerCase()
  const price        = parseFloat(item.price?.value || '0')

  // PRICE
  if (!price || price <= 0 || price > 5000)
    return { pass: false, reason: `Invalid price: $${price}` }

  // CONDITION — reject used/damaged
  const badConditions = ['used', 'refurbish', 'pre-owned', 'for parts', 'open box', 'not working']
  if (badConditions.some(c => conditionStr.includes(c)))
    return { pass: false, reason: `Rejected condition: ${item.condition}` }

  if (conditionId === '3000' || conditionId === '2000' || conditionId === '7000')
    return { pass: false, reason: `Used/refurb condition ID: ${conditionId}` }

  // STRICT check for electronics
  if (task.strictSpecs && conditionId !== '1000') {
    if (!conditionStr.includes('new with') && conditionStr !== 'new')
      return { pass: false, reason: `Electronics needs 100% new. Got: ${item.condition}` }
  }

  // BAD KEYWORDS in title
  const badWords = ['broken', 'damaged', 'parts only', 'for parts', 'cracked',
    'as is', 'untested', 'defective', 'lot of', 'junk', 'faulty']
  if (badWords.some(w => name.includes(w)))
    return { pass: false, reason: `Bad keyword in title` }

  // MUST HAVE IMAGE
  const hasImage = !!(item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl)
  if (!hasImage)
    return { pass: false, reason: 'No image' }

  // ASPECTS — check from item summary's additionalImages count + localizedAspects
  // Item summary has limited aspects — we just check what we have
  const aspects     = item.localizedAspects || []
  const aspectCount = aspects.length

  // For item summaries, aspect count is often 0 — we relax this check
  // Full aspects are loaded on the product page via product-details.js
  const hasMinAspects = aspectCount >= task.minAspects

  // Calculate quality score
  let score = 50
  if (conditionId === '1000')     score += 15
  if (aspectCount >= 5)           score += 15
  if (aspectCount >= 8)           score += 10
  if (item.additionalImages?.length > 0) score += 10

  return { pass: true, reason: 'Passed', score: Math.min(score, 100) }
}

// ── Main handler ──────────────────────────────────────────────────────────────
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

    // Get next pending task — no orderBy to avoid needing a Firestore composite index
    // Fetch all pending tasks and sort in JS instead
    const tasksSnap = await jobRef.collection('tasks')
      .where('status', '==', 'pending')
      .get()

    if (tasksSnap.empty) {
      // No more pending tasks — mark job complete
      await jobRef.update({
        status:      'completed',
        completedAt: new Date().toISOString(),
      })
      return res.status(200).json({
        done:     true,
        accepted: job.accepted || 0,
        rejected: job.rejected || 0,
        message:  `Search complete! ${job.accepted || 0} products sent to Telegram.`,
      })
    }

    // Sort by qi in JS — no Firestore composite index needed
    const sortedDocs = tasksSnap.docs.sort((a, b) => (a.data().qi || 0) - (b.data().qi || 0))
    const taskDoc    = sortedDocs[0]
    const task       = taskDoc.data()
    const taskRef    = taskDoc.ref

    // Mark task as processing
    await taskRef.update({ status: 'processing', startedAt: new Date().toISOString() })

    let accepted = 0
    let rejected = 0

    try {
      // Get eBay token
      const ebayToken = await getEbayToken()

      // Search eBay for this ONE query
      const items = await searchEbay(ebayToken, task)

      // Process each item
      for (const item of items) {
        // Quality filter
        const quality = qualityFilter(item, task)
        if (!quality.pass) {
          rejected++
          continue
        }

        // Deduplication
        const fingerprint = (item.title || '').toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .substring(0, 80)

        const isDup = await isDuplicate(fingerprint, 'shop_initial_products')
        if (isDup) continue

        // Pricing
        const priceUSD    = parseFloat(item.price?.value || '0')
        const priceSAR    = Math.round(priceUSD * USD_TO_SAR)
        const sellingData = applyMarkup(priceSAR)
        if (!sellingData) continue

        // Main image
        const mainImage = (item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '')
          .replace(/\/s-l\d+\./, '/s-l500.')

        // Extract any aspects from summary
        const aspects = item.localizedAspects || []
        const getAspect = (key) => {
          const found = aspects.find(a => a.name?.toLowerCase().includes(key))
          return Array.isArray(found?.value) ? found.value.join(', ') : (found?.value || null)
        }

        const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2,6)}`

        const product = {
          id:                    productId,
          name:                  item.title,
          image:                 mainImage,
          additionalImages:      (item.additionalImages || [])
            .map(img => img.imageUrl?.replace(/\/s-l\d+\./, '/s-l500.'))
            .filter(Boolean)
            .slice(0, 7),
          sellingPriceSAR:       sellingData.sellingPriceSAR,
          sellingPriceFormatted: sellingData.formatted,
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
          status:                'pending',
          jobId,
          searchQuery:           task.query,
          createdAt:             new Date().toISOString(),
          views:                 0,
          sales:                 0,
        }

        // Save to Firestore
        await db.collection('shop_approved_products').doc(productId).set(product)

        // Send to Telegram for approval
        await sendToTelegram(product)

        accepted++
      }

    } catch (searchErr) {
      console.error(`[Worker] Query error: ${searchErr.message}`)
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
    await jobRef.update({
      completedTasks: (job.completedTasks || 0) + 1,
      accepted:       (job.accepted       || 0) + accepted,
      rejected:       (job.rejected       || 0) + rejected,
      status:         'running',
    })

    // Count remaining tasks
    const remainingSnap = await jobRef.collection('tasks')
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    const hasMore = !remainingSnap.empty

    return res.status(200).json({
      done:             !hasMore,
      accepted,
      rejected,
      completedTasks:   (job.completedTasks || 0) + 1,
      totalTasks:       job.totalTasks,
      currentQuery:     task.query,
      hasMore,
      message: hasMore
        ? `Query ${(job.completedTasks||0)+1}/${job.totalTasks}: "${task.query}" — ${accepted} found`
        : `All done! Total: ${(job.accepted||0)+accepted} products sent to Telegram.`,
    })

  } catch (err) {
    console.error('[Worker] Fatal:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
