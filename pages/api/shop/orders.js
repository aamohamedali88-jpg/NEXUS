/**
 * HUSIN ESHOP — /api/shop/orders
 * GET  — returns all orders for owner dashboard
 * PATCH — updates fulfillment status of an order
 * PRIVATE — requires x-shop-token header
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

  // ── GET — return all orders ────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const snap = await db.collection('shop_orders')
        .where('paymentStatus', '==', 'paid')
        .limit(200)
        .get()

      const orders = snap.docs.map(doc => {
        const d = doc.data()
        return {
          orderId:           d.orderId,
          productId:         d.productId,
          productName:       d.productName,
          sellingPriceSAR:   d.sellingPriceSAR   || 0,
          priceUSD:          d.priceUSD           || 0,
          profitSAR:         d.profitSAR          || null,
          paymentStatus:     d.paymentStatus,
          fulfillmentStatus: d.fulfillmentStatus  || 'pending',
          customerName:      d.customerName       || '',
          customerEmail:     d.customerEmail      || '',
          shippingAddress:   d.shippingAddress    || '',
          sourceLink:        d._sourceLink        || null,
          paidAt:            d.paidAt             || '',
          createdAt:         d.createdAt          || '',
        }
      })

      // Sort by newest first
      orders.sort((a, b) => (b.paidAt > a.paidAt ? 1 : -1))

      return res.status(200).json({ orders, total: orders.length })

    } catch (error) {
      console.error('[Orders GET]', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  // ── PATCH — update fulfillment status ──────────────────────────────────────
  if (req.method === 'PATCH') {
    const { orderId, fulfillmentStatus } = req.body

    const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled']
    if (!orderId || !validStatuses.includes(fulfillmentStatus)) {
      return res.status(400).json({ error: 'orderId and valid fulfillmentStatus required' })
    }

    try {
      await db.collection('shop_orders').doc(orderId).update({
        fulfillmentStatus,
        updatedAt: new Date().toISOString(),
      })

      // Notify owner on Telegram if shipped
      if (fulfillmentStatus === 'shipped') {
        const orderSnap = await db.collection('shop_orders').doc(orderId).get()
        const order     = orderSnap.data()
        const BOT  = process.env.TELEGRAM_BOT_TOKEN
        const CHAT = process.env.TELEGRAM_CHAT_ID
        if (BOT && CHAT && order) {
          try {
            await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                chat_id: CHAT,
                text:    `🚚 Order shipped!\n\nOrder: ${orderId}\nProduct: ${order.productName}\nCustomer: ${order.customerName || 'Unknown'}\nEmail: ${order.customerEmail || 'N/A'}`,
              }),
            })
          } catch (e) { /* ignore */ }
        }
      }

      return res.status(200).json({ success: true, orderId, fulfillmentStatus })

    } catch (error) {
      console.error('[Orders PATCH]', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
