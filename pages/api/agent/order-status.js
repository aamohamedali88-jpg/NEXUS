/**
 * HUSIN ESHOP — GET /api/agent/order-status
 * Part 6: Autonomous Agent Endpoints (Future-Proofing)
 *
 * Read-only webhook for external automation (n8n, LangGraph, etc.) to look
 * up order status for customer-service use cases. No mutations are possible
 * through this endpoint — GET only, no write paths.
 *
 * Auth: x-agent-token header, checked against AGENT_API_SECRET if you set
 * one (recommended — lets you scope/rotate agent access separately from
 * ADMIN_SECRET), otherwise falls back to ADMIN_SECRET so this works with
 * zero extra config today.
 *
 * Lookup by orderId (preferred — orders are stored with the order ID as the
 * Firestore doc ID, so this is a direct O(1) read) or by customerEmail
 * (returns up to 10 most recent orders).
 */

import { db } from '../../../lib/firebaseAdmin'

const AGENT_SECRET = process.env.AGENT_API_SECRET || process.env.ADMIN_SECRET

function sanitize(d) {
  return {
    orderId:           d.orderId || d.husinsOrderId,
    productName:       d.productName,
    quantity:          d.quantity,
    selectedVariant:   d.selectedVariant || null,
    sellingPriceSAR:   d.sellingPriceSAR,
    shippingFeeSAR:    d.shippingFeeSAR,
    totalChargedSAR:   d.totalChargedSAR,
    paymentStatus:     d.paymentStatus,
    fulfillmentStatus: d.fulfillmentStatus,
    trackingNumber:    d.trackingNumber || null,
    trackingCarrier:   d.trackingCarrier || null,
    createdAt:         d.createdAt,
    paidAt:            d.paidAt || null,
    // Internal/financial fields intentionally excluded:
    // _sourceLink, _sourcePriceSAR, paypalCaptureId, netProfitSAR,
    // shippingAddress (PII — agents get status, not the address)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed — this endpoint is read-only' })

  if (!AGENT_SECRET) {
    return res.status(503).json({ error: 'Agent access not configured (no AGENT_API_SECRET or ADMIN_SECRET set)' })
  }

  const token = req.headers['x-agent-token']
  if (!token || token !== AGENT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { orderId, email } = req.query

  if (!orderId && !email) {
    return res.status(400).json({ error: 'orderId or email required' })
  }

  try {
    if (orderId) {
      const doc = await db.collection('shop_orders').doc(orderId).get()
      if (!doc.exists) {
        return res.status(404).json({ error: 'Order not found' })
      }
      return res.status(200).json({ order: sanitize(doc.data()) })
    }

    // Email lookup — most recent orders, same index as orders-by-customer.js
    const snap = await db.collection('shop_orders')
      .where('customerEmail', '==', email.toLowerCase().trim())
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    const orders = snap.docs.map(doc => sanitize(doc.data()))
    return res.status(200).json({ orders, count: orders.length })

  } catch (err) {
    console.error('[Agent/OrderStatus]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
