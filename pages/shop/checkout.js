import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Navigation from '../../components/navigation'

export default function CheckoutPage() {
  const [product,      setProduct]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [paypalReady,  setPaypalReady]  = useState(false)
  const [processing,   setProcessing]   = useState(false)
  const [error,        setError]        = useState(null)
  const [step,         setStep]         = useState(1)
  const [orderId,      setOrderId]      = useState(null)
  const [customerInfo, setCustomerInfo] = useState({
    name: '', email: '', phone: '', address: '', city: '', country: 'SA'
  })
  const paypalOrderId = useRef(null)
  const husinsOrderId = useRef(null)

  const [productId, setProductId] = useState(null)
  const [quantity,  setQuantity]  = useState(1)
  const [variant,   setVariant]   = useState({ color: null, size: null })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pid    = params.get('productId')
    const qty    = parseInt(params.get('quantity') || '1')
    const vColor = params.get('variantColor')
    const vSize  = params.get('variantSize')
    setProductId(pid)
    setQuantity(qty)
    setVariant({ color: vColor || null, size: vSize || null })

    if (!pid) {
      setError('No product selected.')
      setLoading(false)
      return
    }

    fetch(`/api/shop/product-details?productId=${pid}`)
      .then(r => r.json())
      .then(d => {
        setProduct(d.product)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load product.')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (step !== 2 || paypalReady || !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) return

    const script    = document.createElement('script')
    script.src      = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&components=buttons,card-fields&intent=capture`
    script.async    = true
    script.onload   = () => initPayPal()
    script.onerror  = () => setError('Failed to load payment system. Please refresh.')
    document.head.appendChild(script)

    return () => {
      try { document.head.removeChild(script) } catch (e) {}
    }
  }, [step])

  async function initPayPal() {
    try {
      const res  = await fetch('/api/shop/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          productId,
          quantity,
          customerInfo,
          selectedVariant: variant,
        }),
      })
      const data = await res.json()
      if (!data.orderId && !data.paypalOrderId) throw new Error(data.error || 'Failed to create order')

      paypalOrderId.current = data.paypalOrderId || data.orderId
      husinsOrderId.current = data.husinsOrderId
      setPaypalReady(true)

      const paypal = window.paypal
      if (!paypal) return

      if (paypal.CardFields) {
        const cardFields = paypal.CardFields({
          createOrder:  () => paypalOrderId.current,
          onApprove:    async (data) => {
            setProcessing(true)
            const res = await fetch('/api/shop/capture-order', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                paypalOrderId: data.orderID,
                husinsOrderId: husinsOrderId.current,
                productId,
                quantity,
                customerInfo,
                selectedVariant: variant,
              }),
            })
            const result = await res.json()
            if (result.success) {
              setOrderId(result.orderId)
              setStep(3)
            } else {
              setError('Payment failed. Please try again.')
            }
            setProcessing(false)
          },
          onError: () => setError('Card payment failed. Please check your details and try again.'),
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

          document.getElementById('card-pay-btn').addEventListener('click', async () => {
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

      paypal.Buttons({
        style: {
          layout:  'vertical',
          color:   'black',
          shape:   'rect',
          label:   'pay',
          height:  48,
        },
        createOrder: () => paypalOrderId.current,
        onApprove:   async (data) => {
          setProcessing(true)
          const res  = await fetch('/api/shop/capture-order', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              paypalOrderId: data.orderID,
              husinsOrderId: husinsOrderId.current,
              productId,
              quantity,
              customerInfo,
              selectedVariant: variant,
            }),
          })
          const result = await res.json()
          if (result.success) {
            setOrderId(result.orderId)
            setStep(3)
          } else {
            setError('Payment processing failed. Please try again.')
          }
          setProcessing(false)
        },
        onError: (err) => {
          setError('Payment failed. Please try again or use a different payment method.')
          console.error('[PayPal Buttons]', err)
        },
        onCancel: () => setError('Payment cancelled. You can try again below.'),
      }).render('#paypal-buttons-container')

    } catch (err) {
      setError(err.message || 'Failed to initialize payment.')
      console.error('[initPayPal]', err)
    }
  }

  const totalSAR = product ? (product.sellingPriceSAR * quantity).toLocaleString('en-SA', { maximumFractionDigits: 0 }) + ' SAR' : ''

  if (loading) return (
    <>
      <Navigation />
      <div style={S.loadWrap}>
        <div style={S.loadSpinner} />
        <p style={S.loadText}>Loading checkout...</p>
      </div>
    </>
  )

  if (!product && !loading) return (
    <>
      <Navigation />
      <div style={S.loadWrap}>
        <p style={{ color:'#e74c3c', fontSize:'1rem' }}>{error || 'Product not found.'}</p>
        <a href="/marketplace" style={S.backLink}>← Back to Marketplace</a>
      </div>
    </>
  )

  if (step === 3) return (
    <>
      <Head><title>Order Confirmed — HUSIN</title></Head>
      <Navigation />
      <div style={S.successWrap}>
        <div style={S.successCard}>
          <div style={S.successIcon}>✅</div>
          <h1 style={S.successTitle}>Order Confirmed!</h1>
          <p style={S.successSub}>
            Thank you{customerInfo.name ? `, ${customerInfo.name.split(' ')[0]}` : ''}!
            Your payment was successful.
          </p>
          <div style={S.successDetails}>
            <div style={S.successRow}>
              <span style={S.successLabel}>Order ID</span>
              <span style={S.successVal}>{orderId}</span>
            </div>
            <div style={S.successRow}>
              <span style={S.successLabel}>Product</span>
              <span style={S.successVal}>{product?.name?.substring(0,50)}</span>
            </div>
            <div style={S.successRow}>
              <span style={S.successLabel}>Amount Paid</span>
              <span style={{ ...S.successVal, color:'#2ecc71', fontWeight:700 }}>{totalSAR}</span>
            </div>
            {customerInfo.email && (
              <div style={S.successRow}>
                <span style={S.successLabel}>Email</span>
                <span style={S.successVal}>{customerInfo.email}</span>
              </div>
            )}
          </div>
          <div style={S.successSteps}>
            {[
              { icon:'📦', text:'We are preparing your order for shipment' },
              { icon:'📧', text:'A confirmation will be sent to your email' },
              { icon:'🚚', text:'Your item will be delivered to your address in Saudi Arabia' },
            ].map((s,i) => (
              <div key={i} style={S.successStep}>
                <span>{s.icon}</span><span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.85rem' }}>{s.text}</span>
              </div>
            ))}
          </div>
          <a href="/marketplace" style={S.successBtn}>Continue Shopping →</a>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Head>
        <title>Checkout — HUSIN Marketplace</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Navigation />

      <div style={S.page}>

        <div style={S.steps}>
          {['Details','Payment','Confirmed'].map((label, i) => (
            <div key={i} style={S.stepWrap}>
              <div style={{ ...S.stepDot, ...(step > i+1 ? S.stepDone : step === i+1 ? S.stepActive : S.stepInactive) }}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span style={{ ...S.stepLabel, color: step === i+1 ? '#fff' : 'rgba(255,255,255,0.3)' }}>{label}</span>
              {i < 2 && <div style={S.stepLine} />}
            </div>
          ))}
        </div>

        <div style={S.layout}>

          <div style={S.formCol}>

            {step === 1 && (
              <div style={S.card}>
                <h2 style={S.cardTitle}>📋 Your Details</h2>

                <div style={S.fieldGrid}>
                  <div style={S.field}>
                    <label style={S.label}>Full Name *</label>
                    <input style={S.input} type="text" placeholder="Ahmed Al-Rashidi"
                      value={customerInfo.name}
                      onChange={e => setCustomerInfo(p => ({...p, name:e.target.value}))} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Email Address *</label>
                    <input style={S.input} type="email" placeholder="ahmed@email.com"
                      value={customerInfo.email}
                      onChange={e => setCustomerInfo(p => ({...p, email:e.target.value}))} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Phone Number</label>
                    <input style={S.input} type="tel" placeholder="+966 5X XXX XXXX"
                      value={customerInfo.phone}
                      onChange={e => setCustomerInfo(p => ({...p, phone:e.target.value}))} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>City</label>
                    <input style={S.input} type="text" placeholder="Riyadh"
                      value={customerInfo.city}
                      onChange={e => setCustomerInfo(p => ({...p, city:e.target.value}))} />
                  </div>
                  <div style={{ ...S.field, gridColumn:'1/-1' }}>
                    <label style={S.label}>Delivery Address</label>
                    <input style={S.input} type="text" placeholder="Street, District, Building"
                      value={customerInfo.address}
                      onChange={e => setCustomerInfo(p => ({...p, address:e.target.value}))} />
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
                    <span>{error}</span>
                    <button style={S.errorDismiss} onClick={() => setError(null)}>✕</button>
                  </div>
                )}

                {paypalReady && (
                  <>
                    <div style={S.paySection}>
                      <div style={S.paySectionHead}>
                        <span style={S.paySectionTitle}>Pay by Card</span>
                        <div style={S.cardIcons}>
                          <span style={{...S.cardIcon, background:'#1A1F71'}}>VISA</span>
                          <span style={{...S.cardIcon, background:'#252525'}}>MC</span>
                          <span style={{...S.cardIcon, background:'#00A651'}}>mada</span>
                          <span style={{...S.cardIcon, background:'#2E77BC'}}>Amex</span>
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

                      <button
                        id="card-pay-btn"
                        style={{ ...S.primaryBtn, ...(processing ? S.btnProcessing : {}) }}
                        disabled={processing}
                      >
                        {processing ? '⏳ Processing...' : `🔒 Pay ${totalSAR} Securely`}
                      </button>
                    </div>

                    <div style={S.divider}>
                      <div style={S.dividerLine} />
                      <span style={S.dividerText}>or pay with PayPal</span>
                      <div style={S.dividerLine} />
                    </div>

                    <div id="paypal-buttons-container" style={{ minHeight:50 }} />
                  </>
                )}

                <button style={S.backBtn} onClick={() => setStep(1)}>← Back to Details</button>
              </div>
            )}
          </div>

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
                  {(variant.color || variant.size) && (
                    <p style={S.summaryProductSpec}>
                      {variant.color ? `Color: ${variant.color}` : ''}
                      {variant.color && variant.size ? ' · ' : ''}
                      {variant.size ? `Size: ${variant.size}` : ''}
                    </p>
                  )}
                  <p style={S.summaryQty}>Qty: {quantity}</p>
                </div>
              </div>

              <div style={S.priceSummary}>
                <div style={S.priceRow}>
                  <span style={S.priceLabel}>Unit Price</span>
                  <span style={S.priceVal}>
                    {product?.sellingPriceSAR?.toLocaleString('en-SA')} SAR
                  </span>
                </div>
                {quantity > 1 && (
                  <div style={S.priceRow}>
                    <span style={S.priceLabel}>Quantity</span>
                    <span style={S.priceVal}>× {quantity}</span>
                  </div>
                )}
                <div style={S.priceRow}>
                  <span style={S.priceLabel}>Shipping Fee</span>
                  <span style={S.priceVal}>Calculated at order</span>
                </div>
                <div style={S.totalRow}>
                  <span style={S.totalLabel}>Total</span>
                  <span style={S.totalVal}>{totalSAR}</span>
                </div>
              </div>

              <div style={S.summaryTrust}>
                {[
                  '🔒 SSL Encrypted Payment',
                  '↩️ 14-Day Return Policy',
                  '🚚 Delivery Across Saudi Arabia',
                ].map((t,i) => (
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
      `}</style>
    </>
  )
}

