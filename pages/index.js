import React, { useState } from 'react'
import Head from 'next/head'
import Script from 'dangerous-html/react'
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
          <meta name="description" content="HUSIN — The ultimate convergence of AI, Community, Commerce, and Web3. One platform, infinite possibilities." />
          <meta property="og:site_name" content="HUSIN Nexus" />
          <meta property="og:description" content="HUSIN — The ultimate convergence of AI, Community, Commerce, and Web3. One platform, infinite possibilities." />
          <meta property="og:image" content="https://www.husin.org/main%20logo-200h-200h.png" />
          <meta property="og:url" content="https://www.husin.org" />
          <meta property="og:type" content="website" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        </Head>

        <Navigation rootClassName="navigationroot-class-name" />

        <section className="unified-hero">
          <div className="unified-hero-bg">
            <video
              src="https://videos.pexels.com/video-files/3141208/3141208-hd_1280_720_25fps.mp4"
              loop muted autoPlay playsInline
              className="unified-hero-video"
            />
            <div className="unified-hero-overlay" />
          </div>

          <div className="unified-hero-container">
            <div className="unified-hero-main">
              <h1 className="hero-title">
                HYPER UNIFIED SPACETIME INTEGRATION NEXUS
              </h1>
              <p className="hero-subtitle">
                The ultimate convergence of AI, Community, Commerce, and Web3.
                One platform, infinite possibilities.
              </p>
              <div className="unified-hero-actions">
                <img
                  alt="HUSIN"
                  src="/main%20logo-200h-200h.png"
                  className="home-logo"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <button
                  className="btn-lg btn btn-outline"
                  onClick={() => setShowSubscribe(true)}
                >
                  Subscribe
                </button>
              </div>
            </div>

            {/* Bento grid */}
            <div className="unified-hero-bento">
              <a href="/ai-pro-sources" className="unified-hero-cell">
                <div className="unified-hero-cell-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2"/>
                    <rect x="4" y="4" rx="2" width="16" height="16"/>
                    <rect x="8" y="8" rx="1" width="8" height="8"/>
                  </svg>
                </div>
                <span className="bento-label">AI Pro Sources</span>
              </a>

              <a href="/marketplace" className="unified-hero-cell">
                <div className="unified-hero-cell-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="21" r="1"/>
                    <circle cx="19" cy="21" r="1"/>
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                  </svg>
                </div>
                <span className="bento-label">E-Marketplace</span>
              </a>

              <a href="/education" className="unified-hero-cell">
                <div className="unified-hero-cell-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6"/>
                    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
                  </svg>
                </div>
                <span className="bento-label">Education</span>
              </a>

              <a href="/islamic" className="unified-hero-cell">
                <div className="unified-hero-cell-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 14h.01M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14"/>
                  </svg>
                </div>
                <span className="bento-label">Muslim Community</span>
              </a>
            </div>

            {/* AI widgets */}
            <div className="ai-teaser-secondary">
              <div className="ai-widget-card">
                <div className="ai-widget-header">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="1"/>
                  </svg>
                  <span className="widget-label">Recent Tools</span>
                </div>
                <ul className="ai-tool-list">
                  <li className="ai-tool-item">Quantum Parser v2.4</li>
                  <li className="ai-tool-item">Ethos Logic Engine</li>
                  <li className="ai-tool-item">Visionary Upscaler</li>
                </ul>
              </div>
              <div className="ai-widget-card">
                <div className="ai-widget-header">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" rx="2" width="16" height="16"/>
                    <rect x="8" y="8" rx="1" width="8" height="8"/>
                  </svg>
                  <span className="widget-label">System Status</span>
                </div>
                <div className="ai-status-graph">
                  <div className="ai-bar" />
                  <div className="ai-bar" />
                  <div className="ai-bar" />
                  <div className="ai-bar" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories grid */}
        <div className="categories-grid">
          {[
            { href:'/islamic',       icon:'👥', title:'Muslim Community',  desc:'A dedicated ecosystem serving the global Muslim community with authentic resources and spiritual guidance.',       cta:'Explore Community' },
            { href:'/ai-pro-sources',icon:'🤖', title:'AI Pro Sources',    desc:'Harness cutting-edge artificial intelligence tools and datasets specifically designed for professionals.',          cta:'Access AI Lab'     },
            { href:'/streams',       icon:'▶️', title:'Streams',           desc:'Access premium live content and entertainment libraries with adaptive bitrate technology.',                          cta:'Watch Now'         },
            { href:'/education',     icon:'🎓', title:'Education',         desc:'Transform your career through structured learning pathways, expert-led instruction, and certifications.',            cta:'Start Learning'    },
            { href:'/marketplace',   icon:'🛒', title:'E-Marketplace',     desc:'A modern digital commerce platform connecting sellers and buyers for curated offerings with secure transactions.',   cta:'Browse Store'      },
            { href:'/jobs',          icon:'💼', title:'Jobs & Freelance',  desc:'Global opportunities for tech talent and creative professionals.',                                                   cta:'Find Work'         },
          ].map((card, i) => (
            <div key={i} className="category-card">
              <div className="category-icon">{card.icon}</div>
              <h3 className="category-title">{card.title}</h3>
              <p className="category-desc">{card.desc}</p>
              <a href={card.href} className="category-cta">{card.cta} →</a>
            </div>
          ))}
        </div>

        {/* Streams section */}
        <section className="streams-preview">
          <div className="streams-container">
            <div className="streams-featured">
              <div className="streams-video-wrapper">
                <video
                  src="https://videos.pexels.com/video-files/34645102/14683780_640_360_30fps.mp4"
                  loop muted autoPlay playsInline
                  poster="https://images.pexels.com/videos/34645102/pictures/preview-0.jpg"
                  className="streams-video"
                />
                <div className="streams-video-overlay">
                  <span className="live-tag">LIVE NOW</span>
                  <h2 className="streams-title">Global Tech Summit 2026</h2>
                  <p className="streams-desc">
                    Watch the future unfold. Live coverage of the latest breakthroughs in AI and Spacetime Integration.
                  </p>
                  <a href="/streams">
                    <button className="btn-xl btn-accent btn">Enter Stream</button>
                  </a>
                </div>
              </div>
            </div>
            <div className="streams-grid">
              {[
                { title:'AI Ethics Webinar',  meta:'2.4k Watching', img:'https://images.pexels.com/photos/7241416/pexels-photo-7241416.jpeg?auto=compress&cs=tinysrgb&w=600' },
                { title:'Web3 Masterclass',   meta:'1.1k Watching', img:'https://images.pexels.com/photos/7887037/pexels-photo-7887037.jpeg?auto=compress&cs=tinysrgb&w=600' },
                { title:'Community Q&A',      meta:'800 Watching',  img:'https://images.pexels.com/photos/6498952/pexels-photo-6498952.jpeg?auto=compress&cs=tinysrgb&w=600' },
              ].map((s, i) => (
                <a key={i} href="/streams" className="stream-thumb">
                  <img src={s.img} alt={s.title} className="thumb-img" loading="lazy" />
                  <div className="thumb-content">
                    <span className="thumb-title">{s.title}</span>
                    <span className="thumb-meta">{s.meta}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Get started */}
        <section className="get-started">
          <div className="started-container">
            <h2 className="started-title">Begin Your Integration</h2>
            <div className="process-steps">
              {[
                { num:'01', title:'Create Identity',  desc:'Sign up via email or connect your decentralized wallet instantly.' },
                { num:'02', title:'Secure Access',    desc:'Link your payment method or bridge assets to the HUSIN ecosystem.' },
                { num:'03', title:'Explore Nexus',    desc:'Unlock AI tools, educational resources, and the global marketplace.' },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <div className="step-item">
                    <div className="step-number">{step.num}</div>
                    <h3 className="step-title">{step.title}</h3>
                    <p className="step-desc">{step.desc}</p>
                  </div>
                  {i < 2 && <div className="step-divider" />}
                </React.Fragment>
              ))}
            </div>
            <div className="started-cta">
              <a href="/marketplace">
                <button className="btn-primary btn-xl btn">Initialize Now</button>
              </a>
            </div>
          </div>
        </section>

        <div style={{ display: 'none' }}>
          <Script html={`<script defer>
(function(){
  const bars = document.querySelectorAll('.ai-bar')
  const animateBars = () => bars.forEach(b => {
    b.style.height = Math.floor(Math.random()*80+20)+'%'
    b.style.transition = 'height 1.5s ease-in-out'
  })
  setInterval(animateBars, 2000)

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.style.opacity='1'
        e.target.style.transform='translateY(0)'
      }
    })
  },{threshold:0.1})
  document.querySelectorAll('.category-card,.started-title').forEach(el=>{
    el.style.opacity='0'
    el.style.transform='translateY(20px)'
    el.style.transition='all 0.6s ease-out'
    observer.observe(el)
  })
})()
          </script>`} />
        </div>

        <Footer />
      </div>

      <SubscribeModal isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} />

      <style jsx global>{`
        /* FIX 1: Prevent horizontal overflow at root level */
        html, body {
          overflow-x: hidden;
          max-width: 100vw;
        }
        * { box-sizing: border-box; }
      `}</style>

      <style jsx>{`
        /* ── Page wrapper ── */
        .home-container1 {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          display: block;
          min-height: 100vh;
        }

        /* ── HERO ── */
        .unified-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .unified-hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .unified-hero-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .unified-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg,
            rgba(5,6,8,0.85) 0%,
            rgba(10,20,40,0.75) 50%,
            rgba(5,6,8,0.85) 100%
          );
        }
        .unified-hero-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
        }

        /* ── FIX 2: Hero title — constrained, word-wrap, no overflow ── */
        .unified-hero-main {
          text-align: center;
          width: 100%;
          max-width: 800px;
        }
        .hero-title {
          font-size: clamp(1.6rem, 5vw, 3.5rem);
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.15;
          margin: 0 0 20px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          /* Prevent any overflow */
          max-width: 100%;
        }
        .hero-subtitle {
          font-size: clamp(0.9rem, 2.5vw, 1.1rem);
          color: rgba(255,255,255,0.65);
          line-height: 1.7;
          margin: 0 0 32px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          padding: 0 8px;
        }
        .unified-hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        /* FIX 3: Logo — no border box, clean render */
        .home-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent;
          border-radius: 8px;
        }

        /* ── Bento grid ── */
        .unified-hero-bento {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          width: 100%;
          max-width: 800px;
        }
        .unified-hero-cell {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 20px 12px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
        }
        .unified-hero-cell:hover {
          background: rgba(255,255,255,0.1);
          border-color: var(--color-primary, #c8a46d);
          transform: translateY(-3px);
        }
        .unified-hero-cell-icon {
          color: var(--color-primary, #c8a46d);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bento-label {
          color: rgba(255,255,255,0.75);
          font-size: 0.72rem;
          text-align: center;
          font-weight: 500;
          line-height: 1.3;
        }

        /* ── AI widgets ── */
        .ai-teaser-secondary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          width: 100%;
          max-width: 800px;
        }
        .ai-widget-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px;
        }
        .ai-widget-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-primary, #c8a46d);
          margin-bottom: 14px;
        }
        .widget-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ai-tool-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ai-tool-item {
          color: rgba(255,255,255,0.55);
          font-size: 0.82rem;
          padding-left: 12px;
          border-left: 2px solid rgba(200,164,109,0.3);
        }
        .ai-status-graph {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 60px;
        }
        .ai-bar {
          flex: 1;
          background: var(--color-primary, #c8a46d);
          opacity: 0.7;
          border-radius: 4px 4px 0 0;
          height: 60%;
          transition: height 1.5s ease-in-out;
        }

        /* ── Categories grid ── */
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 24px;
        }
        .category-card {
          background: var(--color-surface-elevated, #0f1117);
          border: 1px solid var(--color-border, rgba(255,255,255,0.08));
          border-radius: 16px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .category-card:hover {
          border-color: var(--color-accent, #00d9ff);
          transform: translateY(-4px);
        }
        .category-icon { font-size: 28px; }
        .category-title {
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
        }
        .category-desc {
          color: rgba(255,255,255,0.5);
          font-size: 0.85rem;
          line-height: 1.65;
          margin: 0;
          flex: 1;
        }
        .category-cta {
          color: var(--color-accent, #00d9ff);
          font-size: 0.83rem;
          font-weight: 600;
          text-decoration: none;
          margin-top: auto;
          transition: opacity 0.2s;
        }
        .category-cta:hover { opacity: 0.75; }

        /* ── Streams ── */
        .streams-preview {
          background: rgba(255,255,255,0.01);
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 60px 24px;
        }
        .streams-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        .streams-featured { border-radius: 16px; overflow: hidden; position: relative; }
        .streams-video-wrapper { position: relative; aspect-ratio: 16/9; }
        .streams-video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .streams-video-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 24px;
          gap: 8px;
        }
        .live-tag {
          background: #e74c3c;
          color: #fff;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 3px 8px;
          border-radius: 4px;
          width: fit-content;
        }
        .streams-title { color: #fff; font-size: 1.2rem; font-weight: 700; margin: 0; }
        .streams-desc  { color: rgba(255,255,255,0.6); font-size: 0.82rem; line-height: 1.5; margin: 0; }
        .streams-grid { display: flex; flex-direction: column; gap: 12px; }
        .stream-thumb {
          display: flex;
          gap: 12px;
          align-items: center;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          overflow: hidden;
          text-decoration: none;
          transition: border-color 0.2s;
          flex: 1;
        }
        .stream-thumb:hover { border-color: rgba(0,217,255,0.3); }
        .thumb-img { width: 80px; height: 60px; object-fit: cover; flex-shrink: 0; }
        .thumb-content { padding: 8px 12px 8px 0; display: flex; flex-direction: column; gap: 4px; }
        .thumb-title { color: rgba(255,255,255,0.8); font-size: 0.8rem; font-weight: 500; }
        .thumb-meta  { color: rgba(255,255,255,0.4); font-size: 0.72rem; }

        /* ── Get started ── */
        .get-started { padding: 80px 24px; }
        .started-container { max-width: 900px; margin: 0 auto; text-align: center; }
        .started-title {
          color: #fff;
          font-size: clamp(1.4rem, 4vw, 2rem);
          font-weight: 700;
          margin: 0 0 48px;
        }
        .process-steps {
          display: flex;
          align-items: flex-start;
          gap: 0;
          margin-bottom: 48px;
        }
        .step-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          text-align: center;
        }
        .step-number {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(200,164,109,0.12);
          border: 2px solid rgba(200,164,109,0.3);
          color: #c8a46d;
          font-size: 1rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .step-title { color: #fff; font-size: 0.95rem; font-weight: 700; margin: 0; }
        .step-desc  { color: rgba(255,255,255,0.45); font-size: 0.82rem; line-height: 1.6; margin: 0; }
        .step-divider {
          width: 60px;
          height: 1px;
          background: rgba(255,255,255,0.12);
          margin-top: 24px;
          flex-shrink: 0;
        }
        .started-cta { display: flex; justify-content: center; }

        /* ── MOBILE RESPONSIVE — FIX ALL OVERFLOW ── */
        @media (max-width: 768px) {
          .unified-hero-container { padding: 60px 16px 40px; gap: 28px; }
          .hero-title { font-size: clamp(1.4rem, 7vw, 2rem); letter-spacing: 0.02em; }
          .unified-hero-bento { grid-template-columns: repeat(2, 1fr); gap: 10px; max-width: 100%; }
          .ai-teaser-secondary { grid-template-columns: 1fr; max-width: 100%; }
          .categories-grid { grid-template-columns: 1fr; padding: 40px 16px; gap: 14px; }
          .streams-container { grid-template-columns: 1fr; }
          .streams-grid { flex-direction: row; overflow-x: auto; gap: 10px; padding-bottom: 8px; }
          .stream-thumb { flex-shrink: 0; width: 200px; flex-direction: column; }
          .thumb-img { width: 100%; height: 100px; }
          .thumb-content { padding: 8px; }
          .process-steps { flex-direction: column; align-items: center; gap: 24px; }
          .step-divider { width: 1px; height: 24px; margin: 0; }
          .get-started { padding: 48px 16px; }
        }

        @media (max-width: 480px) {
          .hero-title { font-size: clamp(1.25rem, 8vw, 1.75rem); }
          .unified-hero-bento { gap: 8px; }
          .unified-hero-cell { padding: 14px 8px 12px; }
          .bento-label { font-size: 0.65rem; }
          .categories-grid { padding: 32px 16px; }
        }
      `}</style>
    </>
  )
}

export default Home
