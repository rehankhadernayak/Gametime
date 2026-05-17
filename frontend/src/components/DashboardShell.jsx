import { useEffect, useMemo, useState } from 'react';
import { useAppRouter } from 'gametime-web-nav';

/** Same ASCII mark as `HomePage.jsx` / `LandingNav` — product logo. */
const ASCII_MARK = `██████╗  █████╗ ███╗   ███╗███████╗████████╗██╗███╗   ███╗███████╗
██╔════╝ ██╔══██╗████╗ ████║██╔════╝╚══██╔══╝██║████╗ ████║██╔════╝
██║  ███╗███████║██╔████╔██║█████╗     ██║   ██║██╔████╔██║█████╗
██║   ██║██╔══██║██║╚██╔╝██║██╔══╝     ██║   ██║██║╚██╔╝██║██╔══╝
╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗   ██║   ██║██║ ╚═╝ ██║███████╗
 ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝`;

/* ── Icons ─────────────────────────────────────────────────── */
function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M3 10.5L12 3l9 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v10h12V10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconGamepad() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="3" y="9" width="18" height="9" rx="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 13h4M10 11v4M15.5 12.5h.01M17.5 14.5h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="8" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16.5" cy="8.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5M13 19c0-2.1 1.6-3.8 3.7-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconTasks() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M7 6h13M7 12h13M7 18h13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M3 8h18v4H3zM5 12h14v9H5zM12 8v13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8s-3.5-1.2-3.5-3A2 2 0 0 1 12 4m0 4s3.5-1.2 3.5-3A2 2 0 0 0 12 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.1L12 17.1 6.4 20l1.1-6.1L3 9.5l6.2-.9z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function IconDefault() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconAi() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/* ── Icon map ───────────────────────────────────────────────── */
const SECTION_ICON_BY_ID = {
  home:      IconHome,
  overview:  IconHome,
  gaming:    IconGamepad,
  family:    IconUsers,
  tasks:     IconTasks,
  giftcards: IconGift,
  rewards:   IconStar,
  ai:        IconAi,
};

/* Sections that belong to the "Main" group; everything else → "Manage" */
const MAIN_SECTION_IDS = new Set(['home', 'overview']);

/* ── MenuButton sub-component ───────────────────────────────── */
function MenuButton({ section, isActive, onClick }) {
  const Icon = SECTION_ICON_BY_ID[section.id] || IconDefault;
  return (
    <button
      type="button"
      className={`menu-item ${isActive ? 'active' : ''}`}
      data-id={section.id}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onClick(section.id)}
    >
      <span className="menu-item-icon" aria-hidden="true"><Icon /></span>
      <span className="menu-item-label">{section.label}</span>
    </button>
  );
}

