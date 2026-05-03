/**
 * Parent Dashboard Kinetic Component
 * Main orchestrator combining ChildProgressOrbs, KineticTaskTable, AITerminalWorkspace
 * 3-column layout with sticky header and floating action button
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MasterController from './HeroAssets/MasterController.jsx';
import { ChildProgressOrbs } from './ChildProgressOrbs.jsx';
import { KineticTaskTable } from './KineticTaskTable.jsx';
import { AITerminalWorkspace } from './AITerminalWorkspace.jsx';
import '../styles/kinetic-dashboard.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * ParentDashboardKinetic
 * Full dashboard with kinetic animations and real-time updates
 *
 * @param {Object} parentData - Parent info: { id, name, children[] }
 * @param {Array} pendingTasks - Tasks awaiting review
 * @param {Function} onApproveTask - Callback(taskId)
 * @param {Function} onRejectTask - Callback(taskId)
 * @param {Function} onCreateTask - Callback()
 */
export function ParentDashboardKinetic({
  parentData = { id: '', name: 'Parent', children: [] },
  pendingTasks = [],
  onApproveTask = () => {},
  onRejectTask = () => {},
  onCreateTask = () => {},
}) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const headerRef = useRef(null);
  const fabRef = useRef(null);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [currentScroll, setCurrentScroll] = useState(0);

  // Track scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setCurrentScroll(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // FAB pulse animation
  useEffect(() => {
    if (fabRef.current) {
      gsap.fromTo(
        fabRef.current,
        { scale: 0.8 },
        {
          scale: 1,
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        }
      );
    }
  }, []);

  // Mock child data for demo
  const childProgressData = (parentData.children || []).map((child) => ({
    id: child.id,
    name: child.name,
    RP: Math.floor(Math.random() * 2000),
    GP: Math.floor(Math.random() * 500),
    completionPercent: Math.floor(Math.random() * 60) + 20, // 20-80%
    tier: 'active',
  }));

  // Filtered tasks for selected child
  const filteredTasks =
    selectedChildId && pendingTasks.length > 0
      ? pendingTasks.filter((t) => t.childId === selectedChildId)
      : pendingTasks;

  const handleTaskTableAction = (taskId, action) => {
    if (action === 'approve') {
      onApproveTask(taskId);
    } else if (action === 'reject') {
      onRejectTask(taskId);
    }
  };

  return (
    <div ref={rootRef} className="dashboard-kinetic-root">
      {/* ── STICKY HEADER ─────────────────────────────────────── */}
      <header ref={headerRef} className="dashboard-header-kinetic">
        {/* Logo with mini MasterController */}
        <a href="/" className="dashboard-logo">
          <div className="dashboard-logo-controller" />
          Gametime
        </a>

        {/* Parent name & greeting */}
        <div style={{ flex: 1, marginLeft: '2rem', marginRight: '2rem' }}>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '0.02em',
            }}
          >
            WELCOME, {parentData.name.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: 'var(--stark-white)',
              marginTop: '0.25rem',
            }}
          >
            Family Dashboard
          </div>
        </div>

        {/* Pending count badge */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--neon-red), #ff1a47)',
            color: 'var(--stark-white)',
            padding: '0.75rem 1.5rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 0 20px rgba(255, 46, 90, 0.3)',
          }}
        >
          {pendingTasks.length} Pending
        </div>
      </header>

      {/* ── SIDEBAR ────────────────────────────────────────────── */}
      <nav className="dashboard-sidebar" role="navigation" aria-label="Dashboard navigation">
        <div
          className="dashboard-nav-item active"
          title="Tasks"
          role="button"
          tabIndex={0}
        >
          ✓
        </div>
        <div className="dashboard-nav-item" title="Children" role="button" tabIndex={0}>
          👥
        </div>
        <div className="dashboard-nav-item" title="Rewards" role="button" tabIndex={0}>
          🎁
        </div>
        <div className="dashboard-nav-item" title="Analytics" role="button" tabIndex={0}>
          📊
        </div>
        <div className="dashboard-nav-item" title="Settings" role="button" tabIndex={0}>
          ⚙️
        </div>
      </nav>

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <main className="dashboard-main" role="main">
        {/* Child Progress Orbs (positioned absolute over content) */}
        <ChildProgressOrbs
          children={childProgressData}
          onSelectChild={setSelectedChildId}
          containerHeight={200}
        />

        {/* Section: Task Queue */}
        <section style={{ marginTop: '4rem', marginBottom: '3rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--stark-white)',
                margin: 0,
                marginBottom: '0.25rem',
              }}
            >
              Pending Review
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.5)',
                margin: 0,
              }}
            >
              {selectedChildId
                ? `Showing ${filteredTasks.length} tasks for selected child`
                : `${pendingTasks.length} tasks awaiting your review`}
            </p>
          </div>

          {/* Task Table Component */}
          <KineticTaskTable
            tasks={filteredTasks || []}
            onApprove={(taskId) => handleTaskTableAction(taskId, 'approve')}
            onReject={(taskId) => handleTaskTableAction(taskId, 'reject')}
            onViewEvidence={(url) => {
              // Open evidence in modal or new tab
              window.open(url, '_blank');
            }}
          />
        </section>

        {/* Section: Quick Stats */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 217, 255, 0.08)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '0.5rem',
              }}
            >
              Total RP Pool
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--neon-blue)',
              }}
            >
              {childProgressData.reduce((sum, c) => sum + (c.RP || 0), 0)}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 46, 90, 0.08)',
              border: '1px solid rgba(255, 46, 90, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '0.5rem',
              }}
            >
              Total GP Balance
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--neon-red)',
              }}
            >
              {childProgressData.reduce((sum, c) => sum + (c.GP || 0), 0)}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 184, 0, 0.08)',
              border: '1px solid rgba(255, 184, 0, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '0.5rem',
              }}
            >
              Children Active
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#ffb800',
              }}
            >
              {childProgressData.length}
            </div>
          </div>
        </section>
      </main>

      {/* ── RIGHT SIDEBAR: AI TERMINAL ───────────────────────── */}
      <aside className="dashboard-terminal-sidebar" role="complementary">
        <AITerminalWorkspace
          parentId={parentData.id}
          onCommand={(cmd) => {
            console.log('Terminal command:', cmd);
          }}
          defaultMinimized={false}
        />
      </aside>

      {/* ── FLOATING ACTION BUTTON ───────────────────────────── */}
      <button
        ref={fabRef}
        className="fab-create-task"
        onClick={onCreateTask}
        aria-label="Create new task"
        title="Create New Task"
      >
        +
      </button>
    </div>
  );
}

export default ParentDashboardKinetic;
