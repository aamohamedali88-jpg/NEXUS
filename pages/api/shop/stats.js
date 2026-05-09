/**
 * HUSIN ESHOP — GET /api/shop/stats
 * Returns live counts from Firestore for the owner dashboard
 * PRIVATE — requires x-shop-token header
 * Completely separate from all other website sections
 */

import { db } from '../../../lib/firebaseAdmin'
import crypto from 'crypto'

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) return false
  // Accept raw ADMIN_SECRET or valid HMAC token
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

  try {
    const [approvedSnap, rejectedSnap, pendingSnap, totalSnap, ordersSnap] =
      await Promise.all([
        db.collection('shop_approved_products').where('status', '==', 'live').count().get(),
        db.collection('shop_rejected_products').count().get(),
        db.collection('shop_search_sessions').where('status', '==', 'pending_review').count().get(),
        db.collection('shop_initial_products').count().get(),
        db.collection('shop_orders').count().get(),
      ])

    // Calculate revenue from paid orders
    let revenue = 0
    try {
      const paidSnap = await db.collection('shop_orders')
        .where('paymentStatus', '==', 'paid').get()
      paidSnap.docs.forEach(doc => { revenue += doc.data().amount || 0 })
    } catch (e) { /* shop_orders may not exist yet on first run */ }

    return res.status(200).json({
      approved: approvedSnap.data().count,
      rejected: rejectedSnap.data().count,
      pending:  pendingSnap.data().count,
      total:    totalSnap.data().count,
      orders:   ordersSnap.data().count,
      revenue:  parseFloat(revenue.toFixed(2)),
    })

  } catch (error) {
    console.error('[ShopStats] Error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
