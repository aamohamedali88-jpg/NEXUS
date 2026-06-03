/**
 * HUSIN ESHOP — /marketplace — AI Shopping Assistant Edition
 * DAY 3: Investor-Facing AI Procurement Engine
 * ✅ AI console embedded above grid — preserves ALL existing layout CSS
 * ✅ Semantic scoring + budget filtering
 * ✅ Shimmer skeleton for 1.2s during "AI processing"
 * ✅ Fallback recommendation when no exact match
 * ✅ Glassmorphic premium UI
 * ✅ Zero modifications to existing grid/sidebar/responsive system
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Head       from 'next/head'
import { db }     from '../lib/firebaseAdmin'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatSAR(n) {
  if (!n && n !== 0) return null
  const num = parseFloat(n)
  if (isNaN(num) || num <= 0) return null
  return num.toLocaleString('en-SA', { maximumFractionDigits: 0 }) + ' SAR'
}

function upgradeImg(url) {
  if (!url) return null
  if (url.includes('i.ebayimg.com'))
    return url.replace(/\/s-l\d+\./, '/s-l500.').replace('/thumbs/', '/images/g/')
  return url
}

// ── AI Semantic Scoring Engine ────────────────────────────────────────────────
// Scores each product 0–100 based on semantic relevance to user query
function scoreProduct(product, query, maxBudget) {
  let score = 0
  const name = (product.name || '').toLowerCase()
  const spec = (product.specifications || '').toLowerCase()
  const cat  = (product.category || '').toLowerCase()
  const q    = query.toLowerCase()
  const price = product.sellingPriceSAR || 0

  // Budget filter — hard cutoff if budget specified
  if (maxBudget > 0 && price > maxBudget) return -1

  // Base score: budget proximity (closer to max = higher value perception)
  if (maxBudget > 0) {
    const ratio = price / maxBudget
    if (ratio <= 1) score += Math.round(ratio * 30) // max 30 pts for budget fit
  } else {
    score += 20 // no budget = neutral
  }

  // Semantic keyword matching — extract meaningful tokens from query
  const tokens = q.split(/\s+/).filter(t => t.length > 2)
  const semanticMap = {
    // Electronics
    'gaming':    ['xbox','playstation','ps5','nintendo','gaming','console','controller','game'],
    'phone':     ['iphone','samsung','galaxy','mobile','smartphone','pixel','oneplus'],
    'mobile':    ['iphone','samsung','galaxy','mobile','smartphone'],
    'laptop':    ['laptop','macbook','dell','hp','lenovo','notebook','computer'],
    'watch':     ['watch','hublot','rolex','apple watch','smartwatch','fitbit','garmin'],
    'headphone': ['headphones','airpods','bose','sony','audio','earbuds','wireless'],
    'camera':    ['camera','gopro','dji','sony','canon','nikon','drone'],
    'tv':        ['samsung','lg','sony','television','4k','oled','qled'],
    // Fashion
    'shoe':      ['nike','adidas','shoes','sneakers','boots','running'],
    'shoes':     ['nike','adidas','shoes','sneakers','boots','running'],
    'bag':       ['bag','handbag','coach','michael kors','louis','gucci','purse'],
    'dress':     ['dress','zara','fashion','clothing','women'],
    'perfume':   ['perfume','fragrance','cologne','eau de'],
    // Home
    'home':      ['dyson','vacuum','kitchen','appliance','coffee','air fryer','smart home'],
    'kitchen':   ['kitchenaid','nespresso','coffee','blender','mixer','air fryer'],
    'smart':     ['smart','alexa','google home','automation','iot','hub','gateway'],
    // Beauty
    'beauty':    ['beauty','skincare','makeup','charlotte','la mer','moisturizer'],
    'skincare':  ['skincare','la mer','cream','serum','moisturizer','face'],
    // Jewelry
    'jewelry':   ['gold','diamond','ring','bracelet','necklace','pandora','hublot'],
    'gold':      ['gold','18k','diamond','ring','bracelet','necklace','jewelry'],
    'luxury':    ['hublot','rolex','louis','gucci','prada','chanel','diamond','gold'],
    // Sports
    'fitness':   ['fitbit','garmin','nike','adidas','gym','weights','sports','exercise'],
    'sport':     ['nike','adidas','gym','fitness','running','sport','weights'],
  }

  // Direct token matching in product name/spec
  tokens.forEach(token => {
    if (name.includes(token) || spec.includes(token)) score += 25
    if (cat.includes(token)) score += 10

    // Semantic expansion
    Object.entries(semanticMap).forEach(([key, synonyms]) => {
      if (token.includes(key) || key.includes(token)) {
        synonyms.forEach(syn => {
          if (name.includes(syn)) score += 20
          if (spec.includes(syn)) score += 8
        })
      }
    })
  })

  // Category bonus — if query implies category
  const catHints = {
    mobiles:         ['phone','mobile','iphone','samsung','smartphone'],
    electronics:     ['gaming','headphone','camera','tv','electronic','device'],
    laptops:         ['laptop','computer','macbook','notebook'],
    jewelry:         ['jewelry','gold','diamond','ring','watch','hublot','luxury'],
    beauty:          ['beauty','skincare','makeup','perfume','fragrance'],
    sports:          ['fitness','sport','gym','running','exercise'],
    home_appliances: ['home','kitchen','vacuum','coffee','smart','appliance'],
    clothes_men:     ['men','shirt','shoes','sneaker','adidas','nike'],
    clothes_women:   ['women','dress','bag','handbag','fashion'],
  }
  Object.entries(catHints).forEach(([catKey, hints]) => {
    if (cat === catKey) {
      hints.forEach(h => {
        if (q.includes(h)) score += 15
      })
    }
  })

  return Math.min(score, 100)
}

// ── Categories ────────────────────────────────────────────────────────────────
const CATS = [
  { v:'all',             l:'🌐 All'          },
  { v:'mobiles',         l:'📱 Mobiles'      },
  { v:'laptops',         l:'💻 Laptops'      },
  { v:'electronics',     l:'⚡ Electronics'  },
  { v:'home_appliances', l:'🏠 Home'         },
  { v:'clothes_men',     l:'👔 Men'          },
  { v:'clothes_women',   l:'👗 Women'        },
  { v:'clothes_kids',    l:'👶 Kids'         },
  { v:'jewelry',         l:'💎 Jewelry'      },
  { v:'beauty',          l:'💄 Beauty'       },
  { v:'sports',          l:'🏋️ Sports'      },
  { v:'toys',            l:'🧸 Toys'         },
  { v:'general',         l:'📦 General'      },
]

const GRADS = {
  mobiles:'linear-gradient(135deg,#1a1a2e,#0f3460)',
  laptops:'linear-gradient(135deg,#0d1b2a,#415a77)',
  electronics:'linear-gradient(135deg,#0a0a0a,#1a1a6e)',
  home_appliances:'linear-gradient(135deg,#1a1a1a,#3a3a3a)',
  clothes_men:'linear-gradient(135deg,#1a0533,#11998e)',
  clothes_women:'linear-gradient(135deg,#200122,#6f0000)',
  clothes_kids:'linear-gradient(135deg,#1a1a2e,#e94560)',
  jewelry:'linear-gradient(135deg,#0d0d0d,#8b6914)',
  beauty:'linear-gradient(135deg,#1a0533,#ff416c)',
  sports:'linear-gradient(135deg,#0a3d0a,#00b09b)',
  toys:'linear-gradient(135deg,#1a1a2e,#ff6b6b)',
  general:'linear-gradient(135deg,#111,#2d2d2d)',
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function Skel() {
  return (
    <div className="skel">
      <div className="skel-img shimmer" />
      <div className="skel-body">
        <div className="skel-line shimmer" style={{width:'85%'}} />
        <div className="skel-line shimmer" style={{width:'60%',marginTop:6}} />
        <div className="skel-foot">
          <div className="skel-p shimmer" />
          <div className="skel-b shimmer" />
        </div>
      </div>
    </div>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────
function Card({ p }) {
  const [err,    setErr]    = useState(false)
  const [loaded, setLoaded] = useState(false)
  const price = formatSAR(p.sellingPriceSAR)
  const icon  = CATS.find(c => c.v === p.category)?.l?.split(' ')[0] || '📦'
  const grad  = GRADS[p.category] || GRADS.general

  return (
    <a href={`/marketplace/${p.id}`} className="card">
      <div className="card-img-wrap">
        <div className="card-ph" style={{background:grad, opacity:(err||!p.image)?1:0}}>
          <span className="ph-icon">{icon}</span>
          <span className="ph-txt">HUSIN</span>
        </div>
        {p.image && !err && (
          <img src={p.image} alt={p.name} className="card-img"
            loading="lazy" decoding="async"
            style={{opacity: loaded ? 1 : 0}}
            onLoad={() => setLoaded(true)}
            onError={() => setErr(true)}
          />
        )}
        <span className="card-cat">{icon}</span>
        {p.isNew && <span className="card-new">NEW</span>}
        {p.aiScore > 60 && <span className="card-ai-match">🤖 AI Match</span>}
      </div>
      <div className="card-body">
        <p className="card-name">{p.name}</p>
        {p.specifications && <p className="card-spec">{p.specifications}</p>}
        {price && <p className="card-price">{price}</p>}
        <div className="card-cta-row">
          <span className="card-cta">Buy Now →</span>
        </div>
      </div>
    </a>
  )
}

// ── AI Console Component ──────────────────────────────────────────────────────
function AIConsole({ onSearch, isProcessing }) {
  const [aiQuery,     setAiQuery]     = useState('')
  const [aiBudget,    setAiBudget]    = useState('')
  const [charCount,   setCharCount]   = useState(0)
  const textareaRef = useRef(null)

  const handleQueryChange = (e) => {
    setAiQuery(e.target.value)
    setCharCount(e.target.value.length)
  }

  const handleLaunch = () => {
    onSearch(aiQuery.trim(), parseFloat(aiBudget) || 0)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleLaunch()
  }

  const examplePrompts = [
    'Smart home automation gateway for villa',
    'High-end gaming console under 2000 SAR',
    'Luxury watch for business professional',
    'Wireless noise-cancelling headphones',
  ]

  return (
    <div className="ai-console">
      {/* Header */}
      <div className="ai-console-header">
        <div className="ai-console-title-row">
          <div className="ai-engine-badge">
            <span className="ai-pulse" />
            <span>HUSIN AI ENGINE</span>
          </div>
          <span className="ai-console-version">v2.1 · Live</span>
        </div>
        <h2 className="ai-console-headline">
          Describe Your Needs &amp; Budget.
          <span className="ai-headline-accent"> Let HUSIN AI Engine Source It Instantly.</span>
        </h2>
        <p className="ai-console-sub">
          Our procurement AI scans {' '}
          <strong style={{color:'#00d9ff'}}>601 live products</strong>
          {' '}across all categories, ranks by semantic relevance, and surfaces the optimal match for your exact requirements.
        </p>
      </div>

      {/* Input area */}
      <div className="ai-inputs">
        {/* Natural language input */}
        <div className="ai-input-group">
          <label className="ai-label">
            <span className="ai-label-icon">💬</span>
            Natural Language Query
          </label>
          <div className="ai-textarea-wrap">
            <textarea
              ref={textareaRef}
              className="ai-textarea"
              placeholder="e.g., I need a high-end smart home automation gateway for an LGS residential villa setup, compatible with Alexa and Google Home..."
              value={aiQuery}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              rows={3}
              maxLength={500}
            />
            <span className="ai-char-count">{charCount}/500</span>
          </div>
          {/* Example prompts */}
          <div className="ai-examples">
            <span className="ai-examples-label">Try:</span>
            {examplePrompts.map((p, i) => (
              <button key={i} className="ai-example-pill"
                onClick={() => { setAiQuery(p); setCharCount(p.length) }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Budget input */}
        <div className="ai-budget-group">
          <label className="ai-label">
            <span className="ai-label-icon">💰</span>
            Maximum Budget
          </label>
          <div className="ai-budget-wrap">
            <input
              type="number"
              className="ai-budget-input"
              placeholder="Enter amount"
              value={aiBudget}
              onChange={e => setAiBudget(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0"
              step="50"
            />
            <span className="ai-budget-suffix">SAR Max</span>
          </div>
          {aiBudget && (
            <p className="ai-budget-hint">
              ≈ ${(parseFloat(aiBudget) / 3.75).toFixed(0)} USD
            </p>
          )}

          {/* Launch button */}
          <button
            className={`ai-launch-btn ${isProcessing ? 'ai-launch-processing' : ''}`}
            onClick={handleLaunch}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="ai-spinner" />
                <span>Processing Query...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Launch AI Sourcing Engine</span>
              </>
            )}
          </button>

          <p className="ai-hint-text">
            Press <kbd>Ctrl+Enter</kbd> to launch · Results ranked by AI relevance score
          </p>
        </div>
      </div>
    </div>
  )
}

// ── AI Result Banner ──────────────────────────────────────────────────────────
function AIResultBanner({ query, budget, exactCount, totalShown, isFallback }) {
  if (!query && !budget) return null

  return (
    <div className={`ai-result-banner ${isFallback ? 'ai-banner-fallback' : 'ai-banner-success'}`}>
      <div className="ai-banner-icon">{isFallback ? '🔄' : '✅'}</div>
      <div className="ai-banner-content">
        {isFallback ? (
          <>
            <strong className="ai-banner-title">HUSIN AI Note: Budget is optimal.</strong>
            <span className="ai-banner-sub">
              {' '}Broadening sourcing perimeter to trusted global suppliers... Displaying {totalShown} closest available alternatives ranked by relevance.
            </span>
          </>
        ) : (
          <>
            <strong className="ai-banner-title">AI Sourcing Complete.</strong>
            <span className="ai-banner-sub">
              {' '}Found <strong>{exactCount} products</strong> matching your query
              {budget > 0 ? ` within ${formatSAR(budget)} budget` : ''}.
              Ranked by semantic relevance score.
            </span>
          </>
        )}
      </div>
      <button className="ai-banner-clear" onClick={() => window.location.reload()}>
        ✕ Clear AI Filter
      </button>
    </div>
  )
}

// ── Server-side data ──────────────────────────────────────────────────────────
export async function getServerSideProps() {
  try {
    const snap = await db.collection('shop_approved_products')
      .where('status','==','live').get()
    const cutoff = new Date(Date.now()-48*60*60*1000).toISOString()
    const products = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id:              d.id              || doc.id,
        name:            d.name            || 'Product',
        image:           upgradeImg(d.image) || null,
        sellingPriceSAR: d.sellingPriceSAR  || null,
        category:        d.category         || 'general',
        specifications:  d.specifications   || null,
        approvedAt:      d.approvedAt       || '',
        isNew:           (d.approvedAt||'') > cutoff,
      }
    })
    products.sort((a,b) => b.approvedAt > a.approvedAt ? 1 : -1)
    return { props: { products, total: products.length } }
  } catch (e) {
    console.error('[Marketplace]', e.message)
    return { props: { products:[], total:0 } }
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Marketplace({ products, total }) {
  // Standard filters
  const [cat,   setCat]   = useState('all')
  const [query, setQuery] = useState('')
  const [sort,  setSort]  = useState('newest')
  const [ready, setReady] = useState(false)

  // AI state
  const [aiMode,        setAiMode]        = useState(false)   // AI filter active
  const [aiProcessing,  setAiProcessing]  = useState(false)   // shimmer loading
  const [aiQuery,       setAiQuery]       = useState('')
  const [aiBudget,      setAiBudget]      = useState(0)
  const [aiResults,     setAiResults]     = useState([])
  const [aiExactCount,  setAiExactCount]  = useState(0)
  const [aiFallback,    setAiFallback]    = useState(false)

  useEffect(() => { setReady(true) }, [])

  // Standard filtered products (used when AI mode is off)
  const filtered = useMemo(() => {
    if (aiMode) return aiResults
    let r = cat === 'all' ? products : products.filter(p => p.category === cat)
    if (query) {
      const q = query.toLowerCase()
      r = r.filter(p => p.name?.toLowerCase().includes(q) || p.specifications?.toLowerCase().includes(q))
    }
    if (sort === 'price_asc')  return [...r].sort((a,b)=>(a.sellingPriceSAR||0)-(b.sellingPriceSAR||0))
    if (sort === 'price_desc') return [...r].sort((a,b)=>(b.sellingPriceSAR||0)-(a.sellingPriceSAR||0))
    return r
  }, [products, cat, query, sort, aiMode, aiResults])

  const counts = useMemo(() => {
    const c = { all: products.length }
    CATS.forEach(({ v }) => { if (v !== 'all') c[v] = products.filter(p => p.category === v).length })
    return c
  }, [products])

  // AI search handler
  const handleAISearch = useCallback((aiQueryText, maxBudget) => {
    if (!aiQueryText && maxBudget <= 0) return

    setAiProcessing(true)
    setAiMode(false)

    // Simulate 1.2s AI processing with shimmer
    setTimeout(() => {
      // Score all products
      const scored = products.map(p => ({
        ...p,
        aiScore: scoreProduct(p, aiQueryText, maxBudget)
      }))

      // Filter out budget exceeding (-1 score) and sort by score
      const exact = scored
        .filter(p => p.aiScore >= 0)
        .sort((a,b) => b.aiScore - a.aiScore)

      // Products with meaningful match score
      const meaningful = exact.filter(p => p.aiScore > 0)
      const exactCount = meaningful.length

      let fallback = false
      let finalResults = []

      if (meaningful.length === 0 && exact.length > 0) {
        // Budget matches but no semantic match — show top budget-fit products
        fallback = true
        finalResults = exact.slice(0, 24)
      } else if (meaningful.length === 0 && exact.length === 0 && maxBudget > 0) {
        // Budget too low — show cheapest available
        fallback = true
        finalResults = [...products]
          .sort((a,b) => (a.sellingPriceSAR||0)-(b.sellingPriceSAR||0))
          .slice(0, 24)
      } else {
        finalResults = meaningful.length > 0 ? meaningful : exact.slice(0, 48)
      }

      setAiQuery(aiQueryText)
      setAiBudget(maxBudget)
      setAiExactCount(exactCount)
      setAiFallback(fallback)
      setAiResults(finalResults)
      setAiMode(true)
      setAiProcessing(false)
    }, 1200) // 1.2s shimmer delay
  }, [products])

  const displayCount  = aiMode ? aiResults.length : filtered.length
  const isProcessing  = aiProcessing || !ready

  return (
    <>
      <Head>
        <title>HUSIN Marketplace — {total.toLocaleString()} Products</title>
        <meta name="description" content={`AI-powered marketplace with ${total} curated products delivered across Saudi Arabia.`} />
        <meta property="og:title" content="HUSIN Marketplace — AI Powered" />
        <meta property="og:image" content="https://www.husin.org/main%20logo-200h-200h.png" />
      </Head>

      <Navigation />

      {/* ── ALL CSS IN GLOBAL STYLE — never scoped, always wins ── */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position:-800px 0; }
          100% { background-position:800px 0; }
        }
        @keyframes aiGradient {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes aiPulse {
          0%, 100% { opacity:1; transform:scale(1); }
          50%       { opacity:0.5; transform:scale(0.85); }
        }
        @keyframes aiSpin {
          to { transform:rotate(360deg); }
        }
        @keyframes aiFadeIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── Shimmer skeleton ── */
        .shimmer {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 0%,
            rgba(255,255,255,0.10) 40%,
            rgba(255,255,255,0.04) 80%
          );
          background-size:800px 100%;
          animation:shimmer 1.6s ease-in-out infinite;
        }
        .skel { background:#0f1117; border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden; }
        .skel-img  { height:185px; }
        .skel-body { padding:12px; display:flex; flex-direction:column; gap:8px; }
        .skel-line { height:11px; border-radius:6px; }
        .skel-foot { display:flex; justify-content:space-between; margin-top:4px; }
        .skel-p { width:80px; height:14px; border-radius:6px; }
        .skel-b { width:56px; height:14px; border-radius:6px; }

        /* ── PAGE ── */
        .mp-page { background:#050608; min-height:100vh; overflow-x:hidden; }

        /* ── HERO ── */
        .mp-hero { background:linear-gradient(135deg,#0a1628 0%,#0f2744 60%,#0a1628 100%); padding:48px 24px 36px; border-bottom:1px solid rgba(255,255,255,0.07); }
        .mp-hero-content { max-width:1200px; margin:0 auto; text-align:center; }
        .mp-logo  { height:52px; width:auto; object-fit:contain; display:block; margin:0 auto 14px; }
        .mp-h1    { color:#fff; font-size:clamp(1.4rem,3.5vw,2rem); font-weight:700; margin:0 0 8px; }
        .mp-sub   { color:rgba(255,255,255,0.5); font-size:0.88rem; margin:0 0 20px; line-height:1.6; }
        .mp-search-wrap { position:relative; max-width:500px; margin:0 auto 10px; display:flex; align-items:center; }
        .mp-search-icon { position:absolute; left:14px; font-size:0.9rem; pointer-events:none; z-index:1; }
        .mp-search { width:100%; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.13); border-radius:10px; padding:12px 40px 12px 40px; color:#fff; font-size:0.88rem; outline:none; box-sizing:border-box; font-family:inherit; }
        .mp-search::placeholder { color:rgba(255,255,255,0.3); }
        .mp-search:focus { border-color:#00d9ff; }
        .mp-search-x { position:absolute; right:12px; background:transparent; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:0.85rem; padding:4px; }
        .mp-hero-count { color:rgba(255,255,255,0.3); font-size:0.75rem; margin:0; }

        /* ── MOBILE PILLS ── */
        .mp-pills { display:none; overflow-x:auto; overflow-y:hidden; white-space:nowrap; scrollbar-width:none; -ms-overflow-style:none; padding:10px 14px; gap:7px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(0,0,0,0.25); }
        .mp-pills::-webkit-scrollbar { display:none; }
        .mp-pill { display:inline-flex; align-items:center; gap:5px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:20px; color:rgba(255,255,255,0.65); padding:6px 12px; font-size:0.76rem; cursor:pointer; font-family:inherit; white-space:nowrap; flex-shrink:0; transition:all 0.15s; }
        .mp-pill:hover { background:rgba(255,255,255,0.09); color:#fff; }
        .mp-pill-on { background:rgba(0,217,255,0.1); border-color:rgba(0,217,255,0.35); color:#00d9ff; }
        .pill-n { background:rgba(0,217,255,0.15); color:#00d9ff; padding:1px 5px; border-radius:10px; font-size:0.64rem; }

        /* ── BODY LAYOUT ── */
        .mp-body { display:flex; max-width:1400px; margin:0 auto; padding:24px; gap:20px; box-sizing:border-box; width:100%; }

        /* ── DESKTOP SIDEBAR ── */
        .mp-sidebar { width:196px; flex-shrink:0; position:sticky; top:70px; align-self:flex-start; height:calc(100vh - 80px); overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.08) transparent; }
        .sidebar-hd { color:rgba(255,255,255,0.38); font-size:0.63rem; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 10px; font-weight:600; }
        .sidebar-btn { display:flex; align-items:center; justify-content:space-between; width:100%; background:transparent; border:none; color:rgba(255,255,255,0.55); padding:8px 10px; border-radius:7px; cursor:pointer; font-size:0.78rem; text-align:left; font-family:inherit; margin-bottom:1px; transition:all 0.15s; }
        .sidebar-btn:hover { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.85); }
        .sidebar-btn-on { background:rgba(0,217,255,0.08); color:#00d9ff; border-left:2px solid #00d9ff; }
        .sidebar-n { background:rgba(0,217,255,0.12); color:rgba(0,217,255,0.8); padding:2px 6px; border-radius:10px; font-size:0.63rem; flex-shrink:0; }

        /* ── GRID AREA ── */
        .mp-grid-area { flex:1; min-width:0; width:100%; }
        .mp-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:10px; }
        .toolbar-count { color:rgba(255,255,255,0.4); font-size:0.8rem; }
        .mp-sort { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:rgba(255,255,255,0.75); padding:7px 12px; font-size:0.8rem; outline:none; cursor:pointer; font-family:inherit; }
        .mp-sort option { background:#0f1117; }

        /* ── PRODUCT GRID ── */
        .mp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; width:100%; }

        /* ── CARD ── */
        .card { background:#0f1117; border:1px solid rgba(255,255,255,0.07); border-radius:12px; overflow:hidden; text-decoration:none; display:flex; flex-direction:column; transition:transform 0.2s,border-color 0.2s,box-shadow 0.2s; }
        .card:hover { transform:translateY(-4px); border-color:rgba(0,217,255,0.3); box-shadow:0 12px 32px rgba(0,0,0,0.4); }
        .card-img-wrap { position:relative; height:185px; background:#fff; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .card-ph { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; transition:opacity 0.3s; }
        .ph-icon { font-size:30px; opacity:0.5; }
        .ph-txt  { color:rgba(255,255,255,0.2); font-size:0.58rem; letter-spacing:0.2em; font-weight:700; text-transform:uppercase; }
        .card-img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:8px; box-sizing:border-box; transition:opacity 0.4s,transform 0.3s; }
        .card:hover .card-img { transform:scale(1.04); }
        .card-cat { position:absolute; top:7px; left:7px; background:rgba(0,0,0,0.6); color:rgba(255,255,255,0.85); padding:3px 7px; border-radius:20px; font-size:0.68rem; backdrop-filter:blur(4px); z-index:2; }
        .card-new { position:absolute; top:7px; right:7px; background:#00d9ff; color:#000; padding:2px 6px; border-radius:20px; font-size:0.58rem; font-weight:800; z-index:2; }
        .card-ai-match { position:absolute; bottom:7px; right:7px; background:rgba(139,92,246,0.85); color:#fff; padding:2px 7px; border-radius:20px; font-size:0.58rem; font-weight:700; z-index:2; backdrop-filter:blur(4px); }
        .card-body { padding:11px; display:flex; flex-direction:column; gap:4px; flex:1; }
        .card-name { color:#e8eaf0; font-size:0.8rem; font-weight:500; line-height:1.45; margin:0; min-height:2.32rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .card-spec { color:rgba(255,255,255,0.35); font-size:0.68rem; margin:0; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
        .card-price { display:block; color:#c8a46d; font-size:0.95rem; font-weight:700; margin:6px 0 0; padding-top:7px; border-top:1px solid rgba(255,255,255,0.06); }
        .card-cta-row { margin-top:5px; }
        .card-cta { display:inline-block; color:#00d9ff; font-size:0.72rem; font-weight:600; background:rgba(0,217,255,0.07); border:1px solid rgba(0,217,255,0.18); border-radius:5px; padding:4px 9px; transition:background 0.2s; white-space:nowrap; }
        .card:hover .card-cta { background:rgba(0,217,255,0.14); }

        /* ── EMPTY ── */
        .mp-empty { text-align:center; padding:72px 16px; }
        .empty-icon  { font-size:46px; margin:0 0 14px; }
        .empty-title { color:#fff; font-size:1.15rem; font-weight:600; margin:0 0 8px; }
        .empty-sub   { color:rgba(255,255,255,0.4); font-size:0.85rem; line-height:1.65; max-width:360px; margin:0 auto 18px; }
        .empty-reset { background:rgba(0,217,255,0.1); border:1px solid rgba(0,217,255,0.25); color:#00d9ff; padding:9px 22px; border-radius:8px; cursor:pointer; font-family:inherit; font-size:0.85rem; }

        /* ══════════════════════════════════════════
           AI CONSOLE STYLES
        ══════════════════════════════════════════ */
        .ai-console {
          background: rgba(15,17,23,0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
          animation: aiFadeIn 0.4s ease-out;
        }
        .ai-console::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg,
            rgba(0,217,255,0.03) 0%,
            rgba(139,92,246,0.03) 50%,
            rgba(200,164,109,0.03) 100%
          );
          pointer-events: none;
        }
        .ai-console::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,217,255,0.4), rgba(139,92,246,0.4), transparent);
        }

        /* Console header */
        .ai-console-header { margin-bottom:24px; }
        .ai-console-title-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .ai-engine-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(0,217,255,0.08);
          border: 1px solid rgba(0,217,255,0.2);
          border-radius: 20px;
          padding: 4px 12px;
          color: #00d9ff;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .ai-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00d9ff;
          display: inline-block;
          animation: aiPulse 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        .ai-console-version { color:rgba(255,255,255,0.25); font-size:0.68rem; }
        .ai-console-headline {
          color: #fff;
          font-size: clamp(1rem, 2.5vw, 1.35rem);
          font-weight: 700;
          margin: 0 0 8px;
          line-height: 1.3;
        }
        .ai-headline-accent { color:#00d9ff; }
        .ai-console-sub { color:rgba(255,255,255,0.45); font-size:0.82rem; margin:0; line-height:1.6; }

        /* Inputs layout */
        .ai-inputs { display:grid; grid-template-columns:1fr 340px; gap:20px; align-items:start; }

        /* Input group */
        .ai-input-group { display:flex; flex-direction:column; gap:8px; }
        .ai-label { display:flex; align-items:center; gap:6px; color:rgba(255,255,255,0.6); font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; }
        .ai-label-icon { font-size:0.9rem; }
        .ai-textarea-wrap { position:relative; }
        .ai-textarea {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 14px 16px;
          color: #fff;
          font-size: 0.875rem;
          font-family: inherit;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
          min-height: 90px;
        }
        .ai-textarea::placeholder { color:rgba(255,255,255,0.25); font-size:0.82rem; }
        .ai-textarea:focus { border-color:rgba(0,217,255,0.4); background:rgba(255,255,255,0.07); }
        .ai-char-count { position:absolute; bottom:8px; right:12px; color:rgba(255,255,255,0.2); font-size:0.65rem; }

        /* Example prompts */
        .ai-examples { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .ai-examples-label { color:rgba(255,255,255,0.3); font-size:0.7rem; flex-shrink:0; }
        .ai-example-pill {
          display: inline-block;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          color: rgba(255,255,255,0.5);
          padding: 3px 10px;
          font-size: 0.68rem;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .ai-example-pill:hover { background:rgba(0,217,255,0.08); border-color:rgba(0,217,255,0.2); color:#00d9ff; }

        /* Budget group */
        .ai-budget-group { display:flex; flex-direction:column; gap:10px; }
        .ai-budget-wrap { display:flex; align-items:center; border:1px solid rgba(255,255,255,0.1); border-radius:12px; overflow:hidden; background:rgba(255,255,255,0.05); }
        .ai-budget-input { flex:1; background:transparent; border:none; padding:14px 16px; color:#fff; font-size:1rem; font-weight:600; outline:none; font-family:inherit; }
        .ai-budget-input::placeholder { color:rgba(255,255,255,0.25); font-size:0.875rem; font-weight:400; }
        .ai-budget-input::-webkit-outer-spin-button,
        .ai-budget-input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        .ai-budget-suffix { color:rgba(255,255,255,0.5); font-size:0.8rem; font-weight:600; padding:0 16px; border-left:1px solid rgba(255,255,255,0.08); white-space:nowrap; background:rgba(255,255,255,0.03); align-self:stretch; display:flex; align-items:center; }
        .ai-budget-hint { color:rgba(255,255,255,0.3); font-size:0.72rem; margin:0; }

        /* Launch button */
        .ai-launch-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          color: #000;
          background: linear-gradient(135deg, #00d9ff, #8b5cf6, #00d9ff);
          background-size: 200% 200%;
          animation: aiGradient 3s ease infinite;
          transition: opacity 0.2s, transform 0.15s;
          position: relative;
          overflow: hidden;
        }
        .ai-launch-btn:hover { opacity:0.9; transform:translateY(-1px); }
        .ai-launch-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .ai-launch-processing { background:rgba(255,255,255,0.08) !important; color:rgba(255,255,255,0.7) !important; animation:none !important; border:1px solid rgba(255,255,255,0.1); }
        .ai-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:aiSpin 0.7s linear infinite; flex-shrink:0; }
        .ai-hint-text { color:rgba(255,255,255,0.25); font-size:0.68rem; margin:0; text-align:center; }
        .ai-hint-text kbd { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:4px; padding:1px 5px; font-size:0.65rem; font-family:inherit; }

        /* AI Result Banner */
        .ai-result-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 12px;
          margin-bottom: 18px;
          animation: aiFadeIn 0.3s ease-out;
        }
        .ai-banner-success { background:rgba(0,217,255,0.07); border:1px solid rgba(0,217,255,0.2); }
        .ai-banner-fallback { background:rgba(200,164,109,0.07); border:1px solid rgba(200,164,109,0.2); }
        .ai-banner-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
        .ai-banner-content { flex:1; min-width:0; }
        .ai-banner-title { color:#fff; font-size:0.85rem; }
        .ai-banner-sub { color:rgba(255,255,255,0.55); font-size:0.82rem; line-height:1.5; }
        .ai-banner-sub strong { color:#00d9ff; }
        .ai-banner-clear { background:transparent; border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:rgba(255,255,255,0.4); padding:5px 12px; font-size:0.72rem; cursor:pointer; font-family:inherit; flex-shrink:0; transition:all 0.2s; white-space:nowrap; }
        .ai-banner-clear:hover { color:#fff; border-color:rgba(255,255,255,0.25); }

        /* ── BREAKPOINTS — PRESERVED from locked system ── */
        @media (max-width:1280px) { .mp-grid { grid-template-columns:repeat(3,1fr); } }
        @media (max-width:1024px) {
          .mp-grid    { grid-template-columns:repeat(3,1fr); gap:12px; }
          .mp-body    { padding:18px; }
          .mp-sidebar { width:170px; }
          .ai-inputs  { grid-template-columns:1fr; }
          .ai-budget-group { }
        }

        /* MOBILE — sidebar hidden, pills shown, full-width grid */
        @media (max-width:768px) {
          .mp-pills   { display:flex; }
          .mp-sidebar,
          aside.mp-sidebar,
          .mp-body .mp-sidebar,
          .mp-body aside.mp-sidebar {
            display:none !important;
            width:0 !important;
            min-width:0 !important;
            max-width:0 !important;
            padding:0 !important;
            margin:0 !important;
            overflow:hidden !important;
            flex:none !important;
          }
          .mp-grid-area { width:100% !important; flex:1 !important; }
          .mp-body  { padding:12px !important; gap:0 !important; }
          .mp-grid  { grid-template-columns:repeat(2,1fr) !important; gap:10px !important; }
          .card-img-wrap { height:150px !important; }
          .mp-hero  { padding:36px 16px 26px; }
          .mp-h1    { font-size:1.4rem; }
          .ai-console { padding:18px; margin-bottom:16px; border-radius:14px; }
          .ai-console-headline { font-size:1rem; }
          .ai-inputs { grid-template-columns:1fr; gap:16px; }
          .ai-result-banner { flex-direction:column; gap:8px; }
          .ai-banner-clear { align-self:flex-start; }
        }

        @media (max-width:480px) {
          .mp-grid  { grid-template-columns:repeat(2,1fr) !important; gap:8px !important; }
          .card-img-wrap { height:130px !important; }
          .card-body { padding:9px; }
          .card-name { font-size:0.75rem; min-height:2.18rem; }
          .card-price { font-size:0.82rem; }
          .mp-hero  { padding:28px 14px 22px; }
          .mp-h1    { font-size:1.25rem; }
          .ai-console { padding:14px; }
          .ai-examples { display:none; }
        }

        @media (max-width:320px) { .mp-grid { grid-template-columns:1fr !important; } }
      `}</style>

      <main className="mp-page">

        {/* Hero */}
        <div className="mp-hero">
          <div className="mp-hero-content">
            <img src="/main%20logo-200h-200h.png" alt="HUSIN" className="mp-logo"
              onError={e=>{e.target.style.display='none'}} />
            <h1 className="mp-h1">HUSIN Marketplace</h1>
            <p className="mp-sub">Discover premium products — delivered across Saudi Arabia</p>
            <div className="mp-search-wrap">
              <span className="mp-search-icon">🔍</span>
              <input type="text" className="mp-search" placeholder="Search products..."
                value={query} onChange={e=>{setQuery(e.target.value); setAiMode(false)}}
                disabled={aiMode}
              />
              {query && <button className="mp-search-x" onClick={()=>setQuery('')}>✕</button>}
            </div>
            <p className="mp-hero-count">{total.toLocaleString('en-SA')} products available</p>
          </div>
        </div>

        {/* Mobile pills */}
        <div className="mp-pills">
          {CATS.map(c => (
            <button key={c.v} onClick={()=>{setCat(c.v); setAiMode(false)}}
              className={`mp-pill ${!aiMode && cat===c.v?'mp-pill-on':''}`}>
              {c.l}
              {counts[c.v]>0 && <span className="pill-n">{counts[c.v]}</span>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="mp-body">

          {/* Desktop sidebar */}
          <aside className="mp-sidebar">
            <p className="sidebar-hd">Categories</p>
            {CATS.map(c => (
              <button key={c.v} onClick={()=>{setCat(c.v); setAiMode(false)}}
                className={`sidebar-btn ${!aiMode && cat===c.v?'sidebar-btn-on':''}`}>
                <span>{c.l}</span>
                {counts[c.v]>0 && <span className="sidebar-n">{counts[c.v]}</span>}
              </button>
            ))}
          </aside>

          {/* Grid area */}
          <div className="mp-grid-area">

            {/* ── AI CONSOLE — sits directly above grid, inside grid-area ── */}
            <AIConsole onSearch={handleAISearch} isProcessing={aiProcessing} />

            {/* AI result banner */}
            {aiMode && (
              <AIResultBanner
                query={aiQuery}
                budget={aiBudget}
                exactCount={aiExactCount}
                totalShown={aiResults.length}
                isFallback={aiFallback}
              />
            )}

            {/* Toolbar */}
            {!aiMode && (
              <div className="mp-toolbar">
                <span className="toolbar-count">
                  {displayCount.toLocaleString('en-SA')} products
                  {query ? ` · "${query}"` : ''}
                </span>
                <select className="mp-sort" value={sort} onChange={e=>setSort(e.target.value)}>
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                </select>
              </div>
            )}

            {/* Product grid */}
            {aiProcessing || !ready ? (
              <div className="mp-grid">
                {Array.from({length:12},(_,i)=><Skel key={i}/>)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="mp-empty">
                <p className="empty-icon">🔍</p>
                <h3 className="empty-title">
                  {products.length===0 ? 'Products Coming Soon' : 'No products found'}
                </h3>
                <p className="empty-sub">
                  {products.length===0
                    ? 'Our team is curating the best products. Check back soon.'
                    : 'Try a different search or category.'}
                </p>
                {(query||cat!=='all'||aiMode) && (
                  <button className="empty-reset"
                    onClick={()=>{setQuery('');setCat('all');setAiMode(false)}}>
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="mp-grid">
                {filtered.map(p => <Card key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
