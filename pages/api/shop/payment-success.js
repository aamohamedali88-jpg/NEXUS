/**
 * HUSIN ESHOP — GET /api/shop/payment-success
 * FIXED: This is the ONLY place orders are saved to Firestore
 * PayPal redirects here after customer completes payment
 * Captures payment → confirms → THEN saves order → notifies owner
 */

import { db } from '../../../lib/firebaseAdmin'

const PAYPAL_BASE = 'https://api-m.paypal.com'
const CLIENT_ID   = process.env.PAYPAL_CLIENT_ID
const SECRET      = process.env.PAYPAL_SECRET
const BOT         = process.env.TELEGRAM_BOT_TOKEN
const CHAT        = process.env.TELEGRAM_CHAT_ID
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
  return data.access_token
}

async function notifyOwner(order, sourceLink) {
  if (!BOT || !CHAT) return
  try {
    const msg = [
      `🛒 NEW ORDER — HUSIN MARKETPLACE`,
      ``,
      `📦 Product: ${order.productName}`,
      `💰 Amount: ${order.sellingPriceSAR} SAR ($${order.priceUSD} USD)`,
      order.profitSAR ? `💵 Your Profit: ~${order.profitSAR} SAR` : '',
      ``,
      `👤 Customer: ${order.customerName || 'Anonymous'}`,
      `📧 Email: ${order.customerEmail || 'Not provided'}`,
      order.shippingAddress ? `📍 Address: ${order.shippingAddress}` : '',
      ``,
      `🆔 Order ID: ${order.orderId}`,
      `✅ Payment: CONFIRMED via PayPal`,
      ``,
      `ACTION REQUIRED — Buy from source & ship:`,
      sourceLink || 'Check admin panel',
      ``,
      `📊 Orders: ${SITE}/shop/orders`,
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
    console.error('[PaymentSuccess] Telegram notify error:', e.message)
  }
}

export default async function handler(req, res) {
  // PayPal sends: token (PayPal order ID) + PayerID + our custom params
  const { productId, referenceId, token: paypalOrderId, PayerID } = req.query

  if (!paypalOrderId || !PayerID) {
    // Customer cancelled or invalid return
    return res.redirect(302, `/marketplace?error=payment_cancelled`)
  }

  if (!productId) {
    return res.redirect(302, `/marketplace?error=missing_product`)
  }

  try {
    // Step 1: Get PayPal access token
    const accessToken = await getAccessToken()

    // Step 2: Capture the payment — THIS confirms money moved
    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    )

    const captureData = await captureRes.json()

    // Step 3: Verify payment was actually completed
    if (captureData.status !== 'COMPLETED') {
      console.error('[PaymentSuccess] Capture not completed:', captureData.status)
      return res.redirect(302, `/marketplace/${productId}?error=payment_not_completed`)
    }

    // Step 4: Extract confirmed payment details
    const capture       = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    const payer         = captureData.payer
    const shipping      = captureData.purchase_units?.[0]?.shipping
    const capturedAmount = parseFloat(capture?.amount?.value || '0')

    const customerName  = `${payer?.name?.given_name || ''} ${payer?.name?.surname || ''}`.trim()
    const customerEmail = payer?.email_address || ''
    const shippingAddr  = shipping?.address
      ? [
          shipping.address.address_line_1,
          shipping.address.admin_area_2,
          shipping.address.admin_area_1,
          shipping.address.country_code,
        ].filter(Boolean).join(', ')
      : ''

    // Step 5: Get product details for order record
    const productSnap = await db
      .collection('shop_approved_products')
      .doc(productId)
      .get()

    const product    = productSnap.exists ? productSnap.data() : {}
    const USD_TO_SAR = 3.75
    const sarPaid    = Math.round(capturedAmount * USD_TO_SAR)
    const profitSAR  = product._sourcePriceSAR
      ? parseFloat((sarPaid - product._sourcePriceSAR).toFixed(2))
      : null

    // Step 6: Create unique order ID
    const orderId = `order_${Date.now()}_${productId.substring(0, 8)}`

    // Step 7: SAVE ORDER — only happens after confirmed payment
    const order = {
      orderId,
      productId,
      productName:       product.name        || 'Product',
      sellingPriceSAR:   sarPaid,
      priceUSD:          capturedAmount,
      profitSAR,
      paymentMethod:     'paypal',
      paymentStatus:     'paid',              // ← always 'paid' here
      paypalOrderId,
      paypalCaptureId:   capture?.id,
      customerName,
      customerEmail,
      shippingAddress:   shippingAddr,
      fulfillmentStatus: 'pending',
      _sourceLink:       product._sourceLink || null,
      _sourcePriceSAR:   product._sourcePriceSAR || null,
      paidAt:            new Date().toISOString(),
      createdAt:         new Date().toISOString(),
    }

    await db.collection('shop_orders').doc(orderId).set(order)

    // Step 8: Increment product sales count
    if (productSnap.exists) {
      await db.collection('shop_approved_products').doc(productId).update({
        sales: (product.sales || 0) + 1,
      }).catch(() => {})
    }

    // Step 9: Notify owner on Telegram
    await notifyOwner(order, product._sourceLink)

    console.log(`[PaymentSuccess] ✅ Order ${orderId} saved — ${sarPaid} SAR`)

    // Step 10: Redirect to confirmation page
    return res.redirect(302, `/shop/order-confirmation?orderId=${orderId}`)

  } catch (error) {
    console.error('[PaymentSuccess] Error:', error.message)
    return res.redirect(302, `/marketplace?error=payment_processing_failed`)
  }
}
