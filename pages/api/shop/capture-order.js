/**
 * HUSIN ESHOP — POST /api/shop/capture-order
 * Called after customer completes payment in PayPal JS SDK
 * Captures the payment, saves order to Firestore, notifies owner
 * Money goes directly to owner PayPal account
 */

import { db } from '../../../lib/firebaseAdmin'

const PAYPAL_BASE = 'https://api-m.paypal.com'
const CLIENT_ID   = process.env.PAYPAL_CLIENT_ID
const SECRET      = process.env.PAYPAL_SECRET
const BOT         = process.env.TELEGRAM_BOT_TOKEN
const CHAT        = process.env.TELEGRAM_CHAT_ID
const SITE        = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.husin.org'
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
  return data.access_token
}

async function notifyOwner(order, product) {
  if (!BOT || !CHAT) return
  try {
    const msg = [
      `🛒 NEW ORDER — HUSIN MARKETPLACE`,
      ``,
      `📦 Product: ${order.productName}`,
      `🔢 Quantity: ${order.quantity}`,
      `💰 Total: ${order.sellingPriceSAR} SAR ($${order.priceUSD} USD)`,
      order.profitSAR ? `💵 Profit: ~${order.profitSAR} SAR` : '',
      ``,
      `👤 Customer: ${order.customerName || 'Anonymous'}`,
      `📧 Email: ${order.customerEmail || 'N/A'}`,
      order.shippingAddress ? `📍 Address: ${order.shippingAddress}` : '',
      ``,
      `🆔 Order: ${order.orderId}`,
      `✅ Payment: CONFIRMED`,
      ``,
      `Go buy from source & ship to customer:`,
      product?._sourceLink || 'Check admin orders',
      ``,
      `${SITE}/shop/orders`,
    ].filter(Boolean).join('\n')

    await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:                  CHAT,
        text:                     msg,
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (e) {
    console.error('[CaptureOrder] Telegram error:', e.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { paypalOrderId, productId, quantity = 1, customerInfo = {} } = req.body

  if (!paypalOrderId || !productId) {
    return res.status(400).json({ error: 'paypalOrderId and productId required' })
  }

  try {
    // Capture the PayPal payment
    const token      = await getAccessToken()
    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    )

    const captureData = await captureRes.json()

    // Verify payment completed
    if (captureData.status !== 'COMPLETED') {
      console.error('[CaptureOrder] Not completed:', captureData.status)
      return res.status(400).json({
        error:  'Payment not completed',
        status: captureData.status,
      })
    }

    // Extract payment details
    const capture       = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    const payer         = captureData.payer
    const shipping      = captureData.purchase_units?.[0]?.shipping
    const capturedUSD   = parseFloat(capture?.amount?.value || '0')
    const capturedSAR   = Math.round(capturedUSD * USD_TO_SAR)

    const customerName  = payer
      ? `${payer.name?.given_name || ''} ${payer.name?.surname || ''}`.trim()
      : customerInfo.name || ''
    const customerEmail = payer?.email_address || customerInfo.email || ''
    const shippingAddr  = shipping?.address
      ? [
          shipping.address.address_line_1,
          shipping.address.admin_area_2,
          shipping.address.admin_area_1,
          shipping.address.country_code,
        ].filter(Boolean).join(', ')
      : customerInfo.address || ''

    // Get product for profit calculation & source link
    const productSnap = await db.collection('shop_approved_products').doc(productId).get()
    const product     = productSnap.exists ? productSnap.data() : {}
    const qty         = parseInt(quantity)
    const sourceCost  = (product._sourcePriceSAR || 0) * qty
    const profitSAR   = sourceCost > 0
      ? parseFloat((capturedSAR - sourceCost).toFixed(2))
      : null

    // Save confirmed order
    const orderId = `order_${Date.now()}_${productId.substring(0, 8)}`
    const order   = {
      orderId,
      productId,
      productName:       product.name || 'Product',
      quantity:          qty,
      sellingPriceSAR:   capturedSAR,
      priceUSD:          capturedUSD,
      profitSAR,
      paymentMethod:     'paypal',
      paymentStatus:     'paid',
      paypalOrderId,
      paypalCaptureId:   capture?.id,
      customerName,
      customerEmail,
      shippingAddress:   shippingAddr,
      fulfillmentStatus: 'pending',
      _sourceLink:       product._sourceLink    || null,
      _sourcePriceSAR:   product._sourcePriceSAR || null,
      paidAt:            new Date().toISOString(),
      createdAt:         new Date().toISOString(),
    }

    await db.collection('shop_orders').doc(orderId).set(order)

    // Increment sales count
    if (productSnap.exists) {
      db.collection('shop_approved_products').doc(productId)
        .update({ sales: (product.sales || 0) + qty })
        .catch(() => {})
    }

    // Notify owner on Telegram
    await notifyOwner(order, product)

    return res.status(200).json({ success: true, orderId })

  } catch (error) {
    console.error('[CaptureOrder]', error.message)
    return res.status(500).json({ error: error.message })
  }
}
