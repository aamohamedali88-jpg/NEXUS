/**
 * HUSIN ESHOP — Deduplicator
 * Ensures no product ever repeats across search cycles
 * Uses shop_initial_products collection in Firestore
 * Accepts collection name as parameter for flexibility
 */

import { db } from './firebaseAdmin.js'
import crypto  from 'crypto'

// Generate a unique fingerprint for each product
function fingerprint(product) {
  const namePart   = (product.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 30)
  const pricePart  = String(product.rawPrice || '').replace(/[^0-9]/g, '').substring(0, 8)
  const sourcePart = product.sourceId || ''
  return crypto
    .createHash('md5')
    .update(`${sourcePart}_${namePart}_${pricePart}`)
    .digest('hex')
}

// Load all existing fingerprints from Firestore
// collectionName defaults to 'shop_initial_products'
export async function loadExistingFingerprints(collectionName = 'shop_initial_products') {
  try {
    const snapshot = await db.collection(collectionName)
      .select('fingerprint')
      .get()

    const set = new Set()
    snapshot.docs.forEach(doc => {
      const fp = doc.data().fingerprint
      if (fp) set.add(fp)
    })

    console.log(`[Deduplicator] Loaded ${set.size} fingerprints from ${collectionName}`)
    return set
  } catch (e) {
    console.error('[Deduplicator] Error loading fingerprints:', e.message)
    return new Set()
  }
}

// Filter out duplicates — returns only truly new products
export function filterNewProducts(candidates, existingFingerprints) {
  const newProducts   = []
  const sessionSeen   = new Set()

  for (const product of candidates) {
    const fp = fingerprint(product)
    if (!existingFingerprints.has(fp) && !sessionSeen.has(fp)) {
      sessionSeen.add(fp)
      newProducts.push({ ...product, fingerprint: fp })
    }
  }

  console.log(`[Deduplicator] ${candidates.length} candidates → ${newProducts.length} new unique products`)
  return newProducts
}

// Save new products to initial list — prevents repeating in future cycles
// collectionName defaults to 'shop_initial_products'
export async function saveToInitialList(products, collectionName = 'shop_initial_products') {
  if (!products?.length) return 0

  let count = 0
  const CHUNK = 400

  for (let i = 0; i < products.length; i += CHUNK) {
    const batch = db.batch()
    products.slice(i, i + CHUNK).forEach(p => {
      const docRef = db.collection(collectionName).doc(p.id)
      batch.set(docRef, {
        id:          p.id,
        name:        p.name,
        sourceId:    p.sourceId,
        sourceName:  p.sourceName,
        rawPrice:    p.rawPrice || null,
        currency:    p.currency || 'SAR',
        sourceLink:  p.sourceLink,
        image:       p.image || null,
        fingerprint: p.fingerprint,
        category:    p.category || 'general',
        addedAt:     new Date().toISOString(),
      }, { merge: true })
      count++
    })
    await batch.commit()
  }

  console.log(`[Deduplicator] Saved ${count} products to ${collectionName}`)
  return count
}
