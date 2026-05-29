/**
 * HUSIN ESHOP — GET /api/shop/checkout
 * FIXED: Does NOT save order to Firestore before payment
 * Only creates PayPal order and redirects customer to PayPal
 * Order is ONLY saved in payment-success.js after payment confirmed
 */

import { db } from '../../../lib/firebaseAdmin'

const PAYPAL_BASE = 'https://api-m.paypal.com'
const CLIENT_ID   = process.env.PAYPAL_CLIENT_ID
const SECRET      = process.env.PAYPAL_SECRET
const SITE        = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.husin.org'

async function getAccessToken() {
  const credentials = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body:   'grant_type=client_credentials',
    signal: AbortSignal.timeout(10000),
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
      return res.redirect(302, `/marketplace?error=product_not_found`)
    }

    const product = productSnap.data()

    if (product.status !== 'live') {
      return res.redirect(302, `/marketplace?error=product_unavailable`)
    }

    const sellingPriceSAR = product.sellingPriceSAR
    if (!sellingPriceSAR || sellingPriceSAR <= 0) {
      return res.redirect(302, `/marketplace/${productId}?error=no_price`)
    }

    // Convert SAR to USD for PayPal
    const USD_TO_SAR = 3.75
    const priceUSD   = (sellingPriceSAR / USD_TO_SAR).toFixed(2)

    // Create unique reference ID for this checkout attempt
    const referenceId = `husin_${Date.now()}_${productId.substring(0, 8)}`

    // Get PayPal token
    const accessToken = await getAccessToken()

    // Create PayPal order — NO Firestore save here
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method:  'POST',
      headers: {
        'Authorization':     `Bearer ${accessToken}`,
        'Content-Type':      'application/json',
        'PayPal-Request-Id': referenceId,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: referenceId,
          description:  product.name.substring(0, 127),
          amount: {
            currency_code: 'USD',
            value:         priceUSD,
          },
          custom_id: productId, // pass productId through PayPal
        }],
        application_context: {
          brand_name:   'HUSIN Marketplace',
          landing_page: 'BILLING',
          user_action:  'PAY_NOW',
          // On success — PayPal sends token + PayerID in query params
          return_url: `${SITE}/api/shop/payment-success?productId=${productId}&referenceId=${referenceId}`,
          cancel_url: `${SITE}/marketplace/${productId}?cancelled=true`,
        },
      }),
    })

    const orderData = await orderRes.json()

    if (!orderData.id) {
      console.error('[Checkout] PayPal order creation failed:', JSON.stringify(orderData))
      return res.redirect(302, `/marketplace/${productId}?error=payment_failed`)
    }

    // Find PayPal approval URL and redirect customer — nothing saved yet
    const approvalUrl = orderData.links?.find(l => l.rel === 'approve')?.href
    if (!approvalUrl) {
      return res.redirect(302, `/marketplace/${productId}?error=no_approval_url`)
    }

    console.log(`[Checkout] Redirecting to PayPal for product ${productId}`)
    return res.redirect(302, approvalUrl)

  } catch (error) {
    console.error('[Checkout] Error:', error.message)
    return res.redirect(302, `/marketplace/${productId}?error=checkout_failed`)
  }
}
