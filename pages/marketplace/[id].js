/**
 * HUSIN ESHOP — /marketplace/[id]
 * Product detail page — image gallery, specs, sizes, colors
 * Buy Now → /shop/checkout (branded page, not PayPal redirect)
 */

import { useState, useEffect } from 'react'
import Head       from 'next/head'
import { db }     from '../../lib/firebaseAdmin'
import Navigation from '../../components/navigation'
import Footer     from '../../components/footer'

function formatSAR(n) {
  if (!n) return 'Contact for price'
  return parseFloat(n).toLocaleString('en-SA', { maximumFractionDigits: 0 }) + ' SAR'
}

export async function getServerSideProps({ params }) {
  try {
    const snap = await db.collection('shop_approved_products').doc(params.id).get()
    if (!snap.exists) return { notFound: true }
    const d = snap.data()
    if (d.status !== 'live') return { notFound: true }
    db.collection('shop_approved_products').doc(params.id)
      .update({ views: (d.views || 0) + 1 }).catch(() => {})
    return {
      props: {
        product: {
          id:                    d.id                    || params.id,
          name:                  d.name                  || 'Product',
          image:                 d.image                 || null,
          sellingPriceSAR:       d.sellingPriceSAR       || null,
          sellingPriceFormatted: d.sellingPriceFormatted || null,
          category:              d.category              || 'general',
          specifications:        d.specifications        || null,
          approvedAt:            d.approvedAt            || '',
          views:                 (d.views || 0) + 1,
          sales:                 d.sales                 || 0,
        }
      }
    }
  } catch (e) {
    return { notFound: true }
  }
}

