/**
 * HUSIN ESHOP — POST /api/shop/checkout
 * Creates a PayPal payment order when customer clicks Buy Now
 * Returns PayPal approval URL to redirect customer to
 */

import { db } from '../../../lib/firebaseAdmin'

const PAYPAL_BASE = 'https://api-m.paypal.com' // Live
const CLIENT_ID   = process.env.PAYPAL_CLIENT_ID
const SECRET      = process.env.PAYPAL_SECRET
const SITE        = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.husin.org'

// Get PayPal access token
async function getAccessToken() {
  const credentials = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to get PayPal access token')
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const productId = req.query.productId || req.body?.productId

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' })
  }

  try {
    // Get product from Firestore
    const productSnap = await db
      .collection('shop_approved_products')
      .doc(productId)
      .get()

    if (!productSnap.exists) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const product = productSnap.data()

    if (product.status !== 'live') {
      return res.status(400).json({ error: 'Product is not available' })
    }

    const sellingPriceSAR = product.sellingPriceSAR
    if (!sellingPriceSAR || sellingPriceSAR <= 0) {
      return res.status(400).json({ error: 'Product has no price' })
    }

    // Convert SAR to USD for PayPal (PayPal doesn't support SAR)
    const USD_TO_SAR  = 3.75
    const priceUSD    = (sellingPriceSAR / USD_TO_SAR).toFixed(2)

    // Create unique order ID
    const orderId     = `husin_${Date.now()}_${productId.substring(0, 8)}`

    // Save pending order to Firestore
    await db.collection('shop_orders').doc(orderId).set({
      orderId,
      productId,
      productName:   product.name,
      sellingPriceSAR,
      priceUSD:      parseFloat(priceUSD),
      paymentMethod: 'paypal',
      paymentStatus: 'pending',
      createdAt:     new Date().toISOString(),
    })

    // Get PayPal token
    const accessToken = await getAccessToken()

    // Create PayPal order
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
        'PayPal-Request-Id': orderId,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id:   orderId,
          description:    product.name.substring(0, 127),
          amount: {
            currency_code: 'USD',
            value:         priceUSD,
          },
          custom_id: orderId,
        }],
        application_context: {
          brand_name:          'HUSIN Marketplace',
          landing_page:        'BILLING',
          user_action:         'PAY_NOW',
          return_url: `${SITE}/api/shop/payment-success?orderId=${orderId}&productId=${productId}`,
          cancel_url: `${SITE}/marketplace/${productId}?cancelled=true`,
        },
      }),
    })

    const orderData = await orderRes.json()

    if (!orderData.id) {
      console.error('[Checkout] PayPal order creation failed:', orderData)
      throw new Error('Failed to create PayPal order')
    }

    // Update order with PayPal order ID
    await db.collection('shop_orders').doc(orderId).update({
      paypalOrderId: orderData.id,
    })

    // Find approval URL and redirect customer
    const approvalUrl = orderData.links?.find(l => l.rel === 'approve')?.href

    if (!approvalUrl) {
      throw new Error('No approval URL from PayPal')
    }

    // Redirect to PayPal payment page
    return res.redirect(302, approvalUrl)

  } catch (error) {
    console.error('[Checkout] Error:', error.message)
    return res.redirect(302, `/marketplace/${productId}?error=payment_failed`)
  }
}
