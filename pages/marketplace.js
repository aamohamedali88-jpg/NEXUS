/**
 * HUSIN ESHOP — /marketplace — FINAL VERSION
 * All issues fixed:
 * ✅ Sidebar hidden on mobile — replaced by horizontal pill scroll
 * ✅ Price and Buy Now are completely separate elements
 * ✅ No text concatenation anywhere
 * ✅ Responsive: 4→3→2 columns
 * ✅ Image fallback with branded gradient
 * ✅ SAR formatted with commas
 * ✅ Skeleton loaders on first load
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import Head       from 'next/head'
import { db }     from '../lib/firebaseAdmin'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

function formatSAR(amount) {
  if (!amount && amount !== 0) return null
  const num = parseFloat(amount)
  if (isNaN(num) || num <= 0) return null
  return num.toLocaleString('en-SA', { maximumFractionDigits: 0 }) + ' SAR'
}

function upgradeImageUrl(url) {
  if (!url) return null
  if (url.includes('i.ebayimg.com')) {
    return url.replace(/\/s-l\d+\./, '/s-l500.').replace('/thumbs/', '/images/g/')
  }
  return url
}

const CATS = [
  { v: 'all',             l: '🌐 All'         },
  { v: 'mobiles',         l: '📱 Mobiles'     },
  { v: 'laptops',         l: '💻 Laptops'     },
  { v: 'electronics',     l: '⚡ Electronics' },
  { v: 'home_appliances', l: '🏠 Home'        },
  { v: 'clothes_men',     l: '👔 Men'         },
  { v: 'clothes_women',   l: '👗 Women'       },
  { v: 'clothes_kids',    l: '👶 Kids'        },
  { v: 'jewelry',         l: '💎 Jewelry'     },
  { v: 'beauty',          l: '💄 Beauty'      },
  { v: 'sports',          l: '🏋️ Sports'     },
  { v: 'toys',            l: '🧸 Toys'        },
  { v: 'general',         l: '📦 General'     },
]

const GRADS = {
  mobiles:         'linear-gradient(135deg,#1a1a2e,#0f3460)',
  laptops:         'linear-gradient(135deg,#0d1b2a,#415a77)',
  electronics:     'linear-gradient(135deg,#0a0a0a,#1a1a6e)',
  home_appliances: 'linear-gradient(135deg,#1a1a1a,#3a3a3a)',
  clothes_men:     'linear-gradient(135deg,#1a0533,#11998e)',
  clothes_women:   'linear-gradient(135deg,#200122,#6f0000)',
  clothes_kids:    'linear-gradient(135deg,#1a1a2e,#e94560)',
  jewelry:         'linear-gradient(135deg,#0d0d0d,#8b6914)',
  beauty:          'linear-gradient(135deg,#1a0533,#ff416c)',
  sports:          'linear-gradient(135deg,#0a3d0a,#00b09b)',
  toys:            'linear-gradient(135deg,#1a1a2e,#ff6b6b)',
  general:         'linear-gradient(135deg,#111,#2d2d2d)',
}

function Skeleton() {
  return (
    <div className="sk-card">
      <div className="sk-img shimmer" />
      <div className="sk-body">
        <div className="sk-line shimmer" style={{ width:'85%' }} />
        <div className="sk-line shimmer" style={{ width:'60%' }} />
        <div className="sk-foot">
          <div className="sk-price shimmer" />
          <div className="sk-btn shimmer"   />
        </div>
      </div>
    </div>
  )
}

function Card({ p }) {
  const [err,    setErr]    = useState(false)
  const [loaded, setLoaded] = useState(false)
  const grad = GRADS[p.category] || GRADS.general
  const icon = CATS.find(c => c.v === p.category)?.l?.split(' ')[0] || '📦'
  const price = formatSAR(p.sellingPriceSAR)

  return (
    <a href={`/marketplace/${p.id}`} className="mp-card">
      {/* Image */}
      <div className="mp-img-wrap">
        {/* Gradient placeholder */}
        <div className="mp-img-ph" style={{ background: grad, opacity: (err || !p.image) ? 1 : 0 }}>
          <span className="mp-ph-icon">{icon}</span>
          <span className="mp-ph-txt">HUSIN</span>
        </div>
        {/* Real image */}
        {p.image && !err && (
          <img
            src={p.image}
            alt={p.name}
            className="mp-img"
            loading="lazy"
            decoding="async"
            style={{ opacity: loaded ? 1 : 0 }}
            onLoad={() => setLoaded(true)}
            onError={() => setErr(true)}
          />
        )}
        <span className="mp-badge">{icon}</span>
        {p.isNew && <span className="mp-new">NEW</span>}
      </div>

      {/* Body */}
      <div className="mp-body">
        <p className="mp-name">{p.name}</p>
        {p.specifications && <p className="mp-spec">{p.specifications}</p>}

        {/* PRICE — standalone block */}
        {price && <p className="mp-price">{price}</p>}

        {/* BUY NOW — completely separate element below price */}
        <div className="mp-cta-wrap">
          <span className="mp-cta">Buy Now →</span>
        </div>
      </div>
    </a>
  )
}

