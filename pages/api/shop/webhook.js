/**
 * HUSIN ESHOP — POST /api/shop/webhook
 * FIXED: Properly handles Telegram callback_query from approve/reject buttons
 * REGISTER THIS URL with Telegram after deployment:
 * https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://www.husin.org/api/shop/webhook
 */

import { db } from '../../../lib/firebaseAdmin'

const BOT  = process.env.TELEGRAM_BOT_TOKEN
const CHAT = process.env.TELEGRAM_CHAT_ID

async function tgAnswer(callbackQueryId, text, alert = false) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT}/answerCallbackQuery`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: alert,
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (e) { /* ignore */ }
}

async function tgEditButtons(chatId, messageId) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT}/editMessageReplyMarkup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:      chatId,
        message_id:   messageId,
        reply_markup: { inline_keyboard: [] },
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (e) { /* ignore */ }
}

export default async function handler(req, res) {
  // Always respond 200 immediately to Telegram
  res.status(200).json({ ok: true })

  if (req.method !== 'POST') return

  const body = req.body
  if (!body) return

  // Handle inline button taps
  if (body.callback_query) {
    const { id: callbackId, data, message, from } = body.callback_query

    try {
      if (!data) return

      // Parse: "approve_prod_123_shop_session_456" or "reject_prod_123_shop_session_456"
      const firstUnderscore = data.indexOf('_')
      const action = data.substring(0, firstUnderscore) // "approve" or "reject"

      if (!['approve', 'reject'].includes(action)) return

      // Rest is "prod_123_shop_session_456"
      // sessionId always starts with "shop_session_"
      const rest           = data.substring(firstUnderscore + 1)
      const sessionStart   = rest.indexOf('shop_session_')
      const productId      = rest.substring(0, sessionStart - 1) // remove trailing _
      const sessionId      = rest.substring(sessionStart)

      const decision = action === 'approve' ? 'approved' : 'rejected'

      console.log(`[Webhook] ${decision} — product: ${productId} session: ${sessionId}`)

      // Get product from Firestore
      const productRef = db
        .collection('shop_search_sessions').doc(sessionId)
        .collection('products').doc(productId)

      const productSnap = await productRef.get()

      if (!productSnap.exists) {
        await tgAnswer(callbackId, '⚠️ Product not found', true)
        return
      }

      const product = productSnap.data()

      // Already decided
      if (product.decision !== 'pending') {
        const icon = product.decision === 'approved' ? '✅' : '❌'
        await tgAnswer(callbackId, `Already ${product.decision} ${icon}`, true)
        return
      }

      // Write decision
      await productRef.update({
        decision,
        decidedAt:   new Date().toISOString(),
        decidedFrom: 'telegram',
        decidedBy:   from?.first_name || 'owner',
      })

      if (decision === 'approved') {
        // Publish to live marketplace
        await db.collection('shop_approved_products').doc(productId).set({
          id:                    productId,
          sessionId,
          name:                  product.name,
          image:                 product.image   || null,
          sellingPriceSAR:       product.pricing?.sellingPriceSAR   || null,
          sellingPriceFormatted: product.pricing?.sellingPriceFormatted || 'Price on request',
          category:              product.category || 'general',
          specifications:        product.specifications || null,
          sourceId:              product.sourceId,
          sourceName:            product.sourceName,
          _sourceLink:           product.sourceLink,
          _sourcePriceSAR:       product.pricing?.sourcePriceSAR || null,
          _profitSAR:            product.pricing?.profitSAR      || null,
          approvedAt:            new Date().toISOString(),
          status:                'live',
          views:                 0,
          sales:                 0,
        })
        await tgAnswer(callbackId, '✅ Approved! Product is now LIVE on your marketplace.', false)
      } else {
        // Save to rejected list
        await db.collection('shop_rejected_products').doc(productId).set({
          id:         productId,
          sessionId,
          name:       product.name,
          sourceId:   product.sourceId,
          sourceName: product.sourceName,
          rejectedAt: new Date().toISOString(),
        })
        await tgAnswer(callbackId, '❌ Rejected.', false)
      }

      // Remove buttons from message (freeze it)
      if (message?.chat?.id && message?.message_id) {
        await tgEditButtons(message.chat.id, message.message_id)
      }

    } catch (error) {
      console.error('[Webhook] Error:', error.message)
      try {
        await tgAnswer(body.callback_query.id, '⚠️ Error. Try from inbox.', true)
      } catch (e) { /* ignore */ }
    }
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } }
}
