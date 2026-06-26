/**
 * HUSIN ESHOP — POST /api/shop/capture-order
 * Phase 2 — Idempotent Checkout: Atomic Update Lifecycle
 */

import { db }                   from '../../../lib/firebaseAdmin'
import { sendOrderConfirmation } from '../../../lib/emailService'
import { sendInvoiceEmail }      from '../../../lib/sendInvoiceEmail'
import { USD_TO_SAR }            from '../../../lib/sources.js'
import { calculateTotalProfit }  from '../../../lib/shippingEngine.js'

const PAYPAL_BASE = 'https://api-m.paypal.com'
const CLIENT_ID   = process.env.PAYPAL_CLIENT_ID
const SECRET      = process.env.PAYPAL_SECRET
const BOT         = process.env.TELEGRAM_BOT_TOKEN
const CHAT        = process.env.TELEGRAM_CHAT_ID
const SITE        = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.husin.org'

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

async function sendTelegram(text) {
  if (!BOT || !CHAT) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: CHAT, text, disable_web_page_preview: true }),
      signal:  AbortSignal.timeout(8000),
    })
  } catch (e) {
    console.error('[CaptureOrder] Telegram error:', e.message)
  }
}

async function updateOrderWithRetry(orderId, updatePayload, context, maxRetries = 3) {
  let lastErr
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.collection('shop_orders').doc(orderId).update(updatePayload)
      console.log(`[CaptureOrder] Firestore updated on attempt ${attempt}: ${orderId}`)
      return true
    } catch (err) {
      lastErr = err
      console.error(`[CaptureOrder] Firestore update attempt ${attempt} failed: ${err.message}`)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 300 * Math.pow(3, attempt - 1)))
      }
    }
  }

  const alertMsg = [
    `🚨 CRITICAL — FIRESTORE UPDATE FAILED AFTER ${maxRetries} RETRIES`,
    ``,
    `💳 PayPal HAS captured the money — customer IS charged`,
    `❌ But order document was NOT updated in Firestore`,
    ``,
    `🆔 Husin Order ID: ${orderId}`,
    `💰 PayPal Capture ID: ${context.paypalCaptureId || 'unknown'}`,
    `📧 Customer: ${context.customerEmail || 'unknown'}`,
    `💵 Amount: ${context.capturedSAR || 0} SAR`,
    ``,
    `ACTION REQUIRED: Manually update shop_orders/${orderId}`,
    `Set paymentStatus:'paid' and paidAt timestamp`,
    ``,
    `Error: ${lastErr?.message}`,
  ].join('\n')

  await sendTelegram(alertMsg)
  console.error('[CaptureOrder] CRITICAL: All Firestore retries failed for', orderId)
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const {
    paypalOrderId,   
    husinsOrderId,   
    productId,
    quantity     = 1,
    customerInfo = {},
  } = req.body

  if (!paypalOrderId)
    return res.status(400).json({ error: 'paypalOrderId required' })
  if (!husinsOrderId)
    return res.status(400).json({ error: 'husinsOrderId required — ensure create-order.js v2 is deployed' })

  try {
    const existingSnap = await db.collection('shop_orders').doc(husinsOrderId).get()

    if (existingSnap.exists) {
      const existing = existingSnap.data()
      if (existing.paymentStatus === 'paid') {
        console.log(`[CaptureOrder] Already paid: ${husinsOrderId} — returning cached success`)
        return res.status(200).json({
          success:  true,
          orderId:  husinsOrderId,
          cached:   true,
          message:  'Order already confirmed',
        })
      }
      if (existing.paymentStatus === 'failed') {
        console.log(`[CaptureOrder] Retrying previously failed order: ${husinsOrderId}`)
      }
    } else {
      console.warn(`[CaptureOrder] No pre-registered doc for ${husinsOrderId} — will create on success`)
    }

    const ppToken     = await getPayPalToken()
    const captureRes  = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${ppToken}`,
          'Content-Type':  'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    )

    const captureData = await captureRes.json()

    if (captureData.status !== 'COMPLETED') {
      console.error('[CaptureOrder] Not COMPLETED:', captureData.status, JSON.stringify(captureData))

      await db.collection('shop_orders').doc(husinsOrderId).update({
        paymentStatus: 'failed',
        failedAt:      new Date().toISOString(),
        failureReason: captureData.status || 'PayPal did not return COMPLETED',
        updatedAt:     new Date().toISOString(),
      }).catch(() => {})

      return res.status(400).json({
        error:  'Payment capture failed',
        status: captureData.status,
        detail: captureData.details?.[0]?.description || 'Unknown PayPal error',
      })
    }

    const capture       = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    const payer         = captureData.payer
    const shipping      = captureData.purchase_units?.[0]?.shipping
    const capturedUSD   = parseFloat(capture?.amount?.value || '0')
    const capturedSAR   = Math.round(capturedUSD * USD_TO_SAR)
    const paypalCapId   = capture?.id

    const customerName  = payer
      ? `${payer.name?.given_name || ''} ${payer.name?.surname || ''}`.trim()
      : customerInfo.name || ''
    const customerEmail = payer?.email_address || customerInfo.email || ''
    const shippingAddr  = shipping?.address
      ? [
          shipping.address.address_line_1,
          shipping.address.admin_area_2,
          shipping.address.admin_area_1,
          'Saudi Arabia',
        ].filter(Boolean).join(', ')
      : customerInfo.address
        ? [customerInfo.address, customerInfo.city, 'Saudi Arabia'].filter(Boolean).join(', ')
        : ''

    let product       = {}
    let profitSAR     = null
    let shippingFeeSAR    = 0
    let shippingProfitSAR = 0
    let netProfitSAR      = null

    const preRegistered = existingSnap.exists ? existingSnap.data() : {}
    shippingFeeSAR    = preRegistered.shippingFeeSAR    || 0
    shippingProfitSAR = preRegistered.shippingProfitSAR || 0

    try {
      const productSnap = await db.collection('shop_approved_products').doc(productId).get()
      if (productSnap.exists) {
        product = productSnap.data()
        const sourceCost = (product._sourcePriceSAR || 0) * parseInt(quantity)
        const productRevenue = capturedSAR - shippingFeeSAR 
        if (sourceCost > 0) {
          profitSAR  = parseFloat((productRevenue - sourceCost).toFixed(2))
          netProfitSAR = calculateTotalProfit({
            productProfitSAR:  profitSAR,
            shippingProfitSAR,
          })
        }
      }
    } catch (pErr) {
      console.warn('[CaptureOrder] Could not fetch product:', pErr.message)
    }

    const now              = new Date().toISOString()
    const fulfillmentCostSAR = product._sourcePriceSAR
      ? parseFloat((product._sourcePriceSAR * parseInt(quantity)).toFixed(2))
      : null

    const finalPayload = {
      paymentStatus:   'paid',
      paypalCaptureId: paypalCapId,
      paidAt:          now,
      updatedAt:       now,
      customerName,
      customerEmail,
      shippingAddress: shippingAddr,
      customerPhone:   customerInfo.phone || null,
      capturedUSD,
      capturedSAR,
      fulfillmentCostSAR,     
      shippingFeeSAR,         
      shippingProfitSAR,      
      productProfitSAR: profitSAR,    
      netProfitSAR,            
      fulfillmentStatus: 'pending',
      _sourceLink:     product._sourceLink     || null,
      _sourcePriceSAR: product._sourcePriceSAR  || null,
    }

    const context = { paypalCaptureId: paypalCapId, customerEmail, capturedSAR }
    const updated = await updateOrderWithRetry(husinsOrderId, finalPayload, context)

    if (!updated) {
      return res.status(207).json({
        success:  false,
        orderId:  husinsOrderId,
        warning:  'Payment captured by PayPal but order database update failed. Our team has been alerted and will reconcile manually.',
        captureId:paypalCapId,
      })
    }

    if (productId && product?.sales !== undefined) {
      db.collection('shop_approved_products').doc(productId)
        .update({ sales: (product.sales || 0) + parseInt(quantity) })
        .catch(e => console.warn('[CaptureOrder] Sales increment failed:', e.message))
    }

    // ── 8. SEND CUSTOMER EMAIL CONFIRMATION & INVOICE ─────────────────────────
    const orderForEmail = {
      orderId:         husinsOrderId,
      productName:     product.name || existingSnap.data()?.productName || 'Your order',
      quantity:        parseInt(quantity),
      sellingPriceSAR: capturedSAR,
      customerName,
      customerEmail,
      shippingAddress: shippingAddr,
      paidAt:          now,
    }

    // Fire emails non-blocking
    sendOrderConfirmation(orderForEmail).then(result => {
      if (!result?.success) {
        console.warn(`[CaptureOrder] Confirmation email failed for ${husinsOrderId}: ${result?.reason}`)
      }
    }).catch(e => {
      console.error('[CaptureOrder] Confirmation email exception:', e.message)
    })

    sendInvoiceEmail(orderForEmail).then(result => {
      if (!result?.success) {
        console.warn(`[CaptureOrder] Invoice email failed for ${husinsOrderId}: ${result?.reason}`)
      }
    }).catch(e => {
      console.error('[CaptureOrder] Invoice email exception:', e.message)
    })

    // ── 9. NOTIFY OWNER ON TELEGRAM ───────────────────────────────────────────
    const itemsLabel = orderForEmail.productName

    const ownerMsg = [
      `🛒 NEW SALE — HUSIN MARKETPLACE`,
      ``,
      `A purchase of ${capturedSAR.toLocaleString('en-SA')} SAR was made for [${itemsLabel}].`,
      fulfillmentCostSAR
        ? `Fulfillment cost is ${fulfillmentCostSAR.toLocaleString('en-SA')} SAR.`
        : `Fulfillment cost: not available — check product source.`,
      netProfitSAR !== null
        ? `Net profit is ${netProfitSAR.toLocaleString('en-SA')} SAR.`
        : '',
      `Order processing initiated.`,
      ``,
      `📦 Qty: ${quantity}`,
      `🚚 Shipping charged: ${shippingFeeSAR.toLocaleString('en-SA')} SAR (margin: ${shippingProfitSAR.toLocaleString('en-SA')} SAR)`,
      ``,
      `👤 ${customerName || 'Anonymous'}`,
      `📧 ${customerEmail || 'N/A'}`,
      shippingAddr ? `📍 ${shippingAddr}` : '',
      ``,
      `🆔 Order: ${husinsOrderId}`,
      `💳 PayPal Capture: ${paypalCapId}`,
      `✅ Payment: CONFIRMED`,
      ``,
      `SOURCE — buy from eBay & ship:`,
      product._sourceLink || 'Check admin orders',
      ``,
      `👉 Tap to fulfill: ${SITE}/shop/orders/${husinsOrderId}`,
    ].filter(Boolean).join('\n')

    await sendTelegram(ownerMsg)

    // ── 10. RETURN SUCCESS ─────────────────────────────────────────────────────
    return res.status(200).json({
      success:  true,
      orderId:  husinsOrderId,
    })

  } catch (err) {
    console.error('[CaptureOrder] Fatal:', err.message)

    await sendTelegram([
      `🚨 CAPTURE-ORDER FATAL ERROR`,
      `Order: ${husinsOrderId || 'unknown'}`,
      `PayPal: ${paypalOrderId || 'unknown'}`,
      `Error: ${err.message}`,
    ].join('\n')).catch(() => {})

    return res.status(500).json({ error: err.message })
  }
}
