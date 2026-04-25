import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import StringTune, { StringParallax } from '@fiddle-digital/string-tune';
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

     We also register a scroll mark on the 500vh track so the engine
     toggles the `.snapped` modifier (defined in landing.module.css) on
     the kinetic text once the user has scrolled ~10% of the track. This
     is what releases the headline from its blur(40px) / scale(1.5)
     pre-snap state. The mark is removed on cleanup so a remount under
     React Strict Mode doesn't stack duplicate listeners.
     ──────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const stringTune = StringTune.getInstance();
    stringTune.use(StringParallax);
    stringTune.start(60);

    const markId = 'gametime-hero-snap';
    let cancelled = false;

    const wire = () => {
      if (cancelled) return;
      stringTune.onResize(true);

      const kineticEl = kineticRef.current;
      const trackEl = heroTrackRef.current;
      if (!kineticEl || !trackEl) return;

      const trackTop = trackEl.getBoundingClientRect().top + window.scrollY;
      const snapOffset = trackTop + window.innerHeight * 0.6;

      stringTune.addScrollMark({
        id: markId,
        offset: snapOffset,
        direction: 'any',
        toggleClass: {
          target: kineticEl,
          className: styles.snapped,
        },
      });
    };

    const raf = window.requestAnimationFrame(wire);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      try {
        stringTune.removeScrollMark(markId);
      } catch {
        /* noop — mark may never have been added if the page unmounted
           before the rAF callback ran. */
      }
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
            (`string="parallax"` + `string-factor`) so the engine actually
            picks them up after `onResize(true)` runs in the bridge effect
            above. The kinetic text keeps `data-string="blur"` as a hook
            for the StringTune controller layer that drives its inline
            filter interpolation.
            ──────────────────────────────────────────────────────────── */}
        <div ref={heroTrackRef} className={styles.heroTrack}>
          <div className={styles.heroSection}>
            <h2
              className={styles.monolith}
              string="parallax"
              string-factor="0.8"
            >
              GAMETIME
            </h2>

            <div
              className={styles.controllerWrapper}
              string="parallax"
              string-factor="0.2"
            >
              <img src="/controller.svg" alt="Game controller" />
            </div>

            <div
              ref={kineticRef}
              className={styles.kineticText}
              data-string="blur"
            >
              <h1>Screen time, earned.</h1>
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
            GAMETIME
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
                <h3 className={styles.bentoTitle}>AI Evidence</h3>
                <p className={styles.bentoDesc}>Simple photo proof.</p>
                <div className={styles.bentoProgress}>
                  <div className={styles.bentoProgressFill} style={{ width: '78%' }} />
                </div>
              </article>

              <article className={styles.bentoCard}>
                <div className={styles.bentoIcon}>
                  <IconCoin />
                </div>
                <div className={styles.bentoLabel}>Card 2</div>
                <h3 className={styles.bentoTitle}>Points</h3>
                <p className={styles.bentoDesc}>Earn Gold &amp; RP.</p>
                <div className={styles.bentoProgress}>
                  <div className={styles.bentoProgressFill} style={{ width: '54%' }} />
                </div>
              </article>

              <article className={`${styles.bentoCard} ${styles.bentoCardWide}`}>
                <div className={styles.bentoIcon}>
                  <IconShield />
                </div>
                <div className={styles.bentoLabel}>Card 3</div>
                <h3 className={styles.bentoTitle}>Controls</h3>
                <p className={styles.bentoDesc}>Stop gaming instantly.</p>
                <div className={styles.bentoProgress}>
                  <div className={styles.bentoProgressFill} style={{ width: '92%' }} />
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ─────────────────────────────────────────── */}
        {!auth.token && (
          <section className={styles.closing} aria-labelledby="hp-closing-heading">
            <div className={styles.closingInner}>
              <h2 id="hp-closing-heading" className={styles.closingH2}>
                Ready to start?
              </h2>
              <Link to="/signup" className={`${styles.btnPrimary} ${styles.btnLg}`}>
                Get Started <IconArrow />
              </Link>
            </div>
          </section>
        )}

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer className={styles.footer} role="contentinfo">
          <div className={styles.footerInner}>
            <span className={styles.footerLogo}>Gametime</span>
            <span className={styles.footerMeta}>© 2026 · Singapore</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
