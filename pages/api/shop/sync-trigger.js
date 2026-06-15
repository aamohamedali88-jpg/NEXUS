/**
 * HUSIN ESHOP — POST /api/shop/sync-trigger
 * Phase 1 Production Hardening — Dynamic Inventory Sync Job Creator
 *
 * - Queries ALL shop_approved_products where status == 'live' (no limit cap)
 * - Batch-writes tasks in chunks of 500 (Firestore batch ceiling)
 * - Returns { jobId, totalTasks, done: false } immediately — no timeout risk
 * - Auth: x-shop-token OR x-cron-secret header against ADMIN_SECRET
 */

import { db } from '../../../lib/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  // Accept both dashboard and cron authentication
  const incomingToken = req.headers['x-shop-token'] || req.headers['x-cron-secret']
  if (!incomingToken || incomingToken !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Query ALL live products — no .limit() applied, scales to any volume
    const snapshot = await db
      .collection('shop_approved_products')
      .where('status', '==', 'live')
      .get()

    if (snapshot.empty) {
      return res.status(200).json({
        success:    true,
        jobId:      null,
        totalTasks: 0,
        done:       true,
        message:    'No live products found — sync skipped',
      })
    }

    const jobId    = `sync_${Date.now()}`
    const jobRef   = db.collection('shop_sync_jobs').doc(jobId)
    const allDocs  = snapshot.docs
    const total    = allDocs.length

    // Write job header document first
    await jobRef.set({
      jobId,
      totalTasks:      total,
      completedTasks:  0,
      removedCount:    0,
      updatedCount:    0,
      unchangedCount:  0,
      skippedCount:    0,
      failedCount:     0,
      status:          'pending',
      createdAt:       new Date().toISOString(),
    })

    // Batch-write all task documents — Firestore max 500 writes per batch
    const BATCH_CEILING = 500
    let   qi            = 0

    for (let offset = 0; offset < allDocs.length; offset += BATCH_CEILING) {
      const chunk = allDocs.slice(offset, offset + BATCH_CEILING)
      const batch = db.batch()

      chunk.forEach(doc => {
        const d       = doc.data()
        const taskRef = jobRef
          .collection('tasks')
          .doc(`task_${String(qi).padStart(5, '0')}`)

        batch.set(taskRef, {
          qi,
          productId:       doc.id,
          productName:     (d.name || 'Product').substring(0, 100),
          sourceLink:      d._sourceLink      || '',
          sourcePriceSAR:  d._sourcePriceSAR  || null,
          sellingPriceSAR: d.sellingPriceSAR  || null,
          category:        d.category         || 'general',
          status:          'pending',
        })
        qi++
      })

      await batch.commit()
    }

    console.log(`[SyncTrigger] Job ${jobId} created — ${total} products queued`)

    return res.status(200).json({
      success:    true,
      jobId,
      totalTasks: total,
      done:       false,
      message:    `Sync job created — ${total} live products queued`,
    })

  } catch (err) {
    console.error('[SyncTrigger] Fatal:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
