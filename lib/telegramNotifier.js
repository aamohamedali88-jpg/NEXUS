/**
 * HUSIN — Telegram Notifier
 * Sends 150 products to owner Telegram with approve/reject inline buttons
 * Decision syncs instantly with Dashboard via Firestore
 *
 * SETUP — Add to Vercel Environment Variables:
 * TELEGRAM_BOT_TOKEN = (from @BotFather)        ← PLACEHOLDER
 * TELEGRAM_CHAT_ID   = (your personal chat id)   ← PLACEHOLDER
 */

const BOT  = process.env.TELEGRAM_BOT_TOKEN   // ← Add in Vercel env vars
const CHAT = process.env.TELEGRAM_CHAT_ID     // ← Add in Vercel env vars
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.husin.org'

// ── Main: send full batch of products ─────────────────────────────────────────
export async function sendBatchToTelegram(products, sessionId, summary) {
  if (!BOT || !CHAT) throw new Error('Telegram credentials missing in Vercel env vars.')

  const now = new Date().toLocaleString('ar-SA', {
    timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short',
  })

  const viable = products.filter(p => p.pricing?.isViable)
  const notViable = products.filter(p => !p.pricing?.isViable)

  // ── Session header ──────────────────────────────────────────────────────────
  await tg([
    `🛒 *HUSIN NEXUS — جلسة بحث جديدة*`,
    ``,
    `📅 ${esc(now)}`,
    `🔍 Query: \`${esc(summary.searchQuery)}\``,
    `📦 إجمالي المنتجات: *${products.length}*`,
    `✅ قابلة للنشر: *${viable.length}*`,
    `⚠️ هامش منخفض: *${notViable.length}*`,
    `🆔 Session: \`${esc(sessionId)}\``,
    ``,
    `_راجع كل منتج واضغط ✅ موافقة أو ❌ رفض_`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ].join('\n'))

  await wait(500)

  // ── Send each viable product with inline approve/reject buttons ─────────────
  let sent = 0
  for (const p of viable) {
    const pricing = p.pricing
    const caption = [
      `${p.pricing.isViable ? '✅' : '⚠️'} *${p.rank}\\. ${esc(p.name)}*`,
      ``,
      `🏪 المصدر: ${esc(p.sourceName)} ${p.sourceFlag || ''}`,
      `💰 سعر المصدر: \`${esc(String(pricing.sourcePriceSAR || '?'))} SAR\``,
      `🏷️ سعر البيع: \`${esc(pricing.sellingPriceFormatted)}\``,
      `💵 ربحك: \`${esc(pricing.profitFormatted)}\` \\(${esc(String(pricing.marginPercent))}%\\)`,
      `📐 الهامش المطبق: ${esc(pricing.markupApplied)}`,
    ].join('\n')

    // Inline buttons — these call our /api/admin/decide endpoint
    const keyboard = {
      inline_keyboard: [[
        { text: '✅ موافقة ونشر', callback_data: `approve_${p.id}_${sessionId}` },
        { text: '❌ رفض', callback_data: `reject_${p.id}_${sessionId}` },
      ]],
    }

    // Send with image if available, otherwise text
    if (p.image) {
      await tgPhoto(p.image, caption, keyboard)
    } else {
      await tgKeyboard(caption, keyboard)
    }

    sent++
    await wait(350) // respect Telegram rate limit (30 msg/sec)

    // Every 25 products, send a separator
    if (sent % 25 === 0 && sent < viable.length) {
      await tg(`━━━━━━━━━━━━━━━━━━━━━━━━━━\n_${sent}/${viable.length} منتج تم إرساله..._`)
      await wait(1000)
    }
  }

  // ── Products with low margin (summary only) ─────────────────────────────────
  if (notViable.length > 0) {
    const skippedLines = notViable.map(p =>
      `• ${esc(p.name.substring(0, 50))} — ${esc(p.pricing?.viabilityNote || 'هامش منخفض')}`
    )
    // Send in chunks of 20
    for (let i = 0; i < skippedLines.length; i += 20) {
      const chunk = skippedLines.slice(i, i + 20)
      await tg([
        `⚠️ *منتجات هامش منخفض \\(${i+1}\\-${Math.min(i+20, skippedLines.length)}/${notViable.length}\\):*`,
        ...chunk,
      ].join('\n'))
      await wait(400)
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  await tg([
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `🔧 [فتح لوحة التحكم](${SITE}/admin/inbox?session=${sessionId})`,
    `🛒 [متجر العملاء](${SITE}/marketplace)`,
    ``,
    `_يمكنك الموافقة من هنا على التليجرام أو من لوحة التحكم\\. قرارك يظهر تلقائيًا في كلا المكانين\\._`,
  ].join('\n'))

  return { sent, notViable: notViable.length }
}

// ── Notify when user makes a purchase ─────────────────────────────────────────
export async function notifyNewOrder(order) {
  if (!BOT || !CHAT) return
  await tg([
    `🛒 *طلب شراء جديد\\!*`,
    ``,
    `📦 المنتج: \`${esc(order.productName)}\``,
    `💰 المبلغ: \`${esc(String(order.amount))} SAR\``,
    `👤 العميل: ${esc(order.customerName || 'مجهول')}`,
    `📧 الإيميل: \`${esc(order.customerEmail)}\``,
    `🆔 رقم الطلب: \`${esc(order.orderId)}\``,
    `🔗 مصدر المنتج: [رابط المصدر](${order.sourceLink})`,
    ``,
    `_اذهب للمصدر وأكمل الطلب للعميل\\._`,
    `🔧 [لوحة الطلبات](${SITE}/admin/orders)`,
  ].join('\n'))
}

// ── Telegram API helpers ──────────────────────────────────────────────────────
async function tg(text) {
  return tgPost('sendMessage', { chat_id: CHAT, text, parse_mode: 'MarkdownV2', disable_web_page_preview: true })
}

async function tgKeyboard(text, reply_markup) {
  return tgPost('sendMessage', { chat_id: CHAT, text, parse_mode: 'MarkdownV2', reply_markup, disable_web_page_preview: true })
}

async function tgPhoto(photo, caption, reply_markup) {
  try {
    return await tgPost('sendPhoto', { chat_id: CHAT, photo, caption, parse_mode: 'MarkdownV2', reply_markup })
  } catch (e) {
    // If photo fails, fallback to text
    return tgKeyboard(caption, reply_markup)
  }
}

async function tgPost(method, body) {
  const url = `https://api.telegram.org/bot${BOT}/${method}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const d = await res.json()
  if (!d.ok) {
    console.error(`[Telegram] ${method} error:`, d.description, '| Text preview:', String(body.text || body.caption || '').substring(0, 100))
  }
  return d
}

// ── Answer callback query (when owner taps button on Telegram) ─────────────────
export async function answerCallback(callbackQueryId, text, alert = false) {
  return tgPost('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: alert,
  })
}

// ── Edit message to show frozen state after decision ──────────────────────────
export async function freezeMessage(chatId, messageId, originalText, decision) {
  const icon = decision === 'approved' ? '✅ تمت الموافقة' : '❌ تم الرفض'
  const frozenText = `${originalText}\n\n🔒 *${esc(icon)}*`
  return tgPost('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: frozenText,
    parse_mode: 'MarkdownV2',
  })
}

function esc(t) {
  if (!t) return ''
  return String(t)
    .replace(/\\/g,'\\\\').replace(/\./g,'\\.').replace(/!/g,'\\!')
    .replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/\[/g,'\\[')
    .replace(/\]/g,'\\]').replace(/\-/g,'\\-').replace(/\_/g,'\\_')
    .replace(/\*/g,'\\*').replace(/\~/g,'\\~').replace(/\`/g,'\\`')
    .replace(/\>/g,'\\>').replace(/\#/g,'\\#').replace(/\+/g,'\\+')
    .replace(/\=/g,'\\=').replace(/\|/g,'\\|').replace(/\{/g,'\\{')
    .replace(/\}/g,'\\}')
}

const wait = ms => new Promise(r => setTimeout(r, ms))
