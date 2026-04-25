import { useState } from 'react'

export default function SubscribeModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!email) {
      setStatus('error')
      setMessage('Please enter your email address.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage("You're in! Welcome to the HUSIN Nexus community.")
        setEmail('')
        setName('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div onClick={handleBackdropClick} style={styles.backdrop}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
        {status === 'success' ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.title}>You're Subscribed!</h2>
            <p style={styles.subtitle}>{message}</p>
            <button onClick={onClose} style={styles.primaryBtn}>Continue to HUSIN</button>
          </div>
        ) : (
          <>
            <div style={styles.header}>
              <div style={styles.badge}>HUSIN NEXUS</div>
              <h2 style={styles.title}>Stay in the Loop</h2>
              <p style={styles.subtitle}>Get early access to new AI tools, community updates, marketplace drops, and exclusive content — delivered to your inbox.</p>
            </div>
            <div style={styles.perks}>
              {['🤖 AI tool releases & beta access', '🕌 Muslim community highlights', '🛒 Marketplace early listings', '📡 Live stream alerts'].map((perk) => (
                <div key={perk} style={styles.perk}>{perk}</div>
              ))}
            </div>
            <div style={styles.form}>
              <input type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
              <input type="email" placeholder="Your email address *" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} style={styles.input} />
              {status === 'error' && <div style={styles.errorMsg}>{message}</div>}
              <button onClick={handleSubmit} disabled={status === 'loading'} style={{ ...styles.primaryBtn, opacity: status === 'loading' ? 0.7 : 1 }}>
                {status === 'loading' ? 'Subscribing...' : 'Subscribe Now →'}
              </button>
              <p style={styles.disclaimer}>No spam. Unsubscribe anytime.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  backdrop: { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'1rem' },
  modal: { position:'relative', backgroundColor:'#0f1117', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'16px', padding:'2.5rem', maxWidth:'440px', width:'100%', boxShadow:'0 25px 60px rgba(0,0,0,0.6)' },
  closeBtn: { position:'absolute', top:'1rem', right:'1rem', background:'rgba(255,255,255,0.08)', border:'none', color:'#aaa', width:'32px', height:'32px', borderRadius:'50%', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' },
  header: { marginBottom:'1.5rem', textAlign:'center' },
  badge: { display:'inline-block', fontSize:'11px', fontWeight:'700', letterSpacing:'0.15em', color:'var(--dl-color-theme-accent1, #6ee7b7)', border:'1px solid var(--dl-color-theme-accent1, #6ee7b7)', borderRadius:'20px', padding:'3px 12px', marginBottom:'1rem' },
  title: { color:'#fff', fontSize:'1.6rem', fontWeight:'700', margin:'0 0 0.5rem', fontFamily:'inherit' },
  subtitle: { color:'rgba(255,255,255,0.6)', fontSize:'0.9rem', lineHeight:'1.6', margin:0 },
  perks: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', marginBottom:'1.5rem' },
  perk: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'0.5rem 0.75rem', fontSize:'0.8rem', color:'rgba(255,255,255,0.75)' },
  form: { display:'flex', flexDirection:'column', gap:'0.75rem' },
  input: { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', padding:'0.75rem 1rem', color:'#fff', fontSize:'0.95rem', outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit' },
  primaryBtn: { background:'var(--dl-color-theme-accent1, #6ee7b7)', color:'#000', border:'none', borderRadius:'8px', padding:'0.85rem 1.5rem', fontSize:'1rem', fontWeight:'700', cursor:'pointer', width:'100%', fontFamily:'inherit', transition:'opacity 0.2s' },
  errorMsg: { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'6px', padding:'0.6rem 0.9rem', color:'#f87171', fontSize:'0.85rem' },
  disclaimer: { color:'rgba(255,255,255,0.35)', fontSize:'0.75rem', textAlign:'center', margin:0 },
  successBox: { textAlign:'center', padding:'1rem 0' },
  successIcon: { width:'56px', height:'56px', borderRadius:'50%', background:'rgba(110,231,183,0.15)', border:'2px solid #6ee7b7', color:'#6ee7b7', fontSize:'1.5rem', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' },
}
