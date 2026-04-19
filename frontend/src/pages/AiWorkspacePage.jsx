import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

/* ─────────────────────────────────────────────────────────────────────────
   Icons
   ───────────────────────────────────────────────────────────────────────── */
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function SparkIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="9" r="3" /><circle cx="16.5" cy="8.5" r="2.5" />
      <path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5M13 19c0-2.1 1.6-3.8 3.7-4" />
    </svg>
  );
}
function SwordIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M2 14l8 8" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h18v4H3zM5 12h14v9H5zM12 8v13" />
      <path d="M12 8s-3.5-1.2-3.5-3A2 2 0 0 1 12 4m0 4s3.5-1.2 3.5-3A2 2 0 0 0 12 4" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Text renderer - turns \n\n into paragraphs, \n into <br>
   ───────────────────────────────────────────────────────────────────────── */
function renderText(content) {
  if (!content) return null;
  return content.split(/\n{2,}/).map((para, pIdx) => {
    const lines = para.split('\n');
    return (
      <p key={pIdx} className="aws-bubble-para">
        {lines.map((line, lIdx) =>
          lIdx < lines.length - 1
            ? <span key={lIdx}>{line}<br /></span>
            : line
        )}
      </p>
    );
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Tool badge (inside chat bubble)
   ───────────────────────────────────────────────────────────────────────── */
function ToolBadge({ event }) {
  const isPending = event.type === 'tool_start';
  const isSuccess = !isPending && event.success;
  return (
    <span className={`ai-tool-badge ${isPending ? 'pending' : isSuccess ? 'success' : 'error'}`}>
      {isPending ? '⟳ ' : isSuccess ? '✓ ' : '✗ '}
      {isPending ? event.label : event.message}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Chat message bubble
   ───────────────────────────────────────────────────────────────────────── */
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`aws-message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <span className="aws-avatar" aria-hidden="true"><SparkIcon size={13} /></span>}
      <div className={`aws-bubble${msg.isError ? ' error' : ''}`}>
        {msg.toolEvents?.map((te, i) => <ToolBadge key={i} event={te} />)}
        {isUser
          ? <p className="aws-bubble-text">{msg.content}</p>
          : renderText(msg.content)
        }
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Streaming bubble
   ───────────────────────────────────────────────────────────────────────── */
function StreamingBubble({ text, toolEvents }) {
  return (
    <div className="aws-message assistant">
      <span className="aws-avatar" aria-hidden="true"><SparkIcon size={13} /></span>
      <div className="aws-bubble">
        {toolEvents.map((te, i) => <ToolBadge key={i} event={te} />)}
        {text
          ? <p className="aws-bubble-text">{text}<span className="ai-cursor" aria-hidden="true" /></p>
          : <span className="ai-typing" aria-label="Thinking"><span /><span /><span /></span>
        }
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Artifact cards - appear in the workspace canvas
   ───────────────────────────────────────────────────────────────────────── */
function FamilyArtifact({ data }) {
  const children  = data?.children  || [];
  const counts    = data?.taskCounts || {};
  const rewards   = data?.rewards   || [];
  const active    = counts.Active        || 0;
  const pending   = counts.PendingApproval || 0;
  return (
    <div className="aws-artifact aws-artifact--family">
      <div className="aws-artifact-header">
        <span className="aws-artifact-icon"><UsersIcon /></span>
        <span className="aws-artifact-title">Family Overview</span>
        <span className="aws-artifact-badge">Live</span>
      </div>

      {children.length === 0
        ? <p className="aws-artifact-empty">No children added yet. Go to Family in the dashboard to add them.</p>
        : <div className="aws-family-list">
            {children.map((c) => (
              <div key={c.id} className="aws-family-row">
                <span className="aws-family-avatar">{c.name?.[0]?.toUpperCase() || '?'}</span>
                <div className="aws-family-info">
                  <span className="aws-family-name">{c.name}</span>
                  <span className="aws-family-age">{c.age} yrs</span>
                </div>
                <div className="aws-family-balances">
                  <span className="aws-balance rp">{c.rpBalance} RP</span>
                  <span className="aws-balance gp">{c.gpBalance} GP</span>
                </div>
              </div>
            ))}
          </div>
      }

      <div className="aws-artifact-footer">
        <span className="aws-stat">{active} active quest{active !== 1 ? 's' : ''}</span>
        {pending > 0 && <span className="aws-stat warn">{pending} awaiting approval</span>}
        {rewards.length > 0 && <span className="aws-stat">{rewards.length} reward{rewards.length !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  );
}

function TaskArtifact({ data }) {
  const title   = data?.title       || data?._input?.title       || 'New Quest';
  const points  = data?.points      || data?._input?.points      || '?';
  const desc    = data?.description || data?._input?.description || '';
  const dueDays = data?._input?.due_days || 3;
  return (
    <div className="aws-artifact aws-artifact--task">
      <div className="aws-artifact-header">
        <span className="aws-artifact-icon"><SwordIcon /></span>
        <span className="aws-artifact-title">Quest Created</span>
        <span className="aws-artifact-badge success"><CheckIcon /> Done</span>
      </div>
      <p className="aws-artifact-name">{title}</p>
      {desc && <p className="aws-artifact-desc">{desc}</p>}
      <div className="aws-artifact-footer">
        <span className="aws-stat">{points} RP reward</span>
        <span className="aws-stat">Due in {dueDays} day{dueDays !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

function RewardArtifact({ data }) {
  const title = data?.title      || data?._input?.title      || 'New Reward';
  const cost  = data?.pointsCost || data?._input?.points_cost || '?';
  const qty   = data?.quantityLimit ?? data?._input?.quantity_limit ?? null;
  return (
    <div className="aws-artifact aws-artifact--reward">
      <div className="aws-artifact-header">
        <span className="aws-artifact-icon"><GiftIcon /></span>
        <span className="aws-artifact-title">Reward Created</span>
        <span className="aws-artifact-badge success"><CheckIcon /> Done</span>
      </div>
      <p className="aws-artifact-name">{title}</p>
      <div className="aws-artifact-footer">
        <span className="aws-stat">{cost} RP to redeem</span>
        {qty != null && <span className="aws-stat">Max {qty}×</span>}
      </div>
    </div>
  );
}

function ThumbsUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}
function ThumbsDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

function ApprovalCard({ task, token, onDone }) {
  const [state,    setState]    = useState('idle'); // idle | rejecting | loading | done_approved | done_rejected
  const [rejectNote, setRejectNote] = useState('');
  const [err,      setErr]      = useState('');

  const verdict = String(task.aiRecommendation || '').toLowerCase();
  const verdictClass = verdict === 'approve' ? 'approve' : verdict === 'reject' ? 'reject' : 'review';
  const verdictLabel = verdict === 'approve' ? 'AI: Approve' : verdict === 'reject' ? 'AI: Reject' : 'AI: Review';
  const score = task.aiConfidence != null ? `${Math.round(Number(task.aiConfidence) * 100)}%` : '';

  async function doApprove() {
    setState('loading');
    setErr('');
    try {
      await apiRequest('/tasks/approve', { method: 'POST', token, body: { taskId: task.id, note: null } });
      setState('done_approved');
      setTimeout(() => onDone(task.id, 'approved'), 1200);
    } catch (e) { setErr(e.message); setState('idle'); }
  }

  async function doReject() {
    if (!rejectNote.trim()) { setErr('Enter a reason for rejection.'); return; }
    setState('loading');
    setErr('');
    try {
      await apiRequest('/tasks/reject', { method: 'POST', token, body: { taskId: task.id, note: rejectNote.trim() } });
      setState('done_rejected');
      setTimeout(() => onDone(task.id, 'rejected'), 1200);
    } catch (e) { setErr(e.message); setState('idle'); }
  }

  if (state === 'done_approved') {
    return (
      <div className="aws-approval-card done approved">
        <span className="aws-approval-done-icon">✓</span>
        <span>{task.title} approved - {task.points} RP awarded to {task.childName}</span>
      </div>
    );
  }
  if (state === 'done_rejected') {
    return (
      <div className="aws-approval-card done rejected">
        <span className="aws-approval-done-icon">✗</span>
        <span>{task.title} rejected.</span>
      </div>
    );
  }

  return (
    <div className="aws-approval-card">
      <div className="aws-approval-header">
        <div className="aws-approval-meta">
          <span className="aws-approval-child">{task.childName}</span>
          <span className="aws-approval-sep">·</span>
          <span className="aws-approval-title">{task.title}</span>
        </div>
        <div className="aws-approval-right">
          <span className={`aws-ai-verdict ${verdictClass}`}>{verdictLabel}{score ? ` · ${score}` : ''}</span>
          <span className="aws-approval-pts">{task.points} RP</span>
        </div>
      </div>

      {task.ai_review_summary && (
        <p className="aws-approval-summary">{task.ai_review_summary}</p>
      )}

      {task.evidence_note && (
        <p className="aws-approval-note">Child note: {task.evidence_note}</p>
      )}

      {state === 'rejecting' ? (
        <div className="aws-approval-reject-form">
          <textarea
            className="aws-approval-reject-input"
            placeholder="Reason for rejection (shown to child)…"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={2}
            maxLength={200}
          />
          <div className="aws-approval-actions">
            <button type="button" className="aws-approval-btn reject" onClick={doReject} disabled={state === 'loading'}>
              Confirm Reject
            </button>
            <button type="button" className="aws-approval-btn secondary" onClick={() => { setState('idle'); setErr(''); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="aws-approval-actions">
          <button type="button" className="aws-approval-btn approve" onClick={doApprove} disabled={state === 'loading'}>
            <ThumbsUpIcon /> Approve
          </button>
          <button type="button" className="aws-approval-btn reject" onClick={() => setState('rejecting')} disabled={state === 'loading'}>
            <ThumbsDownIcon /> Reject
          </button>
        </div>
      )}
      {err && <p className="aws-approval-error">{err}</p>}
    </div>
  );
}

function ApprovalsArtifact({ tasks, token, onTaskDone }) {
  const remaining = tasks.filter((t) => !t._done);
  const done      = tasks.filter((t) => t._done);
  return (
    <div className="aws-artifact aws-artifact--approvals">
      <div className="aws-artifact-header">
        <span className="aws-artifact-title">Pending Approvals</span>
        <span className="aws-artifact-badge">{remaining.length} left</span>
      </div>
      {remaining.length === 0 && done.length > 0
        ? <p className="aws-artifact-empty">All done! No more pending approvals.</p>
        : remaining.map((t) => (
            <ApprovalCard key={t.id} task={t} token={token} onDone={onTaskDone} />
          ))
      }
      {done.length > 0 && remaining.length > 0 && (
        <p className="aws-artifact-empty" style={{ fontSize: 12, marginTop: 4 }}>
          {done.length} already reviewed above
        </p>
      )}
    </div>
  );
}

function ArtifactCard({ artifact, token, onApprovalTaskDone }) {
  if (artifact.type === 'family_overview') return <FamilyArtifact data={artifact.data} />;
  if (artifact.type === 'task')      return <TaskArtifact      data={artifact.data} />;
  if (artifact.type === 'reward')    return <RewardArtifact    data={artifact.data} />;
  if (artifact.type === 'approvals') return <ApprovalsArtifact tasks={artifact.tasks} token={token} onTaskDone={onApprovalTaskDone} />;
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Canvas empty state
   ───────────────────────────────────────────────────────────────────────── */
function CanvasEmpty() {
  return (
    <div className="aws-canvas-empty">
      <div className="aws-canvas-empty-icon"><SparkIcon size={32} /></div>
      <h3>Your workspace is empty</h3>
      <p>Use the chat to ask the AI to create quests, rewards, or show your family overview. Everything it builds will appear here as live, interactive cards.</p>
      <div className="aws-canvas-hints">
        <div className="aws-canvas-hint"><UsersIcon /><span>Family overview</span></div>
        <div className="aws-canvas-hint"><SwordIcon /><span>Quests & tasks</span></div>
        <div className="aws-canvas-hint"><GiftIcon /><span>Rewards</span></div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Quick action chips - context-aware suggestions
   ───────────────────────────────────────────────────────────────────────── */
const INITIAL_CHIPS = [
  { label: 'Morning briefing', action: 'morning_briefing' },
  { label: 'What needs my attention?', prompt: "What needs my attention right now? Check for pending approvals and anything urgent." },
  { label: 'Show family overview',     prompt: 'Show me an overview of my family - children, their balances, and current tasks.' },
  { label: 'Create a task',              action: 'create_task' },
  { label: 'Set up a reward',             prompt: 'I want to create a reward my children can redeem with their points.' },
];

function buildChips(artifacts, familyData) {
  const hasFamilyArtifact  = artifacts.some((a) => a.type === 'family_overview');
  const hasApprovals       = artifacts.some((a) => a.type === 'approvals');
  const hasTask            = artifacts.some((a) => a.type === 'task');
  const children           = familyData?.children || [];

  if (!hasFamilyArtifact && !hasApprovals) return INITIAL_CHIPS;

  const childChips = children.slice(0, 3).map((c) => ({
    label: `Quest for ${c.name}`,
    prompt: `Create a quest for ${c.name}.`
  }));

  const base = [
    ...childChips,
    { label: 'Add a reward',    prompt: 'Create a new reward item for my children.' },
    { label: 'Plan this week',  prompt: "Help me plan this week's quests and gaming schedule." },
  ];

  if (hasTask) {
    base.unshift({ label: 'Another quest', prompt: 'Create another quest for one of my children.' });
  }
  if (!hasApprovals) {
    base.unshift({ label: 'Check approvals', prompt: 'Show me any pending task approvals.' });
  }

  return base.slice(0, 5);
}

/* ─────────────────────────────────────────────────────────────────────────
   Insights components
   ───────────────────────────────────────────────────────────────────────── */
function InsightsScoreBar({ score }) {
  const color = score >= 75 ? '#34c77b' : score >= 50 ? '#f58c4b' : '#e05c5c';
  return (
    <div className="insights-score-wrap">
      <div className="insights-score-bar">
        <div className="insights-score-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="insights-score-val" style={{ color }}>{score}/100</span>
    </div>
  );
}

function ChildInsightCard({ child }) {
  const topGame = child.topGames?.[0];
  const capPct  = child.weeklyCapMinutes
    ? Math.min(100, Math.round((child.totalGamingMinutes / child.weeklyCapMinutes) * 100))
    : null;

  return (
    <div className="insights-child-card">
      <div className="insights-child-header">
        <span className="insights-child-avatar">{child.childName?.[0]?.toUpperCase() || '?'}</span>
        <div>
          <span className="insights-child-name">{child.childName}</span>
          <span className="insights-child-balances">
            <span className="aws-balance rp">{child.rpBalance} RP</span>
            <span className="aws-balance gp">{child.gpBalance} GP</span>
          </span>
        </div>
      </div>

      <div className="insights-stats-grid">
        <div className="insights-stat">
          <span className="insights-stat-label">Top Game</span>
          <span className="insights-stat-val">{topGame ? `${topGame.gameName} (${topGame.totalMinutes} min)` : '-'}</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-label">Sessions This Week</span>
          <span className="insights-stat-val">{child.sessionCount}</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-label">Avg Session</span>
          <span className="insights-stat-val">{child.avgSessionMinutes} min</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-label">Tasks Completed</span>
          <span className="insights-stat-val">{child.tasksCompletedThisWeek}</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-label">Late-Night Sessions</span>
          <span className={`insights-stat-val${child.lateNightSessions > 0 ? ' warn' : ''}`}>
            {child.lateNightSessions > 0 ? child.lateNightSessions : '0'}
          </span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-label">Gaming This Week</span>
          <span className="insights-stat-val">
            {child.totalGamingMinutes} min
            {capPct !== null && <span className="insights-cap-pct"> ({capPct}% of cap)</span>}
          </span>
        </div>
      </div>

      <div className="insights-balance-section">
        <span className="insights-balance-label">Healthy Balance Score</span>
        <InsightsScoreBar score={child.healthyBalanceScore} />
      </div>
    </div>
  );
}

function InsightsPanel({ token }) {
  const [insights,  setInsights]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [generated, setGenerated] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/ai/parent/insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setInsights(data);
      setGenerated(true);
    } catch (err) {
      setError(err.message || 'Failed to load insights.');
    } finally {
      setLoading(false);
    }
  }

  if (!generated) {
    return (
      <div className="insights-empty">
        <h3>Weekly Family Insights</h3>
        <p>Get an AI-powered summary of your children's gaming and task activity this week.</p>
        <button
          type="button"
          className="secondary-button"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Generate Insights'}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="insights-loading">
        <span className="ai-typing"><span /><span /><span /></span>
        <p>Analysing family activity…</p>
      </div>
    );
  }

  const children = insights?.children || [];

  return (
    <div className="insights-panel">
      {insights?.narrative && (
        <div className="insights-narrative">
          <p>{insights.narrative}</p>
        </div>
      )}

      {children.length === 0
        ? <p className="text-dim text-center">No children data yet. Add children and let them play to see insights.</p>
        : children.map((child) => <ChildInsightCard key={child.childId} child={child} />)
      }

      <button
        type="button"
        className="insights-refresh-btn"
        onClick={load}
        disabled={loading}
      >
        {loading ? '…' : '↻ Refresh'}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main page component
   ───────────────────────────────────────────────────────────────────────── */
export default function AiWorkspacePage({ token, parentName }) {
  const navigate = useNavigate();

  const [messages,         setMessages]       = useState([]);
  const [streamingText,    setStreamingText]   = useState('');
  const [streamingTools,   setStreamingTools]  = useState([]);
  const [input,            setInput]           = useState('');
  const [isStreaming,      setIsStreaming]      = useState(false);
  const [historyLoaded,    setHistoryLoaded]   = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  /* Workspace artifacts */
  const [artifacts,  setArtifacts]  = useState([]);
  const [familyData, setFamilyData] = useState(null); // latest family overview data
  const [canvasTab,  setCanvasTab]  = useState('workspace'); // 'workspace' | 'insights'

  /* AI action buttons - keyed by message index */
  const [messageActions, setMessageActions] = useState({}); // { [msgIdx]: actions[] }
  const [actionResults,  setActionResults]  = useState({}); // { [key]: string }
  const [toast,          setToast]          = useState(''); // brief success toast

  /* Morning briefing */
  const [briefingLoading, setBriefingLoading] = useState(false);

  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const abortRef       = useRef(null);
  const canvasRef      = useRef(null);
  const typingQueueRef = useRef([]);   // chars received but not yet shown
  const typingDrainRef = useRef(null); // setInterval handle
  const typingShownRef = useRef('');   // chars currently visible in streaming bubble

  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg) { setToast(msg); }

  /* ── Execute an AI-suggested action ── */
  async function executeAction(action, actionKey) {
    try {
      let result;
      if (action.method === 'GET') {
        result = await apiRequest(action.endpoint, { token });
      } else {
        result = await apiRequest(action.endpoint, { method: action.method || 'POST', token, body: action.body || {} });
      }
      const summary = typeof result === 'object' ? JSON.stringify(result).slice(0, 120) : String(result);
      setActionResults((prev) => ({ ...prev, [actionKey]: summary }));
      showToast(`Done: ${action.label}`);
    } catch (err) {
      showToast(`Failed: ${err.message}`);
    }
  }

  function stopTypingDrain() {
    clearInterval(typingDrainRef.current);
    typingDrainRef.current = null;
    typingQueueRef.current = [];
    typingShownRef.current = '';
  }

  function startTypingDrain() {
    if (typingDrainRef.current) return;
    typingDrainRef.current = setInterval(() => {
      if (!typingQueueRef.current.length) return;
      // Adaptive batch size - catches up if AI streams faster than display
      const n = typingQueueRef.current.length > 50 ? 5
              : typingQueueRef.current.length > 20 ? 3
              : typingQueueRef.current.length >  5 ? 2
              : 1;
      typingShownRef.current += typingQueueRef.current.splice(0, n).join('');
      setStreamingText(typingShownRef.current);
    }, 28); // ~35 chars/sec - feels like a fast human typist
  }

  /* ── Load history ── */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/ai/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch { /* silent */ }
      finally { setHistoryLoaded(true); }
    }
    load();
  }, [token]);

  /* ── Auto-scroll chat to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, streamingTools]);

  /* ── Handle approval card task-done (approve/reject button clicked) ── */
  function handleApprovalTaskDone(taskId, _result) {
    setArtifacts((prev) => prev.map((a) => {
      if (a.type !== 'approvals') return a;
      return { ...a, tasks: a.tasks.map((t) => t.id === taskId ? { ...t, _done: true } : t) };
    }));
  }

  /* ── Process tool_done → create workspace artifact ── */
  function processToolDone(event) {
    if (!event.success) return;
    const id = `${Date.now()}-${Math.random()}`;

    if (event.tool === 'get_family_overview') {
      const fd = event.data;
      setFamilyData(fd);
      setArtifacts((prev) => {
        const rest = prev.filter((a) => a.type !== 'family_overview');
        return [...rest, { id, type: 'family_overview', data: fd }];
      });

    } else if (event.tool === 'get_pending_approvals') {
      const tasks = event.data || [];
      setArtifacts((prev) => {
        // Replace existing approvals card so it stays fresh
        const rest = prev.filter((a) => a.type !== 'approvals');
        return [...rest, { id, type: 'approvals', tasks }];
      });

    } else if (event.tool === 'approve_task' || event.tool === 'reject_task') {
      // Mark the task done in the approvals artifact (AI-triggered approve/reject)
      const taskId = event.data?.taskId;
      if (taskId) handleApprovalTaskDone(taskId, event.tool === 'approve_task' ? 'approved' : 'rejected');

    } else if (event.tool === 'create_task') {
      const merged = event.data ? { ...event.data, _input: event.input } : event.input;
      setArtifacts((prev) => [...prev, { id, type: 'task', data: merged }]);

    } else if (event.tool === 'create_reward') {
      const merged = event.data ? { ...event.data, _input: event.input } : event.input;
      setArtifacts((prev) => [...prev, { id, type: 'reward', data: merged }]);
    }
  }

  /* ── Send message ── */
  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;

    setInput('');
    const ta = inputRef.current;
    if (ta) { ta.style.height = 'auto'; }
    setIsStreaming(true);
    stopTypingDrain();
    setStreamingText('');
    setStreamingTools([]);
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);

    const controller = new AbortController();
    abortRef.current = controller;

    let currentText    = '';
    let currentTools   = [];
    let currentActions = [];
    let doneReceived   = false;
    let wasAborted     = false;

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ message: msg, history: messages }),
        signal:  controller.signal
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === 'text') {
            currentText += event.delta;
            typingQueueRef.current.push(...event.delta.split(''));
            startTypingDrain();

          } else if (event.type === 'tool_start') {
            currentTools = [...currentTools, { ...event, _id: Date.now() + Math.random() }];
            setStreamingTools([...currentTools]);

          } else if (event.type === 'tool_done') {
            const idx = [...currentTools].reverse().findIndex(
              (t) => t.tool === event.tool && t.type === 'tool_start'
            );
            if (idx !== -1) {
              const realIdx = currentTools.length - 1 - idx;
              currentTools = currentTools.map((t, i) =>
                i === realIdx ? { ...event, _id: t._id } : t
              );
            } else {
              currentTools = [...currentTools, { ...event, _id: Date.now() + Math.random() }];
            }
            setStreamingTools([...currentTools]);
            processToolDone(event); // ← create workspace artifact

          } else if (event.type === 'actions') {
            currentActions = event.actions || [];

          } else if (event.type === 'done') {
            doneReceived = true;
            const finalContent = event.assistantMessage || currentText;
            stopTypingDrain();
            setMessages((prev) => {
              const next = [...prev, { role: 'assistant', content: finalContent, toolEvents: currentTools }];
              // Store actions keyed by the new message index
              if (currentActions.length > 0) {
                const msgIdx = next.length - 1;
                setMessageActions((pa) => ({ ...pa, [msgIdx]: currentActions }));
              }
              return next;
            });
            setStreamingText('');
            setStreamingTools([]);

          } else if (event.type === 'error') {
            throw new Error(event.message || 'AI error');
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        wasAborted = true;
      } else {
        const errMsg = err.message || '';
        const errorContent =
          errMsg.includes('API key') || errMsg.includes('api_key')
            ? 'API key not configured. Add ANTHROPIC_API_KEY to backend/.env.'
            : errMsg.includes('fetch') || err.name === 'TypeError'
            ? 'Cannot reach the backend. Make sure it is running.'
            : errMsg || 'Something went wrong. Please try again.';
        setMessages((prev) => [...prev, { role: 'assistant', content: errorContent, isError: true }]);
      }
    } finally {
      stopTypingDrain();
      if (!wasAborted && !doneReceived && currentText) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: currentText, toolEvents: currentTools }
        ]);
      }
      setIsStreaming(false);
      setStreamingText('');
      setStreamingTools([]);
      abortRef.current = null;
      if (!wasAborted) setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [input, isStreaming, messages, token]);

  /* ── Morning briefing ── */
  async function loadMorningBriefing() {
    if (briefingLoading) return;
    setBriefingLoading(true);
    try {
      const data = await apiRequest('/ai/family-briefing', { token });
      const briefingText = data?.briefing || 'Here is your morning briefing.';
      const actions = data?.actions || [];
      const stats = data?.stats || {};
      const statsLine = [
        stats.pendingApprovals != null ? `${stats.pendingApprovals} pending approval${stats.pendingApprovals !== 1 ? 's' : ''}` : null,
        stats.weeklyRp != null ? `${stats.weeklyRp} RP earned this week` : null,
        Array.isArray(stats.streakRisk) && stats.streakRisk.length > 0 ? `Streak risk: ${stats.streakRisk.join(', ')}` : null
      ].filter(Boolean).join(' · ');

      const fullText = statsLine ? `${briefingText}\n\n${statsLine}` : briefingText;

      setMessages((prev) => {
        const next = [...prev, { role: 'assistant', content: fullText, toolEvents: [] }];
        if (actions.length > 0) {
          const msgIdx = next.length - 1;
          setMessageActions((pa) => ({ ...pa, [msgIdx]: actions }));
        }
        return next;
      });
    } catch {
      // Fail silently - briefing is optional
    } finally {
      setBriefingLoading(false);
    }
  }

  /* ── Handle chip click - some chips have special actions ── */
  function handleChipClick(chip) {
    if (chip.action === 'morning_briefing') {
      loadMorningBriefing();
    } else if (chip.action === 'create_task') {
      const firstName = familyData?.children?.[0]?.name || '[child name]';
      setInput(`Create a task for ${firstName}:`);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (chip.prompt) {
      sendMessage(chip.prompt);
    }
  }

  /* ── Clear history ── */
  async function clearHistory() {
    try {
      await fetch(`${API_BASE}/ai/history`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([]);
      setArtifacts([]);
      setFamilyData(null);
    } catch { /* ignore */ }
    finally { setShowClearConfirm(false); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const isActive   = isStreaming || streamingText || streamingTools.length > 0;
  const chips      = buildChips(artifacts, familyData);
  const firstName  = parentName?.split(' ')[0] || 'there';

  /* ── Render ── */
  return (
    <div className="aws-page">

      {/* ════════════════════════════════════
          LEFT - Chat panel
          ════════════════════════════════════ */}
      <div className="aws-chat-panel">

        {/* Header */}
        <div className="aws-chat-header">
          <button
            type="button"
            className="aws-back-btn"
            onClick={() => navigate('/parent/dashboard')}
            aria-label="Back to classic dashboard"
          >
            <BackIcon /> Classic view
          </button>
          <div className="aws-chat-brand">
            <span className="aws-brand-dot" aria-hidden="true" />
            <span className="aws-brand-name">Gametime AI</span>
            <span className="aws-brand-badge">Beta</span>
          </div>
          <div className="aws-chat-header-actions">
            {messages.length > 0 && !isStreaming && (
              showClearConfirm
                ? <>
                    <span className="ai-confirm-text">Clear all?</span>
                    <button type="button" className="ai-icon-btn danger" onClick={clearHistory}>Yes</button>
                    <button type="button" className="ai-icon-btn" onClick={() => setShowClearConfirm(false)}>No</button>
                  </>
                : <button type="button" className="ai-icon-btn" title="Clear conversation" onClick={() => setShowClearConfirm(true)}>
                    <TrashIcon />
                  </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="aws-messages" role="log" aria-live="polite" aria-atomic="false">
          {!historyLoaded && (
            <div className="aws-chat-loading">
              <span className="ai-typing"><span /><span /><span /></span>
            </div>
          )}

          {historyLoaded && messages.length === 0 && !isActive && (
            <div className="aws-chat-empty">
              <div className="aws-chat-empty-avatar"><SparkIcon size={22} /></div>
              <p className="aws-chat-empty-greeting">Hi {firstName}! I'm your Gametime AI.</p>
              <p className="aws-chat-empty-sub">Click a suggestion below or type anything to get started.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              <ChatBubble msg={msg} />
              {msg.role === 'assistant' && messageActions[i] && messageActions[i].length > 0 && (
                <div className="ai-actions-row">
                  {messageActions[i].map((action, j) => {
                    const key = `${i}-${j}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        className="ai-action-btn"
                        onClick={() => executeAction(action, key)}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {isActive && <StreamingBubble text={streamingText} toolEvents={streamingTools} />}
          <div ref={bottomRef} />
        </div>

        {/* Quick action chips */}
        {historyLoaded && !isStreaming && (
          <div className="aws-chips-bar">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className="aws-chip"
                disabled={chip.action === 'morning_briefing' && briefingLoading}
                onClick={() => handleChipClick(chip)}
              >
                {chip.action === 'morning_briefing' && briefingLoading ? 'Loading…' : chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="aws-input-bar">
          <textarea
            ref={inputRef}
            className="aws-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything or click a suggestion…"
            disabled={isStreaming}
            rows={1}
            aria-label="Message input"
          />
          <button
            type="button"
            className="aws-send-btn"
            onClick={() => sendMessage()}
            disabled={isStreaming || !input.trim()}
            aria-label="Send"
          >
            <SendIcon />
          </button>
        </div>

        {/* Hint text - shown only when canvas is empty */}
        {historyLoaded && messages.length === 0 && !isActive && (
          <p className="ai-hint-text">
            Try: &ldquo;Create a task for Ethan to clean his room by Sunday worth 15 RP&rdquo;<br />
            &ldquo;What needs my attention today?&rdquo; &nbsp;&bull;&nbsp; &ldquo;Give Sophia a 5 RP bonus for helping with dinner&rdquo;
          </p>
        )}

        {/* Toast */}
        {toast && <div className="ai-toast" role="status">{toast}</div>}
      </div>

      {/* ════════════════════════════════════
          RIGHT - Workspace canvas
          ════════════════════════════════════ */}
      <div className="aws-canvas" ref={canvasRef}>
        <div className="aws-canvas-header">
          <div className="aws-canvas-tabs">
            <button
              type="button"
              className={`aws-canvas-tab${canvasTab === 'workspace' ? ' active' : ''}`}
              onClick={() => setCanvasTab('workspace')}
            >
              Workspace
            </button>
            <button
              type="button"
              className={`aws-canvas-tab${canvasTab === 'insights' ? ' active' : ''}`}
              onClick={() => setCanvasTab('insights')}
            >
              Insights
            </button>
          </div>
          {canvasTab === 'workspace' && (
            <span className="aws-canvas-sub">
              {artifacts.length === 0
                ? 'Your AI-built content will appear here'
                : `${artifacts.length} item${artifacts.length !== 1 ? 's' : ''} created`
              }
            </span>
          )}
        </div>

        <div className="aws-canvas-content">
          {canvasTab === 'workspace' && (
            artifacts.length === 0
              ? <CanvasEmpty />
              : artifacts.map((a) => (
                  <div key={a.id} className="aws-artifact-wrap">
                    <ArtifactCard artifact={a} token={token} onApprovalTaskDone={handleApprovalTaskDone} />
                  </div>
                ))
          )}
          {canvasTab === 'insights' && <InsightsPanel token={token} />}
        </div>
      </div>

    </div>
  );
}
