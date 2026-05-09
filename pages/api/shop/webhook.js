/**
 * HUSIN ESHOP — POST /api/shop/webhook
 * Receives Telegram callback when owner taps approve ✅ or reject ❌ buttons
 * Decision instantly syncs to Firestore — appears frozen on Dashboard too
 * REGISTER ONCE with Telegram after deployment:
 * https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://www.husin.org/api/shop/webhook
 * Completely separate from all other website sections
 */

import { db }                          from '../../../lib/firebaseAdmin'
import { answerCallback, freezeMessage } from '../../../lib/telegramNotifier'

export default async function handler(req, res) {
  // Always respond 200 immediately — Telegram requires this within 10 seconds
  res.status(200).json({ ok: true })

  if (req.method !== 'POST' || !req.body?.callback_query) return

  const { id: callbackId, data, message, from } = req.body.callback_query

  try {
    // Parse callback data format: "approve_<productId>_<sessionId>"
    const parts     = data.split('_')
    const action    = parts[0]                       // approve | reject
    const sessionId = parts[parts.length - 1]        // last segment
    const productId = parts.slice(1, -1).join('_')   // everything in between

    if (!['approve', 'reject'].includes(action)) return

    const decision  = action === 'approve' ? 'approved' : 'rejected'

    // Get product from Firestore
    const productRef = db
      .collection('shop_search_sessions').doc(sessionId)
      .collection('products').doc(productId)

    const productSnap = await productRef.get()

    if (!productSnap.exists) {
      await answerCallback(callbackId, '⚠️ Product not found', true)
      return
    }

    const product = productSnap.data()

    // Already decided — prevent double action
    if (product.decision !== 'pending') {
      const icon = product.decision === 'approved' ? '✅' : '❌'
      await answerCallback(
        callbackId,
        `⚠️ Already decided: ${icon} ${product.decision}`,
        true
      )
      return
    }

    // ── Write decision to Firestore ──────────────────────────────────────────
    await productRef.update({
      decision,
      decidedAt:   new Date().toISOString(),
      decidedFrom: 'telegram',
      decidedBy:   from?.first_name || 'owner',
    })

    if (decision === 'approved') {
      // ── Publish product to the live marketplace ────────────────────────────
      // Source link and cost are stored with _ prefix — never exposed publicly
      await db.collection('shop_approved_products').doc(productId).set({
        id:                    productId,
        sessionId,
        name:                  product.name,
        image:                 product.image || null,
        sellingPriceSAR:       product.pricing?.sellingPriceSAR,
        sellingPriceFormatted: product.pricing?.sellingPriceFormatted,
        category:              product.category || 'general',
        specifications:        product.specifications || null,
        sourceId:              product.sourceId,
        sourceName:            product.sourceName,
        _sourceLink:           product.sourceLink,      // ← HIDDEN FROM PUBLIC
        _sourcePriceSAR:       product.pricing?.sourcePriceSAR, // ← HIDDEN
        _profitSAR:            product.pricing?.profitSAR,      // ← HIDDEN
        approvedAt:            new Date().toISOString(),
        status:                'live',
        views:                 0,
        sales:                 0,
      })
    } else {
      // ── Save to rejected list ──────────────────────────────────────────────
      await db.collection('shop_rejected_products').doc(productId).set({
        id:         productId,
        sessionId,
        name:       product.name,
        sourceId:   product.sourceId,
        sourceName: product.sourceName,
        rejectedAt: new Date().toISOString(),
      })
    }

    // ── Confirm to owner on Telegram ─────────────────────────────────────────
    const confirmText = decision === 'approved'
      ? '✅ Approved! Product is now LIVE on your marketplace.'
      : '❌ Rejected. Saved to rejected list.'

    await answerCallback(callbackId, confirmText, false)

    // ── Freeze the message buttons so they cannot be tapped again ─────────────
    if (message?.chat?.id && message?.message_id) {
      const originalText = message.text || message.caption || ''
      const frozenSuffix = decision === 'approved'
        ? '\n\n🔒 APPROVED ✅ — LIVE ON STORE'
        : '\n\n🔒 REJECTED ❌'
      try {
        await freezeMessage(
          message.chat.id,
          message.message_id,
          originalText + frozenSuffix,
          decision
        )
      } catch (e) { /* Message may be too old to edit — ignore */ }
    }

  } catch (error) {
    console.error('[ShopWebhook] Error:', error.message)
    try {
      await answerCallback(callbackId, '⚠️ Error occurred. Try from dashboard.', true)
    } catch (e) { /* ignore */ }
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } }
}
