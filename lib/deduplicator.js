/**
 * HUSIN — Deduplicator
 * Ensures no product is ever repeated across search cycles
 * Checks against 'initial_products_list' in Firestore
 * Blueprint rule: each search must yield 5 NEW products per source = 150 new total
 */

import { db } from './firebaseAdmin.js'

/**
 * Generate a fingerprint for a product to detect duplicates
 * Uses: source + price + name similarity
 */
function fingerprint(product) {
  const namePart = product.name
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 30) || ''
  const pricePart = String(product.rawPrice || '').replace(/[^0-9]/g, '').substring(0, 8)
  const sourcePart = product.sourceId || ''
  return `${sourcePart}_${namePart}_${pricePart}`
}

/**
 * Load all existing fingerprints from Firestore initial_products_list
 * Returns a Set of fingerprints for O(1) lookup
 */
export async function loadExistingFingerprints() {
  try {
    const snapshot = await db.collection('initial_products_list')
      .select('fingerprint') // only fetch fingerprint field — faster
      .get()

    const set = new Set()
    snapshot.docs.forEach(doc => {
      const fp = doc.data().fingerprint
      if (fp) set.add(fp)
    })

    console.log(`[Deduplicator] Loaded ${set.size} existing fingerprints from Firestore`)
    return set
  } catch (e) {
    console.error('[Deduplicator] Error loading fingerprints:', e.message)
    return new Set()
  }
}

/**
 * Filter out duplicate products
 * Returns only truly new products
 */
export function filterNewProducts(candidates, existingFingerprints) {
  const newProducts = []
  const sessionSeen = new Set() // also deduplicate within this batch

  for (const product of candidates) {
    const fp = fingerprint(product)
    if (!existingFingerprints.has(fp) && !sessionSeen.has(fp)) {
      sessionSeen.add(fp)
      newProducts.push({ ...product, fingerprint: fp })
    }
  }

  return newProducts
}

/**
 * Save new products to initial_products_list in Firestore
 * This runs AFTER owner approval cycle — adds ALL 150 found (approved + rejected)
 * So future searches never repeat them
 */
export async function saveToInitialList(products) {
  if (!products?.length) return 0

  const batch = db.batch()
  let count = 0

  for (const product of products) {
    const docRef = db.collection('initial_products_list').doc(product.id)
    batch.set(docRef, {
      id: product.id,
      name: product.name,
      sourceId: product.sourceId,
      sourceName: product.sourceName,
      rawPrice: product.rawPrice,
      currency: product.currency,
      sourceLink: product.sourceLink,
      image: product.image || null,
      fingerprint: product.fingerprint,
      category: product.category,
      specifications: product.specifications || null,
      addedAt: new Date().toISOString(),
    }, { merge: true })
    count++

    // Firestore batch limit is 500 — commit in chunks
    if (count % 490 === 0) {
      await batch.commit()
    }
  }

  await batch.commit()
  console.log(`[Deduplicator] Saved ${count} products to initial_products_list`)
  return count
}
