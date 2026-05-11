/**
 * HUSIN ESHOP — GET /api/shop/products
 * Returns products for a specific search session
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sessionId } = req.query
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' })
  }

  try {
    const snap = await db
      .collection('shop_search_sessions').doc(sessionId)
      .collection('products')
      .orderBy('rank', 'asc')
      .get()

    const products = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id:            d.id,
        rank:          d.rank,
        name:          d.name,
        image:         d.image || null,
        sourceId:      d.sourceId,
        sourceName:    d.sourceName,
        sourceFlag:    d.sourceFlag || '',
        sourceLink:    d.sourceLink,
        category:      d.category || 'general',
        specifications:d.specifications || null,
        pricing:       d.pricing || {},
        decision:      d.decision || 'pending',
        decidedAt:     d.decidedAt || null,
        decidedFrom:   d.decidedFrom || null,
      }
    })

    return res.status(200).json({ products, total: products.length })

  } catch (error) {
    console.error('[ShopProducts] Error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
