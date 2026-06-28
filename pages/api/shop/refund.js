/**
 * HUSIN ESHOP — POST /api/shop/refund
 * Part 6: Reverse Logistics & Digital Wallet
 *
 * Per spec: cancellations/returns do NOT attempt a reverse-transaction
 * through the payment gateway. Instead, funds are credited to an internal
 * HUSIN store-credit wallet (shop_wallets/{email}), and a manual-intervention
 * alert + customer status email are sent.
 *
 * Admin-only — same auth pattern as the rest of /api/shop/* admin endpoints.
 */

import { db } from '../../../lib/firebaseAdmin'
import { sendEmail } from '../../../lib/emailService'
import { notifyRefund } from '../../../lib/telegramNotifier'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers['x-shop-token'] || req.headers['x-cron-secret']
  if (!token || token !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' })

  const { email, amount, reason, orderId } = req.body || {}

  if (!email || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'email and a positive numeric amount are required' })
  }

  const walletId  = email.toLowerCase().trim()
  const creditSAR = parseFloat(amount)

  try {
    const walletRef = db.collection('shop_wallets').doc(walletId)

    const newBalance = await db.runTransaction(async (tx) => {
      const snap = await tx.get(walletRef)
      const current = snap.exists ? (snap.data().balance || 0) : 0
      const updated  = current + creditSAR

      const entry = {
        amount:    creditSAR,
        reason:    reason || 'Refund / cancellation',
        orderId:   orderId || null,
        createdAt: new Date().toISOString(),
      }

      if (snap.exists) {
        tx.update(walletRef, {
          balance: updated,
          history: [...(snap.data().history || []), entry],
          updatedAt: new Date().toISOString(),
        })
      } else {
        tx.set(walletRef, {
          email:     walletId,
          balance:   updated,
          history:   [entry],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      return updated
    })

    // Fire-and-forget notifications — don't block the response on these
    notifyRefund({ email: walletId, amount: creditSAR, reason, orderId, newBalance }).catch(() => {})

    sendEmail({
      to:      walletId,
      alias:   'support',
      subject: 'Your HUSIN store credit has been updated',
      html: `
        <p>Hi,</p>
        <p>We've credited <strong>${creditSAR} SAR</strong> to your HUSIN store-credit wallet${orderId ? ` for order <strong>${orderId}</strong>` : ''}.</p>
        <p>Your new wallet balance is <strong>${newBalance} SAR</strong>. You can use this credit toward any future purchase on HUSIN.</p>
        <p>If you have any questions, just reply to this email.</p>
        <p>— HUSIN Support</p>
      `,
      text: `We've credited ${creditSAR} SAR to your HUSIN wallet. New balance: ${newBalance} SAR.`,
    }).catch((e) => console.error('[Refund] email failed:', e.message))

    return res.status(200).json({ success: true, walletId, creditedSAR: creditSAR, newBalance })

  } catch (err) {
    console.error('[Refund]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
