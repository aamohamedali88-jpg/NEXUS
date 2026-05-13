/**
 * HUSIN ESHOP — GET /api/shop/sessions
 * FIXED: Accepts raw ADMIN_SECRET as token
 */

import { db } from '../../../lib/firebaseAdmin'

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) return false
  return token === process.env.ADMIN_SECRET
}

export default async function handler(req, res) {
  const token = req.headers['x-shop-token']
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const snap = await db.collection('shop_search_sessions')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    const sessions = snap.docs.map(doc => {
      const d = doc.data()
      return {
        sessionId:   d.sessionId,
        searchQuery: d.searchQuery,
        totalFound:  d.totalFound  || 0,
        viableCount: d.viableCount || 0,
        status:      d.status,
        createdAt:   d.createdAt,
      }
    })

    return res.status(200).json({ sessions })

  } catch (error) {
    console.error('[ShopSessions]', error.message)
    return res.status(500).json({ error: error.message })
  }
}
