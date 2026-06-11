/**
 * HUSIN ESHOP — POST /api/shop/trigger
 * FREE PLAN COMPATIBLE — returns in < 1 second
 * Only creates a job document in Firestore with all queries queued
 * The actual eBay searching is done by trigger-worker.js (called per-query)
 */

import { db } from '../../../lib/firebaseAdmin'

// All category configs with their search queries
const CATEGORY_CONFIG = {
  clothes_men: {
    label: "Men's Wear",
    queries: [
      'Nike Air Max men shoes new with box',
      'Adidas sneakers men new with box',
      'polo ralph lauren shirt men new',
      'tommy hilfiger men shirt new',
      'Calvin Klein men jeans new',
      'Hugo Boss men suit new',
    ],
    ebayCategoryId: '1059',
    conditionIds: ['1000', '1500'],
    minAspects: 4,
    requiredAspects: ['size', 'brand'],
    strictSpecs: false,
    firestoreCategory: 'clothes_men',
  },
  clothes_women: {
    label: "Women's Wear",
    queries: [
      'Michael Kors women handbag new',
      'Coach women bag new with tags',
      'Nike women sneakers new with box',
      'Calvin Klein women jeans new',
      'Steve Madden women heels new',
      'Kate Spade women purse new',
    ],
    ebayCategoryId: '15724',
    conditionIds: ['1000', '1500'],
    minAspects: 4,
    requiredAspects: ['size', 'brand'],
    strictSpecs: false,
    firestoreCategory: 'clothes_women',
  },
  electronics: {
    label: 'Electronics',
    queries: [
      'iPhone 15 Pro new sealed unlocked',
      'Samsung Galaxy S24 Ultra new sealed',
      'Apple MacBook Pro M3 new sealed',
      'Sony WH-1000XM5 headphones new sealed',
      'Apple Watch Ultra 2 new sealed',
      'iPad Pro M4 new sealed',
      'PlayStation 5 Slim new sealed',
      'Xbox Series X new sealed',
    ],
    ebayCategoryId: '58058',
    conditionIds: ['1000'],
    minAspects: 5,
    requiredAspects: ['brand', 'model'],
    strictSpecs: true,
    firestoreCategory: 'electronics',
  },
  mobiles: {
    label: 'Mobiles',
    queries: [
      'iPhone 15 new sealed unlocked',
      'iPhone 14 Pro new sealed',
      'Samsung Galaxy S24 new sealed',
      'Google Pixel 8 Pro new sealed',
    ],
    ebayCategoryId: '9355',
    conditionIds: ['1000'],
    minAspects: 5,
    requiredAspects: ['brand', 'model'],
    strictSpecs: true,
    firestoreCategory: 'mobiles',
  },
  laptops: {
    label: 'Laptops',
    queries: [
      'MacBook Pro M3 new sealed',
      'MacBook Air M2 new sealed',
      'Dell XPS 15 new sealed',
      'HP Spectre x360 new',
    ],
    ebayCategoryId: '111422',
    conditionIds: ['1000'],
    minAspects: 5,
    requiredAspects: ['brand', 'model'],
    strictSpecs: true,
    firestoreCategory: 'laptops',
  },
  jewelry: {
    label: 'Jewelry',
    queries: [
      '18k gold bracelet new with certificate',
      'diamond ring 14k gold new',
      'Pandora charm bracelet new',
      'gold necklace 18k new',
    ],
    ebayCategoryId: '281',
    conditionIds: ['1000', '1500'],
    minAspects: 3,
    requiredAspects: ['brand'],
    strictSpecs: false,
    firestoreCategory: 'jewelry',
  },
  beauty: {
    label: 'Beauty',
    queries: [
      'Charlotte Tilbury lipstick new',
      'Dior perfume new sealed',
      'Chanel No 5 perfume new sealed',
      'Tom Ford cologne new sealed',
    ],
    ebayCategoryId: '26395',
    conditionIds: ['1000', '1500'],
    minAspects: 3,
    requiredAspects: ['brand'],
    strictSpecs: false,
    firestoreCategory: 'beauty',
  },
  home_appliances: {
    label: 'Home Appliances',
    queries: [
      'Dyson V15 vacuum new sealed',
      'KitchenAid stand mixer new',
      'Nespresso coffee machine new',
      'Philips air fryer new sealed',
    ],
    ebayCategoryId: '20625',
    conditionIds: ['1000'],
    minAspects: 3,
    requiredAspects: ['brand'],
    strictSpecs: false,
    firestoreCategory: 'home_appliances',
  },
  sports: {
    label: 'Sports',
    queries: [
      'Nike Air Jordan new with box',
      'Adidas Ultraboost new with box',
      'Garmin Forerunner watch new',
      'Fitbit Sense 2 new sealed',
    ],
    ebayCategoryId: '888',
    conditionIds: ['1000', '1500'],
    minAspects: 3,
    requiredAspects: ['brand', 'size'],
    strictSpecs: false,
    firestoreCategory: 'sports',
  },
  toys: {
    label: 'Toys',
    queries: [
      'LEGO Technic new sealed',
      'LEGO Star Wars new sealed',
      'Hot Wheels collector new',
    ],
    ebayCategoryId: '220',
    conditionIds: ['1000'],
    minAspects: 3,
    requiredAspects: ['brand'],
    strictSpecs: false,
    firestoreCategory: 'toys',
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers['x-shop-token']
  if (token !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' })

  const { category: selectedCategory = 'all' } = req.body

  // Build flat list of all queries to process
  let allTasks = []

  if (selectedCategory === 'all') {
    Object.entries(CATEGORY_CONFIG).forEach(([catKey, catConfig]) => {
      catConfig.queries.forEach((query, qi) => {
        allTasks.push({ catKey, query, qi, config: catConfig })
      })
    })
  } else if (CATEGORY_CONFIG[selectedCategory]) {
    const catConfig = CATEGORY_CONFIG[selectedCategory]
    catConfig.queries.forEach((query, qi) => {
      allTasks.push({ catKey: selectedCategory, query, qi, config: catConfig })
    })
  } else {
    return res.status(400).json({ error: `Unknown category: ${selectedCategory}` })
  }

  // Serialize tasks for Firestore (remove functions/non-serializable)
  const serializedTasks = allTasks.map(t => ({
    catKey:           t.catKey,
    query:            t.query,
    qi:               t.qi,
    label:            t.config.label,
    ebayCategoryId:   t.config.ebayCategoryId,
    conditionIds:     t.config.conditionIds,
    minAspects:       t.config.minAspects,
    requiredAspects:  t.config.requiredAspects,
    strictSpecs:      t.config.strictSpecs,
    firestoreCategory:t.config.firestoreCategory,
    status:           'pending', // pending | done | failed
  }))

  // Create job document in Firestore
  const jobId  = `job_${Date.now()}`
  const jobRef = db.collection('shop_search_jobs').doc(jobId)

  await jobRef.set({
    jobId,
    selectedCategory,
    totalTasks:   serializedTasks.length,
    completedTasks: 0,
    accepted:     0,
    rejected:     0,
    status:       'pending',
    createdAt:    new Date().toISOString(),
  })

  // Save each task as subcollection doc
  const batch = db.batch()
  serializedTasks.forEach((task, i) => {
    const taskRef = jobRef.collection('tasks').doc(`task_${String(i).padStart(3,'0')}`)
    batch.set(taskRef, task)
  })
  await batch.commit()

  // Return job ID immediately — dashboard will poll trigger-worker
  return res.status(200).json({
    success:    true,
    jobId,
    totalTasks: serializedTasks.length,
    message:    `Job created with ${serializedTasks.length} search queries. Starting now...`,
  })
}
