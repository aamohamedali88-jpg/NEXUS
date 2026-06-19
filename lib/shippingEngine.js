/**
 * HUSIN — Shipping Engine
 * Implements EXACT shipping profit strategy from owner specification (Part 2):
 *
 * Scenario A — Supplier offers "Free Shipping":
 *   Do NOT show free shipping to the customer.
 *   Apply a flat shipping fee of 30–40 SAR, routed entirely into net profit.
 *
 * Scenario B — Supplier charges for shipping:
 *   Dynamically apply a 15%–20% profit markup on top of the actual shipping cost.
 *
 * Unified UI Display:
 *   Customer only ever sees a single "Shipping Fee" line item.
 *   Internal markup/margin is never exposed to the frontend.
 *
 * This file is intentionally separate from pricingEngine.js — product markup
 * and shipping markup are different profit levers and must be auditable
 * independently in the ledger (Part 2: Database Ledger).
 */

import { USD_TO_SAR } from './sources.js'

// ── Tunable constants — adjust here only, nowhere else in the codebase ────────
const FREE_SHIPPING_FLAT_MIN_SAR = 30
const FREE_SHIPPING_FLAT_MAX_SAR = 40
const PAID_SHIPPING_MARKUP_MIN   = 0.15   // 15%
const PAID_SHIPPING_MARKUP_MAX   = 0.20   // 20%

/**
 * Deterministic pseudo-random value in [min, max] derived from a seed string.
 * Using a deterministic hash (not Math.random()) means the SAME product
 * always gets the SAME flat shipping fee on every page load and every sync
 * cycle — critical so the customer never sees a price that changes between
 * the product page and checkout for the same item.
 */
function seededRange(seed, min, max) {
  let hash = 0
  const str = String(seed || 'default')
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const normalized = (Math.abs(hash) % 1000) / 1000 // 0–0.999
  return min + normalized * (max - min)
}

/**
 * Calculate the customer-facing shipping fee and the hidden profit captured.
 *
 * @param {Object} params
 * @param {boolean} params.supplierFreeShipping - true if eBay listing has free shipping
 * @param {number}  params.supplierShippingCostUSD - actual shipping cost from eBay (0 if free)
 * @param {string}  params.seed - stable identifier (productId or itemId) for deterministic flat fee
 * @returns {Object} shipping breakdown — only `customerFeeSAR` and `customerFeeFormatted`
 *                    are ever sent to the frontend. The rest stays server-side for the ledger.
 */
export function calculateShipping({ supplierFreeShipping, supplierShippingCostUSD = 0, seed }) {
  if (supplierFreeShipping || !supplierShippingCostUSD || supplierShippingCostUSD <= 0) {
    // ── SCENARIO A: Free shipping from supplier ────────────────────────────
    // Customer is charged a flat fee; 100% of it is profit since we pay nothing.
    const flatFeeSAR = Math.round(
      seededRange(seed, FREE_SHIPPING_FLAT_MIN_SAR, FREE_SHIPPING_FLAT_MAX_SAR)
    )

    return {
      scenario:              'free_shipping_flat_fee',
      supplierShippingCostSAR: 0,
      customerFeeSAR:         flatFeeSAR,
      customerFeeFormatted:   `${flatFeeSAR.toLocaleString('en-SA')} SAR`,
      shippingProfitSAR:      flatFeeSAR,   // entire fee is profit
      markupPercent:          null,         // not applicable — flat fee model
    }
  }

  // ── SCENARIO B: Supplier charges real shipping cost ──────────────────────
  const supplierCostSAR = Math.round(supplierShippingCostUSD * USD_TO_SAR * 100) / 100
  const markup           = seededRange(seed, PAID_SHIPPING_MARKUP_MIN, PAID_SHIPPING_MARKUP_MAX)
  const customerFeeSAR   = Math.round(supplierCostSAR * (1 + markup))
  const shippingProfit   = parseFloat((customerFeeSAR - supplierCostSAR).toFixed(2))

  return {
    scenario:                'paid_shipping_markup',
    supplierShippingCostSAR: parseFloat(supplierCostSAR.toFixed(2)),
    customerFeeSAR,
    customerFeeFormatted:    `${customerFeeSAR.toLocaleString('en-SA')} SAR`,
    shippingProfitSAR:       shippingProfit,
    markupPercent:           parseFloat((markup * 100).toFixed(1)),
  }
}

/**
 * Convenience helper: total order line (product + shipping) for the ledger.
 * Used by capture-order.js to compute true net profit including shipping margin.
 */
export function calculateTotalProfit({ productProfitSAR = 0, shippingProfitSAR = 0 }) {
  return parseFloat((Number(productProfitSAR) + Number(shippingProfitSAR)).toFixed(2))
}
