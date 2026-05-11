/**
 * HUSIN ESHOP — POST /api/shop/decide
 * Approve or reject a product from the dashboard inbox
 * Syncs instantly — if decided here, Telegram buttons freeze too
 * PRIVATE — requires x-shop-token header
 */

import { db } from '../../../lib/firebaseAdmin'
import crypto from 'crypto'

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

  const { productId, sessionId, decision } = req.body

  if (!productId || !sessionId || !['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({
      error: 'productId, sessionId and decision (approved/rejected) are required'
    })
  }

  try {
    const productRef = db
      .collection('shop_search_sessions').doc(sessionId)
      .collection('products').doc(productId)

    const productSnap = await productRef.get()
    if (!productSnap.exists) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const product = productSnap.data()

    // Already decided — return current state without error
    if (product.decision !== 'pending') {
      return res.status(200).json({
        success:        true,
        alreadyDecided: true,
        decision:       product.decision,
      })
    }

    // Write decision
    await productRef.update({
      decision,
      decidedAt:   new Date().toISOString(),
      decidedFrom: 'dashboard',
    })

    if (decision === 'approved') {
      // ── Publish to live marketplace ────────────────────────────────────────
      // Source details stored with _ prefix — NEVER exposed to public
      await db.collection('shop_approved_products').doc(productId).set({
        id:                    productId,
        sessionId,
        name:                  product.name,
        image:                 product.image || null,
        sellingPriceSAR:       product.pricing?.sellingPriceSAR,
        sellingPriceFormatted: product.pricing?.sellingPriceFormatted,
        category:              product.category || 'general',
        specifications:        product.specifications || null,
        sourceId:              product.sourceId,
        sourceName:            product.sourceName,
        _sourceLink:           product.sourceLink,           // HIDDEN FROM PUBLIC
        _sourcePriceSAR:       product.pricing?.sourcePriceSAR, // HIDDEN
        _profitSAR:            product.pricing?.profitSAR,      // HIDDEN
        approvedAt:            new Date().toISOString(),
        status:                'live',
        views:                 0,
        sales:                 0,
      })
    } else {
      // ── Save to rejected list ──────────────────────────────────────────────
      await db.collection('shop_rejected_products').doc(productId).set({
        id:         productId,
        sessionId,
        name:       product.name,
        sourceId:   product.sourceId,
        sourceName: product.sourceName,
        rejectedAt: new Date().toISOString(),
      })
    }

    return res.status(200).json({ success: true, productId, decision })

  } catch (error) {
    console.error('[ShopDecide] Error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
