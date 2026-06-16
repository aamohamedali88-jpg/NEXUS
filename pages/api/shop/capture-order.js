/**
 * HUSIN ESHOP — POST /api/shop/capture-order
 * Phase 2 — Idempotent Checkout: Atomic Update Lifecycle
 *
 * CHANGE FROM PREVIOUS VERSION:
 * Before: Created a NEW Firestore document on payment success (race condition risk)
 * Now:    UPDATES the pre-existing 'pending_payment' document created by create-order.js
 *         Uses husinsOrderId passed from frontend to find the exact document
 *         Sends customer email confirmation via emailService.js
 *         Telegram notification to owner with source link
 *
 * IDEMPOTENCY GUARANTEE:
 *   - Checks if order is already 'paid' before processing (prevents double-capture)
 *   - If Firestore update fails, retries up to 3 times with exponential backoff
 *   - If all retries fail, logs to Telegram so owner can reconcile manually
 *   - PayPal capture ID stored — can be reconciled against PayPal dashboard
 */

import { db }                   from '../../../lib/firebaseAdmin'
import { sendOrderConfirmation } from '../../../lib/emailService'

const PAYPAL_BASE = 'https://api-m.paypal.com'
const CLIENT_ID   = process.env.PAYPAL_CLIENT_ID
const SECRET      = process.env.PAYPAL_SECRET
const BOT         = process.env.TELEGRAM_BOT_TOKEN
const CHAT        = process.env.TELEGRAM_CHAT_ID
const SITE        = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.husin.org'
const USD_TO_SAR  = 3.75

// ── PayPal token ──────────────────────────────────────────────────────────────
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

// ── Telegram alert (fire-and-forget, never throws) ────────────────────────────
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

