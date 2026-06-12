/**
 * HUSIN ESHOP — POST /api/shop/webhook
 * UPDATED: Handles both old shop_session_ format AND new job_ format
 * REGISTER THIS URL with Telegram:
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

      // Parse callback_data format: "approve_<productId>_<sessionId>"
      // productId = prod_TIMESTAMP_RANDOM
      // sessionId = job_TIMESTAMP (new) or shop_session_TIMESTAMP (old)
      const firstUnderscore = data.indexOf('_')
      const action = data.substring(0, firstUnderscore) // "approve" or "reject"

      if (!['approve', 'reject'].includes(action)) return

      const rest = data.substring(firstUnderscore + 1)

      // Parse: find sessionId — it starts with "job_" (new) or "shop_session_" (old)
      let productId, sessionId

      if (rest.includes('_job_')) {
        // New format: prod_TIMESTAMP_RANDOM_job_TIMESTAMP
        const jobIdx = rest.lastIndexOf('_job_')
        productId = rest.substring(0, jobIdx)
        sessionId = rest.substring(jobIdx + 1) // "job_TIMESTAMP"
      } else if (rest.includes('shop_session_')) {
        // Old format: prod_123_shop_session_456
        const sessionStart = rest.indexOf('shop_session_')
        productId = rest.substring(0, sessionStart - 1)
        sessionId = rest.substring(sessionStart)
      } else {
        // Fallback: last segment after final underscore group
        const parts = rest.split('_')
        sessionId = parts.slice(-2).join('_')
        productId = parts.slice(0, -2).join('_')
      }

      const decision = action === 'approve' ? 'approved' : 'rejected'

      console.log(`[Webhook] ${decision} — product: ${productId} session: ${sessionId}`)

      // Try to find product in shop_search_sessions (both old and new jobs)
      const productRef = db
        .collection('shop_search_sessions').doc(sessionId)
        .collection('products').doc(productId)

      const productSnap = await productRef.get()

      if (!productSnap.exists) {
        // Try direct from shop_approved_products (pending)
        const directRef  = db.collection('shop_approved_products').doc(productId)
        const directSnap = await directRef.get()
        if (!directSnap.exists) {
          await tgAnswer(callbackId, '⚠️ Product not found. Try from inbox.', true)
          return
        }
        // Handle from direct doc
        const product = directSnap.data()
        if (product.status === 'live') {
          await tgAnswer(callbackId, '✅ Already approved and live!', true)
          return
        }
        if (product.status === 'rejected') {
          await tgAnswer(callbackId, '❌ Already rejected.', true)
          return
        }

        if (decision === 'approved') {
          await directRef.update({ status: 'live', approvedAt: new Date().toISOString() })
          await tgAnswer(callbackId, '✅ Approved! Product is now LIVE on your marketplace.', false)
        } else {
          await directRef.update({ status: 'rejected', rejectedAt: new Date().toISOString() })
          await db.collection('shop_rejected_products').doc(productId).set({
            ...product,
            rejectedAt: new Date().toISOString(),
          })
          await tgAnswer(callbackId, '❌ Rejected.', false)
        }

        if (message?.chat?.id && message?.message_id) {
          await tgEditButtons(message.chat.id, message.message_id)
        }
        return
      }

      const product = productSnap.data()

      // Already decided
      if (product.decision && product.decision !== 'pending') {
        const icon = product.decision === 'approved' ? '✅' : '❌'
        await tgAnswer(callbackId, `Already ${product.decision} ${icon}`, true)
        return
      }

      // Write decision to session
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
          additionalImages:      product.additionalImages || [],
          sellingPriceSAR:       product.pricing?.sellingPriceSAR   || product.sellingPriceSAR  || null,
          sellingPriceFormatted: product.pricing?.sellingPriceFormatted || product.sellingPriceFormatted || 'Price on request',
          category:              product.category || 'general',
          specifications:        product.specifications || product.condition || null,
          aspects:               product.aspects || [],
          condition:             product.condition || 'New',
          brand:                 product.brand  || null,
          color:                 product.color  || null,
          size:                  product.size   || null,
          qualityScore:          product.qualityScore || 60,
          sourceId:              product.sourceId  || 'ebay',
          sourceName:            product.sourceName || 'eBay',
          _sourceLink:           product.sourceLink || product._sourceLink || '',
          _sourcePriceSAR:       product.pricing?.sourcePriceSAR || product._sourcePriceSAR || null,
          _profitSAR:            product.pricing?.profitSAR      || product._profitSAR      || null,
          approvedAt:            new Date().toISOString(),
          status:                'live',
          views:                 0,
          sales:                 0,
        }, { merge: true })

        await tgAnswer(callbackId, '✅ Approved! Product is now LIVE on your marketplace.', false)
      } else {
        // Save to rejected
        await db.collection('shop_rejected_products').doc(productId).set({
          id:         productId,
          sessionId,
          name:       product.name,
          sourceId:   product.sourceId   || 'ebay',
          sourceName: product.sourceName || 'eBay',
          rejectedAt: new Date().toISOString(),
        })

        // Also update status in shop_approved_products if it exists
        db.collection('shop_approved_products').doc(productId)
          .update({ status: 'rejected', rejectedAt: new Date().toISOString() })
          .catch(() => {})

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
