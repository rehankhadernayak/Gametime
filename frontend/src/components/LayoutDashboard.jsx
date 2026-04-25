import styles from '../styles/dashboard.module.css';

/**
 * LayoutDashboard
 * --------------------------------------------------------------------------
 * Wraps every authenticated / SaaS surface (auth, parent dashboard,
 * child dashboard, AI workspace, settings, onboarding, admin, etc.).
 *
 * Contract:
 *   - DOES NOT initialize StringTune's smooth-scroll engine.
 *   - DOES NOT pin, jack, or parallax-transform the document.
 *   - Native browser scrolling only; subtle micro-interactions
 *     (`data-string="magnetic"`, one-shot `data-string="split"`) may be
 *     attached by individual screens later, but no global engine boot.
 *
 * The legacy global `app.css` (loaded from `main.jsx`) continues to
 * provide the actual visual layer for dashboard components in Phase 1.
 */
export default function LayoutDashboard({ children }) {
  return <div className={styles.root}>{children}</div>;
}
