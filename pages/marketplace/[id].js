/**
 * HUSIN ESHOP — Individual Product Page /marketplace/[id]
 * UPDATED: Real PayPal Buy Now button connected to checkout API
 * Source NEVER revealed to customers
 */

import Head       from 'next/head'
import { db }     from '../../lib/firebaseAdmin'
import Navigation from '../../components/navigation'
import Footer     from '../../components/footer'

export async function getServerSideProps({ params }) {
  try {
    const snap = await db
      .collection('shop_approved_products')
      .doc(params.id)
      .get()

    if (!snap.exists) return { notFound: true }

    const d = snap.data()

    if (d.status !== 'live') return { notFound: true }

    // Increment views in background
    db.collection('shop_approved_products').doc(params.id)
      .update({ views: (d.views || 0) + 1 }).catch(() => {})

    return {
      props: {
        product: {
          id:                    params.id,
          name:                  d.name                  || 'Product',
          image:                 d.image                 || null,
          sellingPriceSAR:       d.sellingPriceSAR       || null,
          sellingPriceFormatted: d.sellingPriceFormatted || 'Contact for price',
          category:              d.category              || 'general',
          specifications:        d.specifications        || null,
          views:                 d.views                 || 0,
          sales:                 d.sales                 || 0,
          // _sourceLink NEVER sent to client
        }
      }
    }
  } catch (e) {
    console.error('[ProductPage]', e.message)
    return { notFound: true }
  }
}

