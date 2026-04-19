import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import './GamingSessionController.css';

/* ── Helpers ──────────────────────────────────────────────────────────── */
function calcRemaining(session) {
  if (!session || session.status === 'ended') return 0;
  // Use grantedMinutes (set at session start) since durationMinutes is only set when the session ends
  const totalMinutes = session.grantedMinutes ?? session.durationMinutes ?? 0;
  const durationMs = totalMinutes * 60 * 1000;
  const started = new Date(session.startedAt).getTime();
  const now = Date.now();
  const elapsed = now - started;
  return Math.max(0, durationMs - elapsed);
}

function formatMmSs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function elapsedPercent(session, remainingMs) {
  if (!session) return 0;
  const totalMinutes = session.grantedMinutes ?? session.durationMinutes ?? 0;
  const totalMs = totalMinutes * 60 * 1000;
  if (totalMs === 0) return 0;
  return Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100));
}

const EXPIRING_THRESHOLD_MS = 60_000;

/* ── Circular progress ring ─────────────────────────────────────────── */
function CircularProgress({ value, isExpiring, isPaused }) {
  const R = 22;
  const circ = 2 * Math.PI * R;
  const filled = circ * (value / 100);
  const color = isPaused
    ? 'var(--text-dim)'
    : isExpiring
    ? 'var(--color-warning)'
    : 'var(--color-success)';

  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      role="img"
      aria-label={`${Math.round(value)}% of session elapsed`}
      className="gsc-ring-svg"
    >
      <title>{Math.round(value)}% of gaming session elapsed</title>
      {/* Track */}
      <circle cx="28" cy="28" r={R} fill="none" stroke="var(--line)" strokeWidth="4" />
      {/* Fill */}
      <circle
        cx="28"
        cy="28"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dasharray 1s linear, stroke 500ms' }}
      />
    </svg>
  );
}

