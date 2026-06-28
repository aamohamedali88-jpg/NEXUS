/**
 * HUSIN ESHOP — Telegram Notifier
 * Sends product search results to owner Telegram
 * With approve ✅ / reject ❌ inline buttons on each product
 * Fixed version — handles escaping errors gracefully
 *
 * Vercel Environment Variables needed:
 * TELEGRAM_BOT_TOKEN = your full bot token from @BotFather
 * TELEGRAM_CHAT_ID   = your personal chat ID (8593274488)
 */

const BOT  = process.env.TELEGRAM_BOT_TOKEN
const CHAT = process.env.TELEGRAM_CHAT_ID
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.husin.org'

// ── Send full batch to Telegram ────────────────────────────────────────────────
export async function sendBatchToTelegram(products, sessionId, summary) {
  if (!BOT || !CHAT) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing in Vercel env vars')
  }

  const viable    = products.filter(p => p.pricing?.isViable)
  const notViable = products.filter(p => !p.pricing?.isViable)
  const now       = new Date().toLocaleString('en-SA', {
    timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short',
  })

  // ── Header message ─────────────────────────────────────────────────────────
  await tgSimple([
    `🛒 HUSIN NEXUS — New Search Session`,
    ``,
    `📅 ${now} (Riyadh)`,
    `🔍 Query: ${summary.searchQuery || 'trending products'}`,
    `📦 Total found: ${products.length}`,
    `✅ Viable (good margin): ${viable.length}`,
    `⚠️ Low margin (skipped): ${notViable.length}`,
    `🆔 Session: ${sessionId}`,
    ``,
    `Review each product below and tap ✅ Approve or ❌ Reject`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
  ].join('\n'))

  await wait(600)

  // ── Send each viable product ───────────────────────────────────────────────
  let sent = 0
  for (const p of viable) {
    const pricing = p.pricing || {}

    // Build simple plain text (no MarkdownV2 to avoid escaping issues)
    const text = [
      `${p.rank}. ${p.name}`,
      ``,
      `🏪 Source: ${p.sourceName} ${p.sourceFlag || ''}`,
      `💰 Source Price: ${pricing.sourcePriceSAR ? pricing.sourcePriceSAR + ' SAR' : 'N/A'}`,
      `🏷️ Your Sell Price: ${pricing.sellingPriceFormatted || 'N/A'}`,
      `💵 Your Profit: ${pricing.profitFormatted || 'N/A'} (${pricing.marginPercent || 0}%)`,
      `🔗 ${p.sourceLink || 'No link'}`,
    ].join('\n')

    // Inline approve/reject keyboard
    const keyboard = {
      inline_keyboard: [[
        { text: '✅ Approve & Publish', callback_data: `approve_${p.id}_${sessionId}` },
        { text: '❌ Reject',            callback_data: `reject_${p.id}_${sessionId}` },
      ]],
    }

    // Try with photo first, fallback to text
    if (p.image) {
      const photoResult = await tgPhoto(p.image, text, keyboard)
      if (!photoResult.ok) {
        await tgKeyboard(text, keyboard)
      }
    } else {
      await tgKeyboard(text, keyboard)
    }

    sent++
    await wait(400) // Telegram rate limit: max ~30 msg/sec

    // Progress separator every 20 products
    if (sent % 20 === 0 && sent < viable.length) {
      await tgSimple(`━━━━━━━━━━━━━━━━━━━━━━\n${sent}/${viable.length} products sent...`)
      await wait(800)
    }
  }

  // ── Low margin summary ─────────────────────────────────────────────────────
  if (notViable.length > 0) {
    const lines = notViable.slice(0, 30).map(p =>
      `• ${p.name?.substring(0, 50) || 'Unknown'} — ${p.pricing?.viabilityNote || 'Low margin'}`
    )
    await tgSimple([
      `⚠️ ${notViable.length} products skipped (low margin):`,
      ...lines,
      notViable.length > 30 ? `...and ${notViable.length - 30} more` : '',
    ].filter(Boolean).join('\n'))
    await wait(400)
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  await tgSimple([
    `━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `✅ Done! ${sent} products sent.`,
    ``,
    `Open inbox to review: ${SITE}/shop/inbox`,
    `Live store: ${SITE}/marketplace`,
  ].join('\n'))

  return { sent, skipped: notViable.length }
}

// ── Notify owner of new customer order ────────────────────────────────────────
export async function notifyNewOrder(order) {
  if (!BOT || !CHAT) return
  await tgSimple([
    `🛒 NEW ORDER RECEIVED!`,
    ``,
    `📦 Product: ${order.productName}`,
    `💰 Amount: ${order.amount} SAR`,
    `👤 Customer: ${order.customerName || 'Anonymous'}`,
    `📧 Email: ${order.customerEmail}`,
    `🆔 Order ID: ${order.orderId}`,
    ``,
    `Go to source and fulfill the order:`,
    `${order.sourceLink}`,
    ``,
    `Admin orders: ${SITE}/shop/orders`,
  ].join('\n'))
}

// ── Notify owner of a refund / store-credit issuance ──────────────────────────
export async function notifyRefund({ email, amount, reason, orderId, newBalance }) {
  if (!BOT || !CHAT) return
  await tgSimple([
    `💳 REFUND ISSUED — STORE CREDIT`,
    ``,
    `📧 Customer: ${email}`,
    `💰 Amount credited: ${amount} SAR`,
    `📦 Order: ${orderId || 'N/A'}`,
    `📝 Reason: ${reason || 'Not specified'}`,
    `🏦 New wallet balance: ${newBalance} SAR`,
    ``,
    `No payment-gateway reversal was attempted — credited to HUSIN wallet only.`,
  ].join('\n'))
}

// ── Answer Telegram callback query ────────────────────────────────────────────
export async function answerCallback(callbackQueryId, text, showAlert = false) {
  return tgPost('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  })
}

// ── Freeze message after decision ─────────────────────────────────────────────
export async function freezeMessage(chatId, messageId, originalText, decision) {
  const suffix = decision === 'approved'
    ? '\n\n🔒 APPROVED ✅ — LIVE ON STORE'
    : '\n\n🔒 REJECTED ❌'

  // Try editing the reply markup first (remove buttons)
  try {
    await tgPost('editMessageReplyMarkup', {
      chat_id:      chatId,
      message_id:   messageId,
      reply_markup: { inline_keyboard: [] }, // empty = no buttons
    })
  } catch (e) {
    // If can't remove buttons, try editing text
    try {
      await tgPost('editMessageText', {
        chat_id:    chatId,
        message_id: messageId,
        text:       (originalText || '').substring(0, 3800) + suffix,
      })
    } catch (e2) { /* message too old — ignore */ }
  }
}

// ── Telegram API helpers ──────────────────────────────────────────────────────
async function tgSimple(text) {
  return tgPost('sendMessage', {
    chat_id:                  CHAT,
    text:                     text.substring(0, 4096),
    disable_web_page_preview: true,
  })
}

async function tgKeyboard(text, reply_markup) {
  return tgPost('sendMessage', {
    chat_id:                  CHAT,
    text:                     text.substring(0, 4096),
    reply_markup,
    disable_web_page_preview: true,
  })
}

async function tgPhoto(photo, caption, reply_markup) {
  return tgPost('sendPhoto', {
    chat_id:    CHAT,
    photo,
    caption:    caption.substring(0, 1024),
    reply_markup,
  })
}

async function tgPost(method, body) {
  try {
    const url = `https://api.telegram.org/bot${BOT}/${method}`
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10000),
    })
    const data = await res.json()
    if (!data.ok) {
      console.error(`[Telegram] ${method} failed:`, data.description)
    }
    return data
  } catch (e) {
    console.error(`[Telegram] ${method} error:`, e.message)
    return { ok: false, description: e.message }
  }
}

const wait = ms => new Promise(r => setTimeout(r, ms))
