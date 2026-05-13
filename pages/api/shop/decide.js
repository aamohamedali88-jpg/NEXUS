/**
 * HUSIN ESHOP — POST /api/shop/decide
 * FIXED: Accepts raw ADMIN_SECRET as token
 */

import { db } from '../../../lib/firebaseAdmin'

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) return false
  return token === process.env.ADMIN_SECRET
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

    // Already decided — return current state
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
      // Publish to live marketplace
      // Source details stored with _ prefix — NEVER exposed publicly
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
        _sourceLink:           product.sourceLink,
        _sourcePriceSAR:       product.pricing?.sourcePriceSAR,
        _profitSAR:            product.pricing?.profitSAR,
        approvedAt:            new Date().toISOString(),
        status:                'live',
        views:                 0,
        sales:                 0,
      })
    } else {
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
    console.error('[ShopDecide]', error.message)
    return res.status(500).json({ error: error.message })
  }
}
