import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAppRouter } from 'gametime-web-nav';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TaskCompletionForm from './TaskCompletionForm.jsx';
import DashboardShell from '../components/DashboardShell.jsx';
import ParentPinGate from '../components/ParentPinGate.jsx';
import StatusChip from '../components/StatusChip.jsx';
import MetricIcon from '../components/MetricIcon.jsx';
import GamingSessionController from '../components/GamingSessionController.jsx';
import RewardStore from '../components/RewardStore.jsx';
import { trackEvent } from '../utils/analytics.js';
import { normalizeTasksListResponse } from '../utils/tasksList.js';
import ChildAvatar from '../components/ChildAvatar.jsx';

gsap.registerPlugin(useGSAP);

const GAMING_PLATFORMS = ['iOS', 'Windows', 'macOS', 'Web', 'Console', 'Other'];
const DENIAL_MESSAGES = {
  BLOCKED_GAME: 'This game is blocked by your parent controls.',
  ACTIVE_SESSION_EXISTS: 'You already have an active gaming session.',
  DAILY_CAP_REACHED: 'Daily gaming cap reached.',
  WEEKLY_CAP_REACHED: 'Weekly gaming cap reached.',
  NO_MINUTES_FROM_POINTS: 'No gaming minutes available from points right now.'
};
const CHILD_TASK_REQUEST_SUGGESTIONS = [
  {
    id: 'math-practice',
    title: 'Math Practice Sprint',
    description: 'Can I get a task for finishing 30 minutes of math practice today?',
    requestedPoints: 15
  },
  {
    id: 'reading-practice',
    title: 'Reading Session',
    description: 'Can I earn points by reading for 25 minutes and sharing what I learned?',
    requestedPoints: 12
  },
  {
    id: 'fitness-task',
    title: 'Fitness Mission',
    description: 'Can I have a task for completing a 20-minute workout with evidence?',
    requestedPoints: 20
  },
  {
    id: 'cleanup-task',
    title: 'Room Cleanup',
    description: 'Can I get a task for cleaning my room and uploading before/after proof?',
    requestedPoints: 18
  }
];
const CHILD_GAMING_SESSION_SUGGESTIONS = [
  { id: 'quick-brawl', gameName: 'Brawl Stars', platform: 'iOS', requestedMinutes: 20 },
  { id: 'minecraft-focus', gameName: 'Minecraft', platform: 'Windows', requestedMinutes: 30 },
  { id: 'valorant-ranked', gameName: 'Valorant', platform: 'Windows', requestedMinutes: 45 },
  { id: 'roblox-creative', gameName: 'Roblox', platform: 'iOS', requestedMinutes: 25 }
];

function StatsSkeleton({ count = 7 }) {
  return (
    <div className="stats-skeleton" aria-busy="true" aria-label="Loading stats">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line short" />
          <div className="skeleton-line medium" />
          <div className="skeleton-line tall short" />
        </div>
      ))}
    </div>
  );
}

function fmtDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function disputeStatus(task) {
  if (task.state !== 'Rejected') return '-';
  if (task.disputed) return `Submitted on ${fmtDateTime(task.disputedAt)}`;
  return 'Rejected. You can submit a dispute.';
}

function formatGamingDenial(response) {
  const code = response?.code;
  const base = DENIAL_MESSAGES[code] || response?.reason || 'Session denied by family controls.';
  const nextStep = response?.nextStep ? ` ${response.nextStep}` : '';
  return `${base}${nextStep}`;
}

