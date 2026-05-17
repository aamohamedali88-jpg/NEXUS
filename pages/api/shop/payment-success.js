/**
 * HUSIN ESHOP — GET /api/shop/payment-success
 * PayPal redirects customer here after successful payment
 * Captures the payment, saves order, notifies owner on Telegram
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
    body: 'grant_type=client_credentials',
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
      `💰 Amount: ${order.sellingPriceSAR} SAR ($${order.priceUSD} USD)`,
      `💵 Your Profit: ${order.profitSAR || 'N/A'} SAR`,
      ``,
      `👤 Customer: ${order.customerName || 'Anonymous'}`,
      `📧 Email: ${order.customerEmail || 'Not provided'}`,
      `📍 Address: ${order.shippingAddress || 'Not provided'}`,
      ``,
      `🆔 Order ID: ${order.orderId}`,
      `✅ Payment: CONFIRMED via PayPal`,
      ``,
      `🔗 Go buy from source and ship to customer:`,
      `${product._sourceLink || 'Check admin panel'}`,
      ``,
      `📊 ${SITE}/shop/orders`,
    ].join('\n')

    await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:                  CHAT,
        text:                     msg,
        disable_web_page_preview: false,
      }),
    })
  } catch (e) {
    console.error('[PaymentSuccess] Telegram notify error:', e.message)
  }
}

export default async function handler(req, res) {
  const { orderId, productId, token: paypalToken } = req.query

  if (!orderId || !paypalToken) {
    return res.redirect(302, `/marketplace?error=invalid_return`)
  }

  try {
    // Get our order from Firestore
    const orderSnap = await db.collection('shop_orders').doc(orderId).get()
    if (!orderSnap.exists) {
      return res.redirect(302, `/marketplace?error=order_not_found`)
    }

    const order = orderSnap.data()

    // Already captured — idempotent
    if (order.paymentStatus === 'paid') {
      return res.redirect(302, `/shop/order-confirmation?orderId=${orderId}`)
    }

    // Capture the PayPal payment
    const accessToken = await getAccessToken()
    const captureRes  = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${order.paypalOrderId}/capture`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
      }
    )

    const captureData = await captureRes.json()

    if (captureData.status !== 'COMPLETED') {
      console.error('[PaymentSuccess] Capture failed:', captureData)
      await db.collection('shop_orders').doc(orderId).update({
        paymentStatus: 'failed',
        captureData,
        updatedAt: new Date().toISOString(),
      })
      return res.redirect(302, `/marketplace/${productId}?error=capture_failed`)
    }

    // Extract customer details from PayPal capture
    const capture      = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    const payer        = captureData.payer
    const shipping     = captureData.purchase_units?.[0]?.shipping

    const customerName  = `${payer?.name?.given_name || ''} ${payer?.name?.surname || ''}`.trim()
    const customerEmail = payer?.email_address || ''
    const shippingAddr  = shipping?.address
      ? `${shipping.address.address_line_1 || ''}, ${shipping.address.admin_area_2 || ''}, ${shipping.address.country_code || ''}`
      : ''

    // Get product details (including source link for fulfillment)
    const productSnap = await db.collection('shop_approved_products').doc(productId).get()
    const product     = productSnap.exists ? productSnap.data() : {}

    // Calculate profit
    const profitSAR = order.sellingPriceSAR && product._sourcePriceSAR
      ? (order.sellingPriceSAR - product._sourcePriceSAR).toFixed(2)
      : null

    // Update order as paid
    const updatedOrder = {
      ...order,
      paymentStatus:   'paid',
      captureId:       capture?.id,
      customerName,
      customerEmail,
      shippingAddress: shippingAddr,
      profitSAR:       profitSAR ? parseFloat(profitSAR) : null,
      paidAt:          new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
      fulfillmentStatus: 'pending', // owner needs to buy from source and ship
    }

    await db.collection('shop_orders').doc(orderId).update(updatedOrder)

    // Increment product sales count
    await db.collection('shop_approved_products').doc(productId).update({
      sales: (product.sales || 0) + 1,
    })

    // Notify owner on Telegram
    await notifyOwner(updatedOrder, product)

    // Redirect to confirmation page
    return res.redirect(302, `/shop/order-confirmation?orderId=${orderId}`)

  } catch (error) {
    console.error('[PaymentSuccess] Error:', error.message)
    return res.redirect(302, `/marketplace?error=payment_processing_failed`)
  }
}
