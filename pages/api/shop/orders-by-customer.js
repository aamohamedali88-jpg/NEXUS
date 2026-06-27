import { db } from '../../../lib/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' })

  const { email, uid } = req.query

  if (!email && !uid)
    return res.status(400).json({ error: 'email or uid required' })

  try {
    let query = db.collection('shop_orders')

    if (uid) {
      query = query.where('customerUid', '==', uid)
    } else {
      query = query.where('customerEmail', '==', email.toLowerCase().trim())
    }

    const snap = await query.orderBy('createdAt', 'desc').limit(50).get()

    const orders = snap.docs.map(doc => {
      const d = doc.data()
      return {
        orderId:           d.orderId,
        productId:         d.productId,
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
        shippingAddress:   d.shippingAddress,
        createdAt:         d.createdAt,
        paidAt:            d.paidAt,
        // Private/internal fields intentionally excluded from response:
        // _sourceLink, _sourcePriceSAR, paypalCaptureId, netProfitSAR, etc.
      }
    })

    return res.status(200).json({ orders, count: orders.length })

  } catch (err) {
    console.error('[OrdersByCustomer]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