export default function ChildDashboard({ token }) {
  const router = useAppRouter();
  const { showParentChrome } = useAuth();
  const overviewStatsGridRef = useRef(null);
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskRequests, setTaskRequests] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [gamingOverview, setGamingOverview] = useState(null);
  const [gamingSessions, setGamingSessions] = useState([]);
  const [gamingGames, setGamingGames] = useState([]);
  const [gamingForm, setGamingForm] = useState({ gameName: '', platform: 'iOS', requestedMinutes: 30 });
  const [activeGamingSession, setActiveGamingSession] = useState(null);
  const [gamingBusy, setGamingBusy] = useState(false);
  const [gamingNotice, setGamingNotice] = useState('');
  const [gamingError, setGamingError] = useState('');
  const [taskRequestForm, setTaskRequestForm] = useState({ title: '', description: '', requestedPoints: 10 });
  const [giftcardCodes, setGiftcardCodes] = useState([]);
  const [revealedCode, setRevealedCode] = useState(null); // { rewardTitle, giftcardName, skuName, code, pin, expiryDate }
  const [taskNotice, setTaskNotice] = useState('');
  const [taskError, setTaskError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState({});
  const [achievements, setAchievements] = useState([]);
  const [streak, setStreak] = useState(0);

  function applyTaskRequestSuggestion(suggestion) {
    setTaskRequestForm((prev) => ({
      ...prev,
      title: suggestion.title,
      description: suggestion.description,
      requestedPoints: suggestion.requestedPoints
    }));
    setTaskNotice('');
    setTaskError('');
  }

  function applyGamingSessionSuggestion(suggestion) {
    setGamingForm({
      gameName: suggestion.gameName,
      platform: suggestion.platform,
      requestedMinutes: suggestion.requestedMinutes
    });
    setGamingNotice('');
    setGamingError('');
  }

  async function refresh() {
    setLoading(true);
    try {
      const [meRes, taskRes, taskRequestRes, rewardRes, overviewRes, sessionsRes, gamesRes, codesRes, achRes, streakRes] = await Promise.all([
        apiRequest('/auth/me', { token }),
        apiRequest('/tasks/list', { token }).then((r) => normalizeTasksListResponse(r).tasks),
        apiRequest('/tasks/requests', { token }),
        apiRequest('/rewards/list', { token }),
        apiRequest('/gaming/overview', { token }),
        apiRequest('/gaming/sessions', { token }),
        apiRequest('/gaming/games', { token }),
        apiRequest('/giftcards/my-codes', { token }).catch(() => []),
        apiRequest('/achievements/list', { token }).catch(() => ({ achievements: [] })),
        apiRequest('/achievements/streak', { token }).catch(() => ({ streak: 0 }))
      ]);

      setMe(meRes.user);
      setTasks(taskRes);
      setTaskRequests(taskRequestRes);
      setRewards(rewardRes);
      setGamingOverview(overviewRes);
      setGamingSessions(sessionsRes);
      setGamingGames(gamesRes);
      setGiftcardCodes(Array.isArray(codesRes) ? codesRes : []);
      setAchievements(achRes?.achievements ?? []);
      setStreak(streakRes?.streak ?? 0);
      setActiveGamingSession(sessionsRes.find((item) => item.status === 'Started') || null);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const quickStats = useMemo(() => ({
    rpPoints: me?.pointsBalance ?? 0,
    gpPoints: me?.giftcardPointsBalance ?? 0,
    activeTasks: tasks.filter((task) => task.state === 'Active').length,
    pendingApprovals: tasks.filter((task) => task.state === 'PendingApproval').length,
    pendingRequests: taskRequests.filter((request) => request.status === 'Pending').length,
    rewards: rewards.filter((reward) => reward.active).length,
    playableNow: gamingOverview?.usage?.playableNow ?? 0
  }), [gamingOverview, me, rewards, taskRequests, tasks]);

  const quickStatCards = [
    { key: 'rpPoints', label: 'RP', icon: 'rp' },
    { key: 'gpPoints', label: 'GP', icon: 'gp' },
    { key: 'activeTasks', label: 'Tasks', icon: 'tasks' },
    { key: 'pendingApprovals', label: 'Approvals', icon: 'approvals' },
    { key: 'pendingRequests', label: 'Requests', icon: 'requests' },
    { key: 'rewards', label: 'Rewards', icon: 'rewards' },
    { key: 'playableNow', label: 'Play Now', icon: 'play' }
  ];

  useGSAP(
    () => {
      if (loading) return;
      const root = overviewStatsGridRef.current;
      if (!root) return;
      const cards = root.querySelectorAll('.stat-card');
      if (!cards.length) return;
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      gsap.from(cards, {
        opacity: 0,
        y: 18,
        duration: 0.52,
        stagger: 0.075,
        ease: 'power2.out',
      });
    },
    { scope: overviewStatsGridRef, dependencies: [loading], revertOnUpdate: true },
  );

  async function requestTask(event) {
    event.preventDefault();
    setTaskNotice('');
    setTaskError('');
    try {
      const title = taskRequestForm.title.trim();
      const description = taskRequestForm.description.trim();
      const requestedPoints = Number(taskRequestForm.requestedPoints);
      if (!title || !description) {
        throw new Error('Task request title and description are required.');
      }
      if (!Number.isInteger(requestedPoints) || requestedPoints < 5 || requestedPoints > 50) {
        throw new Error('Requested points must be between 5 and 50.');
      }

      await apiRequest('/tasks/request', {
        method: 'POST',
        token,
        body: { title, description, requestedPoints }
      });
      trackEvent('task_requested_by_child', { requestedPoints });
      setTaskNotice('Task request sent to parent.');
      setTaskRequestForm({ title: '', description: '', requestedPoints: 10 });
      await refresh();
    } catch (e) {
      setTaskError(e.message || 'Failed to send task request.');
      trackEvent('task_request_by_child_failed', { error: e.message });
    }
  }

  async function submitDispute(taskId) {
    const note = (disputeNotes[taskId] || '').trim();
    if (!note) {
      setTaskError('Dispute note is required.');
      return;
    }
    setTaskError('');
    setTaskNotice('');
    try {
      await apiRequest('/tasks/dispute', { method: 'POST', token, body: { taskId, note } });
      trackEvent('task_disputed', { taskId });
      setTaskNotice('Dispute submitted successfully.');
      setDisputeNotes((prev) => ({ ...prev, [taskId]: '' }));
      await refresh();
    } catch (e) {
      setTaskError(e.message || 'Failed to submit dispute.');
      trackEvent('task_dispute_failed', { taskId, error: e.message });
    }
  }

  async function startGamingSession(event) {
    event.preventDefault();
    setGamingBusy(true);
    setGamingNotice('');
    setGamingError('');
    try {
      const gameName = gamingForm.gameName.trim();
      const requestedMinutes = Number(gamingForm.requestedMinutes);
      if (!gameName) throw new Error('Game name is required.');
      if (!Number.isInteger(requestedMinutes) || requestedMinutes < 1 || requestedMinutes > 240) {
        throw new Error('Minutes request must be between 1 and 240.');
      }
      if (!gamingForm.platform) throw new Error('Platform is required.');

      const response = await apiRequest('/gaming/sessions/start', {
        method: 'POST',
        token,
        body: { gameName, platform: gamingForm.platform, requestedMinutes }
      });

      if (!response.allowed) {
        const reason = formatGamingDenial(response);
        setGamingError(reason);
        trackEvent('gaming_session_denied', {
          reason,
          code: response.code || 'UNKNOWN',
          gameName,
          platform: gamingForm.platform
        });
      } else {
        setGamingNotice(response.message || `Session approved for ${response.grantedMinutes} minutes.`);
        trackEvent('gaming_session_started', {
          sessionId: response.sessionId,
          grantedMinutes: response.grantedMinutes,
          gameName,
          platform: gamingForm.platform
        });
      }
      await refresh();
    } catch (e) {
      setGamingError(e.message || 'Failed to request session.');
      trackEvent('gaming_session_start_failed', {
        gameName: gamingForm.gameName,
        platform: gamingForm.platform,
        error: e.message
      });
    } finally {
      setGamingBusy(false);
    }
  }

  async function endGamingSession() {
    if (!activeGamingSession) return;
    setGamingBusy(true);
    setGamingNotice('');
    setGamingError('');
    try {
      await apiRequest('/gaming/sessions/end', {
        method: 'POST',
        token,
        body: {
          sessionId: activeGamingSession.id,
          actualMinutes: activeGamingSession.grantedMinutes || 1
        }
      });
      setGamingNotice('Session ended and usage saved.');
      trackEvent('gaming_session_ended', { sessionId: activeGamingSession.id });
      await refresh();
    } catch (e) {
      setGamingError(e.message || 'Failed to end session.');
      trackEvent('gaming_session_end_failed', { sessionId: activeGamingSession.id, error: e.message });
    } finally {
      setGamingBusy(false);
    }
  }

  const sections = [
    {
      id: 'overview',
      label: 'Overview',
      content: ({ goToSection }) => (
        <section className="panel welcome-panel" aria-busy={loading}>
          <div className="panel-top">
            <div className="welcome-identity">
              <ChildAvatar childId={me?.id} name={me?.name} token={token} size="lg" />
              <div>
                <h2>Welcome back, {me?.name || 'Player'}</h2>
                <p className="section-subtitle">Complete tasks, earn RP and GP, unlock rewards, and track gaming time.</p>
              </div>
            </div>
            <div className="quick-actions">
              <button type="button" className="secondary-button" onClick={() => goToSection('tasks')}>Complete Task</button>
              <button type="button" className="secondary-button" onClick={() => goToSection('rewards')}>Redeem Reward</button>
              <button type="button" className="secondary-button" onClick={() => goToSection('gaming')}>Start Session</button>
              {showParentChrome ? (
                <>
                  <button type="button" className="secondary-button" onClick={() => router.push('/parent/ai')}>
                    Parent dashboard
                  </button>
                  <button type="button" className="secondary-button" onClick={() => router.push('/parent/dashboard')}>
                    Parent tasks
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {!showParentChrome ? <ParentPinGate /> : null}
          {loading && <StatsSkeleton count={7} />}
          {error ? <p className="error" role="alert">{error}</p> : null}

          <div ref={overviewStatsGridRef} className="stats-grid">
            {quickStatCards.map((card, index) => (
              <div key={card.key} className={`stat-card tone-${(index % 6) + 1}`}>
                <div className="stat-card__head">
                  <span className="stat-label">{card.label}</span>
                  <div className="stat-icon" aria-hidden="true">
                    <MetricIcon name={card.icon} />
                  </div>
                </div>
                <strong className="stat-value">{quickStats[card.key]}</strong>
              </div>
            ))}
          </div>

          <h3>Today At A Glance</h3>
          <div className="glance-grid">
            <article className="glance-card">
              <strong>Conversion</strong>
              <p>{gamingOverview?.conversion?.pointsUnit ?? 10} points = {gamingOverview?.conversion?.minutesUnit ?? 15} minutes</p>
            </article>
            <article className="glance-card">
              <strong>Today used</strong>
              <p>{gamingOverview?.usage?.todayUsedMinutes ?? 0} minutes</p>
            </article>
            <article className="glance-card">
              <strong>Weekly usage</strong>
              <p>{gamingOverview?.usage?.weekUsedMinutes ?? 0} / {gamingOverview?.caps?.weeklyCapMinutes ?? 0} minutes</p>
            </article>
          </div>
        </section>
      )
    },
    {
      id: 'gaming',
      label: 'Gaming Time',
      content: (
        <>
          <section className="panel">
            <h2>Gaming Time Wallet</h2>
            {gamingNotice ? <p className="notice">{gamingNotice}</p> : null}
            {gamingError ? <p className="error" role="alert">{gamingError}</p> : null}
            <div className="task-suggestions" aria-label="Session suggestions">
              <p className="helper-text">Session ideas: tap one to prefill game, platform, and minutes.</p>
              <div className="suggestion-chip-row">
                {CHILD_GAMING_SESSION_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => applyGamingSessionSuggestion(suggestion)}
                  >
                    {suggestion.gameName} · {suggestion.requestedMinutes} min
                  </button>
                ))}
              </div>
            </div>

            <form className="inline-form" onSubmit={startGamingSession}>
              <label>
                Game name
                <input
                  maxLength={80}
                  value={gamingForm.gameName}
                  onChange={(e) => setGamingForm((prev) => ({ ...prev, gameName: e.target.value }))}
                  required
                />
              </label>
              <label>
                Platform
                <select value={gamingForm.platform} onChange={(e) => setGamingForm((prev) => ({ ...prev, platform: e.target.value }))}>
                  {GAMING_PLATFORMS.map((platform) => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </label>
              <label>
                Minutes request
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={gamingForm.requestedMinutes}
                  onChange={(e) => setGamingForm((prev) => ({ ...prev, requestedMinutes: e.target.value }))}
                  required
                />
              </label>
              <button type="submit" disabled={gamingBusy || !gamingForm.gameName.trim()}>
                Request Play Session
              </button>
            </form>

            {activeGamingSession ? (
              <div className="panel subtle-panel">
                <GamingSessionController
                  childId={me?.id}
                  role="child"
                  token={token}
                  onSessionEnd={refresh}
                />
                <p style={{ marginTop: '0.5rem' }}>
                  Active session: <strong>{activeGamingSession.gameName}</strong> ({activeGamingSession.platform}),
                  granted {activeGamingSession.grantedMinutes} minutes.
                </p>
                <button type="button" onClick={endGamingSession} disabled={gamingBusy}>End Session</button>
              </div>
            ) : null}
          </section>

          <section className="panel">
            <h2>Game Rules</h2>
            {gamingGames.length === 0 ? <p>No game rules set yet.</p> : (
              <div className="table-wrap">
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Platform</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gamingGames.map((game) => (
                      <tr key={game.id}>
                        <td>{game.name}</td>
                        <td>{game.platform}</td>
                        <td><StatusChip state={game.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Recent Gaming Sessions</h2>
            {gamingSessions.length === 0 ? <p>No gaming sessions yet.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Started</th>
                      <th>Game</th>
                      <th>Platform</th>
                      <th>Status</th>
                      <th>Minutes</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gamingSessions.slice(0, 12).map((session) => (
                      <tr key={session.id}>
                        <td>{fmtDateTime(session.startedAt)}</td>
                        <td>{session.gameName}</td>
                        <td>{session.platform}</td>
                        <td><StatusChip state={session.status} /></td>
                        <td>{session.durationMinutes ?? session.grantedMinutes ?? '-'}</td>
                        <td>{session.denialReason || (session.denialCode ? session.denialCode.replaceAll('_', ' ') : '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )
    },
    {
      id: 'tasks',
      label: 'Tasks',
      content: (
        <>
          <section className="panel">
            <h2>Request A Task From Parent</h2>
            {taskNotice ? <p className="notice">{taskNotice}</p> : null}
            {taskError ? <p className="error" role="alert">{taskError}</p> : null}
            <div className="task-suggestions" aria-label="Task request suggestions">
              <p className="helper-text">Need ideas? Tap a suggestion to prefill your request.</p>
              <div className="suggestion-chip-row">
                {CHILD_TASK_REQUEST_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => applyTaskRequestSuggestion(suggestion)}
                  >
                    {suggestion.title} · {suggestion.requestedPoints} RP
                  </button>
                ))}
              </div>
            </div>

            <form className="inline-form" onSubmit={requestTask}>
              <label>
                Title
                <input
                  maxLength={50}
                  value={taskRequestForm.title}
                  onChange={(e) => setTaskRequestForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </label>
              <label>
                Description
                <input
                  maxLength={200}
                  value={taskRequestForm.description}
                  onChange={(e) => setTaskRequestForm((prev) => ({ ...prev, description: e.target.value }))}
                  required
                />
              </label>
              <label>
                Requested points
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={taskRequestForm.requestedPoints}
                  onChange={(e) => setTaskRequestForm((prev) => ({ ...prev, requestedPoints: e.target.value }))}
                  required
                />
              </label>
              <button type="submit">Send Request</button>
            </form>

            <h3>Request History</h3>
            {taskRequests.length === 0 ? <p>No task requests yet.</p> : (
              <div className="table-wrap">
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Points</th>
                      <th>Status</th>
                      <th>Parent Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.title}</td>
                        <td>{request.requestedPoints}</td>
                        <td><StatusChip state={request.status} /></td>
                        <td>{request.parentNote || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <TaskCompletionForm
            tasks={tasks}
            token={token}
            onComplete={async (payload) => {
              const response = await apiRequest('/tasks/complete', { method: 'POST', token, body: payload });
              trackEvent('task_complete_submitted', { taskId: payload.taskId });
              await refresh();
              return response;
            }}
          />

          <section className="panel">
            <h2>All Tasks</h2>
            {tasks.length === 0 ? <p>No tasks available.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>RP</th>
                      <th>GP</th>
                      <th>Due</th>
                      <th>Parent Note</th>
                      <th>Dispute Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.title}</td>
                        <td><StatusChip state={task.state} /></td>
                        <td>{task.points}</td>
                        <td>{task.gpPoints ?? 0}</td>
                        <td>{fmtDateTime(task.dueDate)}</td>
                        <td>{task.parentNote || '-'}</td>
                        <td>{disputeStatus(task)}</td>
                        <td>
                          {task.state === 'Rejected' && !task.disputed ? (
                            <div className="table-actions">
                              <input
                                maxLength={200}
                                placeholder="Dispute note"
                                value={disputeNotes[task.id] || ''}
                                onChange={(e) => setDisputeNotes((prev) => ({ ...prev, [task.id]: e.target.value }))}
                              />
                              <button type="button" onClick={() => submitDispute(task.id)}>
                                Submit Dispute
                              </button>
                            </div>
                          ) : null}
                          {task.disputed ? <span>Submitted</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )
    },
    {
      id: 'rewards',
      label: 'Rewards',
      content: (
        <>
          {me?.id && (
            <section className="panel">
              <h2>Reward Store</h2>
              <RewardStore
                childId={me.id}
                token={token}
                onBalanceChange={() => refresh()}
              />
            </section>
          )}
          <section className="panel" style={{ display: 'none' }}>
            <h2>Gift Card Options (Spend GP)</h2>
            {rewards.filter((reward) => reward.isGiftcard || reward.pointsType === 'GP').length === 0 ? (
              <p>No gift card rewards available yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Gift Card</th>
                      <th>GP Cost</th>
                      <th>Quantity Left</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards
                      .filter((reward) => reward.isGiftcard || reward.pointsType === 'GP')
                      .map((reward) => (
                        <tr key={reward.id}>
                          <td>{reward.title}</td>
                          <td>{reward.pointsCost}</td>
                          <td>{reward.quantityLimit ?? 'Unlimited'}</td>
                          <td>{reward.active ? 'Active' : 'Disabled'}</td>
                          <td>
                            <button
                              type="button"
                              disabled={!reward.active || !reward.canAfford}
                              onClick={async () => {
                                try {
                                  const response = await apiRequest('/rewards/redeem', { method: 'POST', token, body: { rewardId: reward.id } });
                                  setError('');
                                  trackEvent('reward_redeemed', { rewardId: reward.id, pointsType: reward.pointsType || 'GP' });

                                  if (response?.fulfilled && response?.redemptionId) {
                                    // Fetch and immediately reveal the decrypted giftcard code
                                    try {
                                      const details = await apiRequest(`/giftcards/redemptions/${response.redemptionId}/details`, { token });
                                      setRevealedCode({
                                        rewardTitle: details.rewardTitle,
                                        giftcardName: details.giftcardName,
                                        skuName: details.skuName,
                                        code: details.code,
                                        pin: details.pin,
                                        expiryDate: details.expiryDate
                                      });
                                    } catch {
                                      // Best-effort; the code will appear in My Gift Card Codes below
                                    }
                                  }

                                  await refresh();
                                  window.dispatchEvent(
                                    new CustomEvent('gametime:toast', {
                                      detail: {
                                        type: 'success',
                                        title: 'Redeemed!',
                                        message: response?.fulfilled
                                          ? 'Gift card code is ready - see below!'
                                          : 'Successfully redeemed. Parent will fulfill it soon.'
                                      }
                                    })
                                  );
                                } catch (e) {
                                  setError(e.message);
                                  trackEvent('reward_redeem_failed', { rewardId: reward.id, error: e.message });
                                }
                              }}
                            >
                              Redeem
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Instant code reveal after redemption ─────────────────── */}
          {revealedCode && (
            <section className="panel giftcard-reveal-panel" aria-live="polite">
              <div className="giftcard-reveal-header">
                <h2>Your Gift Card Code</h2>
                <button
                  type="button"
                  className="close-btn"
                  aria-label="Dismiss"
                  onClick={() => setRevealedCode(null)}
                >
                  ✕
                </button>
              </div>
              <p className="giftcard-reveal-title">{revealedCode.rewardTitle}</p>
              {revealedCode.giftcardName && (
                <p className="giftcard-reveal-meta">{revealedCode.giftcardName}{revealedCode.skuName ? ` - ${revealedCode.skuName}` : ''}</p>
              )}
              <div className="giftcard-code-box">
                <span className="giftcard-code-label">Code</span>
                <strong className="giftcard-code-value" aria-label="Gift card code">{revealedCode.code}</strong>
              </div>
              {revealedCode.pin && (
                <div className="giftcard-code-box">
                  <span className="giftcard-code-label">PIN</span>
                  <strong className="giftcard-code-value" aria-label="Gift card PIN">{revealedCode.pin}</strong>
                </div>
              )}
              {revealedCode.expiryDate && (
                <p className="giftcard-expiry">Expires: {revealedCode.expiryDate}</p>
              )}
              <p className="giftcard-reveal-hint">Copy this code now. You can always find it again in "My Gift Card Codes" below.</p>
            </section>
          )}

          {/* ── Persistent my-codes history ───────────────────────────── */}
          <section className="panel">
            <h2>My Gift Card Codes</h2>
            {giftcardCodes.length === 0 ? (
              <p>No gift card codes yet. Redeem a gift card reward above to get your first code.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reward</th>
                      <th>Gift Card</th>
                      <th>Code</th>
                      <th>PIN</th>
                      <th>Expires</th>
                      <th>Redeemed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftcardCodes.map((item) => (
                      <tr key={item.id}>
                        <td>{item.rewardTitle}</td>
                        <td>{item.giftcardName ? `${item.giftcardName}${item.skuName ? ` (${item.skuName})` : ''}` : '-'}</td>
                        <td>
                          <code className="giftcard-inline-code">{item.code}</code>
                        </td>
                        <td>{item.pin ?? '-'}</td>
                        <td>{item.expiryDate ?? '-'}</td>
                        <td>{fmtDateTime(item.assignedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Regular Rewards (Spend RP)</h2>
            {rewards.length === 0 ? <p>No rewards are available right now.</p> : (
              <div className="table-wrap">
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Reward</th>
                      <th>RP Cost</th>
                      <th>Quantity Left</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards
                      .filter((reward) => !reward.isGiftcard && (reward.pointsType || 'RP') === 'RP')
                      .map((reward) => (
                      <tr key={reward.id}>
                        <td>{reward.title}</td>
                        <td>{reward.pointsCost}</td>
                        <td>{reward.quantityLimit ?? 'Unlimited'}</td>
                        <td>{reward.active ? 'Active' : 'Disabled'}</td>
                        <td>
                          <button
                            type="button"
                            disabled={!reward.active || !reward.canAfford}
                            onClick={async () => {
                              try {
                                const response = await apiRequest('/rewards/redeem', { method: 'POST', token, body: { rewardId: reward.id } });
                                setError('');
                                trackEvent('reward_redeemed', { rewardId: reward.id, pointsType: 'RP' });
                                await refresh();
                                window.dispatchEvent(
                                  new CustomEvent('gametime:toast', {
                                    detail: {
                                      type: 'success',
                                      title: 'Redeemed',
                                      message: response?.fulfilled
                                        ? 'Successfully redeemed. Reward delivered instantly.'
                                        : 'Successfully redeemed. Parent will fulfill it soon.'
                                    }
                                  })
                                );
                              } catch (e) {
                                setError(e.message);
                                trackEvent('reward_redeem_failed', { rewardId: reward.id, error: e.message });
                              }
                            }}
                          >
                            Redeem
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )
    },
    {
      id: 'achievements',
      label: 'Achievements',
      content: (
        <section className="panel">
          <div className="achievements-header">
            <h2>Achievements</h2>
            {streak > 0 && (
              <div className="streak-chip">
                <span className="streak-count">{streak}</span>
                <span className="streak-label">day streak</span>
              </div>
            )}
          </div>
          <p className="section-subtitle">
            {achievements.filter((a) => a.unlocked).length} / {achievements.length} unlocked
          </p>
          <div className="achievements-grid">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`achievement-badge${ach.unlocked ? ' achievement-badge--unlocked' : ''}`}
                title={ach.unlocked && ach.unlockedAt ? `Unlocked ${new Date(ach.unlockedAt).toLocaleDateString()}` : ach.description}
              >
                <span className="achievement-icon">{ach.icon}</span>
                <span className="achievement-name">{ach.name}</span>
                <span className="achievement-desc">{ach.description}</span>
                {ach.unlocked && <span className="achievement-check" aria-label="Unlocked">✓</span>}
              </div>
            ))}
          </div>
        </section>
      )
    }
  ];

  return (
    <DashboardShell
      title="Child Dashboard"
      sections={sections}
      variant="child"
      dashboardSectionHome="overview"
    />
  );
}
