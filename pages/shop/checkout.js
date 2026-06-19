/**
 * HUSIN ESHOP — /shop/checkout
 * Phase 2 — Idempotent Checkout Page
 *
 * KEY CHANGE FROM PREVIOUS VERSION:
 * create-order.js now returns husinsOrderId (pre-registered Firestore doc)
 * This ID is stored in husinsOrderIdRef and passed to capture-order.js
 * capture-order.js UPDATES that doc instead of creating a new one
 *
 * This eliminates the lost-order race condition.
 */

import { useState, useEffect, useRef } from 'react'
import Head      from 'next/head'
import Navigation from '../../components/navigation'

export default function CheckoutPage() {
  const [product,       setProduct]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [paypalReady,   setPaypalReady]   = useState(false)
  const [processing,    setProcessing]    = useState(false)
  const [error,         setError]         = useState(null)
  const [step,          setStep]          = useState(1)
  const [orderId,       setOrderId]       = useState(null)
  const [customerInfo,  setCustomerInfo]  = useState({
    name:'', email:'', phone:'', address:'', city:'', country:'SA'
  })

  const [productId,   setProductId]   = useState(null)
  const [quantity,    setQuantity]    = useState(1)

  // Phase 2: store the pre-registered Husin order ID
  // This connects create-order → capture-order atomically
  const husinsOrderIdRef = useRef(null)
  const paypalOrderIdRef = useRef(null)

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search)
    const pid     = params.get('productId')
    const qty     = parseInt(params.get('quantity') || '1')
    setProductId(pid)
    setQuantity(qty)

    if (!pid) { setError('No product selected.'); setLoading(false); return }

    fetch(`/api/shop/product-details?productId=${pid}`)
      .then(r => r.json())
      .then(d  => { setProduct(d.product); setLoading(false) })
      .catch(() => { setError('Failed to load product.'); setLoading(false) })
  }, [])

  // Load PayPal SDK only when entering Step 2
  useEffect(() => {
    if (step !== 2 || paypalReady || !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) return

    const script    = document.createElement('script')
    script.src      = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&components=buttons,card-fields&intent=capture`
    script.async    = true
    script.onload   = () => initPayPal()
    script.onerror  = () => setError('Failed to load secure payment system. Please refresh.')
    document.head.appendChild(script)

    return () => { try { document.head.removeChild(script) } catch (e) {} }
  }, [step])

  async function initPayPal() {
    try {
      setError(null)

      // ── Phase 2: create-order now pre-registers the order in Firestore ──────
      const res  = await fetch('/api/shop/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          productId,
          quantity,
          customerInfo, // Pass customer info now so it's on the pending doc
        }),
      })
      const data = await res.json()

      if (!data.paypalOrderId || !data.husinsOrderId) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      // Store both IDs — husinsOrderId links PayPal → Firestore atomically
      paypalOrderIdRef.current  = data.paypalOrderId
      husinsOrderIdRef.current  = data.husinsOrderId

      setPaypalReady(true)

      const paypal = window.paypal
      if (!paypal) throw new Error('PayPal SDK not loaded')

      // ── PayPal Buttons (PayPal account / Apple Pay / Google Pay) ──────────
      paypal.Buttons({
        style: { layout:'vertical', color:'black', shape:'rect', label:'pay', height:48 },
        createOrder: () => paypalOrderIdRef.current,

        onApprove: async (ppData) => {
          setProcessing(true)
          setError(null)
          await handleCapture(ppData.orderID)
        },

        onError: (err) => {
          setError('Payment failed. Please try again or use a different payment method.')
          console.error('[PayPal Buttons]', err)
        },

        onCancel: () => {
          setError('Payment cancelled. Your order has not been charged.')
        },
      }).render('#paypal-buttons-container')

      // ── Card Fields (Visa / Mastercard / Mada — on-page) ─────────────────
      if (paypal.CardFields) {
        const cardFields = paypal.CardFields({
          createOrder: () => paypalOrderIdRef.current,

          onApprove: async (ppData) => {
            setProcessing(true)
            setError(null)
            await handleCapture(ppData.orderID)
          },

          onError: () => {
            setError('Card payment failed. Please check your details and try again.')
            setProcessing(false)
          },

          style: {
            input: {
              'font-size':   '16px',
              'font-family': 'Roboto, system-ui, sans-serif',
              color:         '#ffffff',
            },
            '.invalid': { color: '#e74c3c' },
          },
        })

        if (cardFields.isEligible()) {
          cardFields.NumberField().render('#card-number-field')
          cardFields.ExpiryField().render('#card-expiry-field')
          cardFields.CVVField().render('#card-cvv-field')

          document.getElementById('card-pay-btn')?.addEventListener('click', async () => {
            if (processing) return
            setProcessing(true)
            setError(null)
            try {
              await cardFields.submit({ cardholderName: customerInfo.name })
            } catch (err) {
              setError('Card declined. Please check your details or try a different card.')
              setProcessing(false)
            }
          })
        }
      }

    } catch (err) {
      setError(err.message || 'Failed to initialize payment.')
      console.error('[initPayPal]', err)
    }
  }

  // ── Phase 2 capture handler — passes husinsOrderId ────────────────────────
  async function handleCapture(paypalOrderId) {
    try {
      const res    = await fetch('/api/shop/capture-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          paypalOrderId,
          husinsOrderId: husinsOrderIdRef.current, // ← Phase 2 key addition
          productId,
          quantity,
          customerInfo,
        }),
      })

      const result = await res.json()

      // 200 — fully successful
      if (result.success) {
        setOrderId(result.orderId)
        setStep(3)
        setProcessing(false)
        return
      }

      // 207 — PayPal captured but Firestore update failed (team was alerted)
      if (res.status === 207) {
        // Still show success to customer — money was taken, team will reconcile
        setOrderId(result.orderId || husinsOrderIdRef.current)
        setStep(3)
        setProcessing(false)
        return
      }

      // Actual failure
      setError(result.error || 'Payment processing failed. Please contact support.')
      setProcessing(false)

    } catch (err) {
      setError('Network error during payment. Please contact support@husin.org with your order reference.')
      setProcessing(false)
      console.error('[handleCapture]', err.message)
    }
  }

  const totalSAR = product ? (product.sellingPriceSAR * quantity).toLocaleString('en-SA', { maximumFractionDigits:0 }) + ' SAR' : ''
  // USD value computed for internal PayPal SDK use only — NEVER rendered to customer
  const totalUSD = product ? ((product.sellingPriceSAR * quantity) / 3.85).toFixed(2) : ''

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <Navigation />
      <div style={S.loadWrap}>
        <div style={S.loadSpinner} />
        <p style={S.loadText}>Loading checkout...</p>
      </div>
    </>
  )

  // ── NO PRODUCT ────────────────────────────────────────────────────────────
  if (!product && !loading) return (
    <>
      <Navigation />
      <div style={S.loadWrap}>
        <p style={{ color:'#e74c3c', fontSize:'1rem' }}>{error || 'Product not found.'}</p>
        <a href="/marketplace" style={S.backLink}>← Back to Marketplace</a>
      </div>
    </>
  )

  // ── ORDER CONFIRMED ───────────────────────────────────────────────────────
  if (step === 3) return (
    <>
      <Head><title>Order Confirmed — HUSIN</title></Head>
      <Navigation />
      <div style={S.successWrap}>
        <div style={S.successCard}>
          <div style={S.successIcon}>✅</div>
          <h1 style={S.successTitle}>Order Confirmed!</h1>
          <p style={S.successSub}>
            شكرًا{customerInfo.name ? `، ${customerInfo.name.split(' ')[0]}` : ''}!
            تم استلام طلبك وستصلك رسالة تأكيد على بريدك الإلكتروني.
          </p>

          <div style={S.successDetails}>
            {[
              { label:'Order ID',     val: orderId },
              { label:'Product',      val: product?.name?.substring(0,50) },
              { label:'Amount Paid',  val: totalSAR, color:'#2ecc71' },
              { label:'Email',        val: customerInfo.email || 'N/A' },
            ].map((row, i) => (
              <div key={i} style={S.successRow}>
                <span style={S.successLabel}>{row.label}</span>
                <span style={{ ...S.successVal, ...(row.color ? { color:row.color, fontWeight:700 } : {}) }}>
                  {row.val}
                </span>
              </div>
            ))}
          </div>

          <div style={S.successSteps}>
            {[
              { icon:'📧', text:'A confirmation email has been sent to your inbox' },
              { icon:'📦', text:'Our team is sourcing and preparing your order' },
              { icon:'🚚', text:'Delivery to Saudi Arabia: 7–21 business days' },
            ].map((s, i) => (
              <div key={i} style={S.successStep}>
                <span>{s.icon}</span>
                <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.85rem' }}>{s.text}</span>
              </div>
            ))}
          </div>

          <a href="/marketplace" style={S.successBtn}>Continue Shopping →</a>
        </div>
      </div>
    </>
  )

  // ── CHECKOUT FORM ─────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Checkout — HUSIN Marketplace</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Navigation />

      <div style={S.page}>

        {/* Steps */}
        <div style={S.steps}>
          {['Details', 'Payment', 'Confirmed'].map((label, i) => (
            <div key={i} style={S.stepWrap}>
              <div style={{ ...S.stepDot,
                ...(step > i+1 ? S.stepDone : step === i+1 ? S.stepActive : S.stepInactive) }}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span style={{ ...S.stepLabel, color: step === i+1 ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                {label}
              </span>
              {i < 2 && <div style={S.stepLine} />}
            </div>
          ))}
        </div>

        <div style={S.layout}>

          {/* ── STEP 1: Customer details ── */}
          {step === 1 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>📋 Your Details</h2>
              <div style={S.fieldGrid}>
                {[
                  { label:'Full Name *',     key:'name',    type:'text',  placeholder:'Ahmed Al-Rashidi' },
                  { label:'Email Address *', key:'email',   type:'email', placeholder:'ahmed@email.com'   },
                  { label:'Phone Number',    key:'phone',   type:'tel',   placeholder:'+966 5X XXX XXXX'  },
                  { label:'City',            key:'city',    type:'text',  placeholder:'Riyadh'             },
                ].map(field => (
                  <div key={field.key} style={S.field}>
                    <label style={S.label}>{field.label}</label>
                    <input
                      style={S.input}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={customerInfo[field.key]}
                      onChange={e => setCustomerInfo(p => ({ ...p, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div style={{ ...S.field, gridColumn:'1/-1' }}>
                  <label style={S.label}>Delivery Address</label>
                  <input style={S.input} type="text"
                    placeholder="Street, District, Building Number"
                    value={customerInfo.address}
                    onChange={e => setCustomerInfo(p => ({ ...p, address: e.target.value }))}
                  />
                </div>
              </div>

              <button
                style={{ ...S.primaryBtn, opacity: customerInfo.name && customerInfo.email ? 1 : 0.5 }}
                disabled={!customerInfo.name || !customerInfo.email}
                onClick={() => setStep(2)}
              >
                Continue to Payment →
              </button>
            </div>
          )}

          {/* ── STEP 2: Payment ── */}
          {step === 2 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>💳 Secure Payment</h2>

              {!paypalReady && !error && (
                <div style={S.payLoadWrap}>
                  <div style={S.payLoadSpinner} />
                  <span style={S.payLoadText}>Initializing secure payment system...</span>
                </div>
              )}

              {error && (
                <div style={S.errorBox}>
                  <span>⚠️</span>
                  <span style={{ flex:1 }}>{error}</span>
                  <button style={S.errorDismiss} onClick={() => setError(null)}>✕</button>
                </div>
              )}

              {paypalReady && (
                <>
                  {/* Card fields */}
                  <div style={S.paySection}>
                    <div style={S.paySectionHead}>
                      <span style={S.paySectionTitle}>Pay by Card</span>
                      <div style={S.cardIcons}>
                        {[
                          { bg:'#1A1F71', label:'VISA',   italic:true },
                          { bg:'#252525', label:'MC',     italic:false },
                          { bg:'#00A651', label:'mada',   italic:false },
                          { bg:'#2E77BC', label:'Amex',   italic:false },
                        ].map((b,i) => (
                          <span key={i} style={{
                            ...S.cardIcon,
                            background: b.bg,
                            fontStyle: b.italic ? 'italic' : 'normal',
                          }}>{b.label}</span>
                        ))}
                      </div>
                    </div>

                    <div style={S.cardFieldWrap}>
                      <label style={S.label}>Card Number</label>
                      <div id="card-number-field" style={S.paypalField} />
                    </div>
                    <div style={S.cardRow}>
                      <div style={S.cardFieldWrap}>
                        <label style={S.label}>Expiry Date</label>
                        <div id="card-expiry-field" style={S.paypalField} />
                      </div>
                      <div style={S.cardFieldWrap}>
                        <label style={S.label}>CVV</label>
                        <div id="card-cvv-field" style={S.paypalField} />
                      </div>
                    </div>

                    <button id="card-pay-btn"
                      style={{ ...S.primaryBtn, ...(processing ? S.btnProcessing : {}) }}
                      disabled={processing}>
                      {processing ? '⏳ Processing...' : `🔒 Pay ${totalSAR} Securely`}
                    </button>
                  </div>

                  {/* Divider */}
                  <div style={S.divider}>
                    <div style={S.dividerLine} />
                    <span style={S.dividerText}>or pay with</span>
                    <div style={S.dividerLine} />
                  </div>

                  {/* PayPal / Apple Pay / Google Pay */}
                  <div id="paypal-buttons-container" style={{ minHeight:50 }} />
                </>
              )}

              <button style={S.backBtn} onClick={() => { setStep(1); setPaypalReady(false) }}>
                ← Back to Details
              </button>
            </div>
          )}

          {/* ── ORDER SUMMARY (right column) ── */}
          <div style={S.summaryCol}>
            <div style={S.summaryCard}>
              <h3 style={S.summaryTitle}>Order Summary</h3>

              <div style={S.summaryProduct}>
                {product?.image && (
                  <img src={product.image} alt={product.name} style={S.summaryImg}
                    onError={e => { e.target.style.display='none' }} />
                )}
                <div style={S.summaryProductInfo}>
                  <p style={S.summaryProductName}>{product?.name}</p>
                  {product?.specifications && (
                    <p style={S.summaryProductSpec}>{product.specifications}</p>
                  )}
                  <p style={S.summaryQty}>Qty: {quantity}</p>
                </div>
              </div>

              <div style={S.priceSummary}>
                <div style={S.priceRow}>
                  <span style={S.priceLabel}>Unit Price</span>
                  <span style={S.priceVal}>{product?.sellingPriceSAR?.toLocaleString('en-SA')} SAR</span>
                </div>
                {quantity > 1 && <div style={S.priceRow}>
                  <span style={S.priceLabel}>Quantity</span>
                  <span style={S.priceVal}>× {quantity}</span>
                </div>}
                <div style={S.priceRow}>
                  <span style={S.priceLabel}>Shipping</span>
                  <span style={{ ...S.priceVal, color:'#2ecc71' }}>Free</span>
                </div>
                <div style={S.totalRow}>
                  <span style={S.totalLabel}>Total</span>
                  <span style={S.totalVal}>{totalSAR}</span>
                </div>
                {/* USD equivalent intentionally removed — SAR-only customer-facing UI (spec Part 1 & 5) */}
              </div>

              <div style={S.summaryTrust}>
                {['🔒 SSL Encrypted', '↩️ 14-Day Returns', '🚚 KSA Delivery'].map((t,i) => (
                  <div key={i} style={S.trustRow}>
                    <span style={S.trustText}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chSpin { to { transform:rotate(360deg); } }
        input::placeholder { color:rgba(255,255,255,0.25); }
        input:focus { outline:none; border-color:#00d9ff !important; }
        #card-number-field iframe,
        #card-expiry-field iframe,
        #card-cvv-field iframe { width:100% !important; height:44px !important; }
        @media (max-width:768px) {
          .checkout-layout { grid-template-columns:1fr !important; }
        }
      `}</style>
    </>
  )
}

