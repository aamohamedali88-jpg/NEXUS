/**
 * HUSIN ESHOP — /marketplace/[id]
 * Full product page:
 * ✅ Image gallery with thumbnails
 * ✅ All product specs (color, size, brand, storage, etc)
 * ✅ PayPal payment (accepts Visa, Mastercard, Mada via PayPal)
 * ✅ Payment goes directly to owner PayPal account
 * ✅ Source never revealed to customer
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

// Server: get base product from Firestore
export async function getServerSideProps({ params }) {
  try {
    const snap = await db
      .collection('shop_approved_products')
      .doc(params.id)
      .get()

    if (!snap.exists) return { notFound: true }

    const d = snap.data()
    if (d.status !== 'live') return { notFound: true }

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
          views:                 d.views                 || 0,
          sales:                 d.sales                 || 0,
          // Source fields NEVER sent to client
        }
      }
    }
  } catch (e) {
    console.error('[ProductPage]', e.message)
    return { notFound: true }
  }
}

export default function ProductPage({ product }) {
  const [enriched,      setEnriched]      = useState(null)
  const [loadingExtra,  setLoadingExtra]  = useState(true)
  const [activeImage,   setActiveImage]   = useState(product.image)
  const [allImages,     setAllImages]     = useState(product.image ? [product.image] : [])
  const [buying,        setBuying]        = useState(false)
  const [quantity,      setQuantity]      = useState(1)

  // Fetch enriched eBay data client-side
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

  const displayProduct = enriched || product
  const price          = displayProduct.sellingPriceSAR
  const priceFormatted = formatSAR(price)
  const totalPrice     = price ? formatSAR(price * quantity) : null

  // Group aspects by category
  const aspects        = enriched?.aspects || []
  const colorAspects   = aspects.filter(a => a.name.toLowerCase().includes('color') || a.name.toLowerCase().includes('colour'))
  const sizeAspects    = aspects.filter(a => a.name.toLowerCase().includes('size'))
  const otherAspects   = aspects.filter(a =>
    !a.name.toLowerCase().includes('color') &&
    !a.name.toLowerCase().includes('colour') &&
    !a.name.toLowerCase().includes('size')
  )

  function handleBuy() {
    setBuying(true)
    // Redirect to PayPal checkout — quantity passed as param
    window.location.href = `/api/shop/checkout?productId=${product.id}&quantity=${quantity}`
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type':    'Product',
    name:       product.name,
    image:      product.image,
    description:product.specifications || product.name,
    offers: {
      '@type':        'Offer',
      price:          product.sellingPriceSAR,
      priceCurrency:  'SAR',
      availability:   'https://schema.org/InStock',
      seller:         { '@type': 'Organization', name: 'HUSIN Nexus' },
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
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </Head>

      <Navigation />

      <div className="pp-page">

        {/* Breadcrumb */}
        <div className="pp-breadcrumb">
          <a href="/"            className="pp-bc-link">Home</a>
          <span className="pp-bc-sep">›</span>
          <a href="/marketplace" className="pp-bc-link">Marketplace</a>
          <span className="pp-bc-sep">›</span>
          <span className="pp-bc-cur">{product.name.substring(0, 45)}{product.name.length > 45 ? '...' : ''}</span>
        </div>

        <div className="pp-body">

          {/* ── LEFT: Image Gallery ── */}
          <div className="pp-gallery">

            {/* Main image */}
            <div className="pp-main-img-wrap">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="pp-main-img"
                  onError={e => {
                    e.target.src = ''
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="pp-img-ph">
                  <span>📦</span>
                  <span>No image available</span>
                </div>
              )}

              {/* Condition badge */}
              {displayProduct.condition && (
                <span className="pp-condition-badge">{displayProduct.condition}</span>
              )}
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="pp-thumbnails">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    className={`pp-thumb ${activeImage === img ? 'pp-thumb-active' : ''}`}
                    onClick={() => setActiveImage(img)}
                  >
                    <img src={img} alt={`View ${i + 1}`}
                      onError={e => { e.target.parentElement.style.display = 'none' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Loading indicator for extra images */}
            {loadingExtra && allImages.length <= 1 && (
              <div className="pp-img-loading">
                <div className="pp-img-loading-bar shimmer" />
                <span>Loading additional images...</span>
              </div>
            )}
          </div>

          {/* ── RIGHT: Product Details ── */}
          <div className="pp-details">

            {/* Brand + Category */}
            <div className="pp-meta-row">
              {enriched?.brand && (
                <span className="pp-brand">{enriched.brand}</span>
              )}
              <span className="pp-cat-tag">{product.category?.replace('_', ' ')}</span>
            </div>

            {/* Product name */}
            <h1 className="pp-title">{product.name}</h1>

            {/* Stats row */}
            <div className="pp-stats">
              <span>👁️ {displayProduct.views || 0} views</span>
              <span>📦 {displayProduct.sales || 0} sold</span>
              <span className="pp-instock">✅ In Stock</span>
            </div>

            {/* Price */}
            <div className="pp-price-box">
              <span className="pp-price-label">Price</span>
              <span className="pp-price">{priceFormatted}</span>
              {price && price > 1000 && (
                <span className="pp-price-vat">
                  ≈ ${(price / 3.75).toFixed(0)} USD · VAT may apply
                </span>
              )}
            </div>

            {/* Color options */}
            {colorAspects.length > 0 && (
              <div className="pp-option-group">
                <span className="pp-option-label">🎨 Color</span>
                <div className="pp-option-values">
                  {colorAspects.map((a, i) => (
                    <span key={i} className="pp-option-chip pp-option-chip-selected">{a.value}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Size options */}
            {sizeAspects.length > 0 && (
              <div className="pp-option-group">
                <span className="pp-option-label">📐 Size</span>
                <div className="pp-option-values">
                  {sizeAspects.map((a, i) => (
                    <span key={i} className="pp-option-chip">{a.value}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity selector */}
            <div className="pp-quantity">
              <span className="pp-option-label">🔢 Quantity</span>
              <div className="pp-qty-wrap">
                <button className="pp-qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                <span className="pp-qty-val">{quantity}</span>
                <button className="pp-qty-btn" onClick={() => setQuantity(q => Math.min(10, q + 1))}>+</button>
                {quantity > 1 && totalPrice && (
                  <span className="pp-qty-total">Total: {totalPrice}</span>
                )}
              </div>
            </div>

            {/* Payment methods */}
            <div className="pp-payment-methods">
              <span className="pp-payment-label">Accepted Payments</span>
              <div className="pp-payment-badges">
                <span className="pp-pay-badge pp-pay-paypal"  title="PayPal">PayPal</span>
                <span className="pp-pay-badge pp-pay-visa"    title="Visa">VISA</span>
                <span className="pp-pay-badge pp-pay-mc"      title="Mastercard">MC</span>
                <span className="pp-pay-badge pp-pay-mada"    title="Mada">mada</span>
                <span className="pp-pay-badge pp-pay-apple"   title="Apple Pay"> Pay</span>
                <span className="pp-pay-badge pp-pay-amex"    title="Amex">Amex</span>
              </div>
              <p className="pp-payment-note">
                All payments processed securely via PayPal. You can pay with any card, Apple Pay, or bank account — you do not need a PayPal account.
              </p>
            </div>

            {/* Buy button */}
            <button
              className={`pp-buy-btn ${buying ? 'pp-buy-loading' : ''}`}
              onClick={handleBuy}
              disabled={buying}
            >
              {buying ? (
                <><span className="pp-buy-spinner" /> Redirecting to payment...</>
              ) : (
                <>🛒 Buy Now — {totalPrice || priceFormatted}</>
              )}
            </button>

            {/* Trust badges */}
            <div className="pp-trust">
              {[
                { icon:'🔒', text:'Secure SSL checkout' },
                { icon:'↩️', text:'14-day returns'      },
                { icon:'🚚', text:'KSA delivery'        },
                { icon:'💬', text:'24/7 support'        },
              ].map((t, i) => (
                <div key={i} className="pp-trust-item">
                  <span>{t.icon}</span>
                  <span>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SPECS TABLE ── */}
        {(otherAspects.length > 0 || product.specifications) && (
          <div className="pp-specs-section">
            <div className="pp-specs-inner">
              <h2 className="pp-specs-title">Product Specifications</h2>
              <div className="pp-specs-grid">
                {/* Condition row */}
                {displayProduct.condition && (
                  <div className="pp-spec-row">
                    <span className="pp-spec-key">Condition</span>
                    <span className="pp-spec-val">{displayProduct.condition}</span>
                  </div>
                )}
                {/* Category row */}
                <div className="pp-spec-row">
                  <span className="pp-spec-key">Category</span>
                  <span className="pp-spec-val" style={{textTransform:'capitalize'}}>
                    {product.category?.replace(/_/g, ' ')}
                  </span>
                </div>
                {/* All eBay aspects */}
                {otherAspects.map((a, i) => (
                  <div key={i} className="pp-spec-row">
                    <span className="pp-spec-key">{a.name}</span>
                    <span className="pp-spec-val">{a.value}</span>
                  </div>
                ))}
                {/* Color aspects in table too */}
                {colorAspects.map((a, i) => (
                  <div key={`c${i}`} className="pp-spec-row">
                    <span className="pp-spec-key">{a.name}</span>
                    <span className="pp-spec-val">{a.value}</span>
                  </div>
                ))}
                {/* Size aspects in table too */}
                {sizeAspects.map((a, i) => (
                  <div key={`s${i}`} className="pp-spec-row">
                    <span className="pp-spec-key">{a.name}</span>
                    <span className="pp-spec-val">{a.value}</span>
                  </div>
                ))}
                {/* Fallback if no eBay data */}
                {aspects.length === 0 && product.specifications && (
                  <div className="pp-spec-row">
                    <span className="pp-spec-key">Details</span>
                    <span className="pp-spec-val">{product.specifications}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DESCRIPTION ── */}
        {enriched?.description && (
          <div className="pp-desc-section">
            <div className="pp-desc-inner">
              <h2 className="pp-desc-title">Product Description</h2>
              <div
                className="pp-desc-body"
                dangerouslySetInnerHTML={{ __html: enriched.description }}
              />
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="pp-back-wrap">
          <a href="/marketplace" className="pp-back-btn">← Back to Marketplace</a>
        </div>

      </div>

      <Footer />

      <style>{`
        @keyframes shimmer {
          0%   { background-position:-800px 0; }
          100% { background-position:800px 0; }
        }
        @keyframes ppSpin {
          to { transform:rotate(360deg); }
        }
        .shimmer {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 0%,
            rgba(255,255,255,0.10) 40%,
            rgba(255,255,255,0.04) 80%
          );
          background-size:800px 100%;
          animation:shimmer 1.6s ease-in-out infinite;
        }

        /* ── PAGE ── */
        .pp-page { background:#050608; min-height:100vh; padding-bottom:60px; color:#f4f5f7; font-family:Roboto,system-ui,sans-serif; }

        /* ── BREADCRUMB ── */
        .pp-breadcrumb { max-width:1200px; margin:0 auto; padding:20px 24px 0; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .pp-bc-link { color:rgba(255,255,255,0.4); font-size:0.78rem; text-decoration:none; transition:color 0.2s; }
        .pp-bc-link:hover { color:#00d9ff; }
        .pp-bc-sep  { color:rgba(255,255,255,0.2); font-size:0.78rem; }
        .pp-bc-cur  { color:rgba(255,255,255,0.65); font-size:0.78rem; }

        /* ── BODY LAYOUT ── */
        .pp-body { max-width:1200px; margin:0 auto; padding:28px 24px; display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:start; }

        /* ── GALLERY ── */
        .pp-gallery { display:flex; flex-direction:column; gap:12px; position:sticky; top:80px; }
        .pp-main-img-wrap {
          position: relative;
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .pp-main-img { width:100%; height:100%; object-fit:contain; padding:16px; box-sizing:border-box; }
        .pp-img-ph   { display:flex; flex-direction:column; align-items:center; gap:12px; color:rgba(0,0,0,0.2); font-size:0.85rem; }
        .pp-img-ph span:first-child { font-size:64px; }
        .pp-condition-badge { position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.6); color:#fff; padding:4px 10px; border-radius:20px; font-size:0.72rem; font-weight:600; backdrop-filter:blur(4px); }

        /* Thumbnails */
        .pp-thumbnails { display:flex; gap:8px; flex-wrap:wrap; }
        .pp-thumb { width:72px; height:72px; border-radius:8px; overflow:hidden; border:2px solid rgba(255,255,255,0.08); background:#fff; cursor:pointer; padding:0; transition:border-color 0.2s; flex-shrink:0; }
        .pp-thumb img { width:100%; height:100%; object-fit:contain; padding:4px; box-sizing:border-box; }
        .pp-thumb-active { border-color:#00d9ff !important; }
        .pp-thumb:hover   { border-color:rgba(0,217,255,0.5); }

        /* Loading */
        .pp-img-loading { display:flex; flex-direction:column; gap:6px; }
        .pp-img-loading-bar { height:3px; border-radius:2px; }
        .pp-img-loading span { color:rgba(255,255,255,0.3); font-size:0.72rem; }

        /* ── DETAILS ── */
        .pp-details { display:flex; flex-direction:column; gap:18px; }
        .pp-meta-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .pp-brand    { color:#c8a46d; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; }
        .pp-cat-tag  { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.55); padding:3px 10px; border-radius:20px; font-size:0.72rem; text-transform:capitalize; }
        .pp-title    { color:#fff; font-size:clamp(1.1rem,2.5vw,1.5rem); font-weight:700; margin:0; line-height:1.4; }
        .pp-stats    { display:flex; gap:16px; flex-wrap:wrap; }
        .pp-stats span { color:rgba(255,255,255,0.4); font-size:0.78rem; }
        .pp-instock  { color:#2ecc71 !important; font-weight:600; }

        /* Price box */
        .pp-price-box  { background:linear-gradient(135deg,rgba(200,164,109,0.07),rgba(0,217,255,0.04)); border:1px solid rgba(200,164,109,0.18); border-radius:12px; padding:18px 20px; }
        .pp-price-label { display:block; color:rgba(255,255,255,0.4); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px; }
        .pp-price      { display:block; color:#c8a46d; font-size:2rem; font-weight:700; line-height:1; margin-bottom:4px; }
        .pp-price-vat  { color:rgba(255,255,255,0.3); font-size:0.72rem; }

        /* Option groups */
        .pp-option-group { display:flex; flex-direction:column; gap:8px; }
        .pp-option-label { color:rgba(255,255,255,0.55); font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; }
        .pp-option-values { display:flex; gap:8px; flex-wrap:wrap; }
        .pp-option-chip {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.7);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pp-option-chip:hover { border-color:rgba(0,217,255,0.3); color:#fff; }
        .pp-option-chip-selected { background:rgba(0,217,255,0.08); border-color:rgba(0,217,255,0.3); color:#00d9ff; }

        /* Quantity */
        .pp-quantity { display:flex; flex-direction:column; gap:8px; }
        .pp-qty-wrap { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .pp-qty-btn  { width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#fff; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
        .pp-qty-btn:hover { background:rgba(255,255,255,0.1); }
        .pp-qty-val  { color:#fff; font-size:1.1rem; font-weight:700; min-width:24px; text-align:center; }
        .pp-qty-total { color:#c8a46d; font-size:0.82rem; font-weight:600; margin-left:4px; }

        /* Payment methods */
        .pp-payment-methods { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px 16px; }
        .pp-payment-label   { display:block; color:rgba(255,255,255,0.35); font-size:0.65rem; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:10px; }
        .pp-payment-badges  { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
        .pp-pay-badge { display:inline-flex; align-items:center; justify-content:center; height:24px; padding:0 10px; border-radius:4px; font-size:0.68rem; font-weight:700; white-space:nowrap; }
        .pp-pay-paypal { background:#003087; color:#fff; }
        .pp-pay-visa   { background:#1A1F71; color:#fff; font-style:italic; }
        .pp-pay-mc     { background:#252525; color:#fff; }
        .pp-pay-mada   { background:#00A651; color:#fff; }
        .pp-pay-apple  { background:#000; color:#fff; border:1px solid rgba(255,255,255,0.2); }
        .pp-pay-amex   { background:#2E77BC; color:#fff; }
        .pp-payment-note { color:rgba(255,255,255,0.35); font-size:0.72rem; line-height:1.6; margin:0; }

        /* Buy button */
        .pp-buy-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          background: linear-gradient(135deg,#00d9ff,#0099bb);
          color: #000;
          border: none;
          border-radius: 12px;
          padding: 18px 24px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s, transform 0.1s;
        }
        .pp-buy-btn:hover { opacity:0.88; transform:translateY(-1px); }
        .pp-buy-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .pp-buy-loading { background:rgba(255,255,255,0.08) !important; color:rgba(255,255,255,0.7) !important; }
        .pp-buy-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:ppSpin 0.7s linear infinite; flex-shrink:0; }

        /* Trust badges */
        .pp-trust { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .pp-trust-item { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:9px 12px; color:rgba(255,255,255,0.55); font-size:0.78rem; }

        /* ── SPECS TABLE ── */
        .pp-specs-section { max-width:1200px; margin:0 auto; padding:0 24px 32px; }
        .pp-specs-inner   { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:24px; }
        .pp-specs-title   { color:#fff; font-size:1rem; font-weight:700; margin:0 0 18px; }
        .pp-specs-grid    { display:grid; grid-template-columns:1fr 1fr; gap:0; }
        .pp-spec-row { display:contents; }
        .pp-spec-row .pp-spec-key,
        .pp-spec-row .pp-spec-val {
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 0.82rem;
        }
        .pp-spec-key { color:rgba(255,255,255,0.45); font-weight:500; background:rgba(255,255,255,0.02); }
        .pp-spec-val { color:rgba(255,255,255,0.8); }

        /* ── DESCRIPTION ── */
        .pp-desc-section { max-width:1200px; margin:0 auto; padding:0 24px 32px; }
        .pp-desc-inner   { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:24px; }
        .pp-desc-title   { color:#fff; font-size:1rem; font-weight:700; margin:0 0 16px; }
        .pp-desc-body    { color:rgba(255,255,255,0.55); font-size:0.85rem; line-height:1.7; max-height:400px; overflow-y:auto; scrollbar-width:thin; }
        .pp-desc-body img { max-width:100%; height:auto; border-radius:8px; }
        .pp-desc-body table { width:100%; border-collapse:collapse; font-size:0.8rem; }
        .pp-desc-body td, .pp-desc-body th { padding:6px 10px; border:1px solid rgba(255,255,255,0.08); }

        /* ── BACK BUTTON ── */
        .pp-back-wrap { max-width:1200px; margin:0 auto; padding:0 24px 40px; }
        .pp-back-btn  { display:inline-block; color:rgba(255,255,255,0.45); text-decoration:none; font-size:0.82rem; padding:9px 16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; transition:all 0.2s; }
        .pp-back-btn:hover { color:#fff; background:rgba(255,255,255,0.08); }

        /* ── RESPONSIVE ── */
        @media (max-width:900px) {
          .pp-body { grid-template-columns:1fr; gap:28px; padding:20px; }
          .pp-gallery { position:static; }
          .pp-specs-grid { grid-template-columns:1fr; }
          .pp-spec-row .pp-spec-key { background:rgba(255,255,255,0.03); }
        }
        @media (max-width:600px) {
          .pp-body { padding:16px; }
          .pp-breadcrumb { padding:14px 16px 0; }
          .pp-price { font-size:1.6rem; }
          .pp-trust { grid-template-columns:1fr; }
          .pp-specs-section,
          .pp-desc-section,
          .pp-back-wrap { padding-left:16px; padding-right:16px; }
          .pp-thumbnails { gap:6px; }
          .pp-thumb { width:56px; height:56px; }
        }
      `}</style>
    </>
  )
}
