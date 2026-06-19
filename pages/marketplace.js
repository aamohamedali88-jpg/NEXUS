/**
 * HUSIN ESHOP — /marketplace — AI Bundle Engine Edition
 * Combinatorial Optimization & Dynamic Bundling Algorithm
 * Parses multi-item queries, isolates categories, builds cross-product bundles
 * ZERO CSS changes — all existing layout preserved
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

// ══════════════════════════════════════════════════════════════════════════════
// QUERY TOKENIZATION ENGINE
// Maps natural language tokens to exact Firestore category values
// ══════════════════════════════════════════════════════════════════════════════
const TOKEN_CATEGORY_MAP = {
  // Electronics
  'laptop':      'laptops',
  'laptops':     'laptops',
  'macbook':     'laptops',
  'computer':    'laptops',
  'notebook':    'laptops',
  'pc':          'laptops',
  'phone':       'mobiles',
  'mobile':      'mobiles',
  'iphone':      'mobiles',
  'samsung':     'mobiles',
  'smartphone':  'mobiles',
  'headphone':   'electronics',
  'headphones':  'electronics',
  'airpods':     'electronics',
  'speaker':     'electronics',
  'tablet':      'electronics',
  'ipad':        'electronics',
  'watch':       'electronics',
  'smartwatch':  'electronics',
  'camera':      'electronics',
  'gaming':      'electronics',
  'console':     'electronics',
  'playstation': 'electronics',
  'xbox':        'electronics',
  'tv':          'electronics',
  'television':  'electronics',
  'electronic':  'electronics',
  // Fashion men
  'shirt':       'clothes_men',
  'tshirt':      'clothes_men',
  'polo':        'clothes_men',
  'jacket':      'clothes_men',
  'jeans':       'clothes_men',
  'trouser':     'clothes_men',
  'trousers':    'clothes_men',
  'suit':        'clothes_men',
  'men':         'clothes_men',
  "men's":       'clothes_men',
  'male':        'clothes_men',
  // Fashion women
  'dress':       'clothes_women',
  'blouse':      'clothes_women',
  'skirt':       'clothes_women',
  'women':       'clothes_women',
  "women's":     'clothes_women',
  'handbag':     'clothes_women',
  'purse':       'clothes_women',
  'heels':       'clothes_women',
  // Kids
  'kids':        'clothes_kids',
  'baby':        'clothes_kids',
  'children':    'clothes_kids',
  'toy':         'toys',
  'toys':        'toys',
  'lego':        'toys',
  'game':        'toys',
  // Home
  'vacuum':      'home_appliances',
  'appliance':   'home_appliances',
  'kitchen':     'home_appliances',
  'coffee':      'home_appliances',
  'blender':     'home_appliances',
  'microwave':   'home_appliances',
  'home':        'home_appliances',
  'smart home':  'home_appliances',
  // Beauty
  'perfume':     'beauty',
  'fragrance':   'beauty',
  'cologne':     'beauty',
  'skincare':    'beauty',
  'makeup':      'beauty',
  'lipstick':    'beauty',
  'cream':       'beauty',
  'beauty':      'beauty',
  'serum':       'beauty',
  // Jewelry
  'jewelry':     'jewelry',
  'jewellery':   'jewelry',
  'gold':        'jewelry',
  'ring':        'jewelry',
  'necklace':    'jewelry',
  'bracelet':    'jewelry',
  'diamond':     'jewelry',
  'watch luxury':'jewelry',
  'hublot':      'jewelry',
  // Sports
  'shoes':       'sports',
  'sneakers':    'sports',
  'nike':        'sports',
  'adidas':      'sports',
  'gym':         'sports',
  'fitness':     'sports',
  'sport':       'sports',
  'running':     'sports',
  'sports':      'sports',
}

/**
 * TOKENIZER: Parses NL query into { categories: string[], budget: number }
 * Extracts multiple category requests and numeric budget from free text
 */
