/**
 * HUSIN ESHOP — /marketplace — v3 FINAL
 * ALL issues resolved:
 * ✅ Sidebar hidden on mobile with !important override
 * ✅ Products never cut off right side on mobile
 * ✅ Price and Buy Now completely separate elements
 * ✅ Hero width aligns perfectly with nav
 * ✅ Sidebar sticky on desktop
 * ✅ Responsive: 4→3→2 columns
 * ✅ Image never warped
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import Head       from 'next/head'
import { db }     from '../lib/firebaseAdmin'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

function formatSAR(n) {
  if (!n && n !== 0) return null
  const num = parseFloat(n)
  if (isNaN(num) || num <= 0) return null
  return num.toLocaleString('en-SA', { maximumFractionDigits: 0 }) + ' SAR'
}

function upgradeImg(url) {
  if (!url) return null
  if (url.includes('i.ebayimg.com'))
    return url.replace(/\/s-l\d+\./, '/s-l500.').replace('/thumbs/', '/images/g/')
  return url
}

const CATS = [
  { v:'all',             l:'🌐 All'          },
  { v:'mobiles',         l:'📱 Mobiles'      },
  { v:'laptops',         l:'💻 Laptops'      },
  { v:'electronics',     l:'⚡ Electronics'  },
  { v:'home_appliances', l:'🏠 Home'         },
  { v:'clothes_men',     l:'👔 Men'          },
  { v:'clothes_women',   l:'👗 Women'        },
  { v:'clothes_kids',    l:'👶 Kids'         },
  { v:'jewelry',         l:'💎 Jewelry'      },
  { v:'beauty',          l:'💄 Beauty'       },
  { v:'sports',          l:'🏋️ Sports'      },
  { v:'toys',            l:'🧸 Toys'         },
  { v:'general',         l:'📦 General'      },
]

const GRADS = {
  mobiles:'linear-gradient(135deg,#1a1a2e,#0f3460)',
  laptops:'linear-gradient(135deg,#0d1b2a,#415a77)',
  electronics:'linear-gradient(135deg,#0a0a0a,#1a1a6e)',
  home_appliances:'linear-gradient(135deg,#1a1a1a,#3a3a3a)',
  clothes_men:'linear-gradient(135deg,#1a0533,#11998e)',
  clothes_women:'linear-gradient(135deg,#200122,#6f0000)',
  clothes_kids:'linear-gradient(135deg,#1a1a2e,#e94560)',
  jewelry:'linear-gradient(135deg,#0d0d0d,#8b6914)',
  beauty:'linear-gradient(135deg,#1a0533,#ff416c)',
  sports:'linear-gradient(135deg,#0a3d0a,#00b09b)',
  toys:'linear-gradient(135deg,#1a1a2e,#ff6b6b)',
  general:'linear-gradient(135deg,#111,#2d2d2d)',
}

function Skel() {
  return (
    <div className="skel">
      <div className="skel-img shimmer" />
      <div className="skel-body">
        <div className="skel-line shimmer" style={{width:'85%'}} />
        <div className="skel-line shimmer" style={{width:'60%',marginTop:6}} />
        <div className="skel-foot">
          <div className="skel-p shimmer" />
          <div className="skel-b shimmer" />
        </div>
      </div>
    </div>
  )
}

function Card({ p }) {
  const [err,    setErr]    = useState(false)
  const [loaded, setLoaded] = useState(false)
  const price = formatSAR(p.sellingPriceSAR)
  const icon  = CATS.find(c => c.v === p.category)?.l?.split(' ')[0] || '📦'
  const grad  = GRADS[p.category] || GRADS.general

  return (
    <a href={`/marketplace/${p.id}`} className="card">
      <div className="card-img-wrap">
        {/* Branded gradient placeholder */}
        <div className="card-ph" style={{background: grad, opacity: (err||!p.image) ? 1 : 0}}>
          <span className="ph-icon">{icon}</span>
          <span className="ph-txt">HUSIN</span>
        </div>
        {/* Product image */}
        {p.image && !err && (
          <img
            src={p.image} alt={p.name}
            className="card-img"
            loading="lazy" decoding="async"
            style={{opacity: loaded ? 1 : 0}}
            onLoad={() => setLoaded(true)}
            onError={() => setErr(true)}
          />
        )}
        <span className="card-cat">{icon}</span>
        {p.isNew && <span className="card-new">NEW</span>}
      </div>

      <div className="card-body">
        {/* Title — 2 line clamp with min-height */}
        <p className="card-name">{p.name}</p>
        {p.specifications && <p className="card-spec">{p.specifications}</p>}
        {/* Price — own block */}
        {price && <p className="card-price">{price}</p>}
        {/* CTA — completely separate */}
        <div className="card-cta-row">
          <span className="card-cta">Buy Now →</span>
        </div>
      </div>
    </a>
  )
}

