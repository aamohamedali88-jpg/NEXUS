/**
 * HUSIN ESHOP — POST /api/shop/trigger
 * Starts the full search cycle:
 * 1. Searches all 30 sources simultaneously (5 products × 30 = 150)
 * 2. Deduplicates against shop_initial_products in Firestore
 * 3. Applies your pricing rules automatically
 * 4. Saves everything to Firestore under shop_ collections
 * 5. Sends 150 products to your Telegram with approve/reject buttons
 * PRIVATE — requires x-shop-token header
 * Completely separate from all other website sections
 */

import { searchAllSources }     from '../../../lib/productSearchEngine'
import { applyPricingToAll }    from '../../../lib/pricingEngine'
import { loadExistingFingerprints,
         filterNewProducts,
         saveToInitialList }     from '../../../lib/deduplicator'
import { sendBatchToTelegram }  from '../../../lib/telegramNotifier'
import { db }                   from '../../../lib/firebaseAdmin'
import crypto                   from 'crypto'

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) return false
  if (token === process.env.ADMIN_SECRET) return true
  for (let i = 0; i <= 2; i++) {
    const window = Math.floor(Date.now() / 10000) - i
    const expected = crypto
      .createHmac('sha256', process.env.ADMIN_SECRET)
      .update(`husin_shop_${window}`)
      .digest('hex')
    if (token === expected) return true
  }
  return false
}

export default async function handler(req, res) {
  const token = req.headers['x-shop-token']
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sessionId   = `shop_session_${Date.now()}`
  const searchQuery = req.body?.searchQuery ||
    'best selling trending products Saudi Arabia 2025'

  // Respond immediately — heavy work runs after response
  res.status(200).json({
    success:   true,
    sessionId,
    message:   'Search cycle started. Results will arrive on your Telegram shortly.',
  })

  // ── Full cycle runs in background ─────────────────────────────────────────
  try {
    console.log(`[ShopTrigger] Session ${sessionId} started`)

    // Step 1: Search all 30 sources simultaneously
    const { products: rawProducts, sourceResults } =
      await searchAllSources(searchQuery)

    // Step 2: Deduplicate — uses shop_initial_products collection
    const existingFingerprints = await loadExistingFingerprints('shop_initial_products')
    const newProducts          = filterNewProducts(rawProducts, existingFingerprints)

    console.log(`[ShopTrigger] New unique products: ${newProducts.length}`)

    // Step 3: Apply your pricing rules
    const pricedProducts = applyPricingToAll(newProducts)
    const rankedProducts = pricedProducts.map((p, i) => ({ ...p, rank: i + 1 }))

    // Step 4: Save session to Firestore
    await db.collection('shop_search_sessions').doc(sessionId).set({
      sessionId,
      searchQuery,
      totalFound:  rankedProducts.length,
      viableCount: rankedProducts.filter(p => p.pricing?.isViable).length,
      sourceResults,
      status:      'pending_review',
      createdAt:   new Date().toISOString(),
    })

    // Step 5: Save each product as individual Firestore doc
    // This enables real-time approve/reject sync between Telegram and Dashboard
    const CHUNK = 400
    for (let i = 0; i < rankedProducts.length; i += CHUNK) {
      const batch = db.batch()
      rankedProducts.slice(i, i + CHUNK).forEach(p => {
        const ref = db
          .collection('shop_search_sessions').doc(sessionId)
          .collection('products').doc(p.id)
        batch.set(ref, { ...p, sessionId, decision: 'pending' })
      })
      await batch.commit()
    }

    // Step 6: Save to initial products list — prevents repeating in future cycles
    await saveToInitialList(rankedProducts, 'shop_initial_products')

    // Step 7: Send all products to your Telegram
    await sendBatchToTelegram(rankedProducts, sessionId, { searchQuery })

    // Mark session as sent
    await db.collection('shop_search_sessions').doc(sessionId).update({
      status:      'sent_to_telegram',
      completedAt: new Date().toISOString(),
    })

    console.log(`[ShopTrigger] Session ${sessionId} complete ✅`)

  } catch (error) {
    console.error(`[ShopTrigger] Error:`, error.message)
    try {
      await db.collection('shop_search_sessions').doc(sessionId)
        .update({ status: 'error', error: error.message })
    } catch (e) { /* ignore */ }
  }
}

export const config = {
  api: { responseLimit: false, externalResolver: true },
  maxDuration: 60,
}
