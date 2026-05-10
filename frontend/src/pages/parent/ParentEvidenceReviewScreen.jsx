import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, apiRequest } from '../../api/client.js';
import { BrutalistButton, BrutalistCard } from '../../components/ui/index.js';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function verdictLabel(verdict) {
  if (!verdict || verdict === 'pending') return null;
  const map = { approve: 'Approve', review: 'Review', return: 'Return', reject: 'Reject' };
  return map[verdict] || verdict;
}

function resolveEvidencePath(mediaUrl) {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('http') || mediaUrl.startsWith('data:')) return mediaUrl;
  return `${API_BASE}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
}

function EvidenceSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 font-mono" aria-busy="true" aria-label="Loading evidence">
      <div className="aspect-video border-4 border-black bg-black/10" />
      <div className="h-4 w-3/4 border-2 border-black bg-black/10" />
      <div className="h-4 w-1/2 border-2 border-black bg-black/10" />
    </div>
  );
}

function ConfirmOverlay({ decision, onConfirm, onCancel }) {
  const confirmRef = useRef(null);
  const isApprove = decision === 'approve';

  useEffect(() => {
    const prev = document.activeElement;
    confirmRef.current?.focus();
    return () => prev?.focus?.();
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="perv-confirm-title"
    >
      <BrutalistCard className="max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h3 id="perv-confirm-title" className="mb-3 font-mono text-lg font-bold uppercase tracking-tight">
          {isApprove ? 'Grant clearance?' : 'Deny request?'}
        </h3>
        <p className="mb-6 font-mono text-xs font-bold uppercase leading-relaxed tracking-wide text-black/80">
          {isApprove
            ? 'Reward points will transfer to the child node immediately.'
            : 'This mission will be marked failed. The child may dispute.'}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <BrutalistButton ref={confirmRef} type="button" variant="inverse" className="flex-1" onClick={onConfirm}>
            CONFIRM
          </BrutalistButton>
          <BrutalistButton type="button" variant="danger" className="flex-1" onClick={onCancel}>
            BACK
          </BrutalistButton>
        </div>
      </BrutalistCard>
    </div>
  );
}

function AuthenticatedEvidenceMedia({ path, token, mediaType, title }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl;

    (async () => {
      try {
        const url = resolveEvidencePath(path);
        const res = await fetch(url, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to fetch evidence');
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!revoked) setBlobUrl(objectUrl);
      } catch {
        if (!revoked) setFailed(true);
      }
    })();

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, token]);

  if (failed) {
    return (
      <div className="flex min-h-[200px] items-center justify-center border-4 border-black bg-black/5 p-6 font-mono text-xs font-bold uppercase tracking-wide">
        Evidence unavailable
      </div>
    );
  }

  if (!blobUrl) {
    return <div className="aspect-video border-4 border-dashed border-black bg-white" aria-hidden="true" />;
  }

  if (mediaType === 'video') {
    return (
      <div className="relative border-4 border-black bg-black">
        {!videoReady ? (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white">
            BUFFER…
          </div>
        ) : null}
        <video
          className="max-h-[min(55vh,420px)] w-full object-contain"
          controls
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
        >
          <source src={blobUrl} />
          <track kind="captions" src="" label="No captions" />
        </video>
      </div>
    );
  }

  return (
    <img
      className="max-h-[min(55vh,420px)] w-full border-4 border-black object-contain bg-black/5"
      src={blobUrl}
      alt={title ? `Evidence: ${title}` : 'Submitted evidence'}
      loading="lazy"
    />
  );
}

/**
 * Full-screen modal: child evidence (left) vs mission dossier (right), with brutalist approve/deny actions.
 * Same props contract as the legacy EvidenceReviewPanel for ParentDashboard.
 */
export default function ParentEvidenceReviewScreen({ submissionId: _submissionId, taskId, onClose, onReviewed, token }) {
  const [state, setState] = useState({ status: 'loading' });
  const closeButtonRef = useRef(null);
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

  useEffect(() => {
    const prev = document.activeElement;
    const t = setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      prev?.focus?.();
    };
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key !== 'Escape') return;
      const s = state.status;
      if (s === 'confirming' || s === 'submitting') return;
      onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [state.status, onClose]);

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
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, []);

  useEffect(() => {
    if (state.status !== 'success') return;
    const t = setTimeout(() => onClose(), 800);
    return () => clearTimeout(t);
  }, [state.status, onClose]);

  async function submitReview(decision) {
    setState((prev) => ({ ...prev, status: 'submitting', decision }));
    try {
      await apiRequest(`/tasks/${taskId}/review`, {
        method: 'POST',
        token,
        body: { decision },
      });
      setState({ status: 'success', decision });
      onReviewed(decision, taskId);
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'idle',
        submission: prev.submission,
      }));
    }
  }

  const s = state;
  const sub = s.submission;
  const isAIPending = sub?.aiVerdict === 'pending' || sub?.aiVerdict === null;
  const isBusy = s.status === 'submitting';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget && s.status !== 'submitting' && s.status !== 'confirming') onClose();
      }}
    >
      <div
        ref={panelRef}
        className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden border-4 border-black bg-white font-mono shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perv-title"
      >
        <header className="flex items-start justify-between gap-4 border-b-4 border-black px-4 py-4 sm:px-6">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.35em]">Evidence uplink</p>
            <h2 id="perv-title" className="text-lg font-bold uppercase tracking-tight sm:text-xl">
              {sub ? `${sub.childName} · ${sub.taskTitle}` : 'Mission review'}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            aria-label="Close review"
            onClick={onClose}
            disabled={isBusy}
          >
            ESC
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          {s.status === 'loading' && (
            <div className="p-6">
              <EvidenceSkeleton />
            </div>
          )}

          {s.status === 'error' && (
            <div className="p-6" role="alert">
              <BrutalistCard className="shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <p className="mb-4 font-mono text-sm font-bold uppercase tracking-wide">{s.message}</p>
                <div className="flex flex-wrap gap-3">
                  <BrutalistButton type="button" variant="inverse" onClick={load}>
                    RETRY UPLINK
                  </BrutalistButton>
                  <BrutalistButton type="button" variant="danger" onClick={onClose}>
                    ABORT
                  </BrutalistButton>
                </div>
              </BrutalistCard>
            </div>
          )}

          {s.status !== 'loading' && s.status !== 'error' && sub && (
            <>
              <div className="grid flex-1 divide-black md:grid-cols-2 md:divide-x-4">
                {/* Evidence column */}
                <section className="flex flex-col gap-4 p-4 sm:p-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.35em]">Submitted payload</h3>
                  <div className="border-4 border-black bg-white p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    {sub.mediaUrl ? (
                      <AuthenticatedEvidenceMedia
                        path={sub.mediaUrl}
                        token={token}
                        mediaType={sub.mediaType === 'video' ? 'video' : 'photo'}
                        title={sub.taskTitle}
                      />
                    ) : (
                      <div className="min-h-[160px] whitespace-pre-wrap border-2 border-dashed border-black bg-black/[0.03] p-4 text-sm font-bold uppercase leading-relaxed tracking-wide text-black">
                        {sub.evidenceNote?.trim() ? sub.evidenceNote : 'No media · text-only submission'}
                      </div>
                    )}
                    {sub.evidenceNote?.trim() && sub.mediaUrl ? (
                      <p className="mt-4 border-t-2 border-black pt-4 text-xs font-bold uppercase leading-relaxed tracking-wide text-black/90">
                        <span className="block text-[10px] tracking-[0.25em] text-black/60">Child note</span>
                        {sub.evidenceNote}
                      </p>
                    ) : null}
                  </div>
                </section>

                {/* Mission column */}
                <section className="flex flex-col gap-5 p-4 sm:p-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.35em]">Mission dossier</h3>
                  <dl className="space-y-4 border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/60">Objective</dt>
                      <dd className="mt-1 text-base font-bold uppercase tracking-tight">{sub.taskTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/60">Reward</dt>
                      <dd className="mt-1 text-sm font-bold uppercase tracking-wide">+{sub.pointValue} RP</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/60">Submitted</dt>
                      <dd className="mt-1 text-xs font-bold uppercase tracking-wide">{fmtDate(sub.submittedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/60">AI advisory</dt>
                      <dd className="mt-1 text-xs font-bold uppercase leading-relaxed tracking-wide">
                        {sub.aiVerdict === 'pending' || sub.aiVerdict == null ? (
                          <span className="text-black/70">PENDING ANALYSIS…</span>
                        ) : (
                          <>
                            <span className="block">{verdictLabel(sub.aiVerdict) || sub.aiVerdict}</span>
                            {sub.aiScore != null ? (
                              <span className="mt-1 block text-[10px] tracking-wider text-black/70">
                                CONFIDENCE · {sub.aiScore}/100
                              </span>
                            ) : null}
                            {sub.aiNote ? (
                              <span className="mt-2 block border-l-4 border-black pl-3 text-[11px] normal-case tracking-normal">
                                {sub.aiNote}
                              </span>
                            ) : null}
                          </>
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>

              {/* Actions */}
              <footer className="border-t-4 border-black bg-white px-4 py-5 sm:px-6">
                {(s.status === 'idle' || s.status === 'submitting') && (
                  <div className="flex flex-col gap-4">
                    <BrutalistButton
                      type="button"
                      variant="inverse"
                      className="w-full py-5 text-sm font-bold tracking-[0.15em] sm:text-base"
                      disabled={isBusy || isAIPending}
                      aria-busy={isBusy}
                      title={isAIPending ? 'Waiting for AI review' : undefined}
                      onClick={() => setState((prev) => ({ ...prev, status: 'confirming', decision: 'approve' }))}
                    >
                      APPROVE_CLEARANCE
                    </BrutalistButton>
                    <BrutalistButton
                      type="button"
                      variant="default"
                      className="w-full border-[3px] border-black bg-white py-5 text-sm font-bold tracking-[0.15em] hover:!translate-x-[-2px] hover:!translate-y-[-2px] hover:!bg-white hover:!text-black hover:!shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:text-base"
                      disabled={isBusy}
                      aria-busy={isBusy}
                      onClick={() => setState((prev) => ({ ...prev, status: 'confirming', decision: 'reject' }))}
                    >
                      DENY_REQUEST
                    </BrutalistButton>
                    {isAIPending ? (
                      <p className="text-center text-[10px] font-bold uppercase tracking-wider text-black/60">
                        Clearance locked until AI advisory completes.
                      </p>
                    ) : null}
                  </div>
                )}

                {s.status === 'success' && (
                  <div
                    className="border-4 border-black bg-black px-4 py-4 text-center text-sm font-bold uppercase tracking-[0.2em] text-white"
                    role="status"
                    aria-live="polite"
                  >
                    {s.decision === 'approve' ? 'CLEARANCE GRANTED' : 'REQUEST DENIED'}
                    <span className="mt-2 block text-[10px] font-bold tracking-[0.35em] text-white/70">Closing…</span>
                  </div>
                )}
              </footer>
            </>
          )}

          {s.status === 'confirming' && (
            <ConfirmOverlay
              decision={s.decision}
              onConfirm={() => submitReview(s.decision)}
              onCancel={() => setState((prev) => ({ ...prev, status: 'idle' }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
