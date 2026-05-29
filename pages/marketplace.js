/**
 * HUSIN ESHOP — Public Marketplace at /marketplace
 * FIXED: Removed 200 limit cap — shows ALL approved products
 * Sorted newest first in JavaScript (no Firestore index needed)
 */

import { useState } from 'react'
import Head         from 'next/head'
import { db }       from '../lib/firebaseAdmin'
import Navigation   from '../components/navigation'
import Footer       from '../components/footer'

const CATEGORIES = [
  { value: 'all',             label: '🌐 All Products' },
  { value: 'mobiles',         label: '📱 Mobile Phones' },
  { value: 'laptops',         label: '💻 Laptops & Tech' },
  { value: 'electronics',     label: '⚡ Electronics' },
  { value: 'home_appliances', label: '🏠 Home Appliances' },
  { value: 'clothes_men',     label: '👔 Men\'s Fashion' },
  { value: 'clothes_women',   label: '👗 Women\'s Fashion' },
  { value: 'clothes_kids',    label: '👶 Kids & Baby' },
  { value: 'jewelry',         label: '💎 Jewelry & Gold' },
  { value: 'beauty',          label: '💄 Beauty & Care' },
  { value: 'sports',          label: '🏋️ Sports & Fitness' },
  { value: 'toys',            label: '🧸 Toys & Games' },
  { value: 'general',         label: '📦 General' },
]

export async function getServerSideProps() {
  try {
    // FIXED: No limit — fetches ALL live products
    // Using simple query with no orderBy to avoid index requirement
    const snap = await db
      .collection('shop_approved_products')
      .where('status', '==', 'live')
      .get()

    const products = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id:                    d.id                    || doc.id,
        name:                  d.name                  || 'Product',
        image:                 d.image                 || null,
        sellingPriceSAR:       d.sellingPriceSAR       || null,
        sellingPriceFormatted: d.sellingPriceFormatted || 'Contact for price',
        category:              d.category              || 'general',
        specifications:        d.specifications        || null,
        approvedAt:            d.approvedAt            || '',
        views:                 d.views                 || 0,
        sales:                 d.sales                 || 0,
      }
    })

    // Sort newest first in JavaScript — no Firestore index needed
    products.sort((a, b) => (b.approvedAt > a.approvedAt ? 1 : -1))

    return { props: { products, total: products.length } }

  } catch (e) {
    console.error('[Marketplace] Firestore error:', e.message)
    return { props: { products: [], total: 0 } }
  }
}

