/**
 * HUSIN ESHOP — lib/productLocalization.js
 * Part 5: "Implement a fallback so that when an Arabic user views a natively
 * English eBay product, the UI remains perfectly stable and intact."
 *
 * IMPORTANT — scope of what this actually does:
 * There is no live translation engine in this codebase yet (the 🌐 EN/AR
 * toggle in components/navigation.js is a disabled "coming soon" stub — it
 * doesn't call any translation API). Scraped eBay products only ever have
 * English `name`/`description` fields (see product-details.js, trigger-worker.js).
 *
 * So this helper does NOT translate anything. It does exactly what the spec
 * line above actually asks for: null-safe fallbacks so a missing Arabic field
 * never renders "undefined" or crashes the page — falling back to English and
 * (optionally) flagging that to the UI. Schema is forward-compatible: if
 * nameAr/descriptionAr fields get populated later (manual entry or a real
 * translation pipeline), this same helper picks them up automatically.
 */

/**
 * Resolve the best available product name for a given language.
 * @param {object} product - Firestore product doc data
 * @param {'ar'|'en'} lang
 * @returns {{ text: string, isFallback: boolean, lang: 'ar'|'en' }}
 */
export function getLocalizedName(product, lang = 'ar') {
  if (!product) return { text: '', isFallback: false, lang }

  if (lang === 'ar') {
    if (product.nameAr) return { text: product.nameAr, isFallback: false, lang: 'ar' }
    const fallback = product.nameEn || product.name || 'منتج'
    return { text: fallback, isFallback: true, lang: 'en' }
  }

  const text = product.nameEn || product.name || product.nameAr || 'Product'
  return { text, isFallback: !product.nameEn && !product.name, lang: 'en' }
}

/**
 * Resolve the best available product description for a given language.
 * @param {object} product
 * @param {'ar'|'en'} lang
 * @returns {{ text: string, isFallback: boolean, lang: 'ar'|'en' }}
 */
export function getLocalizedDescription(product, lang = 'ar') {
  if (!product) return { text: '', isFallback: false, lang }

  if (lang === 'ar') {
    if (product.descriptionAr) return { text: product.descriptionAr, isFallback: false, lang: 'ar' }
    const fallback = product.descriptionEn || product.description || ''
    return { text: fallback, isFallback: true, lang: 'en' }
  }

  const text = product.descriptionEn || product.description || product.descriptionAr || ''
  return { text, isFallback: !product.descriptionEn && !product.description, lang: 'en' }
}

/**
 * Convenience: true if the product has no Arabic content at all, so calling
 * UI can decide whether to show a small "EN" / "English listing" badge.
 */
export function isEnglishOnlyProduct(product) {
  if (!product) return false
  return !product.nameAr && !product.descriptionAr
}
