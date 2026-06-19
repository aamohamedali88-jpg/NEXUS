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
import { USD_TO_SAR } from '../../../lib/sources.js'
import { calculateShipping } from '../../../lib/shippingEngine.js'

const PAYPAL_BASE = 'https://api-m.paypal.com'
const CLIENT_ID   = process.env.PAYPAL_CLIENT_ID
const SECRET      = process.env.PAYPAL_SECRET
// USD_TO_SAR now imported from lib/sources.js — single source of truth (3.85)
// Previously hardcoded here independently, which risked drifting out of sync
// with pricingEngine.js if the rate was ever updated in only one place.

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

    // ── Shipping fee — single unified line item, customer never sees the
    // internal free-shipping flat fee vs paid-shipping markup distinction.
    // Falls back to free-shipping flat-fee model if supplier shipping data
    // was not captured by the scraper (safe default — still profitable).
    const shipping = calculateShipping({
      supplierFreeShipping:    product.supplierFreeShipping !== false,
      supplierShippingCostUSD: product.supplierShippingCostUSD || 0,
      seed:                    productId,
    })

    const productTotalSAR = sarPrice * qty
    const shippingFeeSAR  = shipping.customerFeeSAR
    const totalSAR         = productTotalSAR + shippingFeeSAR
    const totalUSD = (totalSAR / USD_TO_SAR).toFixed(2)
    const unitUSD  = (sarPrice / USD_TO_SAR).toFixed(2)
    const shippingUSD = (shippingFeeSAR / USD_TO_SAR).toFixed(2)

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
              item_total:     { currency_code: 'USD', value: (unitUSD * qty).toFixed(2) },
              shipping:       { currency_code: 'USD', value: shippingUSD },
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

      // Variant selected by customer (Part 3 — variant enforcement)
      // Null-safe: products without variants simply pass null through
      selectedVariant: req.body.selectedVariant || null,

      // Pricing — product + shipping shown separately in the ledger,
      // but customer-facing UI (checkout.js) only ever renders ONE
      // combined "Shipping Fee" line item, never the internal split.
      sellingPriceSAR:    productTotalSAR,
      shippingFeeSAR,
      shippingScenario:   shipping.scenario,         // for internal audit only
      shippingProfitSAR:  shipping.shippingProfitSAR, // for internal audit only
      totalChargedSAR:    totalSAR,
      priceUSD:           parseFloat(totalUSD),       // PayPal settlement currency only
      unitPriceSAR:        sarPrice,

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
      // 'not_started' → awaiting manual one-tap fulfillment by owner
      // 'sourcing'    → owner has tapped "Fulfill" in dashboard/Telegram
      // 'ordered'     → owner confirms eBay purchase placed
      // 'shipped'     → tracking number attached (Part 4 polling)
      // 'delivered'   → confirmed delivered
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
    // NOTE: totalUSD is returned only because PayPal's JS SDK requires it
    // internally to render the button — checkout.js must NEVER display this
    // value to the customer (Part 1: SAR-only UI mandate).
    return res.status(200).json({
      paypalOrderId:  ppData.id,
      husinsOrderId,
      totalSAR,
      productTotalSAR,
      shippingFeeSAR,
      shippingFeeFormatted: shipping.customerFeeFormatted,
      totalUSD:       parseFloat(totalUSD), // internal PayPal SDK use only
      productName:    product.name,
      qty,
    })

  } catch (err) {
    console.error('[CreateOrder]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
