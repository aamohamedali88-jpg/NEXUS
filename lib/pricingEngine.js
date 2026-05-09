/**
 * HUSIN — Pricing Engine
 * Implements EXACT pricing rules from owner blueprint:
 *
 * Rule 1: Source price ≤ $10 → markup MAX $1 (~10%)
 * Rule 2: Source price $11–$1000 → markup 10%–25% sliding scale
 * Rule 3: All prices shown in SAR on the public store
 * Rule 4: Source price hidden from users always
 */

import { USD_TO_SAR } from './sources.js'

/**
 * Convert any price to USD for uniform rule application
 */
function toUSD(price, currency) {
  if (!price || isNaN(price)) return null
  if (currency === 'USD') return parseFloat(price)
  if (currency === 'SAR') return parseFloat(price) / USD_TO_SAR
  return parseFloat(price) // default assume USD
}

/**
 * Convert USD to SAR for display
 */
function toSAR(usdPrice) {
  return Math.round(usdPrice * USD_TO_SAR * 100) / 100
}

/**
 * Apply psychological pricing — ends in .99 or clean round
 */
function psychPrice(sarPrice) {
  if (sarPrice < 10) return Math.round(sarPrice * 10) / 10 // e.g. 9.5
  if (sarPrice < 50) return Math.floor(sarPrice) + 0.99    // e.g. 34.99
  if (sarPrice < 200) return Math.round(sarPrice / 5) * 5 - 0.01 // e.g. 149.99
  if (sarPrice < 1000) return Math.round(sarPrice / 10) * 10 - 1 // e.g. 499
  return Math.round(sarPrice / 100) * 100 - 1  // e.g. 2999
}

/**
 * Calculate markup percentage based on source price (in USD)
 * Blueprint rules:
 * ≤ $10     → flat $1 max markup (~10%)
 * $11–$50   → 25% markup
 * $51–$200  → 20% markup
 * $201–$500 → 15% markup
 * $501–$1000→ 10% markup
 */
function getMarkupPercent(sourcePriceUSD) {
  if (sourcePriceUSD <= 10) return null   // uses flat $1 rule instead
  if (sourcePriceUSD <= 50)  return 25
  if (sourcePriceUSD <= 200) return 20
  if (sourcePriceUSD <= 500) return 15
  return 10
}

/**
 * Main pricing function
 * Input: raw product from scraper
 * Output: complete pricing object
 */
export function calculatePrice(sourcePrice, sourceCurrency) {
  const usdPrice = toUSD(sourcePrice, sourceCurrency)

  if (!usdPrice) {
    return {
      sourcePriceUSD: null,
      sourcePriceSAR: null,
      sellingPriceSAR: null,
      sellingPriceFormatted: 'Price on request',
      profitUSD: null,
      profitSAR: null,
      marginPercent: null,
      markupApplied: null,
      priceRule: 'no_price',
      isViable: false,
      viabilityNote: 'No source price found',
    }
  }

  const sourceSAR = toSAR(usdPrice)
  let sellingUSD, markupApplied, priceRule

  // ── Rule 1: ≤ $10 → add max $1 ──────────────────────────────────────────
  if (usdPrice <= 10) {
    sellingUSD = usdPrice + 1.00
    markupApplied = ((1 / usdPrice) * 100).toFixed(1) + '%'
    priceRule = 'flat_1_usd'

  // ── Rule 2: $11–$1000 → sliding markup ───────────────────────────────────
  } else if (usdPrice <= 1000) {
    const markup = getMarkupPercent(usdPrice)
    sellingUSD = usdPrice * (1 + markup / 100)
    markupApplied = markup + '%'
    priceRule = `${markup}pct_markup`

  // ── Rule 3: > $1000 → 10% markup (luxury items) ──────────────────────────
  } else {
    sellingUSD = usdPrice * 1.10
    markupApplied = '10%'
    priceRule = '10pct_luxury'
  }

  const sellingUSDRaw = sellingUSD
  const sellingSAR = psychPrice(toSAR(sellingUSDRaw))
  const profitSAR = parseFloat((sellingSAR - sourceSAR).toFixed(2))
  const profitUSD = parseFloat((profitSAR / USD_TO_SAR).toFixed(2))
  const marginPct = parseFloat(((profitSAR / sellingSAR) * 100).toFixed(1))

  // Viability: reject if profit < 1 SAR
  const isViable = profitSAR >= 1

  return {
    sourcePriceUSD: parseFloat(usdPrice.toFixed(2)),
    sourcePriceSAR: parseFloat(sourceSAR.toFixed(2)),
    sellingPriceSAR: sellingSAR,
    sellingPriceFormatted: `${sellingSAR.toLocaleString('en-SA')} SAR`,
    profitUSD,
    profitSAR,
    profitFormatted: `${profitSAR.toFixed(2)} SAR (~$${profitUSD})`,
    marginPercent: marginPct,
    markupApplied,
    priceRule,
    isViable,
    viabilityNote: isViable ? '✅ Good margin' : `⚠️ Profit too low (${profitSAR} SAR)`,
  }
}

/**
 * Batch pricing — apply to all 150 products
 */
export function applyPricingToAll(products) {
  return products.map(p => ({
    ...p,
    pricing: calculatePrice(p.rawPrice, p.currency),
  }))
}