export default function ProductPage({ product }) {
  const structuredData = {
    '@context':   'https://schema.org',
    '@type':      'Product',
    name:         product.name,
    image:        product.image,
    description:  product.specifications || product.name,
    offers: {
      '@type':        'Offer',
      price:          product.sellingPriceSAR,
      priceCurrency:  'SAR',
      availability:   'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'HUSIN Nexus' },
    },
  }

  return (
    <>
      <Head>
        <title>{product.name} — HUSIN Marketplace</title>
        <meta name="description" content={product.specifications || `Buy ${product.name} on HUSIN Marketplace. Fast delivery to Saudi Arabia.`} />
        <meta property="og:title"       content={`${product.name} — HUSIN Marketplace`} />
        <meta property="og:description" content={product.specifications || product.name} />
        {product.image && <meta property="og:image" content={product.image} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      <Navigation />

      <main className="pp-page">

        {/* Breadcrumb */}
        <div className="pp-breadcrumb">
          <a href="/"            className="pp-bc-link">Home</a>
          <span className="pp-bc-sep">›</span>
          <a href="/marketplace" className="pp-bc-link">Marketplace</a>
          <span className="pp-bc-sep">›</span>
          <span className="pp-bc-current">{product.name.substring(0, 50)}</span>
        </div>

        <div className="pp-body">

          {/* Image */}
          <div className="pp-image-col">
            <div className="pp-img-wrap">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="pp-img"
                  onError={e => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="pp-img-ph">📦</div>
              )}
            </div>
            <div className="pp-img-badges">
              <span className="pp-badge-secure">🔒 Secure Payment</span>
              <span className="pp-badge-delivery">🚚 Saudi Arabia Delivery</span>
              <span className="pp-badge-return">↩️ 14-Day Returns</span>
            </div>
          </div>

          {/* Details */}
          <div className="pp-info-col">

            <h1 className="pp-title">{product.name}</h1>

            {product.specifications && (
              <p className="pp-specs">{product.specifications}</p>
            )}

            <div className="pp-stats">
              <span>👁️ {product.views} views</span>
              <span>📦 {product.sales} sold</span>
              <span style={{ color:'#2ecc71' }}>✅ In Stock</span>
            </div>

            {/* Price box */}
            <div className="pp-price-box">
              <span className="pp-price-label">Price</span>
              <span className="pp-price">{product.sellingPriceFormatted}</span>
              <span className="pp-price-note">
                All fees included · Secure checkout via PayPal
              </span>
            </div>

            {/* Guarantees */}
            <div className="pp-guarantees">
              {[
                { icon:'💳', text:'Pay securely with PayPal' },
                { icon:'↩️', text:'Easy returns within 14 days' },
                { icon:'📦', text:'Delivery across Saudi Arabia' },
                { icon:'💬', text:'24/7 customer support' },
              ].map((g, i) => (
                <div key={i} className="pp-guarantee">
                  <span>{g.icon}</span>
                  <span>{g.text}</span>
                </div>
              ))}
            </div>

            {/* BUY NOW — connects to PayPal checkout */}
            <a
              href={`/api/shop/checkout?productId=${product.id}`}
              className="pp-buy-btn"
            >
              🛒 Buy Now — {product.sellingPriceFormatted}
            </a>

            <p className="pp-buy-note">
              You will be redirected to PayPal to complete your payment securely
            </p>

            {/* Product details table */}
            <div className="pp-details">
              <h3 className="pp-details-title">Product Details</h3>
              <table className="pp-table">
                <tbody>
                  {product.specifications && (
                    <tr>
                      <td className="pp-td-label">Description</td>
                      <td className="pp-td-value">{product.specifications}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="pp-td-label">Category</td>
                    <td className="pp-td-value" style={{ textTransform:'capitalize' }}>{product.category.replace('_',' ')}</td>
                  </tr>
                  <tr>
                    <td className="pp-td-label">Availability</td>
                    <td className="pp-td-value" style={{ color:'#2ecc71' }}>✅ In Stock</td>
                  </tr>
                  <tr>
                    <td className="pp-td-label">Delivery</td>
                    <td className="pp-td-value">Saudi Arabia — All Regions</td>
                  </tr>
                  <tr>
                    <td className="pp-td-label">Payment</td>
                    <td className="pp-td-value">PayPal — Visa / Mastercard / PayPal Balance</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        <div className="pp-back-wrap">
          <a href="/marketplace" className="pp-back-btn">← Back to Marketplace</a>
        </div>

      </main>

      <Footer />

      <style jsx>{`
        .pp-page { background:var(--color-surface); min-height:100vh; padding-bottom:60px; }
        .pp-breadcrumb { max-width:1200px; margin:0 auto; padding:20px 32px 0; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .pp-bc-link { color:rgba(255,255,255,0.45); font-size:0.8rem; text-decoration:none; }
        .pp-bc-link:hover { color:var(--color-accent); }
        .pp-bc-sep { color:rgba(255,255,255,0.2); font-size:0.8rem; }
        .pp-bc-current { color:rgba(255,255,255,0.7); font-size:0.8rem; }
        .pp-body { max-width:1200px; margin:0 auto; padding:32px; display:flex; gap:48px; }
        .pp-image-col { flex:5; display:flex; flex-direction:column; gap:16px; }
        .pp-img-wrap { background:#1a1d26; border-radius:16px; overflow:hidden; aspect-ratio:1; display:flex; align-items:center; justify-content:center; border:1px solid var(--color-border); }
        .pp-img { width:100%; height:100%; object-fit:cover; }
        .pp-img-ph { font-size:80px; color:rgba(255,255,255,0.1); }
        .pp-img-badges { display:flex; flex-direction:column; gap:8px; }
        .pp-badge-secure,.pp-badge-delivery,.pp-badge-return { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px; font-size:0.82rem; }
        .pp-badge-secure { background:rgba(46,204,113,0.08); border:1px solid rgba(46,204,113,0.2); color:#2ecc71; }
        .pp-badge-delivery { background:rgba(52,152,219,0.08); border:1px solid rgba(52,152,219,0.2); color:#3498db; }
        .pp-badge-return { background:rgba(200,164,109,0.08); border:1px solid rgba(200,164,109,0.2); color:#c8a46d; }
        .pp-info-col { flex:6; display:flex; flex-direction:column; gap:20px; }
        .pp-title { color:#fff; font-size:1.5rem; font-weight:700; margin:0; line-height:1.4; font-family:var(--font-family-heading); }
        .pp-specs { color:rgba(255,255,255,0.55); font-size:0.9rem; margin:0; line-height:1.6; }
        .pp-stats { display:flex; gap:16px; color:rgba(255,255,255,0.45); font-size:0.8rem; }
        .pp-price-box { background:linear-gradient(135deg,rgba(200,164,109,0.08),rgba(0,217,255,0.05)); border:1px solid rgba(200,164,109,0.2); border-radius:12px; padding:20px 24px; }
        .pp-price-label { display:block; color:rgba(255,255,255,0.45); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
        .pp-price { display:block; color:var(--color-primary); font-size:2rem; font-weight:700; font-family:var(--font-family-heading); margin-bottom:6px; }
        .pp-price-note { color:rgba(255,255,255,0.35); font-size:0.75rem; }
        .pp-guarantees { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .pp-guarantee { display:flex; align-items:center; gap:8px; color:rgba(255,255,255,0.6); font-size:0.8rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:10px 12px; }
        .pp-buy-btn { display:block; background:var(--color-accent); color:#000; border-radius:12px; padding:18px 32px; font-size:1.1rem; font-weight:700; text-align:center; text-decoration:none; transition:opacity 0.2s,transform 0.1s; }
        .pp-buy-btn:hover { opacity:0.88; transform:translateY(-1px); }
        .pp-buy-note { color:rgba(255,255,255,0.3); font-size:0.75rem; text-align:center; margin:0; }
        .pp-details { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:20px; }
        .pp-details-title { color:rgba(255,255,255,0.7); font-size:0.875rem; font-weight:600; margin:0 0 14px; }
        .pp-table { width:100%; border-collapse:collapse; }
        .pp-td-label { color:rgba(255,255,255,0.4); font-size:0.8rem; padding:8px 0; width:35%; border-bottom:1px solid rgba(255,255,255,0.05); vertical-align:top; }
        .pp-td-value { color:rgba(255,255,255,0.75); font-size:0.8rem; padding:8px 0 8px 16px; border-bottom:1px solid rgba(255,255,255,0.05); line-height:1.5; }
        .pp-back-wrap { max-width:1200px; margin:0 auto; padding:0 32px; }
        .pp-back-btn { display:inline-block; color:rgba(255,255,255,0.5); text-decoration:none; font-size:0.875rem; padding:10px 16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:8px; transition:all 0.2s; }
        .pp-back-btn:hover { color:#fff; background:rgba(255,255,255,0.08); }
        @media (max-width:768px) {
          .pp-body { flex-direction:column; padding:20px; gap:24px; }
          .pp-title { font-size:1.2rem; }
          .pp-price { font-size:1.5rem; }
          .pp-guarantees { grid-template-columns:1fr; }
          .pp-breadcrumb { padding:16px 20px 0; }
          .pp-back-wrap { padding:0 20px; }
          .pp-stats { flex-wrap:wrap; gap:10px; }
        }
      `}</style>
    </>
  )
}
