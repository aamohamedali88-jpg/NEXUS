/**
 * HUSIN ESHOP — Owner Product Inbox at /shop/inbox
 * Displays products from latest search session
 * Approve or reject each product — syncs instantly with Telegram
 * PRIVATE — redirects to /shop if not logged in
 */

import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

const SOURCE_COLORS = {
  'Amazon.sa':   '#f39c12',
  'Noon.com':    '#f1c40f',
  'Namshi':      '#e74c3c',
  'AliExpress':  '#e67e22',
  'eBay':        '#3498db',
  'Farfetch':    '#9b59b6',
  'NET-A-PORTER':'#2c3e50',
  'Trendyol':    '#e74c3c',
  'Banggood':    '#27ae60',
  'Ubuy':        '#16a085',
  'Desertcart':  '#d35400',
  'Ounass':      '#8e44ad',
  'YesStyle':    '#e91e8c',
}

export default function ShopInbox() {
  const [authed,    setAuthed]    = useState(false)
  const [sessions,  setSessions]  = useState([])
  const [products,  setProducts]  = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all') // all | pending | approved | rejected
  const [deciding,  setDeciding]  = useState({})    // productId → true/false
  const [search,    setSearch]    = useState('')

  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('husin_shop_token') : null

  useEffect(() => {
    if (!token) { window.location.href = '/shop'; return }
    setAuthed(true)
    loadSessions()
  }, [])

  // Load session list
  async function loadSessions() {
    try {
      const res  = await fetch('/api/shop/sessions', {
        headers: { 'x-shop-token': token }
      })
      if (!res.ok) { window.location.href = '/shop'; return }
      const data = await res.json()
      setSessions(data.sessions || [])
      // Auto-select latest session
      if (data.sessions?.length > 0) {
        const latest = data.sessions[0].sessionId
        setSessionId(latest)
        await loadProducts(latest)
      }
      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }

  // Load products for a session
  async function loadProducts(sid) {
    setLoading(true)
    try {
      const res  = await fetch(`/api/shop/products?sessionId=${sid}`, {
        headers: { 'x-shop-token': token }
      })
      const data = await res.json()
      setProducts(data.products || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  // Approve or reject a product
  async function decide(productId, decision) {
    setDeciding(prev => ({ ...prev, [productId]: true }))
    try {
      const res = await fetch('/api/shop/decide', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-token': token,
        },
        body: JSON.stringify({ productId, sessionId, decision }),
      })
      const data = await res.json()
      if (data.success) {
        // Update local state instantly — no page reload needed
        setProducts(prev => prev.map(p =>
          p.id === productId ? { ...p, decision } : p
        ))
      }
    } catch (e) { console.error(e) }
    setDeciding(prev => ({ ...prev, [productId]: false }))
  }

  // Filtered products
  const filtered = products
    .filter(p => filter === 'all' || p.decision === filter)
    .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    all:      products.length,
    pending:  products.filter(p => p.decision === 'pending').length,
    approved: products.filter(p => p.decision === 'approved').length,
    rejected: products.filter(p => p.decision === 'rejected').length,
  }

  if (!authed) return null

  return (
    <div style={s.page}>
      <Head>
        <title>HUSIN Shop — Product Inbox</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <a href="/shop" style={s.backBtn}>← Dashboard</a>
          <span style={s.topTitle}>📥 Product Inbox</span>
        </div>
        <div style={s.topRight}>
          {/* Session selector */}
          {sessions.length > 0 && (
            <select
              value={sessionId || ''}
              onChange={e => { setSessionId(e.target.value); loadProducts(e.target.value) }}
              style={s.sessionSelect}
            >
              {sessions.map(s2 => (
                <option key={s2.sessionId} value={s2.sessionId}>
                  {new Date(s2.createdAt).toLocaleString('en-SA', { timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short' })}
                  {' — '}{s2.totalFound} products
                </option>
              ))}
            </select>
          )}
          <a href="/marketplace" target="_blank" rel="noreferrer" style={s.storeBtn}>
            🌐 Live Store
          </a>
        </div>
      </div>

      <div style={s.content}>

        {/* Filter tabs + search */}
        <div style={s.toolbar}>
          <div style={s.tabs}>
            {[
              { key: 'all',      label: `All (${counts.all})` },
              { key: 'pending',  label: `⏳ Pending (${counts.pending})` },
              { key: 'approved', label: `✅ Approved (${counts.approved})` },
              { key: 'rejected', label: `❌ Rejected (${counts.rejected})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{ ...s.tab, ...(filter === tab.key ? s.tabActive : {}) }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
          />
        </div>

        {/* Products grid */}
        {loading ? (
          <div style={s.loadingWrap}>
            <div style={s.loadingBar} />
            <p style={s.loadingText}>Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.emptyWrap}>
            <p style={s.emptyText}>
              {products.length === 0
                ? 'No search sessions yet. Go to dashboard and start a search cycle.'
                : 'No products match this filter.'}
            </p>
            {products.length === 0 && (
              <a href="/shop" style={s.goBtn}>← Go to Dashboard</a>
            )}
          </div>
        ) : (
          <div style={s.grid}>
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                deciding={deciding[product.id]}
                onDecide={decide}
                sourceColors={SOURCE_COLORS}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes inboxLoad {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

function ProductCard({ product, deciding, onDecide, sourceColors }) {
  const isPending  = product.decision === 'pending'
  const isApproved = product.decision === 'approved'
  const isRejected = product.decision === 'rejected'
  const srcColor   = sourceColors[product.sourceName] || '#666'
  const pricing    = product.pricing || {}

  return (
    <div style={{
      ...s.card,
      borderColor: isApproved ? '#2ecc71' : isRejected ? '#e74c3c' : 'rgba(255,255,255,0.08)',
      opacity:     isRejected ? 0.6 : 1,
    }}>
      {/* Product image */}
      <div style={s.imgWrap}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            style={s.img}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={s.imgPlaceholder}>📦</div>
        )}
        {/* Source badge */}
        <span style={{ ...s.sourceBadge, background: srcColor }}>
          {product.sourceFlag} {product.sourceName}
        </span>
        {/* Rank */}
        <span style={s.rankBadge}>#{product.rank}</span>
      </div>

      {/* Product info */}
      <div style={s.cardBody}>
        <p style={s.productName}>{product.name}</p>

        {/* Pricing */}
        <div style={s.priceRow}>
          <div style={s.priceBox}>
            <span style={s.priceLabel}>Source Price</span>
            <span style={s.priceSource}>
              {pricing.sourcePriceSAR
                ? `${pricing.sourcePriceSAR.toLocaleString()} SAR`
                : 'N/A'}
            </span>
          </div>
          <div style={s.priceArrow}>→</div>
          <div style={{ ...s.priceBox, background: 'rgba(46,204,113,0.08)', borderColor: 'rgba(46,204,113,0.2)' }}>
            <span style={s.priceLabel}>Your Sell Price</span>
            <span style={{ ...s.priceSell, color: '#2ecc71' }}>
              {pricing.sellingPriceFormatted || 'N/A'}
            </span>
          </div>
          <div style={s.profitBox}>
            <span style={s.profitLabel}>Profit</span>
            <span style={s.profitValue}>
              {pricing.profitFormatted || 'N/A'}
            </span>
            <span style={s.marginValue}>
              {pricing.marginPercent ? `${pricing.marginPercent}%` : ''}
            </span>
          </div>
        </div>

        {/* Source link */}
        <a
          href={product.sourceLink}
          target="_blank"
          rel="noreferrer"
          style={s.sourceLink}
        >
          View on {product.sourceName} →
        </a>

        {/* Decision buttons or status */}
        {isPending ? (
          <div style={s.btnRow}>
            <button
              onClick={() => onDecide(product.id, 'approved')}
              disabled={deciding}
              style={{ ...s.approveBtn, opacity: deciding ? 0.6 : 1 }}
            >
              {deciding ? '...' : '✅ Approve & Publish'}
            </button>
            <button
              onClick={() => onDecide(product.id, 'rejected')}
              disabled={deciding}
              style={{ ...s.rejectBtn, opacity: deciding ? 0.6 : 1 }}
            >
              {deciding ? '...' : '❌ Reject'}
            </button>
          </div>
        ) : (
          <div style={{
            ...s.decisionBadge,
            background:   isApproved ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.12)',
            borderColor:  isApproved ? '#2ecc71' : '#e74c3c',
            color:        isApproved ? '#2ecc71' : '#e74c3c',
          }}>
            {isApproved ? '✅ Approved — Live on Store' : '❌ Rejected'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:         { minHeight:'100vh', background:'#050608', color:'#f4f5f7', fontFamily:'Roboto,system-ui,sans-serif' },
  topBar:       { background:'rgba(5,6,8,0.97)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(16px)' },
  topLeft:      { display:'flex', alignItems:'center', gap:16 },
  backBtn:      { color:'rgba(255,255,255,0.5)', textDecoration:'none', fontSize:'0.85rem', padding:'6px 12px', borderRadius:6, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' },
  topTitle:     { color:'#fff', fontWeight:700, fontSize:'1rem' },
  topRight:     { display:'flex', alignItems:'center', gap:10 },
  sessionSelect:{ background:'#0f1117', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'#fff', padding:'7px 12px', fontSize:'0.8rem', outline:'none' },
  storeBtn:     { color:'#00d9ff', textDecoration:'none', padding:'7px 14px', borderRadius:6, background:'rgba(0,217,255,0.08)', border:'1px solid rgba(0,217,255,0.2)', fontSize:'0.83rem' },
  content:      { padding:'24px 32px', maxWidth:1400, margin:'0 auto' },
  toolbar:      { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:16, flexWrap:'wrap' },
  tabs:         { display:'flex', gap:8 },
  tab:          { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.55)', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:'0.83rem', fontFamily:'inherit' },
  tabActive:    { background:'rgba(0,217,255,0.1)', borderColor:'rgba(0,217,255,0.3)', color:'#00d9ff' },
  searchInput:  { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 16px', color:'#fff', fontSize:'0.875rem', outline:'none', width:220, fontFamily:'inherit' },
  grid:         { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 },
  loadingWrap:  { padding:'60px 20px', textAlign:'center' },
  loadingBar:   { height:3, background:'linear-gradient(90deg,#00d9ff,#c8a46d,#00d9ff)', backgroundSize:'200%', borderRadius:2, marginBottom:16, animation:'inboxLoad 1.5s linear infinite' },
  loadingText:  { color:'rgba(255,255,255,0.4)', fontSize:'0.875rem' },
  emptyWrap:    { padding:'80px 20px', textAlign:'center' },
  emptyText:    { color:'rgba(255,255,255,0.4)', fontSize:'1rem', marginBottom:20 },
  goBtn:        { display:'inline-block', padding:'10px 20px', background:'rgba(0,217,255,0.1)', border:'1px solid rgba(0,217,255,0.3)', color:'#00d9ff', borderRadius:8, textDecoration:'none', fontSize:'0.875rem' },
  // Card
  card:         { background:'#0f1117', border:'1px solid', borderRadius:12, overflow:'hidden', display:'flex', flexDirection:'column', transition:'border-color 0.2s' },
  imgWrap:      { position:'relative', height:180, background:'#1a1d26', overflow:'hidden' },
  img:          { width:'100%', height:'100%', objectFit:'cover' },
  imgPlaceholder:{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, color:'rgba(255,255,255,0.15)' },
  sourceBadge:  { position:'absolute', bottom:8, left:8, padding:'3px 8px', borderRadius:20, fontSize:'0.7rem', fontWeight:600, color:'#fff' },
  rankBadge:    { position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.7)', color:'rgba(255,255,255,0.6)', padding:'2px 8px', borderRadius:20, fontSize:'0.7rem' },
  cardBody:     { padding:16, display:'flex', flexDirection:'column', gap:10, flex:1 },
  productName:  { color:'#fff', fontSize:'0.875rem', fontWeight:500, lineHeight:1.5, margin:0 },
  priceRow:     { display:'flex', alignItems:'center', gap:8 },
  priceBox:     { flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 10px', textAlign:'center' },
  priceLabel:   { display:'block', color:'rgba(255,255,255,0.4)', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 },
  priceSource:  { color:'rgba(255,255,255,0.7)', fontSize:'0.8rem', fontWeight:600 },
  priceSell:    { fontSize:'0.875rem', fontWeight:700 },
  priceArrow:   { color:'rgba(255,255,255,0.3)', fontSize:'1rem' },
  profitBox:    { background:'rgba(200,164,109,0.08)', border:'1px solid rgba(200,164,109,0.2)', borderRadius:8, padding:'8px 10px', textAlign:'center', minWidth:70 },
  profitLabel:  { display:'block', color:'rgba(200,164,109,0.7)', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 },
  profitValue:  { display:'block', color:'#c8a46d', fontSize:'0.75rem', fontWeight:600 },
  marginValue:  { display:'block', color:'rgba(200,164,109,0.6)', fontSize:'0.65rem' },
  sourceLink:   { color:'rgba(0,217,255,0.7)', fontSize:'0.75rem', textDecoration:'none' },
  btnRow:       { display:'flex', gap:8, marginTop:'auto' },
  approveBtn:   { flex:1, background:'rgba(46,204,113,0.12)', border:'1px solid rgba(46,204,113,0.35)', color:'#2ecc71', borderRadius:8, padding:'10px 8px', fontSize:'0.8rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'opacity 0.2s' },
  rejectBtn:    { flex:1, background:'rgba(231,76,60,0.08)', border:'1px solid rgba(231,76,60,0.25)', color:'#e74c3c', borderRadius:8, padding:'10px 8px', fontSize:'0.8rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'opacity 0.2s' },
  decisionBadge:{ border:'1px solid', borderRadius:8, padding:'10px', textAlign:'center', fontSize:'0.8rem', fontWeight:600, marginTop:'auto' },
}
