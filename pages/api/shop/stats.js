/**
 * HUSIN ESHOP — GET /api/shop/stats
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

  try {
    const [approvedSnap, rejectedSnap, pendingSnap, totalSnap, ordersSnap] =
      await Promise.all([
        db.collection('shop_approved_products').where('status', '==', 'live').count().get(),
        db.collection('shop_rejected_products').count().get(),
        db.collection('shop_search_sessions').where('status', '==', 'pending_review').count().get(),
        db.collection('shop_initial_products').count().get(),
        db.collection('shop_orders').count().get().catch(() => ({ data: () => ({ count: 0 }) })),
      ])

    let revenue = 0
    try {
      const paidSnap = await db.collection('shop_orders')
        .where('paymentStatus', '==', 'paid').get()
      paidSnap.docs.forEach(doc => { revenue += doc.data().amount || 0 })
    } catch (e) { /* shop_orders may not exist yet */ }

    return res.status(200).json({
      approved: approvedSnap.data().count,
      rejected: rejectedSnap.data().count,
      pending:  pendingSnap.data().count,
      total:    totalSnap.data().count,
      orders:   ordersSnap.data().count,
      revenue:  parseFloat(revenue.toFixed(2)),
    })

  } catch (error) {
    console.error('[ShopStats]', error.message)
    return res.status(500).json({ error: error.message })
  }
}
