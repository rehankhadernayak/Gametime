import { useEffect, useMemo, useState } from 'react';
import { useAppRouter } from 'gametime-web-nav';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { normalizeTasksListResponse } from '../../utils/tasksList.js';
import { trackEvent } from '../../utils/analytics.js';
import TaskCompletionForm from '../TaskCompletionForm.jsx';
import ParentPinGate from '../../components/ParentPinGate.jsx';
import RewardStore from '../../components/RewardStore.jsx';
import { TypewriterHeading } from '../../components/ui/TypewriterHeading.jsx';
import { ArcadeButton, ChildLayout, MissionCard } from '../../components/child-os/index.js';
import './ChildDashboard.css';

const GAMING_PLATFORMS = ['iOS', 'Windows', 'macOS', 'Web', 'Console', 'Other'];

const DENIAL_MESSAGES = {
  BLOCKED_GAME: 'This game is blocked by your parent controls.',
  ACTIVE_SESSION_EXISTS: 'You already have an active gaming session.',
  DAILY_CAP_REACHED: 'Daily gaming cap reached.',
  WEEKLY_CAP_REACHED: 'Weekly gaming cap reached.',
  NO_MINUTES_FROM_POINTS: 'No gaming minutes available from points right now.'
};

function formatGamingDenial(response) {
  const code = response?.code;
  const base = DENIAL_MESSAGES[code] || response?.reason || 'Session denied by family controls.';
  const nextStep = response?.nextStep ? ` ${response.nextStep}` : '';
  return `${base}${nextStep}`;
}