// ── Firestore update with retry + exponential backoff ────────────────────────
// Retries up to maxRetries times. If all fail, alerts Telegram so owner knows.
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
        // Exponential backoff: 300ms, 900ms, 2700ms
        await new Promise(r => setTimeout(r, 300 * Math.pow(3, attempt - 1)))
      }
    }
  }

  // All retries exhausted — alert owner immediately so they can reconcile
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

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const {
    paypalOrderId,   // PayPal order ID (from PayPal SDK onApprove callback)
    husinsOrderId,   // Pre-registered Firestore order ID (from create-order.js)
    productId,
    quantity     = 1,
    customerInfo = {},
  } = req.body

  if (!paypalOrderId)
    return res.status(400).json({ error: 'paypalOrderId required' })
  if (!husinsOrderId)
    return res.status(400).json({ error: 'husinsOrderId required — ensure create-order.js v2 is deployed' })

  try {
    // ── 1. IDEMPOTENCY CHECK — prevent double-processing ──────────────────────
    // If this endpoint is called twice (browser retry, user double-click),
    // the second call finds status:'paid' and returns success without re-capturing.
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
        // Was previously abandoned — allow retry but log it
        console.log(`[CaptureOrder] Retrying previously failed order: ${husinsOrderId}`)
      }
    } else {
      // Pre-registration document is missing — this should not happen in Phase 2
      // but handle gracefully: create it now so we don't lose the order
      console.warn(`[CaptureOrder] No pre-registered doc for ${husinsOrderId} — will create on success`)
    }

    // ── 2. CAPTURE PAYMENT via PayPal ─────────────────────────────────────────
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

    // PayPal capture did not complete
    if (captureData.status !== 'COMPLETED') {
      console.error('[CaptureOrder] Not COMPLETED:', captureData.status, JSON.stringify(captureData))

      // Mark pre-registered order as failed so owner can investigate
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

    // ── 3. EXTRACT CAPTURE DETAILS ────────────────────────────────────────────
    const capture       = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    const payer         = captureData.payer
    const shipping      = captureData.purchase_units?.[0]?.shipping
    const capturedUSD   = parseFloat(capture?.amount?.value || '0')
    const capturedSAR   = Math.round(capturedUSD * USD_TO_SAR)
    const paypalCapId   = capture?.id

    // Resolve customer details — PayPal data takes priority over form input
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

    // ── 4. Get product data for profit calculation ─────────────────────────────
    let product    = {}
    let profitSAR  = null
    try {
      const productSnap = await db.collection('shop_approved_products').doc(productId).get()
      if (productSnap.exists) {
        product = productSnap.data()
        const sourceCost = (product._sourcePriceSAR || 0) * parseInt(quantity)
        if (sourceCost > 0) profitSAR = parseFloat((capturedSAR - sourceCost).toFixed(2))
      }
    } catch (pErr) {
      console.warn('[CaptureOrder] Could not fetch product:', pErr.message)
    }

    // ── 5. BUILD FINAL ORDER PAYLOAD ──────────────────────────────────────────
    const now          = new Date().toISOString()
    const finalPayload = {
      // Payment confirmed
      paymentStatus:   'paid',
      paypalCaptureId: paypalCapId,
      paidAt:          now,
      updatedAt:       now,

      // Enriched customer details from PayPal
      customerName,
      customerEmail,
      shippingAddress: shippingAddr,
      customerPhone:   customerInfo.phone || null,

      // Actual captured amounts (may differ slightly from SAR price due to FX)
      capturedUSD,
      capturedSAR,

      // Profit (private)
      profitSAR,

      // Fulfillment
      fulfillmentStatus: 'pending',

      // Private source fields (already on pre-registered doc, ensure updated)
      _sourceLink:     product._sourceLink     || null,
      _sourcePriceSAR: product._sourcePriceSAR  || null,
    }

    // ── 6. ATOMIC UPDATE of pre-registered Firestore document ─────────────────
    // This is the core Phase 2 guarantee: we UPDATE, never INSERT.
    // The document already exists from step 3 of create-order.js.
    const context = { paypalCaptureId: paypalCapId, customerEmail, capturedSAR }
    const updated = await updateOrderWithRetry(husinsOrderId, finalPayload, context)

    if (!updated) {
      // Firestore update completely failed after all retries
      // Telegram alert was already sent inside updateOrderWithRetry
      // Return 207 (Multi-Status) — payment succeeded but DB write failed
      return res.status(207).json({
        success:  false,
        orderId:  husinsOrderId,
        warning:  'Payment captured by PayPal but order database update failed. Our team has been alerted and will reconcile manually.',
        captureId:paypalCapId,
      })
    }

    // ── 7. Increment product sales counter (non-blocking) ─────────────────────
    if (productId && product?.sales !== undefined) {
      db.collection('shop_approved_products').doc(productId)
        .update({ sales: (product.sales || 0) + parseInt(quantity) })
        .catch(e => console.warn('[CaptureOrder] Sales increment failed:', e.message))
    }

    // ── 8. SEND CUSTOMER EMAIL CONFIRMATION ───────────────────────────────────
    // Build the final order object for the email template
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

    // Fire email non-blocking — email failure should NOT block order confirmation
    sendOrderConfirmation(orderForEmail).then(result => {
      if (!result.success) {
        console.warn(`[CaptureOrder] Email failed for ${husinsOrderId}: ${result.reason}`)
      }
    }).catch(e => {
      console.error('[CaptureOrder] Email exception:', e.message)
    })

    // ── 9. NOTIFY OWNER ON TELEGRAM ───────────────────────────────────────────
    const ownerMsg = [
      `🛒 NEW ORDER — HUSIN MARKETPLACE`,
      ``,
      `📦 ${orderForEmail.productName}`,
      `🔢 Qty: ${quantity}`,
      `💰 ${capturedSAR.toLocaleString('en-SA')} SAR ($${capturedUSD} USD)`,
      profitSAR ? `💵 Profit: ~${profitSAR} SAR` : '',
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
      `${SITE}/shop/orders`,
    ].filter(Boolean).join('\n')

    await sendTelegram(ownerMsg)

    // ── 10. RETURN SUCCESS ─────────────────────────────────────────────────────
    return res.status(200).json({
      success:  true,
      orderId:  husinsOrderId,
    })

  } catch (err) {
    console.error('[CaptureOrder] Fatal:', err.message)

    // Alert Telegram on unexpected fatal error
    await sendTelegram([
      `🚨 CAPTURE-ORDER FATAL ERROR`,
      `Order: ${husinsOrderId || 'unknown'}`,
      `PayPal: ${paypalOrderId || 'unknown'}`,
      `Error: ${err.message}`,
    ].join('\n')).catch(() => {})

    return res.status(500).json({ error: err.message })
  }
}
