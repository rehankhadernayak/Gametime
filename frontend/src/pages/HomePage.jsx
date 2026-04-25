import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';

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
  return (
    <div className={styles.root}>
      <NavBar auth={auth} />

      <main role="main">
        {/* ── StringTune Hero Stage ────────────────────────────────── */}
        <div className={styles.heroTrack}>
          <div className={styles.stage}>
            <h2 className={styles.monolith} data-string-parallax="0.8">GAMETIME</h2>

            <div className={styles.controllerWrapper} data-string-parallax="0.2">
              <img src="/controller.svg" alt="Controller" />
            </div>

            <div className={styles.kineticText} data-string="blur">
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
