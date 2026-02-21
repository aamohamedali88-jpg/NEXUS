import React from 'react'

import Script from 'dangerous-html/react'
import PropTypes from 'prop-types'
import { useTranslations } from 'next-intl'

const Footer = (props) => {
  return (
    <>
      <div className="footer-container1">
        <footer className="footer-root">
          <div className="footer-container">
            <div className="footer-grid">
              <div className="footer-item">
                <div className="footer-brand">
                  <div className="footer-container2">
                    <img
                      alt={props.imageAlt}
                      src={props.imageSrc}
                      className="footer-image"
                    />
                    <span className="footer-logo-text">
                      HUSIN
                    </span>
                  </div>
                  <p className="section-content footer-description">
                    A comprehensive ecosystem integrating AI, Web3, and
                    community resources.
                  </p>
                </div>
                <div className="footer-stack-info">
                  <div className="footer-stack-badge">
                    <svg
                      fill="none"
                      width="18"
                      xmlns="http://www.w3.org/2000/svg"
                      height="18"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 15V9l7.745 10.65A9 9 0 1 1 19 17.657M15 12V9"></path>
                    </svg>
                    <span>Built with Next.js</span>
                  </div>
                </div>
              </div>
              <div className="footer-item">
                <h2 className="section-subtitle footer-heading">Ecosystem</h2>
                <nav className="footer-nav">
                  <a href="#">
                    <div className="footer-link">
                      <span className="footer-text11">AI Pro Sources</span>
                    </div>
                  </a>
                  <a href="#">
                    <div className="footer-link">
                      <span className="footer-text12">E-Marketplace</span>
                    </div>
                  </a>
                  <a href="#">
                    <div className="footer-link">
                      <span className="footer-text13">
                        Educational Resources
                      </span>
                    </div>
                  </a>
                  <a href="#">
                    <div className="footer-link">
                      <span className="footer-text14">Web3 Dashboard</span>
                    </div>
                  </a>
                </nav>
              </div>
              <div className="footer-item">
                <h2 className="section-subtitle footer-heading">Community</h2>
                <nav className="footer-nav">
                  <a href="#">
                    <div className="footer-link">
                      <span className="footer-text15">Muslim Community</span>
                    </div>
                  </a>
                  <a href="#">
                    <div className="footer-link">
                      <span className="footer-text16">Job Board</span>
                    </div>
                  </a>
                  <a href="#">
                    <div className="footer-link">
                      <span className="footer-text17">Streams &amp; Live</span>
                    </div>
                  </a>
                  <a href="#">
                    <div className="footer-link">
                      <span className="footer-text18">Trending News</span>
                    </div>
                  </a>
                </nav>
              </div>
              <div className="footer-item">
                <h2 className="section-subtitle footer-heading">Integration</h2>
                <div className="footer-tech-grid">
                  <div className="footer-tech-card">
                    <svg
                      fill="none"
                      width="20"
                      xmlns="http://www.w3.org/2000/svg"
                      height="20"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11.453 8.056c0-.623.518-.979 1.442-.979c1.69 0 3.41.343 4.605.923l.5-4c-.948-.449-2.82-1-5.5-1c-1.895 0-3.373.087-4.5 1-1.172.956-2 2.33-2 4c0 3.03 1.958 4.906 5 6c1.961.69 3 .743 3 1.5c0 .735-.851 1.5-2 1.5c-1.423 0-3.963-.609-5.5-1.5l-.5 4c1.321.734 3.474 1.5 6 1.5c2 0 3.957-.468 5.084-1.36C18.347 18.661 19 17.372 19 15.5c0-3.096-1.915-4.547-5-5.637c-1.646-.605-2.544-1.07-2.544-1.807z"></path>
                    </svg>
                    <span>Stripe Payments</span>
                  </div>
                  <div className="footer-tech-card">
                    <svg
                      fill="none"
                      width="20"
                      xmlns="http://www.w3.org/2000/svg"
                      height="20"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12.95 22c-4.503 0-8.445-3.04-9.61-7.413s.737-8.988 4.638-11.25a9.906 9.906 0 0 1 12.008 1.598l-3.335 3.367a5.185 5.185 0 0 0-7.354.013a5.25 5.25 0 0 0 0 7.393a5.185 5.185 0 0 0 7.354.013L20 19.088A9.9 9.9 0 0 1 12.95 22"></path>
                    </svg>
                    <span>Coinbase Crypto</span>
                  </div>
                </div>
              </div>
              <div className="footer-item">
                <h2 className="section-subtitle footer-heading">Connect</h2>
                <div className="footer-social-row">
                  <a href="#">
                    <div aria-label="X" className="footer-social-link">
                      <svg
                        fill="none"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                        height="20"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m4 4l11.733 16H20L8.267 4zm0 16l6.768-6.768m2.46-2.46L20 4"></path>
                      </svg>
                    </div>
                  </a>
                  <a href="#">
                    <div aria-label="Discord" className="footer-social-link">
                      <svg
                        fill="currentColor"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                        height="20"
                        viewBox="0 0 24 24"
                      >
                        <path d="m14.983 3l.123.006c2.014.214 3.527.672 4.966 1.673a1 1 0 0 1 .371.488c1.876 5.315 2.373 9.987 1.451 12.28C20.891 19.452 19.288 21 17.5 21c-.732 0-1.693-.968-2.328-2.045a22 22 0 0 0 2.103-.493a1 1 0 1 0-.55-1.924c-3.32.95-6.13.95-9.45 0a1 1 0 0 0-.55 1.924q1.074.307 2.103.494C8.193 20.031 7.232 21 6.5 21c-1.788 0-3.391-1.548-4.428-3.629c-.888-2.217-.39-6.89 1.485-12.204a1 1 0 0 1 .371-.488C5.367 3.678 6.88 3.22 8.894 3.006a1 1 0 0 1 .935.435l.063.107l.651 1.285l.137-.016a13 13 0 0 1 2.643 0l.134.016l.65-1.284a1 1 0 0 1 .754-.54zM9 10a2 2 0 0 0-1.977 1.697l-.018.154L7 12l.005.15A2 2 0 1 0 9 10m6 0a2 2 0 0 0-1.977 1.697l-.018.154L13 12l.005.15A2 2 0 1 0 15 10"></path>
                      </svg>
                    </div>
                  </a>
                  <a href="#">
                    <div aria-label="LinkedIn" className="footer-social-link">
                      <svg
                        fill="currentColor"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                        height="20"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17 2a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm-9 8a1 1 0 0 0-1 1v5a1 1 0 0 0 2 0v-5a1 1 0 0 0-1-1m6 0a3 3 0 0 0-1.168.236l-.125.057A1 1 0 0 0 11 11v5a1 1 0 0 0 2 0v-3a1 1 0 0 1 2 0v3a1 1 0 0 0 2 0v-3a3 3 0 0 0-3-3M8 7a1 1 0 0 0-.993.883L7 8.01a1 1 0 0 0 1.993.117L9 8a1 1 0 0 0-1-1"></path>
                      </svg>
                    </div>
                  </a>
                  <a href="#">
                    <div aria-label="Github" className="footer-social-link">
                      <svg
                        fill="currentColor"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                        height="20"
                        viewBox="0 0 24 24"
                      >
                        <path d="M5.315 2.1c.791-.113 1.9.145 3.333.966l.272.161l.16.1l.397-.083a13.3 13.3 0 0 1 4.59-.08l.456.08l.396.083l.161-.1c1.385-.84 2.487-1.17 3.322-1.148l.164.008l.147.017l.076.014l.05.011l.144.047a1 1 0 0 1 .53.514a5.2 5.2 0 0 1 .397 2.91l-.047.267l-.046.196l.123.163c.574.795.93 1.728 1.03 2.707l.023.295L21 9.5c0 3.855-1.659 5.883-4.644 6.68l-.245.061l-.132.029l.014.161l.008.157l.004.365l-.002.213L16 21a1 1 0 0 1-.883.993L15 22H9a1 1 0 0 1-.993-.883L8 21v-.734c-1.818.26-3.03-.424-4.11-1.878l-.535-.766c-.28-.396-.455-.579-.589-.644l-.048-.019a1 1 0 0 1 .564-1.918c.642.188 1.074.568 1.57 1.239l.538.769c.76 1.079 1.36 1.459 2.609 1.191L8 17.562l-.018-.168a5 5 0 0 1-.021-.824l.017-.185l.019-.12l-.108-.024c-2.976-.71-4.703-2.573-4.875-6.139l-.01-.31L3 9.5a5.6 5.6 0 0 1 .908-3.051l.152-.222l.122-.163l-.045-.196a5.2 5.2 0 0 1 .145-2.642l.1-.282l.106-.253a1 1 0 0 1 .529-.514l.144-.047z"></path>
                      </svg>
                    </div>
                  </a>
                </div>
              </div>
              <div className="footer-item">
                <h2 className="section-subtitle footer-heading">Status</h2>
                <div className="footer-status-card">
                  <div className="footer-status-pulse"></div>
                  <span className="footer-status-text">
                    All Systems Operational
                  </span>
                </div>
                <div className="footer-legal-links">
                  <a href="#">
                    <div className="footer-link-sm">
                      <span>Privacy Policy</span>
                    </div>
                  </a>
                  <a href="#">
                    <div className="footer-link-sm">
                      <span>Terms of Service</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <div className="footer-copyright">
                <span>
                  HUSIN.2026. All rights reserved. Precision-engineered for the
                  future.
                </span>
              </div>
              <div className="footer-bottom-links">
                <a href="#">
                  <div className="footer-link-sm">
                    <span>Security</span>
                  </div>
                </a>
                <a href="#">
                  <div className="footer-link-sm">
                    <span>Sitemap</span>
                  </div>
                </a>
                <a href="#">
                  <div className="footer-link-sm">
                    <span>Accessibility</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </footer>
        <div className="footer-container3">
          <div className="footer-container4">
            <Script
              html={`<style>
        @keyframes footer-pulse {0% {transform: scale(0.95);
box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7);}
70% {transform: scale(1);
box-shadow: 0 0 0 10px rgba(46, 204, 113, 0);}
100% {transform: scale(0.95);
box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);}}
        </style> `}
            ></Script>
          </div>
        </div>
        <div className="footer-container5">
          <div className="footer-container6">
            <Script
              html={`<script defer data-name="footer-interactivity">
(function(){
  const footerLinks = document.querySelectorAll(".footer-link")

  footerLinks.forEach((link) => {
    link.addEventListener("mouseenter", () => {
      link.style.color = "var(--color-primary)"
    })

    link.addEventListener("mouseleave", () => {
      link.style.color = "var(--color-on-surface-secondary)"
    })
  })

  const socialIcons = document.querySelectorAll(".footer-social-link")
  socialIcons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      const label = icon.getAttribute("aria-label")
      console.log(\`Navigating to HUSIN \${label} community\`)
    })
  })
})()
</script>`}
            ></Script>
          </div>
        </div>
      </div>
      <style jsx>
        {`
          .footer-container1 {
            display: contents;
          }
          .footer-container2 {
            flex: 0 0 auto;
            width: auto;
            height: 73px;
            display: flex;
            align-items: flex-start;
          }
          .footer-image {
            width: 64px;
            height: 51px;
            object-fit: cover;
          }
          
          .footer-text11 {
            font-size: 12px;
          }
          .footer-text12 {
            font-size: 12px;
          }
          .footer-text13 {
            font-size: 12px;
          }
          .footer-text14 {
            font-size: 12px;
          }
          .footer-text15 {
            font-size: 12px;
          }
          .footer-text16 {
            font-size: 12px;
          }
          .footer-text17 {
            font-size: 12px;
          }
          .footer-text18 {
            font-size: 12px;
          }
          .footer-container3 {
            display: none;
          }
          .footer-container4 {
            display: contents;
          }
          .footer-container5 {
            display: none;
          }
          .footer-container6 {
            display: contents;
          }
        `}
      </style>
    </>
  )
}

Footer.defaultProps = {
  imageAlt: 'image',
  imageSrc: '/logo_logo-200h-200h.png',
}

Footer.propTypes = {
  imageAlt: PropTypes.string,
  imageSrc: PropTypes.string,
}

export default Footer