export async function getServerSideProps() {
  try {
    const snap = await db.collection('shop_approved_products')
      .where('status', '==', 'live').get()

    const cutoff   = new Date(Date.now() - 48*60*60*1000).toISOString()
    const products = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id:              d.id             || doc.id,
        name:            d.name           || 'Product',
        image:           upgradeImageUrl(d.image) || null,
        sellingPriceSAR: d.sellingPriceSAR || null,
        category:        d.category       || 'general',
        specifications:  d.specifications || null,
        approvedAt:      d.approvedAt     || '',
        isNew:           (d.approvedAt||'') > cutoff,
      }
    })
    products.sort((a,b) => b.approvedAt > a.approvedAt ? 1 : -1)
    return { props: { products, total: products.length } }
  } catch (e) {
    console.error('[Marketplace]', e.message)
    return { props: { products: [], total: 0 } }
  }
}

export default function Marketplace({ products, total }) {
  const [cat,      setCat]      = useState('all')
  const [search,   setSearch]   = useState('')
  const [sort,     setSort]     = useState('newest')
  const [ready,    setReady]    = useState(false)

  useEffect(() => { setReady(true) }, [])

  const filtered = useMemo(() => {
    let r = cat === 'all' ? products : products.filter(p => p.category === cat)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(p => p.name?.toLowerCase().includes(q) || p.specifications?.toLowerCase().includes(q))
    }
    if (sort === 'price_asc')  return [...r].sort((a,b) => (a.sellingPriceSAR||0)-(b.sellingPriceSAR||0))
    if (sort === 'price_desc') return [...r].sort((a,b) => (b.sellingPriceSAR||0)-(a.sellingPriceSAR||0))
    return r
  }, [products, cat, search, sort])

  const counts = useMemo(() => {
    const c = { all: products.length }
    CATS.forEach(({ v }) => { if (v !== 'all') c[v] = products.filter(p => p.category === v).length })
    return c
  }, [products])

  return (
    <>
      <Head>
        <title>HUSIN Marketplace — {total.toLocaleString()} Products</title>
        <meta name="description" content={`Shop ${total} curated products delivered across Saudi Arabia.`} />
        <meta property="og:title" content="HUSIN Marketplace" />
        <meta property="og:image" content="https://www.husin.org/main%20logo-200h-200h.png" />
      </Head>

      <Navigation />

      <main className="mp-page">

        {/* Hero */}
        <div className="mp-hero">
          <div className="mp-hero-in">
            <img src="/main%20logo-200h-200h.png" alt="HUSIN" className="mp-logo"
              onError={e => { e.target.style.display='none' }} />
            <h1 className="mp-h1">HUSIN Marketplace</h1>
            <p className="mp-sub">Discover premium products — delivered across Saudi Arabia</p>
            <div className="mp-srch-wrap">
              <span className="mp-srch-ico">🔍</span>
              <input type="text" className="mp-srch" placeholder="Search products..."
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button className="mp-srch-x" onClick={() => setSearch('')}>✕</button>}
            </div>
            <p className="mp-count-hero">{total.toLocaleString('en-SA')} products available</p>
          </div>
        </div>

        {/* ── MOBILE: horizontal pill scroll (replaces sidebar) ── */}
        <div className="mp-pills">
          {CATS.map(c => (
            <button key={c.v} onClick={() => setCat(c.v)}
              className={`mp-pill ${cat === c.v ? 'mp-pill-on' : ''}`}>
              {c.l}
              {counts[c.v] > 0 && <span className="mp-pill-n">{counts[c.v]}</span>}
            </button>
          ))}
        </div>

        <div className="mp-layout">

          {/* ── DESKTOP: left sidebar ── */}
          <aside className="mp-sidebar">
            <p className="mp-sidebar-hd">Categories</p>
            {CATS.map(c => (
              <button key={c.v} onClick={() => setCat(c.v)}
                className={`mp-side-btn ${cat === c.v ? 'mp-side-on' : ''}`}>
                <span>{c.l}</span>
                {counts[c.v] > 0 && <span className="mp-side-n">{counts[c.v]}</span>}
              </button>
            ))}
          </aside>

          {/* ── Product grid ── */}
          <div className="mp-grid-wrap">
            <div className="mp-toolbar">
              <span className="mp-toolbar-count">
                {filtered.length.toLocaleString('en-SA')} products
                {search ? ` · "${search}"` : ''}
              </span>
              <select className="mp-sort" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>

            {!ready ? (
              <div className="mp-grid">
                {Array.from({length:12},(_,i)=><Skeleton key={i}/>)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="mp-empty">
                <p className="mp-empty-icon">🔍</p>
                <h3 className="mp-empty-title">
                  {products.length === 0 ? 'Products Coming Soon' : 'No products found'}
                </h3>
                <p className="mp-empty-sub">
                  {products.length === 0
                    ? 'Our team is curating the best products. Check back soon.'
                    : 'Try a different search or category.'}
                </p>
                {(search || cat !== 'all') && (
                  <button className="mp-reset" onClick={() => { setSearch(''); setCat('all') }}>
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="mp-grid">
                {filtered.map(p => <Card key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* ── Global shimmer keyframe ── */}
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
        .sk-img  { height:190px; }
        .sk-body { padding:14px; display:flex; flex-direction:column; gap:10px; }
        .sk-line { height:11px; border-radius:6px; }
        .sk-foot { display:flex; justify-content:space-between; margin-top:6px; }
        .sk-price { width:80px; height:14px; border-radius:6px; }
        .sk-btn   { width:60px; height:14px; border-radius:6px; }
      `}</style>

      <style jsx>{`
        /* ── Page ── */
        .mp-page { background:var(--color-surface,#050608); min-height:100vh; overflow-x:hidden; }

        /* ── Hero ── */
        .mp-hero { background:linear-gradient(135deg,#0a1628 0%,#0f2744 60%,#0a1628 100%); padding:52px 20px 36px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.07); }
        .mp-hero-in { max-width:640px; margin:0 auto; width:100%; }
        .mp-logo { height:56px; width:auto; object-fit:contain; display:block; margin:0 auto 14px; }
        .mp-h1   { color:#fff; font-size:clamp(1.4rem,4vw,2rem); font-weight:700; margin:0 0 8px; }
        .mp-sub  { color:rgba(255,255,255,0.5); font-size:0.9rem; margin:0 0 22px; line-height:1.6; }
        .mp-srch-wrap { position:relative; display:flex; align-items:center; margin:0 auto 10px; max-width:480px; }
        .mp-srch-ico  { position:absolute; left:14px; font-size:0.9rem; pointer-events:none; }
        .mp-srch { width:100%; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.14); border-radius:10px; padding:12px 40px 12px 40px; color:#fff; font-size:0.9rem; outline:none; box-sizing:border-box; font-family:inherit; }
        .mp-srch::placeholder { color:rgba(255,255,255,0.3); }
        .mp-srch:focus { border-color:#00d9ff; }
        .mp-srch-x { position:absolute; right:12px; background:transparent; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:0.85rem; padding:4px; }
        .mp-count-hero { color:rgba(255,255,255,0.3); font-size:0.75rem; margin:0; }

        /* ── Mobile pill bar (hidden on desktop) ── */
        .mp-pills {
          display: none;
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 10px 16px;
          gap: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.3);
        }
        .mp-pills::-webkit-scrollbar { display:none; }
        .mp-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          color: rgba(255,255,255,0.65);
          padding: 6px 12px;
          font-size: 0.78rem;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .mp-pill:hover { background:rgba(255,255,255,0.09); color:#fff; }
        .mp-pill-on  { background:rgba(0,217,255,0.1) !important; border-color:rgba(0,217,255,0.35) !important; color:#00d9ff !important; }
        .mp-pill-n   { background:rgba(0,217,255,0.15); color:#00d9ff; padding:1px 5px; border-radius:10px; font-size:0.65rem; }

        /* ── Layout ── */
        .mp-layout { display:flex; max-width:1600px; margin:0 auto; padding:28px 28px; gap:24px; box-sizing:border-box; }

        /* ── Desktop sidebar ── */
        .mp-sidebar { width:200px; flex-shrink:0; position:sticky; top:72px; align-self:flex-start; max-height:calc(100vh-90px); overflow-y:auto; scrollbar-width:thin; }
        .mp-sidebar-hd { color:rgba(255,255,255,0.4); font-size:0.65rem; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 12px; font-weight:600; }
        .mp-side-btn { display:flex; align-items:center; justify-content:space-between; width:100%; background:transparent; border:none; color:rgba(255,255,255,0.55); padding:9px 10px; border-radius:7px; cursor:pointer; font-size:0.8rem; text-align:left; font-family:inherit; margin-bottom:2px; transition:all 0.15s; }
        .mp-side-btn:hover { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.85); }
        .mp-side-on  { background:rgba(0,217,255,0.08) !important; color:#00d9ff !important; border-left:2px solid #00d9ff; }
        .mp-side-n   { background:rgba(0,217,255,0.12); color:rgba(0,217,255,0.8); padding:2px 6px; border-radius:10px; font-size:0.65rem; flex-shrink:0; }

        /* ── Grid area ── */
        .mp-grid-wrap { flex:1; min-width:0; }
        .mp-toolbar   { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
        .mp-toolbar-count { color:rgba(255,255,255,0.4); font-size:0.82rem; }
        .mp-sort { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:rgba(255,255,255,0.75); padding:7px 12px; font-size:0.82rem; outline:none; cursor:pointer; font-family:inherit; }
        .mp-sort option { background:#0f1117; }

        /* ── Grid columns: 4 → 3 → 2 ── */
        .mp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }

        /* ── Card ── */
        .mp-card { background:#0f1117; border:1px solid rgba(255,255,255,0.07); border-radius:12px; overflow:hidden; text-decoration:none; display:flex; flex-direction:column; transition:transform 0.2s,border-color 0.2s,box-shadow 0.2s; }
        .mp-card:hover { transform:translateY(-4px); border-color:rgba(0,217,255,0.3); box-shadow:0 12px 32px rgba(0,0,0,0.4); }

        /* ── Image ── */
        .mp-img-wrap { position:relative; height:190px; background:#fff; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .mp-img-ph   { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; transition:opacity 0.3s; }
        .mp-ph-icon  { font-size:32px; opacity:0.5; }
        .mp-ph-txt   { color:rgba(255,255,255,0.2); font-size:0.6rem; letter-spacing:0.2em; font-weight:700; text-transform:uppercase; }
        .mp-img      { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:8px; box-sizing:border-box; transition:opacity 0.4s, transform 0.3s; }
        .mp-card:hover .mp-img { transform:scale(1.04); }
        .mp-badge { position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.6); color:rgba(255,255,255,0.85); padding:3px 7px; border-radius:20px; font-size:0.7rem; backdrop-filter:blur(4px); z-index:2; }
        .mp-new   { position:absolute; top:8px; right:8px; background:#00d9ff; color:#000; padding:2px 7px; border-radius:20px; font-size:0.6rem; font-weight:800; z-index:2; }

        /* ── Card body ── */
        .mp-body { padding:12px; display:flex; flex-direction:column; gap:5px; flex:1; }

        /* Product name — 2 line clamp */
        .mp-name {
          color:#e8eaf0;
          font-size:0.82rem;
          font-weight:500;
          line-height:1.45;
          margin:0;
          min-height:2.4rem;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }
        .mp-spec { color:rgba(255,255,255,0.38); font-size:0.7rem; margin:0; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }

        /* ── PRICE — its own block, never touches CTA ── */
        .mp-price {
          display: block;
          color: #c8a46d;
          font-size: 1rem;
          font-weight: 700;
          margin: 6px 0 0;
          letter-spacing: 0.01em;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        /* ── BUY NOW — its own row below price ── */
        .mp-cta-wrap { margin-top: 6px; }
        .mp-cta {
          display: inline-block;
          color: #00d9ff;
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(0,217,255,0.07);
          border: 1px solid rgba(0,217,255,0.2);
          border-radius: 6px;
          padding: 5px 10px;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .mp-card:hover .mp-cta { background:rgba(0,217,255,0.14); }

        /* ── Empty ── */
        .mp-empty { text-align:center; padding:80px 16px; }
        .mp-empty-icon  { font-size:48px; margin-bottom:14px; }
        .mp-empty-title { color:#fff; font-size:1.2rem; font-weight:600; margin:0 0 8px; }
        .mp-empty-sub   { color:rgba(255,255,255,0.4); font-size:0.875rem; line-height:1.65; max-width:380px; margin:0 auto 20px; }
        .mp-reset { background:rgba(0,217,255,0.1); border:1px solid rgba(0,217,255,0.25); color:#00d9ff; padding:10px 24px; border-radius:8px; cursor:pointer; font-family:inherit; font-size:0.875rem; }

        /* ── BREAKPOINTS ── */

        /* Smaller desktop */
        @media (max-width:1280px) { .mp-grid { grid-template-columns:repeat(3,1fr); } }

        /* Tablet */
        @media (max-width:1024px) {
          .mp-grid    { grid-template-columns:repeat(3,1fr); gap:12px; }
          .mp-layout  { padding:20px; gap:18px; }
          .mp-sidebar { width:170px; }
        }

        /* Mobile — sidebar disappears, pills appear, full width grid */
        @media (max-width:768px) {
          .mp-pills   { display:flex; }    /* show horizontal pills */
          .mp-sidebar { display:none; }    /* hide desktop sidebar */
          .mp-layout  { padding:14px 12px; }
          .mp-grid    { grid-template-columns:repeat(2,1fr); gap:10px; }
          .mp-img-wrap { height:155px; }
          .mp-hero    { padding:36px 16px 28px; }
          .mp-h1      { font-size:1.4rem; }
        }

        @media (max-width:480px) {
          .mp-grid    { grid-template-columns:repeat(2,1fr); gap:8px; }
          .mp-img-wrap { height:135px; }
          .mp-body    { padding:10px; }
          .mp-name    { font-size:0.76rem; min-height:2.2rem; }
          .mp-price   { font-size:0.88rem; }
          .mp-hero    { padding:28px 14px 22px; }
          .mp-h1      { font-size:1.25rem; }
        }

        @media (max-width:320px) {
          .mp-grid { grid-template-columns:1fr; }
        }
      `}</style>
    </>
  )
}