export default function ProductPage({ product }) {
  const [enriched,     setEnriched]     = useState(null)
  const [loadingExtra, setLoadingExtra] = useState(true)
  const [activeImage,  setActiveImage]  = useState(product.image)
  const [allImages,    setAllImages]    = useState(product.image ? [product.image] : [])
  const [quantity,     setQuantity]     = useState(1)

  useEffect(() => {
    fetch(`/api/shop/product-details?productId=${product.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.product) {
          setEnriched(data.product)
          const imgs = data.product.additionalImages?.length > 0
            ? data.product.additionalImages
            : [product.image].filter(Boolean)
          setAllImages(imgs)
          setActiveImage(imgs[0] || product.image)
        }
        setLoadingExtra(false)
      })
      .catch(() => setLoadingExtra(false))
  }, [product.id])

  const dp          = enriched || product
  const price       = dp.sellingPriceSAR
  const priceStr    = formatSAR(price)
  const totalStr    = price ? formatSAR(price * quantity) : null
  const aspects     = enriched?.aspects || []
  const colorAsp    = aspects.filter(a => /color|colour/i.test(a.name))
  const sizeAsp     = aspects.filter(a => /size/i.test(a.name))
  const otherAsp    = aspects.filter(a => !/color|colour|size/i.test(a.name))

  function goCheckout() {
    window.location.href = `/shop/checkout?productId=${product.id}&quantity=${quantity}`
  }

  return (
    <>
      <Head>
        <title>{product.name} — HUSIN Marketplace</title>
        <meta name="description" content={product.specifications || `Buy ${product.name} — fast delivery across Saudi Arabia.`} />
        <meta property="og:title" content={`${product.name} — HUSIN Marketplace`} />
        {product.image && <meta property="og:image" content={product.image} />}
      </Head>
      <Navigation />

      <div className="pp-page">

        {/* Breadcrumb */}
        <div className="pp-breadcrumb">
          <a href="/"            className="pp-bc-link">Home</a>
          <span className="pp-bc-sep">›</span>
          <a href="/marketplace" className="pp-bc-link">Marketplace</a>
          <span className="pp-bc-sep">›</span>
          <span className="pp-bc-cur">{product.name.substring(0,45)}{product.name.length>45?'...':''}</span>
        </div>

        <div className="pp-body">

          {/* ── GALLERY ── */}
          <div className="pp-gallery">
            <div className="pp-main-img-wrap">
              {activeImage ? (
                <img src={activeImage} alt={product.name} className="pp-main-img"
                  onError={e=>{e.target.style.display='none'}} />
              ) : (
                <div className="pp-img-ph"><span>📦</span><span>No image</span></div>
              )}
              {dp.condition && <span className="pp-cond-badge">{dp.condition}</span>}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="pp-thumbs">
                {allImages.map((img, i) => (
                  <button key={i}
                    className={`pp-thumb ${activeImage === img ? 'pp-thumb-on' : ''}`}
                    onClick={() => setActiveImage(img)}>
                    <img src={img} alt={`View ${i+1}`}
                      onError={e=>{e.target.parentElement.style.display='none'}} />
                  </button>
                ))}
              </div>
            )}

            {loadingExtra && allImages.length <= 1 && (
              <div className="pp-img-loading">
                <div className="shimmer pp-img-bar" />
                <span>Loading more images...</span>
              </div>
            )}
          </div>

          {/* ── DETAILS ── */}
          <div className="pp-info">

            {/* Brand + Category */}
            <div className="pp-meta">
              {enriched?.brand && <span className="pp-brand">{enriched.brand}</span>}
              <span className="pp-cat">{product.category?.replace(/_/g,' ')}</span>
            </div>

            <h1 className="pp-title">{product.name}</h1>

            <div className="pp-stats">
              <span>👁️ {dp.views||0} views</span>
              <span>📦 {dp.sales||0} sold</span>
              <span className="pp-instock">✅ In Stock</span>
            </div>

            {/* Price */}
            <div className="pp-price-box">
              <span className="pp-price-lbl">Price</span>
              <span className="pp-price">{priceStr}</span>
              {price && price > 500 && (
                {/* USD equivalent intentionally removed — SAR-only customer-facing UI (spec Part 1 & 5) */}
              )}
            </div>

            {/* Colors */}
            {colorAsp.length > 0 && (
              <div className="pp-opt-group">
                <span className="pp-opt-lbl">🎨 Color</span>
                <div className="pp-opt-chips">
                  {colorAsp.map((a,i) => (
                    <span key={i} className="pp-chip pp-chip-sel">{a.value}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizeAsp.length > 0 && (
              <div className="pp-opt-group">
                <span className="pp-opt-lbl">📐 Size</span>
                <div className="pp-opt-chips">
                  {sizeAsp.map((a,i) => (
                    <span key={i} className="pp-chip">{a.value}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="pp-qty-group">
              <span className="pp-opt-lbl">🔢 Quantity</span>
              <div className="pp-qty-row">
                <button className="pp-qty-btn" onClick={()=>setQuantity(q=>Math.max(1,q-1))}>−</button>
                <span className="pp-qty-num">{quantity}</span>
                <button className="pp-qty-btn" onClick={()=>setQuantity(q=>Math.min(10,q+1))}>+</button>
                {quantity > 1 && totalStr && (
                  <span className="pp-qty-total">Total: {totalStr}</span>
                )}
              </div>
            </div>

            {/* Payment options preview */}
            <div className="pp-pay-preview">
              <span className="pp-pay-lbl">Accepted Payments</span>
              <div className="pp-pay-badges">
                <span className="ppb ppb-visa">VISA</span>
                <span className="ppb ppb-mc">MC</span>
                <span className="ppb ppb-mada">mada</span>
                <span className="ppb ppb-apple"> Pay</span>
                <span className="ppb ppb-paypal">PayPal</span>
                <span className="ppb ppb-amex">Amex</span>
              </div>
              <p className="pp-pay-note">
                Pay with any card — Visa, Mastercard, Mada, or Apple Pay. No PayPal account needed.
              </p>
            </div>

            {/* Buy button → branded checkout */}
            <button className="pp-buy-btn" onClick={goCheckout}>
              🛒 Buy Now — {totalStr || priceStr}
            </button>

            {/* Trust row */}
            <div className="pp-trust">
              {[
                {icon:'🔒',text:'SSL Secured'},
                {icon:'↩️',text:'14-Day Returns'},
                {icon:'🚚',text:'KSA Delivery'},
                {icon:'💬',text:'24/7 Support'},
              ].map((t,i)=>(
                <div key={i} className="pp-trust-item">
                  <span>{t.icon}</span><span>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SPECS TABLE ── */}
        {(otherAsp.length > 0 || colorAsp.length > 0 || sizeAsp.length > 0 || product.specifications) && (
          <div className="pp-specs-wrap">
            <div className="pp-specs-inner">
              <h2 className="pp-specs-title">Product Specifications</h2>
              <div className="pp-specs-table">
                {dp.condition && (
                  <><span className="pp-sk">Condition</span><span className="pp-sv">{dp.condition}</span></>
                )}
                <span className="pp-sk">Category</span>
                <span className="pp-sv" style={{textTransform:'capitalize'}}>{product.category?.replace(/_/g,' ')}</span>
                {[...colorAsp,...sizeAsp,...otherAsp].map((a,i)=>(
                  <><span key={`k${i}`} className="pp-sk">{a.name}</span>
                  <span key={`v${i}`} className="pp-sv">{a.value}</span></>
                ))}
                {aspects.length === 0 && product.specifications && (
                  <><span className="pp-sk">Details</span><span className="pp-sv">{product.specifications}</span></>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DESCRIPTION ── */}
        {enriched?.description && (
          <div className="pp-desc-wrap">
            <div className="pp-desc-inner">
              <h2 className="pp-desc-title">Product Description</h2>
              <div className="pp-desc-body"
                dangerouslySetInnerHTML={{__html: enriched.description}} />
            </div>
          </div>
        )}

        <div className="pp-back-wrap">
          <a href="/marketplace" className="pp-back">← Back to Marketplace</a>
        </div>
      </div>

      <Footer />

      <style>{`
        @keyframes shimmer {
          0%   { background-position:-800px 0; }
          100% { background-position:800px 0; }
        }
        .shimmer {
          background:linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.10) 40%,rgba(255,255,255,0.04) 80%);
          background-size:800px 100%;
          animation:shimmer 1.6s ease-in-out infinite;
        }
        .pp-page  { background:#050608; min-height:100vh; padding-bottom:60px; color:#f4f5f7; font-family:Roboto,system-ui,sans-serif; }
        .pp-breadcrumb { max-width:1200px; margin:0 auto; padding:20px 24px 0; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .pp-bc-link { color:rgba(255,255,255,0.4); font-size:0.78rem; text-decoration:none; transition:color 0.2s; }
        .pp-bc-link:hover { color:#00d9ff; }
        .pp-bc-sep  { color:rgba(255,255,255,0.2); font-size:0.78rem; }
        .pp-bc-cur  { color:rgba(255,255,255,0.65); font-size:0.78rem; }

        .pp-body { max-width:1200px; margin:0 auto; padding:28px 24px; display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:start; }

        /* Gallery */
        .pp-gallery { display:flex; flex-direction:column; gap:12px; position:sticky; top:80px; }
        .pp-main-img-wrap { position:relative; background:#fff; border-radius:16px; overflow:hidden; aspect-ratio:1; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.08); }
        .pp-main-img { width:100%; height:100%; object-fit:contain; padding:16px; box-sizing:border-box; }
        .pp-img-ph   { display:flex; flex-direction:column; align-items:center; gap:12px; color:rgba(0,0,0,0.2); font-size:0.85rem; }
        .pp-img-ph span:first-child { font-size:64px; }
        .pp-cond-badge { position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.6); color:#fff; padding:4px 10px; border-radius:20px; font-size:0.72rem; font-weight:600; backdrop-filter:blur(4px); }
        .pp-thumbs { display:flex; gap:8px; flex-wrap:wrap; }
        .pp-thumb { width:72px; height:72px; border-radius:8px; overflow:hidden; border:2px solid rgba(255,255,255,0.08); background:#fff; cursor:pointer; padding:0; transition:border-color 0.2s; flex-shrink:0; }
        .pp-thumb img { width:100%; height:100%; object-fit:contain; padding:4px; box-sizing:border-box; }
        .pp-thumb-on { border-color:#00d9ff !important; }
        .pp-thumb:hover { border-color:rgba(0,217,255,0.5); }
        .pp-img-loading { display:flex; flex-direction:column; gap:6px; }
        .pp-img-bar { height:3px; border-radius:2px; width:100%; }
        .pp-img-loading span { color:rgba(255,255,255,0.3); font-size:0.72rem; }

        /* Info */
        .pp-info { display:flex; flex-direction:column; gap:18px; }
        .pp-meta  { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .pp-brand { color:#c8a46d; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; }
        .pp-cat   { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.55); padding:3px 10px; border-radius:20px; font-size:0.72rem; text-transform:capitalize; }
        .pp-title { color:#fff; font-size:clamp(1.1rem,2.5vw,1.5rem); font-weight:700; margin:0; line-height:1.4; }
        .pp-stats { display:flex; gap:16px; flex-wrap:wrap; }
        .pp-stats span { color:rgba(255,255,255,0.4); font-size:0.78rem; }
        .pp-instock { color:#2ecc71 !important; font-weight:600; }

        /* Price */
        .pp-price-box  { background:linear-gradient(135deg,rgba(200,164,109,0.07),rgba(0,217,255,0.04)); border:1px solid rgba(200,164,109,0.18); border-radius:12px; padding:18px 20px; }
        .pp-price-lbl  { display:block; color:rgba(255,255,255,0.4); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px; }
        .pp-price      { display:block; color:#c8a46d; font-size:2rem; font-weight:700; line-height:1; margin-bottom:4px; }
        .pp-price-usd  { color:rgba(255,255,255,0.3); font-size:0.72rem; }

        /* Options */
        .pp-opt-group { display:flex; flex-direction:column; gap:8px; }
        .pp-opt-lbl   { color:rgba(255,255,255,0.55); font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; }
        .pp-opt-chips { display:flex; gap:8px; flex-wrap:wrap; }
        .pp-chip      { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.7); padding:6px 14px; border-radius:8px; font-size:0.82rem; cursor:default; transition:all 0.15s; }
        .pp-chip-sel  { background:rgba(0,217,255,0.08); border-color:rgba(0,217,255,0.3); color:#00d9ff; }

        /* Quantity */
        .pp-qty-group { display:flex; flex-direction:column; gap:8px; }
        .pp-qty-row   { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .pp-qty-btn   { width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#fff; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
        .pp-qty-btn:hover { background:rgba(255,255,255,0.1); }
        .pp-qty-num   { color:#fff; font-size:1.1rem; font-weight:700; min-width:24px; text-align:center; }
        .pp-qty-total { color:#c8a46d; font-size:0.82rem; font-weight:600; }

        /* Payment preview */
        .pp-pay-preview { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px 16px; }
        .pp-pay-lbl     { display:block; color:rgba(255,255,255,0.35); font-size:0.65rem; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:10px; }
        .pp-pay-badges  { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
        .ppb { display:inline-flex; align-items:center; justify-content:center; height:24px; padding:0 10px; border-radius:4px; font-size:0.68rem; font-weight:700; white-space:nowrap; }
        .ppb-visa   { background:#1A1F71; color:#fff; font-style:italic; }
        .ppb-mc     { background:#252525; color:#fff; }
        .ppb-mada   { background:#00A651; color:#fff; }
        .ppb-apple  { background:#000; color:#fff; border:1px solid rgba(255,255,255,0.2); }
        .ppb-paypal { background:#003087; color:#fff; }
        .ppb-amex   { background:#2E77BC; color:#fff; }
        .pp-pay-note { color:rgba(255,255,255,0.35); font-size:0.72rem; line-height:1.6; margin:0; }

        /* Buy button */
        .pp-buy-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; background:linear-gradient(135deg,#00d9ff,#0099bb); color:#000; border:none; border-radius:12px; padding:18px 24px; font-size:1.05rem; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity 0.2s,transform 0.1s; }
        .pp-buy-btn:hover { opacity:0.88; transform:translateY(-1px); }

        /* Trust */
        .pp-trust      { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .pp-trust-item { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:9px 12px; color:rgba(255,255,255,0.55); font-size:0.78rem; }

        /* Specs */
        .pp-specs-wrap  { max-width:1200px; margin:0 auto; padding:0 24px 32px; }
        .pp-specs-inner { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:24px; }
        .pp-specs-title { color:#fff; font-size:1rem; font-weight:700; margin:0 0 18px; }
        .pp-specs-table { display:grid; grid-template-columns:1fr 1fr; gap:0; }
        .pp-sk { color:rgba(255,255,255,0.45); font-size:0.82rem; font-weight:500; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(255,255,255,0.02); }
        .pp-sv { color:rgba(255,255,255,0.8); font-size:0.82rem; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.05); }

        /* Description */
        .pp-desc-wrap  { max-width:1200px; margin:0 auto; padding:0 24px 32px; }
        .pp-desc-inner { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:24px; }
        .pp-desc-title { color:#fff; font-size:1rem; font-weight:700; margin:0 0 16px; }
        .pp-desc-body  { color:rgba(255,255,255,0.55); font-size:0.85rem; line-height:1.7; max-height:400px; overflow-y:auto; scrollbar-width:thin; }
        .pp-desc-body img { max-width:100%; height:auto; border-radius:8px; }

        /* Back */
        .pp-back-wrap { max-width:1200px; margin:0 auto; padding:0 24px 40px; }
        .pp-back { display:inline-block; color:rgba(255,255,255,0.45); text-decoration:none; font-size:0.82rem; padding:9px 16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; transition:all 0.2s; }
        .pp-back:hover { color:#fff; background:rgba(255,255,255,0.08); }

        /* Responsive */
        @media (max-width:900px) {
          .pp-body { grid-template-columns:1fr; gap:28px; padding:20px; }
          .pp-gallery { position:static; }
          .pp-specs-table { grid-template-columns:1fr; }
        }
        @media (max-width:600px) {
          .pp-body { padding:16px; }
          .pp-breadcrumb { padding:14px 16px 0; }
          .pp-price { font-size:1.6rem; }
          .pp-trust { grid-template-columns:1fr; }
          .pp-specs-wrap,.pp-desc-wrap,.pp-back-wrap { padding-left:16px; padding-right:16px; }
          .pp-thumbs { gap:6px; }
          .pp-thumb  { width:56px; height:56px; }
        }
      `}</style>
    </>
  )
}
