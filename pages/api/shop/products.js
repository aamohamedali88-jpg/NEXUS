/**
 * HUSIN ESHOP — GET /api/shop/product-details?productId=xxx
 * Fetches full product details from eBay API
 * Returns: multiple images, specs, colors, sizes, description
 * Source link NEVER exposed to client
 */

import { db } from '../../../lib/firebaseAdmin'

const EBAY_APP_ID = process.env.EBAY_APP_ID
const EBAY_SECRET = process.env.EBAY_SECRET

async function getEbayToken() {
  const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_SECRET}`).toString('base64')
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body:   'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('eBay auth failed')
  return data.access_token
}

// Extract eBay item ID from source link
function extractEbayItemId(sourceLink) {
  if (!sourceLink) return null
  // Matches: /itm/123456789 or /itm/title/123456789
  const match = sourceLink.match(/\/itm\/(?:[^/]+\/)?(\d{10,13})/)
  return match ? match[1] : null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { productId } = req.query
  if (!productId) return res.status(400).json({ error: 'productId required' })

  try {
    // Get product from Firestore
    const snap = await db.collection('shop_approved_products').doc(productId).get()
    if (!snap.exists) return res.status(404).json({ error: 'Product not found' })

    const product = snap.data()
    if (product.status !== 'live') return res.status(404).json({ error: 'Product not available' })

    // Base response — always available from Firestore
    const base = {
      id:                    product.id || productId,
      name:                  product.name,
      image:                 product.image || null,
      sellingPriceSAR:       product.sellingPriceSAR,
      sellingPriceFormatted: product.sellingPriceFormatted,
      category:              product.category || 'general',
      specifications:        product.specifications || null,
      approvedAt:            product.approvedAt,
      views:                 product.views || 0,
      sales:                 product.sales || 0,
      // Extra details — will be enriched from eBay
      additionalImages:      [],
      aspects:               [],
      description:           null,
      condition:             product.specifications || null,
      brand:                 null,
      // Source NEVER exposed
    }

    // Try to fetch enriched data from eBay API
    const sourceLink = product._sourceLink
    const ebayItemId = extractEbayItemId(sourceLink)

    if (ebayItemId && EBAY_APP_ID && EBAY_SECRET) {
      try {
        const token = await getEbayToken()
        const ebayRes = await fetch(
          `https://api.ebay.com/buy/browse/v1/item/v1|${ebayItemId}|0`,
          {
            headers: {
              'Authorization':             `Bearer ${token}`,
              'X-EBAY-C-MARKETPLACE-ID':   'EBAY_US',
              'Content-Type':              'application/json',
            },
            signal: AbortSignal.timeout(10000),
          }
        )

        if (ebayRes.ok) {
          const ebayData = await ebayRes.json()

          // Additional images gallery
          const additionalImages = []
          if (ebayData.image?.imageUrl) {
            additionalImages.push(ebayData.image.imageUrl.replace(/\/s-l\d+\./, '/s-l800.'))
          }
          if (ebayData.additionalImages) {
            ebayData.additionalImages.forEach(img => {
              if (img.imageUrl) {
                additionalImages.push(img.imageUrl.replace(/\/s-l\d+\./, '/s-l800.'))
              }
            })
          }
          // Deduplicate
          base.additionalImages = [...new Set(additionalImages)].slice(0, 8)

          // Item specifics (color, size, brand, storage, etc)
          if (ebayData.localizedAspects) {
            base.aspects = ebayData.localizedAspects.map(a => ({
              name:  a.name,
              value: Array.isArray(a.value) ? a.value.join(', ') : a.value,
            })).filter(a => a.name && a.value)

            // Extract brand specifically
            const brandAspect = base.aspects.find(a =>
              a.name.toLowerCase() === 'brand'
            )
            if (brandAspect) base.brand = brandAspect.value
          }

          // Description (HTML — sanitize in frontend)
          if (ebayData.description) {
            // Strip dangerous tags, keep formatting
            base.description = ebayData.description
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
              .replace(/javascript:/gi, '')
              .substring(0, 5000)
          }

          // Condition
          if (ebayData.condition) {
            base.condition = ebayData.condition
          }
        }
      } catch (ebayErr) {
        console.log('[ProductDetails] eBay fetch failed, using Firestore data:', ebayErr.message)
        // Continue with Firestore data only — no error thrown
      }
    }

    // Increment view count
    db.collection('shop_approved_products').doc(productId)
      .update({ views: (product.views || 0) + 1 })
      .catch(() => {})

    return res.status(200).json({ product: base })

  } catch (error) {
    console.error('[ProductDetails] Error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