/* ── DashboardShell ─────────────────────────────────────────── */
export default function DashboardShell({
  title,
  sections,
  variant = 'parent',
  controlRef,
  settingsHref = null,
  dashboardSectionHome = 'home',
  dashboardSectionTasks = 'tasks'
}) {
  const router = useAppRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || '');
  const [history, setHistory] = useState([]);

  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeSectionId) || sections[0],
    [activeSectionId, sections]
  );

  /* Keep active section valid when sections change */
  useEffect(() => {
    if (sections.find((s) => s.id === activeSectionId)) return;
    setActiveSectionId(sections[0]?.id || '');
  }, [sections, activeSectionId]);

  /* Close sidebar on Escape */
  useEffect(() => {
    const onEscape = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  /* Prevent background scroll on mobile when sidebar open */
  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen);
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  function goToSection(nextId) {
    if (!nextId || nextId === activeSectionId) return;
    setHistory((prev) => [...prev, activeSectionId]);
    setActiveSectionId(nextId);
    setSidebarOpen(false);
  }

  /** Switch section without pushing history (e.g. after a modal action). */
  function jumpToSection(nextId) {
    if (!nextId) return;
    setActiveSectionId(nextId);
    setSidebarOpen(false);
  }

  /* In AI mode, clicking any section just navigates normally - the AI panel
     stays visible on the right regardless of which section is active. */
  function handleMenuClick(sectionId) {
    goToSection(sectionId);
  }

  /* Expose navigation imperatively so parent components can drive section changes */
  if (controlRef) controlRef.current = { goToSection, jumpToSection };

  function goBackSection() {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const copy = [...prev];
      const prevId = copy.pop();
      setActiveSectionId(prevId);
      return copy;
    });
  }

  /* Split nav into two groups */
  const mainSections   = sections.filter((s) => MAIN_SECTION_IDS.has(s.id));
  const manageSections = sections.filter((s) => !MAIN_SECTION_IDS.has(s.id));

  const sectionContent =
    typeof activeSection?.content === 'function'
      ? activeSection.content({ goToSection })
      : activeSection?.content;

  const homeSection = sections.find((s) => s.id === dashboardSectionHome) || sections[0];
  const tasksSection = sections.find((s) => s.id === dashboardSectionTasks);

  function handleMobileNav(to) {
    if (to === 'settings' && settingsHref) {
      router.push(settingsHref);
      return;
    }
    if (to === 'home' && homeSection) {
      goToSection(homeSection.id);
      return;
    }
    if (to === 'tasks' && tasksSection) {
      goToSection(tasksSection.id);
    }
  }

  const mobileHomeActive = homeSection && activeSection?.id === homeSection.id;
  const mobileTasksActive = tasksSection && activeSection?.id === tasksSection.id;

  return (
    <div className="dashboard-shell dashboard-shell--landing-light relative font-sans text-black" data-variant={variant}>
      <div className="ascii-bg" aria-hidden />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        id="dashboard-menu"
        className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Dashboard sections"
      >
        {/* Brand — matches `LandingNav` logo block in HomePage.jsx (ASCII + pre classes). */}
        <div className="sidebar-brand sidebar-brand--landing-logo">
          <div className="sidebar-brand-ascii-scale">
            <div className="shrink-0">
              <pre className="leading-none font-mono text-[8px] md:text-[10px] overflow-visible whitespace-pre text-black">
                {ASCII_MARK}
              </pre>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav>
          {mainSections.length > 0 && (
            <>
              <span className="section-label">Main</span>
              {mainSections.map((section) => (
                <MenuButton
                  key={section.id}
                  section={section}
                  isActive={section.id === activeSection?.id}
                  onClick={handleMenuClick}
                />
              ))}
            </>
          )}

          {manageSections.length > 0 && (
            <>
              <span className="section-label">Manage</span>
              {manageSections.map((section) => (
                <MenuButton
                  key={section.id}
                  section={section}
                  isActive={section.id === activeSection?.id}
                  onClick={handleMenuClick}
                />
              ))}
            </>
          )}
        </nav>

        {/* ── AI Mode button (parent) - opens the AI workspace ── */}
        {variant === 'parent' && (
          <div className="ai-mode-row">
            <button
              type="button"
              className="ai-workspace-btn"
              onClick={() => router.push('/parent/ai')}
            >
              AI Mode
              <span className="ai-workspace-btn-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        )}

        {/* ── Study Buddy button (child) - opens the child AI workspace ── */}
        {variant === 'child' && (
          <div className="ai-mode-row">
            <button
              type="button"
              className="ai-workspace-btn child"
              onClick={() => router.push('/child/ai')}
            >
              Study Buddy
              <span className="ai-workspace-btn-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        )}

        {/* Role badge pinned to sidebar bottom */}
        <div className="sidebar-role-badge">
          <span className="sidebar-role-pill">
            {variant === 'parent' ? 'Parent Mode' : 'Child Mode'}
          </span>
        </div>
      </aside>

      {/* Sidebar overlay (mobile tap-to-close) */}
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed bottom nav (narrow screens — CSS shows/hides) */}
      <nav className="dashboard-mobile-nav" aria-label="Primary sections">
        <button
          type="button"
          className={`dashboard-mobile-nav__btn${mobileHomeActive ? ' is-active' : ''}`}
          aria-current={mobileHomeActive ? 'page' : undefined}
          onClick={() => handleMobileNav('home')}
        >
          <span className="dashboard-mobile-nav__icon" aria-hidden="true"><IconHome /></span>
          <span className="dashboard-mobile-nav__label">Dashboard</span>
        </button>
        {tasksSection ? (
          <button
            type="button"
            className={`dashboard-mobile-nav__btn${mobileTasksActive ? ' is-active' : ''}`}
            aria-current={mobileTasksActive ? 'page' : undefined}
            onClick={() => handleMobileNav('tasks')}
          >
            <span className="dashboard-mobile-nav__icon" aria-hidden="true"><IconTasks /></span>
            <span className="dashboard-mobile-nav__label">Tasks</span>
          </button>
        ) : null}
        {settingsHref ? (
          <button type="button" className="dashboard-mobile-nav__btn" onClick={() => handleMobileNav('settings')}>
            <span className="dashboard-mobile-nav__icon" aria-hidden="true"><IconSettings /></span>
            <span className="dashboard-mobile-nav__label">Settings</span>
          </button>
        ) : null}
      </nav>

      {/* ── Main content ────────────────────────────────────── */}
      <section className="dashboard-content">

        <div className="dashboard-section-wrap">
          {/* Breadcrumb bar */}
          <header className="dashboard-breadcrumb">
            <button
              type="button"
              className="hamburger"
              aria-label="Toggle dashboard menu"
              aria-expanded={sidebarOpen}
              aria-controls="dashboard-menu"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>

            {history.length > 0 && (
              <button
                type="button"
                className="icon-button"
                aria-label="Go back to previous section"
                onClick={goBackSection}
              >
                <BackIcon />
              </button>
            )}

            <nav className="breadcrumb-path" aria-label="Breadcrumb">
              <span className="breadcrumb-root">{title}</span>
              <span className="breadcrumb-sep" aria-hidden="true">›</span>
              <span className="breadcrumb-current">{activeSection?.label || 'Overview'}</span>
            </nav>
          </header>

          <main className="dashboard-main" aria-live="polite">
            {sectionContent}
          </main>
        </div>

      </section>
    </div>
  );
}