const S = {
  page:         { background:'#050608', minHeight:'100vh', padding:'24px 24px 60px', fontFamily:'Roboto,system-ui,sans-serif', color:'#f4f5f7' },
  loadWrap:     { minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, background:'#050608' },
  loadSpinner:  { width:40, height:40, border:'3px solid rgba(255,255,255,0.1)', borderTopColor:'#00d9ff', borderRadius:'50%', animation:'chSpin 0.8s linear infinite' },
  loadText:     { color:'rgba(255,255,255,0.4)', fontSize:'0.9rem' },
  backLink:     { color:'#00d9ff', textDecoration:'none', fontSize:'0.875rem' },
  steps:        { display:'flex', alignItems:'center', justifyContent:'center', gap:0, maxWidth:400, margin:'0 auto 32px' },
  stepWrap:     { display:'flex', alignItems:'center', gap:8 },
  stepDot:      { width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.82rem', fontWeight:700, flexShrink:0 },
  stepActive:   { background:'#00d9ff', color:'#000' },
  stepDone:     { background:'#2ecc71', color:'#000' },
  stepInactive: { background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.1)' },
  stepLabel:    { fontSize:'0.75rem', whiteSpace:'nowrap' },
  stepLine:     { width:40, height:1, background:'rgba(255,255,255,0.1)', flexShrink:0 },
  layout:       { display:'grid', gridTemplateColumns:'1fr 380px', gap:24, maxWidth:1100, margin:'0 auto', alignItems:'start' },
  card:         { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:28, display:'flex', flexDirection:'column', gap:20 },
  cardTitle:    { color:'#fff', fontSize:'1.1rem', fontWeight:700, margin:0 },
  fieldGrid:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  field:        { display:'flex', flexDirection:'column', gap:6 },
  label:        { color:'rgba(255,255,255,0.5)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 },
  input:        { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'12px 14px', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit', transition:'border-color 0.2s' },
  primaryBtn:   { background:'linear-gradient(135deg,#00d9ff,#0099bb)', color:'#000', border:'none', borderRadius:10, padding:'15px 24px', fontSize:'0.95rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', width:'100%', transition:'opacity 0.2s' },
  btnProcessing:{ background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)', cursor:'not-allowed' },
  backBtn:      { background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'10px 16px', color:'rgba(255,255,255,0.5)', fontSize:'0.82rem', cursor:'pointer', fontFamily:'inherit', textAlign:'left', width:'fit-content' },
  payLoadWrap:  { display:'flex', alignItems:'center', gap:12, padding:'20px 0' },
  payLoadSpinner:{ width:24, height:24, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#00d9ff', borderRadius:'50%', animation:'chSpin 0.8s linear infinite', flexShrink:0 },
  payLoadText:  { color:'rgba(255,255,255,0.45)', fontSize:'0.85rem' },
  paySection:   { display:'flex', flexDirection:'column', gap:14 },
  paySectionHead:{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 },
  paySectionTitle:{ color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' },
  cardIcons:    { display:'flex', gap:6 },
  cardIcon:     { display:'inline-flex', alignItems:'center', justifyContent:'center', height:22, padding:'0 8px', borderRadius:3, fontSize:'0.65rem', fontWeight:700, color:'#fff', whiteSpace:'nowrap' },
  cardFieldWrap:{ display:'flex', flexDirection:'column', gap:6 },
  paypalField:  { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'0 14px', minHeight:44, display:'flex', alignItems:'center', overflow:'hidden' },
  cardRow:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  divider:      { display:'flex', alignItems:'center', gap:12 },
  dividerLine:  { flex:1, height:1, background:'rgba(255,255,255,0.07)' },
  dividerText:  { color:'rgba(255,255,255,0.3)', fontSize:'0.72rem', whiteSpace:'nowrap' },
  errorBox:     { background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.25)', borderRadius:8, padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:10, color:'#e74c3c', fontSize:'0.85rem' },
  errorDismiss: { background:'transparent', border:'none', color:'#e74c3c', cursor:'pointer', marginLeft:'auto', fontSize:'0.9rem', padding:4 },
  summaryCol:   {},
  summaryCard:  { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:24, position:'sticky', top:80 },
  summaryTitle: { color:'#fff', fontSize:'0.95rem', fontWeight:700, margin:'0 0 18px' },
  summaryProduct:{ display:'flex', gap:14, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:16 },
  summaryImg:   { width:72, height:72, objectFit:'contain', background:'#fff', borderRadius:8, padding:4, flexShrink:0 },
  summaryProductInfo:{ display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:0 },
  summaryProductName:{ color:'#fff', fontSize:'0.82rem', fontWeight:500, margin:0, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  summaryProductSpec:{ color:'rgba(255,255,255,0.35)', fontSize:'0.72rem', margin:0 },
  summaryQty:   { color:'rgba(255,255,255,0.45)', fontSize:'0.72rem', margin:0 },
  priceSummary: { display:'flex', flexDirection:'column', gap:8, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:16 },
  priceRow:     { display:'flex', justifyContent:'space-between', alignItems:'center' },
  priceLabel:   { color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' },
  priceVal:     { color:'rgba(255,255,255,0.8)', fontSize:'0.8rem' },
  totalRow:     { display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.08)' },
  totalLabel:   { color:'#fff', fontSize:'0.9rem', fontWeight:700 },
  totalVal:     { color:'#c8a46d', fontSize:'1.1rem', fontWeight:700 },
  usdNote:      { color:'rgba(255,255,255,0.25)', fontSize:'0.7rem', margin:'2px 0 0', textAlign:'right' },
  summaryTrust: { display:'flex', flexDirection:'column', gap:8 },
  trustRow:     { display:'flex', alignItems:'center', gap:8 },
  trustText:    { color:'rgba(255,255,255,0.4)', fontSize:'0.75rem' },
  successWrap:  { background:'#050608', minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', fontFamily:'Roboto,system-ui,sans-serif' },
  successCard:  { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'48px 36px', maxWidth:500, width:'100%', textAlign:'center' },
  successIcon:  { fontSize:52, marginBottom:16 },
  successTitle: { color:'#fff', fontSize:'1.6rem', fontWeight:700, margin:'0 0 10px' },
  successSub:   { color:'rgba(255,255,255,0.5)', fontSize:'0.9rem', margin:'0 0 28px', lineHeight:1.7 },
  successDetails:{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:16, marginBottom:24, textAlign:'left' },
  successRow:   { display:'flex', justifyContent:'space-between', gap:12, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  successLabel: { color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' },
  successVal:   { color:'rgba(255,255,255,0.85)', fontSize:'0.8rem', textAlign:'right', maxWidth:'60%', wordBreak:'break-all' },
  successSteps: { display:'flex', flexDirection:'column', gap:10, marginBottom:24, textAlign:'left' },
  successStep:  { display:'flex', alignItems:'flex-start', gap:10, color:'rgba(255,255,255,0.55)', fontSize:'0.82rem' },
  successBtn:   { display:'inline-block', background:'#00d9ff', color:'#000', borderRadius:10, padding:'13px 28px', fontSize:'0.95rem', fontWeight:700, textDecoration:'none' },
}
