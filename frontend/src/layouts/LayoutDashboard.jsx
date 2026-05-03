/**
 * LayoutDashboard
 * 
 * Wrapper for dashboard pages (parent/child dashboards)
 * Provides:
 * - Clean layout structure
 * - Sidebar/main content split
 * - Isolated dashboard styles
 * 
 * CSS isolation: Uses CSS Modules to prevent style bleed into landing page
 */

import styles from '../styles/dashboard.module.css';

export default function LayoutDashboard({ children }) {
  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.dashboardContainer}>
        {children}
      </div>
    </div>
  );
}
