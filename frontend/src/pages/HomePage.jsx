import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import HeroGlassmorphicCard from '../components/HeroAssets/HeroGlassmorphicCard';
import { ParallaxDivider } from '../components/ParallaxDivider';
import { initializeHeroPinning } from '../components/HeroAssets/HeroPinningAnimation';
import LayoutLanding from '../layouts/LayoutLanding';
import './HomePage.css';
import '../styles/kinetic-landing-hero.css';
import '../styles/hero-glassmorphic.css';

gsap.registerPlugin(ScrollTrigger);

/* ── Inline SVG Icons ───────────────────────────────────────────────────── */
function IconAI() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path d="M12 2a5 5 0 0 1 5 5c0 1.5-.66 2.85-1.7 3.77L17 17H7l1.7-6.23A5 5 0 0 1 12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 17v1a3 3 0 0 0 6 0v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 7v10M9.5 9.5C9.5 8.4 10.6 7 12 7s2.5 1.4 2.5 2.5c0 2.5-5 2.5-5 5 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconGift() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <rect x="3" y="10" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M3 10V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 6V21M12 6c0 0-1.5-3 0-4s3 1 3 1-2 3-3 3Zm0 0c0 0 1.5-3 0-4S9 3 9 3s2 3 3 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path d="M3 20h18M5 20V14m4 6V9m4 11V4m4 16v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconQuest() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M9 12.5l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Feature data ───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <IconAI />,
    title: 'AI Evidence Review',
    description: 'Claude Vision checks every photo and video submission automatically before it reaches the parent queue.',
    color: 'indigo',
  },
  {
    icon: <IconCoin />,
    title: 'Dual Currency',
    description: 'Reward Points (RP) unlock milestones and badges. Gift-card Points (GP) convert to real Roblox, Steam, and Razer Gold credit.',
    color: 'purple',
  },
  {
    icon: <IconClock />,
    title: 'Gaming Time Control',
    description: 'Set daily and weekly screen-time caps. Every extra minute is earned through quests, never negotiated.',
    color: 'indigo',
  },
  {
    icon: <IconGift />,
    title: 'Real Gift Cards',
    description: 'Kids redeem GP for actual gift cards - Roblox, Steam, Razer Gold - delivered instantly via the Athena network.',
    color: 'purple',
  },
  {
    icon: <IconStar />,
    title: 'Streaks & Achievements',
    description: 'Daily streaks, milestone badges, and a leaderboard keep kids intrinsically motivated without extra pressure.',
    color: 'indigo',
  },
  {
    icon: <IconChart />,
    title: 'Family Insights',
    description: 'A weekly AI digest surfaces completion trends, screen-time patterns, and personalised coaching tips for parents.',
    color: 'purple',
  },
];

const HOW_IT_WORKS = [
  {
    number: '01',
    icon: <IconQuest />,
    title: 'Set Quests',
    description: 'Parents create tasks - clean your room, finish homework, read for 20 minutes - each worth a set number of RP points.',
  },
  {
    number: '02',
    icon: <IconCamera />,
    title: 'Kids Submit Proof',
    description: 'Children complete the quest and upload a photo or short video as evidence directly from the app.',
  },
  {
    number: '03',
    icon: <IconShieldCheck />,
    title: 'AI Reviews, Parent Approves',
    description: 'Claude Vision analyses the evidence for completeness. Parent gets a smart summary and one-tap approve - child earns their RP.',
  },
];

/* ── NavBar ─────────────────────────────────────────────────────────────── */
function NavBar({ auth }) {
  if (auth.token) return null;
  return (
    <nav className="hp-nav" aria-label="Site navigation">
      <div className="hp-nav-inner">
        <Link to="/" className="hp-nav-logo" aria-label="Gametime home">
          Gametime
        </Link>
        <div className="hp-nav-actions">
          <Link to="/login" className="hp-nav-link">Parent Login</Link>
          <Link to="/signup" className="hp-nav-cta">Get Started</Link>
        </div>
      </div>
    </nav>
  );
}

