import { db } from '../../lib/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, name } = req.body

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' })
  }

  try {
    const existing = await db.collection('subscribers')
      .where('email', '==', email.toLowerCase())
      .get()

    if (!existing.empty) {
      return res.status(409).json({ error: 'This email is already subscribed.' })
    }

    await db.collection('subscribers').add({
      email: email.toLowerCase(),
      name: name || '',
      subscribedAt: new Date().toISOString(),
      source: 'homepage_hero',
      status: 'active',
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