export default function ChildDashboard({ token }) {
  const router = useAppRouter();
  const { showParentChrome } = useAuth();
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [gamingOverview, setGamingOverview] = useState(null);
  const [gamingForm, setGamingForm] = useState({ gameName: '', platform: 'iOS', requestedMinutes: 30 });
  const [activeGamingSession, setActiveGamingSession] = useState(null);
  const [gamingBusy, setGamingBusy] = useState(false);
  const [gamingNotice, setGamingNotice] = useState('');
  const [gamingError, setGamingError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGamingModal, setShowGamingModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const availableMissions = useMemo(
    () => tasks.filter((task) => task.state === 'Active'),
    [tasks]
  );

  const timeBalanceMinutes = gamingOverview?.usage?.playableNow ?? 0;

  async function refresh() {
    setLoading(true);
    try {
      const [meRes, taskRes, overviewRes, sessionsRes] = await Promise.all([
        apiRequest('/auth/me', { token }),
        apiRequest('/tasks/list', { token }).then((r) => normalizeTasksListResponse(r).tasks),
        apiRequest('/gaming/overview', { token }),
        apiRequest('/gaming/sessions', { token })
      ]);

      setMe(meRes.user);
      setTasks(taskRes);
      setGamingOverview(overviewRes);
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

  useEffect(() => {
    if (selectedTaskId) return;
    const first = availableMissions[0];
    if (first?.id) setSelectedTaskId(first.id);
  }, [availableMissions, selectedTaskId]);

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
        setShowGamingModal(false);
        router.push('/child/active-timer');
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

  function handleInitiateGamingLink() {
    setGamingNotice('');
    setGamingError('');
    if (activeGamingSession) {
      router.push('/child/active-timer');
      return;
    }
    setShowGamingModal(true);
  }

  const completionTasks = useMemo(() => {
    if (!selectedTaskId) return availableMissions;
    const selected = tasks.find((t) => t.id === selectedTaskId);
    if (selected && selected.state === 'Active') return tasks.filter((t) => t.state === 'Active');
    return availableMissions;
  }, [tasks, availableMissions, selectedTaskId]);

  return (
    <ChildLayout>
      <div className="child-os-dash">
        <TypewriterHeading className="text-xs sm:text-sm md:text-base mb-6 text-[var(--neon-blue)]">
          {'>'} WELCOME_OPERATIVE
        </TypewriterHeading>

        {!showParentChrome ? <ParentPinGate /> : null}

        {loading ? (
          <p className="child-os-dash__empty" aria-busy="true">
            SYNCING_COMMAND_NET...
          </p>
        ) : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <>
            <p className="child-os-dash__balance-label">TIME BALANCE</p>
            <p className="child-os-dash__balance-value text-7xl sm:text-8xl tabular-nums">{timeBalanceMinutes}</p>

            <ArcadeButton type="button" block onClick={handleInitiateGamingLink} disabled={gamingBusy}>
              {activeGamingSession ? 'RETURN_TO_SESSION_LINK' : 'INITIATE GAMING LINK'}
            </ArcadeButton>

            <h2 className="child-os-dash__missions-head">AVAILABLE MISSIONS</h2>
            {availableMissions.length === 0 ? (
              <p className="child-os-dash__empty">NO ACTIVE MISSIONS — REQUEST OPERATIONS FROM COMMAND.</p>
            ) : (
              availableMissions.map((task) => (
                <MissionCard
                  key={task.id}
                  task={task}
                  selected={task.id === selectedTaskId}
                  onSelect={(t) => setSelectedTaskId(t.id)}
                />
              ))
            )}

            <h3 className="child-os-dash__panel-head">SUBMIT EVIDENCE PACKET</h3>
            <TaskCompletionForm
              tasks={completionTasks.length ? completionTasks : tasks}
              token={token}
              onComplete={async (payload) => {
                const response = await apiRequest('/tasks/complete', { method: 'POST', token, body: payload });
                trackEvent('task_complete_submitted', { taskId: payload.taskId });
                await refresh();
                return response;
              }}
            />

            {me?.id ? (
              <details className="child-os-dash__supply">
                <summary>SUPPLY DEPOT — REWARD STORE</summary>
                <div className="reward-store-wrap">
                  <RewardStore childId={me.id} token={token} onBalanceChange={() => refresh()} />
                </div>
              </details>
            ) : null}

            <div className="child-os-dash__aux">
              <ArcadeButton type="button" onClick={() => router.push('/child/ai')}>
                NEURAL COACH
              </ArcadeButton>
              {showParentChrome ? (
                <ArcadeButton type="button" onClick={() => router.push('/parent/ai')}>
                  PARENT LINK
                </ArcadeButton>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {showGamingModal ? (
        <div
          className="child-os-gaming-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGamingModal(false);
          }}
        >
          <div className="child-os-gaming-modal" role="dialog" aria-labelledby="child-os-gaming-title">
            <h2 id="child-os-gaming-title">INITIATE GAMING LINK</h2>
            {gamingNotice ? <p className="notice">{gamingNotice}</p> : null}
            {gamingError ? (
              <p className="error" role="alert">
                {gamingError}
              </p>
            ) : null}
            <form onSubmit={startGamingSession}>
              <label>
                GAME DESIGNATION
                <input
                  maxLength={80}
                  value={gamingForm.gameName}
                  onChange={(e) => setGamingForm((prev) => ({ ...prev, gameName: e.target.value }))}
                  required
                />
              </label>
              <label>
                PLATFORM
                <select
                  value={gamingForm.platform}
                  onChange={(e) => setGamingForm((prev) => ({ ...prev, platform: e.target.value }))}
                >
                  {GAMING_PLATFORMS.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                DURATION (MIN)
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={gamingForm.requestedMinutes}
                  onChange={(e) => setGamingForm((prev) => ({ ...prev, requestedMinutes: e.target.value }))}
                  required
                />
              </label>
              <div className="child-os-gaming-modal__actions">
                <ArcadeButton type="submit" block disabled={gamingBusy || !gamingForm.gameName.trim()}>
                  REQUEST UPLINK
                </ArcadeButton>
                <ArcadeButton type="button" block variant="danger" onClick={() => setShowGamingModal(false)}>
                  ABORT
                </ArcadeButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ChildLayout>
  );
}
