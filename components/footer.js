/**
 * HUSIN — Footer Component
 * UPDATED:
 * 1. Saudi payment badges: Mada, Apple Pay, STC Pay, Visa, Mastercard
 * 2. Saudi Ministry of Commerce compliance section
 * 3. CR Number, Maroof ID placeholders
 * 4. Terms, Privacy, Return Policy links
 * 5. Maintains dark premium cyberpunk theme
 */

import React from 'react'
import Link  from 'next/link'

const Footer = (props) => {
  return (
    <footer className="footer-wrapper">

      {/* ── Payment badges row ───────────────────────────────────────────── */}
      <div className="footer-payments">
        <div className="footer-payments-inner">
          <span className="footer-payments-label">Accepted Payments</span>
          <div className="footer-payments-badges">

            {/* Mada */}
            <div className="payment-badge" title="Mada">
              <svg viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="32" rx="4" fill="#00A651"/>
                <text x="40" y="21" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">mada</text>
              </svg>
            </div>

            {/* Visa */}
            <div className="payment-badge" title="Visa">
              <svg viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="32" rx="4" fill="#1A1F71"/>
                <text x="40" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial" fontStyle="italic">VISA</text>
              </svg>
            </div>

            {/* Mastercard */}
            <div className="payment-badge" title="Mastercard">
              <svg viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="32" rx="4" fill="#252525"/>
                <circle cx="30" cy="16" r="10" fill="#EB001B"/>
                <circle cx="50" cy="16" r="10" fill="#F79E1B"/>
                <path d="M40 8.3a10 10 0 0 1 0 15.4A10 10 0 0 1 40 8.3z" fill="#FF5F00"/>
              </svg>
            </div>

            {/* Apple Pay */}
            <div className="payment-badge" title="Apple Pay">
              <svg viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="32" rx="4" fill="#000000" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                <text x="40" y="14" textAnchor="middle" fill="white" fontSize="7" fontFamily="Arial"></text>
                <text x="40" y="22" textAnchor="middle" fill="white" fontSize="11" fontWeight="500" fontFamily="-apple-system,Arial">Apple Pay</text>
              </svg>
            </div>

            {/* STC Pay */}
            <div className="payment-badge" title="STC Pay">
              <svg viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="32" rx="4" fill="#7B2D8B"/>
                <text x="40" y="14" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">STC</text>
                <text x="40" y="25" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial">Pay</text>
              </svg>
            </div>

            {/* PayPal */}
            <div className="payment-badge" title="PayPal">
              <svg viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="32" rx="4" fill="#003087"/>
                <text x="40" y="22" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Arial">PayPal</text>
              </svg>
            </div>

          </div>
        </div>
      </div>

      {/* ── Main footer grid ─────────────────────────────────────────────── */}
      <div className="footer-main">
        <div className="footer-grid">

          {/* Brand column */}
          <div className="footer-brand">
            <Link href="/">
              <a className="footer-logo-link">
                <img
                  src="/main%20logo-200h-200h.png"
                  alt="HUSIN Nexus"
                  className="footer-logo"
                  onError={e => { e.target.style.display = 'none' }}
                />
              </a>
            </Link>
            <p className="footer-brand-desc">
              Hyper Unified Spacetime Integration Nexus — the convergence of AI, Community, Commerce, and Web3.
            </p>
            <div className="footer-socials">
              <a href="#" className="footer-social" title="Twitter/X">𝕏</a>
              <a href="#" className="footer-social" title="Telegram">✈</a>
              <a href="#" className="footer-social" title="Instagram">◎</a>
            </div>
          </div>

          {/* Platform links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Platform</h4>
            <ul className="footer-links">
              <li><Link href="/marketplace"><a className="footer-link">🛒 Marketplace</a></Link></li>
              <li><Link href="/ai-pro"><a className="footer-link">🤖 AI Pro</a></Link></li>
              <li><Link href="/education"><a className="footer-link">🎓 Education</a></Link></li>
              <li><Link href="/streams"><a className="footer-link">📺 Streams</a></Link></li>
              <li><Link href="/islamic"><a className="footer-link">🕌 Community</a></Link></li>
              <li><Link href="/jobs"><a className="footer-link">💼 Jobs</a></Link></li>
            </ul>
          </div>

          {/* Support links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Support</h4>
            <ul className="footer-links">
              <li><a href="/terms"           className="footer-link">Terms of Service</a></li>
              <li><a href="/privacy"         className="footer-link">Privacy Policy</a></li>
              <li><a href="/returns"         className="footer-link">Return & Refund Policy</a></li>
              <li><a href="/shipping"        className="footer-link">Shipping Policy</a></li>
              <li><a href="/contact"         className="footer-link">Contact Us</a></li>
              <li><a href="/faq"             className="footer-link">FAQ</a></li>
            </ul>
          </div>

          {/* Saudi compliance column */}
          <div className="footer-col">
            <h4 className="footer-col-title">موثوقية وامتثال</h4>
            <div className="footer-compliance">

              {/* Maroof badge */}
              <a
                href="https://maroof.sa"
                target="_blank"
                rel="noreferrer"
                className="footer-trust-badge"
                title="Maroof — Saudi Ministry of Commerce"
              >
                <div className="trust-badge-icon">🏛️</div>
                <div className="trust-badge-text">
                  <span className="trust-badge-title">Maroof Verified</span>
                  <span className="trust-badge-id">ID: [Maroof Placeholder]</span>
                </div>
              </a>

              {/* Ministry of Commerce */}
              <div className="footer-trust-badge footer-trust-badge-static">
                <div className="trust-badge-icon">⚖️</div>
                <div className="trust-badge-text">
                  <span className="trust-badge-title">Ministry of Commerce</span>
                  <span className="trust-badge-id">CR: [CR No. Placeholder]</span>
                </div>
              </div>

              {/* VAT */}
              <div className="footer-trust-badge footer-trust-badge-static">
                <div className="trust-badge-icon">🧾</div>
                <div className="trust-badge-text">
                  <span className="trust-badge-title">VAT Registration</span>
                  <span className="trust-badge-id">VAT: [VAT No. Placeholder]</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────────────── */}
      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <div className="footer-bottom-left">
            <span>© 2026 HUSIN Nexus. All rights reserved.</span>
            <span className="footer-bottom-sep">·</span>
            <span className="footer-bottom-arabic">جميع الحقوق محفوظة</span>
          </div>
          <div className="footer-bottom-right">
            <a href="/terms"   className="footer-bottom-link">Terms</a>
            <span className="footer-bottom-sep">·</span>
            <a href="/privacy" className="footer-bottom-link">Privacy</a>
            <span className="footer-bottom-sep">·</span>
            <a href="/returns" className="footer-bottom-link">Returns</a>
            <span className="footer-bottom-sep">·</span>
            <span className="footer-ksa-badge">🇸🇦 Saudi Arabia</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-wrapper {
          background: #050608;
          border-top: 1px solid rgba(255,255,255,0.07);
          font-family: Roboto, system-ui, sans-serif;
        }

        /* ── Payment badges ── */
        .footer-payments {
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 16px 32px;
        }
        .footer-payments-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .footer-payments-label {
          color: rgba(255,255,255,0.35);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }
        .footer-payments-badges {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .payment-badge {
          height: 28px;
          border-radius: 4px;
          overflow: hidden;
          opacity: 0.85;
          transition: opacity 0.2s, transform 0.2s;
          cursor: default;
        }
        .payment-badge:hover { opacity: 1; transform: translateY(-1px); }
        .payment-badge svg { width: 60px; height: 28px; display: block; }

        /* ── Main grid ── */
        .footer-main {
          padding: 48px 32px 40px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 48px;
        }

        /* Brand */
        .footer-logo-link { display: inline-block; margin-bottom: 16px; }
        .footer-logo { height: 44px; width: auto; object-fit: contain; }
        .footer-brand-desc { color: rgba(255,255,255,0.4); font-size: 0.82rem; line-height: 1.7; margin: 0 0 16px; max-width: 280px; }
        .footer-socials { display: flex; gap: 10px; }
        .footer-social {
          width: 34px; height: 34px; border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.55); font-size: 0.9rem;
          text-decoration: none; transition: all 0.2s;
        }
        .footer-social:hover { background: rgba(200,164,109,0.1); border-color: rgba(200,164,109,0.3); color: #c8a46d; }

        /* Columns */
        .footer-col {}
        .footer-col-title {
          color: rgba(255,255,255,0.7);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0 0 16px;
          font-weight: 600;
        }
        .footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .footer-link { color: rgba(255,255,255,0.45); font-size: 0.85rem; text-decoration: none; transition: color 0.2s; }
        .footer-link:hover { color: #00d9ff; }

        /* Saudi compliance */
        .footer-compliance { display: flex; flex-direction: column; gap: 10px; }
        .footer-trust-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 10px 12px;
          text-decoration: none;
          transition: border-color 0.2s;
        }
        .footer-trust-badge:hover:not(.footer-trust-badge-static) {
          border-color: rgba(200,164,109,0.3);
        }
        .trust-badge-icon { font-size: 18px; flex-shrink: 0; }
        .trust-badge-text { display: flex; flex-direction: column; gap: 2px; }
        .trust-badge-title { color: rgba(255,255,255,0.7); font-size: 0.78rem; font-weight: 600; }
        .trust-badge-id    { color: rgba(255,255,255,0.35); font-size: 0.7rem; }

        /* Bottom bar */
        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 16px 32px;
        }
        .footer-bottom-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .footer-bottom-left {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.3);
          font-size: 0.78rem;
        }
        .footer-bottom-arabic {
          font-family: 'Noto Sans Arabic', Arial, sans-serif;
          color: rgba(255,255,255,0.2);
        }
        .footer-bottom-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .footer-bottom-link {
          color: rgba(255,255,255,0.3);
          font-size: 0.78rem;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-bottom-link:hover { color: rgba(255,255,255,0.65); }
        .footer-bottom-sep { color: rgba(255,255,255,0.15); font-size: 0.75rem; }
        .footer-ksa-badge  { color: rgba(255,255,255,0.35); font-size: 0.78rem; }

        /* Responsive */
        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
          .footer-brand { grid-column: 1 / -1; }
        }
        @media (max-width: 600px) {
          .footer-grid    { grid-template-columns: 1fr; gap: 28px; }
          .footer-main    { padding: 32px 20px; }
          .footer-payments { padding: 14px 20px; }
          .footer-bottom  { padding: 14px 20px; }
          .footer-bottom-inner { flex-direction: column; align-items: flex-start; gap: 8px; }
          .payment-badge svg  { width: 52px; }
        }
      `}</style>
    </footer>
  )
}

export default Footer
