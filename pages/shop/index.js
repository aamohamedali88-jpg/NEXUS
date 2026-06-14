/**
 * HUSIN ESHOP — /shop (Owner Dashboard)
 * FREE PLAN compatible — drives trigger-worker.js in a polling loop
 * Each worker call processes 1 query (~5s), dashboard calls next until done
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'

const CATEGORIES = [
  { key: 'all',             label: '🌐 All Categories',    desc: 'Run all categories at once' },
  { key: 'clothes_men',     label: "👔 Men's Wear",        desc: 'Nike, Adidas, polo shirts, jeans, jackets' },
  { key: 'clothes_women',   label: "👗 Women's Wear",      desc: 'Handbags, dresses, heels, Coach, MK' },
  { key: 'electronics',     label: '⚡ Electronics',        desc: 'Apple, Samsung, Sony — full specs' },
  { key: 'mobiles',         label: '📱 Mobiles',            desc: 'iPhones, Samsung Galaxy — new sealed' },
  { key: 'laptops',         label: '💻 Laptops',            desc: 'MacBook, Dell, HP — new sealed' },
  { key: 'jewelry',         label: '💎 Jewelry',            desc: 'Gold, diamond, Pandora, Cartier' },
  { key: 'beauty',          label: '💄 Beauty',             desc: 'Perfumes, skincare, Charlotte Tilbury' },
  { key: 'home_appliances', label: '🏠 Home Appliances',   desc: 'Dyson, KitchenAid, Nespresso' },
  { key: 'sports',          label: '🏋️ Sports',            desc: 'Nike, Adidas, Garmin, Fitbit' },
  { key: 'toys',            label: '🧸 Toys',               desc: 'LEGO, Hot Wheels — sealed new' },
]

const QUALITY_RULES = {
  all:             { minSpecs: 3, images: 1, condition: 'New only',            strict: false },
  clothes_men:     { minSpecs: 4, images: 1, condition: 'New / New with tags', strict: false },
  clothes_women:   { minSpecs: 4, images: 1, condition: 'New / New with tags', strict: false },
  electronics:     { minSpecs: 5, images: 1, condition: '100% New sealed',     strict: true  },
  mobiles:         { minSpecs: 5, images: 1, condition: '100% New sealed',     strict: true  },
  laptops:         { minSpecs: 5, images: 1, condition: '100% New sealed',     strict: true  },
  jewelry:         { minSpecs: 3, images: 1, condition: 'New only',            strict: false },
  beauty:          { minSpecs: 3, images: 1, condition: 'New sealed',          strict: false },
  home_appliances: { minSpecs: 3, images: 1, condition: '100% New',            strict: false },
  sports:          { minSpecs: 3, images: 1, condition: 'New / New with box',  strict: false },
  toys:            { minSpecs: 3, images: 1, condition: 'New sealed',          strict: false },
}

export default function OwnerDashboard() {
  const [authed,       setAuthed]       = useState(false)
  const [password,     setPassword]     = useState('')
  const [authErr,      setAuthErr]      = useState('')
  const [token,        setToken]        = useState('')

  const [selectedCat,  setSelectedCat]  = useState('all')
  const [searching,    setSearching]    = useState(false)
  const [jobId,        setJobId]        = useState(null)
  const [progress,     setProgress]     = useState(null) // { completed, total, accepted, rejected, currentQuery }
  const [searchLog,    setSearchLog]    = useState([])
  const [searchDone,   setSearchDone]   = useState(false)
  const [searchErr,    setSearchErr]    = useState('')

  // Sync state
  const [syncing,      setSyncing]      = useState(false)
  const [syncJobId,    setSyncJobId]    = useState(null)
  const [syncProgress, setSyncProgress] = useState(null)
  const [syncLog,      setSyncLog]      = useState([])
  const [syncDone,     setSyncDone]     = useState(false)
  const [syncErr,      setSyncErr]      = useState('')
  const syncWorkerRef    = useRef(null)
  const activeSyncJobRef = useRef(null)

  const [stats,        setStats]        = useState(null)
  const [sessions,     setSessions]     = useState([])
  const [sessionProds, setSessionProds] = useState([])
  const [activeSession,setActiveSession]= useState(null)
  const [loadingProds, setLoadingProds] = useState(false)

  const workerRef    = useRef(null)
  const activeJobRef = useRef(null)

  // Restore token
  useEffect(() => {
    const saved = localStorage.getItem('shop_token')
    if (saved) { setToken(saved); setAuthed(true) }
  }, [])

  useEffect(() => {
    if (authed && token) { loadStats(); loadSessions() }
  }, [authed, token])

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
      setAuthErr('Login failed.')
    }
  }

  async function loadStats() {
    try {
      const res  = await fetch('/api/shop/stats', { headers: { 'x-shop-token': token } })
      const data = await res.json()
      if (data.stats) setStats(data.stats)
    } catch {}
  }

  async function loadSessions() {
    try {
      const res  = await fetch('/api/shop/sessions', { headers: { 'x-shop-token': token } })
      const data = await res.json()
      if (data.sessions) setSessions(data.sessions.slice(0, 8))
    } catch {}
  }

  async function loadSessionProducts(sessionId) {
    if (activeSession === sessionId) { setActiveSession(null); setSessionProds([]); return }
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

  // ── WORKER LOOP ─────────────────────────────────────────────────────────────
  // Calls trigger-worker repeatedly until job is done
  // Each call = 1 query, waits 1.5s between calls to avoid hammering
  const runWorker = useCallback(async (jid) => {
    if (!jid) return

    try {
      const res  = await fetch('/api/shop/trigger-worker', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-token': token },
        body:    JSON.stringify({ jobId: jid }),
      })
      const data = await res.json()

      if (data.error) {
        setSearchErr(`Worker error: ${data.error}`)
        setSearching(false)
        return
      }

      // Update progress
      setProgress({
        completed:    data.completedTasks  || 0,
        total:        data.totalTasks      || 0,
        accepted:     data.accepted        || 0,
        rejected:     data.rejected        || 0,
        currentQuery: data.currentQuery    || '',
      })

      // Add to log
      if (data.message) {
        setSearchLog(prev => [data.message, ...prev].slice(0, 20))
      }

      if (data.done) {
        // Job complete
        setSearching(false)
        setSearchDone(true)
        setProgress(null)
        loadStats()
        loadSessions()
      } else {
        // Schedule next worker call after 1.5s pause
        workerRef.current = setTimeout(() => {
          if (activeJobRef.current === jid) runWorker(jid)
        }, 1500)
      }
    } catch (err) {
      // Retry on network error after 3s
      workerRef.current = setTimeout(() => {
        if (activeJobRef.current === jid) runWorker(jid)
      }, 3000)
    }
  }, [token])

  // ── SYNC WORKER LOOP ────────────────────────────────────────────────────────
  const runSyncWorker = useCallback(async (jid) => {
    if (!jid) return
    try {
      const res  = await fetch('/api/shop/sync-worker', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-token': token },
        body:    JSON.stringify({ jobId: jid }),
      })
      const data = await res.json()
      if (data.error) { setSyncErr(data.error); setSyncing(false); return }

      setSyncProgress({
        completed:   data.completedTasks || 0,
        total:       data.totalTasks     || 0,
        result:      data.result         || '',
        productName: data.productName    || '',
      })
      if (data.message) setSyncLog(prev => [data.message, ...prev].slice(0, 30))

      if (data.done) {
        setSyncing(false); setSyncDone(true); setSyncProgress(null)
        loadStats(); loadSessions()
      } else {
        syncWorkerRef.current = setTimeout(() => {
          if (activeSyncJobRef.current === jid) runSyncWorker(jid)
        }, 2000)
      }
    } catch (err) {
      syncWorkerRef.current = setTimeout(() => {
        if (activeSyncJobRef.current === jid) runSyncWorker(jid)
      }, 4000)
    }
  }, [token])

  async function handleSync() {
    if (syncing) return
    setSyncing(true); setSyncDone(false); setSyncErr(''); setSyncLog([]); setSyncProgress(null)
    if (syncWorkerRef.current) clearTimeout(syncWorkerRef.current)
    try {
      const res  = await fetch('/api/shop/sync-trigger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-token': token },
        body:    JSON.stringify({}),
      })
      const data = await res.json()
      if (!data.success || !data.jobId) {
        setSyncErr(data.error || 'Failed to create sync job'); setSyncing(false); return
      }
      setSyncJobId(data.jobId)
      activeSyncJobRef.current = data.jobId
      setSyncProgress({ completed: 0, total: data.totalTasks, result: '', productName: '' })
      setSyncLog([`Sync job created — checking ${data.totalTasks} live products...`])
      runSyncWorker(data.jobId)
    } catch (err) {
      setSyncErr(err.message); setSyncing(false)
    }
  }

  function handleSyncStop() {
    if (syncWorkerRef.current) clearTimeout(syncWorkerRef.current)
    activeSyncJobRef.current = null
    setSyncing(false)
    setSyncLog(prev => ['⏹ Sync stopped.', ...prev])
  }

  async function handleSearch() {
    if (searching) return
    setSearching(true)
    setSearchDone(false)
    setSearchErr('')
    setSearchLog([])
    setProgress(null)

    // Clear any existing worker
    if (workerRef.current) clearTimeout(workerRef.current)

    try {
      // Step 1: Create job
      const res  = await fetch('/api/shop/trigger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-token': token },
        body:    JSON.stringify({ category: selectedCat }),
      })
      const data = await res.json()

      if (!data.success || !data.jobId) {
        setSearchErr(data.error || 'Failed to create search job')
        setSearching(false)
        return
      }

      setJobId(data.jobId)
      activeJobRef.current = data.jobId
      setProgress({ completed: 0, total: data.totalTasks, accepted: 0, rejected: 0, currentQuery: '' })
      setSearchLog([`Job created — ${data.totalTasks} queries to process...`])

      // Step 2: Start worker loop
      runWorker(data.jobId)

    } catch (err) {
      setSearchErr(err.message)
      setSearching(false)
    }
  }

  function handleStop() {
    if (workerRef.current) clearTimeout(workerRef.current)
    activeJobRef.current = null
    setSearching(false)
    setSearchLog(prev => ['⏹ Search stopped by owner.', ...prev])
  }

  const selectedRules = QUALITY_RULES[selectedCat] || QUALITY_RULES.all
  const selectedInfo  = CATEGORIES.find(c => c.key === selectedCat)
  const progressPct   = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0

  // ── LOGIN ──────────────────────────────────────────────────────────────────
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
            <input type="password" style={S.loginInput}
              placeholder="Enter access password"
              value={password} onChange={e=>setPassword(e.target.value)} autoFocus />
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

          {/* Stats */}
          {stats && (
            <div style={S.statsRow}>
              {[
                { label:'Live Products',  val:stats.live    ||0, color:'#2ecc71' },
                { label:'Pending Review', val:stats.pending ||0, color:'#f39c12' },
                { label:'Rejected',       val:stats.rejected||0, color:'#e74c3c' },
                { label:'Total Orders',   val:stats.orders  ||0, color:'#00d9ff' },
              ].map((s,i)=>(
                <div key={i} style={S.statCard}>
                  <span style={{...S.statVal,color:s.color}}>{s.val.toLocaleString()}</span>
                  <span style={S.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Search Panel */}
          <div style={S.panel}>
            <h2 style={S.panelTitle}>⚡ Launch Product Search</h2>

            {/* Step 1 — Category */}
            <div style={S.step}>
              <div style={S.stepHead}>
                <span style={S.stepNum}>1</span>
                <span style={S.stepLbl}>Select Category</span>
              </div>
              <div style={S.catGrid}>
                {CATEGORIES.map(cat=>(
                  <button key={cat.key}
                    style={{...S.catBtn,...(selectedCat===cat.key?S.catBtnOn:{})}}
                    onClick={()=>setSelectedCat(cat.key)}
                    disabled={searching}>
                    <span style={S.catBtnLabel}>{cat.label}</span>
                    <span style={S.catBtnDesc}>{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Quality rules */}
            <div style={S.step}>
              <div style={S.stepHead}>
                <span style={S.stepNum}>2</span>
                <span style={S.stepLbl}>
                  Quality Rules for: <strong style={{color:'#00d9ff'}}>{selectedInfo?.label}</strong>
                </span>
              </div>
              <div style={S.rulesRow}>
                {[
                  { icon:'🔍', title:'Condition',    val:selectedRules.condition, color: selectedRules.strict?'#e74c3c':'#2ecc71' },
                  { icon:'📋', title:'Min Specs',    val:`${selectedRules.minSpecs}+ fields`, color:'rgba(255,255,255,0.7)' },
                  { icon:'🖼️', title:'Images',       val:`${selectedRules.images}+ photos`,  color:'rgba(255,255,255,0.7)' },
                  { icon:selectedRules.strict?'🔒':'✅', title:'Mode', val:selectedRules.strict?'STRICT':'Standard', color:selectedRules.strict?'#e74c3c':'#f39c12' },
                ].map((r,i)=>(
                  <div key={i} style={S.ruleCard}>
                    <span style={S.ruleIcon}>{r.icon}</span>
                    <div>
                      <span style={S.ruleTitle}>{r.title}</span>
                      <span style={{...S.ruleVal,color:r.color}}>{r.val}</span>
                    </div>
                  </div>
                ))}
              </div>
              {selectedRules.strict && (
                <div style={S.strictWarn}>
                  ⚠️ Strict mode — products without full specifications are automatically rejected
                </div>
              )}
            </div>

            {/* Step 3 — Launch */}
            <div style={S.step}>
              <div style={S.stepHead}>
                <span style={S.stepNum}>3</span>
                <span style={S.stepLbl}>Launch</span>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button
                  style={{...S.launchBtn,...(searching?S.launchBtnBusy:{})}}
                  onClick={handleSearch} disabled={searching}>
                  {searching
                    ? <><span style={S.spinner}/>Searching {selectedInfo?.label}...</>
                    : <>⚡ Start Search — {selectedInfo?.label}</>
                  }
                </button>
                {searching && (
                  <button style={S.stopBtn} onClick={handleStop}>⏹ Stop</button>
                )}
              </div>
              <p style={S.launchNote}>
                Products matching your rules will be sent to Telegram @Husin_Intel_bot for approval.
              </p>
            </div>

            {/* Progress bar */}
            {searching && progress && (
              <div style={S.progressWrap}>
                <div style={S.progressBar}>
                  <div style={{...S.progressFill, width:`${progressPct}%`}} />
                </div>
                <div style={S.progressInfo}>
                  <span style={S.progressText}>
                    Query {progress.completed}/{progress.total} · {progressPct}%
                  </span>
                  <span style={S.progressText}>
                    ✅ {progress.accepted} found · ❌ {progress.rejected} rejected
                  </span>
                </div>
                {progress.currentQuery && (
                  <p style={S.currentQuery}>🔍 Searching: "{progress.currentQuery}"</p>
                )}
              </div>
            )}

            {/* Done message */}
            {searchDone && !searching && (
              <div style={S.msgSuccess}>
                ✅ Search complete! Check your Telegram @Husin_Intel_bot for products to approve.
              </div>
            )}

            {/* Error */}
            {searchErr && (
              <div style={S.msgError}>❌ {searchErr}</div>
            )}

            {/* Live log */}
            {searchLog.length > 0 && (
              <div style={S.logBox}>
                <p style={S.logTitle}>Live Search Log</p>
                {searchLog.map((line,i)=>(
                  <p key={i} style={{...S.logLine, opacity: i===0?1:0.5-i*0.03}}>
                    {i===0?'▶ ':' '}{line}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* ── INVENTORY SYNC PANEL ── */}
          <div style={S.panel}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
              <div>
                <h2 style={{...S.panelTitle,margin:0}}>🔄 Inventory Sync</h2>
                <p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.72rem',margin:'4px 0 0'}}>
                  Checks all live products against eBay — removes unavailable listings automatically
                </p>
              </div>
              <div style={{display:'flex',gap:8}}>
                {syncing && (
                  <button style={{...S.stopBtn,padding:'8px 14px',fontSize:'0.78rem'}}
                    onClick={handleSyncStop}>⏹ Stop</button>
                )}
                <button
                  style={{
                    ...S.launchBtn,
                    padding:'10px 20px',
                    fontSize:'0.82rem',
                    width:'auto',
                    ...(syncing ? S.launchBtnBusy : {}),
                  }}
                  onClick={handleSync} disabled={syncing}>
                  {syncing
                    ? <><span style={S.spinner}/>Syncing...</>
                    : '🔄 Run Sync Now'
                  }
                </button>
              </div>
            </div>

            {/* What sync does */}
            {!syncing && !syncDone && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8,marginBottom:12}}>
                {[
                  { icon:'🗑️', title:'Auto-Remove',  desc:'eBay listing ended or sold' },
                  { icon:'💰', title:'Price Updates', desc:'Source price changed >15%'  },
                  { icon:'📈', title:'Spike Guard',   desc:'Price spike >40% = remove'  },
                  { icon:'⏰', title:'Auto Schedule', desc:'Runs every 12h via GitHub'  },
                ].map((item,i) => (
                  <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:9,padding:'10px 12px'}}>
                    <span style={{fontSize:'1.1rem'}}>{item.icon}</span>
                    <span style={{display:'block',color:'rgba(255,255,255,0.7)',fontSize:'0.78rem',fontWeight:600,margin:'4px 0 2px'}}>{item.title}</span>
                    <span style={{color:'rgba(255,255,255,0.3)',fontSize:'0.68rem'}}>{item.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sync progress bar */}
            {syncing && syncProgress && (
              <div style={{background:'rgba(0,217,255,0.04)',border:'1px solid rgba(0,217,255,0.1)',borderRadius:12,padding:14,marginBottom:12}}>
                <div style={{height:5,background:'rgba(255,255,255,0.07)',borderRadius:4,overflow:'hidden',marginBottom:8}}>
                  <div style={{
                    height:'100%',
                    width:`${syncProgress.total>0 ? Math.round((syncProgress.completed/syncProgress.total)*100) : 0}%`,
                    background:'linear-gradient(90deg,#00d9ff,#0099bb)',
                    borderRadius:4,
                    transition:'width 0.5s ease',
                  }}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
                  <span style={{color:'rgba(255,255,255,0.55)',fontSize:'0.78rem'}}>
                    Product {syncProgress.completed}/{syncProgress.total}
                  </span>
                  <span style={{
                    color: syncProgress.result === 'removed'       ? '#e74c3c'
                         : syncProgress.result === 'price_updated' ? '#f39c12'
                         : '#2ecc71',
                    fontSize:'0.75rem',
                    fontWeight:600,
                  }}>
                    {syncProgress.result === 'removed'       ? '🗑️ Removed'
                     : syncProgress.result === 'price_updated' ? '💰 Price updated'
                     : syncProgress.result === 'unchanged'    ? '✅ OK'
                     : syncProgress.result === 'skipped'      ? '⏭️ Skipped'
                     : ''}
                  </span>
                </div>
                {syncProgress.productName && (
                  <p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.7rem',margin:'5px 0 0',fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    🔍 "{syncProgress.productName?.substring(0,55)}"
                  </p>
                )}
              </div>
            )}

            {/* Done message */}
            {syncDone && !syncing && (
              <div style={S.msgSuccess}>
                ✅ Sync complete! Check Telegram for removal/price update notifications.
              </div>
            )}

            {/* Error */}
            {syncErr && <div style={S.msgError}>❌ {syncErr}</div>}

            {/* Live sync log */}
            {syncLog.length > 0 && (
              <div style={{...S.logBox,maxHeight:140}}>
                <p style={S.logTitle}>Sync Log</p>
                {syncLog.map((line,i)=>(
                  <p key={i} style={{
                    ...S.logLine,
                    opacity: i===0?1:Math.max(0.2, 0.8-i*0.08),
                    color: line.includes('REMOVED') || line.includes('removed')
                      ? '#e74c3c'
                      : line.includes('updated') || line.includes('UPDATE')
                      ? '#f39c12'
                      : 'rgba(255,255,255,0.65)',
                  }}>
                    {i===0?'▶ ':' '}{line}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Sessions */}
          <div style={S.panel}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <h2 style={{...S.panelTitle,margin:0}}>📁 Search Sessions</h2>
              <button style={S.refreshBtn} onClick={()=>{loadSessions();loadStats()}}>↻ Refresh</button>
            </div>

            {sessions.length === 0 ? (
              <p style={S.emptyNote}>No sessions yet. Launch a search above.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {sessions.map((session,i)=>(
                  <div key={i} style={S.sessionCard}>
                    <div style={S.sessionHead}
                      onClick={()=>loadSessionProducts(session.sessionId||session.jobId)}>
                      <div>
                        <span style={S.sessionCats}>
                          {(session.categories||[session.selectedCategory]||['all']).join(', ')}
                        </span>
                        <span style={S.sessionTime}>
                          {new Date(session.startedAt||session.createdAt).toLocaleString('en-SA')}
                        </span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{color:'#2ecc71',fontSize:'0.8rem',fontWeight:700}}>
                          ✅ {session.accepted||0}
                        </span>
                        <span style={{color:'#e74c3c',fontSize:'0.8rem',fontWeight:700}}>
                          ❌ {session.rejected||0}
                        </span>
                        <span style={{
                          ...S.sessionStatusBadge,
                          background: session.status==='completed'?'rgba(46,204,113,0.1)':'rgba(243,156,18,0.1)',
                          color:      session.status==='completed'?'#2ecc71':'#f39c12',
                          border:     `1px solid ${session.status==='completed'?'rgba(46,204,113,0.2)':'rgba(243,156,18,0.2)'}`,
                        }}>
                          {session.status||'running'}
                        </span>
                        <span style={{color:'rgba(255,255,255,0.3)',fontSize:'0.75rem'}}>
                          {activeSession===(session.sessionId||session.jobId)?'▲':'▼'}
                        </span>
                      </div>
                    </div>

                    {activeSession===(session.sessionId||session.jobId) && (
                      <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:16}}>
                        {loadingProds ? (
                          <p style={S.emptyNote}>Loading...</p>
                        ) : sessionProds.length===0 ? (
                          <p style={S.emptyNote}>No products in this session.</p>
                        ) : (
                          <div style={S.prodGrid}>
                            {sessionProds.map((prod,j)=>(
                              <div key={j} style={S.prodCard}>
                                <div style={S.prodImgWrap}>
                                  {prod.image
                                    ? <img src={prod.image} alt={prod.name} style={S.prodImg}
                                        onError={e=>{e.target.style.display='none'}}/>
                                    : <div style={S.prodImgPh}>📦</div>
                                  }
                                </div>
                                <div style={S.prodInfo}>
                                  <p style={S.prodName}>{prod.name?.substring(0,55)}</p>
                                  <div style={S.prodMeta}>
                                    <span style={{...S.badge,background:'rgba(200,164,109,0.1)',color:'#c8a46d'}}>
                                      {prod.sellingPriceSAR?.toLocaleString()} SAR
                                    </span>
                                    <span style={{...S.badge,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.45)'}}>
                                      {prod.category}
                                    </span>
                                    {prod.qualityScore && (
                                      <span style={{
                                        ...S.badge,
                                        background:prod.qualityScore>=70?'rgba(46,204,113,0.1)':'rgba(243,156,18,0.1)',
                                        color:prod.qualityScore>=70?'#2ecc71':'#f39c12',
                                      }}>
                                        ⭐ {prod.qualityScore}
                                      </span>
                                    )}
                                  </div>
                                  {prod.status==='pending' && (
                                    <div style={{display:'flex',gap:8,marginTop:6}}>
                                      <button style={S.approveBtn}
                                        onClick={()=>handleDecide(prod.id,'approve')}>
                                        ✅ Approve
                                      </button>
                                      <button style={S.rejectBtn}
                                        onClick={()=>handleDecide(prod.id,'reject')}>
                                        ❌ Reject
                                      </button>
                                    </div>
                                  )}
                                  {prod.status==='live' && (
                                    <span style={{...S.badge,background:'rgba(46,204,113,0.1)',color:'#2ecc71',marginTop:6,display:'inline-block'}}>
                                      ✅ Live
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
        @keyframes progressPulse {
          0%,100% { opacity:1; } 50% { opacity:0.7; }
        }
        * { box-sizing:border-box; }
        input:focus,button:focus { outline:none; }
        input::placeholder { color:rgba(255,255,255,0.25); }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
      `}</style>
    </>
  )
}

const S = {
  loginPage:   { background:'#050608',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Roboto,system-ui,sans-serif' },
  loginCard:   { background:'#0f1117',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'48px 40px',maxWidth:420,width:'100%',textAlign:'center' },
  loginLogo:   { height:52,width:'auto',objectFit:'contain',marginBottom:20 },
  loginTitle:  { color:'#fff',fontSize:'1.5rem',fontWeight:700,margin:'0 0 6px' },
  loginSub:    { color:'rgba(255,255,255,0.35)',fontSize:'0.85rem',margin:'0 0 28px' },
  loginForm:   { display:'flex',flexDirection:'column',gap:12 },
  loginInput:  { background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'13px 16px',color:'#fff',fontSize:'0.95rem',fontFamily:'inherit' },
  loginErr:    { color:'#e74c3c',fontSize:'0.82rem',margin:0 },
  loginBtn:    { background:'linear-gradient(135deg,#00d9ff,#0099bb)',color:'#000',border:'none',borderRadius:10,padding:14,fontSize:'0.95rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit' },

  page:        { background:'#050608',minHeight:'100vh',fontFamily:'Roboto,system-ui,sans-serif',color:'#f4f5f7' },
  topBar:      { background:'rgba(15,17,23,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 24px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100 },
  topBarLeft:  { display:'flex',alignItems:'center',gap:12 },
  topLogo:     { height:32,width:'auto',objectFit:'contain' },
  topTitle:    { color:'#fff',fontWeight:700,fontSize:'0.9rem' },
  topBadge:    { background:'rgba(231,76,60,0.12)',border:'1px solid rgba(231,76,60,0.25)',color:'#e74c3c',padding:'2px 8px',borderRadius:20,fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.1em' },
  topBarRight: { display:'flex',alignItems:'center',gap:10 },
  topLink:     { color:'rgba(255,255,255,0.6)',textDecoration:'none',fontSize:'0.82rem',padding:'6px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7 },
  topLogout:   { background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'rgba(255,255,255,0.4)',padding:'6px 12px',fontSize:'0.78rem',cursor:'pointer',fontFamily:'inherit' },

  layout:      { maxWidth:1200,margin:'0 auto',padding:'24px 24px 60px',display:'flex',flexDirection:'column',gap:20 },
  statsRow:    { display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 },
  statCard:    { background:'#0f1117',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'18px 20px',display:'flex',flexDirection:'column',gap:4 },
  statVal:     { fontSize:'1.8rem',fontWeight:700,lineHeight:1 },
  statLabel:   { color:'rgba(255,255,255,0.4)',fontSize:'0.75rem' },

  panel:       { background:'#0f1117',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:28 },
  panelTitle:  { color:'#fff',fontSize:'1rem',fontWeight:700,margin:'0 0 20px' },

  step:        { marginBottom:22 },
  stepHead:    { display:'flex',alignItems:'center',gap:10,marginBottom:12 },
  stepNum:     { width:28,height:28,borderRadius:'50%',background:'rgba(0,217,255,0.1)',border:'1px solid rgba(0,217,255,0.25)',color:'#00d9ff',fontSize:'0.78rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  stepLbl:     { color:'rgba(255,255,255,0.7)',fontSize:'0.85rem',fontWeight:600 },

  catGrid:     { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:8 },
  catBtn:      { background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 13px',cursor:'pointer',fontFamily:'inherit',textAlign:'left',display:'flex',flexDirection:'column',gap:3,transition:'all 0.15s' },
  catBtnOn:    { background:'rgba(0,217,255,0.08)',border:'1px solid rgba(0,217,255,0.3)' },
  catBtnLabel: { color:'#fff',fontSize:'0.82rem',fontWeight:600 },
  catBtnDesc:  { color:'rgba(255,255,255,0.32)',fontSize:'0.65rem',lineHeight:1.4 },

  rulesRow:    { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8,marginBottom:10 },
  ruleCard:    { background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:9,padding:'11px 13px',display:'flex',alignItems:'flex-start',gap:10 },
  ruleIcon:    { fontSize:'1.1rem',flexShrink:0,marginTop:1 },
  ruleTitle:   { display:'block',color:'rgba(255,255,255,0.38)',fontSize:'0.63rem',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3 },
  ruleVal:     { display:'block',fontSize:'0.8rem',fontWeight:600 },
  strictWarn:  { background:'rgba(231,76,60,0.07)',border:'1px solid rgba(231,76,60,0.18)',borderRadius:8,padding:'10px 14px',color:'rgba(255,255,255,0.55)',fontSize:'0.78rem',lineHeight:1.6 },

  launchBtn:   { display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'linear-gradient(135deg,#00d9ff,#0099bb)',color:'#000',border:'none',borderRadius:11,padding:'15px 28px',fontSize:'0.95rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'opacity 0.2s' },
  launchBtnBusy:{ background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',cursor:'not-allowed' },
  stopBtn:     { background:'rgba(231,76,60,0.1)',border:'1px solid rgba(231,76,60,0.25)',color:'#e74c3c',borderRadius:11,padding:'15px 20px',fontSize:'0.88rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit' },
  launchNote:  { color:'rgba(255,255,255,0.28)',fontSize:'0.73rem',marginTop:10,lineHeight:1.6 },
  spinner:     { width:18,height:18,border:'2px solid rgba(0,0,0,0.2)',borderTopColor:'#000',borderRadius:'50%',animation:'dashSpin 0.7s linear infinite',flexShrink:0 },

  progressWrap:{ background:'rgba(0,217,255,0.04)',border:'1px solid rgba(0,217,255,0.12)',borderRadius:12,padding:16,marginTop:14 },
  progressBar: { height:6,background:'rgba(255,255,255,0.07)',borderRadius:6,overflow:'hidden',marginBottom:8 },
  progressFill:{ height:'100%',background:'linear-gradient(90deg,#00d9ff,#0099bb)',borderRadius:6,transition:'width 0.5s ease',animation:'progressPulse 2s ease-in-out infinite' },
  progressInfo:{ display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:6 },
  progressText:{ color:'rgba(255,255,255,0.55)',fontSize:'0.78rem' },
  currentQuery:{ color:'rgba(255,255,255,0.35)',fontSize:'0.72rem',margin:'6px 0 0',fontStyle:'italic' },

  msgSuccess:  { background:'rgba(46,204,113,0.08)',border:'1px solid rgba(46,204,113,0.2)',borderRadius:9,padding:'12px 16px',color:'#2ecc71',fontSize:'0.85rem',marginTop:14 },
  msgError:    { background:'rgba(231,76,60,0.08)',border:'1px solid rgba(231,76,60,0.2)',borderRadius:9,padding:'12px 16px',color:'#e74c3c',fontSize:'0.85rem',marginTop:14 },

  logBox:      { background:'#070a0f',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'12px 16px',marginTop:14,maxHeight:180,overflowY:'auto' },
  logTitle:    { color:'rgba(255,255,255,0.3)',fontSize:'0.63rem',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 8px' },
  logLine:     { color:'rgba(255,255,255,0.65)',fontSize:'0.75rem',margin:'0 0 4px',lineHeight:1.5,fontFamily:'monospace' },

  emptyNote:   { color:'rgba(255,255,255,0.25)',fontSize:'0.82rem',margin:0 },
  refreshBtn:  { background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'rgba(255,255,255,0.5)',padding:'6px 14px',fontSize:'0.78rem',cursor:'pointer',fontFamily:'inherit' },

  sessionCard: { background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:11,overflow:'hidden' },
  sessionHead: { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',cursor:'pointer',flexWrap:'wrap',gap:8 },
  sessionCats: { display:'block',color:'rgba(255,255,255,0.75)',fontSize:'0.82rem',fontWeight:600,textTransform:'capitalize',marginBottom:2 },
  sessionTime: { display:'block',color:'rgba(255,255,255,0.3)',fontSize:'0.7rem' },
  sessionStatusBadge: { padding:'2px 9px',borderRadius:20,fontSize:'0.63rem',fontWeight:700,letterSpacing:'0.06em' },

  prodGrid:    { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12 },
  prodCard:    { background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden',display:'flex',flexDirection:'column' },
  prodImgWrap: { height:120,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' },
  prodImg:     { width:'100%',height:'100%',objectFit:'contain',padding:6 },
  prodImgPh:   { fontSize:36,color:'rgba(0,0,0,0.15)' },
  prodInfo:    { padding:'10px 12px',display:'flex',flexDirection:'column',gap:5 },
  prodName:    { color:'rgba(255,255,255,0.8)',fontSize:'0.74rem',lineHeight:1.4,margin:0 },
  prodMeta:    { display:'flex',gap:5,flexWrap:'wrap' },
  badge:       { padding:'2px 7px',borderRadius:5,fontSize:'0.63rem',fontWeight:600 },
  approveBtn:  { flex:1,background:'rgba(46,204,113,0.12)',border:'1px solid rgba(46,204,113,0.25)',color:'#2ecc71',borderRadius:7,padding:7,fontSize:'0.72rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit' },
  rejectBtn:   { flex:1,background:'rgba(231,76,60,0.08)',border:'1px solid rgba(231,76,60,0.2)',color:'#e74c3c',borderRadius:7,padding:7,fontSize:'0.72rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit' },
}
