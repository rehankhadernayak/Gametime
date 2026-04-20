import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import MasterController from '../components/HeroAssets/MasterController';
import { ParallaxDivider } from '../components/ParallaxDivider';
import './HomePage.css';
import '../styles/kinetic-landing-hero.css';

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

  return (
    <div className="hp-root">
      {/* ── 1. Navigation ───────────────────────────────────────── */}
      <NavBar auth={auth} />

      <main role="main">
        {/* ── 2. Kinetic Hero with MasterController ─────────────── */}
        <section className="landing-hero" aria-labelledby="hero-main-heading">
          <div className="hero-content">
            <div className="hero-controller-wrapper">
              <MasterController autoScroll speed={1} />
            </div>

            <h1 id="hero-main-heading" className="hero-heading">
              Screen time,<br /><span>earned.</span>
            </h1>

            <p className="hero-subheading">
              Gametime helps Singapore families turn gaming into a reward kids
              actually work for. Set quests, review evidence with AI, and let
              children redeem real gift cards.
            </p>

            <div className="hero-cta-group">
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

            {/* Scroll indicator */}
            <div className="hero-scroll-indicator">
              <div className="scroll-dot" />
              <div className="scroll-dot" />
              <div className="scroll-dot" />
            </div>
          </div>
        </section>

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

        {/* ── 6. Features Grid ────────────────────────────────────── */}
        <section className="hp-features" aria-labelledby="hp-features-heading">
          <div className="hp-section-inner">
            <div className="hp-section-header">
              <div className="hp-section-kicker">Features</div>
              <h2 id="hp-features-heading" className="hp-section-h2">
                Everything a family needs.
              </h2>
            </div>

            <div className="hp-features-grid">
              {FEATURES.map((f) => (
                <article key={f.title} className={`hp-feature-card hp-feature-card--${f.color}`}>
                  <div className="hp-feature-icon">{f.icon}</div>
                  <h3 className="hp-feature-title">{f.title}</h3>
                  <p className="hp-feature-desc">{f.description}</p>
                </article>
              ))}
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
  );
}
