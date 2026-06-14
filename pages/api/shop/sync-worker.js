/**
 * HUSIN ESHOP — POST /api/shop/sync-worker
 * FREE PLAN COMPATIBLE — checks ONE product per call, fits in 10s
 *
 * REMOVAL TRIGGERS (product immediately set to status:'removed'):
 *   - eBay listing returns 404 or 410 (ended/deleted)
 *   - eBay listing has no buying options (sold/ended)
 *   - eBay listing condition changed to Used/Refurbished
 *   - eBay price spiked > 40% (listing replaced with different item)
 *   - New price no longer profitable after change
 *
 * PRICE UPDATE TRIGGERS:
 *   - Source price changed 15-40% → recalculate markup, update Firestore
 *
 * UNCHANGED:
 *   - Listing active, price stable → update lastSyncedAt only
 */

import { db }             from '../../../lib/firebaseAdmin'
import { calculatePrice } from '../../../lib/pricingEngine'

const EBAY_APP_ID            = process.env.EBAY_APP_ID
const EBAY_SECRET            = process.env.EBAY_SECRET
const BOT                    = process.env.TELEGRAM_BOT_TOKEN
const CHAT                   = process.env.TELEGRAM_CHAT_ID
const PRICE_UPDATE_THRESHOLD = 0.15  // 15% → update price
const PRICE_SPIKE_THRESHOLD  = 0.40  // 40% → remove product
const USD_TO_SAR             = 3.75

// ── eBay OAuth ────────────────────────────────────────────────────────────────
async function getEbayToken() {
  const creds = Buffer.from(`${EBAY_APP_ID}:${EBAY_SECRET}`).toString('base64')
  const res   = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method:  'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    signal:  AbortSignal.timeout(7000),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('eBay auth failed')
  return data.access_token
}

// ── Extract eBay item ID ──────────────────────────────────────────────────────
function extractEbayItemId(url) {
  if (!url) return null
  const m = url.match(/\/itm\/(?:[^/?]+\/)?(\d{10,13})/)
  return m ? m[1] : null
}

// ── Check eBay listing status ─────────────────────────────────────────────────
async function checkEbayListing(token, itemId) {
  try {
    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item/v1|${itemId}|0`,
      {
        headers: {
          'Authorization':           `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
        signal: AbortSignal.timeout(7000),
      }
    )

    if (res.status === 404 || res.status === 410)
      return { available: false, reason: `eBay listing ended (HTTP ${res.status})` }

    if (!res.ok)
      return { available: null, reason: `eBay API error ${res.status} — will retry next cycle` }

    const data = await res.json()

    // No buying options = listing ended
    if (!data.buyingOptions || data.buyingOptions.length === 0)
      return { available: false, reason: 'eBay listing has no buying options — ended or sold' }

    // Condition flipped to Used
    const conditionId = String(data.conditionId || '')
    const condition   = (data.condition || '').toLowerCase()
    if (['3000','2000','7000'].includes(conditionId) ||
        condition.includes('used') || condition.includes('refurb') || condition.includes('pre-owned'))
      return { available: false, reason: `Condition changed to: ${data.condition}` }

    const priceUSD = parseFloat(data.price?.value || '0')
    if (!priceUSD || priceUSD <= 0)
      return { available: false, reason: 'No valid price on eBay listing' }

    return { available: true, priceUSD, condition: data.condition, title: data.title }

  } catch (err) {
    return { available: null, reason: `Network error — skipping: ${err.message}` }
  }
}

// ── Remove product from shop ──────────────────────────────────────────────────
async function removeProduct(productId, reason) {
  await db.collection('shop_approved_products').doc(productId).update({
    status:        'removed',
    removedAt:     new Date().toISOString(),
    removedReason: reason,
  })
  console.log(`[SyncWorker] REMOVED ${productId}: ${reason}`)
}