/* ── Session end overlay (child only) ──────────────────────────────── */
function SessionEndOverlay({ rpCost, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="gsc-end-overlay" role="status" aria-live="assertive">
      <div className="gsc-end-content">
        <h2 className="gsc-end-title">GG! Well played!</h2>
        <p className="gsc-end-sub">
          Session complete · <strong>{rpCost} RP</strong> spent
        </p>
        <button type="button" className="gsc-btn gsc-btn-secondary" onClick={onDismiss}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

/* ── Confirm end dialog ────────────────────────────────────────────── */
function ConfirmEndDialog({ onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="gsc-confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="gsc-confirm-title"
      aria-describedby="gsc-confirm-desc"
    >
      <div className="gsc-confirm-box">
        <h3 id="gsc-confirm-title">End session early?</h3>
        <p id="gsc-confirm-desc" className="gsc-confirm-desc">
          The child's remaining time will be forfeited. RP cost stays the same.
        </p>
        <div className="gsc-confirm-actions">
          <button ref={confirmRef} type="button" className="gsc-btn gsc-btn-danger" onClick={onConfirm}>
            Yes, end now
          </button>
          <button type="button" className="gsc-btn gsc-btn-secondary" onClick={onCancel}>
            Keep playing
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Session skeleton ──────────────────────────────────────────────── */
function SessionSkeleton() {
  return (
    <div className="gsc-skeleton" aria-busy="true" aria-label="Loading session">
      <div className="gsc-skeleton-circle skeleton-line" />
      <div className="gsc-skeleton-text">
        <div className="skeleton-line medium" style={{ height: '0.8rem' }} />
        <div className="skeleton-line short" style={{ height: '0.65rem', marginTop: '0.3rem' }} />
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */
export default function GamingSessionController({ childId, role, onSessionEnd, token }) {
  const [status, setStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const tickRef = useRef(null);
  const syncRef = useRef(null);
  const expiringAnnouncedRef = useRef(false);
  const liveTimerRef = useRef(null);

  const loadSession = useCallback(async () => {
    try {
      const sessions = await apiRequest(`/gaming/sessions?childId=${childId}`, { token });
      const data = Array.isArray(sessions) ? sessions.find((s) => s.status === 'Started') || null : null;
      if (!data || data.status === 'ended') {
        setStatus('idle');
        setSession(null);
        return;
      }
      setSession(data);
      const rem = calcRemaining(data);
      setRemainingMs(rem);
      if (data.status === 'paused') {
        setStatus('paused');
      } else if (rem <= 0) {
        setStatus('ended');
      } else if (rem <= EXPIRING_THRESHOLD_MS) {
        setStatus('expiring');
      } else {
        setStatus('active');
      }
    } catch {
      setStatus('idle');
    }
  }, [childId, token]);

  // Initial load
  useEffect(() => { loadSession(); }, [loadSession]);

  // Tick every second for local countdown
  useEffect(() => {
    if (!['active', 'expiring'].includes(status)) {
      clearInterval(tickRef.current);
      return;
    }

    tickRef.current = setInterval(() => {
      setSession((prev) => {
        if (!prev) return prev;
        const rem = calcRemaining(prev);
        setRemainingMs(rem);

        if (rem <= 0) {
          clearInterval(tickRef.current);
          setStatus('ended');
          if (onSessionEnd) onSessionEnd();
          return prev;
        }
        if (rem <= EXPIRING_THRESHOLD_MS && status !== 'expiring') {
          setStatus('expiring');
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(tickRef.current);
  }, [status, onSessionEnd]);

  // Server sync every 10s for drift correction
  useEffect(() => {
    syncRef.current = setInterval(() => {
      if (['active', 'expiring'].includes(status)) loadSession();
    }, 10_000);
    return () => clearInterval(syncRef.current);
  }, [status, loadSession]);

  // Announce expiring once at 60s mark
  useEffect(() => {
    if (status === 'expiring' && !expiringAnnouncedRef.current) {
      expiringAnnouncedRef.current = true;
      if (liveTimerRef.current) {
        liveTimerRef.current.textContent = 'One minute remaining in your gaming session';
        setTimeout(() => { if (liveTimerRef.current) liveTimerRef.current.textContent = ''; }, 3000);
      }
    }
  }, [status]);

  async function handlePauseResume() {
    // Pause/resume is not supported by the backend - this is a no-op
    if (!session || submitting) return;
    // Toggle local visual state only (no server call)
    setStatus((prev) => prev === 'paused' ? 'active' : 'paused');
  }

  async function handleEndEarly() {
    if (!session || submitting) return;
    setSubmitting(true);
    try {
      const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
      const actualMinutes = Math.max(1, Math.round(elapsedMs / 60_000));
      await apiRequest('/gaming/sessions/end', {
        method: 'POST', token, body: { sessionId: session.id, actualMinutes }
      });
      setStatus('ended');
      if (onSessionEnd) onSessionEnd();
    } catch {
      setStatus('active');
    } finally {
      setSubmitting(false);
      setStatus((prev) => prev === 'confirming_end' ? 'active' : prev);
    }
  }

  const pct = session ? elapsedPercent(session, remainingMs) : 0;
  const isExpiring = status === 'expiring';
  const isPaused = status === 'paused';
  const displayTime = formatMmSs(remainingMs);
  const minutesLeft = Math.ceil(remainingMs / 60_000);

  /* ── Render ────────────────────────────────────────────────────────── */
  if (status === 'loading') return <SessionSkeleton />;
  if (status === 'idle') return null;

  if (status === 'ended') {
    return (
      <SessionEndOverlay
        rpCost={session?.rpCost ?? 0}
        onDismiss={() => {
          setStatus('idle');
          setSession(null);
          if (onSessionEnd) onSessionEnd();
        }}
      />
    );
  }

  return (
    <>
      {/* Assertive live region for expiring announcement */}
      <div ref={liveTimerRef} aria-live="assertive" className="gsc-sr-only" />

      <div
        className={`gsc-bar ${isExpiring ? 'gsc-bar-expiring' : ''} ${isPaused ? 'gsc-bar-paused' : ''}`}
        data-expiring={isExpiring}
        data-paused={isPaused}
      >
        {/* Progress ring */}
        <CircularProgress value={pct} isExpiring={isExpiring} isPaused={isPaused} />

        {/* Timer */}
        <div
          className="gsc-timer"
          role="timer"
          aria-live="off"
          aria-label={`Gaming session: ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} remaining`}
        >
          <span className="gsc-time">{displayTime}</span>
          <span className="gsc-label">remaining</span>
        </div>

        {/* Status badge */}
        {isPaused && (
          <span className="gsc-paused-badge" aria-label="Session paused">
            ⏸ Paused
          </span>
        )}

        {isExpiring && !isPaused && (
          <span className="gsc-expiring-badge" aria-label="Session almost over">
            Almost done
          </span>
        )}

        {/* Parent-only controls */}
        {role === 'parent' && (
          <div className="gsc-controls">
            <button
              type="button"
              className="gsc-btn gsc-btn-pause"
              onClick={handlePauseResume}
              disabled={submitting}
              aria-pressed={isPaused}
              aria-busy={submitting}
              aria-label={isPaused ? 'Resume session' : 'Pause session'}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="gsc-btn gsc-btn-end"
              onClick={() => setStatus('confirming_end')}
              disabled={submitting}
              aria-label="End session early"
            >
              End Early
            </button>
          </div>
        )}
      </div>

      {/* Confirm end dialog */}
      {status === 'confirming_end' && (
        <ConfirmEndDialog
          onConfirm={handleEndEarly}
          onCancel={() => setStatus(session?.status === 'paused' ? 'paused' : 'active')}
        />
      )}
    </>
  );
}
