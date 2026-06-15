/**
 * HUSIN ESHOP — POST /api/shop/sync-worker
 * Phase 1 Production Hardening — Inventory Sync Executor
 *
 * Processes ONE product per call — free-plan Vercel compatible (<10s)
 * EBAY_APP_ID and EBAY_SECRET read from process.env — no GitHub Actions injection needed
 *
 * Removal triggers (immediate status:'removed' with no manual confirmation):
 *   - eBay responds 404 or 410
 *   - buyingOptions array is empty or absent
 *   - conditionId in [2000, 3000, 7000] (used/refurb/parts)
 *   - condition string contains 'used', 'refurb', 'pre-owned'
 *   - price returns 0 or invalid
 *   - price spike > 40% (listing likely replaced with different item)
 *   - new price not viable (profitSAR < 1 from pricingEngine)
 *
 * Price update trigger: source price drift 15–40%
 * Unchanged: drift < 15% → only lastSyncedAt updated
 *
 * Returns { done: true } when no pending tasks remain for this jobId
 */

import { db }            from '../../../lib/firebaseAdmin'
import { calculatePrice } from '../../../lib/pricingEngine'

// ── Constants ─────────────────────────────────────────────────────────────────
const USD_TO_SAR             = 3.75
const PRICE_UPDATE_THRESHOLD = 0.15   // 15% drift  → recalculate markup
const PRICE_SPIKE_THRESHOLD  = 0.40   // 40% spike  → remove product

// ── eBay OAuth — reads credentials from process.env directly ─────────────────
async function getEbayToken() {
  const appId  = process.env.EBAY_APP_ID
  const secret = process.env.EBAY_SECRET

  if (!appId || !secret)
    throw new Error('EBAY_APP_ID or EBAY_SECRET env vars not set on Vercel')

  const creds = Buffer.from(`${appId}:${secret}`).toString('base64')
  const res   = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body:    'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    signal:  AbortSignal.timeout(7000),
  })

  const data = await res.json()
  if (!data.access_token)
    throw new Error(`eBay OAuth failed: ${data.error_description || JSON.stringify(data)}`)

  return data.access_token
}

// ── Extract eBay item ID from source URL ──────────────────────────────────────
function extractEbayItemId(url) {
  if (!url) return null
  // Handles /itm/123456789 and /itm/Item-Title/123456789
  const match = url.match(/\/itm\/(?:[^/?#]+\/)?(\d{10,13})/)
  return match ? match[1] : null
}

// ── Check single eBay listing ─────────────────────────────────────────────────
// Returns:
//   { available: true,  priceUSD: number, condition: string }
//   { available: false, reason: string }
//   { available: null,  reason: string }  ← network error, skip this cycle
async function checkEbayListing(token, itemId) {
  try {
    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item/v1|${itemId}|0`,
      {
        headers: {
          'Authorization':           `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Content-Type':            'application/json',
        },
        signal: AbortSignal.timeout(7000),
      }
    )

    // Definitive unavailability
    if (res.status === 404 || res.status === 410)
      return { available: false, reason: `eBay listing ended — HTTP ${res.status}` }

    // Other server errors — skip, do not remove (could be temporary)
    if (!res.ok)
      return { available: null, reason: `eBay API error ${res.status} — will retry next sync cycle` }

    const data = await res.json()

    // No buying options = listing ended or sold out
    if (!data.buyingOptions || data.buyingOptions.length === 0)
      return { available: false, reason: 'eBay listing has no buying options — ended or sold' }

    // Condition degraded to used/refurbished
    const conditionId  = String(data.conditionId || '')
    const conditionStr = (data.condition || '').toLowerCase()
    const isUsed = (
      ['2000', '3000', '7000'].includes(conditionId) ||
      conditionStr.includes('used')      ||
      conditionStr.includes('refurb')    ||
      conditionStr.includes('pre-owned') ||
      conditionStr.includes('for parts')
    )
    if (isUsed)
      return { available: false, reason: `Condition changed to: "${data.condition}"` }

    // Invalid price
    const priceUSD = parseFloat(data.price?.value || '0')
    if (!priceUSD || priceUSD <= 0)
      return { available: false, reason: 'No valid price returned by eBay' }

    return {
      available:  true,
      priceUSD,
      condition:  data.condition || 'New',
      title:      data.title || '',
    }

  } catch (err) {
    // Network error or timeout — do NOT remove product, skip this cycle
    return { available: null, reason: `Network error (will retry next cycle): ${err.message}` }
  }
}

