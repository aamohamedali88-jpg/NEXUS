/**
 * HUSIN ESHOP — POST /api/cron/abandoned-cart
 * Part 6: Abandoned Cart Recovery System
 *
 * Finds shop_orders docs still in `pending_payment` more than 24h after
 * creation (i.e. checkout was started but never completed) and sends a
 * one-time reminder email via the sales@husin.org alias.
 *
 * DELIBERATE SCOPE NOTE: the original spec asks for "a minor discount code
 * derived safely from the hidden shipping profit margins" in this email.
 * That's left out here — there is no coupon/discount-redemption logic
 * anywhere in checkout.js/create-order.js, so emailing a code that the
 * checkout flow can't actually apply would mislead real customers (a promise
 * the site can't keep), not just an internal bug. Building that needs a
 * small checkout change first; this endpoint sends an honest reminder
 * without a fake code until that exists.
 *
 * Auth: x-cron-secret or x-shop-token header, matching the two header names
 * already used inconsistently elsewhere in this codebase — accepts either.
 */

import { db } from '../../../lib/firebaseAdmin'
import { sendEmail } from '../../../lib/emailService'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers['x-cron-secret'] || req.headers['x-shop-token']
  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString()

    // Composite index required: shop_orders (paymentStatus ASC, createdAt ASC)
    // — included in firestore.indexes.json
    const snap = await db.collection('shop_orders')
      .where('paymentStatus', '==', 'pending_payment')
      .where('createdAt', '<=', cutoff)
      .orderBy('createdAt', 'asc')
      .limit(50)
      .get()

    if (snap.empty) {
      return res.status(200).json({ done: true, sent: 0, message: 'No abandoned carts found' })
    }

    let sent = 0
    let skipped = 0
    const results = []

    for (const doc of snap.docs) {
      const order = doc.data()

      // Already reminded once — don't spam on every 12h cron run
      if (order.abandonedCartReminderSentAt) {
        skipped++
        continue
      }

      if (!order.customerEmail) {
        skipped++
        continue
      }

      try {
        await sendEmail({
          to:      order.customerEmail,
          alias:   'sales',
          subject: `You left something in your cart at HUSIN`,
          html: `
            <p>Hi,</p>
            <p>You started an order for <strong>${order.productName || 'an item'}</strong> on HUSIN but didn't finish checking out.</p>
            <p>Your item is still available — pick up right where you left off:</p>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.husin.org'}/marketplace">Return to HUSIN Marketplace →</a></p>
            <p>— HUSIN</p>
          `,
          text: `You left "${order.productName || 'an item'}" in your cart at HUSIN. Come finish your order: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.husin.org'}/marketplace`,
        })

        await doc.ref.update({ abandonedCartReminderSentAt: new Date().toISOString() })
        sent++
        results.push({ orderId: doc.id, email: order.customerEmail, status: 'sent' })

      } catch (emailErr) {
        skipped++
        results.push({ orderId: doc.id, status: 'email_failed', error: emailErr.message })
      }

      // small pacing gap between emails, same defensive habit as the
      // eBay worker's anti-ban delay
      await new Promise(r => setTimeout(r, 300))
    }

    return res.status(200).json({ done: true, sent, skipped, checked: snap.docs.length, results })

  } catch (err) {
    console.error('[AbandonedCart]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
