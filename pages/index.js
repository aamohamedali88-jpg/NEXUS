import React, { useState } from 'react'
import Head from 'next/head'

import Script from 'dangerous-html/react'
import { useTranslations } from 'next-intl'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import SubscribeModal from '../components/subscribe-modal'

const Home = (props) => {
  const [showSubscribe, setShowSubscribe] = useState(false)

  return (
    <>
      <div className="home-container1">
        <Head>
          <title>HUSIN — Hyper Unified Spacetime Integration Nexus</title>
          <meta property="og:title" content="HUSIN — Hyper Unified Spacetime Integration Nexus" />
        </Head>

        <Navigation rootClassName="navigationroot-class-name" />

        <section className="unified-hero">
          <div className="unified-hero-bg">
            <video
              src="https://videos.pexels.com/video-files/3141208/3141208-hd_1280_720_25fps.mp4"
              loop
              muted
              autoPlay
              playsInline
              className="unified-hero-video"
            ></video>
            <div className="unified-hero-overlay"></div>
          </div>
          <div className="unified-hero-container">
            <div className="unified-hero-main">
              <h1 className="hero-title">
                <span>H</span>
                <span>yper </span>
                <span>U</span>
                <span>nified </span>
                <span>S</span>
                <span>pacetime </span>
                <span>I</span>
                <span>ntegration </span>
                <span>N</span>
                <span>exus</span>
              </h1>
              <p className="hero-subtitle">
                The ultimate convergence of AI, Community, Commerce, and Web3.
                One platform, infinite possibilities.
              </p>
              <div className="unified-hero-actions">
                <img
                  alt="image"
                  src="/logo_logo-200h-200h.png"
                  className="home-image"
                />
                <button
                  className="btn-lg btn btn-outline"
                  onClick={() => setShowSubscribe(true)}
                >
                  Subscribe
                </button>
              </div>
            </div>
            <div className="unified-hero-bento">
              <div className="unified-hero-cell">
                <div className="unified-hero-cell-icon">
                  <svg
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    viewBox="0 0 24 24"
                    className="home-icon10"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2"></path>
                      <rect x="4" y="4" rx="2" width="16" height="16"></rect>
                      <rect x="8" y="8" rx="1" width="8" height="8"></rect>
                    </g>
                  </svg>
                </div>
                <span className="section-subtitle">
                  AI Pro Sources
                </span>
              </div>
              <div className="unified-hero-cell">
                <div className="unified-hero-cell-icon">
                  <svg
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    viewBox="0 0 24 24"
                    className="home-icon15"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle r="1" cx="8" cy="21"></circle>
                      <circle r="1" cx="19" cy="21"></circle>
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                    </g>
                  </svg>
                </div>
                <span className="section-subtitle">
                  E-Marketplace
                </span>
              </div>
              <div className="unified-hero-cell">
                <div className="unified-hero-cell-icon">
                  <svg
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    viewBox="0 0 24 24"
                    className="home-icon20"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6"></path>
                      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                    </g>
                  </svg>
                </div>
                <span className="section-subtitle">
                  Education
                </span>
              </div>
              <div className="unified-hero-cell">
                <div className="unified-hero-cell-icon">
                  <svg
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    viewBox="0 0 24 24"
                    className="home-icon24"
                  >
                    <path
                      d="M17 14h.01M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                </div>
                <span className="section-subtitle">
                  Muslim Community
                </span>
              </div>
            </div>
            <div className="ai-teaser-secondary">
              <div className="ai-widget-card">
                <div className="ai-widget-header">
                  <svg
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle r="10" cx="12" cy="12"></circle>
                      <circle r="1" cx="12" cy="12"></circle>
                    </g>
                  </svg>
                  <span className="section-subtitle">
                    Recent Tools
                  </span>
                </div>
                <ul className="ai-tool-list">
                  <li className="ai-tool-item">
                    <span className="home-text20">Quantum Parser v2.4</span>
                  </li>
                  <li className="ai-tool-item">
                    <span>Ethos Logic Engine</span>
                  </li>
                  <li className="ai-tool-item">
                    <span>Visionary Upscaler</span>
                  </li>
                </ul>
              </div>
              <div className="ai-widget-card">
                <div className="ai-widget-header">
                  <svg
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2"></path>
                      <rect x="4" y="4" rx="2" width="16" height="16"></rect>
                      <rect x="8" y="8" rx="1" width="8" height="8"></rect>
                    </g>
                  </svg>
                  <span className="section-subtitle">
                    System Status
                  </span>
                </div>
                <div className="ai-status-graph">
                  <div className="ai-bar"></div>
                  <div className="ai-bar"></div>
                  <div className="ai-bar"></div>
                  <div className="ai-bar"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES GRID WITH FIXED LINKS */}
        <div className="categories-grid">
          <div className="category-card">
            <div className="category-icon">
              <svg
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M15 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m2 5h2a2 2 0 0 1 2 2v1M5 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
            <h3 className="section-subtitle">Muslim Community</h3>
            <p className="section-content">
              A dedicated ecosystem serving the global Muslim community with authentic resources, spiritual guidance, and cultural content.
            </p>
            <a href="/islamic">
              <div className="btn-link">
                <span>Explore Community</span>
              </div>
            </a>
          </div>
          <div className="category-card">
            <div className="category-icon">
              <svg
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                viewBox="0 0 24 24"
              >
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2"></path>
                  <rect x="4" y="4" rx="2" width="16" height="16"></rect>
                  <rect x="8" y="8" rx="1" width="8" height="8"></rect>
                </g>
              </svg>
            </div>
            <h3 className="section-subtitle">AI Pro Sources</h3>
            <p className="section-content">
              Harness cutting-edge artificial intelligence tools and datasets specifically designed for professionals and developers.
            </p>
            <a href="/ai-pro-sources">
              <div className="btn-link">
                <span>Access AI Lab</span>
              </div>
            </a>
          </div>
          <div className="category-card">
            <div className="category-icon">
              <svg
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                viewBox="0 0 24 24"
              >
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"></path>
                  <circle r="10" cx="12" cy="12"></circle>
                </g>
              </svg>
            </div>
            <h3 className="section-subtitle">Streams</h3>
            <p className="section-content">
              Access premium live content and entertainment libraries with adaptive bitrate technology ensuring smooth playback across all devices.
            </p>
            <a href="/streams">
              <div className="btn-link">
                <span>Watch Now</span>
              </div>
            </a>
          </div>
          <div className="category-card">
            <div className="category-icon">
              <svg
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                viewBox="0 0 24 24"
              >
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6"></path>
                  <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                </g>
              </svg>
            </div>
            <h3 className="section-subtitle">Education</h3>
            <p className="section-content">
              Transform your career through structured learning pathways, expert-led instruction, and industry-recognized certifications.
            </p>
            <a href="/education">
              <div className="btn-link">
                <span>Start Learning</span>
              </div>
            </a>
          </div>
          <div className="category-card">
            <div className="category-icon">
              <svg
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                viewBox="0 0 24 24"
              >
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle r="1" cx="8" cy="21"></circle>
                  <circle r="1" cx="19" cy="21"></circle>
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                </g>
              </svg>
            </div>
            <h3 className="section-subtitle">E-Marketplace</h3>
            <p className="section-content">
              A modern digital commerce platform connecting sellers and buyers for digital products, services, and curated offerings with secure transactions.
            </p>
            <a href="/marketplace">
              <div className="btn-link">
                <span>Browse Store</span>
              </div>
            </a>
          </div>
          <div className="category-card">
            <div className="category-icon">
              <svg
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                viewBox="0 0 24 24"
              >
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 12h.01M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m14 7a18.15 18.15 0 0 1-20 0"></path>
                  <rect x="2" y="6" rx="2" width="20" height="14"></rect>
                </g>
              </svg>
            </div>
            <h3 className="section-subtitle">Jobs &amp; Freelance</h3>
            <p className="section-content">
              Global opportunities for tech talent and creative professionals.
            </p>
            <a href="/jobs">
              <div className="btn-link">
                <span>Find Work</span>
              </div>
            </a>
          </div>
        </div>

        <section className="streams-preview">
          <div className="streams-container">
            <div className="streams-featured">
              <div className="streams-video-wrapper">
                <video
                  src="https://videos.pexels.com/video-files/34645102/14683780_640_360_30fps.mp4"
                  loop
                  muted
                  poster="https://images.pexels.com/videos/34645102/pictures/preview-0.jpg"
                  autoPlay
                  className="streams-video"
                ></video>
                <div className="streams-video-overlay">
                  <span className="live-tag">LIVE NOW</span>
                  <h2 className="section-title">Global Tech Summit 2026</h2>
                  <p className="section-content">
                    Watch the future unfold. Live coverage of the latest
                    breakthroughs in AI and Spacetime Integration.
                  </p>
                  <button className="btn-xl btn-accent btn">
                    Enter Stream
                  </button>
                </div>
              </div>
            </div>
            <div className="streams-grid">
              <div className="stream-thumb">
                <img
                  alt="Stream Thumbnail"
                  src="https://images.pexels.com/photos/7241416/pexels-photo-7241416.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                  className="thumb-img"
                />
                <div className="thumb-content">
                  <span className="thumb-title">AI Ethics Webinar</span>
                  <span className="thumb-meta">2.4k Watching</span>
                </div>
              </div>
              <div className="stream-thumb">
                <img
                  alt="Stream Thumbnail"
                  src="https://images.pexels.com/photos/7887037/pexels-photo-7887037.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                  className="thumb-img"
                />
                <div className="thumb-content">
                  <span className="thumb-title">Web3 Masterclass</span>
                  <span className="thumb-meta">1.1k Watching</span>
                </div>
              </div>
              <div className="stream-thumb">
                <img
                  alt="Stream Thumbnail"
                  src="https://images.pexels.com/photos/6498952/pexels-photo-6498952.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                  className="thumb-img"
                />
                <div className="thumb-content">
                  <span className="thumb-title">Community Q&amp;A</span>
                  <span className="thumb-meta">800 Watching</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="get-started">
          <div className="started-container">
            <h2 className="section-title">Begin Your Integration</h2>
            <div className="process-steps">
              <div className="step-item">
                <div className="step-number">
                  <span>01</span>
                </div>
                <h3 className="section-subtitle">Create Identity</h3>
                <p className="section-content">
                  Sign up via email or connect your decentralized wallet
                  instantly.
                </p>
              </div>
              <div className="step-divider"></div>
              <div className="step-item">
                <div className="step-number">
                  <span>02</span>
                </div>
                <div className="section-subtitle">
                  <span>Secure Access</span>
                </div>
                <p className="section-content">
                  Link your payment method or bridge assets to the HUSIN
                  ecosystem.
                </p>
              </div>
              <div className="step-divider"></div>
              <div className="step-item">
                <div className="step-number">
                  <span>03</span>
                </div>
                <div className="section-subtitle">
                  <span>Explore Nexus</span>
                </div>
                <p className="section-content">
                  Unlock AI tools, educational resources, and the global
                  marketplace.
                </p>
              </div>
            </div>
            <div className="started-cta">
              <button className="btn-primary btn-xl btn">Initialize Now</button>
            </div>
          </div>
        </section>

        <div className="home-container2">
          <div className="home-container3">
            <Script
              html={`<script defer>
(function(){
  // Interactive elements for HUSIN Homepage

  // Parallax effect for Hero Section
  window.addEventListener("scroll", () => {
    const scroll = window.pageYOffset
    const heroVideo = document.querySelector(".unified-hero-video")
    if (heroVideo) {
      heroVideo.style.transform = \`translateY(\${scroll * 0.3}px)\`
    }
  })

  // Category card hover animations
  const categoryCards = document.querySelectorAll(".category-card")
  categoryCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.borderColor = "var(--color-accent)"
    })
    card.addEventListener("mouseleave", () => {
      card.style.borderColor = "var(--color-border)"
    })
  })

  // Mock AI Status Graph Animation
  const bars = document.querySelectorAll(".ai-bar")
  const animateBars = () => {
    bars.forEach((bar) => {
      const height = Math.floor(Math.random() * 80) + 20
      bar.style.height = \`\${height}%\`
      bar.style.transition = "height 1.5s ease-in-out"
    })
  }

  setInterval(animateBars, 2000)

  // Intersection Observer for fade-in effects
  const observerOptions = {
    threshold: 0.1,
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  document.querySelectorAll(".section-title, .category-card, .stat-item").forEach((el) => {
    el.style.opacity = "0"
    el.style.transform = "translateY(20px)"
    el.style.transition = "all 0.6s ease-out"
    observer.observe(el)
  })
})()
</script>`}
            ></Script>
          </div>
        </div>

        <Footer></Footer>
      </div>

      {/* ✅ Subscribe Modal — renders when button clicked */}
      <SubscribeModal
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
      />

      <style jsx>
        {`
          .home-container1 {
            width: 100%;
            display: block;
            min-height: 100vh;
          }
          .
            height: 1027px;
            padding-bottom: 29px;
          }
          .
            width: 859px;
            height: 431px;
          }
          .
            color: var(--color-on-secondary);
            height: 176px;
            font-size: 48px;
            padding-top: 12px;
            margin-bottom: 28px;
            padding-bottom: var(--dl-layout-space-unit);
          }
          .
            fill: var(--color-primary);
            color: rgb(201, 177, 133);
            height: 137px;
            opacity: 1;
            padding-top: 28px;
            border-color: var(--color-secondary);
            border-width: 1px;
            padding-bottom: 28px;
            backdrop-filter: blur(10px);
          }
          .
            height: 63px;
          }
          .home-image {
            width: 72px;
            height: 64px;
            object-fit: cover;
            border-color: var(--color-on-surface);
            border-width: 1px;
          }
          .
            fill: var(--color-on-secondary);
            color: var(--color-on-secondary);
            width: 359px;
            opacity: 0.7;
            font-size: 20px;
            border-color: var(--color-on-secondary);
            background-color: var(--color-on-accent);
          }
          .
            opacity: 0.7;
          }
          .
            background: var(--color-on-primary);
            border-color: var(--color-secondary);
          }
          .home-icon10 {
            fill: var(--color-on-secondary);
            width: 51px;
            height: 49px;
            border-color: var(--color-on-surface);
            border-width: 1px;
          }
          .
            fill: var(--color-on-secondary);
            color: var(--color-on-secondary);
            opacity: 1;
          }
          .
            background: var(--color-on-primary);
            border-color: var(--color-secondary);
          }
          .home-icon15 {
            width: 48px;
            height: 46px;
            border-color: var(--color-on-surface);
            border-width: 1px;
            margin-bottom: 12px;
          }
          .
            fill: var(--color-on-secondary);
            color: var(--color-on-secondary);
            opacity: 1;
          }
          .
            background: var(--color-on-primary);
            border-color: var(--color-secondary);
          }
          .home-icon20 {
            width: 52px;
            height: 48px;
            border-color: var(--color-on-surface);
            border-width: 1px;
          }
          .
            fill: var(--color-on-secondary);
            color: var(--color-on-secondary);
            opacity: 1;
          }
          .
            background: var(--color-on-primary);
            border-color: var(--color-secondary);
          }
          .home-icon24 {
            width: 48px;
            height: 47px;
            border-color: var(--color-on-surface);
            border-width: 1px;
          }
          .
            fill: var(--color-on-secondary);
            color: var(--color-on-secondary);
            opacity: 1;
          }
          .
            width: 550px;
            border-color: var(--color-secondary);
          }
          .
            width: 512px;
            height: 50px;
            opacity: 1;
            border-color: var(--color-on-secondary);
            border-width: 1px;
            justify-content: center;
          }
          .
            fill: var(--color-on-secondary);
            color: var(--color-on-secondary);
          }
          .
            background-color: #2e3031;
          }
          .
            opacity: 1;
            background: var(--color-on-primary);
          }
          .home-text20 {
            fill: var(--color-on-secondary);
            color: var(--color-on-secondary);
            opacity: 1;
          }
          .
            background: var(--color-surface);
          }
          .
            background: var(--color-on-primary);
          }
          .
            width: 561px;
            border-color: var(--color-secondary);
            padding-bottom: 20px;
          }
          .
            width: 516px;
            height: 49px;
            opacity: 1;
            border-color: var(--color-on-secondary);
            border-width: 1px;
            justify-content: center;
          }
          .
            fill: var(--color-on-secondary);
            color: var(--color-on-secondary);
          }
          .
            height: 136px;
            opacity: 0.6;
            background-color: var(--color-on-primary);
          }
          .
            height: 60%;
            opacity: 0.7;
            background: var(--color-border);
            border-color: var(--color-accent);
            border-width: 1px;
          }
          .
            height: 80%;
            opacity: 0.3;
            background: var(--color-surface-elevated);
            border-color: var(--color-accent);
            border-width: 1px;
          }
          .
            height: 45%;
            opacity: 0.7;
            background: #2e3031;
            border-color: var(--color-accent);
            border-width: 1px;
          }
          .
            height: 90%;
            opacity: 0.6;
            background: var(--color-overlay);
            border-color: var(--color-accent);
            border-width: 1px;
          }
          .
            height: 856px;
            padding-top: var(--dl-layout-space-oneandhalfunits);
            padding-left: var(--dl-layout-space-oneandhalfunits);
            padding-right: var(--dl-layout-space-oneandhalfunits);
            padding-bottom: 29px;
          }
          .
            background: var(--color-on-accent);
          }
          .
            background: var(--color-on-accent);
          }
          .
            background: var(--color-on-accent);
          }
          .
            background: var(--color-on-accent);
          }
          .
            background: var(--color-on-accent);
          }
          .
            background: var(--color-on-accent);
          }
          .
            background: var(--color-on-accent);
          }
          .
            background: var(--color-on-accent);
          }
          .
            background: var(--color-on-accent);
          }
          .
            height: 800px;
            padding-top: 0px;
            padding-bottom: 0px;
          }
          .
            height: 775px;
          }
          .
            height: 493px;
            padding-top: var(--dl-layout-space-twounits);
          }
          .
            fill: var(--color-on-secondary);
            color: var(--color-on-secondary);
          }
          .
            color: var(--color-on-secondary);
            background-color: var(--color-border);
          }
          .
            border-color: var(--color-accent);
            border-width: 1px;
          }
          .
            border-color: var(--color-accent);
            border-width: 1px;
          }
          .
            border-color: var(--color-accent);
            border-width: 1px;
          }
          .
            padding-top: 0px;
          }
          .
            padding-top: 45px;
            padding-bottom: 40px;
          }
          .home-container2 {
            display: none;
          }
          .home-container3 {
            display: contents;
          }
          .home-container4 {
            right: 50px;
            border: 1px solid #ffffff5c;
            bottom: 30px;
            display: flex;
            z-index: 22;
            position: fixed;
            box-shadow: 5px 5px 10px 0px rgba(31, 31, 31, 0.4);
            min-height: auto;
            align-items: center;
            padding-top: 8px;
            padding-left: 12px;
            border-radius: 8px;
            padding-right: 12px;
            padding-bottom: 8px;
            backdrop-filter: blur(6px);
            background-color: rgba(41, 41, 41, 0.41);
          }
          .home-icon74 {
            width: 24px;
            margin-right: 4px;
          }
          .home-text37 {
            color: white;
            font-size: 13px;
            font-style: normal;
            font-weight: 500;
            line-height: 24px;
          }
        `}
      </style>
    </>
  )
}

export default Home