const S = {
  page:         { background:'#050608', minHeight:'100vh', padding:'24px 24px 60px', fontFamily:'Roboto,system-ui,sans-serif', color:'#f4f5f7' },
  loadWrap:     { minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, background:'#050608' },
  loadSpinner:  { width:40, height:40, border:'3px solid rgba(255,255,255,0.1)', borderTopColor:'#00d9ff', borderRadius:'50%', animation:'chSpin 0.8s linear infinite' },
  loadText:     { color:'rgba(255,255,255,0.4)', fontSize:'0.9rem' },
  backLink:     { color:'#00d9ff', textDecoration:'none', fontSize:'0.875rem', marginTop:8 },
  steps:        { display:'flex', alignItems:'center', justifyContent:'center', gap:0, maxWidth:400, margin:'0 auto 32px', padding:'0 24px' },
  stepWrap:     { display:'flex', alignItems:'center', gap:8 },
  stepDot:      { width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.82rem', fontWeight:700, flexShrink:0 },
  stepActive:   { background:'#00d9ff', color:'#000' },
  stepDone:     { background:'#2ecc71', color:'#000' },
  stepInactive: { background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.1)' },
  stepLabel:    { fontSize:'0.75rem', whiteSpace:'nowrap' },
  stepLine:     { width:40, height:1, background:'rgba(255,255,255,0.1)', flexShrink:0 },
  layout:       { display:'grid', gridTemplateColumns:'1fr 380px', gap:24, maxWidth:1100, margin:'0 auto', alignItems:'start' },
  formCol:      {},
  card:         { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:28, display:'flex', flexDirection:'column', gap:20 },
  cardTitle:    { color:'#fff', fontSize:'1.1rem', fontWeight:700, margin:0 },
  fieldGrid:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  field:        { display:'flex', flexDirection:'column', gap:6 },
  label:        { color:'rgba(255,255,255,0.5)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 },
  input:        { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'12px 14px', color:'#fff', fontSize:'0.9rem', fontFamily:'inherit', transition:'border-color 0.2s' },
  primaryBtn:   { background:'linear-gradient(135deg,#00d9ff,#0099bb)', color:'#000', border:'none', borderRadius:10, padding:'15px 24px', fontSize:'0.95rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'opacity 0.2s,transform 0.1s', width:'100%' },
  btnProcessing:{ background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)', cursor:'not-allowed' },
  backBtn:      { background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'10px 16px', color:'rgba(255,255,255,0.5)', fontSize:'0.82rem', cursor:'pointer', fontFamily:'inherit', textAlign:'left', width:'fit-content' },
  payLoadWrap:    { display:'flex', alignItems:'center', gap:12, padding:'20px 0' },
  payLoadSpinner: { width:24, height:24, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#00d9ff', borderRadius:'50%', animation:'chSpin 0.8s linear infinite', flexShrink:0 },
  payLoadText:    { color:'rgba(255,255,255,0.45)', fontSize:'0.85rem' },
  paySection:     { display:'flex', flexDirection:'column', gap:14 },
  paySectionHead: { display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 },
  paySectionTitle:{ color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' },
  cardIcons:      { display:'flex', gap:6 },
  cardIcon:       { display:'inline-flex', alignItems:'center', justifyContent:'center', height:22, padding:'0 8px', borderRadius:3, fontSize:'0.65rem', fontWeight:700, color:'#fff', whiteSpace:'nowrap' },
  cardFieldWrap:  { display:'flex', flexDirection:'column', gap:6 },
  paypalField:    { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'0 14px', minHeight:44, display:'flex', alignItems:'center', overflow:'hidden' },
  cardRow:        { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  divider:      { display:'flex', alignItems:'center', gap:12 },
  dividerLine:  { flex:1, height:1, background:'rgba(255,255,255,0.07)' },
  dividerText:  { color:'rgba(255,255,255,0.3)', fontSize:'0.72rem', whiteSpace:'nowrap' },
  errorBox:     { background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.25)', borderRadius:8, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, color:'#e74c3c', fontSize:'0.85rem' },
  errorDismiss: { background:'transparent', border:'none', color:'#e74c3c', cursor:'pointer', marginLeft:'auto', fontSize:'0.9rem', padding:4 },
  summaryCard:        { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:24, position:'sticky', top:80 },
  summaryTitle:       { color:'#fff', fontSize:'0.95rem', fontWeight:700, margin:'0 0 18px' },
  summaryProduct:     { display:'flex', gap:14, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:16 },
  summaryImg:         { width:72, height:72, objectFit:'contain', background:'#fff', borderRadius:8, padding:4, flexShrink:0 },
  summaryProductInfo: { display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:0 },
  summaryProductName: { color:'#fff', fontSize:'0.82rem', fontWeight:500, margin:0, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  summaryProductSpec: { color:'rgba(255,255,255,0.35)', fontSize:'0.72rem', margin:0 },
  summaryQty:         { color:'rgba(255,255,255,0.45)', fontSize:'0.72rem', margin:0 },
  priceSummary:       { display:'flex', flexDirection:'column', gap:8, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:16 },
  priceRow:           { display:'flex', justifyContent:'space-between', alignItems:'center' },
  priceLabel:         { color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' },
  priceVal:           { color:'rgba(255,255,255,0.8)', fontSize:'0.8rem' },
  totalRow:           { display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.08)' },
  totalLabel:         { color:'#fff', fontSize:'0.9rem', fontWeight:700 },
  totalVal:           { color:'#c8a46d', fontSize:'1.1rem', fontWeight:700 },
  summaryTrust:       { display:'flex', flexDirection:'column', gap:8 },
  trustRow:           { display:'flex', alignItems:'center', gap:8 },
  trustText:          { color:'rgba(255,255,255,0.4)', fontSize:'0.75rem' },
  successWrap:    { background:'#050608', minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', fontFamily:'Roboto,system-ui,sans-serif' },
  successCard:    { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'48px 36px', maxWidth:500, width:'100%', textAlign:'center' },
  successIcon:    { fontSize:52, marginBottom:16 },
  successTitle:   { color:'#fff', fontSize:'1.6rem', fontWeight:700, margin:'0 0 10px' },
  successSub:     { color:'rgba(255,255,255,0.5)', fontSize:'0.9rem', margin:'0 0 28px', lineHeight:1.6 },
  successDetails: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:16, marginBottom:24, textAlign:'left' },
  successRow:     { display:'flex', justifyContent:'space-between', gap:12, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  successLabel:   { color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' },
  successVal:     { color:'rgba(255,255,255,0.85)', fontSize:'0.8rem', textAlign:'right', maxWidth:'60%', wordBreak:'break-all' },
  successSteps:   { display:'flex', flexDirection:'column', gap:10, marginBottom:24, textAlign:'left' },
  successStep:    { display:'flex', alignItems:'flex-start', gap:10, color:'rgba(255,255,255,0.55)', fontSize:'0.82rem' },
  successBtn:     { display:'inline-block', background:'#00d9ff', color:'#000', borderRadius:10, padding:'13px 28px', fontSize:'0.95rem', fontWeight:700, textDecoration:'none' },
}
