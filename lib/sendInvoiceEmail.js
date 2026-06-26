import { sendEmail } from './emailService'

function buildInvoiceHTML(order) {
  const {
    orderId,
    productName,
    quantity = 1,
    sellingPriceSAR = 0,
    shippingFeeSAR = 0,
    totalChargedSAR,
    customerName = '',
    customerEmail = '',
    shippingAddress = '',
    paidAt = new Date().toISOString(),
  } = order

  const total = totalChargedSAR || (sellingPriceSAR + shippingFeeSAR)
  const invoiceDate = new Date(paidAt).toLocaleDateString('en-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;color:#222;">
<div style="max-width:600px;margin:0 auto;padding:40px 32px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #c8a46d;padding-bottom:20px;margin-bottom:30px;">
    <div>
      <div style="font-size:24px;font-weight:700;color:#0a1628;letter-spacing:2px;">HUSIN</div>
      <div style="font-size:11px;color:#888;margin-top:4px;">husin.org</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:700;color:#0a1628;">INVOICE</div>
      <div style="font-size:12px;color:#888;margin-top:4px;">${invoiceDate}</div>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:30px;">
    <div>
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Bill To</div>
      <div style="font-size:14px;font-weight:600;">${customerName}</div>
      <div style="font-size:13px;color:#555;">${customerEmail}</div>
      <div style="font-size:13px;color:#555;">${shippingAddress}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Invoice Number</div>
      <div style="font-size:14px;font-weight:600;font-family:monospace;">${orderId}</div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <thead>
      <tr style="border-bottom:2px solid #0a1628;">
        <th style="text-align:left;padding:10px 0;font-size:11px;text-transform:uppercase;color:#666;">Description</th>
        <th style="text-align:center;padding:10px 0;font-size:11px;text-transform:uppercase;color:#666;">Qty</th>
        <th style="text-align:right;padding:10px 0;font-size:11px;text-transform:uppercase;color:#666;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 0;font-size:14px;">${productName}</td>
        <td style="padding:12px 0;font-size:14px;text-align:center;">${quantity}</td>
        <td style="padding:12px 0;font-size:14px;text-align:right;">${sellingPriceSAR.toLocaleString('en-SA')} SAR</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 0;font-size:14px;" colspan="2">Shipping Fee</td>
        <td style="padding:12px 0;font-size:14px;text-align:right;">${shippingFeeSAR.toLocaleString('en-SA')} SAR</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="padding:16px 0 0;font-size:16px;font-weight:700;text-align:right;">Total Paid</td>
        <td style="padding:16px 0 0;font-size:18px;font-weight:700;text-align:right;color:#c8a46d;">${total.toLocaleString('en-SA')} SAR</td>
      </tr>
    </tfoot>
  </table>

  <div style="border-top:1px solid #eee;padding-top:20px;font-size:11px;color:#999;line-height:1.7;">
    This invoice was generated automatically by HUSIN upon confirmed payment.<br/>
    For questions, contact ${process.env.SUPPORT_EMAIL}
  </div>
</div>
</body>
</html>
  `.trim()
}

export async function sendInvoiceEmail(order) {
  if (!order.customerEmail) {
    console.warn('[Invoice] No customer email — skipping invoice send')
    return { success: false, reason: 'No customer email' }
  }

  const html = buildInvoiceHTML(order)

  return sendEmail({
    to:      order.customerEmail,
    subject: `Invoice — Order #${order.orderId} — HUSIN`,
    html,
    alias:   'billing',
  })
}