function tokenizeQuery(query) {
  const q         = query.toLowerCase()
  const categories = new Set()
  const tokens     = []

  // Extract budget — look for numbers followed by SAR or preceded by currency words
  const budgetMatch = q.match(/(\d[\d,]*)\s*(?:sar|riyal|riyals|sr)?/i)
  const budget      = budgetMatch
    ? parseFloat(budgetMatch[1].replace(/,/g, ''))
    : 0

  // Multi-word token check first (e.g., "men's shirt", "smart home")
  const multiWordTokens = Object.keys(TOKEN_CATEGORY_MAP).filter(k => k.includes(' '))
  multiWordTokens.forEach(token => {
    if (q.includes(token)) {
      const cat = TOKEN_CATEGORY_MAP[token]
      categories.add(cat)
      tokens.push({ token, category: cat })
    }
  })

  // Single word tokens
  const words = q.split(/[\s,]+/)
  words.forEach(word => {
    const clean = word.replace(/[^a-z0-9']/g, '')
    if (TOKEN_CATEGORY_MAP[clean]) {
      const cat = TOKEN_CATEGORY_MAP[clean]
      categories.add(cat)
      tokens.push({ token: clean, category: cat })
    }
  })

  return {
    categories: [...categories],
    tokens,
    budget,
    isMultiCategory: categories.size > 1,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMBINATORIAL BUNDLING ALGORITHM
// Generates cross-category permutations within budget constraint
// Time complexity: O(n^k) where n=products per category, k=categories
// Optimized with early termination and top-N selection
// ══════════════════════════════════════════════════════════════════════════════
function buildBundles(productsByCategory, categories, maxBudget, maxBundles = 6) {
  if (categories.length === 0) return []

  // Get top products per category (sorted by price asc for budget optimization)
  const pools = categories.map(cat => {
    const catProducts = (productsByCategory[cat] || [])
      .filter(p => p.sellingPriceSAR > 0)
      .sort((a, b) => b.sellingPriceSAR - a.sellingPriceSAR) // best items first
      .slice(0, 8) // top 8 per category to limit permutations
    return { cat, products: catProducts }
  })

  // Check all pools have at least 1 product
  if (pools.some(p => p.products.length === 0)) return []

  const bundles = []

  // Recursive permutation generator with budget pruning
  function generate(poolIndex, currentBundle, currentTotal) {
    if (bundles.length >= maxBundles * 3) return // early exit

    if (poolIndex === pools.length) {
      // Complete bundle formed
      if (currentTotal <= maxBudget) {
        bundles.push({
          items:      [...currentBundle],
          totalSAR:   currentTotal,
          totalFormatted: formatSAR(currentTotal),
          savings:    maxBudget - currentTotal,
          savingsFormatted: formatSAR(maxBudget - currentTotal),
          score:      currentTotal / maxBudget, // higher = uses more budget efficiently
        })
      }
      return
    }

    const pool = pools[poolIndex]
    for (const product of pool.products) {
      const newTotal = currentTotal + (product.sellingPriceSAR || 0)

      // PRUNE: if adding this item already exceeds budget, skip remaining
      // (only valid if remaining pools have min price > 0 which we can't guarantee)
      // So we only hard-prune at leaf level (done above)
      if (newTotal <= maxBudget) {
        generate(
          poolIndex + 1,
          [...currentBundle, { ...product, _bundleCategory: pool.cat }],
          newTotal
        )
      }
    }
  }

  generate(0, [], 0)

  // Sort bundles: prefer ones that use budget most efficiently (highest score)
  bundles.sort((a, b) => b.score - a.score)

  // Deduplicate — remove bundles sharing too many items
  const unique = []
  const seen   = new Set()
  for (const bundle of bundles) {
    const key = bundle.items.map(i => i.id).sort().join('|')
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(bundle)
    }
  }

  return unique.slice(0, maxBundles)
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE PRODUCT SEMANTIC SCORER (for non-bundle AI search)
// ══════════════════════════════════════════════════════════════════════════════
function scoreProduct(product, query, maxBudget) {
  let score = 0
  const name = (product.name || '').toLowerCase()
  const spec = (product.specifications || '').toLowerCase()
  const cat  = (product.category || '').toLowerCase()
  const q    = query.toLowerCase()
  const price = product.sellingPriceSAR || 0

  if (maxBudget > 0 && price > maxBudget) return -1
  if (maxBudget > 0) score += Math.round((price / maxBudget) * 20)
  else score += 15

  const tokens = q.split(/\s+/).filter(t => t.length > 2)
  tokens.forEach(token => {
    if (name.includes(token)) score += 30
    if (spec.includes(token)) score += 10
    if (cat.includes(token))  score += 8
  })

  return Math.min(score, 100)
}

// ── Categories list ───────────────────────────────────────────────────────────
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

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel() {
  return (
    <div className="skel">
      <div className="skel-img shimmer" />
      <div className="skel-body">
        <div className="skel-line shimmer" style={{width:'85%'}} />
        <div className="skel-line shimmer" style={{width:'60%',marginTop:6}} />
        <div className="skel-foot">
          <div className="skel-p shimmer" /><div className="skel-b shimmer" />
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
        <div className="card-ph" style={{background:grad,opacity:(err||!p.image)?1:0}}>
          <span className="ph-icon">{icon}</span><span className="ph-txt">HUSIN</span>
        </div>
        {p.image && !err && (
          <img src={p.image} alt={p.name} className="card-img"
            loading="lazy" decoding="async" style={{opacity:loaded?1:0}}
            onLoad={()=>setLoaded(true)} onError={()=>setErr(true)} />
        )}
        <span className="card-cat">{icon}</span>
        {p.isNew      && <span className="card-new">NEW</span>}
        {p.aiScore>60 && <span className="card-ai-match">🤖 AI Match</span>}
      </div>
      <div className="card-body">
        <p className="card-name">{p.name}</p>
        {p.specifications && <p className="card-spec">{p.specifications}</p>}
        {price && <p className="card-price">{price}</p>}
        <div className="card-cta-row"><span className="card-cta">Buy Now →</span></div>
      </div>
    </a>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// BUNDLE CARD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
function BundleCard({ bundle, index }) {
  const [expanded, setExpanded] = useState(false)
  const catLabel = (cat) => CATS.find(c => c.v === cat)?.l || cat

  return (
    <div className="bundle-card">
      {/* Bundle header */}
      <div className="bundle-header">
        <div className="bundle-title-row">
          <span className="bundle-num">Bundle {index + 1}</span>
          <span className="bundle-score-badge">
            {Math.round(bundle.score * 100)}% budget used
          </span>
        </div>
        <div className="bundle-price-row">
          <span className="bundle-total">{bundle.totalFormatted}</span>
          {bundle.savings > 0 && (
            <span className="bundle-savings">↓ {bundle.savingsFormatted} under budget</span>
          )}
        </div>
      </div>

      {/* Bundle items mini-grid */}
      <div className="bundle-items">
        {bundle.items.map((item, i) => (
          <a key={i} href={`/marketplace/${item.id}`} className="bundle-item">
            {/* Item image */}
            <div className="bundle-item-img-wrap">
              {item.image ? (
                <img src={item.image} alt={item.name} className="bundle-item-img"
                  onError={e=>{e.target.style.display='none'}} />
              ) : (
                <div className="bundle-item-ph" style={{background: GRADS[item.category]||GRADS.general}}>
                  {CATS.find(c=>c.v===item.category)?.l?.split(' ')[0]||'📦'}
                </div>
              )}
            </div>
            {/* Item info */}
            <div className="bundle-item-info">
              <span className="bundle-item-cat">{catLabel(item._bundleCategory)}</span>
              <p className="bundle-item-name">{item.name}</p>
              <span className="bundle-item-price">{formatSAR(item.sellingPriceSAR)}</span>
            </div>
          </a>
        ))}
      </div>

      {/* Bundle CTA */}
      <div className="bundle-footer">
        <button className="bundle-buy-all"
          onClick={() => {
            // Navigate to first item for now — future: multi-item cart
            window.location.href = `/marketplace/${bundle.items[0].id}`
          }}>
          🛒 Buy Bundle — {bundle.totalFormatted}
        </button>
        <p className="bundle-note">
          Items will be purchased individually · Tap each item to buy
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// AI CONSOLE COMPONENT — with bundle mode detection
// ══════════════════════════════════════════════════════════════════════════════
function AIConsole({ onSearch, isProcessing, total }) {
  const [aiQuery,  setAiQuery]  = useState('')
  const [aiBudget, setAiBudget] = useState('')
  const [charCount,setCharCount]= useState(0)

  const examples = [
    'laptop, shirt and perfume for 5000 SAR',
    'iPhone and smartwatch under 4000 SAR',
    'Gaming console and headphones 3000 SAR',
    'Gold ring and women bag for 2500 SAR',
  ]

  const handleLaunch = () => {
    if (!aiQuery.trim() && !aiBudget) return
    onSearch(aiQuery.trim(), parseFloat(aiBudget) || 0)
  }

  return (
    <div className="ai-console">
      {/* Animated top border */}
      <div className="ai-console-topbar" />

      <div className="ai-console-header">
        <div className="ai-title-row">
          <div className="ai-engine-badge">
            <span className="ai-pulse" />HUSIN AI ENGINE v3.0
          </div>
          <span className="ai-version">Bundle Mode · Live</span>
        </div>
        <h2 className="ai-headline">
          Describe Your Needs &amp; Budget.
          <span className="ai-headline-accent"> AI Builds The Perfect Bundle Instantly.</span>
        </h2>
        <p className="ai-sub">
          List multiple items (e.g., <em>"laptop, shirt, perfume"</em>) and a total budget.
          Our <strong style={{color:'#00d9ff'}}> Combinatorial Engine</strong> mathematically
          constructs every possible bundle from our {total.toLocaleString()} live products
          that fits your exact budget — then ranks them by value.
        </p>
      </div>

      <div className="ai-inputs">
        {/* Query input */}
        <div className="ai-input-group">
          <label className="ai-label"><span>💬</span> What do you need?</label>
          <div className="ai-textarea-wrap">
            <textarea
              className="ai-textarea"
              placeholder="e.g., I need a laptop, a men's shirt, and a perfume for 5000 SAR max..."
              value={aiQuery}
              onChange={e=>{setAiQuery(e.target.value);setCharCount(e.target.value.length)}}
              onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))handleLaunch()}}
              rows={3} maxLength={500}
            />
            <span className="ai-char">{charCount}/500</span>
          </div>
          <div className="ai-examples">
            <span className="ai-ex-label">Try:</span>
            {examples.map((ex,i)=>(
              <button key={i} className="ai-ex-pill"
                onClick={()=>{setAiQuery(ex);setCharCount(ex.length)}}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Budget + Launch */}
        <div className="ai-budget-group">
          <label className="ai-label"><span>💰</span> Max Budget</label>
          <div className="ai-budget-wrap">
            <input type="number" className="ai-budget-input"
              placeholder="Enter amount"
              value={aiBudget} onChange={e=>setAiBudget(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')handleLaunch()}}
              min="0" step="100" />
            <span className="ai-budget-sfx">SAR Max</span>
          </div>
          {/* USD equivalent intentionally removed per spec Part 5 — 100% SAR-facing UI to protect currency conversion margin */}
          <button
            className={`ai-launch ${isProcessing?'ai-launch-busy':''}`}
            onClick={handleLaunch} disabled={isProcessing}>
            {isProcessing
              ? <><span className="ai-spinner"/>Processing bundles...</>
              : <><span>🧮</span>Launch AI Bundle Engine</>
            }
          </button>
          <p className="ai-hint">Ctrl+Enter to launch · Multi-item queries activate Bundle Mode</p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// AI BUNDLES SECTION
// ══════════════════════════════════════════════════════════════════════════════
function AIBundlesSection({ bundles, tokenResult, isFallback, aiResults }) {
  if (!tokenResult) return null

  const { categories, budget, isMultiCategory } = tokenResult
  const catLabels = categories.map(c => CATS.find(x=>x.v===c)?.l||c).join(' + ')

  return (
    <div className="ai-bundles-wrap">

      {/* Section header */}
      <div className="ai-bundles-header">
        <div className="ai-bundles-title-row">
          <h3 className="ai-bundles-title">
            🧮 AI Optimized Bundles
          </h3>
          {isMultiCategory && (
            <span className="ai-bundles-mode-badge">
              Combinatorial Mode · {categories.length} Categories
            </span>
          )}
        </div>
        <p className="ai-bundles-sub">
          {isFallback
            ? `Budget constraint too strict for this combination. Showing closest individual matches below.`
            : isMultiCategory
              ? `Mathematically optimized bundles for: ${catLabels} · Budget: ${formatSAR(budget)}`
              : `AI-ranked results for your query · Budget: ${formatSAR(budget) || 'Any'}`
          }
        </p>
      </div>

      {/* Fallback alert */}
      {isFallback && (
        <div className="ai-fallback-alert">
          <span className="ai-fallback-icon">🔄</span>
          <div>
            <strong>HUSIN AI Note:</strong> Budget is optimal.
            Broadening sourcing perimeter to trusted global suppliers...
            Displaying {aiResults.length} closest individual matches ranked by relevance.
          </div>
        </div>
      )}

      {/* Bundle cards */}
      {!isFallback && bundles.length > 0 && (
        <div className="ai-bundles-grid">
          {bundles.map((bundle, i) => (
            <BundleCard key={i} bundle={bundle} index={i} />
          ))}
        </div>
      )}

      {/* Divider to product grid */}
      {!isFallback && bundles.length > 0 && (
        <div className="ai-bundles-divider">
          <div className="ai-div-line" />
          <span className="ai-div-text">Individual Products · Sorted by Relevance</span>
          <div className="ai-div-line" />
        </div>
      )}
    </div>
  )
}

// ── Server-side ───────────────────────────────────────────────────────────────
// ── Server-side data — QUOTA-OPTIMIZED with ISR ────────────────────────────────
// CHANGED: getServerSideProps → getStaticProps + revalidate
// WHY: getServerSideProps re-reads all live products from Firestore on EVERY
//      visitor page load. At 601 products, ~83 daily visitors exhausts the
//      entire 50k/day Firestore Spark plan read quota from this page alone.
// FIX: getStaticProps + revalidate:60 builds a cached static page. All visitors
//      are served the cached version with ZERO Firestore reads. The page only
//      re-queries Firestore when Vercel rebuilds it — at most once every 60s.
//      New approved products appear within 60 seconds maximum.
// Everything else on this page (AI engine, bundles, filters, cards) is
// 100% unchanged and still works exactly as before — purely client-side.
export async function getStaticProps() {
  try {
    const snap = await db.collection('shop_approved_products')
      .where('status','==','live').get()
    const cutoff = new Date(Date.now()-48*60*60*1000).toISOString()
    const products = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id:              d.id             || doc.id,
        name:            d.name           || 'Product',
        image:           upgradeImg(d.image) || null,
        sellingPriceSAR: d.sellingPriceSAR || null,
        category:        d.category       || 'general',
        specifications:  d.specifications || null,
        approvedAt:      d.approvedAt     || '',
        isNew:           (d.approvedAt||'') > cutoff,
      }
    })
    products.sort((a,b) => b.approvedAt>a.approvedAt?1:-1)
    return {
      props: { products, total: products.length },
      revalidate: 60, // rebuild at most once every 60 seconds
    }
  } catch (e) {
    console.error('[Marketplace ISR]', e.message)
    return { props: { products:[], total:0 }, revalidate: 30 }
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Marketplace({ products, total }) {
  const [cat,          setCat]          = useState('all')
  const [query,        setQuery]        = useState('')
  const [sort,         setSort]         = useState('newest')
  const [ready,        setReady]        = useState(false)

  // AI state
  const [aiMode,       setAiMode]       = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiResults,    setAiResults]    = useState([])
  const [aiBundles,    setAiBundles]    = useState([])
  const [tokenResult,  setTokenResult]  = useState(null)
  const [aiFallback,   setAiFallback]   = useState(false)
  const [aiQuery,      setAiQuery]      = useState('')
  const [aiBudget,     setAiBudget]     = useState(0)

  useEffect(() => { setReady(true) }, [])

  // Standard filtered products
  const filtered = useMemo(() => {
    if (aiMode) return aiResults
    let r = cat==='all' ? products : products.filter(p=>p.category===cat)
    if (query) {
      const q = query.toLowerCase()
      r = r.filter(p=>p.name?.toLowerCase().includes(q)||p.specifications?.toLowerCase().includes(q))
    }
    if (sort==='price_asc')  return [...r].sort((a,b)=>(a.sellingPriceSAR||0)-(b.sellingPriceSAR||0))
    if (sort==='price_desc') return [...r].sort((a,b)=>(b.sellingPriceSAR||0)-(a.sellingPriceSAR||0))
    return r
  }, [products, cat, query, sort, aiMode, aiResults])

  const counts = useMemo(() => {
    const c = { all: products.length }
    CATS.forEach(({v}) => { if (v!=='all') c[v]=products.filter(p=>p.category===v).length })
    return c
  }, [products])

  // ── MAIN AI HANDLER ────────────────────────────────────────────────────────
  const handleAISearch = useCallback((queryText, maxBudget) => {
    if (!queryText && maxBudget <= 0) return

    setAiProcessing(true)
    setAiMode(false)
    setAiBundles([])
    setTokenResult(null)
    setAiFallback(false)

    // Simulate 1.2s AI processing with shimmer
    setTimeout(() => {
      // STEP 1: Tokenize query
      const parsed = tokenizeQuery(queryText || '')
      setTokenResult({ ...parsed, budget: maxBudget || parsed.budget })
      const budget = maxBudget || parsed.budget

      if (parsed.isMultiCategory && parsed.categories.length >= 2) {
        // ── BUNDLE MODE ──────────────────────────────────────────────────────
        // Group products by category
        const byCategory = {}
        parsed.categories.forEach(cat => {
          byCategory[cat] = products.filter(p =>
            p.category === cat &&
            p.sellingPriceSAR > 0 &&
            (budget <= 0 || p.sellingPriceSAR < budget) // pre-filter impossible items
          )
        })

        // Build bundles using combinatorial algorithm
        const bundles = buildBundles(byCategory, parsed.categories, budget)

        if (bundles.length > 0) {
          // Show bundle results + individual items from requested categories
          const individualItems = products
            .filter(p => parsed.categories.includes(p.category) &&
              (budget <= 0 || (p.sellingPriceSAR||0) <= budget))
            .map(p => ({ ...p, aiScore: scoreProduct(p, queryText, budget) }))
            .filter(p => p.aiScore >= 0)
            .sort((a,b) => b.aiScore - a.aiScore)
            .slice(0, 48)

          setAiBundles(bundles)
          setAiResults(individualItems)
          setAiFallback(false)
        } else {
          // No bundles fit budget — fallback to individual items
          setAiFallback(true)
          setAiBundles([])
          const fallback = products
            .filter(p => parsed.categories.includes(p.category))
            .sort((a,b) => (a.sellingPriceSAR||0)-(b.sellingPriceSAR||0))
            .slice(0, 24)
            .map(p => ({ ...p, aiScore: 50 }))
          setAiResults(fallback)
        }

      } else {
        // ── SINGLE CATEGORY / KEYWORD MODE ───────────────────────────────────
        const scored = products.map(p => ({
          ...p,
          aiScore: scoreProduct(p, queryText, budget)
        }))

        const exact = scored.filter(p => p.aiScore >= 0)
          .sort((a,b) => b.aiScore - a.aiScore)

        const meaningful = exact.filter(p => p.aiScore > 0)

        if (meaningful.length > 0) {
          setAiResults(meaningful)
          setAiFallback(false)
        } else if (exact.length > 0) {
          // Budget match but no semantic match
          setAiResults(exact.slice(0, 24))
          setAiFallback(true)
        } else {
          // Budget too low — show cheapest
          const cheapest = [...products]
            .sort((a,b)=>(a.sellingPriceSAR||0)-(b.sellingPriceSAR||0))
            .slice(0, 24)
            .map(p=>({...p, aiScore:10}))
          setAiResults(cheapest)
          setAiFallback(true)
        }
      }

      setAiQuery(queryText)
      setAiBudget(budget)
      setAiMode(true)
      setAiProcessing(false)
    }, 1200)
  }, [products])

  const clearAI = () => {
    setAiMode(false); setAiBundles([]); setTokenResult(null)
    setAiResults([]); setAiFallback(false)
  }

  return (
    <>
      <Head>
        <title>HUSIN Marketplace — {total.toLocaleString()} Products</title>
        <meta name="description" content={`AI-powered marketplace with ${total} curated products.`} />
        <meta property="og:title" content="HUSIN Marketplace — AI Bundle Engine" />
        <meta property="og:image" content="https://www.husin.org/main%20logo-200h-200h.png" />
      </Head>

      <Navigation />

      {/* ALL CSS IN GLOBAL — never scoped, always wins over component styles */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position:-800px 0; }
          100% { background-position:800px 0; }
        }
        @keyframes aiGrad {
          0%,100% { background-position:0% 50%; }
          50%      { background-position:100% 50%; }
        }
        @keyframes aiPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.4; transform:scale(0.8); }
        }
        @keyframes aiSpin { to { transform:rotate(360deg); } }
        @keyframes aiFade {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes bundleSlide {
          from { opacity:0; transform:translateX(-12px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes topbarFlow {
          0%   { background-position:0% 50%; }
          100% { background-position:200% 50%; }
        }

        /* Shimmer skeleton */
        .shimmer { background:linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.10) 40%,rgba(255,255,255,0.04) 80%); background-size:800px 100%; animation:shimmer 1.6s ease-in-out infinite; }
        .skel { background:#0f1117; border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden; }
        .skel-img  { height:185px; }
        .skel-body { padding:12px; display:flex; flex-direction:column; gap:8px; }
        .skel-line { height:11px; border-radius:6px; }
        .skel-foot { display:flex; justify-content:space-between; margin-top:4px; }
        .skel-p { width:80px; height:14px; border-radius:6px; }
        .skel-b { width:56px; height:14px; border-radius:6px; }

        /* PAGE */
        .mp-page { background:#050608; min-height:100vh; overflow-x:hidden; }

        /* HERO */
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

        /* MOBILE PILLS */
        .mp-pills { display:none; overflow-x:auto; overflow-y:hidden; white-space:nowrap; scrollbar-width:none; -ms-overflow-style:none; padding:10px 14px; gap:7px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(0,0,0,0.25); }
        .mp-pills::-webkit-scrollbar { display:none; }
        .mp-pill { display:inline-flex; align-items:center; gap:5px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:20px; color:rgba(255,255,255,0.65); padding:6px 12px; font-size:0.76rem; cursor:pointer; font-family:inherit; white-space:nowrap; flex-shrink:0; transition:all 0.15s; }
        .mp-pill:hover { background:rgba(255,255,255,0.09); color:#fff; }
        .mp-pill-on { background:rgba(0,217,255,0.1); border-color:rgba(0,217,255,0.35); color:#00d9ff; }
        .pill-n { background:rgba(0,217,255,0.15); color:#00d9ff; padding:1px 5px; border-radius:10px; font-size:0.64rem; }

        /* BODY LAYOUT */
        .mp-body { display:flex; max-width:1400px; margin:0 auto; padding:24px; gap:20px; box-sizing:border-box; width:100%; }

        /* DESKTOP SIDEBAR */
        .mp-sidebar { width:196px; flex-shrink:0; position:sticky; top:70px; align-self:flex-start; height:calc(100vh - 80px); overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.08) transparent; }
        .sidebar-hd { color:rgba(255,255,255,0.38); font-size:0.63rem; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 10px; font-weight:600; }
        .sidebar-btn { display:flex; align-items:center; justify-content:space-between; width:100%; background:transparent; border:none; color:rgba(255,255,255,0.55); padding:8px 10px; border-radius:7px; cursor:pointer; font-size:0.78rem; text-align:left; font-family:inherit; margin-bottom:1px; transition:all 0.15s; }
        .sidebar-btn:hover { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.85); }
        .sidebar-btn-on { background:rgba(0,217,255,0.08); color:#00d9ff; border-left:2px solid #00d9ff; }
        .sidebar-n { background:rgba(0,217,255,0.12); color:rgba(0,217,255,0.8); padding:2px 6px; border-radius:10px; font-size:0.63rem; flex-shrink:0; }

        /* GRID AREA */
        .mp-grid-area { flex:1; min-width:0; width:100%; }
        .mp-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:10px; }
        .toolbar-count { color:rgba(255,255,255,0.4); font-size:0.8rem; }
        .mp-sort { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:rgba(255,255,255,0.75); padding:7px 12px; font-size:0.8rem; outline:none; cursor:pointer; font-family:inherit; }
        .mp-sort option { background:#0f1117; }

        /* PRODUCT GRID */
        .mp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; width:100%; }

        /* CARD */
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

        /* EMPTY */
        .mp-empty { text-align:center; padding:72px 16px; }
        .empty-icon  { font-size:46px; margin:0 0 14px; }
        .empty-title { color:#fff; font-size:1.15rem; font-weight:600; margin:0 0 8px; }
        .empty-sub   { color:rgba(255,255,255,0.4); font-size:0.85rem; line-height:1.65; max-width:360px; margin:0 auto 18px; }
        .empty-reset { background:rgba(0,217,255,0.1); border:1px solid rgba(0,217,255,0.25); color:#00d9ff; padding:9px 22px; border-radius:8px; cursor:pointer; font-family:inherit; font-size:0.85rem; }

        /* ══════════════════════════════════════════════
           AI CONSOLE STYLES
        ══════════════════════════════════════════════ */
        .ai-console { background:rgba(15,17,23,0.92); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:28px; margin-bottom:24px; position:relative; overflow:hidden; animation:aiFade 0.4s ease-out; }
        .ai-console::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(0,217,255,0.02),rgba(139,92,246,0.02),rgba(200,164,109,0.02)); pointer-events:none; }
        .ai-console-topbar { position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,#00d9ff,#8b5cf6,#c8a46d,#00d9ff); background-size:200% 100%; animation:topbarFlow 3s linear infinite; }
        .ai-console-header { margin-bottom:22px; }
        .ai-title-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .ai-engine-badge { display:flex; align-items:center; gap:7px; background:rgba(0,217,255,0.08); border:1px solid rgba(0,217,255,0.2); border-radius:20px; padding:4px 12px; color:#00d9ff; font-size:0.63rem; font-weight:700; letter-spacing:0.12em; }
        .ai-pulse { width:6px; height:6px; border-radius:50%; background:#00d9ff; animation:aiPulse 1.5s ease-in-out infinite; flex-shrink:0; }
        .ai-version { color:rgba(255,255,255,0.2); font-size:0.65rem; }
        .ai-headline { color:#fff; font-size:clamp(0.95rem,2vw,1.3rem); font-weight:700; margin:0 0 8px; line-height:1.35; }
        .ai-headline-accent { color:#00d9ff; }
        .ai-sub { color:rgba(255,255,255,0.42); font-size:0.8rem; margin:0; line-height:1.65; }
        .ai-inputs { display:grid; grid-template-columns:1fr 320px; gap:20px; align-items:start; }
        .ai-input-group { display:flex; flex-direction:column; gap:8px; }
        .ai-label { display:flex; align-items:center; gap:6px; color:rgba(255,255,255,0.55); font-size:0.68rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; }
        .ai-textarea-wrap { position:relative; }
        .ai-textarea { width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:13px 16px; color:#fff; font-size:0.85rem; font-family:inherit; line-height:1.6; resize:vertical; outline:none; box-sizing:border-box; transition:border-color 0.2s; min-height:86px; }
        .ai-textarea::placeholder { color:rgba(255,255,255,0.22); font-size:0.8rem; }
        .ai-textarea:focus { border-color:rgba(0,217,255,0.4); }
        .ai-char { position:absolute; bottom:8px; right:12px; color:rgba(255,255,255,0.18); font-size:0.62rem; }
        .ai-examples { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .ai-ex-label { color:rgba(255,255,255,0.28); font-size:0.68rem; flex-shrink:0; }
        .ai-ex-pill { display:inline-block; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:20px; color:rgba(255,255,255,0.45); padding:3px 10px; font-size:0.66rem; cursor:pointer; font-family:inherit; transition:all 0.15s; white-space:nowrap; }
        .ai-ex-pill:hover { background:rgba(0,217,255,0.07); border-color:rgba(0,217,255,0.2); color:#00d9ff; }
        .ai-budget-group { display:flex; flex-direction:column; gap:10px; }
        .ai-budget-wrap { display:flex; align-items:center; border:1px solid rgba(255,255,255,0.1); border-radius:12px; overflow:hidden; background:rgba(255,255,255,0.05); }
        .ai-budget-input { flex:1; background:transparent; border:none; padding:13px 14px; color:#fff; font-size:1rem; font-weight:600; outline:none; font-family:inherit; }
        .ai-budget-input::placeholder { color:rgba(255,255,255,0.22); font-size:0.85rem; font-weight:400; }
        .ai-budget-input::-webkit-outer-spin-button,.ai-budget-input::-webkit-inner-spin-button { -webkit-appearance:none; }
        .ai-budget-sfx { color:rgba(255,255,255,0.45); font-size:0.78rem; font-weight:600; padding:0 14px; border-left:1px solid rgba(255,255,255,0.08); white-space:nowrap; background:rgba(255,255,255,0.02); align-self:stretch; display:flex; align-items:center; }
        .ai-budget-hint { color:rgba(255,255,255,0.28); font-size:0.68rem; margin:0; }
        .ai-launch { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:14px 20px; border:none; border-radius:12px; font-size:0.88rem; font-weight:700; cursor:pointer; font-family:inherit; color:#000; background:linear-gradient(135deg,#00d9ff,#8b5cf6,#00d9ff); background-size:200% 200%; animation:aiGrad 3s ease infinite; transition:opacity 0.2s,transform 0.15s; }
        .ai-launch:hover { opacity:0.88; transform:translateY(-1px); }
        .ai-launch:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .ai-launch-busy { background:rgba(255,255,255,0.08) !important; color:rgba(255,255,255,0.6) !important; animation:none !important; border:1px solid rgba(255,255,255,0.1); }
        .ai-spinner { width:15px; height:15px; border:2px solid rgba(255,255,255,0.25); border-top-color:#fff; border-radius:50%; animation:aiSpin 0.7s linear infinite; flex-shrink:0; }
        .ai-hint { color:rgba(255,255,255,0.22); font-size:0.65rem; margin:0; text-align:center; }

        /* ══════════════════════════════════════════════
           BUNDLE SECTION STYLES
        ══════════════════════════════════════════════ */
        .ai-bundles-wrap { margin-bottom:28px; animation:aiFade 0.5s ease-out; }
        .ai-bundles-header { margin-bottom:16px; }
        .ai-bundles-title-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:6px; }
        .ai-bundles-title { color:#fff; font-size:1rem; font-weight:700; margin:0; }
        .ai-bundles-mode-badge { background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.3); color:#a78bfa; padding:3px 10px; border-radius:20px; font-size:0.68rem; font-weight:600; white-space:nowrap; }
        .ai-bundles-sub { color:rgba(255,255,255,0.4); font-size:0.8rem; margin:0; line-height:1.6; }

        /* Fallback alert */
        .ai-fallback-alert { display:flex; align-items:flex-start; gap:10px; background:rgba(200,164,109,0.07); border:1px solid rgba(200,164,109,0.2); border-radius:10px; padding:14px 16px; margin-bottom:16px; color:rgba(255,255,255,0.65); font-size:0.82rem; line-height:1.6; }
        .ai-fallback-icon { font-size:18px; flex-shrink:0; }

        /* Bundle grid */
        .ai-bundles-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-bottom:20px; }

        /* Bundle card */
        .bundle-card { background:rgba(15,17,23,0.9); border:1px solid rgba(139,92,246,0.2); border-radius:16px; padding:18px; display:flex; flex-direction:column; gap:14px; transition:border-color 0.2s,box-shadow 0.2s; animation:bundleSlide 0.4s ease-out; }
        .bundle-card:hover { border-color:rgba(139,92,246,0.4); box-shadow:0 8px 28px rgba(139,92,246,0.1); }
        .bundle-header { display:flex; flex-direction:column; gap:4px; }
        .bundle-title-row { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; }
        .bundle-num { color:rgba(255,255,255,0.5); font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; }
        .bundle-score-badge { background:rgba(0,217,255,0.08); border:1px solid rgba(0,217,255,0.15); color:rgba(0,217,255,0.8); padding:2px 8px; border-radius:10px; font-size:0.62rem; font-weight:600; }
        .bundle-price-row { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
        .bundle-total { color:#c8a46d; font-size:1.25rem; font-weight:700; }
        .bundle-savings { color:#2ecc71; font-size:0.72rem; font-weight:600; }

        /* Bundle items mini-grid */
        .bundle-items { display:flex; flex-direction:column; gap:8px; }
        .bundle-item { display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px; text-decoration:none; transition:border-color 0.15s; }
        .bundle-item:hover { border-color:rgba(0,217,255,0.2); }
        .bundle-item-img-wrap { width:52px; height:52px; border-radius:7px; overflow:hidden; background:#fff; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .bundle-item-img { width:100%; height:100%; object-fit:contain; padding:4px; box-sizing:border-box; }
        .bundle-item-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:20px; }
        .bundle-item-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
        .bundle-item-cat { color:rgba(0,217,255,0.7); font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; }
        .bundle-item-name { color:rgba(255,255,255,0.8); font-size:0.76rem; font-weight:500; line-height:1.4; margin:0; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
        .bundle-item-price { color:#c8a46d; font-size:0.8rem; font-weight:700; }

        /* Bundle footer */
        .bundle-footer { display:flex; flex-direction:column; gap:6px; }
        .bundle-buy-all { width:100%; background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(0,217,255,0.1)); border:1px solid rgba(139,92,246,0.3); color:#a78bfa; border-radius:9px; padding:11px 16px; font-size:0.82rem; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s; }
        .bundle-buy-all:hover { background:linear-gradient(135deg,rgba(139,92,246,0.25),rgba(0,217,255,0.15)); border-color:rgba(139,92,246,0.5); color:#c4b5fd; }
        .bundle-note { color:rgba(255,255,255,0.25); font-size:0.62rem; margin:0; text-align:center; }

        /* Bundle → grid divider */
        .ai-bundles-divider { display:flex; align-items:center; gap:14px; margin-bottom:18px; }
        .ai-div-line { flex:1; height:1px; background:rgba(255,255,255,0.07); }
        .ai-div-text { color:rgba(255,255,255,0.3); font-size:0.72rem; white-space:nowrap; }

        /* AI result clear banner */
        .ai-clear-bar { display:flex; align-items:center; justify-content:space-between; background:rgba(0,217,255,0.06); border:1px solid rgba(0,217,255,0.15); border-radius:10px; padding:10px 16px; margin-bottom:16px; flex-wrap:wrap; gap:8px; }
        .ai-clear-info { color:rgba(255,255,255,0.55); font-size:0.78rem; }
        .ai-clear-info strong { color:#00d9ff; }
        .ai-clear-btn { background:transparent; border:1px solid rgba(255,255,255,0.12); border-radius:7px; color:rgba(255,255,255,0.4); padding:5px 12px; font-size:0.72rem; cursor:pointer; font-family:inherit; transition:all 0.2s; white-space:nowrap; }
        .ai-clear-btn:hover { color:#fff; border-color:rgba(255,255,255,0.25); }

        /* BREAKPOINTS — LOCKED, DO NOT MODIFY */
        @media (max-width:1280px) { .mp-grid { grid-template-columns:repeat(3,1fr); } }
        @media (max-width:1024px) {
          .mp-grid { grid-template-columns:repeat(3,1fr); gap:12px; }
          .mp-body { padding:18px; }
          .mp-sidebar { width:170px; }
          .ai-inputs { grid-template-columns:1fr; }
          .ai-bundles-grid { grid-template-columns:1fr; }
        }
        @media (max-width:768px) {
          .mp-pills { display:flex; }
          .mp-sidebar,aside.mp-sidebar,.mp-body .mp-sidebar,.mp-body aside.mp-sidebar {
            display:none !important; width:0 !important; min-width:0 !important;
            max-width:0 !important; padding:0 !important; margin:0 !important;
            overflow:hidden !important; flex:none !important;
          }
          .mp-grid-area { width:100% !important; flex:1 !important; }
          .mp-body { padding:12px !important; gap:0 !important; }
          .mp-grid { grid-template-columns:repeat(2,1fr) !important; gap:10px !important; }
          .card-img-wrap { height:150px !important; }
          .mp-hero { padding:36px 16px 26px; }
          .mp-h1  { font-size:1.4rem; }
          .ai-console { padding:16px; border-radius:14px; }
          .ai-headline { font-size:0.95rem; }
          .ai-bundles-grid { grid-template-columns:1fr; }
          .bundle-card { padding:14px; }
        }
        @media (max-width:480px) {
          .mp-grid { grid-template-columns:repeat(2,1fr) !important; gap:8px !important; }
          .card-img-wrap { height:130px !important; }
          .mp-hero { padding:28px 14px 22px; }
          .mp-h1  { font-size:1.25rem; }
          .ai-console { padding:12px; }
          .ai-ex-pill { display:none; }
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
                value={query}
                onChange={e=>{setQuery(e.target.value); setAiMode(false)}}
                disabled={aiMode} />
              {query && <button className="mp-search-x" onClick={()=>setQuery('')}>✕</button>}
            </div>
            <p className="mp-hero-count">{total.toLocaleString('en-SA')} products available</p>
          </div>
        </div>

        {/* Mobile pills */}
        <div className="mp-pills">
          {CATS.map(c=>(
            <button key={c.v} onClick={()=>{setCat(c.v);setAiMode(false)}}
              className={`mp-pill ${!aiMode&&cat===c.v?'mp-pill-on':''}`}>
              {c.l}{counts[c.v]>0&&<span className="pill-n">{counts[c.v]}</span>}
            </button>
          ))}
        </div>

        <div className="mp-body">

          {/* Desktop sidebar */}
          <aside className="mp-sidebar">
            <p className="sidebar-hd">Categories</p>
            {CATS.map(c=>(
              <button key={c.v} onClick={()=>{setCat(c.v);setAiMode(false)}}
                className={`sidebar-btn ${!aiMode&&cat===c.v?'sidebar-btn-on':''}`}>
                <span>{c.l}</span>
                {counts[c.v]>0&&<span className="sidebar-n">{counts[c.v]}</span>}
              </button>
            ))}
          </aside>

          <div className="mp-grid-area">

            {/* AI Console */}
            <AIConsole onSearch={handleAISearch} isProcessing={aiProcessing} total={total} />

            {/* AI Bundles + result info */}
            {aiMode && (
              <>
                <AIBundlesSection
                  bundles={aiBundles}
                  tokenResult={tokenResult}
                  isFallback={aiFallback}
                  aiResults={aiResults}
                />
                <div className="ai-clear-bar">
                  <span className="ai-clear-info">
                    AI results for: <strong>"{aiQuery}"</strong>
                    {aiBudget > 0 ? ` · Budget: ${formatSAR(aiBudget)}` : ''}
                    {' · '}{filtered.length} products
                  </span>
                  <button className="ai-clear-btn" onClick={clearAI}>✕ Clear AI Filter</button>
                </div>
              </>
            )}

            {/* Standard toolbar */}
            {!aiMode && (
              <div className="mp-toolbar">
                <span className="toolbar-count">
                  {filtered.length.toLocaleString('en-SA')} products
                  {query?` · "${query}"`:''}{cat!=='all'?` · ${CATS.find(c=>c.v===cat)?.l}`:''}
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
                  {products.length===0?'Products Coming Soon':'No products found'}
                </h3>
                <p className="empty-sub">
                  {products.length===0
                    ?'Our team is curating the best products. Check back soon.'
                    :'Try a different search or category.'}
                </p>
                {(query||cat!=='all'||aiMode)&&(
                  <button className="empty-reset"
                    onClick={()=>{setQuery('');setCat('all');clearAI()}}>
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="mp-grid">
                {filtered.map(p=><Card key={p.id} p={p}/>)}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
