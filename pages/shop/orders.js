/**
 * HUSIN ESHOP — Owner Orders Page /shop/orders
 * Shows all customer orders with fulfillment status
 * PRIVATE — redirects to /shop if not logged in
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'

const STATUS_COLORS = {
  pending:   { bg: 'rgba(243,156,18,0.12)',  border: '#f39c12', color: '#f39c12',  label: '⏳ Pending'   },
  shipped:   { bg: 'rgba(52,152,219,0.12)',  border: '#3498db', color: '#3498db',  label: '🚚 Shipped'   },
  delivered: { bg: 'rgba(46,204,113,0.12)',  border: '#2ecc71', color: '#2ecc71',  label: '✅ Delivered'  },
  cancelled: { bg: 'rgba(231,76,60,0.12)',   border: '#e74c3c', color: '#e74c3c',  label: '❌ Cancelled'  },
}

export default function ShopOrders() {
  const [authed,   setAuthed]   = useState(false)
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [updating, setUpdating] = useState({})

  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('husin_shop_pwd') : null

  useEffect(() => {
    if (!token) { window.location.href = '/shop'; return }
    setAuthed(true)
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    try {
      const res  = await fetch('/api/shop/orders', {
        headers: { 'x-shop-token': token }
      })
      if (!res.ok) { window.location.href = '/shop'; return }
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function updateFulfillment(orderId, status) {
    setUpdating(prev => ({ ...prev, [orderId]: true }))
    try {
      const res = await fetch('/api/shop/orders', {
        method:  'PATCH',
        headers: { 'Content-Type':'application/json', 'x-shop-token': token },
        body:    JSON.stringify({ orderId, fulfillmentStatus: status }),
      })
      if (res.ok) {
        setOrders(prev => prev.map(o =>
          o.orderId === orderId ? { ...o, fulfillmentStatus: status } : o
        ))
      }
    } catch (e) { console.error(e) }
    setUpdating(prev => ({ ...prev, [orderId]: false }))
  }

  const filtered = orders.filter(o =>
    filter === 'all' || o.fulfillmentStatus === filter
  )

  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + (o.sellingPriceSAR || 0), 0)

  const totalProfit = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + (o.profitSAR || 0), 0)

  if (!authed) return null

  return (
    <div style={s.page}>
      <Head>
        <title>HUSIN Shop — Orders</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <a href="/shop" style={s.backBtn}>← Dashboard</a>
          <span style={s.topTitle}>📦 Orders</span>
        </div>
        <div style={s.topRight}>
          <a href="/shop/inbox"  style={s.topBtn}>📥 Inbox</a>
          <a href="/marketplace" style={s.topBtn} target="_blank" rel="noreferrer">🌐 Store</a>
        </div>
      </div>

      <div style={s.content}>

        {/* Revenue summary */}
        <div style={s.summaryRow}>
          {[
            { icon:'📦', label:'Total Orders',    value: orders.length,                         color:'#3498db' },
            { icon:'⏳', label:'Pending Ship',    value: orders.filter(o=>o.fulfillmentStatus==='pending').length,  color:'#f39c12' },
            { icon:'🚚', label:'Shipped',         value: orders.filter(o=>o.fulfillmentStatus==='shipped').length,  color:'#3498db' },
            { icon:'✅', label:'Delivered',       value: orders.filter(o=>o.fulfillmentStatus==='delivered').length,color:'#2ecc71' },
            { icon:'💰', label:'Revenue (SAR)',   value: totalRevenue.toLocaleString(),          color:'#c8a46d' },
            { icon:'💵', label:'Profit (SAR)',    value: totalProfit.toFixed(0),                 color:'#2ecc71' },
          ].map((st, i) => (
            <div key={i} style={s.statCard}>
              <span style={s.statIcon}>{st.icon}</span>
              <span style={{ ...s.statNum, color: st.color }}>{st.value}</span>
              <span style={s.statLabel}>{st.label}</span>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={s.tabs}>
          {['all','pending','shipped','delivered','cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }}
            >
              {f === 'all' ? `All (${orders.length})` : `${STATUS_COLORS[f]?.label} (${orders.filter(o=>o.fulfillmentStatus===f).length})`}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {loading ? (
          <div style={s.loadingWrap}>
            <div style={s.loadingBar} />
            <p style={s.loadingText}>Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.emptyWrap}>
            <span style={s.emptyIcon}>📦</span>
            <p style={s.emptyText}>
              {orders.length === 0
                ? 'No orders yet. Share your marketplace link to start getting sales!'
                : 'No orders match this filter.'}
            </p>
            {orders.length === 0 && (
              <a href="/marketplace" target="_blank" rel="noreferrer" style={s.storeLink}>
                View Your Store →
              </a>
            )}
          </div>
        ) : (
          <div style={s.ordersList}>
            {filtered.map(order => {
              const st = STATUS_COLORS[order.fulfillmentStatus] || STATUS_COLORS.pending
              return (
                <div key={order.orderId} style={s.orderCard}>

                  {/* Order header */}
                  <div style={s.orderHeader}>
                    <div style={s.orderLeft}>
                      <span style={s.orderId}>#{order.orderId.slice(-8).toUpperCase()}</span>
                      <span style={s.orderDate}>
                        {order.paidAt
                          ? new Date(order.paidAt).toLocaleDateString('en-SA', { timeZone:'Asia/Riyadh', dateStyle:'medium' })
                          : 'Unknown date'}
                      </span>
                    </div>
                    <span style={{ ...s.statusBadge, background: st.bg, borderColor: st.border, color: st.color }}>
                      {st.label}
                    </span>
                  </div>

                  {/* Product info */}
                  <div style={s.orderBody}>
                    <div style={s.orderInfo}>
                      <p style={s.productName}>{order.productName}</p>
                      <div style={s.priceRow}>
                        <span style={s.priceLabel}>Customer paid:</span>
                        <span style={s.priceValue}>{order.sellingPriceSAR?.toLocaleString()} SAR</span>
                      </div>
                      {order.profitSAR && (
                        <div style={s.priceRow}>
                          <span style={s.priceLabel}>Your profit:</span>
                          <span style={{ ...s.priceValue, color:'#2ecc71' }}>{order.profitSAR} SAR</span>
                        </div>
                      )}
                    </div>

                    {/* Customer info */}
                    <div style={s.customerInfo}>
                      {order.customerName && (
                        <p style={s.customerLine}>👤 {order.customerName}</p>
                      )}
                      {order.customerEmail && (
                        <p style={s.customerLine}>📧 {order.customerEmail}</p>
                      )}
                      {order.shippingAddress && (
                        <p style={s.customerLine}>📍 {order.shippingAddress}</p>
                      )}
                    </div>
                  </div>

                  {/* Source link — only visible to owner */}
                  {order.sourceLink && (
                    <a
                      href={order.sourceLink}
                      target="_blank"
                      rel="noreferrer"
                      style={s.sourceBtn}
                    >
                      🔗 Buy from Source & Ship to Customer →
                    </a>
                  )}

                  {/* Fulfillment actions */}
                  <div style={s.actionRow}>
                    <span style={s.actionLabel}>Update status:</span>
                    <div style={s.actionBtns}>
                      {['pending','shipped','delivered','cancelled'].map(status => (
                        <button
                          key={status}
                          onClick={() => updateFulfillment(order.orderId, status)}
                          disabled={order.fulfillmentStatus === status || updating[order.orderId]}
                          style={{
                            ...s.actionBtn,
                            opacity:     order.fulfillmentStatus === status ? 0.4 : 1,
                            borderColor: STATUS_COLORS[status]?.border || '#666',
                            color:       STATUS_COLORS[status]?.color  || '#fff',
                          }}
                        >
                          {STATUS_COLORS[status]?.label || status}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ordersLoad {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

const s = {
  page:        { minHeight:'100vh', background:'#050608', color:'#f4f5f7', fontFamily:'Roboto,system-ui,sans-serif' },
  topBar:      { background:'rgba(5,6,8,0.97)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(16px)' },
  topLeft:     { display:'flex', alignItems:'center', gap:16 },
  backBtn:     { color:'rgba(255,255,255,0.5)', textDecoration:'none', fontSize:'0.85rem', padding:'6px 12px', borderRadius:6, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' },
  topTitle:    { color:'#fff', fontWeight:700, fontSize:'1rem' },
  topRight:    { display:'flex', alignItems:'center', gap:8 },
  topBtn:      { color:'rgba(255,255,255,0.6)', textDecoration:'none', padding:'7px 14px', borderRadius:6, background:'rgba(255,255,255,0.04)', fontSize:'0.83rem', border:'1px solid rgba(255,255,255,0.07)' },
  content:     { padding:'24px 32px', maxWidth:1200, margin:'0 auto' },
  summaryRow:  { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:24 },
  statCard:    { background:'#0f1117', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'16px 12px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' },
  statIcon:    { fontSize:20 },
  statNum:     { fontSize:'1.4rem', fontWeight:700, lineHeight:1 },
  statLabel:   { color:'rgba(255,255,255,0.4)', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.05em' },
  tabs:        { display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' },
  tab:         { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.55)', padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:'0.8rem', fontFamily:'inherit' },
  tabActive:   { background:'rgba(0,217,255,0.1)', borderColor:'rgba(0,217,255,0.3)', color:'#00d9ff' },
  loadingWrap: { padding:'60px 20px', textAlign:'center' },
  loadingBar:  { height:3, background:'linear-gradient(90deg,#00d9ff,#c8a46d,#00d9ff)', backgroundSize:'200%', borderRadius:2, marginBottom:16, animation:'ordersLoad 1.5s linear infinite' },
  loadingText: { color:'rgba(255,255,255,0.4)', fontSize:'0.875rem' },
  emptyWrap:   { padding:'80px 20px', textAlign:'center' },
  emptyIcon:   { fontSize:56, display:'block', marginBottom:16 },
  emptyText:   { color:'rgba(255,255,255,0.4)', fontSize:'1rem', marginBottom:20 },
  storeLink:   { display:'inline-block', padding:'10px 20px', background:'rgba(0,217,255,0.1)', border:'1px solid rgba(0,217,255,0.3)', color:'#00d9ff', borderRadius:8, textDecoration:'none', fontSize:'0.875rem' },
  ordersList:  { display:'flex', flexDirection:'column', gap:16 },
  orderCard:   { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:24, display:'flex', flexDirection:'column', gap:16 },
  orderHeader: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  orderLeft:   { display:'flex', alignItems:'center', gap:12 },
  orderId:     { color:'#fff', fontWeight:700, fontSize:'0.95rem', fontFamily:'monospace' },
  orderDate:   { color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' },
  statusBadge: { border:'1px solid', borderRadius:20, padding:'4px 12px', fontSize:'0.78rem', fontWeight:600 },
  orderBody:   { display:'flex', gap:24, flexWrap:'wrap' },
  orderInfo:   { flex:1, minWidth:200 },
  productName: { color:'#fff', fontSize:'0.9rem', fontWeight:500, margin:'0 0 10px', lineHeight:1.4 },
  priceRow:    { display:'flex', gap:8, alignItems:'center', marginBottom:4 },
  priceLabel:  { color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' },
  priceValue:  { color:'#fff', fontSize:'0.875rem', fontWeight:600 },
  customerInfo:{ flex:1, minWidth:200 },
  customerLine:{ color:'rgba(255,255,255,0.6)', fontSize:'0.82rem', margin:'0 0 6px' },
  sourceBtn:   { display:'block', background:'rgba(200,164,109,0.1)', border:'1px solid rgba(200,164,109,0.3)', color:'#c8a46d', padding:'12px 16px', borderRadius:8, textDecoration:'none', fontSize:'0.875rem', fontWeight:600, textAlign:'center' },
  actionRow:   { display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.06)' },
  actionLabel: { color:'rgba(255,255,255,0.4)', fontSize:'0.78rem' },
  actionBtns:  { display:'flex', gap:8, flexWrap:'wrap' },
  actionBtn:   { background:'transparent', border:'1px solid', borderRadius:6, padding:'6px 12px', fontSize:'0.75rem', cursor:'pointer', fontFamily:'inherit', transition:'opacity 0.2s' },
}