export default function MarketplacePage({ products, total }) {
  const [cat,    setCat]    = useState('all')
  const [search, setSearch] = useState('')
  const [sort,   setSort]   = useState('newest')

  const filtered = products
    .filter(p => cat === 'all' || p.category === cat)
    .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price_asc')  return (a.sellingPriceSAR || 0) - (b.sellingPriceSAR || 0)
      if (sort === 'price_desc') return (b.sellingPriceSAR || 0) - (a.sellingPriceSAR || 0)
      return b.approvedAt > a.approvedAt ? 1 : -1
    })

  return (
    <>
      <Head>
        <title>HUSIN Marketplace — {total} Products</title>
        <meta name="description" content="Shop the best products — fashion, electronics, jewelry, home appliances and more delivered to Saudi Arabia." />
        <meta property="og:title"       content="HUSIN Marketplace" />
        <meta property="og:description" content="Shop fashion, electronics, jewelry and more." />
        <meta property="og:image"       content="https://www.husin.org/logo_logo-200h-200h.png" />
      </Head>

      <Navigation />

      <main className="mp-page">

        {/* Hero */}
        <div className="mp-hero">
          <div className="mp-hero-inner">
            <h1 className="mp-hero-title">🛒 HUSIN Marketplace</h1>
            <p className="mp-hero-sub">
              Discover the best products from around the world — delivered to Saudi Arabia
            </p>
            <div className="mp-search-wrap">
              <span className="mp-search-icon">🔍</span>
              <input
                type="text"
                className="mp-search"
                placeholder="Search for products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <p className="mp-total-count">{total} products available</p>
          </div>
        </div>

        <div className="mp-body">

          {/* Sidebar */}
          <aside className="mp-sidebar">
            <h3 className="mp-sidebar-title">Categories</h3>
            {CATEGORIES.map(c => {
              const count = c.value === 'all'
                ? products.length
                : products.filter(p => p.category === c.value).length
              return (
                <button
                  key={c.value}
                  onClick={() => setCat(c.value)}
                  className={`mp-cat-btn ${cat === c.value ? 'mp-cat-active' : ''}`}
                >
                  <span>{c.label}</span>
                  {count > 0 && (
                    <span className="mp-cat-count">{count}</span>
                  )}
                </button>
              )
            })}
          </aside>

          {/* Main */}
          <div className="mp-main">

            <div className="mp-toolbar">
              <span className="mp-count">
                {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                {search ? ` for "${search}"` : ''}
                {cat !== 'all' ? ` in ${CATEGORIES.find(c=>c.value===cat)?.label}` : ''}
              </span>
              <select
                className="mp-sort"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="mp-empty">
                <span className="mp-empty-icon">📦</span>
                <h3 className="mp-empty-title">
                  {products.length === 0 ? 'Products Coming Soon' : 'No products found'}
                </h3>
                <p className="mp-empty-sub">
                  {products.length === 0
                    ? 'Our team is curating the best products for you. Check back soon!'
                    : 'Try a different search or category.'}
                </p>
              </div>
            ) : (
              <div className="mp-grid">
                {filtered.map(product => (
                  <a
                    key={product.id}
                    href={`/marketplace/${product.id}`}
                    className="mp-card"
                  >
                    <div className="mp-card-img">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="mp-img"
                          loading="lazy"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="mp-img-ph">📦</div>
                      )}
                      <span className="mp-cat-badge">
                        {CATEGORIES.find(c => c.value === product.category)?.label?.split(' ')[0] || '📦'}
                      </span>
                    </div>
                    <div className="mp-card-body">
                      <p className="mp-card-name">{product.name}</p>
                      {product.specifications && (
                        <p className="mp-card-specs">{product.specifications}</p>
                      )}
                      <div className="mp-card-footer">
                        <span className="mp-price">{product.sellingPriceFormatted}</span>
                        <span className="mp-buy">Buy Now →</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .mp-page { background: var(--color-surface); min-height: 100vh; }
        .mp-hero { background: linear-gradient(135deg,#0a1628,#0f2744,#0a1628); padding: 60px 40px; text-align: center; border-bottom: 1px solid var(--color-border); }
        .mp-hero-inner { max-width: 700px; margin: 0 auto; }
        .mp-hero-title { color: #fff; font-size: 2.2rem; font-family: var(--font-family-heading); font-weight: 700; margin: 0 0 12px; }
        .mp-hero-sub { color: rgba(255,255,255,0.55); font-size: 1rem; margin: 0 0 28px; line-height: 1.6; }
        .mp-search-wrap { position: relative; max-width: 500px; margin: 0 auto 12px; display: flex; align-items: center; }
        .mp-search-icon { position: absolute; left: 16px; font-size: 1.1rem; }
        .mp-search { width: 100%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 14px 20px 14px 44px; color: #fff; font-size: 1rem; outline: none; box-sizing: border-box; font-family: inherit; }
        .mp-search::placeholder { color: rgba(255,255,255,0.35); }
        .mp-search:focus { border-color: var(--color-accent); }
        .mp-total-count { color: rgba(255,255,255,0.35); font-size: 0.8rem; margin: 0; }
        .mp-body { display: flex; max-width: 1400px; margin: 0 auto; padding: 32px; gap: 28px; }
        .mp-sidebar { width: 220px; flex-shrink: 0; }
        .mp-sidebar-title { color: rgba(255,255,255,0.5); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px; }
        .mp-cat-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; background: transparent; border: none; color: rgba(255,255,255,0.6); padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; text-align: left; font-family: inherit; margin-bottom: 2px; transition: all 0.2s; }
        .mp-cat-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
        .mp-cat-active { background: rgba(0,217,255,0.1) !important; color: #00d9ff !important; }
        .mp-cat-count { background: rgba(0,217,255,0.15); color: #00d9ff; padding: 2px 7px; border-radius: 20px; font-size: 0.7rem; flex-shrink: 0; }
        .mp-main { flex: 1; min-width: 0; }
        .mp-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .mp-count { color: rgba(255,255,255,0.45); font-size: 0.85rem; }
        .mp-sort { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; padding: 8px 12px; font-size: 0.85rem; outline: none; cursor: pointer; font-family: inherit; }
        .mp-sort option { background: #0f1117; }
        .mp-empty { text-align: center; padding: 80px 20px; }
        .mp-empty-icon { font-size: 56px; display: block; margin-bottom: 16px; }
        .mp-empty-title { color: #fff; font-size: 1.3rem; font-weight: 600; margin: 0 0 8px; }
        .mp-empty-sub { color: rgba(255,255,255,0.4); font-size: 0.95rem; line-height: 1.6; }
        .mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
        .mp-card { background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
        .mp-card:hover { transform: translateY(-4px); border-color: var(--color-accent); box-shadow: 0 12px 32px rgba(0,217,255,0.1); }
        .mp-card-img { position: relative; height: 190px; background: #1a1d26; overflow: hidden; }
        .mp-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .mp-card:hover .mp-img { transform: scale(1.05); }
        .mp-img-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; color: rgba(255,255,255,0.12); }
        .mp-cat-badge { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.65); color: rgba(255,255,255,0.8); padding: 3px 8px; border-radius: 20px; font-size: 0.75rem; backdrop-filter: blur(4px); }
        .mp-card-body { padding: 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .mp-card-name { color: #fff; font-size: 0.85rem; font-weight: 500; line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mp-card-specs { color: rgba(255,255,255,0.4); font-size: 0.73rem; margin: 0; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .mp-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }
        .mp-price { color: var(--color-primary); font-size: 0.95rem; font-weight: 700; }
        .mp-buy { color: var(--color-accent); font-size: 0.75rem; font-weight: 600; }
        @media (max-width: 768px) {
          .mp-body { flex-direction: column; padding: 16px; }
          .mp-sidebar { width: 100%; display: flex; flex-wrap: wrap; gap: 6px; }
          .mp-cat-btn { width: auto; padding: 6px 10px; font-size: 0.78rem; }
          .mp-hero { padding: 40px 20px; }
          .mp-hero-title { font-size: 1.5rem; }
          .mp-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .mp-card-img { height: 150px; }
        }
      `}</style>
    </>
  )
}
