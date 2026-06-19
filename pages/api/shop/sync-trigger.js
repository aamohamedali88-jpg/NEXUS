/**
 * HUSIN ESHOP — POST /api/shop/sync-trigger
 * Quota-Optimized for Firebase Spark Plan (50k reads / 20k writes per day)
 *
 * QUOTA FIX — replaces subcollection task pattern:
 *
 * OLD PATTERN (O(n²) reads):
 *   Each sync-worker call did: tasks WHERE status==pending → reads ALL remaining docs
 *   601 products = 601+600+...+1 = 180,901 reads per sync run → OVER QUOTA
 *
 * NEW PATTERN (O(1) reads per worker call):
 *   Task queue stored as a JSON array inside the job document itself
 *   Worker reads 1 job doc, pops first task, writes back updated array
 *   601 products = 601 reads + 601 writes = 1,202 total operations
 *   Saves 179,699 reads per sync run
 *
 * OPERATIONS THIS FILE:
 *   Reads:  601 (one per live product from collection query)
 *   Writes: 1   (single job document with embedded task array)
 *   TOTAL:  602 operations per trigger call
 */

import { db } from '../../../lib/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const incomingToken = req.headers['x-shop-token'] || req.headers['x-cron-secret']
  if (!incomingToken || incomingToken !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' })

  try {
    // ── Read all live products — quota: 1 read per doc ────────────────────────
    // select() projection: only fetch the 4 fields we need for the task queue
    // This reduces document read size (bandwidth) but still counts as N reads
    const snapshot = await db
      .collection('shop_approved_products')
      .where('status', '==', 'live')
      .select('_sourceLink', '_sourcePriceSAR', 'sellingPriceSAR', 'category', 'name')
      .get()

    if (snapshot.empty) {
      return res.status(200).json({
        success:    true,
        jobId:      null,
        totalTasks: 0,
        done:       true,
        message:    'No live products — sync skipped',
      })
    }

    // ── Build lightweight task array — stored IN the job document ─────────────
    // No subcollection = no per-task reads later
    // Each task is minimal: only what sync-worker needs to check eBay
    const tasks = snapshot.docs.map((doc, i) => {
      const d = doc.data()
      return {
        qi:              i,
        productId:       doc.id,
        productName:     (d.name || 'Product').substring(0, 80),
        sourceLink:      d._sourceLink      || '',
        sourcePriceSAR:  d._sourcePriceSAR  || null,
        sellingPriceSAR: d.sellingPriceSAR  || null,
        category:        d.category         || 'general',
      }
    })

    const jobId = `sync_${Date.now()}`

    // ── Single write: entire job + task queue in ONE document ─────────────────
    // Firestore document limit: 1MB — at ~150 bytes per task, supports ~6,600 tasks
    // Current catalog (601) is well within limits
    await db.collection('shop_sync_jobs').doc(jobId).set({
      jobId,
      totalTasks:      tasks.length,
      completedTasks:  0,
      removedCount:    0,
      updatedCount:    0,
      unchangedCount:  0,
      skippedCount:    0,
      failedCount:     0,
      status:          'pending',
      createdAt:       new Date().toISOString(),
      // Embedded task queue — worker pops from front, writes back
      // This replaces the subcollection pattern entirely
      pendingTasks:    tasks,
      // Completed tasks stored separately for audit (lightweight)
      completedLog:    [],
    })

    console.log(`[SyncTrigger] Job ${jobId} — ${tasks.length} products queued (1 write)`)

    return res.status(200).json({
      success:    true,
      jobId,
      totalTasks: tasks.length,
      done:       false,
      message:    `Sync job created — ${tasks.length} products queued in 1 Firestore write`,
    })

  } catch (err) {
    console.error('[SyncTrigger] Fatal:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