// ── Immediately remove product from marketplace ───────────────────────────────
async function removeProduct(productId, reason) {
  await db.collection('shop_approved_products').doc(productId).update({
    status:        'removed',
    removedAt:     new Date().toISOString(),
    removedReason: reason,
    lastSyncedAt:  new Date().toISOString(),
    lastSyncResult:'removed',
  })
  console.log(`[SyncWorker] ❌ REMOVED ${productId}: ${reason}`)
}

// ── Telegram alert (non-blocking, fire-and-forget) ────────────────────────────
function sendTelegramAlert(text) {
  const BOT  = process.env.TELEGRAM_BOT_TOKEN
  const CHAT = process.env.TELEGRAM_CHAT_ID
  if (!BOT || !CHAT) return

  fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: CHAT, text }),
    signal:  AbortSignal.timeout(5000),
  }).catch(e => console.log('[SyncWorker] Telegram alert failed:', e.message))
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const incomingToken = req.headers['x-shop-token'] || req.headers['x-cron-secret']
  if (!incomingToken || incomingToken !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' })

  const { jobId } = req.body
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  try {
    const jobRef = db.collection('shop_sync_jobs').doc(jobId)
    const jobDoc = await jobRef.get()

    if (!jobDoc.exists)
      return res.status(404).json({ error: `Sync job not found: ${jobId}` })

    const job = jobDoc.data()

    // Already done — return immediately so GitHub Actions loop terminates
    if (job.status === 'completed') {
      return res.status(200).json({
        done:           true,
        removedCount:   job.removedCount   || 0,
        updatedCount:   job.updatedCount   || 0,
        unchangedCount: job.unchangedCount || 0,
        skippedCount:   job.skippedCount   || 0,
        failedCount:    job.failedCount    || 0,
        message:        `Sync already completed — ${job.removedCount||0} removed, ${job.updatedCount||0} updated`,
      })
    }

    // ── Atomically fetch next pending task (sort by qi in JS — no composite index) ──
    const pendingSnap = await jobRef
      .collection('tasks')
      .where('status', '==', 'pending')
      .get()

    // No pending tasks — job is complete
    if (pendingSnap.empty) {
      const finalJob = (await jobRef.get()).data()
      await jobRef.update({ status: 'completed', completedAt: new Date().toISOString() })

      // Final summary to Telegram
      sendTelegramAlert([
        `✅ INVENTORY SYNC COMPLETE`,
        ``,
        `📦 Total checked: ${finalJob.totalTasks || job.totalTasks}`,
        `🗑️  Removed:       ${finalJob.removedCount   || 0}`,
        `💰 Price updated: ${finalJob.updatedCount   || 0}`,
        `✅ Unchanged:     ${finalJob.unchangedCount || 0}`,
        `⏭️  Skipped:       ${finalJob.skippedCount  || 0}`,
        `❌ Errors:        ${finalJob.failedCount    || 0}`,
        ``,
        `🕐 ${new Date().toLocaleString('en-SA', { timeZone: 'Asia/Riyadh' })}`,
      ].join('\n'))

      return res.status(200).json({
        done:           true,
        removedCount:   finalJob.removedCount   || 0,
        updatedCount:   finalJob.updatedCount   || 0,
        unchangedCount: finalJob.unchangedCount || 0,
        skippedCount:   finalJob.skippedCount   || 0,
        failedCount:    finalJob.failedCount    || 0,
        message:        `Sync complete ✅ — ${finalJob.removedCount||0} removed, ${finalJob.updatedCount||0} updated`,
      })
    }

    // Pick task with lowest qi (FIFO order)
    const sorted  = pendingSnap.docs.sort((a, b) => (a.data().qi || 0) - (b.data().qi || 0))
    const taskDoc = sorted[0]
    const task    = taskDoc.data()
    const taskRef = taskDoc.ref

    // Mark as processing to prevent double-processing on concurrent calls
    await taskRef.update({ status: 'processing', startedAt: new Date().toISOString() })

    let result = 'unchanged'
    let detail = ''

    try {
      // ── Confirm product is still live in Firestore ────────────────────────
      const productRef  = db.collection('shop_approved_products').doc(task.productId)
      const productSnap = await productRef.get()

      if (!productSnap.exists || productSnap.data().status !== 'live') {
        result = 'skipped'
        detail = 'Product no longer live in Firestore'

      } else {
        const product    = productSnap.data()
        const sourceLink = product._sourceLink || task.sourceLink || ''
        const ebayItemId = extractEbayItemId(sourceLink)

        if (!ebayItemId) {
          result = 'skipped'
          detail = 'No eBay item ID extractable from source link'

        } else {
          // ── Call eBay API ─────────────────────────────────────────────────
          const ebayToken = await getEbayToken()
          const check     = await checkEbayListing(ebayToken, ebayItemId)

          // ── Network error — skip without removing ────────────────────────
          if (check.available === null) {
            result = 'skipped'
            detail = check.reason

          // ── LISTING UNAVAILABLE — REMOVE IMMEDIATELY ─────────────────────
          } else if (!check.available) {
            await removeProduct(task.productId, check.reason)

            sendTelegramAlert([
              `🗑️ PRODUCT AUTO-REMOVED`,
              ``,
              `📦 ${task.productName}`,
              `❌ ${check.reason}`,
              ``,
              `Removed from marketplace automatically.`,
            ].join('\n'))

            result = 'removed'
            detail = check.reason

          // ── LISTING ACTIVE — evaluate price drift ─────────────────────────
          } else {
            const oldSourceSAR = product._sourcePriceSAR || task.sourcePriceSAR || 0
            const newSourceSAR = parseFloat((check.priceUSD * USD_TO_SAR).toFixed(2))
            const changePct    = oldSourceSAR > 0
              ? Math.abs(newSourceSAR - oldSourceSAR) / oldSourceSAR
              : 0

            if (changePct > PRICE_SPIKE_THRESHOLD) {
              // ── PRICE SPIKE > 40% — likely different item on same URL ────
              const reason = `Price spiked ${Math.round(changePct * 100)}%: ${oldSourceSAR} → ${newSourceSAR} SAR`
              await removeProduct(task.productId, reason)

              sendTelegramAlert([
                `🗑️ PRODUCT REMOVED — Price spike detected`,
                ``,
                `📦 ${task.productName}`,
                `📈 ${Math.round(changePct * 100)}% increase: ${oldSourceSAR} → ${newSourceSAR} SAR`,
                `❌ Possible listing replacement — removed for safety.`,
              ].join('\n'))

              result = 'removed'
              detail = reason

            } else if (changePct > PRICE_UPDATE_THRESHOLD) {
              // ── PRICE DRIFT 15–40% — recalculate using pricingEngine ─────
              const newPricing = calculatePrice(check.priceUSD, 'USD')

              if (!newPricing.isViable) {
                // Not profitable anymore — remove product
                const reason = `Price change → no longer viable: source ${newSourceSAR} SAR, profit ${newPricing.profitSAR} SAR`
                await removeProduct(task.productId, reason)

                sendTelegramAlert([
                  `🗑️ PRODUCT REMOVED — No longer profitable`,
                  ``,
                  `📦 ${task.productName}`,
                  `💸 Source cost: ${newSourceSAR} SAR — ${newPricing.viabilityNote}`,
                ].join('\n'))

                result = 'removed'
                detail = reason

              } else {
                // Still profitable — update selling price
                const oldSell = product.sellingPriceSAR || task.sellingPriceSAR || 0
                const newSell = newPricing.sellingPriceSAR
                const dir     = newSell > oldSell ? '📈' : '📉'

                await productRef.update({
                  sellingPriceSAR:       newSell,
                  sellingPriceFormatted: newPricing.sellingPriceFormatted,
                  _sourcePriceSAR:       newSourceSAR,
                  pricing: {
                    sellingPriceSAR:       newSell,
                    sellingPriceFormatted: newPricing.sellingPriceFormatted,
                    sourcePriceSAR:        newSourceSAR,
                    profitSAR:             newPricing.profitSAR,
                    profitUSD:             newPricing.profitUSD,
                    marginPercent:         newPricing.marginPercent,
                    isViable:              true,
                  },
                  lastSyncedAt:   new Date().toISOString(),
                  lastSyncResult: 'price_updated',
                })

                sendTelegramAlert([
                  `${dir} PRICE UPDATED — ${Math.round(changePct * 100)}% drift`,
                  ``,
                  `📦 ${task.productName}`,
                  `Old: ${oldSell.toLocaleString('en-SA')} SAR → New: ${newSell.toLocaleString('en-SA')} SAR`,
                  `Source: ${oldSourceSAR} SAR → ${newSourceSAR} SAR`,
                  `Profit: ${newPricing.profitSAR} SAR (${newPricing.marginPercent}% margin)`,
                ].join('\n'))

                result = 'price_updated'
                detail = `${oldSell} → ${newSell} SAR (${Math.round(changePct * 100)}% drift)`
                console.log(`[SyncWorker] 💰 PRICE UPDATE: ${task.productName?.substring(0, 40)} — ${detail}`)
              }

            } else {
              // ── STABLE — only update sync timestamp ──────────────────────
              await productRef.update({
                lastSyncedAt:   new Date().toISOString(),
                lastSyncResult: 'unchanged',
              })
              result = 'unchanged'
              detail = `Price stable (${Math.round(changePct * 100)}% drift — below 15% threshold)`
            }
          }
        }
      }

    } catch (taskErr) {
      console.error(`[SyncWorker] Task error for ${task.productId}: ${taskErr.message}`)
      result = 'failed'
      detail = taskErr.message
    }

    // ── Mark task complete ────────────────────────────────────────────────────
    await taskRef.update({
      status:      'done',
      result,
      detail,
      completedAt: new Date().toISOString(),
    })

    // ── Increment job counters ────────────────────────────────────────────────
    const newCompleted = (job.completedTasks || 0) + 1
    const counterUpdate = {
      completedTasks: newCompleted,
      status:         'running',
      lastUpdatedAt:  new Date().toISOString(),
    }

    if (result === 'removed')       counterUpdate.removedCount   = (job.removedCount   || 0) + 1
    if (result === 'price_updated') counterUpdate.updatedCount   = (job.updatedCount   || 0) + 1
    if (result === 'unchanged')     counterUpdate.unchangedCount = (job.unchangedCount || 0) + 1
    if (result === 'failed')        counterUpdate.failedCount    = (job.failedCount    || 0) + 1
    if (result === 'skipped')       counterUpdate.skippedCount   = (job.skippedCount   || 0) + 1

    await jobRef.update(counterUpdate)

    // ── Check for remaining pending tasks (one-doc probe) ─────────────────────
    const remainingSnap = await jobRef
      .collection('tasks')
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    const hasMore = !remainingSnap.empty
    if (!hasMore) {
      // Will be finalized on next call when pendingSnap.empty is true
      // This avoids double-writing the completion summary
    }

    return res.status(200).json({
      done:           !hasMore,
      result,
      detail,
      completedTasks: newCompleted,
      totalTasks:     job.totalTasks,
      productName:    task.productName,
      message: !hasMore
        ? `Final task done — ${task.productName?.substring(0, 35)} (${result}). Sending summary...`
        : `${newCompleted}/${job.totalTasks}: "${task.productName?.substring(0, 35)}" — ${result}`,
    })

  } catch (err) {
    console.error('[SyncWorker] Fatal error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
