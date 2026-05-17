/**
 * HUSIN ESHOP — Order Confirmation Page /shop/order-confirmation
 * Shown to customer after successful PayPal payment
 */

import Head       from 'next/head'
import { db }     from '../../lib/firebaseAdmin'
import Navigation from '../../components/navigation'
import Footer     from '../../components/footer'

export async function getServerSideProps({ query }) {
  const { orderId } = query
  if (!orderId) return { redirect: { destination: '/marketplace', permanent: false } }

  try {
    const snap = await db.collection('shop_orders').doc(orderId).get()
    if (!snap.exists) return { redirect: { destination: '/marketplace', permanent: false } }

    const order = snap.data()
    if (order.paymentStatus !== 'paid') {
      return { redirect: { destination: '/marketplace', permanent: false } }
    }

    return {
      props: {
        order: {
          orderId:        order.orderId,
          productName:    order.productName,
          sellingPriceSAR:order.sellingPriceSAR,
          priceUSD:       order.priceUSD,
          customerName:   order.customerName  || '',
          customerEmail:  order.customerEmail || '',
          paidAt:         order.paidAt        || '',
        }
      }
    }
  } catch (e) {
    return { redirect: { destination: '/marketplace', permanent: false } }
  }
}

export default function OrderConfirmation({ order }) {
  return (
    <>
      <Head>
        <title>Order Confirmed — HUSIN Marketplace</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Navigation />

      <main style={s.page}>
        <div style={s.card}>
          {/* Success icon */}
          <div style={s.iconWrap}>
            <span style={s.icon}>✅</span>
          </div>

          <h1 style={s.title}>Payment Confirmed!</h1>
          <p style={s.sub}>
            Thank you{order.customerName ? `, ${order.customerName.split(' ')[0]}` : ''}!
            Your order has been received and is being processed.
          </p>

          {/* Order details */}
          <div style={s.details}>
            <div style={s.row}>
              <span style={s.rowLabel}>Order ID</span>
              <span style={s.rowValue}>{order.orderId}</span>
            </div>
            <div style={s.row}>
              <span style={s.rowLabel}>Product</span>
              <span style={s.rowValue}>{order.productName}</span>
            </div>
            <div style={s.row}>
              <span style={s.rowLabel}>Amount Paid</span>
              <span style={{ ...s.rowValue, color: '#2ecc71', fontWeight: 700 }}>
                {order.sellingPriceSAR?.toLocaleString()} SAR
              </span>
            </div>
            {order.customerEmail && (
              <div style={s.row}>
                <span style={s.rowLabel}>Email</span>
                <span style={s.rowValue}>{order.customerEmail}</span>
              </div>
            )}
          </div>

          {/* What happens next */}
          <div style={s.nextSteps}>
            <h3 style={s.nextTitle}>What happens next?</h3>
            {[
              { icon: '📦', text: 'We are preparing your order for shipment' },
              { icon: '📧', text: 'You will receive a confirmation email shortly' },
              { icon: '🚚', text: 'Your item will be delivered to your address' },
              { icon: '💬', text: 'Contact us anytime if you have questions' },
            ].map((step, i) => (
              <div key={i} style={s.step}>
                <span style={s.stepIcon}>{step.icon}</span>
                <span style={s.stepText}>{step.text}</span>
              </div>
            ))}
          </div>

          <a href="/marketplace" style={s.continueBtn}>
            Continue Shopping →
          </a>
        </div>
      </main>

      <Footer />
    </>
  )
}

const s = {
  page:        { background:'var(--color-surface)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' },
  card:        { background:'#0f1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'48px 40px', maxWidth:520, width:'100%', textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.5)' },
  iconWrap:    { width:80, height:80, borderRadius:'50%', background:'rgba(46,204,113,0.12)', border:'2px solid #2ecc71', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' },
  icon:        { fontSize:36 },
  title:       { color:'#fff', fontSize:'1.8rem', fontWeight:700, margin:'0 0 12px', fontFamily:'var(--font-family-heading)' },
  sub:         { color:'rgba(255,255,255,0.55)', fontSize:'0.95rem', lineHeight:1.6, margin:'0 0 32px' },
  details:     { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:20, marginBottom:28, textAlign:'left' },
  row:         { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  rowLabel:    { color:'rgba(255,255,255,0.45)', fontSize:'0.825rem' },
  rowValue:    { color:'rgba(255,255,255,0.85)', fontSize:'0.825rem', textAlign:'right', maxWidth:'60%', wordBreak:'break-all' },
  nextSteps:   { background:'rgba(0,217,255,0.04)', border:'1px solid rgba(0,217,255,0.12)', borderRadius:12, padding:20, marginBottom:28, textAlign:'left' },
  nextTitle:   { color:'rgba(255,255,255,0.7)', fontSize:'0.85rem', fontWeight:600, margin:'0 0 14px', textTransform:'uppercase', letterSpacing:'0.06em' },
  step:        { display:'flex', alignItems:'center', gap:12, marginBottom:10 },
  stepIcon:    { fontSize:18, flexShrink:0 },
  stepText:    { color:'rgba(255,255,255,0.6)', fontSize:'0.85rem', lineHeight:1.5 },
  continueBtn: { display:'inline-block', background:'var(--color-accent)', color:'#000', borderRadius:10, padding:'14px 32px', fontSize:'1rem', fontWeight:700, textDecoration:'none', transition:'opacity 0.2s' },
}
