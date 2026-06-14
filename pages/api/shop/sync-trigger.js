/**
 * HUSIN ESHOP — POST /api/shop/sync-trigger
 * Creates a sync job for all live products in Firestore
 * Returns immediately (< 1 second) — free plan compatible
 * Each product gets checked by sync-worker.js one at a time
 *
 * Called by:
 *   - GitHub Actions every 12 hours (automated)
 *   - Owner dashboard manually (on-demand)
 *
 * What gets checked per product:
 *   - Is the eBay listing still active? (not ended/sold)
 *   - Has the eBay price changed more than 15%?
 *   - If ended → auto-hide from marketplace
 *   - If price changed → recalculate markup and update
 */

import { db } from '../../../lib/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  // Accept both dashboard token and a shared cron secret
  const token     = req.headers['x-shop-token']
  const cronToken = req.headers['x-cron-secret']
  const validToken = token === process.env.ADMIN_SECRET ||
                     cronToken === process.env.ADMIN_SECRET

  if (!validToken)
    return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Fetch all live products from Firestore
    const snap = await db.collection('shop_approved_products')
      .where('status', '==', 'live')
      .get()

    if (snap.empty) {
      return res.status(200).json({
        success: true,
        message: 'No live products to sync',
        total:   0,
      })
    }

    // Build task list — one task per product
    const tasks = snap.docs.map((doc, i) => {
      const d = doc.data()
      return {
        qi:         i,
        productId:  doc.id,
        productName:d.name?.substring(0, 80) || 'Product',
        sourceLink: d._sourceLink || '',
        sourcePriceSAR: d._sourcePriceSAR || null,
        sellingPriceSAR: d.sellingPriceSAR || null,
        category:   d.category || 'general',
        status:     'pending', // pending | processing | done | failed
      }
    })

    // Create sync job document
    const jobId  = `sync_${Date.now()}`
    const jobRef = db.collection('shop_sync_jobs').doc(jobId)

    await jobRef.set({
      jobId,
      totalTasks:      tasks.length,
      completedTasks:  0,
      hiddenCount:     0,
      updatedCount:    0,
      unchangedCount:  0,
      failedCount:     0,
      status:          'pending',
      createdAt:       new Date().toISOString(),
    })

    // Save all tasks in one batch
    const BATCH_SIZE = 500
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = db.batch()
      tasks.slice(i, i + BATCH_SIZE).forEach(task => {
        const taskRef = jobRef.collection('tasks')
          .doc(`task_${String(task.qi).padStart(4, '0')}`)
        batch.set(taskRef, task)
      })
      await batch.commit()
    }

    console.log(`[SyncTrigger] Created job ${jobId} with ${tasks.length} products`)

    return res.status(200).json({
      success:    true,
      jobId,
      totalTasks: tasks.length,
      message:    `Sync job created for ${tasks.length} live products`,
    })

  } catch (err) {
    console.error('[SyncTrigger] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
