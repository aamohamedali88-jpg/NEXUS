/**
 * HUSIN ESHOP — /marketplace
 * ENTERPRISE OPTIMIZED VERSION:
 * 1. Robust image error fallback with branded gradient placeholder
 * 2. SAR price formatter — proper Saudi locale comma separators
 * 3. Enterprise shimmer skeleton loaders during fetch
 * 4. Responsive grid: 4col → 3col → 2col → 1col
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import Head       from 'next/head'
import { db }     from '../lib/firebaseAdmin'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

// ── 1. SAR PRICE FORMATTER ────────────────────────────────────────────────────
function formatSAR(amount) {
  if (!amount && amount !== 0) return 'اتصل للسعر'
  const num = parseFloat(amount)
  if (isNaN(num)) return 'اتصل للسعر'
  // Saudi locale — comma thousands separator, no decimals for whole numbers
  const formatted = num % 1 === 0
    ? num.toLocaleString('en-SA', { maximumFractionDigits: 0 })
    : num.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatted} SAR`
}

// ── 2. IMAGE UPGRADE — eBay CDN low-res → high-res ────────────────────────────
function upgradeImageUrl(url) {
  if (!url) return null
  if (url.includes('i.ebayimg.com')) {
    return url
      .replace(/\/s-l\d+\./, '/s-l500.')
      .replace('/thumbs/', '/images/g/')
  }
  return url
}

// Category data
const CATEGORIES = [
  { value: 'all',             label: '🌐 All'          },
  { value: 'mobiles',         label: '📱 Mobiles'      },
  { value: 'laptops',         label: '💻 Laptops'      },
  { value: 'electronics',     label: '⚡ Electronics'  },
  { value: 'home_appliances', label: '🏠 Home'         },
  { value: 'clothes_men',     label: '👔 Men'          },
  { value: 'clothes_women',   label: '👗 Women'        },
  { value: 'clothes_kids',    label: '👶 Kids'         },
  { value: 'jewelry',         label: '💎 Jewelry'      },
  { value: 'beauty',          label: '💄 Beauty'       },
  { value: 'sports',          label: '🏋️ Sports'      },
  { value: 'toys',            label: '🧸 Toys'         },
  { value: 'general',         label: '📦 General'      },
]

// Gradient palette per category for branded placeholders
const CATEGORY_GRADIENTS = {
  mobiles:         'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  laptops:         'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%)',
  electronics:     'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #2d00f7 100%)',
  home_appliances: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #4a4a4a 100%)',
  clothes_men:     'linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #11998e 100%)',
  clothes_women:   'linear-gradient(135deg, #200122 0%, #6f0000 50%, #200122 100%)',
  clothes_kids:    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #e94560 100%)',
  jewelry:         'linear-gradient(135deg, #0d0d0d 0%, #1a1008 50%, #8b6914 100%)',
  beauty:          'linear-gradient(135deg, #1a0533 0%, #6f0000 50%, #ff416c 100%)',
  sports:          'linear-gradient(135deg, #0a3d0a 0%, #1a5c1a 50%, #00b09b 100%)',
  toys:            'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #ff6b6b 100%)',
  general:         'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2d2d2d 100%)',
}

// ── 3. SKELETON CARD COMPONENT ────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-img shimmer" />
      <div className="skeleton-body">
        <div className="skeleton-line shimmer skeleton-line-long"  />
        <div className="skeleton-line shimmer skeleton-line-short" />
        <div className="skeleton-footer">
          <div className="skeleton-price shimmer" />
          <div className="skeleton-btn shimmer"   />
        </div>
      </div>
    </div>
  )
}

function SkeletonGrid({ count = 12 }) {
  return (
    <div className="mp-grid" aria-label="Loading products...">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// ── 4. PRODUCT CARD WITH ROBUST IMAGE FALLBACK ────────────────────────────────
function ProductCard({ product }) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const gradient = CATEGORY_GRADIENTS[product.category] || CATEGORY_GRADIENTS.general
  const catLabel = CATEGORIES.find(c => c.value === product.category)?.label || '📦 General'
  const catIcon  = catLabel.split(' ')[0]

  const handleImgError = useCallback(() => setImgError(true),  [])
  const handleImgLoad  = useCallback(() => setImgLoaded(true), [])

  return (
    <a href={`/marketplace/${product.id}`} className="mp-card">

      {/* Image area */}
      <div className="mp-card-img">

        {/* Branded gradient placeholder — always rendered */}
        <div
          className="mp-img-placeholder"
          style={{ background: gradient, opacity: imgError || !product.image ? 1 : 0 }}
        >
          <span className="mp-placeholder-icon">{catIcon}</span>
          <span className="mp-placeholder-brand">HUSIN</span>
        </div>

        {/* Actual image — fades in on load */}
        {product.image && !imgError && (
          <img
            src={product.image}
            alt={product.name}
            className="mp-img"
            loading="lazy"
            decoding="async"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            onLoad={handleImgLoad}
            onError={handleImgError}
          />
        )}

        {/* Category badge */}
        <span className="mp-cat-badge">{catIcon}</span>

        {/* New badge for recently approved */}
        {product.isNew && (
          <span className="mp-new-badge">NEW</span>
        )}
      </div>

      {/* Card body */}
      <div className="mp-card-body">
        <p className="mp-card-name">{product.name}</p>
        {product.specifications && (
          <p className="mp-card-specs">{product.specifications}</p>
        )}
        <div className="mp-card-footer">
          {/* FORMATTED PRICE — proper SAR locale */}
          <span className="mp-price">{formatSAR(product.sellingPriceSAR)}</span>
          <span className="mp-buy">Buy Now →</span>
        </div>
      </div>
    </a>
  )
}