export async function getServerSideProps() {
  try {
    const snap = await db.collection('shop_approved_products')
      .where('status','==','live').get()
    const cutoff = new Date(Date.now()-48*60*60*1000).toISOString()
    const products = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id:              d.id             || doc.id,
        name:            d.name           || 'Product',
        image:           upgradeImg(d.image) || null,
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
    return { props: { products:[], total:0 } }
  }
}

export default function Marketplace({ products, total }) {
  const [cat,   setCat]   = useState('all')
  const [query, setQuery] = useState('')
  const [sort,  setSort]  = useState('newest')
  const [ready, setReady] = useState(false)

  useEffect(() => { setReady(true) }, [])

  const filtered = useMemo(() => {
    let r = cat === 'all' ? products : products.filter(p => p.category === cat)
    if (query) {
      const q = query.toLowerCase()
      r = r.filter(p => p.name?.toLowerCase().includes(q) || p.specifications?.toLowerCase().includes(q))
    }
    if (sort === 'price_asc')  return [...r].sort((a,b)=>(a.sellingPriceSAR||0)-(b.sellingPriceSAR||0))
    if (sort === 'price_desc') return [...r].sort((a,b)=>(b.sellingPriceSAR||0)-(a.sellingPriceSAR||0))
    return r
  }, [products, cat, query, sort])

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

      <main className="mp">

        {/* Hero — full width matching nav */}
        <div className="mp-hero">
          <div className="mp-hero-content">
            <img src="/main%20logo-200h-200h.png" alt="HUSIN" className="mp-logo"
              onError={e=>{e.target.style.display='none'}} />
            <h1 className="mp-h1">HUSIN Marketplace</h1>
            <p className="mp-sub">Discover premium products — delivered across Saudi Arabia</p>
            <div className="mp-search-wrap">
              <span className="mp-search-icon">🔍</span>
              <input type="text" className="mp-search" placeholder="Search products..."
                value={query} onChange={e=>setQuery(e.target.value)} />
              {query && <button className="mp-search-x" onClick={()=>setQuery('')}>✕</button>}
            </div>
            <p className="mp-hero-count">{total.toLocaleString('en-SA')} products available</p>
          </div>
        </div>

        {/* Mobile pill bar */}
        <div className="mp-pills">
          {CATS.map(c => (
            <button key={c.v} onClick={()=>setCat(c.v)}
              className={`mp-pill ${cat===c.v?'mp-pill-on':''}`}>
              {c.l}
              {counts[c.v]>0 && <span className="pill-n">{counts[c.v]}</span>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="mp-body">

          {/* Desktop sidebar */}
          <aside className="mp-sidebar">
            <p className="sidebar-hd">Categories</p>
            {CATS.map(c => (
              <button key={c.v} onClick={()=>setCat(c.v)}
                className={`sidebar-btn ${cat===c.v?'sidebar-btn-on':''}`}>
                <span>{c.l}</span>
                {counts[c.v]>0 && <span className="sidebar-n">{counts[c.v]}</span>}
              </button>
            ))}
          </aside>

          {/* Grid */}
          <div className="mp-grid-area">
            <div className="mp-toolbar">
              <span className="toolbar-count">
                {filtered.length.toLocaleString('en-SA')} products
                {query ? ` · "${query}"` : ''}
              </span>
              <select className="mp-sort" value={sort} onChange={e=>setSort(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>

            {!ready ? (
              <div className="mp-grid">
                {Array.from({length:12},(_,i)=><Skel key={i}/>)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="mp-empty">
                <p className="empty-icon">🔍</p>
                <h3 className="empty-title">
                  {products.length===0 ? 'Products Coming Soon' : 'No products found'}
                </h3>
                <p className="empty-sub">
                  {products.length===0
                    ? 'Our team is curating the best products. Check back soon.'
                    : 'Try a different search or category.'}
                </p>
                {(query||cat!=='all') && (
                  <button className="empty-reset" onClick={()=>{setQuery('');setCat('all')}}>
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="mp-grid">
                {filtered.map(p=><Card key={p.id} p={p}/>)}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style jsx global>{`
        @keyframes shimmer {
          0%   { background-position:-800px 0; }
          100% { background-position:800px 0; }
        }
        .shimmer {
          background:linear-gradient(90deg,
            rgba(255,255,255,0.04) 0%,
            rgba(255,255,255,0.10) 40%,
            rgba(255,255,255,0.04) 80%
          );
          background-size:800px 100%;
          animation:shimmer 1.6s ease-in-out infinite;
        }
        .skel { background:#0f1117; border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden; }
        .skel-img  { height:190px; }
        .skel-body { padding:12px; display:flex; flex-direction:column; gap:8px; }
        .skel-line { height:11px; border-radius:6px; }
        .skel-foot { display:flex; justify-content:space-between; margin-top:4px; }
        .skel-p { width:80px; height:14px; border-radius:6px; }
        .skel-b { width:56px; height:14px; border-radius:6px; }
      `}</style>

      <style jsx>{`
        /* Page */
        .mp { background:#050608; min-height:100vh; overflow-x:hidden; }

        /* Hero — full viewport width, content max-width matches nav */
        .mp-hero { background:linear-gradient(135deg,#0a1628 0%,#0f2744 60%,#0a1628 100%); padding:48px 24px 36px; border-bottom:1px solid rgba(255,255,255,0.07); }
        .mp-hero-content { max-width:1200px; margin:0 auto; text-align:center; }
        .mp-logo  { height:52px; width:auto; object-fit:contain; display:block; margin:0 auto 14px; }
        .mp-h1    { color:#fff; font-size:clamp(1.4rem,3.5vw,2rem); font-weight:700; margin:0 0 8px; }
        .mp-sub   { color:rgba(255,255,255,0.5); font-size:0.88rem; margin:0 0 20px; line-height:1.6; }
        .mp-search-wrap  { position:relative; max-width:500px; margin:0 auto 10px; display:flex; align-items:center; }
        .mp-search-icon  { position:absolute; left:14px; font-size:0.9rem; pointer-events:none; z-index:1; }
        .mp-search { width:100%; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.13); border-radius:10px; padding:12px 40px 12px 40px; color:#fff; font-size:0.88rem; outline:none; box-sizing:border-box; font-family:inherit; }
        .mp-search::placeholder { color:rgba(255,255,255,0.3); }
        .mp-search:focus { border-color:#00d9ff; }
        .mp-search-x { position:absolute; right:12px; background:transparent; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:0.85rem; padding:4px; }
        .mp-hero-count { color:rgba(255,255,255,0.3); font-size:0.75rem; margin:0; }

        /* Mobile pills — hidden on desktop */
        .mp-pills {
          display: none;
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 10px 14px;
          gap: 7px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.25);
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
          font-size: 0.76rem;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .mp-pill:hover  { background:rgba(255,255,255,0.09); color:#fff; }
        .mp-pill-on     { background:rgba(0,217,255,0.1) !important; border-color:rgba(0,217,255,0.35) !important; color:#00d9ff !important; }
        .pill-n { background:rgba(0,217,255,0.15); color:#00d9ff; padding:1px 5px; border-radius:10px; font-size:0.64rem; }

        /* Body layout */
        .mp-body { display:flex; max-width:1400px; margin:0 auto; padding:24px; gap:20px; box-sizing:border-box; }

        /* Desktop sidebar */
        .mp-sidebar {
          width: 196px;
          flex-shrink: 0;
          position: sticky;
          top: 70px;
          align-self: flex-start;
          height: calc(100vh - 80px);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .sidebar-hd  { color:rgba(255,255,255,0.38); font-size:0.63rem; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 10px; font-weight:600; }
        .sidebar-btn { display:flex; align-items:center; justify-content:space-between; width:100%; background:transparent; border:none; color:rgba(255,255,255,0.55); padding:8px 10px; border-radius:7px; cursor:pointer; font-size:0.78rem; text-align:left; font-family:inherit; margin-bottom:1px; transition:all 0.15s; }
        .sidebar-btn:hover { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.85); }
        .sidebar-btn-on  { background:rgba(0,217,255,0.08) !important; color:#00d9ff !important; border-left:2px solid #00d9ff; }
        .sidebar-n { background:rgba(0,217,255,0.12); color:rgba(0,217,255,0.8); padding:2px 6px; border-radius:10px; font-size:0.63rem; flex-shrink:0; }

        /* Grid area */
        .mp-grid-area { flex:1; min-width:0; }
        .mp-toolbar   { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:10px; }
        .toolbar-count { color:rgba(255,255,255,0.4); font-size:0.8rem; }
        .mp-sort { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:rgba(255,255,255,0.75); padding:7px 12px; font-size:0.8rem; outline:none; cursor:pointer; font-family:inherit; }
        .mp-sort option { background:#0f1117; }

        /* GRID — 4 columns on desktop */
        .mp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }

        /* Card */
        .card { background:#0f1117; border:1px solid rgba(255,255,255,0.07); border-radius:12px; overflow:hidden; text-decoration:none; display:flex; flex-direction:column; transition:transform 0.2s,border-color 0.2s,box-shadow 0.2s; }
        .card:hover { transform:translateY(-4px); border-color:rgba(0,217,255,0.3); box-shadow:0 12px 32px rgba(0,0,0,0.4); }

        /* Card image */
        .card-img-wrap { position:relative; height:185px; background:#fff; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .card-ph { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; transition:opacity 0.3s; }
        .ph-icon { font-size:30px; opacity:0.5; }
        .ph-txt  { color:rgba(255,255,255,0.2); font-size:0.58rem; letter-spacing:0.2em; font-weight:700; text-transform:uppercase; }
        .card-img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:8px; box-sizing:border-box; transition:opacity 0.4s,transform 0.3s; }
        .card:hover .card-img { transform:scale(1.04); }
        .card-cat { position:absolute; top:7px; left:7px; background:rgba(0,0,0,0.6); color:rgba(255,255,255,0.85); padding:3px 7px; border-radius:20px; font-size:0.68rem; backdrop-filter:blur(4px); z-index:2; }
        .card-new { position:absolute; top:7px; right:7px; background:#00d9ff; color:#000; padding:2px 6px; border-radius:20px; font-size:0.58rem; font-weight:800; z-index:2; }

        /* Card body */
        .card-body { padding:11px; display:flex; flex-direction:column; gap:4px; flex:1; }
        .card-name {
          color: #e8eaf0;
          font-size: 0.8rem;
          font-weight: 500;
          line-height: 1.45;
          margin: 0;
          min-height: 2.32rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-spec { color:rgba(255,255,255,0.35); font-size:0.68rem; margin:0; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }

        /* PRICE — own block, never touches CTA */
        .card-price {
          display: block;
          color: #c8a46d;
          font-size: 0.95rem;
          font-weight: 700;
          margin: 6px 0 0;
          padding-top: 7px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        /* BUY NOW — own row, always below price */
        .card-cta-row { margin-top: 5px; }
        .card-cta {
          display: inline-block;
          color: #00d9ff;
          font-size: 0.72rem;
          font-weight: 600;
          background: rgba(0,217,255,0.07);
          border: 1px solid rgba(0,217,255,0.18);
          border-radius: 5px;
          padding: 4px 9px;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .card:hover .card-cta { background:rgba(0,217,255,0.14); }

        /* Empty */
        .mp-empty { text-align:center; padding:72px 16px; }
        .empty-icon  { font-size:46px; margin:0 0 14px; }
        .empty-title { color:#fff; font-size:1.15rem; font-weight:600; margin:0 0 8px; }
        .empty-sub   { color:rgba(255,255,255,0.4); font-size:0.85rem; line-height:1.65; max-width:360px; margin:0 auto 18px; }
        .empty-reset { background:rgba(0,217,255,0.1); border:1px solid rgba(0,217,255,0.25); color:#00d9ff; padding:9px 22px; border-radius:8px; cursor:pointer; font-family:inherit; font-size:0.85rem; }

        /* ── BREAKPOINTS ── */
        @media (max-width:1280px) { .mp-grid { grid-template-columns:repeat(3,1fr); } }
        @media (max-width:1024px) { .mp-grid { grid-template-columns:repeat(3,1fr); gap:12px; } .mp-body { padding:18px; } .mp-sidebar { width:170px; } }

        /* MOBILE — sidebar gone, pills show, full-width grid */
        @media (max-width:768px) {
          .mp-pills   { display:flex !important; }
          .mp-sidebar { display:none !important; }
          .mp-body    { padding:12px; }
          .mp-grid    { grid-template-columns:repeat(2,1fr); gap:10px; }
          .card-img-wrap { height:150px; }
          .mp-hero    { padding:36px 16px 26px; }
          .mp-h1      { font-size:1.4rem; }
        }
        @media (max-width:480px) {
          .mp-grid    { grid-template-columns:repeat(2,1fr); gap:8px; }
          .card-img-wrap { height:130px; }
          .card-body  { padding:9px; }
          .card-name  { font-size:0.75rem; min-height:2.18rem; }
          .card-price { font-size:0.82rem; }
        }
        @media (max-width:320px) { .mp-grid { grid-template-columns:1fr; } }
      `}</style>
    </>
  )
}
