import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import './EvidenceReviewPanel.css';

/* ── Helpers ──────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}

function verdictLabel(verdict) {
  if (!verdict || verdict === 'pending') return null;
  const map = { approve: 'Approve', review: 'Review', return: 'Return' };
  return map[verdict] || verdict;
}

/* ── Sub-components ───────────────────────────────────────────────────── */
function EvidenceSkeleton() {
  return (
    <div className="erp-skeleton" aria-busy="true" aria-label="Loading evidence">
      <div className="erp-skeleton-media skeleton-line" />
      <div className="erp-skeleton-line skeleton-line medium" />
      <div className="erp-skeleton-line skeleton-line short" />
      <div className="erp-skeleton-actions">
        <div className="skeleton-line short" />
        <div className="skeleton-line short" />
        <div className="skeleton-line short" />
      </div>
    </div>
  );
}

function EvidenceError({ message, onRetry, onClose }) {
  return (
    <div className="erp-error-state" role="alert">
      <span className="erp-error-icon" aria-hidden="true">⚠️</span>
      <p>{message || 'Failed to load evidence.'}</p>
      <div className="erp-error-actions">
        <button type="button" className="erp-btn erp-btn-secondary" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function MediaViewer({ mediaType, mediaUrl, thumbnailUrl, title }) {
  const [videoLoading, setVideoLoading] = useState(true);

  if (!mediaUrl) {
    return (
      <div className="erp-media-placeholder">
        <span aria-hidden="true">📎</span>
        <p>No media attached</p>
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <div className="erp-media-video-wrap">
        {videoLoading && thumbnailUrl && (
          <img
            className="erp-media-poster"
            src={thumbnailUrl}
            alt="Video thumbnail"
            aria-hidden="true"
          />
        )}
        {videoLoading && (
          <div className="erp-video-spinner" aria-label="Loading video">
            <span className="erp-spinner" />
          </div>
        )}
        <video
          className="erp-media-video"
          controls
          poster={thumbnailUrl || undefined}
          onLoadedData={() => setVideoLoading(false)}
          onCanPlay={() => setVideoLoading(false)}
        >
          <source src={mediaUrl} />
          <track kind="captions" src="" label="No captions" />
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  return (
    <img
      className="erp-media-photo"
      src={mediaUrl}
      alt={title ? `Evidence for: ${title}` : 'Task evidence photo'}
      loading="lazy"
    />
  );
}

function ScoreBar({ score }) {
  if (score === null || score === undefined) return null;
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 70
    ? 'var(--color-success)'
    : pct >= 40
    ? 'var(--color-warning)'
    : 'var(--color-error)';

  return (
    <div className="erp-score-bar-wrap">
      <div
        className="erp-score-bar-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`AI confidence score: ${pct} out of 100`}
      >
        <div
          className="erp-score-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="erp-score-label">{pct}/100</span>
    </div>
  );
}

function AIVerdictCard({ verdict, score, note }) {
  if (!verdict) {
    return (
      <div className="erp-ai-pending-pill" aria-label="AI review pending">
        AI review pending
      </div>
    );
  }

  const isPending = verdict === 'pending';

  const badgeClass = {
    approve: 'erp-verdict-approve',
    review:  'erp-verdict-review',
    return:  'erp-verdict-return',
    pending: 'erp-verdict-pending',
  }[verdict] || 'erp-verdict-pending';

  const icon = {
    approve: '✅',
    review:  '⚠️',
    return:  '🔴',
    pending: '⏳',
  }[verdict] || '⏳';

  return (
    <div className={`erp-ai-card ${isPending ? 'erp-ai-pulsing' : ''}`}>
      <div className="erp-ai-card-header">
        <span className="erp-ai-label">AI Review</span>
        <span
          className={`erp-verdict-badge ${badgeClass}`}
          aria-label={`AI verdict: ${verdictLabel(verdict) || verdict}${score !== null ? ` (score ${score}/100)` : ''}`}
        >
          <span aria-hidden="true">{icon}</span>
          {verdictLabel(verdict) || verdict}
        </span>
      </div>
      {score !== null && score !== undefined && <ScoreBar score={score} />}
      {note && <p className="erp-ai-note">{note}</p>}
    </div>
  );
}

function ConfirmOverlay({ decision, onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    confirmRef.current?.focus();
    return () => prev?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const isApprove = decision === 'approve';
  const label = isApprove ? 'Approve this task?' : 'Fail this task?';
  const confirmText = isApprove ? 'Yes, Approve' : 'Yes, Fail';

  return (
    <div className="erp-confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="erp-confirm-title">
      <div className="erp-confirm-box">
        <h3 id="erp-confirm-title">{label}</h3>
        <p className="erp-confirm-sub">
          {isApprove
            ? 'Points will be awarded to the child immediately.'
            : 'The task will be marked as failed. The child can request a dispute.'}
        </p>
        <div className="erp-confirm-actions">
          <button
            type="button"
            ref={confirmRef}
            className={`erp-btn ${isApprove ? 'erp-btn-success' : 'erp-btn-danger'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button type="button" className="erp-btn erp-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteEntrySheet({ draft, onChange, onSubmit, onCancel }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="erp-note-sheet">
      <h3>Add a note for the child</h3>
      <p className="erp-note-hint">Explain what needs to be improved or re-done.</p>
      <textarea
        ref={textareaRef}
        className="erp-note-textarea"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. The photo is too blurry — please retake it."
        maxLength={500}
        rows={4}
      />
      <div className="erp-note-actions">
        <button
          type="button"
          className="erp-btn erp-btn-warning"
          onClick={onSubmit}
          disabled={!draft.trim()}
        >
          Send Request
        </button>
        <button type="button" className="erp-btn erp-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */
export default function EvidenceReviewPanel({ submissionId, taskId, onClose, onReviewed, token }) {
  const [state, setState] = useState({ status: 'loading' });
  const [noteDraft, setNoteDraft] = useState('');
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await apiRequest(`/tasks/${taskId}/submission`, { token });
      setState({ status: 'idle', submission: data });
    } catch (e) {
      setState({ status: 'error', message: e.message || 'Failed to load submission.' });
    }
  }, [taskId, token]);

  useEffect(() => {
    load();
  }, [load]);

  // Focus management on open
  useEffect(() => {
    const prev = document.activeElement;
    setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => {
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, []);

  // Escape key handling
  useEffect(() => {
    function handleKey(e) {
      if (e.key !== 'Escape') return;
      const s = state.status;
      if (s === 'confirming' || s === 'note_entry') return; // sub-dialogs handle their own escape
      if (s !== 'submitting') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [state.status, onClose]);

  // Focus trap
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    function handleTab(e) {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, []);

  // Auto-close on success
  useEffect(() => {
    if (state.status !== 'success') return;
    const t = setTimeout(() => onClose(), 800);
    return () => clearTimeout(t);
  }, [state.status, onClose]);

  async function submitReview(decision, parentNote) {
    setState((prev) => ({ ...prev, status: 'submitting', decision }));
    try {
      await apiRequest(`/tasks/${taskId}/review`, {
        method: 'POST',
        token,
        body: { decision, ...(parentNote ? { parentNote } : {}) }
      });
      setState({ status: 'success', decision });
      onReviewed(decision, taskId);
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'idle',
        submission: prev.submission
      }));
    }
  }

  function handleApprove() {
    setState((prev) => ({ ...prev, status: 'confirming', decision: 'approve' }));
  }

  function handleReject() {
    setState((prev) => ({ ...prev, status: 'confirming', decision: 'reject' }));
  }

  function handleRequestRevision() {
    setNoteDraft('');
    setState((prev) => ({ ...prev, status: 'note_entry' }));
  }

  const s = state;
  const sub = s.submission;
  const isAIPending = sub?.aiVerdict === 'pending' || sub?.aiVerdict === null;
  const isBusy = s.status === 'submitting';

  return (
    <div className="erp-backdrop" onClick={(e) => { if (e.target === e.currentTarget && s.status !== 'submitting') onClose(); }}>
      <div
        ref={panelRef}
        className="erp-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="erp-title"
      >
        {/* Header */}
        <div className="erp-header">
          <h2 id="erp-title" className="erp-title">
            {sub ? `${sub.childName} · ${sub.taskTitle}` : 'Evidence Review'}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="erp-close-btn"
            aria-label="Close review panel"
            onClick={onClose}
            disabled={isBusy}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="erp-body">
          {s.status === 'loading' && <EvidenceSkeleton />}
          {s.status === 'error' && (
            <EvidenceError message={s.message} onRetry={load} onClose={onClose} />
          )}

          {s.status !== 'loading' && s.status !== 'error' && sub && (
            <>
              {/* Media */}
              <MediaViewer
                mediaType={sub.mediaType}
                mediaUrl={sub.mediaUrl}
                thumbnailUrl={sub.mediaThumbnailUrl}
                title={sub.taskTitle}
              />

              {/* AI verdict */}
              <AIVerdictCard
                verdict={sub.aiVerdict}
                score={sub.aiScore}
                note={sub.aiNote}
              />

              {/* Task meta */}
              <div className="erp-meta-row">
                <span className="erp-meta-item">
                  <span className="erp-meta-label">Points</span>
                  <strong className="erp-meta-value erp-points">+{sub.pointValue} RP</strong>
                </span>
                <span className="erp-meta-item">
                  <span className="erp-meta-label">Submitted</span>
                  <span className="erp-meta-value">{fmtDate(sub.submittedAt)}</span>
                </span>
              </div>

              {/* Actions */}
              {(s.status === 'idle' || s.status === 'submitting') && (
                <div className="erp-actions">
                  <button
                    type="button"
                    className="erp-btn erp-btn-success"
                    onClick={handleApprove}
                    disabled={isBusy || isAIPending}
                    aria-busy={isBusy}
                    title={isAIPending ? 'Waiting for AI review' : undefined}
                  >
                    ✅ Approve (+{sub.pointValue} RP)
                  </button>
                  <button
                    type="button"
                    className="erp-btn erp-btn-warning"
                    onClick={handleRequestRevision}
                    disabled={isBusy}
                    aria-busy={isBusy}
                  >
                    ✏️ Request Changes
                  </button>
                  <button
                    type="button"
                    className="erp-btn erp-btn-danger"
                    onClick={handleReject}
                    disabled={isBusy}
                    aria-busy={isBusy}
                  >
                    ❌ Fail Task
                  </button>
                </div>
              )}

              {s.status === 'success' && (
                <div className="erp-success-banner" role="status" aria-live="polite">
                  {s.decision === 'approve' && '✅ Approved!'}
                  {s.decision === 'request_revision' && '✏️ Revision requested.'}
                  {s.decision === 'reject' && '❌ Task failed.'}
                  <span className="erp-success-sub">Closing…</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Overlays */}
        {(s.status === 'confirming') && (
          <ConfirmOverlay
            decision={s.decision}
            onConfirm={() => submitReview(s.decision)}
            onCancel={() => setState((prev) => ({ ...prev, status: 'idle' }))}
          />
        )}

        {s.status === 'note_entry' && (
          <NoteEntrySheet
            draft={noteDraft}
            onChange={setNoteDraft}
            onSubmit={() => submitReview('request_revision', noteDraft)}
            onCancel={() => setState((prev) => ({ ...prev, status: 'idle' }))}
          />
        )}
      </div>
    </div>
  );
}