// ── SERVER-SIDE DATA FETCH ─────────────────────────────────────────────────────
export async function getServerSideProps() {
  try {
    const snap = await db
      .collection('shop_approved_products')
      .where('status', '==', 'live')
      .get()

    // Compute "new" flag — approved in last 48 hours
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const products = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id:                    d.id                    || doc.id,
        name:                  d.name                  || 'Product',
        image:                 upgradeImageUrl(d.image) || null,
        sellingPriceSAR:       d.sellingPriceSAR       || null,
        sellingPriceFormatted: formatSAR(d.sellingPriceSAR),
        category:              d.category              || 'general',
        specifications:        d.specifications        || null,
        approvedAt:            d.approvedAt            || '',
        isNew:                 (d.approvedAt || '') > cutoff,
        views:                 d.views                 || 0,
        sales:                 d.sales                 || 0,
      }
    })

    // Sort newest first
    products.sort((a, b) => (b.approvedAt > a.approvedAt ? 1 : -1))

    return { props: { products, total: products.length } }

  } catch (e) {
    console.error('[Marketplace] Error:', e.message)
    return { props: { products: [], total: 0 } }
  }
}

// ── MAIN PAGE COMPONENT ────────────────────────────────────────────────────────
export default function MarketplacePage({ products, total }) {
  const [cat,      setCat]      = useState('all')
  const [search,   setSearch]   = useState('')
  const [sort,     setSort]     = useState('newest')
  const [isClient, setIsClient] = useState(false)

  // Show skeletons until client hydrates
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Memoized filtering for 478 products — no re-compute on unrelated state
  const filtered = useMemo(() => {
    let result = products
    if (cat !== 'all') result = result.filter(p => p.category === cat)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.specifications?.toLowerCase().includes(q)
      )
    }
    if (sort === 'price_asc')  return [...result].sort((a, b) => (a.sellingPriceSAR || 0) - (b.sellingPriceSAR || 0))
    if (sort === 'price_desc') return [...result].sort((a, b) => (b.sellingPriceSAR || 0) - (a.sellingPriceSAR || 0))
    return result // already sorted newest first from server
  }, [products, cat, search, sort])

  // Category counts — memoized
  const catCounts = useMemo(() => {
    const counts = { all: products.length }
    CATEGORIES.forEach(c => {
      if (c.value !== 'all') {
        counts[c.value] = products.filter(p => p.category === c.value).length
      }
    })
    return counts
  }, [products])

  return (
    <>
      <Head>
        <title>HUSIN Marketplace — {total.toLocaleString()} Products</title>
        <meta name="description" content={`Shop ${total} curated products — fashion, electronics, jewelry, home appliances and more. Delivered across Saudi Arabia.`} />
        <meta property="og:title"       content="HUSIN Marketplace" />
        <meta property="og:description" content={`${total} products available — delivered to Saudi Arabia`} />
        <meta property="og:image"       content="https://www.husin.org/main%20logo-200h-200h.png" />
        <meta property="og:url"         content="https://www.husin.org/marketplace" />
        <meta property="og:type"        content="website" />
      </Head>

      <Navigation />

      <main className="mp-page">

        {/* ── Hero ── */}
        <div className="mp-hero">
          <div className="mp-hero-inner">
            <img
              src="/main%20logo-200h-200h.png"
              alt="HUSIN"
              className="mp-logo"
              onError={e => { e.target.style.display = 'none' }}
            />
            <h1 className="mp-hero-title">HUSIN Marketplace</h1>
            <p className="mp-hero-sub">
              Discover premium products from global sources — delivered across Saudi Arabia
            </p>
            <div className="mp-search-wrap">
              <span className="mp-search-icon">🔍</span>
              <input
                type="text"
                className="mp-search"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search products"
              />
              {search && (
                <button
                  className="mp-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >✕</button>
              )}
            </div>
            <p className="mp-total-count">
              {total.toLocaleString('en-SA')} products available
            </p>
          </div>
        </div>

        <div className="mp-body">

          {/* ── Sidebar ── */}
          <aside className="mp-sidebar" aria-label="Product categories">
            <h3 className="mp-sidebar-title">Categories</h3>
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCat(c.value)}
                className={`mp-cat-btn ${cat === c.value ? 'mp-cat-active' : ''}`}
                aria-pressed={cat === c.value}
              >
                <span>{c.label}</span>
                {catCounts[c.value] > 0 && (
                  <span className="mp-cat-count">
                    {catCounts[c.value].toLocaleString('en-SA')}
                  </span>
                )}
              </button>
            ))}
          </aside>

          {/* ── Main content ── */}
          <div className="mp-main">

            {/* Toolbar */}
            <div className="mp-toolbar">
              <span className="mp-count">
                {filtered.length.toLocaleString('en-SA')} product{filtered.length !== 1 ? 's' : ''}
                {search ? ` for "${search}"` : ''}
                {cat !== 'all' ? ` · ${CATEGORIES.find(c => c.value === cat)?.label}` : ''}
              </span>
              <select
                className="mp-sort"
                value={sort}
                onChange={e => setSort(e.target.value)}
                aria-label="Sort products"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>

            {/* ── SKELETON LOADERS — show before client hydrates ── */}
            {!isClient ? (
              <SkeletonGrid count={12} />
            ) : filtered.length === 0 ? (
              <div className="mp-empty">
                <div className="mp-empty-icon">🔍</div>
                <h3 className="mp-empty-title">
                  {products.length === 0 ? 'Products Coming Soon' : 'No products found'}
                </h3>
                <p className="mp-empty-sub">
                  {products.length === 0
                    ? 'Our team is curating premium products. Check back soon.'
                    : `No results for "${search}" in this category. Try a different search.`}
                </p>
                {search && (
                  <button className="mp-empty-reset" onClick={() => { setSearch(''); setCat('all') }}>
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="mp-grid">
                {filtered.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style jsx global>{`
        /* ── Shimmer keyframe ── */
        @keyframes shimmer {
          0%   { background-position: -800px 0; }
          100% { background-position:  800px 0; }
        }

        /* ── Skeleton card ── */
        .skeleton-card {
          background: #0f1117;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          overflow: hidden;
        }
        .skeleton-img {
          height: 200px;
          width: 100%;
        }
        .skeleton-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .skeleton-line {
          height: 12px;
          border-radius: 6px;
        }
        .skeleton-line-long  { width: 85%; }
        .skeleton-line-short { width: 55%; }
        .skeleton-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
        }
        .skeleton-price { width: 80px; height: 16px; border-radius: 6px; }
        .skeleton-btn   { width: 64px; height: 16px; border-radius: 6px; }

        /* ── Shimmer effect ── */
        .shimmer {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.04) 0%,
            rgba(255,255,255,0.10) 40%,
            rgba(255,255,255,0.04) 80%
          );
          background-size: 800px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
      `}</style>

      <style jsx>{`
        /* ── Page ── */
        .mp-page { background: var(--color-surface); min-height: 100vh; }

        /* ── Hero ── */
        .mp-hero { background: linear-gradient(135deg,#0a1628 0%,#0f2744 60%,#0a1628 100%); padding: 52px 40px 40px; text-align: center; border-bottom: 1px solid var(--color-border); }
        .mp-hero-inner { max-width: 700px; margin: 0 auto; }
        .mp-logo  { height: 64px; width: auto; object-fit: contain; margin: 0 auto 16px; display: block; }
        .mp-hero-title { color: #fff; font-size: 2.2rem; font-family: var(--font-family-heading); font-weight: 700; margin: 0 0 10px; }
        .mp-hero-sub   { color: rgba(255,255,255,0.5); font-size: 1rem; margin: 0 0 24px; line-height: 1.65; }
        .mp-search-wrap { position: relative; max-width: 520px; margin: 0 auto 10px; display: flex; align-items: center; }
        .mp-search-icon { position: absolute; left: 16px; font-size: 1rem; pointer-events: none; }
        .mp-search { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); border-radius: 12px; padding: 14px 44px 14px 44px; color: #fff; font-size: 0.95rem; outline: none; box-sizing: border-box; font-family: inherit; transition: border-color 0.2s, background 0.2s; }
        .mp-search::placeholder { color: rgba(255,255,255,0.3); }
        .mp-search:focus { border-color: var(--color-accent); background: rgba(255,255,255,0.09); }
        .mp-search-clear { position: absolute; right: 14px; background: transparent; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 0.9rem; padding: 4px; transition: color 0.2s; }
        .mp-search-clear:hover { color: #fff; }
        .mp-total-count { color: rgba(255,255,255,0.3); font-size: 0.8rem; margin: 0; }

        /* ── Layout ── */
        .mp-body { display: flex; max-width: 1600px; margin: 0 auto; padding: 32px; gap: 28px; }

        /* ── Sidebar ── */
        .mp-sidebar { width: 210px; flex-shrink: 0; position: sticky; top: 80px; align-self: flex-start; max-height: calc(100vh - 100px); overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        .mp-sidebar-title { color: rgba(255,255,255,0.45); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 14px; font-weight: 600; }
        .mp-cat-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; background: transparent; border: none; color: rgba(255,255,255,0.55); padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 0.82rem; text-align: left; font-family: inherit; margin-bottom: 2px; transition: all 0.15s; }
        .mp-cat-btn:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); }
        .mp-cat-active { background: rgba(0,217,255,0.09) !important; color: #00d9ff !important; border-left: 2px solid #00d9ff; }
        .mp-cat-count { background: rgba(0,217,255,0.12); color: rgba(0,217,255,0.8); padding: 2px 7px; border-radius: 20px; font-size: 0.68rem; flex-shrink: 0; }

        /* ── Main ── */
        .mp-main { flex: 1; min-width: 0; }
        .mp-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 10px; }
        .mp-count { color: rgba(255,255,255,0.4); font-size: 0.83rem; }
        .mp-sort { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(255,255,255,0.75); padding: 8px 12px; font-size: 0.83rem; outline: none; cursor: pointer; font-family: inherit; transition: border-color 0.2s; }
        .mp-sort:hover { border-color: rgba(255,255,255,0.2); }
        .mp-sort option { background: #0f1117; }

        /* ── RESPONSIVE GRID: 4 → 3 → 2 → 1 columns ── */
        .mp-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);  /* Desktop: 4 columns */
          gap: 18px;
        }

        /* ── Product card ── */
        .mp-card { background: #0f1117; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column; transition: transform 0.2s ease, border-color 0.2s, box-shadow 0.2s; cursor: pointer; }
        .mp-card:hover { transform: translateY(-5px); border-color: rgba(0,217,255,0.35); box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,217,255,0.1); }

        /* ── Image area — white bg, contain (no warping) ── */
        .mp-card-img { position: relative; height: 200px; background: #fff; overflow: hidden; display: flex; align-items: center; justify-content: center; }

        /* ── Branded gradient placeholder ── */
        .mp-img-placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.3s; }
        .mp-placeholder-icon  { font-size: 36px; opacity: 0.6; }
        .mp-placeholder-brand { color: rgba(255,255,255,0.25); font-size: 0.65rem; letter-spacing: 0.2em; font-weight: 700; text-transform: uppercase; }

        /* ── Actual product image ── */
        .mp-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; padding: 8px; box-sizing: border-box; transition: opacity 0.4s ease, transform 0.3s ease; }
        .mp-card:hover .mp-img { transform: scale(1.04); }

        .mp-cat-badge { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.6); color: rgba(255,255,255,0.85); padding: 3px 8px; border-radius: 20px; font-size: 0.72rem; backdrop-filter: blur(4px); z-index: 2; }
        .mp-new-badge { position: absolute; top: 8px; right: 8px; background: #00d9ff; color: #000; padding: 2px 7px; border-radius: 20px; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.05em; z-index: 2; }

        /* ── Card body ── */
        .mp-card-body  { padding: 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .mp-card-name  { color: #e8eaf0; font-size: 0.83rem; font-weight: 500; line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mp-card-specs { color: rgba(255,255,255,0.38); font-size: 0.72rem; margin: 0; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .mp-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
        .mp-price { color: var(--color-primary, #c8a46d); font-size: 0.92rem; font-weight: 700; letter-spacing: 0.01em; }
        .mp-buy   { color: #00d9ff; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }

        /* ── Empty state ── */
        .mp-empty { text-align: center; padding: 80px 20px; }
        .mp-empty-icon { font-size: 52px; margin-bottom: 16px; }
        .mp-empty-title { color: #fff; font-size: 1.25rem; font-weight: 600; margin: 0 0 8px; }
        .mp-empty-sub { color: rgba(255,255,255,0.4); font-size: 0.9rem; line-height: 1.65; max-width: 400px; margin: 0 auto 20px; }
        .mp-empty-reset { background: rgba(0,217,255,0.1); border: 1px solid rgba(0,217,255,0.25); color: #00d9ff; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 0.875rem; transition: all 0.2s; }
        .mp-empty-reset:hover { background: rgba(0,217,255,0.18); }

        /* ── RESPONSIVE BREAKPOINTS ── */

        /* Smaller desktop / laptop: 3 columns */
        @media (max-width: 1280px) {
          .mp-grid { grid-template-columns: repeat(3, 1fr); }
        }

        /* Tablet landscape: 3 columns */
        @media (max-width: 1024px) {
          .mp-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
          .mp-body { padding: 24px 20px; gap: 20px; }
          .mp-sidebar { width: 180px; }
        }

        /* Tablet portrait / large mobile: 2 columns */
        @media (max-width: 768px) {
          .mp-body    { flex-direction: column; padding: 16px; gap: 16px; }
          .mp-sidebar { width: 100%; position: static; max-height: none; overflow: visible; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
          .mp-sidebar-title { width: 100%; margin-bottom: 6px; }
          .mp-cat-btn { width: auto; padding: 6px 10px; font-size: 0.78rem; border: 1px solid rgba(255,255,255,0.08); }
          .mp-cat-active { border-color: rgba(0,217,255,0.35) !important; border-left: 1px solid rgba(0,217,255,0.35) !important; }
          .mp-hero    { padding: 36px 20px 28px; }
          .mp-hero-title { font-size: 1.6rem; }
          .mp-logo    { height: 52px; }
          .mp-grid    { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .mp-card-img { height: 160px; }
        }

        /* Small mobile: 2 columns (tight) */
        @media (max-width: 480px) {
          .mp-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .mp-card-img { height: 140px; }
          .mp-card-body { padding: 10px; }
          .mp-card-name { font-size: 0.78rem; }
          .mp-price { font-size: 0.82rem; }
          .mp-hero-title { font-size: 1.35rem; }
        }

        /* Very small: 1 column */
        @media (max-width: 320px) {
          .mp-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  )
}
