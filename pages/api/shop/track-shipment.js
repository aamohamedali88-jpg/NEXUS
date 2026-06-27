import { db } from '../../../lib/firebaseAdmin'

const EBAY_APP_ID = process.env.EBAY_APP_ID
const EBAY_SECRET = process.env.EBAY_SECRET

let cachedToken    = null
let cachedTokenExp = 0

async function getEbayToken() {
  if (cachedToken && Date.now() < cachedTokenExp) return cachedToken

  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${EBAY_APP_ID}:${EBAY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  })

  const data = await res.json()
  if (!data.access_token) throw new Error('eBay OAuth failed: ' + JSON.stringify(data))

  cachedToken    = data.access_token
  cachedTokenExp = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

/**
 * Polls eBay order/shipping fulfillment status for a single HUSIN order
 * that has an attached eBay source order reference. Once eBay returns a
 * tracking number, writes it back to the order doc.
 *
 * Requires: order doc must have an `ebaySourceOrderId` field, set manually
 * by the owner when they complete the manual one-tap fulfillment step
 * (i.e. after they've actually placed the order on eBay).
 */
async function pollSingleOrder(orderDoc) {
  const order = orderDoc.data()

  if (!order.ebaySourceOrderId) {
    return { orderId: order.orderId, status: 'skipped', reason: 'No eBay source order ID attached yet' }
  }

  if (order.trackingNumber) {
    return { orderId: order.orderId, status: 'already_tracked' }
  }

  try {
    const token = await getEbayToken()
    const res = await fetch(
      `https://api.ebay.com/sell/fulfillment/v1/order/${order.ebaySourceOrderId}/shipping_fulfillment`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    )

    if (!res.ok) {
      return { orderId: order.orderId, status: 'pending', reason: `eBay returned ${res.status}` }
    }

    const data = await res.json()
    const fulfillment = data.fulfillments?.[0]

    if (!fulfillment?.shipmentTrackingNumber) {
      return { orderId: order.orderId, status: 'pending', reason: 'No tracking number yet' }
    }

    await orderDoc.ref.update({
      trackingNumber:    fulfillment.shipmentTrackingNumber,
      trackingCarrier:   fulfillment.shippingCarrierCode || 'Unknown',
      fulfillmentStatus: 'shipped',
      shippedAt:         new Date().toISOString(),
      updatedAt:         new Date().toISOString(),
    })

    return {
      orderId: order.orderId,
      status: 'tracking_found',
      trackingNumber: fulfillment.shipmentTrackingNumber,
    }

  } catch (err) {
    return { orderId: order.orderId, status: 'error', reason: err.message }
  }
}

export default async function handler(req, res) {
  const cronSecret = req.headers['x-cron-secret']
  const isCron = cronSecret === process.env.ADMIN_SECRET

  if (req.method !== 'GET' && req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  if (!isCron) {
    const adminToken = req.headers['x-shop-token']
    if (adminToken !== process.env.ADMIN_SECRET)
      return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const pendingSnap = await db.collection('shop_orders')
      .where('fulfillmentStatus', '==', 'ordered')
      .limit(20)
      .get()

    if (pendingSnap.empty) {
      return res.status(200).json({ checked: 0, message: 'No orders awaiting tracking' })
    }

    const results = []
    for (const doc of pendingSnap.docs) {
      results.push(await pollSingleOrder(doc))
    }

    return res.status(200).json({ checked: results.length, results })

  } catch (err) {
    console.error('[TrackShipment]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
