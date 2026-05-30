/**
 * HUSIN ESHOP — /marketplace
 * QA FIXED VERSION — All 5 audit issues resolved:
 * 1. Price & CTA separated into distinct elements with proper spacing
 * 2. Sidebar collapses to horizontal scroll on mobile
 * 3. Defensive padding prevents text clipping
 * 4. Card titles use line-clamp with min-height for uniform card heights
 * 5. Grid takes full width on mobile with no sidebar interference
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import Head       from 'next/head'
import { db }     from '../lib/firebaseAdmin'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

// ── SAR formatter ─────────────────────────────────────────────────────────────
function formatSAR(amount) {
  if (!amount && amount !== 0) return 'اتصل للسعر'
  const num = parseFloat(amount)
  if (isNaN(num)) return 'اتصل للسعر'
  const formatted = num % 1 === 0
    ? num.toLocaleString('en-SA', { maximumFractionDigits: 0 })
    : num.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatted} SAR`
}

// ── eBay image upgrade ────────────────────────────────────────────────────────
function upgradeImageUrl(url) {
  if (!url) return null
  if (url.includes('i.ebayimg.com')) {
    return url.replace(/\/s-l\d+\./, '/s-l500.').replace('/thumbs/', '/images/g/')
  }
  return url
}

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

const CATEGORY_GRADIENTS = {
  mobiles:         'linear-gradient(135deg,#1a1a2e,#0f3460)',
  laptops:         'linear-gradient(135deg,#0d1b2a,#415a77)',
  electronics:     'linear-gradient(135deg,#0a0a0a,#2d00f7)',
  home_appliances: 'linear-gradient(135deg,#1a1a1a,#4a4a4a)',
  clothes_men:     'linear-gradient(135deg,#1a0533,#11998e)',
  clothes_women:   'linear-gradient(135deg,#200122,#6f0000)',
  clothes_kids:    'linear-gradient(135deg,#1a1a2e,#e94560)',
  jewelry:         'linear-gradient(135deg,#0d0d0d,#8b6914)',
  beauty:          'linear-gradient(135deg,#1a0533,#ff416c)',
  sports:          'linear-gradient(135deg,#0a3d0a,#00b09b)',
  toys:            'linear-gradient(135deg,#1a1a2e,#ff6b6b)',
  general:         'linear-gradient(135deg,#0a0a0a,#2d2d2d)',
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="sk-card" aria-hidden="true">
      <div className="sk-img shimmer" />
      <div className="sk-body">
        <div className="sk-line shimmer sk-long"  />
        <div className="sk-line shimmer sk-short" />
        <div className="sk-footer">
          <div className="sk-price shimmer" />
          <div className="sk-btn shimmer"   />
        </div>
      </div>
    </div>
  )
}

// ── FIX 4: Product card — line-clamp + min-height on title ────────────────────
function ProductCard({ product }) {
  const [imgErr,    setImgErr]    = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const gradient = CATEGORY_GRADIENTS[product.category] || CATEGORY_GRADIENTS.general
  const catLabel = CATEGORIES.find(c => c.value === product.category)?.label || '📦 General'
  const catIcon  = catLabel.split(' ')[0]

  const onErr  = useCallback(() => setImgErr(true),    [])
  const onLoad = useCallback(() => setImgLoaded(true), [])

  return (
    <a href={`/marketplace/${product.id}`} className="mp-card">

      {/* Image */}
      <div className="mp-card-img">
        <div
          className="mp-img-ph"
          style={{ background: gradient, opacity: imgErr || !product.image ? 1 : 0 }}
        >
          <span className="mp-ph-icon">{catIcon}</span>
          <span className="mp-ph-brand">HUSIN</span>
        </div>
        {product.image && !imgErr && (
          <img
            src={product.image}
            alt={product.name}
            className="mp-img"
            loading="lazy"
            decoding="async"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            onLoad={onLoad}
            onError={onErr}
          />
        )}
        <span className="mp-cat-badge">{catIcon}</span>
        {product.isNew && <span className="mp-new-badge">NEW</span>}
      </div>

      {/* Body */}
      <div className="mp-card-body">

        {/* FIX 4: line-clamp-2 + min-h ensures all cards same height */}
        <p className="mp-card-name">{product.name}</p>

        {product.specifications && (
          <p className="mp-card-specs">{product.specifications}</p>
        )}

        {/* FIX 1: Price and CTA in SEPARATE block elements — never merges */}
        <div className="mp-card-footer">
          <span className="mp-price">
            {formatSAR(product.sellingPriceSAR)}
          </span>
          <span className="mp-cta">
            Buy Now
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>

      </div>
    </a>
  )
}

