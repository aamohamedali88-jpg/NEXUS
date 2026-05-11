/**
 * HUSIN ESHOP — Public Marketplace at /marketplace
 * Reads ONLY from shop_approved_products collection
 * Shows YOUR selling price — source is NEVER revealed
 * Beautiful product grid for customers
 * REPLACES the existing pages/marketplace.js
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'
import { db } from '../lib/firebaseAdmin'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const CATEGORIES = [
  { value: 'all',            label: '🌐 All Products' },
  { value: 'home_appliances',label: '🏠 Home Appliances' },
  { value: 'clothes_men',    label: '👔 Men\'s Fashion' },
  { value: 'clothes_women',  label: '👗 Women\'s Fashion' },
  { value: 'clothes_kids',   label: '👶 Kids & Baby' },
  { value: 'jewelry',        label: '💎 Jewelry & Gold' },
  { value: 'mobiles',        label: '📱 Mobile Phones' },
  { value: 'laptops',        label: '💻 Laptops & Computers' },
  { value: 'beauty',         label: '💄 Beauty & Skincare' },
  { value: 'electronics',    label: '⚡ Electronics' },
  { value: 'sports',         label: '🏋️ Sports & Fitness' },
  { value: 'toys',           label: '🧸 Toys & Games' },
  { value: 'general',        label: '📦 General' },
]

// Server-side: fetch approved products from Firestore
export async function getServerSideProps() {
  try {
    const snap = await db.collection('shop_approved_products')
      .where('status', '==', 'live')
      .orderBy('approvedAt', 'desc')
      .limit(120)
      .get()

    const products = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id:                    d.id,
        name:                  d.name,
        image:                 d.image || null,
        sellingPriceSAR:       d.sellingPriceSAR || null,
        sellingPriceFormatted: d.sellingPriceFormatted || 'Price on request',
        category:              d.category || 'general',
        specifications:        d.specifications || null,
        approvedAt:            d.approvedAt,
        views:                 d.views || 0,
        sales:                 d.sales || 0,
        // ⚠️ _sourceLink and _sourcePriceSAR are NEVER sent to client
      }
    })

    return { props: { products } }
  } catch (e) {
    console.error('[Marketplace] Firestore error:', e.message)
    return { props: { products: [] } }
  }
}

export default function MarketplacePage({ products }) {
  const [category, setCategory] = useState('all')
  const [search,   setSearch]   = useState('')
  const [sort,     setSort]     = useState('newest') // newest | price_asc | price_desc

  // Filter + sort
  const filtered = products
    .filter(p => category === 'all' || p.category === category)
    .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price_asc')  return (a.sellingPriceSAR || 0) - (b.sellingPriceSAR || 0)
      if (sort === 'price_desc') return (b.sellingPriceSAR || 0) - (a.sellingPriceSAR || 0)
      return new Date(b.approvedAt) - new Date(a.approvedAt) // newest
    })

  return (
    <>
      <Head>
        <title>HUSIN Marketplace — Shop All Products</title>
        <meta name="description" content="Shop the best products from around the world. Fashion, electronics, jewelry, home appliances and more — delivered to Saudi Arabia." />
        <meta property="og:title" content="HUSIN Marketplace" />
        <meta property="og:description" content="Shop fashion, electronics, jewelry and more." />
      </Head>

      <Navigation />

      <main className="mp-page">

        {/* Hero banner */}
        <div className="mp-hero">
          <div className="mp-hero-inner">
            <h1 className="mp-hero-title">🛒 HUSIN Marketplace</h1>
            <p className="mp-hero-sub">
              Discover the best products from around the world — delivered to you in Saudi Arabia
            </p>
            {/* Search bar */}
            <div className="mp-search-wrap">
              <input
                type="text"
                className="mp-search"
                placeholder="Search for products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="mp-search-icon">🔍</span>
            </div>
          </div>
        </div>

        <div className="mp-body">

          {/* Sidebar — categories */}
          <aside className="mp-sidebar">
            <h3 className="mp-sidebar-title">Categories</h3>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`mp-cat-btn ${category === cat.value ? 'mp-cat-active' : ''}`}
              >
                {cat.label}
                {category === cat.value && (
                  <span className="mp-cat-count">
                    {cat.value === 'all'
                      ? products.length
                      : products.filter(p => p.category === cat.value).length}
                  </span>
                )}
              </button>
            ))}
          </aside>

          {/* Main content */}
          <div className="mp-main">

            {/* Toolbar */}
            <div className="mp-toolbar">
              <span className="mp-count">
                {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
              </span>
              <select
                className="mp-sort"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="mp-empty">
                <span className="mp-empty-icon">📦</span>
                <h3 className="mp-empty-title">
                  {products.length === 0
                    ? 'Products Coming Soon'
                    : 'No products found'}
                </h3>
                <p className="mp-empty-sub">
                  {products.length === 0
                    ? 'Our team is curating the best products for you. Check back soon!'
                    : 'Try a different search or category.'}
                </p>
              </div>
            )}

            {/* Products grid */}
            {filtered.length > 0 && (
              <div className="mp-grid">
                {filtered.map(product => (
                  <a
                    key={product.id}
                    href={`/marketplace/${product.id}`}
                    className="mp-card"
                  >
                    {/* Image */}
                    <div className="mp-card-img">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="mp-img"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="mp-img-placeholder">📦</div>
                      )}
                      {/* Category badge */}
                      <span className="mp-cat-badge">
                        {CATEGORIES.find(c => c.value === product.category)?.label?.split(' ')[0] || '📦'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="mp-card-body">
                      <p className="mp-card-name">{product.name}</p>
                      {product.specifications && (
                        <p className="mp-card-specs">{product.specifications}</p>
                      )}
                      <div className="mp-card-footer">
                        <span className="mp-price">
                          {product.sellingPriceFormatted}
                        </span>
                        <span className="mp-buy-btn">Buy Now →</span>
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

        /* Hero */
        .mp-hero { background: linear-gradient(135deg, #0a1628 0%, #0f2744 60%, #0a1628 100%); padding: 60px 40px; text-align: center; border-bottom: 1px solid var(--color-border); }
        .mp-hero-inner { max-width: 700px; margin: 0 auto; }
        .mp-hero-title { color: #fff; font-size: 2.2rem; font-family: var(--font-family-heading); font-weight: 700; margin: 0 0 12px; }
        .mp-hero-sub { color: rgba(255,255,255,0.55); font-size: 1rem; margin: 0 0 28px; line-height: 1.6; }
        .mp-search-wrap { position: relative; max-width: 500px; margin: 0 auto; }
        .mp-search { width: 100%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 14px 48px 14px 20px; color: #fff; font-size: 1rem; outline: none; box-sizing: border-box; font-family: inherit; }
        .mp-search::placeholder { color: rgba(255,255,255,0.35); }
        .mp-search:focus { border-color: var(--color-accent); }
        .mp-search-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 1.1rem; }

        /* Layout */
        .mp-body { display: flex; max-width: 1400px; margin: 0 auto; padding: 32px; gap: 28px; }

        /* Sidebar */
        .mp-sidebar { width: 220px; flex-shrink: 0; }
        .mp-sidebar-title { color: rgba(255,255,255,0.5); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px; }
        .mp-cat-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; background: transparent; border: none; color: rgba(255,255,255,0.6); padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; text-align: left; font-family: inherit; transition: all 0.2s; margin-bottom: 2px; }
        .mp-cat-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
        .mp-cat-active { background: rgba(0,217,255,0.1) !important; color: #00d9ff !important; }
        .mp-cat-count { background: rgba(0,217,255,0.2); color: #00d9ff; padding: 2px 7px; border-radius: 20px; font-size: 0.7rem; }

        /* Main */
        .mp-main { flex: 1; min-width: 0; }
        .mp-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .mp-count { color: rgba(255,255,255,0.45); font-size: 0.85rem; }
        .mp-sort { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; padding: 8px 12px; font-size: 0.85rem; outline: none; cursor: pointer; font-family: inherit; }
        .mp-sort option { background: #0f1117; }

        /* Empty */
        .mp-empty { text-align: center; padding: 80px 20px; }
        .mp-empty-icon { font-size: 56px; display: block; margin-bottom: 16px; }
        .mp-empty-title { color: #fff; font-size: 1.3rem; font-weight: 600; margin: 0 0 8px; }
        .mp-empty-sub { color: rgba(255,255,255,0.4); font-size: 0.95rem; line-height: 1.6; }

        /* Product grid */
        .mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .mp-card { background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; cursor: pointer; }
        .mp-card:hover { transform: translateY(-4px); border-color: var(--color-accent); box-shadow: 0 12px 32px rgba(0,217,255,0.12); }
        .mp-card-img { position: relative; height: 200px; background: #1a1d26; overflow: hidden; }
        .mp-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .mp-card:hover .mp-img { transform: scale(1.05); }
        .mp-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; color: rgba(255,255,255,0.12); }
        .mp-cat-badge { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.65); color: rgba(255,255,255,0.8); padding: 3px 8px; border-radius: 20px; font-size: 0.75rem; backdrop-filter: blur(4px); }
        .mp-card-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .mp-card-name { color: #fff; font-size: 0.875rem; font-weight: 500; line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mp-card-specs { color: rgba(255,255,255,0.45); font-size: 0.75rem; margin: 0; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .mp-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }
        .mp-price { color: var(--color-primary); font-size: 1rem; font-weight: 700; }
        .mp-buy-btn { color: var(--color-accent); font-size: 0.78rem; font-weight: 600; }

        /* Responsive */
        @media (max-width: 768px) {
          .mp-body { flex-direction: column; padding: 16px; }
          .mp-sidebar { width: 100%; display: flex; flex-wrap: wrap; gap: 6px; }
          .mp-cat-btn { width: auto; padding: 6px 12px; font-size: 0.78rem; }
          .mp-hero { padding: 40px 20px; }
          .mp-hero-title { font-size: 1.5rem; }
          .mp-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
          .mp-card-img { height: 150px; }
        }
      `}</style>
    </>
  )
}