/* ── Device Mockup ──────────────────────────────────────────────────────── */
function DeviceMockup() {
  return (
    <div className="hp-device-wrap" aria-hidden="true">
      <div className="hp-device">
        {/* Status bar */}
        <div className="hp-device-statusbar">
          <span className="hp-device-time">9:41</span>
          <div className="hp-device-dots">
            <span /><span /><span />
          </div>
        </div>

        {/* App header inside device */}
        <div className="hp-device-appbar">
          <div className="hp-device-avatar" />
          <div>
            <div className="hp-device-name">Hi, Alex!</div>
            <div className="hp-device-subtitle">3 quests waiting</div>
          </div>
          <div className="hp-device-rp-badge">
            <span>1,240 RP</span>
          </div>
        </div>

        {/* Quest cards inside device */}
        <div className="hp-device-quests">
          <div className="hp-device-quest hp-device-quest--green">
            <div className="hp-dq-left">
              <div className="hp-dq-icon hp-dq-icon--green" />
              <div>
                <div className="hp-dq-title">Clean your room</div>
                <div className="hp-dq-pts">+50 RP</div>
              </div>
            </div>
            <div className="hp-dq-status hp-dq-status--done">Done</div>
          </div>
          <div className="hp-device-quest hp-device-quest--indigo">
            <div className="hp-dq-left">
              <div className="hp-dq-icon hp-dq-icon--indigo" />
              <div>
                <div className="hp-dq-title">Finish homework</div>
                <div className="hp-dq-pts">+80 RP</div>
              </div>
            </div>
            <div className="hp-dq-status hp-dq-status--pending">Pending</div>
          </div>
          <div className="hp-device-quest hp-device-quest--purple">
            <div className="hp-dq-left">
              <div className="hp-dq-icon hp-dq-icon--purple" />
              <div>
                <div className="hp-dq-title">Read for 20 min</div>
                <div className="hp-dq-pts">+40 RP</div>
              </div>
            </div>
            <div className="hp-dq-status hp-dq-status--new">New</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hp-device-progress-wrap">
          <div className="hp-device-progress-label">
            <span>Daily goal</span>
            <span>170 / 200 RP</span>
          </div>
          <div className="hp-device-progress-track">
            <div className="hp-device-progress-fill" style={{ width: '85%' }} />
          </div>
        </div>

        {/* Redeem strip */}
        <div className="hp-device-redeem">
          <div className="hp-device-redeem-badge hp-device-redeem-badge--roblox">Roblox</div>
          <div className="hp-device-redeem-badge hp-device-redeem-badge--steam">Steam</div>
          <div className="hp-device-redeem-badge hp-device-redeem-badge--razer">Razer Gold</div>
        </div>
      </div>
    </div>
  );
}

