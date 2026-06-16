/**
 * HUSIN ESHOP — POST /api/shop/create-order
 * Phase 2 — Idempotent Checkout: Pre-Registration Lifecycle
 *
 * CHANGE FROM PREVIOUS VERSION:
 * Before: Order only written to Firestore AFTER PayPal capture (risk: lost orders on timeout)
 * Now:    Order written to Firestore HERE with status:'pending_payment' BEFORE PayPal processes
 *         capture-order.js then UPDATES the existing doc — never creates a new one
 *
 * This guarantees: if Vercel times out between PayPal capture and Firestore write,
 * the order document already exists and can be reconciled.
 *
 * Returns:
 *   { paypalOrderId, husinsOrderId, totalSAR, totalUSD, productName, qty }
 */

import { db } from '../../../lib/firebaseAdmin'

const PAYPAL_BASE = 'https://api-m.paypal.com'
const CLIENT_ID   = process.env.PAYPAL_CLIENT_ID
const SECRET      = process.env.PAYPAL_SECRET
const USD_TO_SAR  = 3.75

async function getPayPalToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')
  const res   = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body:   'grant_type=client_credentials',
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`PayPal auth failed: ${data.error_description || ''}`)
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const {
    productId,
    quantity     = 1,
    customerInfo = {},   // { name, email, phone, address, city, country }
  } = req.body

  if (!productId)
    return res.status(400).json({ error: 'productId required' })

  try {
    // ── 1. Fetch product from Firestore ───────────────────────────────────────
    const productSnap = await db.collection('shop_approved_products').doc(productId).get()
    if (!productSnap.exists || productSnap.data().status !== 'live')
      return res.status(404).json({ error: 'Product not found or no longer available' })

    const product  = productSnap.data()
    const qty      = Math.max(1, Math.min(10, parseInt(quantity)))
    const sarPrice = product.sellingPriceSAR
    const totalSAR = sarPrice * qty
    const totalUSD = (totalSAR / USD_TO_SAR).toFixed(2)
    const unitUSD  = (sarPrice / USD_TO_SAR).toFixed(2)

    // ── 2. Create PayPal order intent ─────────────────────────────────────────
    const ppToken   = await getPayPalToken()
    const ppRes     = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${ppToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: `husin_${Date.now()}`,
          description:  product.name.substring(0, 127),
          amount: {
            currency_code: 'USD',
            value:         totalUSD,
            breakdown: {
              item_total: { currency_code: 'USD', value: totalUSD }
            }
          },
          items: [{
            name:        product.name.substring(0, 127),
            unit_amount: { currency_code: 'USD', value: unitUSD },
            quantity:    String(qty),
            category:    'PHYSICAL_GOODS',
          }],
          custom_id: productId,
        }],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name:               'HUSIN Marketplace',
              locale:                   'en-SA',
              landing_page:             'NO_PREFERENCE',
              user_action:              'PAY_NOW',
              return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop/order-confirmation`,
              cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/marketplace/${productId}`,
            }
          }
        }
      }),
      signal: AbortSignal.timeout(12000),
    })

    const ppData = await ppRes.json()
    if (!ppData.id) {
      console.error('[CreateOrder] PayPal error:', JSON.stringify(ppData))
      return res.status(500).json({ error: 'Failed to create PayPal order' })
    }

    // ── 3. PRE-REGISTER order in Firestore with status:'pending_payment' ──────
    // This is the critical Phase 2 change.
    // The order document now exists BEFORE the customer enters their card.
    // capture-order.js will UPDATE this document — never create a new one.
    // If Vercel times out during capture, this document can be reconciled.
    const husinsOrderId = `order_${Date.now()}_${productId.substring(0, 8)}`

    const pendingOrder = {
      // Identity
      orderId:         husinsOrderId,
      paypalOrderId:   ppData.id,       // PayPal order ID — used to link capture

      // Product snapshot at time of order creation
      productId,
      productName:     product.name,
      productCategory: product.category || 'general',
      quantity:        qty,

      // Pricing
      sellingPriceSAR: totalSAR,
      priceUSD:        parseFloat(totalUSD),
      unitPriceSAR:    sarPrice,

      // Source (private — never exposed to client)
      _sourcePriceSAR: (product._sourcePriceSAR || 0) * qty,
      _sourceLink:     product._sourceLink || null,

      // Customer info collected so far (may be empty at this stage)
      customerName:    customerInfo.name    || null,
      customerEmail:   customerInfo.email   || null,
      customerPhone:   customerInfo.phone   || null,
      shippingAddress: customerInfo.address
        ? [
            customerInfo.address,
            customerInfo.city,
            'Saudi Arabia',
          ].filter(Boolean).join(', ')
        : null,

      // Payment status — THE KEY FIELD
      // 'pending_payment' → customer has not yet paid
      // 'paid'            → PayPal capture confirmed (set by capture-order.js)
      // 'failed'          → capture failed or was abandoned
      paymentStatus:     'pending_payment',
      paymentMethod:     'paypal',

      // Fulfillment (set after owner processes the order)
      fulfillmentStatus: 'not_started',

      // Timestamps
      createdAt:  new Date().toISOString(),
      paidAt:     null,    // set by capture-order.js on success
      updatedAt:  new Date().toISOString(),
    }

    await db.collection('shop_orders').doc(husinsOrderId).set(pendingOrder)
    console.log(`[CreateOrder] Pre-registered order ${husinsOrderId} — PayPal: ${ppData.id}`)

    // ── 4. Return both IDs to frontend ────────────────────────────────────────
    // Frontend passes husinsOrderId to capture-order.js so it can update the
    // correct pre-existing document instead of creating a new one.
    return res.status(200).json({
      paypalOrderId:  ppData.id,
      husinsOrderId,           // NEW — frontend must send this to capture-order
      totalSAR,
      totalUSD:       parseFloat(totalUSD),
      productName:    product.name,
      qty,
    })

  } catch (err) {
    console.error('[CreateOrder]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
