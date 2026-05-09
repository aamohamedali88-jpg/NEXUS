/**
 * HUSIN ESHOP — Owner Dashboard at /shop
 * Password protected — only YOU can access this
 * Central control panel for the physical products marketplace
 * Completely separate from all other website sections
 * URL: https://www.husin.org/shop
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function ShopDashboard() {
  const [authed,     setAuthed]     = useState(false)
  const [password,   setPassword]   = useState('')
  const [authError,  setAuthError]  = useState('')
  const [loading,    setLoading]    = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState(null)
  const [stats,      setStats]      = useState(null)
  const [query,      setQuery]      = useState(
    'best selling trending products Saudi Arabia 2025'
  )

  // Check saved session on load
  useEffect(() => {
    const saved = sessionStorage.getItem('husin_shop_token')
    if (saved) setAuthed(true)
  }, [])

  // Load stats when logged in
  useEffect(() => {
    if (authed) loadStats()
  }, [authed])

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    try {
      const res  = await fetch('/api/shop/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem('husin_shop_token', data.token)
        setAuthed(true)
      } else {
        setAuthError('Wrong password. Try again.')
      }
    } catch (e) {
      setAuthError('Network error. Please try again.')
    }
    setLoading(false)
  }

  // ── Load live stats ────────────────────────────────────────────────────────
  async function loadStats() {
    try {
      const res = await fetch('/api/shop/stats', {
        headers: { 'x-shop-token': sessionStorage.getItem('husin_shop_token') },
      })
      if (res.ok) setStats(await res.json())
    } catch (e) { console.error('[ShopDashboard] Stats error:', e) }
  }

  // ── Trigger search cycle ───────────────────────────────────────────────────
  async function triggerSearch() {
    setTriggering(true)
    setTriggerMsg(null)
    try {
      const res  = await fetch('/api/shop/trigger', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-token': sessionStorage.getItem('husin_shop_token'),
        },
        body: JSON.stringify({ searchQuery: query }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTriggerMsg({
          type:      'success',
          text:      `✅ Search started! ${data.message}`,
          sessionId: data.sessionId,
        })
        // Refresh stats after 30 seconds
        setTimeout(loadStats, 30000)
      } else {
        setTriggerMsg({ type: 'error', text: `❌ ${data.error}` })
      }
    } catch (e) {
      setTriggerMsg({ type: 'error', text: `❌ Network error: ${e.message}` })
    }
    setTriggering(false)
  }

  function logout() {
    sessionStorage.removeItem('husin_shop_token')
    setAuthed(false)
    setPassword('')
    setStats(null)
  }

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={s.loginPage}>
        <Head>
          <title>HUSIN Shop — Owner Login</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div style={s.loginBox}>
          <div style={s.loginIcon}>🛒</div>
          <h1 style={s.loginTitle}>HUSIN Shop</h1>
          <p style={s.loginSub}>Owner access only</p>
          <form onSubmit={handleLogin} style={s.loginForm}>
            <input
              type="password"
              placeholder="Enter your admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={s.loginInput}
              autoFocus
            />
            {authError && <p style={s.loginError}>{authError}</p>}
            <button
              type="submit"
              style={{ ...s.loginBtn, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Enter Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── MAIN DASHBOARD ────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <Head>
        <title>HUSIN Shop — Dashboard</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <span style={s.topLogo}>🛒 HUSIN Shop</span>
          <span style={s.topBadge}>Owner Dashboard</span>
        </div>
        <div style={s.topRight}>
          <a href="/shop/inbox" style={s.topBtn}>📥 Product Inbox</a>
          <a href="/marketplace"  style={s.topBtn} target="_blank" rel="noreferrer">🌐 Live Store</a>
          <button onClick={logout} style={s.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={s.content}>

        {/* Stats */}
        {stats && (
          <div style={s.statsGrid}>
            {[
              { icon: '✅', label: 'Live Products',  value: stats.approved, color: '#2ecc71' },
              { icon: '⏳', label: 'Pending Review', value: stats.pending,  color: '#f39c12' },
              { icon: '🔍', label: 'Total Searched', value: stats.total,    color: '#3498db' },
              { icon: '❌', label: 'Rejected',       value: stats.rejected, color: '#e74c3c' },
              { icon: '📦', label: 'Orders',         value: stats.orders,   color: '#9b59b6' },
              { icon: '💰', label: 'Revenue (SAR)',  value: stats.revenue,  color: '#c8a46d' },
            ].map((s2, i) => (
              <div key={i} style={s.statCard}>
                <span style={s.statIcon}>{s2.icon}</span>
                <span style={{ ...s.statNum, color: s2.color }}>
                  {Number(s2.value || 0).toLocaleString()}
                </span>
                <span style={s.statLabel}>{s2.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search trigger panel */}
        <div style={s.panel}>
          <h2 style={s.panelTitle}>⚡ Start Product Search Cycle</h2>
          <p style={s.panelDesc}>
            Searches all <strong style={{ color: '#00d9ff' }}>30 sources simultaneously</strong> —
            15 famous (Amazon, Noon, Namshi, Farfetch…) + 15 hidden gems
            (Trendyol, Banggood, YesStyle, Desertcart…).
            Extracts <strong style={{ color: '#00d9ff' }}>5 new products per source = 150 total</strong>.
            Skips any product already in your history.
            Applies your pricing rules automatically.
            Sends everything to your <strong style={{ color: '#00d9ff' }}>Telegram</strong> with
            ✅ Approve / ❌ Reject buttons on each product.
          </p>

          <div style={s.triggerRow}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={s.triggerInput}
              placeholder="Search query (leave default for broad Saudi trending search)"
            />
            <button
              onClick={triggerSearch}
              disabled={triggering}
              style={{ ...s.triggerBtn, opacity: triggering ? 0.65 : 1 }}
            >
              {triggering
                ? '⏳ Searching 30 sources...'
                : '⚡ Start Search & Send to Telegram'}
            </button>
          </div>

          {/* Progress indicator */}
          {triggering && (
            <div style={s.progressWrap}>
              <div style={s.progressTrack}>
                <div style={s.progressBar} />
              </div>
              <p style={s.progressText}>
                Scanning Amazon.sa · Noon · Namshi · Farfetch · NET-A-PORTER ·
                AliExpress · eBay · Trendyol · Banggood · YesStyle · Desertcart ·
                Ubuy · Ounass + 17 more sources...
              </p>
            </div>
          )}

          {/* Result message */}
          {triggerMsg && (
            <div style={{
              ...s.msgBox,
              borderColor: triggerMsg.type === 'success' ? '#2ecc71' : '#e74c3c',
              background:  triggerMsg.type === 'success'
                ? 'rgba(46,204,113,0.08)'
                : 'rgba(231,76,60,0.08)',
            }}>
              <p style={{
                color:  triggerMsg.type === 'success' ? '#2ecc71' : '#e74c3c',
                margin: 0,
                lineHeight: 1.6,
              }}>
                {triggerMsg.text}
              </p>
              {triggerMsg.sessionId && (
                <a href={`/shop/inbox?session=${triggerMsg.sessionId}`} style={s.inboxLink}>
                  → Open Product Inbox to review, approve & publish products
                </a>
              )}
            </div>
          )}
        </div>

        {/* Quick nav */}
        <div style={s.quickGrid}>
          {[
            {
              href:  '/shop/inbox',
              icon:  '📥',
              title: 'Product Inbox',
              desc:  'Review 150 products — approve or reject each one',
            },
            {
              href:  '/marketplace',
              icon:  '🛒',
              title: 'Live Marketplace',
              desc:  'What your customers see — approved products displayed here',
              blank: true,
            },
            {
              href:  '#',
              icon:  '📦',
              title: 'Orders',
              desc:  'Manage customer orders (coming in Batch 3)',
              disabled: true,
            },
            {
              href:  '#',
              icon:  '💳',
              title: 'Payments',
              desc:  'Stripe & PayPal setup (coming in Batch 3)',
              disabled: true,
            },
          ].map((card, i) => (
            <a
              key={i}
              href={card.disabled ? undefined : card.href}
              target={card.blank ? '_blank' : undefined}
              rel={card.blank ? 'noreferrer' : undefined}
              style={{
                ...s.quickCard,
                opacity: card.disabled ? 0.45 : 1,
                cursor:  card.disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={s.quickIcon}>{card.icon}</span>
              <strong style={s.quickTitle}>{card.title}</strong>
              <span style={s.quickDesc}>{card.desc}</span>
              {card.disabled && (
                <span style={s.comingSoon}>Coming Soon</span>
              )}
            </a>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes shopProgress {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  // Login
  loginPage:   { minHeight:'100vh', background:'#050608', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Roboto,system-ui,sans-serif' },
  loginBox:    { background:'#0f1117', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:'48px 40px', width:'100%', maxWidth:400, textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' },
  loginIcon:   { fontSize:48, display:'block', marginBottom:16 },
  loginTitle:  { color:'#fff', fontSize:'1.75rem', fontWeight:700, margin:'0 0 8px' },
  loginSub:    { color:'rgba(255,255,255,0.4)', fontSize:'0.875rem', margin:'0 0 32px' },
  loginForm:   { display:'flex', flexDirection:'column', gap:14 },
  loginInput:  { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'14px 16px', color:'#fff', fontSize:'1rem', outline:'none', textAlign:'center', fontFamily:'inherit' },
  loginError:  { color:'#e74c3c', margin:0, fontSize:'0.85rem' },
  loginBtn:    { background:'#c8a46d', color:'#000', border:'none', borderRadius:8, padding:'14px', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'opacity 0.2s' },
  // Dashboard
  page:        { minHeight:'100vh', background:'#050608', color:'#f4f5f7', fontFamily:'Roboto,system-ui,sans-serif' },
  topBar:      { background:'rgba(5,6,8,0.97)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'14px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(16px)' },
  topLeft:     { display:'flex', alignItems:'center', gap:12 },
  topLogo:     { color:'#c8a46d', fontWeight:700, fontSize:'1.1rem' },
  topBadge:    { background:'rgba(200,164,109,0.12)', border:'1px solid rgba(200,164,109,0.25)', color:'#c8a46d', padding:'3px 10px', borderRadius:20, fontSize:'0.68rem', letterSpacing:'0.08em', textTransform:'uppercase' },
  topRight:    { display:'flex', alignItems:'center', gap:8 },
  topBtn:      { color:'rgba(255,255,255,0.6)', textDecoration:'none', padding:'7px 14px', borderRadius:6, background:'rgba(255,255,255,0.04)', fontSize:'0.83rem', border:'1px solid rgba(255,255,255,0.07)' },
  logoutBtn:   { background:'rgba(231,76,60,0.08)', border:'1px solid rgba(231,76,60,0.2)', color:'#e74c3c', padding:'7px 14px', borderRadius:6, cursor:'pointer', fontSize:'0.83rem', fontFamily:'inherit' },
  content:     { padding:'32px', maxWidth:1280, margin:'0 auto' },
  // Stats
  statsGrid:   { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:14, marginBottom:28 },
  statCard:    { background:'#0f1117', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'20px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, textAlign:'center' },
  statIcon:    { fontSize:22 },
  statNum:     { fontSize:'1.65rem', fontWeight:700, lineHeight:1 },
  statLabel:   { color:'rgba(255,255,255,0.4)', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.06em' },
  // Panel
  panel:       { background:'#0f1117', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:32, marginBottom:24 },
  panelTitle:  { color:'#fff', fontSize:'1.2rem', fontWeight:700, margin:'0 0 10px' },
  panelDesc:   { color:'rgba(255,255,255,0.45)', fontSize:'0.875rem', margin:'0 0 24px', lineHeight:1.75, maxWidth:760 },
  triggerRow:  { display:'flex', gap:12, flexWrap:'wrap' },
  triggerInput:{ flex:1, minWidth:260, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'13px 16px', color:'#fff', fontSize:'0.9rem', outline:'none', fontFamily:'inherit' },
  triggerBtn:  { background:'#00d9ff', color:'#000', border:'none', borderRadius:8, padding:'13px 28px', fontSize:'0.95rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit', transition:'opacity 0.2s, transform 0.1s' },
  progressWrap:{ marginTop:20 },
  progressTrack:{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden', marginBottom:10 },
  progressBar: { height:'100%', background:'linear-gradient(90deg,#00d9ff,#c8a46d,#2ecc71,#00d9ff)', backgroundSize:'300% 100%', animation:'shopProgress 2s linear infinite' },
  progressText:{ color:'rgba(255,255,255,0.35)', fontSize:'0.78rem', margin:0, textAlign:'center', lineHeight:1.6 },
  msgBox:      { marginTop:20, border:'1px solid', borderRadius:8, padding:'16px 20px' },
  inboxLink:   { display:'block', marginTop:10, color:'#00d9ff', fontSize:'0.875rem', textDecoration:'none', fontWeight:600 },
  // Quick nav
  quickGrid:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 },
  quickCard:   { background:'#0f1117', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:24, textDecoration:'none', display:'flex', flexDirection:'column', gap:8, transition:'border-color 0.2s, transform 0.15s', position:'relative' },
  quickIcon:   { fontSize:26 },
  quickTitle:  { color:'#fff', fontWeight:600, fontSize:'0.95rem' },
  quickDesc:   { color:'rgba(255,255,255,0.38)', fontSize:'0.78rem', lineHeight:1.5 },
  comingSoon:  { display:'inline-block', marginTop:4, background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.4)', padding:'2px 8px', borderRadius:20, fontSize:'0.68rem', width:'fit-content' },
                     }