/* ── HomePage ───────────────────────────────────────────────────────────── */
export default function HomePage({ auth }) {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Refs for ScrollTrigger pinning (strict implementation)
  const pinWrapperRef = useRef(null);
  const glassCardWrapperRef = useRef(null);
  const textHeadingRef = useRef(null);

  // Initialize hero pinning on mount
  useEffect(() => {
    if (
      pinWrapperRef.current &&
      glassCardWrapperRef.current &&
      textHeadingRef.current
    ) {
      initializeHeroPinning(
        pinWrapperRef.current,
        glassCardWrapperRef.current,
        textHeadingRef.current
      );
    }
  }, []);

  // Initialize bento grid parallax animations
  useEffect(() => {
    const bentoSection = document.querySelector('.hp-features-bento');
    const bgText = document.querySelector('.massive-bg-text');
    const bentoCards = document.querySelectorAll('.bento-card');

    if (!bentoSection) return;

    // Horizontal parallax background text animation
    if (bgText) {
      gsap.from(bgText, {
        scrollTrigger: {
          trigger: bentoSection,
          start: 'top center',
          end: 'bottom center',
          scrub: 1,
        },
        x: '10%',
        ease: 'power1.out',
      });
      
      gsap.to(bgText, {
        scrollTrigger: {
          trigger: bentoSection,
          start: 'top center',
          end: 'bottom center',
          scrub: 1,
        },
        x: '-50%',
        ease: 'power1.out',
      });
    }

    // Vertical parallax for each card based on data-speed
    bentoCards.forEach((card) => {
      const speed = parseFloat(card.dataset.speed) || 1;
      
      gsap.to(card, {
        y: 100 * (speed - 1), // Multiply speed factor by base distance
        scrollTrigger: {
          trigger: bentoSection,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
          markers: false,
        },
        ease: 'power1.out',
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === bentoSection || trigger.trigger === bgText || bentoCards.includes(trigger.trigger)) {
          trigger.kill();
        }
      });
    };
  }, []);

  return (
    <LayoutLanding>
      <div className="hp-root">
        {/* ── 1. Navigation ───────────────────────────────────────── */}
        <NavBar auth={auth} />

        <main role="main">
          {/* ── 2. HERO: Full-Viewport Immersive Sequence (300vh Pinned) ─────────────── */}
          <div
            ref={pinWrapperRef}
            className="hero-pin-wrapper"
            style={{
              width: '100vw',
              height: '100vh',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Background: Massive Parallax Text "GAMETIME" */}
            <div
              string="parallax"
              string-parallax="0.8"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '15vw',
                fontWeight: 900,
                color: 'rgba(255, 255, 255, 0.05)',
                whiteSpace: 'nowrap',
                zIndex: 0,
                willChange: 'transform',
                letterSpacing: '-0.05em',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              GAMETIME
            </div>

            {/* Centerpiece: Controller Visual */}
            <div
              ref={glassCardWrapperRef}
              style={{
                position: 'absolute',
                zIndex: 2,
                width: '100%',
                maxWidth: '800px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                willChange: 'transform, opacity, scale',
              }}
            >
              <HeroGlassmorphicCard />
            </div>

            {/* Flying Text: "Screen Time" (from LEFT) */}
            <div
              string="parallax"
              string-parallax="0.85"
              style={{
                position: 'absolute',
                top: '20%',
                left: '-20%',
                zIndex: 1,
                willChange: 'transform, filter, opacity',
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(2rem, 8vw, 4.5rem)',
                  fontWeight: 800,
                  color: 'rgba(61, 217, 255, 0.9)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 30px rgba(61, 217, 255, 0.5)',
                }}
              >
                Screen Time
              </h2>
            </div>

            {/* Flying Text: "Earned" (from RIGHT) */}
            <div
              string="parallax"
              string-parallax="-0.85"
              style={{
                position: 'absolute',
                bottom: '20%',
                right: '-20%',
                zIndex: 1,
                willChange: 'transform, filter, opacity',
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(2rem, 8vw, 4.5rem)',
                  fontWeight: 800,
                  color: 'rgba(221, 100, 255, 0.9)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 30px rgba(221, 100, 255, 0.5)',
                }}
              >
                Earned.
              </h2>
            </div>

            {/* Secondary Content: Description + CTA (Blur Reveal) */}
            <div
              ref={textHeadingRef}
              style={{
                position: 'absolute',
                bottom: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                zIndex: 3,
                maxWidth: '600px',
                padding: '0 40px',
                filter: 'blur(40px)',
                opacity: 0,
                scale: 1.5,
                willChange: 'filter, opacity, transform',
              }}
            >
              <p
                style={{
                  fontSize: '1.1rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '1.5rem',
                  lineHeight: 1.6,
                }}
              >
                Gametime helps Singapore families turn gaming into a reward kids
                actually work for. Set quests, review evidence with AI, and let
                children redeem real gift cards.
              </p>

              <div className="hero-cta-group" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {auth.token ? (
                  <button
                    onClick={() =>
                      navigate(
                        auth.role === 'parent' ? '/parent/ai' : '/child/dashboard'
                      )
                    }
                    className="hero-cta-primary"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/signup')}
                      className="hero-cta-primary"
                    >
                      Get Started Free
                    </button>
                    <button
                      onClick={() => setShowOnboarding(true)}
                      className="hero-cta-secondary"
                    >
                      See How It Works
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

        {/* ── 3. Parallax Divider ─────────────────────────────────── */}
        <ParallaxDivider
          text="CONCENTRATE"
          bgSpeedRatio={0.3}
          fgSpeedRatio={0.6}
          accentColor="var(--neon-blue)"
        >
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--stark-white)', marginBottom: '1rem' }}>
              Why Gametime Works
            </h2>
          </div>
        </ParallaxDivider>

        {/* ── 4. Social Proof Strip ───────────────────────────────── */}
        <section className="hp-social-proof" aria-label="Social proof">
          <div className="hp-social-proof-inner">
            <span className="hp-social-label">Trusted by Singapore families</span>
            <div className="hp-social-pills">
              <div className="hp-social-pill">
                <span className="hp-pill-number">2,000+</span>
                <span className="hp-pill-label">tasks completed</span>
              </div>
              <div className="hp-social-divider" aria-hidden="true" />
              <div className="hp-social-pill">
                <span className="hp-pill-number">500+</span>
                <span className="hp-pill-label">families</span>
              </div>
              <div className="hp-social-divider" aria-hidden="true" />
              <div className="hp-social-pill">
                <span className="hp-pill-number">4.9★</span>
                <span className="hp-pill-label">rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. How It Works ─────────────────────────────────────── */}
        <section id="how-it-works" className="hp-how" aria-labelledby="hp-how-heading">
          <div className="hp-section-inner">
            <div className="hp-section-header">
              <div className="hp-section-kicker">How It Works</div>
              <h2 id="hp-how-heading" className="hp-section-h2">
                Simple for parents.<br />Exciting for kids.
              </h2>
            </div>

            <div className="hp-how-grid">
              {HOW_IT_WORKS.map((step) => (
                <article key={step.number} className="hp-how-card">
                  <div className="hp-how-number" aria-hidden="true">{step.number}</div>
                  <div className="hp-how-icon">{step.icon}</div>
                  <h3 className="hp-how-title">{step.title}</h3>
                  <p className="hp-how-desc">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. Features Grid (Bento Layout with Parallax) ─────────– */}
        <section 
          className="hp-features-bento"
          aria-labelledby="hp-features-heading"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '5rem 0',
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(255, 255, 255, 0.02) 100%)',
          }}
        >
          {/* Massive Background Parallax Text */}
          <div
            className="massive-bg-text"
            style={{
              position: 'absolute',
              top: '20%',
              left: 0,
              fontSize: '15vw',
              fontWeight: 800,
              color: 'rgba(255, 255, 255, 0.05)',
              whiteSpace: 'nowrap',
              zIndex: 0,
              willChange: 'transform',
              letterSpacing: '-0.05em',
            }}
          >
            EARN YOUR TIME
          </div>

          <div className="hp-section-inner" style={{ position: 'relative', zIndex: 1 }}>
            <div className="hp-section-header">
              <div className="hp-section-kicker">Features</div>
              <h2 id="hp-features-heading" className="hp-section-h2">
                Everything a family needs.
              </h2>
            </div>

            {/* 12-Column Asymmetrical Bento Grid */}
            <div
              className="bento-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: '24px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Card 1: Set Quests (5 columns) */}
              <article
                className="bento-card"
                data-speed="0.8"
                style={{
                  gridColumn: 'span 5',
                  padding: '2rem',
                  borderRadius: '16px',
                  background: 'rgba(61, 217, 255, 0.08)',
                  border: '1px solid rgba(61, 217, 255, 0.2)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  willChange: 'transform',
                  transition: 'all 300ms ease',
                }}
              >
                <div style={{ fontSize: '2.5rem' }}>📋</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--stark-white)' }}>
                  Set Quests
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.6 }}>
                  Parents create tasks - clean your room, finish homework, read for 20 minutes - each worth a set number of RP points.
                </p>
              </article>

              {/* Card 2: Kids Submit Proof (7 columns) */}
              <article
                className="bento-card"
                data-speed="1.2"
                style={{
                  gridColumn: 'span 7',
                  padding: '2rem',
                  borderRadius: '16px',
                  background: 'rgba(221, 100, 255, 0.08)',
                  border: '1px solid rgba(221, 100, 255, 0.2)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  willChange: 'transform',
                  transition: 'all 300ms ease',
                  marginTop: '-40px',
                }}
              >
                <div style={{ fontSize: '2.5rem' }}>📸</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--stark-white)' }}>
                  Kids Submit Proof
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.6 }}>
                  Children complete the quest and upload a photo or short video as evidence directly from the app.
                </p>
              </article>

              {/* Card 3: AI Reviews, Parent Approves (8 columns) */}
              <article
                className="bento-card"
                data-speed="1.5"
                style={{
                  gridColumn: 'span 8',
                  padding: '2rem',
                  borderRadius: '16px',
                  background: 'rgba(61, 157, 255, 0.08)',
                  border: '1px solid rgba(61, 157, 255, 0.2)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  willChange: 'transform',
                  transition: 'all 300ms ease',
                }}
              >
                <div style={{ fontSize: '2.5rem' }}>🤖</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--stark-white)' }}>
                  AI Reviews, Parent Approves
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.6 }}>
                  Claude Vision analyses the evidence for completeness. Parent gets a smart summary and one-tap approve - child earns their RP.
                </p>
              </article>

              {/* Card 4: Real Rewards (4 columns) */}
              <article
                className="bento-card"
                data-speed="0.9"
                style={{
                  gridColumn: 'span 4',
                  padding: '2rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(124, 91, 255, 0.1), rgba(61, 217, 255, 0.05))',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  willChange: 'transform',
                  transition: 'all 300ms ease',
                  marginTop: '-40px',
                }}
              >
                <div style={{ fontSize: '2.5rem' }}>🎁</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--stark-white)' }}>
                  Real Rewards
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.6 }}>
                  Kids redeem GP for actual gift cards - Roblox, Steam, Razer Gold - delivered instantly.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ── 7. Bottom CTA ───────────────────────────────────────── */}
        {!auth.token && (
          <section className="hp-cta-section" aria-labelledby="hp-cta-heading">
            <div className="hp-cta-bg" aria-hidden="true">
              <div className="hp-cta-orb hp-cta-orb--1" />
              <div className="hp-cta-orb hp-cta-orb--2" />
            </div>
            <div className="hp-cta-inner">
              <h2 id="hp-cta-heading" className="hp-cta-h2">
                Ready to make gaming fair?
              </h2>
              <p className="hp-cta-sub">
                Join Singapore families already using Gametime.
              </p>
              <Link to="/signup" className="hp-btn-white hp-btn-lg">
                Create Free Account
              </Link>
            </div>
          </section>
        )}

        {/* ── 8. Footer ───────────────────────────────────────────── */}
        <footer className="hp-footer" role="contentinfo">
          <div className="hp-footer-inner">
            <div className="hp-footer-brand">
              <span className="hp-footer-logo">Gametime</span>
              <p className="hp-footer-tagline">
                Screen time, earned. Singapore's family gaming platform.
              </p>
            </div>

            <nav className="hp-footer-links" aria-label="Footer navigation">
              <div className="hp-footer-col">
                <div className="hp-footer-col-title">Product</div>
                <Link to="/signup" className="hp-footer-link">Get Started</Link>
                <Link to="/login" className="hp-footer-link">Parent Login</Link>
                <Link to="/child-login" className="hp-footer-link">Child Login</Link>
              </div>
              <div className="hp-footer-col">
                <div className="hp-footer-col-title">Company</div>
                <span className="hp-footer-link hp-footer-link--muted">About</span>
                <span className="hp-footer-link hp-footer-link--muted">Blog</span>
                <span className="hp-footer-link hp-footer-link--muted">Contact</span>
              </div>
              <div className="hp-footer-col">
                <div className="hp-footer-col-title">Legal</div>
                <span className="hp-footer-link hp-footer-link--muted">Privacy (PDPA)</span>
                <span className="hp-footer-link hp-footer-link--muted">Terms of Use</span>
                <span className="hp-footer-link hp-footer-link--muted">Cookie Policy</span>
              </div>
            </nav>
          </div>

          <div className="hp-footer-bottom">
            <span>© 2026 Gametime · Singapore</span>
          </div>
        </footer>
      </main>
      </div>
    </LayoutLanding>
  );
}
