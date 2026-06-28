/**
 * HUSIN ESHOP — Customer Account at /shop/my-account
 * Minimal customer dashboard: order history + wallet balance.
 *
 * NOTE ON AUTH: there is currently no customer login system in this codebase —
 * orders-by-customer.js and wallet-balance.js are both looked up by email alone,
 * with no token required. This page matches that existing (unauthenticated)
 * lookup model rather than inventing a new one. Anyone who knows a customer's
 * email can currently view their order history this way — worth hardening
 * (e.g. requiring email + a recent order ID) before this page gets wide traffic.
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'

const STATUS_COLORS = {
  pending:   { bg: 'rgba(243,156,18,0.12)',  border: '#f39c12', color: '#f39c12',  label: '⏳ Pending'   },
  shipped:   { bg: 'rgba(52,152,219,0.12)',  border: '#3498db', color: '#3498db',  label: '🚚 Shipped'   },
  delivered: { bg: 'rgba(46,204,113,0.12)',  border: '#2ecc71', color: '#2ecc71',  label: '✅ Delivered'  },
  cancelled: { bg: 'rgba(231,76,60,0.12)',   border: '#e74c3c', color: '#e74c3c',  label: '❌ Cancelled'  },
}

export default function MyAccount() {
  const [email,    setEmail]    = useState('')
  const [submitted,setSubmitted]= useState(false)
  const [loading,  setLoading]  = useState(false)
  const [orders,   setOrders]   = useState([])
  const [wallet,   setWallet]   = useState({ balance: 0, history: [] })
  const [error,    setError]    = useState('')

  useEffect(() => {
    const saved = typeof window !== 'undefined'
      ? sessionStorage.getItem('husin_customer_email') : null
    if (saved) {
      setEmail(saved)
      loadAccount(saved)
    }
  }, [])

  async function loadAccount(targetEmail) {
    setLoading(true)
    setError('')
    try {
      const [ordersRes, walletRes] = await Promise.all([
        fetch(`/api/shop/orders-by-customer?email=${encodeURIComponent(targetEmail)}`),
        fetch(`/api/shop/wallet-balance?email=${encodeURIComponent(targetEmail)}`),
      ])

      if (!ordersRes.ok) throw new Error('Could not load orders')
      const ordersData = await ordersRes.json()
      setOrders(ordersData.orders || [])

      if (walletRes.ok) {
        const walletData = await walletRes.json()
        setWallet(walletData)
      }

      sessionStorage.setItem('husin_customer_email', targetEmail)
      setSubmitted(true)
    } catch (e) {
      setError('Something went wrong loading your account. Please check the email and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    loadAccount(email.trim().toLowerCase())
  }

  function handleSwitchAccount() {
    sessionStorage.removeItem('husin_customer_email')
    setSubmitted(false)
    setOrders([])
    setWallet({ balance: 0, history: [] })
    setEmail('')
  }

  return (
    <div style={s.page}>
      <Head>
        <title>My Account — HUSIN</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div style={s.topBar}>
        <div style={s.topLeft}>
          <a href="/marketplace" style={s.backBtn}>← Back to Store</a>
          <span style={s.topTitle}>My Account</span>
        </div>
        {submitted && (
          <div style={s.topRight}>
            <button onClick={handleSwitchAccount} style={s.topBtn}>Switch account</button>
          </div>
        )}
      </div>

      <div style={s.content}>
        {!submitted ? (
          <div style={s.lookupWrap}>
            <h1 style={s.lookupTitle}>View your orders &amp; store credit</h1>
            <p style={s.lookupSub}>Enter the email you used at checkout.</p>
            <form onSubmit={handleSubmit} style={s.lookupForm}>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={s.input}
              />
              <button type="submit" style={s.submitBtn} disabled={loading}>
                {loading ? 'Loading…' : 'View My Account'}
              </button>
            </form>
            {error && <p style={s.errorText}>{error}</p>}
          </div>
        ) : (
          <>
            {/* Wallet widget */}
            <div style={s.walletCard}>
              <div>
                <div style={s.walletLabel}>HUSIN Store Credit</div>
                <div style={s.walletBalance}>{wallet.balance.toFixed(2)} SAR</div>
              </div>
              <div style={s.walletNote}>
                Store credit is applied automatically at checkout. Issued for approved
                refunds and cancellations — no expiry.
              </div>
            </div>

            {/* Orders */}
            <h2 style={s.sectionTitle}>Order History</h2>

            {loading ? (
              <div style={s.loadingWrap}>
                <div style={s.loadingBar} />
                <div style={s.loadingText}>Loading your orders…</div>
              </div>
            ) : orders.length === 0 ? (
              <div style={s.emptyWrap}>
                <span style={s.emptyIcon}>🛒</span>
                <p style={s.emptyText}>No orders found for this email yet.</p>
                <a href="/marketplace" style={s.storeLink}>Browse the store →</a>
              </div>
            ) : (
              <div style={s.ordersList}>
                {orders.map((order) => {
                  const status = STATUS_COLORS[order.fulfillmentStatus] || STATUS_COLORS.pending
                  return (
                    <div key={order.orderId} style={s.orderCard}>
                      <div style={s.orderHeader}>
                        <div style={s.orderLeft}>
                          <span style={s.orderId}>#{order.orderId}</span>
                          <span style={s.orderDate}>
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <span style={{ ...s.statusBadge, background: status.bg, borderColor: status.border, color: status.color }}>
                          {status.label}
                        </span>
                      </div>

                      <div style={s.orderBody}>
                        <div style={s.orderInfo}>
                          <p style={s.productName}>{order.productName}</p>
                          {order.selectedVariant && (
                            <p style={s.variantLine}>Variant: {order.selectedVariant}</p>
                          )}
                          <div style={s.priceRow}>
                            <span style={s.priceLabel}>Total paid</span>
                            <span style={s.priceValue}>{order.totalChargedSAR} SAR</span>
                          </div>
                        </div>

                        {order.trackingNumber && (
                          <div style={s.trackingBox}>
                            <span style={s.priceLabel}>Tracking</span>
                            <span style={s.trackingNum}>{order.trackingNumber}</span>
                            {order.trackingCarrier && (
                              <span style={s.priceLabel}>{order.trackingCarrier}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
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
  topBtn:      { color:'rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', padding:'7px 14px', borderRadius:6, fontSize:'0.83rem', cursor:'pointer', fontFamily:'inherit' },
  content:     { padding:'24px 32px', maxWidth:900, margin:'0 auto' },

  lookupWrap:  { maxWidth:420, margin:'60px auto', textAlign:'center' },
  lookupTitle: { color:'#fff', fontSize:'1.3rem', fontWeight:700, marginBottom:8 },
  lookupSub:   { color:'rgba(255,255,255,0.45)', fontSize:'0.9rem', marginBottom:24 },
  lookupForm:  { display:'flex', flexDirection:'column', gap:12 },
  input:       { background:'#0f1117', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'12px 14px', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit', outline:'none' },
  submitBtn:   { background:'rgba(0,217,255,0.12)', border:'1px solid rgba(0,217,255,0.35)', color:'#00d9ff', borderRadius:8, padding:'12px 14px', fontSize:'0.9rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  errorText:   { color:'#e74c3c', fontSize:'0.82rem', marginTop:12 },

  walletCard:  { background:'linear-gradient(135deg,rgba(200,164,109,0.1),rgba(0,217,255,0.06))', border:'1px solid rgba(200,164,109,0.25)', borderRadius:16, padding:'24px 28px', marginBottom:32, display:'flex', justifyContent:'space-between', alignItems:'center', gap:24, flexWrap:'wrap' },
  walletLabel: { color:'rgba(255,255,255,0.55)', fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 },
  walletBalance:{ color:'#fff', fontSize:'2rem', fontWeight:800, fontFamily:'monospace' },
  walletNote:  { color:'rgba(255,255,255,0.4)', fontSize:'0.78rem', maxWidth:260, lineHeight:1.5 },

  sectionTitle:{ color:'#fff', fontSize:'1rem', fontWeight:700, marginBottom:16 },

  loadingWrap: { padding:'60px 20px', textAlign:'center' },
  loadingBar:  { height:3, background:'linear-gradient(90deg,#00d9ff,#c8a46d,#00d9ff)', backgroundSize:'200%', borderRadius:2, marginBottom:16 },
  loadingText: { color:'rgba(255,255,255,0.4)', fontSize:'0.875rem' },

  emptyWrap:   { padding:'60px 20px', textAlign:'center' },
  emptyIcon:   { fontSize:48, display:'block', marginBottom:16 },
  emptyText:   { color:'rgba(255,255,255,0.4)', fontSize:'0.95rem', marginBottom:20 },
  storeLink:   { display:'inline-block', padding:'10px 20px', background:'rgba(0,217,255,0.1)', border:'1px solid rgba(0,217,255,0.3)', color:'#00d9ff', borderRadius:8, textDecoration:'none', fontSize:'0.875rem' },

  ordersList:  { display:'flex', flexDirection:'column', gap:16, marginBottom:40 },
  orderCard:   { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:24, display:'flex', flexDirection:'column', gap:16 },
  orderHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 },
  orderLeft:   { display:'flex', alignItems:'center', gap:12 },
  orderId:     { color:'#fff', fontWeight:700, fontSize:'0.95rem', fontFamily:'monospace' },
  orderDate:   { color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' },
  statusBadge: { border:'1px solid', borderRadius:20, padding:'4px 12px', fontSize:'0.78rem', fontWeight:600 },
  orderBody:   { display:'flex', gap:24, flexWrap:'wrap' },
  orderInfo:   { flex:1, minWidth:200 },
  productName: { color:'#fff', fontSize:'0.9rem', fontWeight:500, margin:'0 0 10px', lineHeight:1.4 },
  variantLine: { color:'rgba(255,255,255,0.45)', fontSize:'0.78rem', margin:'0 0 8px' },
  priceRow:    { display:'flex', gap:8, alignItems:'center' },
  priceLabel:  { color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' },
  priceValue:  { color:'#fff', fontSize:'0.875rem', fontWeight:600 },
  trackingBox: { display:'flex', flexDirection:'column', gap:4, minWidth:160 },
  trackingNum: { color:'#00d9ff', fontSize:'0.85rem', fontFamily:'monospace', fontWeight:600 },
}
