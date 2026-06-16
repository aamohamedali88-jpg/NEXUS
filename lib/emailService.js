/**
 * HUSIN NEXUS — lib/emailService.js
 * Transactional email engine — Resend API (primary) with SendGrid fallback
 *
 * Setup:
 *   1. Sign up at resend.com (free: 3,000 emails/month, 100/day)
 *   2. Add your domain husin.org under Domains → verify DNS
 *   3. Create API key → add to Vercel as EMAIL_API_KEY
 *   4. Set EMAIL_FROM in Vercel as: orders@husin.org
 *
 * Environment variables required in Vercel:
 *   EMAIL_API_KEY   — Resend API key (re_xxxxxxxxxx)
 *   EMAIL_FROM      — Verified sender: orders@husin.org
 */

const RESEND_API = 'https://api.resend.com/emails'
const USD_TO_SAR = 3.75

// ── Arabic Order Confirmation Email Template ──────────────────────────────────
function buildOrderConfirmationHTML(order) {
  const {
    orderId,
    productName,
    quantity        = 1,
    sellingPriceSAR = 0,
    customerName    = '',
    shippingAddress = '',
    paidAt          = new Date().toISOString(),
  } = order

  const orderDate = new Date(paidAt).toLocaleDateString('ar-SA', {
    year:    'numeric',
    month:   'long',
    day:     'numeric',
    timeZone:'Asia/Riyadh',
  })

  const orderTime = new Date(paidAt).toLocaleTimeString('ar-SA', {
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'Asia/Riyadh',
  })

  const firstName = customerName?.split(' ')?.[0] || 'عزيزنا'

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>تأكيد طلبك — HUSIN</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #0a0c14;
      font-family: 'Noto Sans Arabic', 'Arial', sans-serif;
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0f1117;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #0a1628 0%, #0f2744 100%);
      padding: 40px 32px;
      text-align: center;
      border-bottom: 2px solid #c8a46d;
    }
    .header-logo-text {
      font-size: 28px;
      font-weight: 700;
      color: #c8a46d;
      letter-spacing: 3px;
      margin-bottom: 4px;
    }
    .header-tagline {
      color: rgba(255,255,255,0.45);
      font-size: 12px;
      letter-spacing: 1px;
    }

    /* Success banner */
    .success-banner {
      background: linear-gradient(135deg, #0d2a1a, #0a3d20);
      border-top: 1px solid rgba(46,204,113,0.3);
      border-bottom: 1px solid rgba(46,204,113,0.3);
      padding: 28px 32px;
      text-align: center;
    }
    .success-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 14px;
    }
    .success-title {
      color: #2ecc71;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .success-sub {
      color: rgba(255,255,255,0.55);
      font-size: 14px;
      line-height: 1.7;
    }

    /* Greeting */
    .greeting {
      padding: 28px 32px 0;
    }
    .greeting p {
      color: rgba(255,255,255,0.75);
      font-size: 15px;
      line-height: 1.8;
    }
    .greeting strong {
      color: #c8a46d;
    }

    /* Order details section */
    .section {
      padding: 24px 32px;
    }
    .section-title {
      color: rgba(255,255,255,0.4);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Order ID box */
    .order-id-box {
      background: rgba(200,164,109,0.06);
      border: 1px solid rgba(200,164,109,0.2);
      border-radius: 10px;
      padding: 16px 20px;
      text-align: center;
      margin-bottom: 20px;
    }
    .order-id-label {
      color: rgba(255,255,255,0.4);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      display: block;
      margin-bottom: 6px;
    }
    .order-id-value {
      color: #c8a46d;
      font-size: 16px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
      direction: ltr;
      display: block;
    }

    /* Product table */
    .product-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .product-table th {
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.4);
      font-size: 11px;
      font-weight: 600;
      padding: 10px 14px;
      text-align: right;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .product-table td {
      padding: 14px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      vertical-align: top;
    }
    .product-name {
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.5;
    }
    .product-qty {
      color: rgba(255,255,255,0.5);
      font-size: 12px;
      text-align: center;
    }
    .product-price {
      color: #c8a46d;
      font-size: 15px;
      font-weight: 700;
      text-align: left;
      direction: ltr;
      white-space: nowrap;
    }

    /* Price summary */
    .price-summary {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      overflow: hidden;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 11px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .price-row:last-child { border-bottom: none; }
    .price-row-label {
      color: rgba(255,255,255,0.5);
      font-size: 13px;
    }
    .price-row-value {
      color: rgba(255,255,255,0.8);
      font-size: 13px;
      font-weight: 500;
      direction: ltr;
    }
    .price-total-row {
      background: rgba(200,164,109,0.06);
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .price-total-label {
      color: #fff;
      font-size: 15px;
      font-weight: 700;
    }
    .price-total-value {
      color: #c8a46d;
      font-size: 18px;
      font-weight: 700;
      direction: ltr;
    }

    /* Shipping box */
    .shipping-box {
      background: rgba(0,217,255,0.04);
      border: 1px solid rgba(0,217,255,0.12);
      border-radius: 10px;
      padding: 16px 20px;
    }
    .shipping-label {
      color: rgba(0,217,255,0.7);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      display: block;
      margin-bottom: 6px;
    }
    .shipping-address {
      color: rgba(255,255,255,0.75);
      font-size: 14px;
      line-height: 1.7;
    }

    /* Timeline */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .timeline-item {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .timeline-item:last-child { border-bottom: none; }
    .timeline-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .dot-done   { background: rgba(46,204,113,0.12);  border: 1px solid rgba(46,204,113,0.25);  }
    .dot-active { background: rgba(0,217,255,0.1);    border: 1px solid rgba(0,217,255,0.25);   }
    .dot-soon   { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);  }
    .timeline-text h4 {
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .timeline-text p {
      color: rgba(255,255,255,0.45);
      font-size: 12px;
      line-height: 1.6;
    }

    /* Support */
    .support-section {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 20px 24px;
      text-align: center;
    }
    .support-title {
      color: rgba(255,255,255,0.6);
      font-size: 13px;
      margin-bottom: 14px;
    }
    .support-links {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .support-link {
      display: inline-block;
      background: rgba(0,217,255,0.07);
      border: 1px solid rgba(0,217,255,0.2);
      color: #00d9ff !important;
      text-decoration: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
    }

    /* Footer */
    .email-footer {
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .footer-brand {
      color: #c8a46d;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .footer-legal {
      color: rgba(255,255,255,0.2);
      font-size: 11px;
      line-height: 1.7;
    }
    .footer-legal a {
      color: rgba(255,255,255,0.35) !important;
      text-decoration: none;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .header    { padding: 28px 20px; }
      .section   { padding: 20px 20px; }
      .greeting  { padding: 20px 20px 0; }
      .support-links { flex-direction: column; align-items: center; }
    }
  </style>
</head>
<body>
<div class="wrapper">

  <!-- Header -->
  <div class="header">
    <div class="header-logo-text">HUSIN</div>
    <div class="header-tagline">HYPER UNIFIED SPACETIME INTEGRATION NEXUS</div>
  </div>

  <!-- Success Banner -->
  <div class="success-banner">
    <span class="success-icon">✅</span>
    <div class="success-title">تم استلام طلبتكم بنجاح</div>
    <div class="success-sub">
      جاري التجهيز للتعبئة والشحن إلى عنوانكم في المملكة العربية السعودية
    </div>
  </div>

  <!-- Greeting -->
  <div class="greeting">
    <p>
      السلام عليكم <strong>${firstName}</strong>،
      <br /><br />
      شكرًا لثقتكم بـ <strong>HUSIN</strong>. تأكيد هذا البريد الإلكتروني يُفيد بأن دفعتكم تمت بنجاح
      وأن طلبكم قيد التجهيز الآن. ستتلقون رسالة أخرى فور شحن طلبكم مع رقم التتبع.
    </p>
  </div>

  <!-- Order ID -->
  <div class="section">
    <div class="section-title">🆔 &nbsp; Order Reference — الرقم المرجعي للطلب</div>
    <div class="order-id-box">
      <span class="order-id-label">رقم الطلب</span>
      <span class="order-id-value">${orderId}</span>
    </div>
    <p style="color:rgba(255,255,255,0.35);font-size:12px;text-align:center;">
      ${orderDate} — ${orderTime} (توقيت الرياض)
    </p>
  </div>

  <!-- Product Details -->
  <div class="section" style="padding-top:0">
    <div class="section-title">📦 &nbsp; Order Details — تفاصيل الطلب</div>
    <table class="product-table">
      <thead>
        <tr>
          <th>المنتج</th>
          <th style="text-align:center;width:60px">الكمية</th>
          <th style="text-align:left;width:120px">السعر</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="product-name">${productName}</div>
          </td>
          <td class="product-qty">${quantity}</td>
          <td class="product-price">${sellingPriceSAR.toLocaleString('en-SA')} SAR</td>
        </tr>
      </tbody>
    </table>

    <!-- Price summary -->
    <div class="price-summary">
      <div class="price-row">
        <span class="price-row-label">المجموع الفرعي</span>
        <span class="price-row-value">${sellingPriceSAR.toLocaleString('en-SA')} SAR</span>
      </div>
      <div class="price-row">
        <span class="price-row-label">الشحن والتوصيل</span>
        <span class="price-row-value" style="color:#2ecc71">مجاني</span>
      </div>
      <div class="price-total-row">
        <span class="price-total-label">الإجمالي الكلي</span>
        <span class="price-total-value">${sellingPriceSAR.toLocaleString('en-SA')} SAR</span>
      </div>
    </div>
  </div>

  <!-- Shipping Address -->
  ${shippingAddress ? `
  <div class="section" style="padding-top:0">
    <div class="section-title">📍 &nbsp; Delivery Address — عنوان التوصيل</div>
    <div class="shipping-box">
      <span class="shipping-label">يُشحن إلى</span>
      <div class="shipping-address">${shippingAddress}</div>
    </div>
  </div>
  ` : ''}

  <!-- Fulfillment Timeline -->
  <div class="section" style="padding-top:0">
    <div class="section-title">🚀 &nbsp; What Happens Next — ماذا سيحدث الآن</div>
    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-dot dot-done">✅</div>
        <div class="timeline-text">
          <h4>تأكيد الدفع</h4>
          <p>تمت معالجة دفعتكم بنجاح عبر PayPal — ${orderDate}</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot dot-active">⚙️</div>
        <div class="timeline-text">
          <h4>تجهيز الطلب</h4>
          <p>فريقنا يعمل الآن على توريد منتجكم من المورد وتجهيزه للشحن خلال 24–48 ساعة</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot dot-soon">🚚</div>
        <div class="timeline-text">
          <h4>الشحن الدولي</h4>
          <p>سيصل طلبكم خلال <strong style="color:rgba(255,255,255,0.75)">7–21 يوم عمل</strong> من تاريخ التأكيد</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot dot-soon">🏠</div>
        <div class="timeline-text">
          <h4>التسليم</h4>
          <p>ستتلقون إشعارًا فور وصول شحنتكم إلى المملكة مع رقم التتبع</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Support -->
  <div class="section" style="padding-top:0">
    <div class="support-section">
      <p class="support-title">هل لديك استفسار؟ فريقنا جاهز لمساعدتك</p>
      <div class="support-links">
        <a href="mailto:support@husin.org" class="support-link">📧 support@husin.org</a>
        <a href="https://www.husin.org/returns" class="support-link">↩️ سياسة الإرجاع</a>
        <a href="https://www.husin.org/marketplace" class="support-link">🛒 تسوق أكثر</a>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="email-footer">
    <div class="footer-brand">HUSIN Nexus — husin.org</div>
    <div class="footer-legal">
      هذا البريد الإلكتروني أُرسل تلقائيًا عند اكتمال طلبكم.<br />
      يُرجى عدم الرد على هذا البريد مباشرةً — للدعم راسلونا على support@husin.org<br /><br />
      <a href="https://www.husin.org/privacy">سياسة الخصوصية</a>
      &nbsp;·&nbsp;
      <a href="https://www.husin.org/terms">الشروط والأحكام</a>
      &nbsp;·&nbsp;
      <a href="https://www.husin.org/returns">الاسترجاع والاستبدال</a>
      <br /><br />
      © 2026 HUSIN Nexus · المملكة العربية السعودية
    </div>
  </div>

</div>
</body>
</html>
  `.trim()
}

// ── Plain text fallback (for clients that don't render HTML) ──────────────────
function buildOrderConfirmationText(order) {
  const { orderId, productName, quantity = 1, sellingPriceSAR = 0, customerName = '', paidAt } = order
  const orderDate = new Date(paidAt || Date.now()).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' })

  return [
    `HUSIN NEXUS — تأكيد الطلب`,
    ``,
    `تم استلام طلبتكم بنجاح، ${customerName}`,
    ``,
    `رقم الطلب: ${orderId}`,
    `التاريخ: ${orderDate}`,
    ``,
    `المنتج: ${productName}`,
    `الكمية: ${quantity}`,
    `الإجمالي: ${sellingPriceSAR?.toLocaleString('en-SA')} SAR`,
    ``,
    `الشحن: مجاني — يصل خلال 7–21 يوم عمل`,
    ``,
    `للدعم: support@husin.org`,
    `husin.org`,
  ].join('\n')
}

// ── Main send function ────────────────────────────────────────────────────────
export async function sendOrderConfirmation(order) {
  const API_KEY  = process.env.EMAIL_API_KEY
  const FROM     = process.env.EMAIL_FROM || 'orders@husin.org'

  if (!API_KEY) {
    console.warn('[EmailService] EMAIL_API_KEY not set — skipping email')
    return { success: false, reason: 'EMAIL_API_KEY not configured' }
  }

  if (!order.customerEmail) {
    console.warn('[EmailService] No customer email on order', order.orderId)
    return { success: false, reason: 'No customer email' }
  }

  const html    = buildOrderConfirmationHTML(order)
  const text    = buildOrderConfirmationText(order)
  const subject = `✅ تأكيد طلبك #${order.orderId} — HUSIN Marketplace`

  try {
    const res = await fetch(RESEND_API, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    FROM,
        to:      [order.customerEmail],
        subject,
        html,
        text,
        reply_to:'support@husin.org',
        tags: [
          { name: 'category', value: 'order_confirmation' },
          { name: 'order_id', value: order.orderId },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[EmailService] Resend API error:', data)
      return { success: false, reason: data.message || `HTTP ${res.status}` }
    }

    console.log(`[EmailService] ✅ Email sent to ${order.customerEmail} — ID: ${data.id}`)
    return { success: true, emailId: data.id }

  } catch (err) {
    console.error('[EmailService] Send error:', err.message)
    return { success: false, reason: err.message }
  }
}
