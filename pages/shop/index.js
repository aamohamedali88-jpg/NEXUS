/**
 * HUSIN ESHOP — /shop (Owner Dashboard)
 * Updated with:
 * ✅ Category selection buttons — choose what to search before launching
 * ✅ Quality filter rules visible per category
 * ✅ Search stats — accepted vs rejected count
 * ✅ Session history with product previews
 * ✅ All existing approve/reject workflow preserved
 */

import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

const CATEGORIES = [
  { key: 'all',             label: '🌐 All Categories',    desc: 'Run all categories at once' },
  { key: 'clothes_men',     label: "👔 Men's Wear",        desc: 'Nike, Adidas, polo shirts, jeans, jackets' },
  { key: 'clothes_women',   label: "👗 Women's Wear",      desc: 'Handbags, dresses, heels, Coach, MK' },
  { key: 'electronics',     label: '⚡ Electronics',        desc: 'Apple, Samsung, Sony — FULL SPECS REQUIRED' },
  { key: 'mobiles',         label: '📱 Mobiles',            desc: 'iPhones, Samsung Galaxy — sealed new only' },
  { key: 'laptops',         label: '💻 Laptops',            desc: 'MacBook, Dell, HP — full specs required' },
  { key: 'jewelry',         label: '💎 Jewelry',            desc: 'Gold, diamond, Pandora, Cartier' },
  { key: 'beauty',          label: '💄 Beauty',             desc: 'Perfumes, skincare, Charlotte Tilbury' },
  { key: 'home_appliances', label: '🏠 Home Appliances',   desc: 'Dyson, KitchenAid, Nespresso' },
  { key: 'sports',          label: '🏋️ Sports',            desc: 'Nike, Adidas, Garmin, Fitbit' },
  { key: 'toys',            label: '🧸 Toys',               desc: 'LEGO, Hot Wheels, Barbie — sealed new' },
]

const QUALITY_RULES = {
  all:             { minSpecs: 4,  images: 2, condition: 'New only',        strict: false },
  clothes_men:     { minSpecs: 5,  images: 2, condition: 'New / New with tags', strict: false },
  clothes_women:   { minSpecs: 5,  images: 2, condition: 'New / New with tags', strict: false },
  electronics:     { minSpecs: 8,  images: 2, condition: '100% New sealed', strict: true  },
  mobiles:         { minSpecs: 8,  images: 2, condition: '100% New sealed', strict: true  },
  laptops:         { minSpecs: 8,  images: 2, condition: '100% New sealed', strict: true  },
  jewelry:         { minSpecs: 5,  images: 2, condition: 'New only',        strict: false },
  beauty:          { minSpecs: 4,  images: 2, condition: 'New sealed',      strict: false },
  home_appliances: { minSpecs: 5,  images: 2, condition: '100% New',       strict: false },
  sports:          { minSpecs: 5,  images: 2, condition: 'New / New with box', strict: false },
  toys:            { minSpecs: 4,  images: 2, condition: 'New sealed',      strict: false },
}

