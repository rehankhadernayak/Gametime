import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import './HomePage.css';

/* ── Inline SVG Icons ───────────────────────────────────────────────────── */
function IconAI() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M12 2a5 5 0 0 1 5 5c0 1.5-.66 2.85-1.7 3.77L17 17H7l1.7-6.23A5 5 0 0 1 12 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M9 17v1a3 3 0 0 0 6 0v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M12 7v10M9.5 9.5C9.5 8.4 10.6 7 12 7s2.5 1.4 2.5 2.5c0 2.5-5 2.5-5 5 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M9 12.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Kinetic headline (blur + scale on scroll) ──────────────────────────── */
function KineticText({ progress, range = [0, 0.5], children, className = '' }) {
  const blur = useTransform(progress, range, [20, 0]);
  const scale = useTransform(progress, range, [0.8, 1]);
  const opacity = useTransform(progress, range, [0, 1]);
  const filter = useTransform(blur, (v) => `blur(${v}px)`);

  return (
    <motion.div style={{ filter, scale, opacity }} className={className}>
      {children}
    </motion.div>
  );
}

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

/* ── HomePage ───────────────────────────────────────────────────────────── */
export default function HomePage({ auth }) {
  const containerRef = useRef(null);
  const bentoRef = useRef(null);

  // Hero scroll progress (drives pin + kinetic hero text)
  const { scrollYProgress: heroProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Bento section scroll progress
  const { scrollYProgress: bentoProgress } = useScroll({
    target: bentoRef,
    offset: ['start end', 'end start'],
  });

  // Hero pin: lock hero in place while scrolling through the pin section
  const heroY = useTransform(heroProgress, [0, 0.6, 1], ['0%', '0%', '-20%']);
  const heroOpacity = useTransform(heroProgress, [0, 0.6, 1], [1, 1, 0]);
  const heroScale = useTransform(heroProgress, [0, 0.6, 1], [1, 1, 0.92]);

  // Hero kinetic text — clears as user begins scrolling
  const heroTextBlur = useTransform(heroProgress, [0, 0.15], [20, 0]);
  const heroTextScale = useTransform(heroProgress, [0, 0.15], [0.8, 1]);
  const heroTextFilter = useTransform(heroTextBlur, (v) => `blur(${v}px)`);

  // Horizontal parallax giant "GAMETIME" word — slides L→R across whole page
  const parallaxX = useTransform(bentoProgress, [0, 1], ['-30%', '30%']);

  // Bento card y-offsets — different per card for floating effect
  const card1Y = useTransform(bentoProgress, [0, 1], [120, -80]);
  const card2Y = useTransform(bentoProgress, [0, 1], [60, -140]);
  const card3Y = useTransform(bentoProgress, [0, 1], [180, -40]);

  return (
    <div className="hp-root">
      <NavBar auth={auth} />

      <main role="main">
        {/* ── Pinned Hero ──────────────────────────────────────────── */}
        <section ref={containerRef} className="hp-pin-section" aria-labelledby="hp-hero-heading">
          <div className="hp-pin-sticky">
            <motion.div
              className="hp-hero"
              style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
            >
              <motion.h1
                id="hp-hero-heading"
                className="hp-hero-h1"
                style={{ filter: heroTextFilter, scale: heroTextScale }}
              >
                Screen Time, Earned.
              </motion.h1>

              <motion.p
                className="hp-hero-sub"
                style={{ filter: heroTextFilter }}
              >
                Do chores. Get gaming time.
              </motion.p>

              <motion.div className="hp-hero-ctas" style={{ opacity: heroTextScale }}>
                {auth.token ? (
                  <Link
                    to={auth.role === 'parent' ? '/parent/ai' : '/child/dashboard'}
                    className="hp-btn-primary"
                  >
                    Go to Dashboard <IconArrow />
                  </Link>
                ) : (
                  <>
                    <Link to="/signup" className="hp-btn-primary">
                      Get Started <IconArrow />
                    </Link>
                    <a href="#bento" className="hp-btn-ghost">
                      How it works
                    </a>
                  </>
                )}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Bento Grid with floating cards + parallax word ─────── */}
        <section
          id="bento"
          ref={bentoRef}
          className="hp-bento-section"
          aria-label="Features"
        >
          {/* Horizontal parallax giant text behind cards */}
          <motion.div
            className="hp-parallax-word"
            style={{ x: parallaxX }}
            aria-hidden="true"
          >
            GAMETIME
          </motion.div>

          <div className="hp-bento-inner">
            <KineticText progress={bentoProgress} range={[0.05, 0.25]}>
              <h2 className="hp-bento-heading">How it works.</h2>
            </KineticText>

            <div className="hp-bento-grid">
              <motion.article
                className="hp-bento-card hp-bento-card--tall"
                style={{ y: card1Y }}
              >
                <div className="hp-bento-icon">
                  <IconAI />
                </div>
                <div className="hp-bento-label">Card 1</div>
                <h3 className="hp-bento-title">AI Evidence</h3>
                <p className="hp-bento-desc">Simple photo proof.</p>
                <div className="hp-bento-progress">
                  <div className="hp-bento-progress-fill" style={{ width: '78%' }} />
                </div>
              </motion.article>

              <motion.article
                className="hp-bento-card"
                style={{ y: card2Y }}
              >
                <div className="hp-bento-icon">
                  <IconCoin />
                </div>
                <div className="hp-bento-label">Card 2</div>
                <h3 className="hp-bento-title">Points</h3>
                <p className="hp-bento-desc">Earn Gold &amp; RP.</p>
                <div className="hp-bento-progress">
                  <div className="hp-bento-progress-fill" style={{ width: '54%' }} />
                </div>
              </motion.article>

              <motion.article
                className="hp-bento-card hp-bento-card--wide"
                style={{ y: card3Y }}
              >
                <div className="hp-bento-icon">
                  <IconShield />
                </div>
                <div className="hp-bento-label">Card 3</div>
                <h3 className="hp-bento-title">Controls</h3>
                <p className="hp-bento-desc">Stop gaming instantly.</p>
                <div className="hp-bento-progress">
                  <div className="hp-bento-progress-fill" style={{ width: '92%' }} />
                </div>
              </motion.article>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ─────────────────────────────────────────── */}
        {!auth.token && (
          <section className="hp-closing" aria-labelledby="hp-closing-heading">
            <div className="hp-closing-inner">
              <h2 id="hp-closing-heading" className="hp-closing-h2">
                Ready to start?
              </h2>
              <Link to="/signup" className="hp-btn-primary hp-btn-lg">
                Get Started <IconArrow />
              </Link>
            </div>
          </section>
        )}

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer className="hp-footer" role="contentinfo">
          <div className="hp-footer-inner">
            <span className="hp-footer-logo">Gametime</span>
            <span className="hp-footer-meta">© 2026 · Singapore</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
