import React from 'react'

const Footer = () => {
  return (
    <footer className="ft">

      <div className="ft-pay">
        <span className="ft-pay-label">Accepted Payments</span>
        <div className="ft-pay-badges">
          <div className="pay-badge pay-mada" title="Mada"><span>mada</span></div>
          <div className="pay-badge pay-visa" title="Visa"><span>VISA</span></div>
          <div className="pay-badge pay-mc" title="Mastercard">
            <div className="mc-circles">
              <span className="mc-r" />
              <span className="mc-o" />
            </div>
          </div>
          <div className="pay-badge pay-apple" title="Apple Pay"><span> Pay</span></div>
          <div className="pay-badge pay-stc" title="STC Pay"><span>STC Pay</span></div>
          <div className="pay-badge pay-paypal" title="PayPal"><span>PayPal</span></div>
          <div className="pay-badge pay-bnpl" title="Tabby / Tamara coming soon"><span>Tabby · Tamara</span></div>
        </div>
      </div>

      <div className="ft-main">

        <div className="ft-brand">
          <a href="/" className="ft-logo-link">
            <img
              src="/main%20logo-200h-200h.png"
              alt="HUSIN"
              className="ft-logo"
              onError={e => { e.target.style.display='none' }}
            />
          </a>
          <p className="ft-brand-desc">
            Hyper Unified Spacetime Integration Nexus — the convergence of AI, Community, Commerce, and Web3.
          </p>
          <div className="ft-socials">
            <a href="#" className="ft-social">𝕏</a>
            <a href="#" className="ft-social">✈</a>
            <a href="#" className="ft-social">◎</a>
          </div>
        </div>

        <div className="ft-col">
          <h4 className="ft-col-title">Platform</h4>
          <div className="ft-links">
            {[
              { href:'/marketplace', label:'🛒 Marketplace'     },
              { href:'/ai-pro',      label:'🤖 AI Pro'          },
              { href:'/education',   label:'🎓 Education'       },
              { href:'/streams',     label:'📺 Streams'         },
              { href:'/islamic',     label:'🕌 Community'       },
              { href:'/jobs',        label:'💼 Jobs'            },
            ].map((lnk, i) => (
              <a key={i} href={lnk.href} className="ft-link">{lnk.label}</a>
            ))}
          </div>
        </div>

        <div className="ft-col">
          <h4 className="ft-col-title">Support</h4>
          <div className="ft-links">
            {[
              { href:'/terms',    label:'Terms of Service'       },
              { href:'/privacy',  label:'Privacy Policy'         },
              { href:'/returns',  label:'Return & Refund Policy' },
              { href:'/shipping', label:'Shipping Policy'        },
              { href:'/contact',  label:'Contact Us'             },
              { href:'/faq',      label:'FAQ'                    },
            ].map((lnk, i) => (
              <a key={i} href={lnk.href} className="ft-link">{lnk.label}</a>
            ))}
          </div>
        </div>

        <div className="ft-col">
          <h4 className="ft-col-title">Compliance</h4>
          <div className="ft-compliance">
            <a href="https://maroof.sa" target="_blank" rel="noreferrer" className="ft-trust">
              <span className="ft-trust-icon">🏛️</span>
              <div>
                <span className="ft-trust-title">Maroof Verified</span>
                <span className="ft-trust-id">ID: {process.env.NEXT_PUBLIC_MAROOF_ID || 'Pending'}</span>
              </div>
            </a>
            <div className="ft-trust">
              <span className="ft-trust-icon">⚖️</span>
              <div>
                <span className="ft-trust-title">Ministry of Commerce</span>
                <span className="ft-trust-id">CR: {process.env.NEXT_PUBLIC_CR_NUMBER || 'Pending'}</span>
              </div>
            </div>
            <div className="ft-trust">
              <span className="ft-trust-icon">🧾</span>
              <div>
                <span className="ft-trust-title">VAT Registration</span>
                <span className="ft-trust-id">VAT: {process.env.NEXT_PUBLIC_VAT_NUMBER || 'Pending'}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="ft-bottom">
        <div className="ft-bottom-in">
          <span className="ft-copy">© 2026 HUSIN. All rights reserved.</span>
          <div className="ft-bottom-links">
            <a href="/terms"   className="ft-bot-link">Terms</a>
            <span className="ft-dot">·</span>
            <a href="/privacy" className="ft-bot-link">Privacy</a>
            <span className="ft-dot">·</span>
            <a href="/returns" className="ft-bot-link">Returns</a>
            <span className="ft-dot">·</span>
            <a href="/shipping" className="ft-bot-link">Shipping</a>
            <span className="ft-dot">·</span>
            <a href="/faq" className="ft-bot-link">FAQ</a>
            <span className="ft-dot">·</span>
            <a href="/contact" className="ft-bot-link">Contact</a>
            <span className="ft-dot">·</span>
            <span className="ft-ksa">🇸🇦 Saudi Arabia</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ft { background:#050608; border-top:1px solid rgba(255,255,255,0.07); font-family:Roboto,system-ui,sans-serif; }
        .ft-pay { background:rgba(255,255,255,0.015); border-bottom:1px solid rgba(255,255,255,0.06); padding:14px 32px; display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
        .ft-pay-label { color:rgba(255,255,255,0.35); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; white-space:nowrap; }
        .ft-pay-badges { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .pay-badge { height:26px; border-radius:4px; display:flex; align-items:center; justify-content:center; padding:0 10px; font-size:0.72rem; font-weight:700; white-space:nowrap; opacity:0.9; transition:opacity 0.2s,transform 0.2s; cursor:default; }
        .pay-badge:hover { opacity:1; transform:translateY(-1px); }
        .pay-mada   { background:#00A651; color:#fff; }
        .pay-visa   { background:#1A1F71; color:#fff; font-style:italic; font-size:0.85rem; }
        .pay-mc     { background:#252525; padding:0 8px; }
        .mc-circles { display:flex; align-items:center; }
        .mc-r { display:block; width:18px; height:18px; border-radius:50%; background:#EB001B; }
        .mc-o { display:block; width:18px; height:18px; border-radius:50%; background:#F79E1B; margin-left:-8px; opacity:0.9; }
        .pay-apple  { background:#000; color:#fff; border:1px solid rgba(255,255,255,0.15); font-size:0.78rem; }
        .pay-stc    { background:#7B2D8B; color:#fff; }
        .pay-paypal { background:#003087; color:#fff; }
        .pay-bnpl   { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.5); border:1px dashed rgba(255,255,255,0.2); }
        .ft-main { display:grid; grid-template-columns:2fr 1fr 1fr 1.4fr; gap:40px; padding:44px 32px 36px; max-width:1400px; margin:0 auto; box-sizing:border-box; }
        .ft-logo-link { display:inline-block; margin-bottom:14px; }
        .ft-logo      { height:42px; width:auto; object-fit:contain; }
        .ft-brand-desc { color:rgba(255,255,255,0.38); font-size:0.8rem; line-height:1.7; margin:0 0 16px; max-width:260px; }
        .ft-socials { display:flex; gap:8px; }
        .ft-social  { width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.5); font-size:0.85rem; text-decoration:none; transition:all 0.2s; }
        .ft-social:hover { background:rgba(200,164,109,0.1); border-color:rgba(200,164,109,0.3); color:#c8a46d; }
        .ft-col-title { color:rgba(255,255,255,0.65); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; margin:0 0 16px; font-weight:600; }
        .ft-links { display:flex; flex-direction:column; gap:9px; }
        .ft-link  { color:rgba(255,255,255,0.42); font-size:0.82rem; text-decoration:none; transition:color 0.2s; }
        .ft-link:hover { color:#00d9ff; }
        .ft-compliance { display:flex; flex-direction:column; gap:9px; }
        .ft-trust { display:flex; align-items:center; gap:9px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:9px 11px; text-decoration:none; transition:border-color 0.2s; }
        .ft-trust:hover { border-color:rgba(200,164,109,0.25); }
        .ft-trust-icon  { font-size:16px; flex-shrink:0; }
        .ft-trust div   { display:flex; flex-direction:column; gap:2px; }
        .ft-trust-title { color:rgba(255,255,255,0.65); font-size:0.75rem; font-weight:600; display:block; }
        .ft-trust-id    { color:rgba(255,255,255,0.3); font-size:0.67rem; display:block; }
        .ft-bottom    { border-top:1px solid rgba(255,255,255,0.06); padding:14px 32px; }
        .ft-bottom-in { max-width:1400px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
        .ft-copy      { color:rgba(255,255,255,0.25); font-size:0.75rem; }
        .ft-bottom-links { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .ft-bot-link  { color:rgba(255,255,255,0.28); font-size:0.75rem; text-decoration:none; transition:color 0.2s; }
        .ft-bot-link:hover { color:rgba(255,255,255,0.6); }
        .ft-dot  { color:rgba(255,255,255,0.15); font-size:0.7rem; }
        .ft-ksa  { color:rgba(255,255,255,0.28); font-size:0.75rem; }
        @media (max-width:1024px) {
          .ft-main { grid-template-columns:1fr 1fr; gap:28px; padding:36px 24px; }
          .ft-brand { grid-column:1/-1; }
        }
        @media (max-width:600px) {
          .ft-main   { grid-template-columns:1fr; gap:24px; padding:28px 16px; }
          .ft-pay    { padding:12px 16px; gap:12px; }
          .ft-bottom { padding:12px 16px; }
          .ft-bottom-in { flex-direction:column; align-items:flex-start; gap:8px; }
        }
      `}</style>
    </footer>
  )
}

export default Footer
