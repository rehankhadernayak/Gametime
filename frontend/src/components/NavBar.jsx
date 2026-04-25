import './NavBar.css';
import NotificationBell from './NotificationBell.jsx';
import { useAppRouter } from 'gametime-web-nav';

/* ── Inline SVGs ────────────────────────────────────────────────────── */
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17 4.9 19.1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M15.5 3.5A8.5 8.5 0 1 0 20 18 7.3 7.3 0 0 1 15.5 3.5Z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/* ── NavBar ─────────────────────────────────────────────────────────── */
export default function NavBar({ role, token, onLogout, theme, onToggleTheme, isAdmin }) {
  const router = useAppRouter();

  return (
    <nav className="nav" aria-label="Primary navigation">
      {/* Left: Logo */}
      <div className="nav-brand">
        <div className="nav-logo-mark" aria-hidden="true">
          <div className="nav-logo-mark-inner" />
        </div>
        <span className="nav-brand-name">Gametime</span>
      </div>

      {/* Center: empty spacer */}
      <div className="nav-center" aria-hidden="true" />

      {/* Right: Actions */}
      <div className="nav-actions">
        <NotificationBell token={token} role={role} />

        {/* Theme toggle */}
        <button
          type="button"
          className="nav-icon-btn"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Settings (parent only) */}
        {role === 'parent' && (
          <button
            type="button"
            className="nav-icon-btn nav-settings-btn"
            aria-label="Settings"
            title="Settings"
            onClick={() => router.push('/parent/settings')}
          >
            <SettingsIcon />
          </button>
        )}

        <div className="nav-sep" aria-hidden="true" />

        {/* Admin badge */}
        {isAdmin && (
          <button
            type="button"
            className="nav-admin-badge"
            aria-label="Admin dashboard"
            title="Go to Admin"
            onClick={() => router.push('/admin')}
          >
            Admin
          </button>
        )}

        {/* Role pill */}
        <span className={`nav-role-pill ${role === 'parent' ? 'parent' : 'child'}`}>
          {role === 'parent' ? 'Parent' : 'Child'}
        </span>

        {/* Logout */}
        <button
          type="button"
          className="nav-logout-btn"
          onClick={async () => {
            try {
              await onLogout();
            } finally {
              router.replace('/login');
            }
          }}
        >
          <LogoutIcon />
          Logout
        </button>
      </div>
    </nav>
  );
}
