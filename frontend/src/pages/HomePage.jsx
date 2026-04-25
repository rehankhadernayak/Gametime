import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import StringTune, { StringMagnetic, StringParallax } from '@fiddle-digital/string-tune';
import styles from '../styles/landing.module.css';

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

/* ── NavBar ─────────────────────────────────────────────────────────────── */
function NavBar({ auth }) {
  if (auth.token) return null;
  return (
    <nav className={styles.nav} aria-label="Site navigation">
      <div className={styles.navInner}>
        <Link to="/" className={styles.navLogo} aria-label="Gametime home">
          Gametime
        </Link>
        <div className={styles.navActions}>
          <Link to="/login" className={styles.navLink}>Parent Login</Link>
          <Link to="/signup" className={styles.navCta}>Get Started</Link>
        </div>
      </div>
    </nav>
  );
}

/* ── HomePage ───────────────────────────────────────────────────────────── */
export default function HomePage({ auth }) {
  const kineticRef = useRef(null);
  const heroTrackRef = useRef(null);

  /* ── StringTune bridge ─────────────────────────────────────────────────
     The library is a singleton (`getInstance()`), so it's safe under React
     Strict Mode's double-mount: `use()` no-ops on a class that's already
     registered, and `start()` is idempotent because the loop guards on
     `hasStarted` internally. After the JSX paints we call `onResize(true)`
     — that's the documented "rebuild layout + re-scan attribute-tagged
     DOM" entry point in this version of StringTune (there is no public
     `refresh()` / `update()`; `onResize(force)` is what its own JSDoc
     describes as "Rebuilds layout and triggers module resize"). Without
     this, the engine — which boots before React mounts — would never see
     the `string="parallax"` nodes added by this page and the 500vh
     scroll progress would never map onto the Monolith / Controller.

     We additionally drive the kineticText `.snapped` toggle with a plain
     scroll listener instead of `addScrollMark`. In the manual diagnostic
     for v1.1.55, the toggleClass form of addScrollMark never flipped the
     class on the live DOM, so we sidestep it entirely: the listener
     toggles `.snapped` once the user has crossed 60% of the first
     viewport, which is what releases the headline from its
     blur(40px)/scale(1.5) pre-snap state defined in landing.module.css.

     Footer CTA uses `data-string="magnetic"` with `StringMagnetic` registered
     here so the button eases toward the cursor.
     ──────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const stringTune = StringTune.getInstance();
    stringTune.use(StringParallax);
    stringTune.use(StringMagnetic);
    stringTune.start(60);

    let cancelled = false;
    let snapped = false;

    const evaluateSnap = () => {
      const trackEl = heroTrackRef.current;
      const kineticEl = kineticRef.current;
      if (!trackEl || !kineticEl) return;

      const trackTop = trackEl.getBoundingClientRect().top + window.scrollY;
      const threshold = trackTop + window.innerHeight * 0.6;
      const shouldSnap = window.scrollY >= threshold;

      if (shouldSnap !== snapped) {
        snapped = shouldSnap;
        kineticEl.classList.toggle(styles.snapped, shouldSnap);
      }
    };

    const wire = () => {
      if (cancelled) return;
      stringTune.onResize(true);
      evaluateSnap();
    };

    const raf = window.requestAnimationFrame(wire);
    window.addEventListener('scroll', evaluateSnap, { passive: true });
    window.addEventListener('resize', evaluateSnap);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', evaluateSnap);
      window.removeEventListener('resize', evaluateSnap);
    };
  }, []);

  return (
    <div className={styles.root}>
      <NavBar auth={auth} />

      <main role="main">
        {/* ── StringTune Hero Stage ──────────────────────────────────
            500vh tracking div drives the scroll-bound StringTune timeline.
            The inner sticky stage uses `styles.heroSection`, which Agent 2
            defines as the positioned anchor for the monolith / controller /
            kinetic text. Sticky pinning is owned by the CSS module so we
            don't need Tailwind utilities to reproduce it.

            The Monolith and Controller use StringTune's real attribute API
            for parallax: `string="parallax"` registers the element with
            the parallax module, and `string-parallax="<intensity>"` sets
            the depth factor (the engine reads `string-${key}` for each
            entry in StringParallax.attributesToMap, so the modifier
            attribute MUST be `string-parallax`, not `string-factor`).
            The kinetic text uses the `.snapped` modifier toggled by the
            bridge's scroll listener instead — see the useEffect above
            for why.
            ──────────────────────────────────────────────────────────── */}
        <div ref={heroTrackRef} className={styles.heroTrack}>
          <div className={styles.heroSection}>
            <h2
              className={styles.monolith}
              string="parallax"
              string-parallax="0.55"
            >
              Gametime
            </h2>

            <div
              ref={kineticRef}
              className={styles.heroSnap}
              string="parallax"
              string-parallax="0.18"
            >
              <div className={styles.controllerWrapper}>
                <div className={styles.controllerPieces} aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 480 300"
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${styles.controllerPiece} ${styles.controllerPieceBody}`}
                  >
                    <path
                      d="M120 80 C 70 80, 30 130, 30 190 C 30 240, 60 270, 100 270 C 120 270, 135 258, 150 240 L 330 240 C 345 258, 360 270, 380 270 C 420 270, 450 240, 450 190 C 450 130, 410 80, 360 80 Z"
                      strokeWidth="6"
                    />
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 480 300"
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${styles.controllerPiece} ${styles.controllerPieceDpad}`}
                  >
                    <rect x="92" y="148" width="56" height="18" rx="4" strokeWidth="5" />
                    <rect x="111" y="129" width="18" height="56" rx="4" strokeWidth="5" />
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 480 300"
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${styles.controllerPiece} ${styles.controllerPieceFace}`}
                  >
                    <circle cx="358" cy="138" r="9" strokeWidth="5" />
                    <circle cx="388" cy="158" r="9" strokeWidth="5" />
                    <circle cx="358" cy="178" r="9" strokeWidth="5" />
                    <circle cx="328" cy="158" r="9" strokeWidth="5" />
                    <circle cx="240" cy="158" r="6" strokeWidth="4" />
                    <line x1="210" y1="158" x2="222" y2="158" strokeWidth="4" />
                    <line x1="258" y1="158" x2="270" y2="158" strokeWidth="4" />
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 480 300"
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${styles.controllerPiece} ${styles.controllerPieceSticks}`}
                  >
                    <path d="M150 78 Q 240 50 330 78" strokeWidth="5" opacity="0.55" />
                    <circle cx="180" cy="208" r="20" strokeWidth="5" />
                    <circle cx="180" cy="208" r="6" strokeWidth="4" />
                    <circle cx="300" cy="208" r="20" strokeWidth="5" />
                    <circle cx="300" cy="208" r="6" strokeWidth="4" />
                  </svg>
                </div>
              </div>

              <div className={styles.kineticText}>
                <h1>Screen time, earned.</h1>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bento Grid with floating cards + parallax word ─────── */}
        <section
          id="bento"
          className={styles.bentoSection}
          aria-label="Features"
        >
          {/* Horizontal parallax giant text behind cards */}
          <div className={styles.parallaxWord} aria-hidden="true">
            Gametime
          </div>

          <div className={styles.bentoInner}>
            <div className={styles.bentoHeadingWrap}>
              <h2 className={styles.bentoHeading}>How it works.</h2>
            </div>

            <div className={styles.bentoGrid}>
              <article className={`${styles.bentoCard} ${styles.bentoCardTall}`}>
                <div className={styles.bentoIcon}>
                  <IconAI />
                </div>
                <div className={styles.bentoLabel}>Card 1</div>
                <h3 className={styles.bentoTitle}>AI Evidence Validation</h3>
                <p className={styles.bentoDesc}>
                  Kids snap a photo of their finished chore. Our AI instantly verifies the evidence and approves it.
                </p>
                <div className={styles.bentoProgress}>
                  <div className={styles.bentoProgressFill} style={{ width: '78%' }} />
                </div>
              </article>

              <article className={styles.bentoCard}>
                <div className={styles.bentoIcon}>
                  <IconCoin />
                </div>
                <div className={styles.bentoLabel}>Card 2</div>
                <h3 className={styles.bentoTitle}>The Dual Economy</h3>
                <p className={styles.bentoDesc}>
                  Earn Gold for real-life rewards (gift cards) and RP for automated, system-level screen time.
                </p>
                <div className={styles.bentoProgress}>
                  <div className={styles.bentoProgressFill} style={{ width: '54%' }} />
                </div>
              </article>

              <article className={`${styles.bentoCard} ${styles.bentoCardWide}`}>
                <div className={styles.bentoIcon}>
                  <IconShield />
                </div>
                <div className={styles.bentoLabel}>Card 3</div>
                <h3 className={styles.bentoTitle}>Parental Override</h3>
                <p className={styles.bentoDesc}>
                  Total control in your pocket. Instantly pause their gaming sessions from your phone if chores aren&apos;t done.
                </p>
                <div className={styles.bentoProgress}>
                  <div className={styles.bentoProgressFill} style={{ width: '92%' }} />
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── Footer (grand finale) ───────────────────────────────── */}
        <footer className={styles.footer} role="contentinfo">
          <div className={styles.footerInner}>
            <div className={styles.footerFinale}>
              <h2 className={styles.footerFinaleHeadline}>Ready to make gaming fair?</h2>
              {!auth.token && (
                <Link
                  to="/signup"
                  className={`${styles.btnPrimary} ${styles.btnLg} ${styles.footerMagneticCta}`}
                  data-string="magnetic"
                >
                  Create Free Account <IconArrow />
                </Link>
              )}
            </div>
            <div className={styles.footerBar}>
              <span className={styles.footerLogo}>Gametime</span>
              <span className={styles.footerMeta}>© 2026 · Singapore</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
