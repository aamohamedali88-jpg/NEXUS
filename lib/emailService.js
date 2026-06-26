import nodemailer from 'nodemailer'

let cachedTransporter = null

function getTransporter() {
  if (cachedTransporter) return cachedTransporter

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_APP_PASSWORD,
    },
  })

  return cachedTransporter
}

const FROM_ALIASES = {
  billing: `"Husin Billing" <${process.env.BILLING_EMAIL}>`,
  support: `"Husin Support" <${process.env.SUPPORT_EMAIL}>`,
  sales:   `"Husin Sales" <${process.env.SALES_EMAIL}>`,
}

export async function sendEmail({ to, subject, html, text, alias = 'support' }) {
  if (!to) {
    console.warn('[EmailService] No recipient — skipping send')
    return { success: false, reason: 'No recipient' }
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD) {
    console.warn('[EmailService] SMTP env vars not configured — skipping email')
    return { success: false, reason: 'SMTP not configured' }
  }

  const from = FROM_ALIASES[alias] || FROM_ALIASES.support

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || undefined,
      replyTo: process.env.SUPPORT_EMAIL,
    })

    console.log(`[EmailService] Sent via ${alias} alias to ${to} — ${info.messageId}`)
    return { success: true, messageId: info.messageId }

  } catch (err) {
    console.error('[EmailService] Send error:', err.message)
    return { success: false, reason: err.message }
  }
}

export async function sendOrderConfirmation(order) {
  const html = buildOrderConfirmationHTML(order)
  const text = buildOrderConfirmationText(order)

  return sendEmail({
    to:      order.customerEmail,
    subject: `✅ Order Confirmed #${order.orderId} — HUSIN`,
    html,
    text,
    alias:   'billing',
  })
}

function buildOrderConfirmationHTML(order) {
  const {
    orderId,
    productName,
    quantity = 1,
    sellingPriceSAR = 0,
    shippingFeeSAR = 0,
    totalChargedSAR = sellingPriceSAR,
    customerName = '',
    shippingAddress = '',
    paidAt = new Date().toISOString(),
  } = order

  const orderDate = new Date(paidAt).toLocaleDateString('en-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const firstName = customerName?.split(' ')?.[0] || 'there'

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0c14;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#0f1117;">
  <div style="background:linear-gradient(135deg,#0a1628,#0f2744);padding:40px 32px;text-align:center;border-bottom:2px solid #c8a46d;">
    <div style="font-size:28px;font-weight:700;color:#c8a46d;letter-spacing:3px;">HUSIN</div>
  </div>
  <div style="background:linear-gradient(135deg,#0d2a1a,#0a3d20);padding:28px 32px;text-align:center;">
    <span style="font-size:48px;display:block;margin-bottom:14px;">✅</span>
    <div style="color:#2ecc71;font-size:20px;font-weight:700;">Order Confirmed</div>
    <div style="color:rgba(255,255,255,0.55);font-size:14px;margin-top:8px;">We're preparing your order for shipment</div>
  </div>
  <div style="padding:28px 32px 0;">
    <p style="color:rgba(255,255,255,0.75);font-size:15px;line-height:1.8;">
      Hi <strong style="color:#c8a46d;">${firstName}</strong>,<br/><br/>
      Thank you for shopping with HUSIN. Your payment has been confirmed and your order is now being processed.
    </p>
  </div>
  <div style="padding:24px 32px;">
    <div style="background:rgba(200,164,109,0.06);border:1px solid rgba(200,164,109,0.2);border-radius:10px;padding:16px 20px;text-align:center;margin-bottom:20px;">
      <span style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1.5px;display:block;margin-bottom:6px;">Order Reference</span>
      <span style="color:#c8a46d;font-size:16px;font-weight:700;font-family:monospace;">${orderId}</span>
    </div>
    <p style="color:rgba(255,255,255,0.35);font-size:12px;text-align:center;">${orderDate}</p>
  </div>
  <div style="padding:0 32px 24px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:14px;color:#fff;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">${productName}</td>
        <td style="padding:14px;color:rgba(255,255,255,0.5);font-size:12px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);">${quantity}</td>
        <td style="padding:14px;color:#c8a46d;font-size:15px;font-weight:700;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">${sellingPriceSAR.toLocaleString('en-SA')} SAR</td>
      </tr>
    </table>
    <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-top:12px;">
      <div style="display:flex;justify-content:space-between;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="color:rgba(255,255,255,0.5);font-size:13px;">Subtotal</span>
        <span style="color:rgba(255,255,255,0.8);font-size:13px;">${sellingPriceSAR.toLocaleString('en-SA')} SAR</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="color:rgba(255,255,255,0.5);font-size:13px;">Shipping Fee</span>
        <span style="color:rgba(255,255,255,0.8);font-size:13px;">${shippingFeeSAR.toLocaleString('en-SA')} SAR</span>
      </div>
      <div style="background:rgba(200,164,109,0.06);padding:14px 16px;display:flex;justify-content:space-between;">
        <span style="color:#fff;font-size:15px;font-weight:700;">Total</span>
        <span style="color:#c8a46d;font-size:18px;font-weight:700;">${totalChargedSAR.toLocaleString('en-SA')} SAR</span>
      </div>
    </div>
  </div>
  ${shippingAddress ? `
  <div style="padding:0 32px 24px;">
    <div style="background:rgba(0,217,255,0.04);border:1px solid rgba(0,217,255,0.12);border-radius:10px;padding:16px 20px;">
      <span style="color:rgba(0,217,255,0.7);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;display:block;margin-bottom:6px;">Delivery Address</span>
      <div style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.7;">${shippingAddress}</div>
    </div>
  </div>
  ` : ''}
  <div style="padding:0 32px 24px;text-align:center;">
    <p style="color:rgba(255,255,255,0.6);font-size:13px;margin-bottom:14px;">Questions? We're here to help</p>
    <a href="mailto:${process.env.SUPPORT_EMAIL}" style="display:inline-block;background:rgba(0,217,255,0.07);border:1px solid rgba(0,217,255,0.2);color:#00d9ff;text-decoration:none;padding:8px 18px;border-radius:8px;font-size:13px;">support@husin.org</a>
  </div>
  <div style="padding:24px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
    <div style="color:#c8a46d;font-size:13px;font-weight:600;margin-bottom:8px;">HUSIN — husin.org</div>
    <div style="color:rgba(255,255,255,0.2);font-size:11px;line-height:1.7;">
      © 2026 HUSIN. All rights reserved.<br/>
      Saudi Arabia
    </div>
  </div>
</div>
</body>
</html>
  `.trim()
}

function buildOrderConfirmationText(order) {
  const { orderId, productName, quantity = 1, sellingPriceSAR = 0, totalChargedSAR, customerName = '', paidAt } = order
  const orderDate = new Date(paidAt || Date.now()).toLocaleDateString('en-SA')

  return [
    `HUSIN — Order Confirmation`,
    ``,
    `Hi ${customerName},`,
    `Your order has been confirmed.`,
    ``,
    `Order ID: ${orderId}`,
    `Date: ${orderDate}`,
    ``,
    `Product: ${productName}`,
    `Quantity: ${quantity}`,
    `Total: ${(totalChargedSAR || sellingPriceSAR)?.toLocaleString('en-SA')} SAR`,
    ``,
    `Support: ${process.env.SUPPORT_EMAIL}`,
    `husin.org`,
  ].join('\n')
}
