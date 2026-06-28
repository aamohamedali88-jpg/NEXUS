/**
 * HUSIN ESHOP — GET /api/shop/wallet-balance
 * Returns a customer's store-credit wallet balance.
 * Looked up by email — same trust model as orders-by-customer.js
 * (no separate customer auth system exists yet in this codebase).
 */

import { db } from '../../../lib/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.query
  if (!email)
    return res.status(400).json({ error: 'email required' })

  const walletId = email.toLowerCase().trim()

  try {
    const doc = await db.collection('shop_wallets').doc(walletId).get()

    if (!doc.exists) {
      return res.status(200).json({ balance: 0, currency: 'SAR', history: [] })
    }

    const data = doc.data()
    return res.status(200).json({
      balance:  data.balance || 0,
      currency: 'SAR',
      history:  (data.history || []).slice(-20).reverse(), // most recent first
    })

  } catch (err) {
    console.error('[WalletBalance]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
