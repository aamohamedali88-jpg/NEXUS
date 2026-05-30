/**
 * HUSIN — Navigation Component
 * UPDATED:
 * 1. Logo now correctly links back to / (home page)
 * 2. Bilingual EN | العربية toggle added — premium dark styling
 * 3. Logo uses proper <img> tag — no broken alt text rendering
 */

import React, { useState } from 'react'
import Link from 'next/link'

const Navigation = (props) => {
  const [langOpen, setLangOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState('EN')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className={`navigation-wrapper ${props.rootClassName || ''}`}>
      <div className="navigation-container">

        {/* FIXED: Logo now links to / */}
        <Link href="/">
          <a className="navigation-logo-link">
            <img
              alt="HUSIN Nexus"
              src="/main%20logo-200h-200h.png"
              className="navigation-image"
              onError={e => { e.target.style.display = 'none' }}
            />
          </a>
        </Link>

        {/* Desktop menu */}
        <div className="navigation-desktop-menu">
          <ul className="navigation-links-list">
            {[
              { href: '/community',    label: 'Community' },
              { href: '/ai-pro',       label: 'AI Pro'    },
              { href: '/education',    label: 'Education' },
              { href: '/marketplace',  label: 'Marketplace' },
              { href: '/streams',      label: 'Streams'   },
            ].map(link => (
              <li key={link.href} className="navigation-link-item">
                <Link href={link.href}>
                  <a>
                    <div className="navigation-link">
                      <span>{link.label}</span>
                    </div>
                  </a>
                </Link>
              </li>
            ))}
          </ul>

          <div className="navigation-actions">

            {/* BILINGUAL TOGGLE */}
            <div className="lang-toggle-wrap">
              <button
                className="lang-toggle-btn"
                onClick={() => setLangOpen(!langOpen)}
                title="Language / اللغة"
              >
                <span className="lang-icon">🌐</span>
                <span className="lang-current">{currentLang}</span>
                <span className="lang-sep">|</span>
                <span className="lang-arabic">العربية</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4, opacity: 0.5, transform: langOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {langOpen && (
                <div className="lang-dropdown">
                  <button
                    className={`lang-option ${currentLang === 'EN' ? 'lang-option-active' : ''}`}
                    onClick={() => { setCurrentLang('EN'); setLangOpen(false) }}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    className="lang-option lang-option-coming"
                    onClick={() => setLangOpen(false)}
                    title="Arabic support coming soon"
                  >
                    🇸🇦 العربية
                    <span className="lang-soon">قريباً</span>
                  </button>
                </div>
              )}
            </div>

            {/* Connect Wallet */}
            <button className="btn-sm navigation-wallet-btn btn btn-outline">
              <svg fill="none" width="20" xmlns="http://www.w3.org/2000/svg" height="20" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path>
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>
              </svg>
              <span>Connect Wallet</span>
            </button>

            {/* Sign In */}
            <button className="btn-sm btn navigation-signin-btn">
              Sign In
            </button>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="navigation-mobile-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen
              ? <path d="M18 6L6 18M6 6l12 12"/>
              : <path d="M3 12h18M3 6h18M3 18h18"/>
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="navigation-mobile-menu">
          {[
            { href: '/community',   label: 'Community'   },
            { href: '/ai-pro',      label: 'AI Pro'      },
            { href: '/education',   label: 'Education'   },
            { href: '/marketplace', label: 'Marketplace' },
            { href: '/streams',     label: 'Streams'     },
          ].map(link => (
            <Link key={link.href} href={link.href}>
              <a className="navigation-mobile-link" onClick={() => setMobileOpen(false)}>
                {link.label}
              </a>
            </Link>
          ))}
          <div className="navigation-mobile-lang">
            <span>🌐 EN</span>
            <span className="navigation-mobile-lang-sep">|</span>
            <span style={{ opacity: 0.5 }}>العربية (قريباً)</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .navigation-wrapper {
          position: sticky;
          top: 0;
          z-index: 200;
          background: rgba(5, 6, 8, 0.92);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          width: 100%;
        }
        .navigation-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 64px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .navigation-logo-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          flex-shrink: 0;
        }
        .navigation-image {
          height: 40px;
          width: auto;
          object-fit: contain;
        }
        .navigation-desktop-menu {
          display: flex;
          align-items: center;
          gap: 32px;
          flex: 1;
          justify-content: flex-end;
        }
        .navigation-links-list {
          display: flex;
          align-items: center;
          gap: 4px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .navigation-link-item { list-style: none; }
        .navigation-link-item a { text-decoration: none; }
        .navigation-link {
          color: rgba(255,255,255,0.65);
          font-size: 0.875rem;
          padding: 8px 12px;
          border-radius: 6px;
          transition: color 0.2s, background 0.2s;
          cursor: pointer;
          white-space: nowrap;
        }
        .navigation-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.06);
        }
        .navigation-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* ── Language toggle ── */
        .lang-toggle-wrap {
          position: relative;
        }
        .lang-toggle-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          color: rgba(255,255,255,0.75);
          padding: 6px 12px;
          font-size: 0.78rem;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .lang-toggle-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(200,164,109,0.4);
          color: #c8a46d;
        }
        .lang-icon   { font-size: 0.9rem; }
        .lang-sep    { color: rgba(255,255,255,0.25); margin: 0 2px; }
        .lang-arabic { font-family: 'Noto Sans Arabic', 'Arial Arabic', Arial, sans-serif; font-size: 0.82rem; }
        .lang-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #0f1117;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 6px;
          min-width: 160px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.6);
          z-index: 300;
        }
        .lang-option {
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
          font-size: 0.85rem;
          font-family: inherit;
          transition: background 0.15s;
          text-align: left;
        }
        .lang-option:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .lang-option-active { color: #00d9ff !important; background: rgba(0,217,255,0.08) !important; }
        .lang-option-coming { opacity: 0.55; cursor: default; }
        .lang-option-coming:hover { background: transparent; }
        .lang-soon {
          font-size: 0.68rem;
          background: rgba(200,164,109,0.15);
          color: #c8a46d;
          border: 1px solid rgba(200,164,109,0.25);
          padding: 2px 6px;
          border-radius: 20px;
          font-family: 'Noto Sans Arabic', Arial, sans-serif;
        }

        /* ── Wallet & Sign In buttons ── */
        .navigation-wallet-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          font-size: 0.8rem;
          padding: 7px 14px;
        }
        .navigation-signin-btn {
          font-size: 0.8rem;
          padding: 7px 14px;
          background: rgba(200,164,109,0.12);
          border: 1px solid rgba(200,164,109,0.3);
          color: #c8a46d;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .navigation-signin-btn:hover {
          background: rgba(200,164,109,0.2);
        }

        /* ── Mobile ── */
        .navigation-mobile-btn {
          display: none;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          padding: 6px;
          cursor: pointer;
        }
        .navigation-mobile-menu {
          display: none;
          flex-direction: column;
          background: #0a0e1a;
          border-top: 1px solid rgba(255,255,255,0.07);
          padding: 12px 20px 20px;
          gap: 4px;
        }
        .navigation-mobile-link {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          padding: 12px 8px;
          font-size: 0.95rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: block;
        }
        .navigation-mobile-link:hover { color: #fff; }
        .navigation-mobile-lang {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.45);
          font-size: 0.82rem;
          padding: 12px 8px 4px;
        }
        .navigation-mobile-lang-sep { opacity: 0.3; }

        @media (max-width: 900px) {
          .navigation-desktop-menu { display: none; }
          .navigation-mobile-btn   { display: flex; }
          .navigation-mobile-menu  { display: flex; }
          .navigation-container    { padding: 0 20px; }
        }
      `}</style>
    </nav>
  )
}

export default Navigation
