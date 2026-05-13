/**
 * HUSIN ESHOP — POST /api/shop/auth
 * FIXED: Returns raw password confirmation — no expiring HMAC tokens
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body
  if (!password) {
    return res.status(400).json({ error: 'Password required' })
  }

  // Small delay to prevent brute force
  await new Promise(r => setTimeout(r, 500))

  if (password !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Wrong password' })
  }

  // Return success — frontend stores raw password as token
  return res.status(200).json({ success: true, token: password })
}