// ── Server-side data ──────────────────────────────────────────────────────────
export async function getServerSideProps() {
  try {
    const snap = await db
      .collection('shop_approved_products')
      .where('status', '==', 'live')
      .get()

    const cutoff   = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const products = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id:              d.id                    || doc.id,
        name:            d.name                  || 'Product',
        image:           upgradeImageUrl(d.image) || null,
        sellingPriceSAR: d.sellingPriceSAR       || null,
        category:        d.category              || 'general',
        specifications:  d.specifications        || null,
        approvedAt:      d.approvedAt            || '',
        isNew:           (d.approvedAt || '') > cutoff,
        views:           d.views                 || 0,
        sales:           d.sales                 || 0,
      }
    })

    products.sort((a, b) => (b.approvedAt > a.approvedAt ? 1 : -1))
    return { props: { products, total: products.length } }

  } catch (e) {
    console.error('[Marketplace]', e.message)
    return { props: { products: [], total: 0 } }
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MarketplacePage({ products, total }) {
  const [cat,      setCat]      = useState('all')
  const [search,   setSearch]   = useState('')
  const [sort,     setSort]     = useState('newest')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => { setIsClient(true) }, [])

  const filtered = useMemo(() => {
    let r = products
    if (cat !== 'all') r = r.filter(p => p.category === cat)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(p => p.name?.toLowerCase().includes(q) || p.specifications?.toLowerCase().includes(q))
    }
    if (sort === 'price_asc')  return [...r].sort((a, b) => (a.sellingPriceSAR||0) - (b.sellingPriceSAR||0))
    if (sort === 'price_desc') return [...r].sort((a, b) => (b.sellingPriceSAR||0) - (a.sellingPriceSAR||0))
    return r
  }, [products, cat, search, sort])

  const catCounts = useMemo(() => {
    const c = { all: products.length }
    CATEGORIES.forEach(cat => {
      if (cat.value !== 'all') c[cat.value] = products.filter(p => p.category === cat.value).length
    })
    return c
  }, [products])

  return (
    <>
      <Head>
        <title>HUSIN Marketplace — {total.toLocaleString()} Products</title>
        <meta name="description" content={`Shop ${total} curated products — delivered across Saudi Arabia.`} />
        <meta property="og:title"  content="HUSIN Marketplace" />
        <meta property="og:image"  content="https://www.husin.org/main%20logo-200h-200h.png" />
        <meta property="og:url"    content="https://www.husin.org/marketplace" />
      </Head>

      <Navigation />

      <main className="mp-page">

        {/* Hero */}
        <div className="mp-hero">
          <div className="mp-hero-inner">
            <img src="/main%20logo-200h-200h.png" alt="HUSIN" className="mp-logo"
              onError={e => { e.target.style.display = 'none' }} />
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
              />
              {search && (
                <button className="mp-search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            <p className="mp-total-count">{total.toLocaleString('en-SA')} products available</p>
          </div>
        </div>

        {/* FIX 2: Sidebar horizontal scroll on mobile */}
        <div className="mp-cat-bar">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCat(c.value)}
              className={`mp-cat-pill ${cat === c.value ? 'mp-cat-pill-active' : ''}`}
            >
              {c.label}
              {catCounts[c.value] > 0 && (
                <span className="mp-pill-count">{catCounts[c.value]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="mp-body">

          {/* FIX 2: Desktop sidebar — hidden on mobile (cat-bar shows instead) */}
          <aside className="mp-sidebar">
            <h3 className="mp-sidebar-title">Categories</h3>
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCat(c.value)}
                className={`mp-cat-btn ${cat === c.value ? 'mp-cat-active' : ''}`}
              >
                <span>{c.label}</span>
                {catCounts[c.value] > 0 && (
                  <span className="mp-cat-count">{catCounts[c.value].toLocaleString()}</span>
                )}
              </button>
            ))}
          </aside>

          {/* Main grid area */}
          <div className="mp-main">
            <div className="mp-toolbar">
              <span className="mp-count">
                {filtered.length.toLocaleString('en-SA')} product{filtered.length !== 1 ? 's' : ''}
                {search ? ` for "${search}"` : ''}
              </span>
              <select className="mp-sort" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>

            {!isClient ? (
              <div className="mp-grid">
                {Array.from({ length: 12 }, (_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="mp-empty">
                <div className="mp-empty-icon">🔍</div>
                <h3 className="mp-empty-title">
                  {products.length === 0 ? 'Products Coming Soon' : 'No products found'}
                </h3>
                <p className="mp-empty-sub">
                  {products.length === 0
                    ? 'Our team is curating premium products. Check back soon.'
                    : 'Try a different search term or browse another category.'}
                </p>
                {(search || cat !== 'all') && (
                  <button className="mp-empty-reset" onClick={() => { setSearch(''); setCat('all') }}>
                    Clear all filters
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
        @keyframes shimmer {
          0%   { background-position: -800px 0; }
          100% { background-position:  800px 0; }
        }
        .shimmer {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 0%,
            rgba(255,255,255,0.10) 40%,
            rgba(255,255,255,0.04) 80%
          );
          background-size: 800px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
        .sk-card { background:#0f1117; border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden; }
        .sk-img  { height:200px; width:100%; }
        .sk-body { padding:14px; display:flex; flex-direction:column; gap:10px; }
        .sk-line { height:12px; border-radius:6px; }
        .sk-long  { width:85%; }
        .sk-short { width:55%; }
        .sk-footer { display:flex; justify-content:space-between; align-items:center; margin-top:6px; }
        .sk-price  { width:80px; height:16px; border-radius:6px; }
        .sk-btn    { width:64px; height:16px; border-radius:6px; }
      `}</style>

      <style jsx>{`
        /* ── Page ── */
        .mp-page { background:var(--color-surface); min-height:100vh; overflow-x:hidden; }

        /* ── Hero — FIX 3: defensive px-4 prevents text clipping ── */
        .mp-hero { background:linear-gradient(135deg,#0a1628 0%,#0f2744 60%,#0a1628 100%); padding:52px 24px 40px; text-align:center; border-bottom:1px solid var(--color-border); }
        .mp-hero-inner { max-width:700px; margin:0 auto; width:100%; box-sizing:border-box; }
        .mp-logo { height:60px; width:auto; object-fit:contain; margin:0 auto 16px; display:block; }
        .mp-hero-title { color:#fff; font-size:2.2rem; font-family:var(--font-family-heading); font-weight:700; margin:0 0 10px; }
        .mp-hero-sub   { color:rgba(255,255,255,0.5); font-size:1rem; margin:0 0 24px; line-height:1.65; padding:0 8px; }
        .mp-search-wrap { position:relative; max-width:520px; margin:0 auto 10px; display:flex; align-items:center; }
        .mp-search-icon { position:absolute; left:16px; font-size:1rem; pointer-events:none; z-index:1; }
        .mp-search { width:100%; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.14); border-radius:12px; padding:14px 44px; color:#fff; font-size:0.95rem; outline:none; box-sizing:border-box; font-family:inherit; transition:border-color 0.2s; }
        .mp-search::placeholder { color:rgba(255,255,255,0.3); }
        .mp-search:focus { border-color:var(--color-accent); }
        .mp-search-clear { position:absolute; right:14px; background:transparent; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:0.9rem; padding:4px; }
        .mp-search-clear:hover { color:#fff; }
        .mp-total-count { color:rgba(255,255,255,0.3); font-size:0.8rem; margin:0; }

        /* ── FIX 2: Horizontal pill bar — MOBILE ONLY (hidden on desktop) ── */
        .mp-cat-bar {
          display: none; /* hidden on desktop */
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 12px 16px;
          gap: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.01);
        }
        .mp-cat-bar::-webkit-scrollbar { display:none; }
        .mp-cat-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          color: rgba(255,255,255,0.65);
          padding: 7px 14px;
          font-size: 0.8rem;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .mp-cat-pill:hover { background:rgba(255,255,255,0.09); color:#fff; }
        .mp-cat-pill-active { background:rgba(0,217,255,0.1) !important; border-color:rgba(0,217,255,0.4) !important; color:#00d9ff !important; }
        .mp-pill-count { background:rgba(0,217,255,0.15); color:#00d9ff; padding:1px 6px; border-radius:10px; font-size:0.68rem; }

        /* ── Layout ── */
        .mp-body { display:flex; max-width:1600px; margin:0 auto; padding:32px; gap:28px; box-sizing:border-box; }

        /* ── Desktop sidebar ── */
        .mp-sidebar { width:210px; flex-shrink:0; position:sticky; top:80px; align-self:flex-start; max-height:calc(100vh - 100px); overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.1) transparent; }
        .mp-sidebar-title { color:rgba(255,255,255,0.45); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 14px; font-weight:600; }
        .mp-cat-btn { display:flex; align-items:center; justify-content:space-between; width:100%; background:transparent; border:none; color:rgba(255,255,255,0.55); padding:9px 12px; border-radius:8px; cursor:pointer; font-size:0.82rem; text-align:left; font-family:inherit; margin-bottom:2px; transition:all 0.15s; }
        .mp-cat-btn:hover { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.85); }
        .mp-cat-active { background:rgba(0,217,255,0.09) !important; color:#00d9ff !important; border-left:2px solid #00d9ff; }
        .mp-cat-count { background:rgba(0,217,255,0.12); color:rgba(0,217,255,0.8); padding:2px 7px; border-radius:20px; font-size:0.68rem; flex-shrink:0; }

        /* ── Main ── */
        .mp-main { flex:1; min-width:0; }
        .mp-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; flex-wrap:wrap; gap:10px; }
        .mp-count { color:rgba(255,255,255,0.4); font-size:0.83rem; }
        .mp-sort { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:rgba(255,255,255,0.75); padding:8px 12px; font-size:0.83rem; outline:none; cursor:pointer; font-family:inherit; }
        .mp-sort option { background:#0f1117; }

        /* ── GRID: 4 → 3 → 2 columns ── */
        .mp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }

        /* ── Card ── */
        .mp-card { background:#0f1117; border:1px solid rgba(255,255,255,0.07); border-radius:12px; overflow:hidden; text-decoration:none; display:flex; flex-direction:column; transition:transform 0.2s,border-color 0.2s,box-shadow 0.2s; }
        .mp-card:hover { transform:translateY(-5px); border-color:rgba(0,217,255,0.35); box-shadow:0 16px 40px rgba(0,0,0,0.4); }

        /* ── Card image ── */
        .mp-card-img { position:relative; height:200px; background:#fff; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .mp-img-ph   { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; transition:opacity 0.3s; }
        .mp-ph-icon  { font-size:36px; opacity:0.6; }
        .mp-ph-brand { color:rgba(255,255,255,0.25); font-size:0.62rem; letter-spacing:0.2em; font-weight:700; text-transform:uppercase; }
        .mp-img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:8px; box-sizing:border-box; transition:opacity 0.4s,transform 0.3s; }
        .mp-card:hover .mp-img { transform:scale(1.04); }
        .mp-cat-badge { position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.6); color:rgba(255,255,255,0.85); padding:3px 8px; border-radius:20px; font-size:0.72rem; backdrop-filter:blur(4px); z-index:2; }
        .mp-new-badge { position:absolute; top:8px; right:8px; background:#00d9ff; color:#000; padding:2px 7px; border-radius:20px; font-size:0.62rem; font-weight:800; z-index:2; }

        /* ── Card body ── */
        .mp-card-body { padding:14px; display:flex; flex-direction:column; gap:6px; flex:1; }

        /* FIX 4: min-height ensures uniform card heights regardless of title length */
        .mp-card-name {
          color:#e8eaf0;
          font-size:0.83rem;
          font-weight:500;
          line-height:1.5;
          margin:0;
          min-height:2.5rem;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }
        .mp-card-specs { color:rgba(255,255,255,0.38); font-size:0.72rem; margin:0; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }

        /* FIX 1: Price and CTA are SEPARATE block elements — never concatenates */
        .mp-card-footer {
          display:flex;
          flex-direction:column;  /* Stack vertically */
          gap:8px;
          margin-top:auto;
          padding-top:10px;
          border-top:1px solid rgba(255,255,255,0.06);
        }
        .mp-price {
          display:block;
          color:var(--color-primary,#c8a46d);
          font-size:1rem;
          font-weight:700;
          letter-spacing:0.01em;
          line-height:1;
        }
        .mp-cta {
          display:inline-flex;
          align-items:center;
          color:#00d9ff;
          font-size:0.75rem;
          font-weight:600;
          background:rgba(0,217,255,0.07);
          border:1px solid rgba(0,217,255,0.2);
          border-radius:6px;
          padding:5px 10px;
          transition:background 0.2s;
          width:fit-content;
        }
        .mp-card:hover .mp-cta { background:rgba(0,217,255,0.14); }

        /* ── Empty ── */
        .mp-empty { text-align:center; padding:80px 20px; }
        .mp-empty-icon  { font-size:52px; margin-bottom:16px; }
        .mp-empty-title { color:#fff; font-size:1.25rem; font-weight:600; margin:0 0 8px; }
        .mp-empty-sub   { color:rgba(255,255,255,0.4); font-size:0.9rem; line-height:1.65; max-width:400px; margin:0 auto 20px; }
        .mp-empty-reset { background:rgba(0,217,255,0.1); border:1px solid rgba(0,217,255,0.25); color:#00d9ff; padding:10px 24px; border-radius:8px; cursor:pointer; font-family:inherit; font-size:0.875rem; }

        /* ── RESPONSIVE ── */
        @media (max-width:1280px) { .mp-grid { grid-template-columns:repeat(3,1fr); } }

        @media (max-width:1024px) {
          .mp-grid    { grid-template-columns:repeat(3,1fr); gap:14px; }
          .mp-body    { padding:24px 20px; gap:20px; }
          .mp-sidebar { width:180px; }
        }

        /* FIX 2: Switch to pill bar on mobile, hide desktop sidebar */
        @media (max-width:768px) {
          .mp-cat-bar { display:flex; }           /* show pill bar */
          .mp-sidebar  { display:none; }          /* hide desktop sidebar */
          .mp-body     { padding:16px; }
          /* FIX 5: grid takes full width — no sidebar interference */
          .mp-main     { width:100%; }
          .mp-grid     { grid-template-columns:repeat(2,1fr); gap:12px; }
          .mp-card-img { height:160px; }
          .mp-hero     { padding:36px 16px 28px; } /* FIX 3: padding prevents clipping */
          .mp-hero-title { font-size:1.6rem; }
          .mp-logo     { height:52px; }
        }

        @media (max-width:480px) {
          .mp-grid     { grid-template-columns:repeat(2,1fr); gap:10px; }
          .mp-card-img { height:140px; }
          .mp-card-body { padding:10px; }
          .mp-card-name { font-size:0.78rem; min-height:2.2rem; }
          .mp-price    { font-size:0.88rem; }
          .mp-hero-title { font-size:1.35rem; }
          .mp-hero     { padding:28px 16px 24px; }
        }

        @media (max-width:320px) {
          .mp-grid { grid-template-columns:1fr; }
        }
      `}</style>
    </>
  )
}