export default function OwnerDashboard() {
  // Auth
  const [authed,     setAuthed]     = useState(false)
  const [password,   setPassword]   = useState('')
  const [authErr,    setAuthErr]    = useState('')
  const [token,      setToken]      = useState('')

  // Dashboard state
  const [selectedCat, setSelectedCat] = useState('all')
  const [searching,   setSearching]   = useState(false)
  const [searchMsg,   setSearchMsg]   = useState('')
  const [searchErr,   setSearchErr]   = useState('')
  const [stats,       setStats]       = useState(null)
  const [sessions,    setSessions]    = useState([])
  const [sessionProds,setSessionProds]= useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [loadingProds, setLoadingProds]   = useState(false)

  // Load stats on auth
  useEffect(() => {
    if (authed && token) {
      loadStats()
      loadSessions()
    }
  }, [authed, token])

  // Auto-refresh stats while searching
  useEffect(() => {
    if (!searching) return
    const iv = setInterval(loadStats, 5000)
    return () => clearInterval(iv)
  }, [searching])

  async function handleLogin(e) {
    e.preventDefault()
    setAuthErr('')
    try {
      const res  = await fetch('/api/shop/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.token) {
        setToken(data.token)
        setAuthed(true)
        localStorage.setItem('shop_token', data.token)
      } else {
        setAuthErr('Wrong password.')
      }
    } catch {
      setAuthErr('Login failed. Try again.')
    }
  }

  async function loadStats() {
    try {
      const res  = await fetch('/api/shop/stats', {
        headers: { 'x-shop-token': token }
      })
      const data = await res.json()
      if (data.stats) setStats(data.stats)
    } catch {}
  }

  async function loadSessions() {
    try {
      const res  = await fetch('/api/shop/sessions', {
        headers: { 'x-shop-token': token }
      })
      const data = await res.json()
      if (data.sessions) setSessions(data.sessions.slice(0, 10))
    } catch {}
  }

  async function loadSessionProducts(sessionId) {
    if (activeSession === sessionId) {
      setActiveSession(null)
      setSessionProds([])
      return
    }
    setActiveSession(sessionId)
    setLoadingProds(true)
    try {
      const res  = await fetch(`/api/shop/products?sessionId=${sessionId}`, {
        headers: { 'x-shop-token': token }
      })
      const data = await res.json()
      setSessionProds(data.products || [])
    } catch {}
    setLoadingProds(false)
  }

  async function handleSearch() {
    if (searching) return
    setSearching(true)
    setSearchMsg('')
    setSearchErr('')

    try {
      const res  = await fetch('/api/shop/trigger', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-token': token,
        },
        body: JSON.stringify({ category: selectedCat, maxProducts: 60 }),
      })
      const data = await res.json()

      if (data.success) {
        const catLabel = CATEGORIES.find(c => c.key === selectedCat)?.label || selectedCat
        setSearchMsg(`✅ Search launched for ${catLabel}. Products will arrive in Telegram shortly.`)
        // Reload sessions after 10s
        setTimeout(() => { loadSessions(); loadStats() }, 10000)
        setTimeout(() => { setSearching(false); loadStats(); loadSessions() }, 90000)
      } else {
        setSearchErr(data.error || 'Search failed')
        setSearching(false)
      }
    } catch (err) {
      setSearchErr(err.message)
      setSearching(false)
    }
  }

  async function handleDecide(productId, decision) {
    try {
      await fetch('/api/shop/decide', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-token': token },
        body:    JSON.stringify({ productId, decision }),
      })
      setSessionProds(prev => prev.filter(p => p.id !== productId))
      loadStats()
    } catch {}
  }

  // Restore token from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('shop_token')
    if (saved) { setToken(saved); setAuthed(true) }
  }, [])

  const selectedRules = QUALITY_RULES[selectedCat] || QUALITY_RULES.all
  const selectedInfo  = CATEGORIES.find(c => c.key === selectedCat)

  // ── LOGIN PAGE ─────────────────────────────────────────────────────────────
  if (!authed) return (
    <>
      <Head><title>HUSIN Owner Dashboard</title></Head>
      <div style={S.loginPage}>
        <div style={S.loginCard}>
          <img src="/main%20logo-200h-200h.png" alt="HUSIN" style={S.loginLogo}
            onError={e=>{e.target.style.display='none'}} />
          <h1 style={S.loginTitle}>Owner Dashboard</h1>
          <p style={S.loginSub}>HUSIN Nexus · Private Access</p>
          <form onSubmit={handleLogin} style={S.loginForm}>
            <input
              type="password"
              style={S.loginInput}
              placeholder="Enter access password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            {authErr && <p style={S.loginErr}>{authErr}</p>}
            <button type="submit" style={S.loginBtn}>Enter Dashboard →</button>
          </form>
        </div>
      </div>
    </>
  )

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>Owner Dashboard — HUSIN</title></Head>

      <div style={S.page}>
        {/* Top bar */}
        <div style={S.topBar}>
          <div style={S.topBarLeft}>
            <img src="/main%20logo-200h-200h.png" alt="HUSIN" style={S.topLogo}
              onError={e=>{e.target.style.display='none'}} />
            <span style={S.topTitle}>Owner Dashboard</span>
            <span style={S.topBadge}>PRIVATE</span>
          </div>
          <div style={S.topBarRight}>
            <a href="/shop/orders" style={S.topLink}>📦 Orders</a>
            <button style={S.topLogout}
              onClick={()=>{localStorage.removeItem('shop_token');setAuthed(false)}}>
              Logout
            </button>
          </div>
        </div>

        <div style={S.layout}>

          {/* ── STATS ROW ── */}
          {stats && (
            <div style={S.statsRow}>
              {[
                { label:'Live Products',  val: stats.live    || 0, color:'#2ecc71' },
                { label:'Pending Review', val: stats.pending || 0, color:'#f39c12' },
                { label:'Rejected',       val: stats.rejected|| 0, color:'#e74c3c' },
                { label:'Total Orders',   val: stats.orders  || 0, color:'#00d9ff' },
              ].map((s,i) => (
                <div key={i} style={S.statCard}>
                  <span style={{...S.statVal, color:s.color}}>{s.val.toLocaleString()}</span>
                  <span style={S.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── SEARCH PANEL ── */}
          <div style={S.searchPanel}>
            <h2 style={S.sectionTitle}>⚡ Launch Product Search</h2>

            {/* Step 1: Choose category */}
            <div style={S.step}>
              <div style={S.stepHead}>
                <span style={S.stepNum}>1</span>
                <span style={S.stepLabel2}>Select Category to Search</span>
              </div>
              <div style={S.catGrid}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    style={{
                      ...S.catBtn,
                      ...(selectedCat === cat.key ? S.catBtnActive : {}),
                    }}
                    onClick={() => setSelectedCat(cat.key)}
                  >
                    <span style={S.catBtnLabel}>{cat.label}</span>
                    <span style={S.catBtnDesc}>{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Quality rules preview */}
            <div style={S.step}>
              <div style={S.stepHead}>
                <span style={S.stepNum}>2</span>
                <span style={S.stepLabel2}>
                  Active Quality Rules for: <strong style={{color:'#00d9ff'}}>{selectedInfo?.label}</strong>
                </span>
              </div>
              <div style={S.rulesGrid}>
                <div style={S.ruleCard}>
                  <span style={S.ruleIcon}>🔍</span>
                  <div>
                    <span style={S.ruleTitle}>Condition</span>
                    <span style={{
                      ...S.ruleVal,
                      color: selectedRules.strict ? '#e74c3c' : '#2ecc71'
                    }}>
                      {selectedRules.condition}
                    </span>
                  </div>
                </div>
                <div style={S.ruleCard}>
                  <span style={S.ruleIcon}>📋</span>
                  <div>
                    <span style={S.ruleTitle}>Min Specifications</span>
                    <span style={S.ruleVal}>{selectedRules.minSpecs}+ required fields</span>
                  </div>
                </div>
                <div style={S.ruleCard}>
                  <span style={S.ruleIcon}>🖼️</span>
                  <div>
                    <span style={S.ruleTitle}>Images Required</span>
                    <span style={S.ruleVal}>{selectedRules.images}+ product images</span>
                  </div>
                </div>
                <div style={S.ruleCard}>
                  <span style={S.ruleIcon}>{selectedRules.strict ? '🔒' : '✅'}</span>
                  <div>
                    <span style={S.ruleTitle}>Specs Mode</span>
                    <span style={{
                      ...S.ruleVal,
                      color: selectedRules.strict ? '#e74c3c' : '#f39c12'
                    }}>
                      {selectedRules.strict ? 'STRICT — All specs required' : 'Standard quality'}
                    </span>
                  </div>
                </div>
              </div>
              {selectedRules.strict && (
                <div style={S.strictWarning}>
                  ⚠️ <strong>Strict Mode:</strong> Products without complete technical specifications
                  will be automatically rejected. This ensures only fully documented items enter your store.
                </div>
              )}
            </div>

            {/* Step 3: Launch */}
            <div style={S.step}>
              <div style={S.stepHead}>
                <span style={S.stepNum}>3</span>
                <span style={S.stepLabel2}>Launch Search</span>
              </div>
              <button
                style={{
                  ...S.launchBtn,
                  ...(searching ? S.launchBtnBusy : {}),
                }}
                onClick={handleSearch}
                disabled={searching}
              >
                {searching
                  ? <><span style={S.spinner} /> Searching {selectedInfo?.label}...</>
                  : <>⚡ Start Search — {selectedInfo?.label}</>
                }
              </button>
              <p style={S.launchNote}>
                Products matching your rules will be sent to Telegram for approval.
                Estimated time: 60–90 seconds per category.
              </p>
            </div>

            {/* Messages */}
            {searchMsg && <div style={S.msgSuccess}>{searchMsg}</div>}
            {searchErr && <div style={S.msgError}>❌ {searchErr}</div>}
          </div>

          {/* ── SESSION HISTORY ── */}
          <div style={S.sessionsPanel}>
            <div style={S.sessionsPanelHead}>
              <h2 style={S.sectionTitle}>📁 Search Sessions</h2>
              <button style={S.refreshBtn} onClick={()=>{loadSessions();loadStats()}}>↻ Refresh</button>
            </div>

            {sessions.length === 0 ? (
              <p style={S.emptyNote}>No sessions yet. Launch a search above.</p>
            ) : (
              <div style={S.sessionList}>
                {sessions.map((session, i) => (
                  <div key={i} style={S.sessionCard}>
                    <div style={S.sessionHead}
                      onClick={() => loadSessionProducts(session.sessionId)}>
                      <div style={S.sessionInfo}>
                        <span style={S.sessionCats}>
                          {(session.categories || ['all']).join(', ')}
                        </span>
                        <span style={S.sessionTime}>
                          {new Date(session.startedAt).toLocaleString('en-SA')}
                        </span>
                      </div>
                      <div style={S.sessionStats}>
                        <span style={{...S.sessionStat, color:'#2ecc71'}}>
                          ✅ {session.accepted || 0}
                        </span>
                        <span style={{...S.sessionStat, color:'#e74c3c'}}>
                          ❌ {session.rejected || 0}
                        </span>
                        <span style={{
                          ...S.sessionStatus,
                          background: session.status === 'completed'
                            ? 'rgba(46,204,113,0.1)' : 'rgba(243,156,18,0.1)',
                          color: session.status === 'completed' ? '#2ecc71' : '#f39c12',
                          border: `1px solid ${session.status === 'completed'
                            ? 'rgba(46,204,113,0.2)' : 'rgba(243,156,18,0.2)'}`,
                        }}>
                          {session.status || 'running'}
                        </span>
                        <span style={S.sessionToggle}>
                          {activeSession === session.sessionId ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Session products */}
                    {activeSession === session.sessionId && (
                      <div style={S.sessionProdsWrap}>
                        {loadingProds ? (
                          <p style={S.emptyNote}>Loading products...</p>
                        ) : sessionProds.length === 0 ? (
                          <p style={S.emptyNote}>No products in this session.</p>
                        ) : (
                          <div style={S.prodGrid}>
                            {sessionProds.map((prod, j) => (
                              <div key={j} style={S.prodCard}>
                                <div style={S.prodImgWrap}>
                                  {prod.image ? (
                                    <img src={prod.image} alt={prod.name} style={S.prodImg}
                                      onError={e=>{e.target.style.display='none'}} />
                                  ) : (
                                    <div style={S.prodImgPh}>📦</div>
                                  )}
                                </div>
                                <div style={S.prodInfo}>
                                  <p style={S.prodName}>{prod.name?.substring(0,60)}</p>
                                  <div style={S.prodMeta}>
                                    <span style={{...S.prodBadge, background:'rgba(200,164,109,0.1)', color:'#c8a46d'}}>
                                      {prod.sellingPriceSAR?.toLocaleString()} SAR
                                    </span>
                                    <span style={{...S.prodBadge, background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)'}}>
                                      {prod.category}
                                    </span>
                                    {prod.qualityScore && (
                                      <span style={{...S.prodBadge,
                                        background: prod.qualityScore >= 70
                                          ? 'rgba(46,204,113,0.1)' : 'rgba(243,156,18,0.1)',
                                        color: prod.qualityScore >= 70 ? '#2ecc71' : '#f39c12'
                                      }}>
                                        ⭐ {prod.qualityScore}
                                      </span>
                                    )}
                                  </div>
                                  {/* Approve / Reject from dashboard */}
                                  {prod.status === 'pending' && (
                                    <div style={S.prodActions}>
                                      <button style={S.approveBtn}
                                        onClick={() => handleDecide(prod.id, 'approve')}>
                                        ✅ Approve
                                      </button>
                                      <button style={S.rejectBtn}
                                        onClick={() => handleDecide(prod.id, 'reject')}>
                                        ❌ Reject
                                      </button>
                                    </div>
                                  )}
                                  {prod.status === 'live' && (
                                    <span style={{...S.prodBadge, background:'rgba(46,204,113,0.1)', color:'#2ecc71', marginTop:6, display:'inline-block'}}>
                                      ✅ Live on marketplace
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes dashSpin { to { transform:rotate(360deg); } }
        input:focus { outline:none; }
        button:focus { outline:none; }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:3px; }
      `}</style>
    </>
  )
}

// ── Inline styles ─────────────────────────────────────────────────────────────
const S = {
  // Login
  loginPage:    { background:'#050608', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'Roboto,system-ui,sans-serif' },
  loginCard:    { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'48px 40px', maxWidth:420, width:'100%', textAlign:'center' },
  loginLogo:    { height:52, width:'auto', objectFit:'contain', marginBottom:20 },
  loginTitle:   { color:'#fff', fontSize:'1.5rem', fontWeight:700, margin:'0 0 6px' },
  loginSub:     { color:'rgba(255,255,255,0.35)', fontSize:'0.85rem', margin:'0 0 28px' },
  loginForm:    { display:'flex', flexDirection:'column', gap:12 },
  loginInput:   { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'13px 16px', color:'#fff', fontSize:'0.95rem', fontFamily:'inherit' },
  loginErr:     { color:'#e74c3c', fontSize:'0.82rem', margin:0 },
  loginBtn:     { background:'linear-gradient(135deg,#00d9ff,#0099bb)', color:'#000', border:'none', borderRadius:10, padding:'14px', fontSize:'0.95rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' },

  // Page
  page:         { background:'#050608', minHeight:'100vh', fontFamily:'Roboto,system-ui,sans-serif', color:'#f4f5f7' },

  // Top bar
  topBar:       { background:'rgba(15,17,23,0.95)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 },
  topBarLeft:   { display:'flex', alignItems:'center', gap:12 },
  topLogo:      { height:32, width:'auto', objectFit:'contain' },
  topTitle:     { color:'#fff', fontWeight:700, fontSize:'0.9rem' },
  topBadge:     { background:'rgba(231,76,60,0.12)', border:'1px solid rgba(231,76,60,0.25)', color:'#e74c3c', padding:'2px 8px', borderRadius:20, fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em' },
  topBarRight:  { display:'flex', alignItems:'center', gap:10 },
  topLink:      { color:'rgba(255,255,255,0.6)', textDecoration:'none', fontSize:'0.82rem', padding:'6px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, transition:'all 0.2s' },
  topLogout:    { background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, color:'rgba(255,255,255,0.4)', padding:'6px 12px', fontSize:'0.78rem', cursor:'pointer', fontFamily:'inherit' },

  // Layout
  layout:       { maxWidth:1200, margin:'0 auto', padding:'24px 24px 60px', display:'flex', flexDirection:'column', gap:20 },

  // Stats
  statsRow:     { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 },
  statCard:     { background:'#0f1117', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'18px 20px', display:'flex', flexDirection:'column', gap:4 },
  statVal:      { fontSize:'1.8rem', fontWeight:700, lineHeight:1 },
  statLabel:    { color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', fontWeight:500 },

  // Panels
  searchPanel:  { background:'#0f1117', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:28 },
  sessionsPanel:{ background:'#0f1117', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:28 },
  sessionsPanelHead: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 },
  sectionTitle: { color:'#fff', fontSize:'1rem', fontWeight:700, margin:'0 0 20px' },
  refreshBtn:   { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, color:'rgba(255,255,255,0.5)', padding:'6px 14px', fontSize:'0.78rem', cursor:'pointer', fontFamily:'inherit' },

  // Steps
  step:         { marginBottom:24 },
  stepHead:     { display:'flex', alignItems:'center', gap:10, marginBottom:14 },
  stepNum:      { width:28, height:28, borderRadius:'50%', background:'rgba(0,217,255,0.1)', border:'1px solid rgba(0,217,255,0.25)', color:'#00d9ff', fontSize:'0.78rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  stepLabel2:   { color:'rgba(255,255,255,0.7)', fontSize:'0.85rem', fontWeight:600 },

  // Category buttons
  catGrid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 },
  catBtn:       { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 14px', cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', flexDirection:'column', gap:4, transition:'all 0.15s' },
  catBtnActive: { background:'rgba(0,217,255,0.08)', border:'1px solid rgba(0,217,255,0.3)' },
  catBtnLabel:  { color:'#fff', fontSize:'0.82rem', fontWeight:600 },
  catBtnDesc:   { color:'rgba(255,255,255,0.35)', fontSize:'0.68rem', lineHeight:1.4 },

  // Quality rules
  rulesGrid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8, marginBottom:10 },
  ruleCard:     { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10 },
  ruleIcon:     { fontSize:'1.1rem', flexShrink:0, marginTop:2 },
  ruleTitle:    { display:'block', color:'rgba(255,255,255,0.4)', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 },
  ruleVal:      { display:'block', color:'rgba(255,255,255,0.8)', fontSize:'0.8rem', fontWeight:600 },
  strictWarning:{ background:'rgba(231,76,60,0.07)', border:'1px solid rgba(231,76,60,0.2)', borderRadius:8, padding:'10px 14px', color:'rgba(255,255,255,0.6)', fontSize:'0.78rem', lineHeight:1.6 },

  // Launch
  launchBtn:    { display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', background:'linear-gradient(135deg,#00d9ff,#0099bb)', color:'#000', border:'none', borderRadius:11, padding:'16px', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'opacity 0.2s,transform 0.1s', maxWidth:400 },
  launchBtnBusy:{ background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', cursor:'not-allowed', transform:'none' },
  launchNote:   { color:'rgba(255,255,255,0.3)', fontSize:'0.75rem', marginTop:10, lineHeight:1.6 },
  spinner:      { width:18, height:18, border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'#000', borderRadius:'50%', animation:'dashSpin 0.7s linear infinite', flexShrink:0 },

  // Messages
  msgSuccess:   { background:'rgba(46,204,113,0.08)', border:'1px solid rgba(46,204,113,0.2)', borderRadius:9, padding:'12px 16px', color:'#2ecc71', fontSize:'0.85rem', lineHeight:1.6 },
  msgError:     { background:'rgba(231,76,60,0.08)', border:'1px solid rgba(231,76,60,0.2)', borderRadius:9, padding:'12px 16px', color:'#e74c3c', fontSize:'0.85rem' },

  // Sessions
  emptyNote:    { color:'rgba(255,255,255,0.25)', fontSize:'0.82rem', margin:0 },
  sessionList:  { display:'flex', flexDirection:'column', gap:10 },
  sessionCard:  { background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:11, overflow:'hidden' },
  sessionHead:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', cursor:'pointer', flexWrap:'wrap', gap:8 },
  sessionInfo:  { display:'flex', flexDirection:'column', gap:3 },
  sessionCats:  { color:'rgba(255,255,255,0.75)', fontSize:'0.82rem', fontWeight:600, textTransform:'capitalize' },
  sessionTime:  { color:'rgba(255,255,255,0.3)', fontSize:'0.72rem' },
  sessionStats: { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' },
  sessionStat:  { fontSize:'0.8rem', fontWeight:700 },
  sessionStatus:{ padding:'2px 9px', borderRadius:20, fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.06em' },
  sessionToggle:{ color:'rgba(255,255,255,0.3)', fontSize:'0.75rem', marginLeft:4 },

  // Session products
  sessionProdsWrap: { borderTop:'1px solid rgba(255,255,255,0.06)', padding:'16px' },
  prodGrid:     { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 },
  prodCard:     { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' },
  prodImgWrap:  { height:130, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  prodImg:      { width:'100%', height:'100%', objectFit:'contain', padding:8 },
  prodImgPh:    { fontSize:40, color:'rgba(0,0,0,0.15)' },
  prodInfo:     { padding:'10px 12px', display:'flex', flexDirection:'column', gap:6 },
  prodName:     { color:'rgba(255,255,255,0.8)', fontSize:'0.76rem', lineHeight:1.4, margin:0 },
  prodMeta:     { display:'flex', gap:5, flexWrap:'wrap' },
  prodBadge:    { padding:'2px 7px', borderRadius:5, fontSize:'0.65rem', fontWeight:600 },
  prodActions:  { display:'flex', gap:8, marginTop:4 },
  approveBtn:   { flex:1, background:'rgba(46,204,113,0.12)', border:'1px solid rgba(46,204,113,0.25)', color:'#2ecc71', borderRadius:7, padding:'7px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' },
  rejectBtn:    { flex:1, background:'rgba(231,76,60,0.08)', border:'1px solid rgba(231,76,60,0.2)', color:'#e74c3c', borderRadius:7, padding:'7px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' },
}
