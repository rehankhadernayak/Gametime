import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import './HomePage.css';

/* ── Scroll reveal hook (GSAP-style stagger via IntersectionObserver) ─── */
function useReveal() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = root.querySelectorAll('[data-reveal]');

    if (reduce) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = Number(el.getAttribute('data-reveal-delay') || 0);
            window.setTimeout(() => el.classList.add('is-visible'), delay);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return rootRef;
}

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

/* ── How it works data ──────────────────────────────────────────────────── */
const HOW_IT_WORKS = [
  {
    number: '01',
    icon: <IconQuest />,
    title: 'Set Quests',
    description: 'Parents create tasks — clean your room, finish homework, read for 20 minutes — each worth a set number of RP.',
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
    description: 'Claude Vision analyses the evidence. Parent gets a summary and one-tap approve — child earns their RP.',
  },
];

/* ── NavBar ─────────────────────────────────────────────────────────────── */
function NavBar({ auth }) {
  if (auth.token) return null;
  return (
    <nav className="hp-nav" aria-label="Site navigation">
      <div className="hp-nav-inner">
        <Link to="/" className="hp-nav-logo" aria-label="Gametime home">
          <span className="hp-nav-logo-dot" aria-hidden="true" />
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

/* ── Device Mockup (Antigravity Light) ─────────────────────────────────── */
function DeviceMockup() {
  return (
    <div className="hp-device-wrap" aria-hidden="true">
      <div className="hp-device">
        <div className="hp-device-statusbar">
          <span className="hp-device-time">9:41</span>
          <div className="hp-device-dots">
            <span /><span /><span />
          </div>
        </div>

        <div className="hp-device-appbar">
          <div className="hp-device-avatar" />
          <div>
            <div className="hp-device-name">Hi, Alex</div>
            <div className="hp-device-subtitle">3 quests waiting</div>
          </div>
          <div className="hp-device-rp-badge">
            <span>1,240 RP</span>
          </div>
        </div>

        <div className="hp-device-quests">
          <div className="hp-device-quest">
            <div className="hp-dq-left">
              <div className="hp-dq-icon hp-dq-icon--red" />
              <div>
                <div className="hp-dq-title">Clean your room</div>
                <div className="hp-dq-pts">+50 RP</div>
              </div>
            </div>
            <div className="hp-dq-status hp-dq-status--done">Done</div>
          </div>
          <div className="hp-device-quest">
            <div className="hp-dq-left">
              <div className="hp-dq-icon hp-dq-icon--ink" />
              <div>
                <div className="hp-dq-title">Finish homework</div>
                <div className="hp-dq-pts">+80 RP</div>
              </div>
            </div>
            <div className="hp-dq-status hp-dq-status--pending">Review</div>
          </div>
          <div className="hp-device-quest">
            <div className="hp-dq-left">
              <div className="hp-dq-icon hp-dq-icon--mist" />
              <div>
                <div className="hp-dq-title">Read for 20 min</div>
                <div className="hp-dq-pts">+40 RP</div>
              </div>
            </div>
            <div className="hp-dq-status hp-dq-status--new">New</div>
          </div>
        </div>

        <div className="hp-device-progress-wrap">
          <div className="hp-device-progress-label">
            <span>Daily goal</span>
            <span>170 / 200 RP</span>
          </div>
          <div className="hp-device-progress-track">
            <div className="hp-device-progress-fill" style={{ width: '85%' }} />
          </div>
        </div>

        <div className="hp-device-redeem">
          <div className="hp-device-redeem-badge hp-device-redeem-badge--roblox">Roblox</div>
          <div className="hp-device-redeem-badge hp-device-redeem-badge--steam">Steam</div>
          <div className="hp-device-redeem-badge hp-device-redeem-badge--razer">Razer Gold</div>
        </div>
      </div>
    </div>
  );
}

/* ── Bento visuals (per-card illustrations, no stock imagery) ─────────── */
function BentoAiVisual() {
  return (
    <div className="hp-bento-visual hp-bento-visual--ai" aria-hidden="true">
      <div className="hp-bento-ai-photo">
        <div className="hp-bento-ai-scan" />
        <div className="hp-bento-ai-frame" />
      </div>
      <div className="hp-bento-ai-chip">
        <span className="hp-bento-ai-chip-dot" />
        Claude Vision · verified
      </div>
    </div>
  );
}

function BentoCurrencyVisual() {
  return (
    <div className="hp-bento-visual hp-bento-visual--currency" aria-hidden="true">
      <div className="hp-bento-coin hp-bento-coin--rp">
        <span>RP</span>
      </div>
      <div className="hp-bento-coin hp-bento-coin--gold">
        <span>G</span>
      </div>
      <div className="hp-bento-rail">
        <div className="hp-bento-rail-step hp-bento-rail-step--filled">Earn</div>
        <div className="hp-bento-rail-step hp-bento-rail-step--filled">Convert</div>
        <div className="hp-bento-rail-step">Redeem</div>
      </div>
    </div>
  );
}

function BentoTimeVisual() {
  return (
    <div className="hp-bento-visual hp-bento-visual--time" aria-hidden="true">
      <div className="hp-bento-time-row">
        <span className="hp-bento-time-label">Mon</span>
        <div className="hp-bento-time-bar"><i style={{ width: '55%' }} /></div>
        <span className="hp-bento-time-val">1h 05m</span>
      </div>
      <div className="hp-bento-time-row">
        <span className="hp-bento-time-label">Tue</span>
        <div className="hp-bento-time-bar"><i style={{ width: '80%' }} /></div>
        <span className="hp-bento-time-val">1h 35m</span>
      </div>
      <div className="hp-bento-time-row">
        <span className="hp-bento-time-label">Wed</span>
        <div className="hp-bento-time-bar"><i style={{ width: '38%' }} /></div>
        <span className="hp-bento-time-val">45m</span>
      </div>
      <div className="hp-bento-time-row">
        <span className="hp-bento-time-label">Thu</span>
        <div className="hp-bento-time-bar"><i style={{ width: '92%' }} /></div>
        <span className="hp-bento-time-val">1h 50m</span>
      </div>
    </div>
  );
}

/* ── HomePage ───────────────────────────────────────────────────────────── */
export default function HomePage({ auth }) {
  const rootRef = useReveal();

  return (
    <div className="hp-root" ref={rootRef}>
      {/* ── Ambient background (Antigravity Light) ──────────────── */}
      <div className="hp-ambient" aria-hidden="true">
        <div className="hp-ambient-glow hp-ambient-glow--1" />
        <div className="hp-ambient-glow hp-ambient-glow--2" />
        <div className="hp-ambient-grid" />
      </div>

      <NavBar auth={auth} />

      <main role="main">
        {/* ── 1. Hero ─────────────────────────────────────────────── */}
        <section className="hp-hero" aria-labelledby="hp-hero-heading">
          <div className="hp-hero-inner">
            <div className="hp-hero-content">
              <div className="hp-eyebrow" data-reveal>
                <span className="hp-eyebrow-dot" aria-hidden="true" />
                Family protocol · Singapore
              </div>

              <h1 id="hp-hero-heading" className="hp-hero-h1" data-reveal data-reveal-delay="80">
                Screen Time,<br />
                <span className="hp-hero-accent">Earned.</span>
              </h1>

              <p className="hp-hero-sub" data-reveal data-reveal-delay="160">
                The family-authoritative protocol that turns chores into digital rewards.
              </p>

              <div className="hp-hero-ctas" data-reveal data-reveal-delay="240">
                {auth.token ? (
                  <Link
                    to={auth.role === 'parent' ? '/parent/ai' : '/child/dashboard'}
                    className="hp-btn-primary hp-btn-lg"
                  >
                    Go to Dashboard
                    <IconArrow />
                  </Link>
                ) : (
                  <>
                    <Link to="/signup" className="hp-btn-primary hp-btn-lg">
                      Get Started Free
                      <IconArrow />
                    </Link>
                    <a href="#how-it-works" className="hp-btn-ghost hp-btn-lg">
                      See how it works
                    </a>
                  </>
                )}
              </div>

              <div className="hp-hero-meta" data-reveal data-reveal-delay="320">
                <div className="hp-hero-meta-item">
                  <span className="hp-hero-meta-num">500+</span>
                  <span className="hp-hero-meta-label">families</span>
                </div>
                <div className="hp-hero-meta-divider" aria-hidden="true" />
                <div className="hp-hero-meta-item">
                  <span className="hp-hero-meta-num">2,000+</span>
                  <span className="hp-hero-meta-label">quests completed</span>
                </div>
                <div className="hp-hero-meta-divider" aria-hidden="true" />
                <div className="hp-hero-meta-item">
                  <span className="hp-hero-meta-num">4.9</span>
                  <span className="hp-hero-meta-label">parent rating</span>
                </div>
              </div>
            </div>

            <div data-reveal data-reveal-delay="200">
              <DeviceMockup />
            </div>
          </div>
        </section>

        {/* ── 2. How It Works ─────────────────────────────────────── */}
        <section id="how-it-works" className="hp-how" aria-labelledby="hp-how-heading">
          <div className="hp-section-inner">
            <div className="hp-section-header" data-reveal>
              <div className="hp-section-kicker">How it works</div>
              <h2 id="hp-how-heading" className="hp-section-h2">
                Simple for parents.<br />
                <span className="hp-hero-accent">Exciting for kids.</span>
              </h2>
            </div>

            <div className="hp-how-grid">
              {HOW_IT_WORKS.map((step, i) => (
                <article
                  key={step.number}
                  className="hp-how-card"
                  data-reveal
                  data-reveal-delay={i * 120}
                >
                  <div className="hp-how-number" aria-hidden="true">{step.number}</div>
                  <div className="hp-how-icon">{step.icon}</div>
                  <h3 className="hp-how-title">{step.title}</h3>
                  <p className="hp-how-desc">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Bento Grid ───────────────────────────────────────── */}
        <section className="hp-bento" aria-labelledby="hp-bento-heading">
          <div className="hp-section-inner">
            <div className="hp-section-header" data-reveal>
              <div className="hp-section-kicker">The platform</div>
              <h2 id="hp-bento-heading" className="hp-section-h2">
                Everything a Family <span className="hp-hero-accent">Needs.</span>
              </h2>
              <p className="hp-section-lede">
                One protocol. Three pillars. Every chore routed to a reward your child actually cares about.
              </p>
            </div>

            <div className="hp-bento-grid">
              {/* AI Evidence Review — large */}
              <article className="hp-bento-card hp-bento-card--ai" data-reveal>
                <div className="hp-bento-head">
                  <div className="hp-bento-icon"><IconAI /></div>
                  <span className="hp-bento-tag">Core</span>
                </div>
                <h3 className="hp-bento-title">AI Evidence Review</h3>
                <p className="hp-bento-desc">
                  Claude Vision inspects every photo and video submission before it ever reaches the parent queue —
                  flagging mismatches, rewarding real effort, and cutting approval time to seconds.
                </p>
                <BentoAiVisual />
                <ul className="hp-bento-bullets">
                  <li>Auto-summary per submission</li>
                  <li>One-tap parent approval</li>
                  <li>Zero manual triage</li>
                </ul>
              </article>

              {/* Dual Currency — medium */}
              <article className="hp-bento-card hp-bento-card--currency" data-reveal data-reveal-delay="100">
                <div className="hp-bento-head">
                  <div className="hp-bento-icon"><IconCoin /></div>
                  <span className="hp-bento-tag">Economy</span>
                </div>
                <h3 className="hp-bento-title">Dual Currency <span className="hp-bento-title-sub">RP &amp; Gold</span></h3>
                <p className="hp-bento-desc">
                  Reward Points unlock streaks and badges. Gold converts to real Roblox, Steam, and Razer credit —
                  cleanly separated so motivation never leaks.
                </p>
                <BentoCurrencyVisual />
              </article>

              {/* Gaming Time Control — wide */}
              <article className="hp-bento-card hp-bento-card--time" data-reveal data-reveal-delay="200">
                <div className="hp-bento-head">
                  <div className="hp-bento-icon"><IconClock /></div>
                  <span className="hp-bento-tag">Authority</span>
                </div>
                <h3 className="hp-bento-title">Gaming Time Control</h3>
                <p className="hp-bento-desc">
                  Daily and weekly screen-time caps, enforced at the device. Every extra minute is earned through a quest,
                  never negotiated at the dinner table.
                </p>
                <BentoTimeVisual />
              </article>
            </div>
          </div>
        </section>

        {/* ── 4. Bottom CTA ───────────────────────────────────────── */}
        {!auth.token && (
          <section className="hp-cta-section" aria-labelledby="hp-cta-heading">
            <div className="hp-cta-inner" data-reveal>
              <div className="hp-cta-kicker">
                <span className="hp-eyebrow-dot" aria-hidden="true" />
                Join the protocol
              </div>
              <h2 id="hp-cta-heading" className="hp-cta-h2">
                Ready to make gaming <span className="hp-hero-accent">fair?</span>
              </h2>
              <p className="hp-cta-sub">
                Turn the next chore into the next reward. Set up a family account in under two minutes.
              </p>
              <div className="hp-cta-actions">
                <Link to="/signup" className="hp-btn-primary hp-btn-lg">
                  Create Free Account
                  <IconArrow />
                </Link>
                <Link to="/login" className="hp-btn-ghost hp-btn-lg">
                  Parent Login
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── 5. Footer ───────────────────────────────────────────── */}
        <footer className="hp-footer" role="contentinfo">
          <div className="hp-footer-inner">
            <div className="hp-footer-brand">
              <span className="hp-footer-logo">
                <span className="hp-nav-logo-dot" aria-hidden="true" />
                Gametime
              </span>
              <p className="hp-footer-tagline">
                The family-authoritative protocol that turns chores into digital rewards.
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
            <span className="hp-footer-status">
              <span className="hp-footer-status-dot" aria-hidden="true" />
              All systems operational
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
