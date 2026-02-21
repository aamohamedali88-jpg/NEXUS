import React from 'react'

import Script from 'dangerous-html/react'
import PropTypes from 'prop-types'
import { useTranslations } from 'next-intl'

const Navigation = (props) => {
  return (
    <>
      <div className={`navigation-container1 ${props.rootClassName} `}>
        <nav className="navigation-wrapper">
          <div className="navigation-container">
            <img
              alt={props.imageAlt}
              src={props.imageSrc}
              className="navigation-image"
            />
            <div className="navigation-desktop-menu">
              <ul className="navigation-links-list">
                <li className="navigation-link-item">
                  <a href="community">
                    <div className="navigation-link">
                      <span>Community</span>
                    </div>
                  </a>
                </li>
                <li className="navigation-link-item">
                  <a href="AI_Tools">
                    <div className="navigation-link">
                      <span>AI Pro</span>
                    </div>
                  </a>
                </li>
                <li className="navigation-link-item">
                  <a href="Homepage">
                    <div className="navigation-link">
                      <span>Education</span>
                    </div>
                  </a>
                </li>
                <li className="navigation-link-item">
                  <a href="Homepage">
                    <div className="navigation-link">
                      <span>Marketplace</span>
                    </div>
                  </a>
                </li>
                <li className="navigation-link-item">
                  <a href="Homepage">
                    <div className="navigation-link">
                      <span>Streams</span>
                    </div>
                  </a>
                </li>
              </ul>
              <div className="navigation-actions">
                <button className="btn-sm navigation-wallet-btn btn btn-outline">
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
                    className="lucide lucide-wallet"
                  >
                    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path>
                    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>
                  </svg>
                  <span className="navigation-text15">Connect Wallet</span>
                </button>
                <a href="Homepage">
                  <div className="btn-primary btn-sm btn">
                    <span className="navigation-text16">Sign In</span>
                  </div>
                </a>
              </div>
            </div>
            <button
              id="mobile-toggle"
              aria-label="Toggle navigation menu"
              aria-expanded="false"
              className="navigation-mobile-toggle"
            >
              <svg
                fill="none"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide-menu lucide"
              >
                <path d="M4 12h16M4 6h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </nav>
        <div id="mobile-overlay" className="navigation-mobile-overlay">
          <div className="navigation-overlay-header">
            <a href="Homepage">
              <div className="navigation-brand-link">
                <span className="navigation-brand-text section-title">
                  HUSIN
                </span>
              </div>
            </a>
            <button
              id="mobile-close"
              aria-label="Close menu"
              className="navigation-mobile-close"
            >
              <svg
                fill="none"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-shield-x"
              >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zm-5.5-3.5l-5 5m0-5l5 5"></path>
              </svg>
            </button>
          </div>
          <div className="navigation-overlay-content">
            <ul className="navigation-overlay-links">
              <li className="navigation-overlay-item">
                <a href="Homepage">
                  <div className="navigation-overlay-link">
                    <span>Community Hub</span>
                  </div>
                </a>
              </li>
              <li className="navigation-overlay-item">
                <a href="Homepage">
                  <div className="navigation-overlay-link">
                    <span>AI Nexus</span>
                  </div>
                </a>
              </li>
              <li className="navigation-overlay-item">
                <a href="Homepage">
                  <div className="navigation-overlay-link">
                    <span>Academy</span>
                  </div>
                </a>
              </li>
              <li className="navigation-overlay-item">
                <a href="Homepage">
                  <div className="navigation-overlay-link">
                    <span>E-Marketplace</span>
                  </div>
                </a>
              </li>
              <li className="navigation-overlay-item">
                <a href="Homepage">
                  <div className="navigation-overlay-link">
                    <span>Jobs &amp; Freelance</span>
                  </div>
                </a>
              </li>
              <li className="navigation-overlay-item">
                <a href="Homepage">
                  <div className="navigation-overlay-link">
                    <span>Nexus News</span>
                  </div>
                </a>
              </li>
              <li className="navigation-overlay-item">
                <a href="Homepage">
                  <div className="navigation-overlay-link">
                    <span>Live Streams</span>
                  </div>
                </a>
              </li>
            </ul>
            <div className="navigation-overlay-actions">
              <button className="navigation-full-width btn-lg btn-accent btn">
                Connect Wallet
              </button>
              <a href="Homepage">
                <div className="navigation-full-width btn-lg btn btn-outline">
                  <span>Sign In</span>
                </div>
              </a>
            </div>
          </div>
        </div>
        <div className="navigation-container2">
          <div className="navigation-container3">
            <Script
              html={`<style>
@media (prefers-reduced-motion: reduce) {
.navigation-wrapper, .navigation-link, .navigation-overlay-link {
  transition: none;
}
}
</style>`}
            ></Script>
          </div>
        </div>
        <div className="navigation-container4">
          <div className="navigation-container5">
            <Script
              html={`<script defer data-name="navigation-logic">
(function(){
  const mobileToggle = document.getElementById("mobile-toggle")
  const mobileClose = document.getElementById("mobile-close")
  const mobileOverlay = document.getElementById("mobile-overlay")
  const overlayLinks = document.querySelectorAll(".navigation-overlay-link")

  const openMenu = () => {
    mobileOverlay.style.display = "flex"
    mobileToggle.setAttribute("aria-expanded", "true")
    document.body.style.overflow = "hidden"
  }

  const closeMenu = () => {
    mobileOverlay.style.display = "none"
    mobileToggle.setAttribute("aria-expanded", "false")
    document.body.style.overflow = ""
  }

  mobileToggle.addEventListener("click", openMenu)
  mobileClose.addEventListener("click", closeMenu)

  overlayLinks.forEach((link) => {
    link.addEventListener("click", closeMenu)
  })

  window.addEventListener("resize", () => {
    if (window.innerWidth > 767 && mobileOverlay.style.display === "flex") {
      closeMenu()
    }
  })

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileOverlay.style.display === "flex") {
      closeMenu()
    }
  })
})()
</script>`}
            ></Script>
          </div>
        </div>
      </div>
      <style jsx>
        {`
          .navigation-container1 {
            display: contents;
          }
          
          .navigation-image {
            width: 59px;
            height: 69px;
            object-fit: cover;
          }
          
          
          .navigation-text15 {
            align-self: center;
            line-height: 2;
          }
          
          .navigation-text16 {
            color: var(--dl-color-theme-accent1);
            align-self: center;
            line-height: 2;
          }
          .navigation-container2 {
            display: none;
          }
          .navigation-container3 {
            display: contents;
          }
          .navigation-container4 {
            display: none;
          }
          .navigation-container5 {
            display: contents;
          }
        `}
      </style>
    </>
  )
}

Navigation.defaultProps = {
  imageSrc: '/main%20logo-200h-200h.png',
  rootClassName: '',
  imageAlt: 'image',
}

Navigation.propTypes = {
  imageSrc: PropTypes.string,
  rootClassName: PropTypes.string,
  imageAlt: PropTypes.string,
}

export default Navigation


