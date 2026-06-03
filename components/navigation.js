/**
 * HUSIN — Navigation — v3 FINAL
 * Fixes:
 * ✅ Sign In button always visible — no overflow
 * ✅ Language toggle visible on desktop
 * ✅ Compact layout for narrow desktop screens
 * ✅ Mobile hamburger with Sign In inside menu
 */

import React, { useState } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/community',   label: 'Community'   },
  { href: '/ai-pro',      label: 'AI Pro'      },
  { href: '/education',   label: 'Education'   },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/streams',     label: 'Streams'     },
]

const Navigation = (props) => {
  const [langOpen,   setLangOpen]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className={`nav-wrap ${props.rootClassName || ''}`}>
      <div className="nav-inner">

        {/* Logo */}
        <Link href="/"><a className="nav-logo">
          <img src="/main%20logo-200h-200h.png" alt="HUSIN"
            className="nav-logo-img"
            onError={e => { e.target.style.display='none' }} />
        </a></Link>

        {/* Desktop links */}
        <div className="nav-links">
          {NAV_LINKS.map(lnk => (
            <Link key={lnk.href} href={lnk.href}>
              <a className="nav-link">{lnk.label}</a>
            </Link>
          ))}
        </div>

        {/* Desktop right actions */}
        <div className="nav-actions">

          {/* Language toggle */}
          <div className="lang-wrap">
            <button className="lang-btn" onClick={() => setLangOpen(!langOpen)}>
              🌐 <span className="lang-en">EN</span>
              <span className="lang-sep">|</span>
              <span className="lang-ar">العربية</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ marginLeft:3, transform: langOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {langOpen && (
              <div className="lang-drop">
                <button className="lang-opt lang-opt-active" onClick={() => setLangOpen(false)}>🇬🇧 English</button>
                <button className="lang-opt lang-opt-soon" onClick={() => setLangOpen(false)}>
                  🇸🇦 العربية <span className="soon-badge">قريباً</span>
                </button>
              </div>
            )}
          </div>

          {/* Connect Wallet */}
          <button className="nav-wallet">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
            </svg>
            <span>Connect</span>
          </button>

          {/* Sign In */}
          <button className="nav-signin">Sign In</button>
        </div>

        {/* Mobile hamburger */}
        <button className="nav-ham" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen
              ? <path d="M18 6L6 18M6 6l12 12"/>
              : <path d="M3 12h18M3 6h18M3 18h18"/>}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="nav-mobile">
          {NAV_LINKS.map(lnk => (
            <Link key={lnk.href} href={lnk.href}>
              <a className="nav-mobile-link" onClick={() => setMobileOpen(false)}>{lnk.label}</a>
            </Link>
          ))}
          <div className="nav-mobile-divider" />
          <div className="nav-mobile-actions">
            <button className="nav-wallet nav-wallet-mobile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
              </svg>
              Connect Wallet
            </button>
            <button className="nav-signin">Sign In</button>
          </div>
          <div className="nav-mobile-lang">
            <span>🌐 EN</span>
            <span style={{ color:'rgba(255,255,255,0.2)', margin:'0 6px' }}>|</span>
            <span style={{ opacity:0.4 }}>العربية (قريباً)</span>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ── Wrapper ── */
        .nav-wrap {
          position: sticky;
          top: 0;
          z-index: 200;
          background: rgba(5,6,8,0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          width: 100%;
        }
        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 60px;
          max-width: 1400px;
          margin: 0 auto;
          gap: 16px;
        }

        /* ── Logo ── */
        .nav-logo { display:flex; align-items:center; text-decoration:none; flex-shrink:0; }
        .nav-logo-img { height:36px; width:auto; object-fit:contain; }

        /* ── Nav links ── */
        .nav-links {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          justify-content: center;
        }
        .nav-link {
          color: rgba(255,255,255,0.65);
          font-size: 0.82rem;
          padding: 7px 10px;
          border-radius: 6px;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.2s, background 0.2s;
        }
        .nav-link:hover { color:#fff; background:rgba(255,255,255,0.06); }

        /* ── Actions ── */
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        /* Language toggle */
        .lang-wrap { position:relative; }
        .lang-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          padding: 5px 9px;
          font-size: 0.72rem;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .lang-btn:hover { border-color:rgba(200,164,109,0.4); color:#c8a46d; }
        .lang-en  { font-weight:600; }
        .lang-sep { color:rgba(255,255,255,0.2); margin:0 2px; }
        .lang-ar  { font-family:'Noto Sans Arabic',Arial,sans-serif; font-size:0.78rem; }
        .lang-drop {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: #0f1117;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 6px;
          min-width: 150px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.6);
          z-index: 300;
        }
        .lang-opt {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.7);
          padding: 9px 12px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 0.82rem;
          font-family: inherit;
          transition: background 0.15s;
          text-align: left;
        }
        .lang-opt:hover { background:rgba(255,255,255,0.06); }
        .lang-opt-active { color:#00d9ff !important; }
        .lang-opt-soon   { opacity:0.5; cursor:default; }
        .lang-opt-soon:hover { background:transparent; }
        .soon-badge { font-size:0.65rem; background:rgba(200,164,109,0.15); color:#c8a46d; border:1px solid rgba(200,164,109,0.25); padding:2px 6px; border-radius:20px; }

        /* Wallet button */
        .nav-wallet {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          padding: 6px 12px;
          font-size: 0.75rem;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .nav-wallet:hover { background:rgba(255,255,255,0.08); color:#fff; }
        .nav-wallet-mobile { width:100%; justify-content:center; padding:10px; font-size:0.875rem; }

        /* Sign In */
        .nav-signin {
          background: rgba(200,164,109,0.12);
          border: 1px solid rgba(200,164,109,0.3);
          color: #c8a46d;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.75rem;
          font-family: inherit;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .nav-signin:hover { background:rgba(200,164,109,0.2); }

        /* Hamburger — hidden on desktop */
        .nav-ham {
          display: none;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          padding: 6px;
          cursor: pointer;
          flex-shrink: 0;
        }

        /* Mobile menu */
        .nav-mobile {
          background: #0a0e1a;
          border-top: 1px solid rgba(255,255,255,0.07);
          padding: 12px 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .nav-mobile-link {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          padding: 12px 8px;
          font-size: 0.95rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: block;
          transition: color 0.2s;
        }
        .nav-mobile-link:hover { color:#fff; }
        .nav-mobile-divider { height:1px; background:rgba(255,255,255,0.06); margin:8px 0; }
        .nav-mobile-actions {
          display: flex;
          gap: 10px;
          padding: 8px 0;
        }
        .nav-mobile-lang {
          color: rgba(255,255,255,0.4);
          font-size: 0.8rem;
          padding: 10px 8px 2px;
          font-family: 'Noto Sans Arabic', Arial, sans-serif;
        }

        /* ── Breakpoints ── */
        /* Compact desktop — reduce nav link text */
        @media (max-width:1100px) {
          .nav-link { font-size:0.78rem; padding:6px 8px; }
          .nav-inner { gap:12px; }
        }

        /* Tablet — hide desktop links + actions, show hamburger */
        @media (max-width:900px) {
          .nav-links  { display:none; }
          .nav-actions { display:none; }
          .nav-ham    { display:flex; }
        }
      `}</style>
    </nav>
  )
}

export default Navigation
