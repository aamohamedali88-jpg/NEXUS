/**
 * HUSIN ESHOP — POST /api/shop/auth
 * Validates owner password for admin dashboard login
 * Add ADMIN_SECRET to Vercel environment variables
 * Completely separate from all other website sections
 */

import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body

  if (!password) {
    return res.status(400).json({ error: 'Password required' })
  }

  // Delay to prevent brute force attacks
  await new Promise(r => setTimeout(r, 800))

  if (password !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Wrong password' })
  }

  // Generate session token
  const window = Math.floor(Date.now() / 10000)
  const token = crypto
    .createHmac('sha256', process.env.ADMIN_SECRET)
    .update(`husin_shop_${window}`)
    .digest('hex')

  return res.status(200).json({ success: true, token })
}
