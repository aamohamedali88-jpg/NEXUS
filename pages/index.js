import React, { useState } from 'react'
import Head from 'next/head'
import Script from 'dangerous-html/react'
import Navigation from '../components/navigation'
import Footer from '../components/footer'
import SubscribeModal from '../components/subscribe-modal'

const Home = () => {
  const [showSubscribe, setShowSubscribe] = useState(false)

  return (
    <>
      <div className="home-wrap">
        <Head>
          <title>HUSIN — Hyper Unified Spacetime Integration Nexus</title>
          <meta name="description" content="HUSIN — The ultimate convergence of AI, Community, Commerce, and Web3." />
          <meta property="og:title"       content="HUSIN — Hyper Unified Spacetime Integration Nexus" />
          <meta property="og:description" content="The ultimate convergence of AI, Community, Commerce, and Web3." />
          <meta property="og:image"       content="https://www.husin.org/main%20logo-200h-200h.png" />
          <meta property="og:url"         content="https://www.husin.org" />
          <meta name="viewport"           content="width=device-width, initial-scale=1.0" />
        </Head>

        <Navigation rootClassName="navigationroot-class-name" />

        {/* ── HERO ── */}
        <section className="hero-section">
          <div className="hero-bg">
            <video src="https://videos.pexels.com/video-files/3141208/3141208-hd_1280_720_25fps.mp4"
              loop muted autoPlay playsInline className="hero-video" />
            <div className="hero-overlay" />
          </div>

          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">HYPER UNIFIED SPACETIME INTEGRATION NEXUS</h1>
              <p className="hero-sub">
                The ultimate convergence of AI, Community, Commerce, and Web3. One platform, infinite possibilities.
              </p>
              <div className="hero-actions">
                <img src="/main%20logo-200h-200h.png" alt="HUSIN" className="hero-logo"
                  onError={e => { e.target.style.display='none' }} />
                <button className="btn-subscribe" onClick={() => setShowSubscribe(true)}>
                  Subscribe
                </button>
              </div>
            </div>

            {/* Bento grid */}
            <div className="bento-grid">
              {[
                { href:'/ai-pro-sources', icon:'⚙️', label:'AI Pro Sources'   },
                { href:'/marketplace',    icon:'🛒', label:'E-Marketplace'    },
                { href:'/education',      icon:'🎓', label:'Education'        },
                { href:'/islamic',        icon:'🕌', label:'Muslim Community' },
              ].map((cell, i) => (
                <a key={i} href={cell.href} className="bento-cell">
                  <span className="bento-icon">{cell.icon}</span>
                  <span className="bento-label">{cell.label}</span>
                </a>
              ))}
            </div>

            {/* AI widgets */}
            <div className="widgets-row">
              <div className="widget-card">
                <div className="widget-hd">⭕ <span>Recent Tools</span></div>
                <div className="widget-list">
                  {['Quantum Parser v2.4', 'Ethos Logic Engine', 'Visionary Upscaler'].map((t,i) => (
                    <div key={i} className="widget-item">{t}</div>
                  ))}
                </div>
              </div>
              <div className="widget-card">
                <div className="widget-hd">⚙️ <span>System Status</span></div>
                <div className="widget-bars">
                  <div className="w-bar" />
                  <div className="w-bar" />
                  <div className="w-bar" />
                  <div className="w-bar" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CATEGORY CARDS ── */}
        <div className="cats-grid">
          {[
            { href:'/islamic',        icon:'👥', title:'Muslim Community', desc:'A dedicated ecosystem serving the global Muslim community with authentic resources and spiritual guidance.',       cta:'Explore Community' },
            { href:'/ai-pro-sources', icon:'🤖', title:'AI Pro Sources',   desc:'Harness cutting-edge artificial intelligence tools and datasets specifically designed for professionals.',          cta:'Access AI Lab'     },
            { href:'/streams',        icon:'▶️', title:'Streams',          desc:'Access premium live content and entertainment libraries with adaptive bitrate technology for smooth playback.',       cta:'Watch Now'         },
            { href:'/education',      icon:'🎓', title:'Education',        desc:'Transform your career through structured learning pathways, expert-led instruction, and certifications.',            cta:'Start Learning'    },
            { href:'/marketplace',    icon:'🛒', title:'E-Marketplace',    desc:'A modern digital commerce platform connecting sellers and buyers for curated offerings with secure transactions.',   cta:'Browse Store'      },
            { href:'/jobs',           icon:'💼', title:'Jobs & Freelance', desc:'Global opportunities for tech talent and creative professionals across all disciplines.',                            cta:'Find Work'         },
          ].map((card, i) => (
            <div key={i} className="cat-card">
              <span className="cat-icon">{card.icon}</span>
              <h3 className="cat-title">{card.title}</h3>
              <p className="cat-desc">{card.desc}</p>
              <a href={card.href} className="cat-cta">{card.cta} →</a>
            </div>
          ))}
        </div>

        {/* ── STREAMS ── */}
        <section className="streams-section">
          <div className="streams-inner">

            {/* Featured video */}
            <div className="streams-featured">
              <div className="streams-vid-wrap">
                <video
                  src="https://videos.pexels.com/video-files/34645102/14683780_640_360_30fps.mp4"
                  loop muted autoPlay playsInline
                  poster="https://images.pexels.com/videos/34645102/pictures/preview-0.jpg"
                  className="streams-vid"
                />
                <div className="streams-overlay">
                  <span className="live-badge">LIVE NOW</span>
                  <h2 className="streams-title">Global Tech Summit 2026</h2>
                  <p className="streams-desc">
                    Watch the future unfold. Live coverage of the latest breakthroughs in AI and Spacetime Integration.
                  </p>
                  <a href="/streams">
                    <button className="streams-btn">Enter Stream</button>
                  </a>
                </div>
              </div>
            </div>

            {/* Thumbnail grid — FIXED sizes */}
            <div className="streams-thumbs">
              {[
                { title:'AI Ethics Webinar',  meta:'2.4k Watching', img:'https://images.pexels.com/photos/7241416/pexels-photo-7241416.jpeg?auto=compress&cs=tinysrgb&w=400' },
                { title:'Web3 Masterclass',   meta:'1.1k Watching', img:'https://images.pexels.com/photos/7887037/pexels-photo-7887037.jpeg?auto=compress&cs=tinysrgb&w=400' },
                { title:'Community Q&A',      meta:'800 Watching',  img:'https://images.pexels.com/photos/6498952/pexels-photo-6498952.jpeg?auto=compress&cs=tinysrgb&w=400' },
              ].map((s, i) => (
                <a key={i} href="/streams" className="stream-thumb">
                  <div className="thumb-img-wrap">
                    <img src={s.img} alt={s.title} className="thumb-img" loading="lazy" />
                    <span className="thumb-live">LIVE</span>
                  </div>
                  <div className="thumb-info">
                    <span className="thumb-title">{s.title}</span>
                    <span className="thumb-meta">🔴 {s.meta}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── GET STARTED ── */}
        <section className="started-section">
          <div className="started-inner">
            <h2 className="started-title">Begin Your Integration</h2>
            <div className="steps-row">
              {[
                { num:'01', title:'Create Identity',  desc:'Sign up via email or connect your decentralized wallet instantly.' },
                { num:'02', title:'Secure Access',    desc:'Link your payment method or bridge assets to the HUSIN ecosystem.' },
                { num:'03', title:'Explore Nexus',    desc:'Unlock AI tools, educational resources, and the global marketplace.' },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <div className="step">
                    <div className="step-num">{step.num}</div>
                    <h3 className="step-title">{step.title}</h3>
                    <p className="step-desc">{step.desc}</p>
                  </div>
                  {i < 2 && <div className="step-div" />}
                </React.Fragment>
              ))}
            </div>
            <a href="/marketplace">
              <button className="started-btn">Initialize Now</button>
            </a>
          </div>
        </section>

        <div style={{ display:'none' }}>
          <Script html={`<script defer>
(function(){
  const bars = document.querySelectorAll('.w-bar')
  const animate = () => bars.forEach(b => {
    b.style.height = Math.floor(Math.random()*70+20)+'%'
  })
  setInterval(animate, 2000)
  animate()
})()
          </script>`} />
        </div>

        <Footer />
      </div>

      <SubscribeModal isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} />

      <style jsx global>{`
        html, body { overflow-x:hidden; max-width:100vw; box-sizing:border-box; }
        *, *::before, *::after { box-sizing:inherit; }
      `}</style>

      <style jsx>{`
        .home-wrap { width:100%; overflow-x:hidden; min-height:100vh; }

        /* ── HERO ── */
        .hero-section { position:relative; min-height:100vh; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .hero-bg { position:absolute; inset:0; z-index:0; }
        .hero-video { width:100%; height:100%; object-fit:cover; }
        .hero-overlay { position:absolute; inset:0; background:linear-gradient(135deg,rgba(5,6,8,0.85) 0%,rgba(10,20,40,0.75) 50%,rgba(5,6,8,0.85) 100%); }
        .hero-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 36px;
        }
        .hero-text { text-align:center; width:100%; max-width:780px; }
        .hero-title {
          font-size: clamp(1.6rem, 4.5vw, 3.2rem);
          font-weight: 900;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.15;
          margin: 0 0 20px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .hero-sub { color:rgba(255,255,255,0.6); font-size:clamp(0.88rem,2vw,1.05rem); line-height:1.7; margin:0 0 28px; padding:0 8px; }
        .hero-actions { display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap; }
        .hero-logo { width:56px; height:56px; object-fit:contain; border:none; border-radius:8px; }
        .btn-subscribe { background:rgba(200,164,109,0.15); border:1px solid rgba(200,164,109,0.4); color:#c8a46d; padding:12px 28px; border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.2s; }
        .btn-subscribe:hover { background:rgba(200,164,109,0.25); }

        /* Bento */
        .bento-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; width:100%; max-width:760px; }
        .bento-cell { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:18px 10px 14px; display:flex; flex-direction:column; align-items:center; gap:8px; text-decoration:none; transition:all 0.2s; cursor:pointer; }
        .bento-cell:hover { background:rgba(255,255,255,0.1); border-color:#c8a46d; transform:translateY(-3px); }
        .bento-icon  { font-size:22px; }
        .bento-label { color:rgba(255,255,255,0.75); font-size:0.7rem; text-align:center; font-weight:500; line-height:1.3; }

        /* Widgets */
        .widgets-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%; max-width:760px; }
        .widget-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:18px; }
        .widget-hd   { display:flex; align-items:center; gap:7px; color:#c8a46d; font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:12px; }
        .widget-list { display:flex; flex-direction:column; gap:7px; }
        .widget-item { color:rgba(255,255,255,0.5); font-size:0.8rem; padding-left:10px; border-left:2px solid rgba(200,164,109,0.3); }
        .widget-bars { display:flex; align-items:flex-end; gap:6px; height:56px; }
        .w-bar { flex:1; background:#c8a46d; opacity:0.65; border-radius:4px 4px 0 0; height:60%; transition:height 1.5s ease; }

        /* ── CATEGORY CARDS ── */
        .cats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; max-width:1200px; margin:0 auto; padding:56px 24px; }
        .cat-card { background:var(--color-surface-elevated,#0f1117); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:26px 22px; display:flex; flex-direction:column; gap:10px; transition:border-color 0.2s,transform 0.2s; }
        .cat-card:hover { border-color:#00d9ff; transform:translateY(-3px); }
        .cat-icon  { font-size:26px; }
        .cat-title { color:#fff; font-size:1rem; font-weight:700; margin:0; }
        .cat-desc  { color:rgba(255,255,255,0.45); font-size:0.82rem; line-height:1.65; margin:0; flex:1; }
        .cat-cta   { color:#00d9ff; font-size:0.8rem; font-weight:600; text-decoration:none; margin-top:auto; transition:opacity 0.2s; }
        .cat-cta:hover { opacity:0.75; }

        /* ── STREAMS — FIXED layout ── */
        .streams-section { background:rgba(255,255,255,0.01); border-top:1px solid rgba(255,255,255,0.06); border-bottom:1px solid rgba(255,255,255,0.06); padding:52px 24px; }
        .streams-inner { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:3fr 2fr; gap:20px; align-items:start; }

        /* Featured */
        .streams-featured { border-radius:14px; overflow:hidden; }
        .streams-vid-wrap { position:relative; aspect-ratio:16/9; background:#0a0e1a; }
        .streams-vid { width:100%; height:100%; object-fit:cover; display:block; }
        .streams-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.2) 60%,transparent 100%); display:flex; flex-direction:column; justify-content:flex-end; padding:20px; gap:6px; }
        .live-badge  { background:#e74c3c; color:#fff; font-size:0.6rem; font-weight:800; letter-spacing:0.1em; padding:3px 8px; border-radius:4px; width:fit-content; }
        .streams-title { color:#fff; font-size:1.1rem; font-weight:700; margin:0; }
        .streams-desc  { color:rgba(255,255,255,0.6); font-size:0.78rem; line-height:1.5; margin:0; }
        .streams-btn   { background:#00d9ff; color:#000; border:none; border-radius:8px; padding:10px 20px; font-size:0.85rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; transition:opacity 0.2s; }
        .streams-btn:hover { opacity:0.85; }

        /* FIXED thumbnails — proper sizes */
        .streams-thumbs { display:flex; flex-direction:column; gap:12px; }
        .stream-thumb   { display:flex; flex-direction:column; gap:0; text-decoration:none; border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.07); background:#0f1117; transition:border-color 0.2s; }
        .stream-thumb:hover { border-color:rgba(0,217,255,0.3); }
        .thumb-img-wrap { position:relative; aspect-ratio:16/9; overflow:hidden; }
        .thumb-img  { width:100%; height:100%; object-fit:cover; display:block; }
        .thumb-live { position:absolute; top:8px; left:8px; background:rgba(231,76,60,0.9); color:#fff; font-size:0.58rem; font-weight:800; letter-spacing:0.08em; padding:2px 6px; border-radius:3px; }
        .thumb-info { padding:10px 12px; display:flex; flex-direction:column; gap:3px; }
        .thumb-title { color:rgba(255,255,255,0.85); font-size:0.8rem; font-weight:500; }
        .thumb-meta  { color:rgba(255,255,255,0.4); font-size:0.72rem; }

        /* ── GET STARTED ── */
        .started-section { padding:72px 24px; }
        .started-inner   { max-width:900px; margin:0 auto; text-align:center; }
        .started-title   { color:#fff; font-size:clamp(1.4rem,3.5vw,1.9rem); font-weight:700; margin:0 0 44px; }
        .steps-row       { display:flex; align-items:flex-start; margin-bottom:44px; }
        .step            { flex:1; display:flex; flex-direction:column; align-items:center; gap:10px; padding:0 14px; text-align:center; }
        .step-num        { width:46px; height:46px; border-radius:50%; background:rgba(200,164,109,0.12); border:2px solid rgba(200,164,109,0.3); color:#c8a46d; font-size:0.95rem; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .step-title      { color:#fff; font-size:0.9rem; font-weight:700; margin:0; }
        .step-desc       { color:rgba(255,255,255,0.42); font-size:0.8rem; line-height:1.65; margin:0; }
        .step-div        { width:50px; height:1px; background:rgba(255,255,255,0.1); margin-top:22px; flex-shrink:0; }
        .started-btn     { background:#c8a46d; color:#000; border:none; border-radius:10px; padding:14px 36px; font-size:1rem; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity 0.2s,transform 0.1s; }
        .started-btn:hover { opacity:0.88; transform:translateY(-1px); }

        /* ── MOBILE ── */
        @media (max-width:1024px) {
          .streams-inner { grid-template-columns:3fr 2fr; gap:16px; }
          .cats-grid { grid-template-columns:repeat(2,1fr); padding:40px 20px; }
        }

        @media (max-width:768px) {
          .hero-content  { padding:60px 16px 44px; gap:28px; }
          .hero-title    { font-size:clamp(1.35rem,6.5vw,1.9rem); }
          .bento-grid    { grid-template-columns:repeat(2,1fr); gap:10px; max-width:100%; }
          .widgets-row   { grid-template-columns:1fr; max-width:100%; }
          .cats-grid     { grid-template-columns:1fr; padding:32px 16px; gap:12px; }
          .streams-section { padding:36px 16px; }
          .streams-inner { grid-template-columns:1fr; gap:16px; }
          .streams-thumbs { flex-direction:row; overflow-x:auto; gap:10px; padding-bottom:8px; scrollbar-width:none; }
          .streams-thumbs::-webkit-scrollbar { display:none; }
          .stream-thumb  { flex-shrink:0; width:200px; }
          .started-section { padding:48px 16px; }
          .steps-row { flex-direction:column; align-items:center; gap:20px; }
          .step-div  { width:1px; height:20px; margin:0; }
        }

        @media (max-width:480px) {
          .bento-grid { gap:8px; }
          .bento-cell { padding:14px 8px 12px; }
          .bento-label { font-size:0.63rem; }
        }
      `}</style>
    </>
  )
}

export default Home