// ── Telegram notification ─────────────────────────────────────────────────────
async function notify(text) {
  if (!BOT || !CHAT) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: CHAT, text }),
      signal:  AbortSignal.timeout(5000),
    })
  } catch (e) { /* ignore */ }
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const authToken = req.headers['x-shop-token'] || req.headers['x-cron-secret']
  if (authToken !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' })

  const { jobId } = req.body
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  try {
    const jobRef = db.collection('shop_sync_jobs').doc(jobId)
    const jobDoc = await jobRef.get()
    if (!jobDoc.exists) return res.status(404).json({ error: 'Sync job not found' })

    const job = jobDoc.data()

    if (job.status === 'completed')
      return res.status(200).json({ done: true, message: 'Already completed' })

    // Get next pending task — sort in JS, no Firestore index needed
    const snap   = await jobRef.collection('tasks').where('status','==','pending').get()
    if (snap.empty) {
      await jobRef.update({ status:'completed', completedAt: new Date().toISOString() })
      return res.status(200).json({
        done:           true,
        removedCount:   job.removedCount   || 0,
        updatedCount:   job.updatedCount   || 0,
        unchangedCount: job.unchangedCount || 0,
        message:        `Sync complete — ${job.removedCount||0} removed, ${job.updatedCount||0} updated, ${job.unchangedCount||0} unchanged`,
      })
    }

    const sorted  = snap.docs.sort((a,b) => (a.data().qi||0) - (b.data().qi||0))
    const taskDoc = sorted[0]
    const task    = taskDoc.data()
    const taskRef = taskDoc.ref

    await taskRef.update({ status:'processing', startedAt: new Date().toISOString() })

    let result = 'unchanged'
    let detail = ''

    try {
      const productRef  = db.collection('shop_approved_products').doc(task.productId)
      const productSnap = await productRef.get()

      if (!productSnap.exists || productSnap.data().status !== 'live') {
        result = 'skipped'
        detail = 'Not live — skipped'

      } else {
        const product    = productSnap.data()
        const sourceLink = product._sourceLink || task.sourceLink || ''
        const ebayItemId = extractEbayItemId(sourceLink)

        if (!ebayItemId) {
          result = 'skipped'
          detail = 'No eBay item ID'

        } else {
          const ebayToken = await getEbayToken()
          const check     = await checkEbayListing(ebayToken, ebayItemId)

          if (check.available === null) {
            // Network issue — skip, try next cycle
            result = 'skipped'
            detail = check.reason

          } else if (!check.available) {
            // ── REMOVE FROM SHOP ──────────────────────────────────────────
            await removeProduct(task.productId, check.reason)
            await notify([
              `🗑️ PRODUCT REMOVED FROM SHOP`,
              ``,
              `📦 ${task.productName?.substring(0,70)}`,
              `❌ ${check.reason}`,
              ``,
              `Automatically removed from marketplace.`,
            ].join('\n'))
            result = 'removed'
            detail = check.reason

          } else {
            // ── LISTING ACTIVE — check price ──────────────────────────────
            const oldSAR   = product._sourcePriceSAR || task.sourcePriceSAR || 0
            const newSAR   = Math.round(check.priceUSD * USD_TO_SAR)
            const changePct = oldSAR > 0 ? Math.abs(newSAR - oldSAR) / oldSAR : 0

            if (changePct > PRICE_SPIKE_THRESHOLD) {
              // Price spiked > 40% — remove product (likely different item)
              const reason = `Price spiked ${Math.round(changePct*100)}%: ${oldSAR}→${newSAR} SAR`
              await removeProduct(task.productId, reason)
              await notify([
                `🗑️ PRODUCT REMOVED — Price spike`,
                `📦 ${task.productName?.substring(0,60)}`,
                `📈 ${oldSAR} SAR → ${newSAR} SAR (+${Math.round(changePct*100)}%)`,
              ].join('\n'))
              result = 'removed'
              detail = reason

            } else if (changePct > PRICE_UPDATE_THRESHOLD) {
              // Price changed 15-40% — recalculate markup
              const newPricing = calculatePrice(check.priceUSD, 'USD')

              if (!newPricing.isViable) {
                const reason = `Price change — no longer viable at ${newSAR} SAR source cost`
                await removeProduct(task.productId, reason)
                await notify([
                  `🗑️ PRODUCT REMOVED — Not viable`,
                  `📦 ${task.productName?.substring(0,60)}`,
                  `💸 Source: ${newSAR} SAR — margin too low`,
                ].join('\n'))
                result = 'removed'
                detail = reason

              } else {
                const oldSell = product.sellingPriceSAR || 0
                const newSell = newPricing.sellingPriceSAR
                await productRef.update({
                  sellingPriceSAR:       newSell,
                  sellingPriceFormatted: newPricing.sellingPriceFormatted,
                  _sourcePriceSAR:       newSAR,
                  pricing: {
                    sellingPriceSAR:       newSell,
                    sellingPriceFormatted: newPricing.sellingPriceFormatted,
                    sourcePriceSAR:        newSAR,
                    profitSAR:             newPricing.profitSAR,
                  },
                  lastSyncedAt:   new Date().toISOString(),
                  lastSyncResult: 'price_updated',
                })
                await notify([
                  `${newSell > oldSell ? '📈' : '📉'} PRICE UPDATED`,
                  `📦 ${task.productName?.substring(0,60)}`,
                  `${oldSell.toLocaleString('en-SA')} → ${newSell.toLocaleString('en-SA')} SAR`,
                ].join('\n'))
                result = 'price_updated'
                detail = `${oldSell}→${newSell} SAR`
                console.log(`[SyncWorker] PRICE UPDATE: ${task.productName?.substring(0,30)} — ${detail}`)
              }

            } else {
              // Unchanged — just update lastSyncedAt
              await productRef.update({
                lastSyncedAt:   new Date().toISOString(),
                lastSyncResult: 'unchanged',
              })
              result = 'unchanged'
              detail = `Stable (${Math.round(changePct*100)}% change)`
            }
          }
        }
      }

    } catch (taskErr) {
      console.error(`[SyncWorker] Task error ${task.productId}: ${taskErr.message}`)
      result = 'failed'
      detail = taskErr.message
    }

    // Mark task done
    await taskRef.update({ status:'done', result, detail, completedAt: new Date().toISOString() })

    // Update job counters
    const newCompleted = (job.completedTasks || 0) + 1
    const jobUpdate    = { completedTasks: newCompleted, status:'running', lastUpdatedAt: new Date().toISOString() }
    if (result === 'removed')       jobUpdate.removedCount   = (job.removedCount   || 0) + 1
    if (result === 'price_updated') jobUpdate.updatedCount   = (job.updatedCount   || 0) + 1
    if (result === 'unchanged')     jobUpdate.unchangedCount = (job.unchangedCount || 0) + 1
    if (result === 'failed')        jobUpdate.failedCount    = (job.failedCount    || 0) + 1
    if (result === 'skipped')       jobUpdate.skippedCount   = (job.skippedCount   || 0) + 1
    await jobRef.update(jobUpdate)

    // Check remaining
    const remSnap = await jobRef.collection('tasks').where('status','==','pending').limit(1).get()
    const hasMore = !remSnap.empty

    if (!hasMore) {
      const finalJob = (await jobRef.get()).data()
      await jobRef.update({ status:'completed', completedAt: new Date().toISOString() })
      await notify([
        `✅ SYNC COMPLETE`,
        `📊 ${job.totalTasks} products checked`,
        `🗑️ Removed: ${finalJob.removedCount||0}`,
        `💰 Price updated: ${finalJob.updatedCount||0}`,
        `✅ Unchanged: ${finalJob.unchangedCount||0}`,
        `⏭️ Skipped: ${finalJob.skippedCount||0}`,
        `❌ Errors: ${finalJob.failedCount||0}`,
      ].join('\n'))
    }

    return res.status(200).json({
      done:           !hasMore,
      result,
      detail,
      completedTasks: newCompleted,
      totalTasks:     job.totalTasks,
      productName:    task.productName,
      message: hasMore
        ? `${newCompleted}/${job.totalTasks}: "${task.productName?.substring(0,30)}" — ${result}`
        : `Sync complete ✅`,
    })

  } catch (err) {
    console.error('[SyncWorker] Fatal:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
