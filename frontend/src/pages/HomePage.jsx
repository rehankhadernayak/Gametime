import { useEffect, useRef } from 'react';
import { GametimeLink } from 'gametime-web-nav';
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
        <GametimeLink href="/" className={styles.navLogo} aria-label="Gametime home">
          Gametime
        </GametimeLink>
        <div className={styles.navActions}>
          <GametimeLink href="/login" className={styles.navLink}>Parent Login</GametimeLink>
          <GametimeLink href="/signup" className={styles.navCta}>Get Started</GametimeLink>
        </div>
      </div>
    </nav>
  );
}

/* ── HomePage ───────────────────────────────────────────────────────────── */
export default function HomePage({ auth }) {
  const heroSnapRef = useRef(null);
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

     We additionally drive the hero snap shell `.snapped` toggle with a
     plain scroll listener instead of `addScrollMark`. In the manual
     diagnostic for v1.1.55, the toggleClass form of addScrollMark never
     flipped the class on the live DOM, so we sidestep it entirely: the
     listener toggles `.snapped` on `heroSnapRef` once the user has
     crossed 60% of the first viewport, which releases the headline and
     controller assembly from their pre-snap states in landing.module.css.
     ──────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const stringTune = StringTune.getInstance();
    stringTune.use(StringParallax);
    stringTune.start(60);

    let cancelled = false;
    let snapped = false;

    const evaluateSnap = () => {
      const trackEl = heroTrackRef.current;
      const snapEl = heroSnapRef.current;
      if (!trackEl || !snapEl) return;

      const trackTop = trackEl.getBoundingClientRect().top + window.scrollY;
      const threshold = trackTop + window.innerHeight * 0.6;
      const shouldSnap = window.scrollY >= threshold;

      if (shouldSnap !== snapped) {
        snapped = shouldSnap;
        snapEl.classList.toggle(styles.snapped, shouldSnap);
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
            The hero snap shell uses the `.snapped` modifier toggled by the
            bridge's scroll listener — same resolution signal as the
            kinetic headline (data-string="blur" pattern in CSS).
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

            <div ref={heroSnapRef} className={styles.heroSnap}>
              <div
                className={styles.controllerWrapper}
                string="parallax"
                string-parallax="0.18"
              >
                <div
                  className={styles.controllerAssembly}
                  role="img"
                  aria-label="Game controller"
                >
                  <img
                    className={styles.assemblyLeftGrip}
                    src="/left-grip.svg"
                    alt=""
                  />
                  <img
                    className={styles.assemblyRightGrip}
                    src="/right-grip.svg"
                    alt=""
                  />
                  <img
                    className={styles.assemblyDpad}
                    src="/d-pad.svg"
                    alt=""
                  />
                  <img
                    className={styles.assemblyButtons}
                    src="/buttons.svg"
                    alt=""
                  />
                </div>
              </div>

              <div className={styles.kineticText} data-string="blur">
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
              <GametimeLink href="/signup" className={`${styles.btnPrimary} ${styles.btnLg}`}>
                Get Started <IconArrow />
              </GametimeLink>
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
