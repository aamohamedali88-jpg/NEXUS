/**
 * HUSIN ESHOP — POST /api/shop/create-order
 * Creates a PayPal order before customer enters card
 * Returns PayPal order ID for the frontend to use
 * Customer never sees PayPal — they stay on HUSIN checkout page
 */

import { db } from '../../../lib/firebaseAdmin'

const PAYPAL_BASE = 'https://api-m.paypal.com'
const CLIENT_ID   = process.env.PAYPAL_CLIENT_ID
const SECRET      = process.env.PAYPAL_SECRET
const USD_TO_SAR  = 3.75

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
  if (!data.access_token) throw new Error('PayPal auth failed')
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { productId, quantity = 1 } = req.body
  if (!productId) return res.status(400).json({ error: 'productId required' })

  try {
    // Get product from Firestore
    const snap = await db.collection('shop_approved_products').doc(productId).get()
    if (!snap.exists || snap.data().status !== 'live') {
      return res.status(404).json({ error: 'Product not found' })
    }

    const product     = snap.data()
    const qty         = Math.max(1, Math.min(10, parseInt(quantity)))
    const sarPrice    = product.sellingPriceSAR
    const totalSAR    = sarPrice * qty
    const totalUSD    = (totalSAR / USD_TO_SAR).toFixed(2)
    const unitUSD     = (sarPrice / USD_TO_SAR).toFixed(2)

    // Get PayPal token
    const token = await getAccessToken()

    // Create PayPal order — CAPTURE intent means money moves when we capture
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id:  `husin_${Date.now()}`,
          description:   product.name.substring(0, 127),
          amount: {
            currency_code: 'USD',
            value:         totalUSD,
            breakdown: {
              item_total: { currency_code: 'USD', value: totalUSD }
            }
          },
          items: [{
            name:       product.name.substring(0, 127),
            unit_amount:{ currency_code: 'USD', value: unitUSD },
            quantity:   String(qty),
            category:   'PHYSICAL_GOODS',
          }],
          custom_id: productId,
        }],
        // Advanced checkout — customer pays on HUSIN page, not PayPal page
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name:               'HUSIN Marketplace',
              locale:                   'en-SA',
              landing_page:             'NO_PREFERENCE',
              user_action:              'PAY_NOW',
              return_url:               `${process.env.NEXT_PUBLIC_SITE_URL}/shop/order-confirmation`,
              cancel_url:               `${process.env.NEXT_PUBLIC_SITE_URL}/marketplace/${productId}`,
            }
          }
        }
      }),
      signal: AbortSignal.timeout(12000),
    })

    const orderData = await orderRes.json()

    if (!orderData.id) {
      console.error('[CreateOrder] PayPal error:', JSON.stringify(orderData))
      return res.status(500).json({ error: 'Failed to create payment order' })
    }

    return res.status(200).json({
      orderId:       orderData.id,
      totalSAR,
      totalUSD:      parseFloat(totalUSD),
      productName:   product.name,
      qty,
    })

  } catch (error) {
    console.error('[CreateOrder]', error.message)
    return res.status(500).json({ error: error.message })
  }
}
