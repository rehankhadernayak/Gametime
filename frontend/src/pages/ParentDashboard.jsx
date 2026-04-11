import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import EvidenceReviewPanel from '../components/EvidenceReviewPanel.jsx';
import GpTopUpFlow from '../components/GpTopUpFlow.jsx';
import ChildAvatar from '../components/ChildAvatar.jsx';

/* ── EvidenceMedia ───────────────────────────────────────────────────────
   Fetches task evidence from the authenticated serve endpoint and renders
   it as an <img> or <video> using a blob URL.  Using fetch + blob avoids
   sending the raw base64 in the task-list response and works regardless of
   whether the frontend and backend run on the same origin.
   ──────────────────────────────────────────────────────────────────────── */
const EVIDENCE_API_BASE = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

function EvidenceMedia({ completionId, evidenceType, evidenceMime, token, title }) {
  const [src,     setSrc]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!completionId) return;
    let objectUrl = null;
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    setSrc(null);

    fetch(`${EVIDENCE_API_BASE}/api/tasks/evidence/${completionId}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => {
        if (cancelled) return null;
        if (!r.ok) { setErrored(true); setLoading(false); return null; }
        return r.blob();
      })
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setErrored(true); setLoading(false); } });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [completionId, token]);

  if (loading) return <p className="ai-pending">Loading evidence…</p>;
  if (errored)  return <p className="ai-pending">Evidence unavailable</p>;
  if (evidenceType === 'Video') {
    return (
      <video controls className="evidence-preview">
        <source src={src} type={evidenceMime || 'video/mp4'} />
      </video>
    );
  }
  return <img src={src} alt={`Evidence for ${title}`} className="evidence-preview" />;
}
import DashboardShell from '../components/DashboardShell.jsx';
import StatusChip from '../components/StatusChip.jsx';
import MetricIcon from '../components/MetricIcon.jsx';
import TaskTable from '../components/TaskTable.jsx';
import WeeklyPlanTable from '../components/WeeklyPlanTable.jsx';
import { trackEvent } from '../utils/analytics.js';
import amazonCardImage from '../assets/giftcards/amazon.svg';
import steamCardImage from '../assets/giftcards/steam.svg';
import valorantCardImage from '../assets/giftcards/valorant.svg';
import genericCardImage from '../assets/giftcards/generic.svg';
import robloxCardImage from '../assets/giftcards/roblox.svg';
import xboxCardImage from '../assets/giftcards/xbox.svg';
import playstationCardImage from '../assets/giftcards/playstation.svg';
import nintendoCardImage from '../assets/giftcards/nintendo.svg';
import googleplayCardImage from '../assets/giftcards/googleplay.svg';
import appleCardImage from '../assets/giftcards/apple.svg';
import fortniteCardImage from '../assets/giftcards/fortnite.svg';
import minecraftCardImage from '../assets/giftcards/minecraft.svg';

const SETTINGS_KEY = 'gametime_parent_settings';
const PARENT_GAME_RULE_SUGGESTIONS = [
  { id: 'block-roblox-ios', name: 'Roblox', platform: 'iOS', status: 'Blocked' },
  { id: 'block-fortnite-windows', name: 'Fortnite', platform: 'Windows', status: 'Blocked' },
  { id: 'allow-minecraft-macos', name: 'Minecraft', platform: 'macOS', status: 'Allowed' },
  { id: 'block-brawlstars-ios', name: 'Brawl Stars', platform: 'iOS', status: 'Blocked' }
];
const PARENT_REWARD_SUGGESTIONS = [
  { id: 'reward-screen-time', title: 'Extra 20 Min Gaming Time', pointsCost: 30, pointsType: 'RP', quantityLimit: '' },
  { id: 'reward-weekend-pass', title: 'Weekend Gaming Pass', pointsCost: 80, pointsType: 'RP', quantityLimit: 1 },
  { id: 'reward-gp-boost', title: 'Bonus 15 GP', pointsCost: 25, pointsType: 'RP', quantityLimit: '' },
  { id: 'reward-giftcard-drop', title: 'Mini Giftcard Drop', pointsCost: 60, pointsType: 'GP', quantityLimit: 1 }
];

function sanitizeText(value, max = 1000) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function parseManualGiftcardCodes(input) {
  const lines = String(input || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const parts = line.split(',').map((item) => item.trim());
    const code = sanitizeText(parts[0]);
    if (!code) {
      throw new Error(`Code is missing on line ${index + 1}.`);
    }
    const pin = parts[1] ? sanitizeText(parts[1]) : undefined;
    const expiryDate = parts[2] ? sanitizeText(parts[2]) : undefined;
    return { code, pin, expiryDate };
  });
}

function pickGiftcardImage(card) {
  const normalized = `${card?.name || ''} ${card?.giftcardName || ''}`.toLowerCase();
  const remoteImage = String(card?.image || '').trim();
  if (remoteImage && !remoteImage.includes('example.com')) return remoteImage;
  if (normalized.includes('amazon')) return amazonCardImage;
  if (normalized.includes('steam')) return steamCardImage;
  if (normalized.includes('valorant')) return valorantCardImage;
  if (normalized.includes('roblox')) return robloxCardImage;
  if (normalized.includes('xbox')) return xboxCardImage;
  if (normalized.includes('playstation') || normalized.includes('ps5') || normalized.includes('ps4') || normalized.includes('psn')) return playstationCardImage;
  if (normalized.includes('nintendo') || normalized.includes('eshop') || normalized.includes('switch')) return nintendoCardImage;
  if (normalized.includes('google play') || normalized.includes('googleplay') || normalized.includes('google')) return googleplayCardImage;
  if (normalized.includes('apple') || normalized.includes('app store') || normalized.includes('itunes')) return appleCardImage;
  if (normalized.includes('fortnite') || normalized.includes('v-bucks') || normalized.includes('vbucks')) return fortniteCardImage;
  if (normalized.includes('minecraft')) return minecraftCardImage;
  return genericCardImage;
}

export default function ParentDashboard({ token, onSwitchToChild, parentName }) {
  /* ── Shell navigation ref - lets us drive DashboardShell section changes ── */
  const shellRef = useRef({});
  const navigate = useNavigate();


  const [children, setChildren] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskRequests, setTaskRequests] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [giftcardInventory, setGiftcardInventory] = useState([]);
  const [giftcardCatalog, setGiftcardCatalog] = useState([]);
  const [giftcardSkus, setGiftcardSkus] = useState([]);
  const [giftcardCatalogSource, setGiftcardCatalogSource] = useState('mock');
  const [selectedGiftcardId, setSelectedGiftcardId] = useState('');
  const [giftcardBusy, setGiftcardBusy] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [gamingSettings, setGamingSettings] = useState({ pointsUnit: 10, minutesUnit: 15, dailyCapMinutes: 90, weeklyCapMinutes: 420 });
  const [gamingGames, setGamingGames] = useState([]);
  const [gamingAudit, setGamingAudit] = useState([]);
  const [gamingOverviewByChild, setGamingOverviewByChild] = useState({});
  const [gamingReportByChild, setGamingReportByChild] = useState({});
  const [gameForm, setGameForm] = useState({ name: '', platform: 'iOS', status: 'Blocked' });
  const [rewardForm, setRewardForm] = useState({ title: '', pointsCost: 10, pointsType: 'RP', quantityLimit: '' });
  const [gpSummary, setGpSummary] = useState({ parentGpBalance: 0, children: [] });
  const [gpPurchaseForm, setGpPurchaseForm] = useState({ gpPoints: 100, moneyAmount: '', currency: 'SGD', note: '' });
  const [manualGiftcardForm, setManualGiftcardForm] = useState({
    rewardTitle: '',
    giftcardName: '',
    skuName: '',
    pointsCost: 25,
    quantityLimit: '',
    currency: 'SGD',
    purchaseReference: '',
    codesInput: ''
  });
  const [giftcardPurchaseForm, setGiftcardPurchaseForm] = useState({
    skuId: '',
    quantity: 1,
    currency: 'SGD',
    autoPublishReward: true,
    rewardTitle: '',
    pointsCost: 50,
    quantityLimit: ''
  });
  const [pointsForm, setPointsForm] = useState({ childId: '', points: 10, note: 'Manual adjustment' });
  const [decisionNotes, setDecisionNotes] = useState({});
  const [requestDecisionNotes, setRequestDecisionNotes] = useState({});
  const [reviewPanel, setReviewPanel] = useState(null); // { taskId, submissionId }
  const [leaderboard, setLeaderboard] = useState([]);
  const [txnDateFrom, setTxnDateFrom] = useState('');
  const [txnDateTo, setTxnDateTo] = useState('');
  const [showTopUp, setShowTopUp] = useState(false);
  const [undoAdjustment, setUndoAdjustment] = useState(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const [message, setMessage] = useState('');
  const [msgKind, setMsgKind] = useState('success');
  const [gamingNotice, setGamingNotice] = useState('');
  const [gamingError, setGamingError] = useState('');
  const [gamingBusy, setGamingBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stripeAmountSgd, setStripeAmountSgd] = useState(10);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [briefing, setBriefing] = useState(null); // { briefing, stats, actions }
  const [briefingActionResults, setBriefingActionResults] = useState({});
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : { defaultTaskPoints: 10, requireApprovalNotes: false };
  });

  async function executeBriefingAction(action, key) {
    try {
      if (action.method === 'GET') {
        await apiRequest(action.endpoint, { token });
      } else {
        await apiRequest(action.endpoint, { method: action.method || 'POST', token, body: action.body || {} });
      }
      setBriefingActionResults((prev) => ({ ...prev, [key]: 'done' }));
      notify(`Done: ${action.label}`);
    } catch (err) {
      notify(err.message || 'Action failed.', 'error');
    }
  }

  function applyGameRuleSuggestion(suggestion) {
    setGameForm({
      name: suggestion.name,
      platform: suggestion.platform,
      status: suggestion.status
    });
    setGamingError('');
  }

  function applyRewardSuggestion(suggestion) {
    setRewardForm({
      title: suggestion.title,
      pointsCost: suggestion.pointsCost,
      pointsType: suggestion.pointsType,
      quantityLimit: suggestion.quantityLimit
    });
  }

  function notify(text, kind = 'success') {
    setMessage(text);
    setMsgKind(kind);
  }

  async function handleStripeTopUp() {
    setStripeLoading(true);
    try {
      const { url } = await apiRequest('/stripe/checkout', {
        method: 'POST',
        token,
        body: { amountSgd: stripeAmountSgd }
      });
      window.location.href = url;
    } catch (err) {
      notify(err.message || 'Could not start payment. Please try again.', 'error');
      setStripeLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const childList = await apiRequest('/children/list', { token });
      const [taskList, taskRequestList, rewardList, notificationList, inventoryList, gpSummaryRes] = await Promise.all([
        apiRequest('/tasks/list', { token }),
        apiRequest('/tasks/requests', { token }),
        apiRequest('/rewards/list', { token }),
        apiRequest('/notifications/list', { token }),
        apiRequest('/giftcards/inventory', { token }),
        apiRequest('/giftcards/gp/summary', { token })
      ]);
      const catalogResponse = await apiRequest('/giftcards/catalog', { token }).catch(() => ({ giftcards: [], source: 'mock' }));
      const [settingsRes, gamesRes, auditRes] = await Promise.all([
        apiRequest('/gaming/settings', { token }),
        apiRequest('/gaming/games', { token }),
        apiRequest('/gaming/sessions/audit?limit=80', { token })
      ]);

      const txListsSettled = await Promise.allSettled(
        childList.map((child) => apiRequest(`/points/transactions?childId=${child.id}`, { token }))
      );
      const txLists = txListsSettled
        .flatMap((entry, idx) =>
          entry.status === 'fulfilled'
            ? entry.value.map((txn) => ({ ...txn, childId: childList[idx]?.id }))
            : []
        );

      const childOverviewsSettled = await Promise.allSettled(
        childList.map(async (child) => {
          const [overview, report] = await Promise.all([
            apiRequest(`/gaming/overview/${child.id}`, { token }),
            apiRequest(`/gaming/reports/weekly?childId=${child.id}`, { token })
          ]);
          return { childId: child.id, overview, report };
        })
      );
      const childOverviews = childOverviewsSettled
        .filter((entry) => entry.status === 'fulfilled')
        .map((entry) => entry.value);

      const leaderboardRes = await apiRequest('/children/leaderboard', { token }).catch(() => []);
      setChildren(childList);
      setLeaderboard(Array.isArray(leaderboardRes) ? leaderboardRes : []);
      setTasks(taskList);
      setTaskRequests(taskRequestList);
      setRewards(rewardList);
      setGiftcardInventory(inventoryList);
      setGiftcardCatalog(Array.isArray(catalogResponse?.giftcards) ? catalogResponse.giftcards : []);
      setGiftcardCatalogSource(catalogResponse?.source || 'mock');
      setGpSummary(gpSummaryRes);
      setNotifications(notificationList);
      setTransactions(txLists.slice(0, 100));
      setGamingSettings(settingsRes);
      setGamingGames(gamesRes);
      setGamingAudit(auditRes);
      setGamingOverviewByChild(
        childOverviews.reduce((acc, item) => ({ ...acc, [item.childId]: item.overview }), {})
      );
      setGamingReportByChild(
        childOverviews.reduce((acc, item) => ({ ...acc, [item.childId]: item.report }), {})
      );
      notify('');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Proactive AI briefing — load on mount, fail silently after 3s
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => { cancelled = true; }, 3000);
    apiRequest('/ai/family-briefing', { token })
      .then((data) => { if (!cancelled) setBriefing(data); })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [token]);

  // Detect Stripe redirect back from checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topup = params.get('topup');
    if (topup === 'success') {
      window.history.replaceState({}, '', '/parent/dashboard');
      notify('Payment successful! Your GP wallet has been topped up.', 'success');
    } else if (topup === 'cancelled') {
      window.history.replaceState({}, '', '/parent/dashboard');
      notify('Payment cancelled — no charge was made.', 'error');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (selectedGiftcardId) return;
    if (!giftcardCatalog.length) return;
    setSelectedGiftcardId(giftcardCatalog[0].id);
  }, [giftcardCatalog, selectedGiftcardId]);

  useEffect(() => {
    let cancelled = false;
    async function loadGiftcardSkus() {
      if (!selectedGiftcardId) {
        setGiftcardSkus([]);
        return;
      }
      try {
        const response = await apiRequest(`/giftcards/catalog/${selectedGiftcardId}/skus`, { token });
        if (cancelled) return;
        const nextSkus = Array.isArray(response?.skus) ? response.skus : [];
        setGiftcardSkus(nextSkus);
        setGiftcardPurchaseForm((prev) => (
          nextSkus.find((sku) => sku.sku_id === prev.skuId)
            ? prev
            : { ...prev, skuId: nextSkus[0]?.sku_id || '' }
        ));
      } catch {
        if (!cancelled) setGiftcardSkus([]);
      }
    }
    loadGiftcardSkus();
    return () => {
      cancelled = true;
    };
  }, [selectedGiftcardId, token]);

  useEffect(() => {
    if (!undoAdjustment) { setUndoSecondsLeft(0); return undefined; }
    setUndoSecondsLeft(10);
    // Tick down every second; clear the adjustment when we reach 0.
    const interval = setInterval(() => {
      setUndoSecondsLeft((s) => {
        if (s <= 1) { clearInterval(interval); setUndoAdjustment(null); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [undoAdjustment]);

  const pendingByChild = useMemo(() => {
    const pending = tasks.filter((task) => task.state === 'PendingApproval');
    const groups = {};
    for (const task of pending) {
      if (!groups[task.childName]) groups[task.childName] = [];
      groups[task.childName].push(task);
    }
    return groups;
  }, [tasks]);

  const quickStats = useMemo(
    () => ({
      totalChildren: children.length,
      pendingApprovals: tasks.filter((task) => task.state === 'PendingApproval').length,
      pendingTaskRequests: taskRequests.filter((request) => request.status === 'Pending').length,
      totalRewards: rewards.length,
      unreadNotifs: notifications.filter((n) => !n.read).length,
      blockedGames: gamingGames.filter((game) => game.status === 'Blocked').length,
      parentGpBalance: Number(gpSummary.parentGpBalance || 0)
    }),
    [children, tasks, taskRequests, rewards, notifications, gamingGames, gpSummary]
  );

  const quickStatCards = [
    { key: 'totalChildren', label: 'Children', icon: 'children' },
    { key: 'pendingApprovals', label: 'Approvals', icon: 'approvals' },
    { key: 'pendingTaskRequests', label: 'Requests', icon: 'requests' },
    { key: 'totalRewards', label: 'Rewards', icon: 'rewards' },
    { key: 'parentGpBalance', label: 'Parent GP', icon: 'gp' },
    { key: 'unreadNotifs', label: 'Unread', icon: 'unread' },
    { key: 'blockedGames', label: 'Blocked', icon: 'blocked' }
  ];

  const recentActivity = useMemo(() => {
    const notes = notifications.map((note) => ({
      id: `note-${note.id}`,
      createdAt: note.createdAt,
      kind: note.read ? 'info' : 'alert',
      title: note.read ? 'Notification' : 'New alert',
      message: note.message
    }));
    const txns = transactions.map((txn) => ({
      id: `txn-${txn.id}`,
      createdAt: txn.createdAt,
      kind: txn.type === 'Debit' ? 'spent' : 'earned',
      title: `${txn.pointsKind || 'RP'} ${txn.type}`,
      message: `${txn.points} points • ${txn.referenceType}`
    }));

    return [...notes, ...txns]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [notifications, transactions]);

  const demoReadiness = useMemo(() => ({
    hasChild: children.length > 0,
    hasBlockedGames: gamingGames.some((game) => game.status === 'Blocked'),
    hasActiveTasks: tasks.some((task) => task.state === 'Active'),
    hasPendingApproval: tasks.some((task) => task.state === 'PendingApproval')
  }), [children, gamingGames, tasks]);

  const pendingTaskRequests = useMemo(
    () => taskRequests.filter((request) => request.status === 'Pending'),
    [taskRequests]
  );

  const selectedGiftcard = useMemo(
    () => giftcardCatalog.find((item) => item.id === selectedGiftcardId) || null,
    [giftcardCatalog, selectedGiftcardId]
  );

  const selectedSku = useMemo(
    () => giftcardSkus.find((item) => item.sku_id === giftcardPurchaseForm.skuId) || null,
    [giftcardSkus, giftcardPurchaseForm.skuId]
  );

  async function applyTaskDecision(task, decision) {
    const note = sanitizeText(decisionNotes[task.id] || '');
    if (settings.requireApprovalNotes && !note) {
      notify('Approval notes are required by settings.', 'error');
      return;
    }

    const optimisticState = decision === 'approve' ? 'Approved' : 'Active';
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, state: optimisticState, parentNote: note || null } : item)));

    try {
      await apiRequest(`/tasks/${decision}`, {
        method: 'POST',
        token,
        body: { taskId: task.id, note: note || null }
      });
      notify(
        decision === 'approve'
          ? `Task approved: ${task.title}`
          : `Task sent back for retry: ${task.title}`
      );
      trackEvent('task_decision', { decision, taskId: task.id, childId: task.childId });
      await loadAll();
    } catch (error) {
      notify(error.message, 'error');
      trackEvent('task_decision_failed', { decision, taskId: task.id, error: error.message });
      await loadAll();
    }
  }

  async function applyTaskRequestDecision(request, decision) {
    const note = sanitizeText(requestDecisionNotes[request.id] || '');
    try {
      await apiRequest(`/tasks/requests/${request.id}/${decision}`, {
        method: 'POST',
        token,
        body: { note: note || null }
      });
      notify(
        decision === 'approve'
          ? `Task request approved: ${request.title}`
          : `Task request declined: ${request.title}`
      );
      trackEvent('task_request_decision', {
        requestId: request.id,
        decision,
        childId: request.childId
      });
      await loadAll();
    } catch (error) {
      notify(error.message, 'error');
      trackEvent('task_request_decision_failed', {
        requestId: request.id,
        decision,
        error: error.message
      });
    }
  }

  const sections = [
    {
      id: 'home',
      label: 'Home',
      content: ({ goToSection }) => (
        <>
          {/* Proactive AI Briefing Card */}
          {briefing && (
            <div className="briefing-card">
              <div className="briefing-header">
                <div className="briefing-avatar" aria-hidden="true">✨</div>
                <div>
                  <strong>Good morning, {parentName?.split(' ')[0] || 'there'}</strong>
                </div>
                <a href="/parent/ai" className="briefing-ask-link">Ask AI →</a>
              </div>
              <p className="briefing-text">{briefing.briefing}</p>
              {briefing.stats && (
                <div className="briefing-stats">
                  {briefing.stats.pendingApprovals != null && briefing.stats.pendingApprovals > 0 && (
                    <span className="briefing-chip briefing-chip-warn">{briefing.stats.pendingApprovals} pending approval{briefing.stats.pendingApprovals !== 1 ? 's' : ''}</span>
                  )}
                  {briefing.stats.weeklyRp != null && (
                    <span className="briefing-chip briefing-chip-info">{briefing.stats.weeklyRp} RP this week</span>
                  )}
                  {Array.isArray(briefing.stats.streakRisk) && briefing.stats.streakRisk.length > 0 && (
                    <span className="briefing-chip briefing-chip-risk">Streak risk: {briefing.stats.streakRisk.join(', ')}</span>
                  )}
                </div>
              )}
              {Array.isArray(briefing.actions) && briefing.actions.length > 0 && (
                <div className="briefing-actions">
                  {briefing.actions.map((action, i) => (
                    <button
                      key={i}
                      type="button"
                      className="ai-action-btn"
                      disabled={briefingActionResults[i] === 'done'}
                      onClick={() => executeBriefingAction(action, i)}
                    >
                      {briefingActionResults[i] === 'done' ? `✓ ${action.label}` : action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <section className="panel welcome-panel" aria-busy={loading}>
            <div className="panel-top">
              <div>
                <h2>Family Overview</h2>
                <p className="section-subtitle">Manage RP, GP, tasks, and approvals from one place.</p>
              </div>
              <div className="quick-actions">
                <button type="button" className="secondary-button" onClick={() => goToSection('tasks')}>Create Task</button>
                <button type="button" className="secondary-button" onClick={() => goToSection('giftcards')}>Add Gift Cards</button>
                <button type="button" className="secondary-button" onClick={() => goToSection('family')}>Add Child</button>
                <button type="button" className="secondary-button" onClick={() => goToSection('gaming')}>Set Game Rules</button>
              </div>
            </div>
            {message && (
              <p className={msgKind === 'error' ? 'error' : 'notice'} role={msgKind === 'error' ? 'alert' : undefined}>
                {message}
              </p>
            )}
            {loading && (
              <div className="stats-skeleton" aria-busy="true" aria-label="Loading stats">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-line short" />
                    <div className="skeleton-line medium" />
                    <div className="skeleton-line tall short" />
                  </div>
                ))}
              </div>
            )}
            {!loading && (
              <div className="stats-grid">
                {quickStatCards.map((card, index) => (
                  <div key={card.key} className={`stat-card tone-${(index % 6) + 1}`}>
                    <div className="stat-icon" aria-hidden="true"><MetricIcon name={card.icon} /></div>
                    <span className="stat-label">{card.label}</span>
                    <strong>{quickStats[card.key]}</strong>
                  </div>
                ))}
              </div>
            )}
            <h3>Demo Readiness</h3>
            <div className="checklist-grid">
              <article className={`check-card ${demoReadiness.hasChild ? 'check-ok' : 'check-pending'}`}>
                <strong>{demoReadiness.hasChild ? 'Child account ready' : 'Create first child account'}</strong>
                <p>{demoReadiness.hasChild ? 'Great start: your child account is ready.' : 'Start your journey by creating your first child account.'}</p>
              </article>
              <article className={`check-card ${demoReadiness.hasBlockedGames ? 'check-ok' : 'check-pending'}`}>
                <strong>{demoReadiness.hasBlockedGames ? 'Game controls active' : 'Add blocked game rule'}</strong>
                <p>{demoReadiness.hasBlockedGames ? 'At least one game rule is protecting playtime.' : 'Add your first blocked game rule to set healthy boundaries.'}</p>
              </article>
              <article className={`check-card ${demoReadiness.hasActiveTasks ? 'check-ok' : 'check-pending'}`}>
                <strong>{demoReadiness.hasActiveTasks ? 'Tasks ready to earn' : 'Create first active task'}</strong>
                <p>{demoReadiness.hasActiveTasks ? 'There is an active task ready to earn points.' : 'Create one active task so your child can start earning points.'}</p>
              </article>
              <article className={`check-card ${demoReadiness.hasPendingApproval ? 'check-ok' : 'check-pending'}`}>
                <strong>{demoReadiness.hasPendingApproval ? 'Approval flow active' : 'Submit first completion'}</strong>
                <p>{demoReadiness.hasPendingApproval ? 'You have a task waiting for parent approval.' : 'Submit one completed task so you can review and award points.'}</p>
              </article>
            </div>
          </section>

          <WeeklyPlanTable token={token} tasks={tasks} onRefresh={loadAll} />

          <section className="panel">
            <h2>Task Requests from Children</h2>
            {pendingTaskRequests.length === 0 ? (
              <p>No pending task requests right now.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Child</th>
                      <th>Request</th>
                      <th>Requested Points</th>
                      <th>Created</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTaskRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.childName}</td>
                        <td>
                          <strong>{request.title}</strong>
                          <p>{request.description}</p>
                        </td>
                        <td>{request.requestedPoints}</td>
                        <td>{new Date(request.createdAt).toLocaleString()}</td>
                        <td>
                          <div className="inline-form">
                            <label>
                              Note
                              <input
                                maxLength={200}
                                value={requestDecisionNotes[request.id] || ''}
                                onChange={(e) => setRequestDecisionNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                              />
                            </label>
                            <button type="button" onClick={() => applyTaskRequestDecision(request, 'approve')}>Approve</button>
                            <button type="button" onClick={() => applyTaskRequestDecision(request, 'reject')}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Approvals by Child</h2>
            {Object.keys(pendingByChild).length === 0 ? (
              <p>No tasks are waiting for approval.</p>
            ) : (
              Object.entries(pendingByChild).map(([childName, childTasks]) => (
                <article key={childName} className="panel subtle-panel">
                  <h3>{childName}</h3>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>AI Advisory</th>
                          <th>Evidence</th>
                          <th>Dispute</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childTasks.map((task) => (
                          <tr key={task.id}>
                            <td>
                              <strong>{task.title}</strong>
                              <div><StatusChip state={task.state} /></div>
                            </td>
                            <td>
                              <div className="ai-review-box" aria-live="polite">
                                {!task.aiStatus ? (
                                  <p className="ai-pending">⏳ Analysis pending…</p>
                                ) : (
                                  <>
                                    <p>
                                      <strong>{task.aiStatus === 'Unavailable' ? '⚙️ Local advisory' : '🤖 AI'}:</strong>{' '}
                                      {task.aiRecommendation || 'NeedsParentReview'}
                                      {task.aiStatus === 'Unavailable' ? <span className="ai-badge"> (no AI key)</span> : null}
                                    </p>
                                    <p><strong>Confidence:</strong> {Number.isFinite(Number(task.aiConfidence)) ? `${Math.round(Number(task.aiConfidence) * 100)}%` : 'N/A'}</p>
                                    {task.aiReason ? <p className="ai-reason"><strong>Reason:</strong> {task.aiReason}</p> : null}
                                  </>
                                )}
                              </div>
                            </td>
                            <td>
                              {task.hasEvidence && task.completionId ? (
                                <div className="evidence-box">
                                  <p><strong>Evidence:</strong> {task.evidenceType || 'File'}</p>
                                  <button
                                    type="button"
                                    className="task-review-btn"
                                    style={{ marginTop: '0.4rem' }}
                                    onClick={() => setReviewPanel({ taskId: task.id, submissionId: task.completionId })}
                                  >
                                    Review Evidence
                                  </button>
                                  {task.evidenceNote ? <p><strong>Child note:</strong> {task.evidenceNote}</p> : null}
                                </div>
                              ) : 'No evidence'}
                            </td>
                            <td>
                              {task.disputed ? <p className="dispute-note"><strong>Dispute:</strong> {task.disputeNote}</p> : 'None'}
                            </td>
                            <td>
                              <div className="inline-form">
                                <label>
                                  Approval note
                                  <input
                                    maxLength={200}
                                    value={decisionNotes[task.id] || ''}
                                    onChange={(e) => setDecisionNotes((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                  />
                                </label>
                                <button type="button" onClick={() => applyTaskDecision(task, 'approve')}>Approve</button>
                                <button type="button" onClick={() => applyTaskDecision(task, 'reject')}>Reject</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="panel activity-panel">
            <h2>Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p>No activity yet.</p>
            ) : (
              <ul className="activity-list">
                {recentActivity.map((item) => (
                  <li key={item.id} className={`activity-item ${item.kind}`}>
                    <div className="activity-copy">
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                    </div>
                    <time>{new Date(item.createdAt).toLocaleString()}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )
    },
    {
      id: 'gaming',
      label: 'Gaming',
      content: (
        <>
          <section className="panel">
            <h2>Gaming Time Rules</h2>
            {/* ── AI contextual hints ─────────────────────────────────────── */}
            {gamingNotice ? <p className="notice">{gamingNotice}</p> : null}
            {gamingError ? <p className="error" role="alert">{gamingError}</p> : null}
            <form
              className="inline-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setGamingBusy(true);
                setGamingNotice('');
                setGamingError('');
                try {
                  const payload = {
                    pointsUnit: Number(gamingSettings.pointsUnit),
                    minutesUnit: Number(gamingSettings.minutesUnit),
                    dailyCapMinutes: Number(gamingSettings.dailyCapMinutes),
                    weeklyCapMinutes: Number(gamingSettings.weeklyCapMinutes)
                  };
                  if (!Number.isInteger(payload.pointsUnit) || payload.pointsUnit < 1 || payload.pointsUnit > 200) {
                    throw new Error('Points unit must be between 1 and 200.');
                  }
                  if (!Number.isInteger(payload.minutesUnit) || payload.minutesUnit < 1 || payload.minutesUnit > 240) {
                    throw new Error('Minutes unit must be between 1 and 240.');
                  }
                  if (!Number.isInteger(payload.dailyCapMinutes) || payload.dailyCapMinutes < 15 || payload.dailyCapMinutes > 1440) {
                    throw new Error('Daily cap must be between 15 and 1440 minutes.');
                  }
                  if (!Number.isInteger(payload.weeklyCapMinutes) || payload.weeklyCapMinutes < 60 || payload.weeklyCapMinutes > 10080) {
                    throw new Error('Weekly cap must be between 60 and 10080 minutes.');
                  }
                  if (payload.weeklyCapMinutes < payload.dailyCapMinutes) {
                    throw new Error('Weekly cap must be greater than or equal to daily cap.');
                  }
                  await apiRequest('/gaming/settings', { method: 'PATCH', token, body: payload });
                  setGamingNotice('Gaming rules updated.');
                  trackEvent('gaming_settings_updated', payload);
                  await loadAll();
                } catch (error) {
                  setGamingError(error.message);
                  trackEvent('gaming_settings_update_failed', { error: error.message });
                } finally {
                  setGamingBusy(false);
                }
              }}
            >
              <label>
                Points unit
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={gamingSettings.pointsUnit}
                  onChange={(e) => setGamingSettings((prev) => ({ ...prev, pointsUnit: e.target.value }))}
                />
              </label>
              <label>
                Minutes unit
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={gamingSettings.minutesUnit}
                  onChange={(e) => setGamingSettings((prev) => ({ ...prev, minutesUnit: e.target.value }))}
                />
              </label>
              <label>
                Daily cap (minutes)
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={gamingSettings.dailyCapMinutes}
                  onChange={(e) => setGamingSettings((prev) => ({ ...prev, dailyCapMinutes: e.target.value }))}
                />
              </label>
              <label>
                Weekly cap (minutes)
                <input
                  type="number"
                  min="60"
                  max="10080"
                  value={gamingSettings.weeklyCapMinutes}
                  onChange={(e) => setGamingSettings((prev) => ({ ...prev, weeklyCapMinutes: e.target.value }))}
                />
              </label>
              <button type="submit" disabled={gamingBusy}>Save Gaming Rules</button>
            </form>
            <p>
              Conversion live: <strong>{gamingSettings.pointsUnit} points = {gamingSettings.minutesUnit} minutes</strong>
            </p>
          </section>

          <section className="panel">
            <h2>Game Access List</h2>
            <div className="task-suggestions" aria-label="Game rule suggestions">
              <p className="helper-text">Quick presets: choose a common rule and edit if needed.</p>
              <div className="suggestion-chip-row">
                {PARENT_GAME_RULE_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => applyGameRuleSuggestion(suggestion)}
                  >
                    {suggestion.name} · {suggestion.platform} · {suggestion.status}
                  </button>
                ))}
              </div>
            </div>
            <form
              className="inline-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setGamingBusy(true);
                setGamingNotice('');
                setGamingError('');
                try {
                  const name = sanitizeText(gameForm.name);
                  if (!name) throw new Error('Game name is required.');
                  if (!['Blocked', 'Allowed'].includes(gameForm.status)) {
                    throw new Error('Rule must be Blocked or Allowed.');
                  }
                  await apiRequest('/gaming/games', {
                    method: 'POST',
                    token,
                    body: {
                      name,
                      platform: gameForm.platform,
                      status: gameForm.status
                    }
                  });
                  setGameForm({ name: '', platform: 'iOS', status: 'Blocked' });
                  setGamingNotice('Game rule added.');
                  trackEvent('gaming_game_rule_added', { name, platform: gameForm.platform, status: gameForm.status });
                  await loadAll();
                } catch (error) {
                  setGamingError(error.message);
                  trackEvent('gaming_game_rule_add_failed', { error: error.message });
                } finally {
                  setGamingBusy(false);
                }
              }}
            >
              <label>
                Game name
                <input
                  maxLength={80}
                  required
                  value={gameForm.name}
                  onChange={(e) => setGameForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label>
                Platform
                <select value={gameForm.platform} onChange={(e) => setGameForm((prev) => ({ ...prev, platform: e.target.value }))}>
                  {['iOS', 'Android', 'Windows', 'macOS', 'Web', 'Console', 'Other'].map((platform) => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </label>
              <label>
                Rule
                <select value={gameForm.status} onChange={(e) => setGameForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="Blocked">Blocked</option>
                  <option value="Allowed">Allowed</option>
                </select>
              </label>
              <button type="submit" disabled={gamingBusy}>Add Game Rule</button>
            </form>
            {gamingGames.length === 0 ? <p>No game rules yet.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Platform</th>
                      <th>Rule</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gamingGames.map((game) => (
                      <tr key={game.id}>
                        <td>{game.name}</td>
                        <td>{game.platform}</td>
                        <td><StatusChip state={game.status} /></td>
                        <td className="table-actions">
                          <button
                            type="button"
                            onClick={async () => {
                              setGamingBusy(true);
                              setGamingNotice('');
                              setGamingError('');
                              try {
                                const next = game.status === 'Blocked' ? 'Allowed' : 'Blocked';
                                await apiRequest(`/gaming/games/${game.id}`, { method: 'PATCH', token, body: { status: next } });
                                setGamingNotice(`Game rule updated: ${game.name} is now ${next}.`);
                                trackEvent('gaming_game_rule_toggled', { gameId: game.id, next });
                                await loadAll();
                              } catch (error) {
                                setGamingError(error.message);
                                trackEvent('gaming_game_rule_toggle_failed', { gameId: game.id, error: error.message });
                              } finally {
                                setGamingBusy(false);
                              }
                            }}
                            disabled={gamingBusy}
                          >
                            Toggle
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setGamingBusy(true);
                              setGamingNotice('');
                              setGamingError('');
                              try {
                                await apiRequest(`/gaming/games/${game.id}`, { method: 'DELETE', token });
                                setGamingNotice(`Deleted game rule: ${game.name}.`);
                                trackEvent('gaming_game_rule_deleted', { gameId: game.id });
                                await loadAll();
                              } catch (error) {
                                setGamingError(error.message);
                                trackEvent('gaming_game_rule_delete_failed', { gameId: game.id, error: error.message });
                              } finally {
                                setGamingBusy(false);
                              }
                            }}
                            disabled={gamingBusy}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Gaming Weekly Reports</h2>
            {children.length === 0 ? <p>Add a child to view gaming reports.</p> : (
              children.map((child) => {
                const overview = gamingOverviewByChild[child.id];
                const report = gamingReportByChild[child.id];
                return (
                  <article key={child.id} className="panel subtle-panel">
                    <h3>{child.name}</h3>
                    {overview ? (
                      <p>
                        Playable now: <strong>{overview.usage.playableNow}</strong> min | Used today: {overview.usage.todayUsedMinutes} min |
                        Used this week: {overview.usage.weekUsedMinutes} min
                      </p>
                    ) : <p>Overview unavailable for this child right now.</p>}
                    {report ? (
                      <>
                        <p>
                          Weekly usage: <strong>{report.totals.totalMinutes}</strong> min ({report.totals.weeklyCapUsedPercent}% of cap)
                        </p>
                        {report.byGame.length === 0 ? <p>No recorded sessions this week.</p> : (
                          <div className="table-wrap">
                            <table className="data-table compact">
                              <thead>
                                <tr>
                                  <th>Game</th>
                                  <th>Platform</th>
                                  <th>Minutes</th>
                                  <th>Sessions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.byGame.slice(0, 5).map((item) => (
                                  <tr key={`${item.gameName}-${item.platform}`}>
                                    <td>{item.gameName}</td>
                                    <td>{item.platform}</td>
                                    <td>{item.minutes}</td>
                                    <td>{item.sessions}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    ) : <p>Weekly report unavailable for this child right now.</p>}
                  </article>
                );
              })
            )}
          </section>

          <section className="panel">
            <h2>Gaming Session Audit Log</h2>
            {gamingAudit.length === 0 ? <p>No gaming activity logged yet.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Child</th>
                      <th>Game</th>
                      <th>Platform</th>
                      <th>Status</th>
                      <th>Minutes</th>
                      <th>Reason / Code</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gamingAudit.slice(0, 80).map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.startedAt).toLocaleString()}</td>
                        <td>{entry.childName}</td>
                        <td>{entry.gameName}</td>
                        <td>{entry.platform}</td>
                        <td><StatusChip state={entry.status} /></td>
                        <td>{entry.durationMinutes || entry.grantedMinutes || 0}</td>
                        <td>{entry.denialReason || (entry.denialCode ? entry.denialCode.replaceAll('_', ' ') : '-')}</td>
                        <td>{entry.source}</td>
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
      id: 'family',
      label: 'Family',
      content: (
        <>
          <section className="panel">
            <h2>Child Accounts</h2>
            {/* ── AI contextual hints ─────────────────────────────────────── */}
            <div className="family-settings-redirect">
              <div className="family-settings-redirect-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <div className="family-settings-redirect-text">
                <strong>Manage children in Settings</strong>
                <span>Add, edit, or remove child accounts from the Settings page.</span>
              </div>
              <button
                type="button"
                className="family-settings-redirect-btn"
                onClick={() => navigate('/parent/settings?tab=children')}
              >
                Open Settings
              </button>
            </div>
            {children.length === 0 ? (
              <p>No children yet. Add the first child to start assigning tasks.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Avatar</th>
                      <th>Name</th>
                      <th>RP</th>
                      <th>GP</th>
                      <th>Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((child) => (
                      <tr key={child.id}>
                        <td>
                          <ChildAvatar
                            childId={child.id}
                            name={child.name}
                            token={token}
                            size="sm"
                            onUpload={async (file) => {
                              const reader = new FileReader();
                              const dataUri = await new Promise((res, rej) => {
                                reader.onload = () => res(reader.result);
                                reader.onerror = rej;
                                reader.readAsDataURL(file);
                              });
                              await apiRequest(`/children/${child.id}/avatar`, {
                                method: 'POST',
                                token,
                                body: { avatarData: dataUri, avatarMime: file.type },
                              });
                              notify(`${child.name}'s photo updated`);
                            }}
                          />
                        </td>
                        <td>{child.name}</td>
                        <td>{child.pointsBalance}</td>
                        <td>{child.giftcardPointsBalance ?? 0}</td>
                        <td>
                          {child.hasPasswordLogin ? 'Email enabled' : ''}
                          {child.hasPasswordLogin && child.hasPinLogin ? ' + ' : ''}
                          {child.hasPinLogin ? 'PIN enabled' : ''}
                          {!child.hasPasswordLogin && !child.hasPinLogin ? 'No child login yet' : ''}
                        </td>
                        <td className="table-actions">
                          <button type="button" onClick={() => onSwitchToChild(child.id)}>Open Child View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Leaderboard ─────────────────────────────────────────────── */}
          {leaderboard.length > 0 && (
            <section className="panel">
              <div className="leaderboard-header">
                <h2>This Week&rsquo;s Leaderboard</h2>
                <p className="section-subtitle">Ranked by total RP balance. Weekly tasks and streaks shown.</p>
              </div>
              <div className="leaderboard-list">
                {leaderboard.map((child) => (
                  <div key={child.id} className={`leaderboard-row leaderboard-rank-${Math.min(child.rank, 4)}`}>
                    <span className="leaderboard-rank">
                      {child.rank === 1 ? '🥇' : child.rank === 2 ? '🥈' : child.rank === 3 ? '🥉' : `#${child.rank}`}
                    </span>
                    <div className="leaderboard-name">{child.name}</div>
                    <div className="leaderboard-stats">
                      <span className="leaderboard-stat"><strong>{child.rpBalance}</strong> RP</span>
                      <span className="leaderboard-stat"><strong>{child.weeklyTasks}</strong> tasks this week</span>
                      {child.streak > 0 && (
                        <span className="leaderboard-stat streak-stat">🔥 {child.streak}d streak</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── RP Transaction History ───────────────────────────────────── */}
          {transactions.length > 0 && (() => {
            const fromMs = txnDateFrom ? new Date(txnDateFrom).getTime() : 0;
            const toMs   = txnDateTo   ? new Date(txnDateTo).getTime() + 86399999 : Infinity;
            const filtered = transactions.filter((txn) => {
              const t = new Date(txn.createdAt).getTime();
              return t >= fromMs && t <= toMs;
            });
            return (
              <section className="panel">
                <div className="txn-history-header">
                  <h2>RP Transaction History</h2>
                  <div className="txn-date-filter">
                    <label className="txn-date-label">
                      From
                      <input type="date" className="txn-date-input" value={txnDateFrom}
                        onChange={(e) => setTxnDateFrom(e.target.value)} />
                    </label>
                    <label className="txn-date-label">
                      To
                      <input type="date" className="txn-date-input" value={txnDateTo}
                        onChange={(e) => setTxnDateTo(e.target.value)} />
                    </label>
                    {(txnDateFrom || txnDateTo) && (
                      <button type="button" className="secondary-button"
                        onClick={() => { setTxnDateFrom(''); setTxnDateTo(''); }}>
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        const header = ['Date', 'Child', 'Kind', 'Points', 'Type', 'Reference', 'Note'];
                        const rows = filtered.map((txn) => {
                          const child = children.find((c) => c.id === txn.childId);
                          return [
                            new Date(txn.createdAt).toLocaleDateString(),
                            child?.name || '',
                            txn.pointsKind || 'RP',
                            txn.points,
                            txn.type,
                            txn.referenceType || '',
                            txn.referenceId || ''
                          ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
                        });
                        const csv = [header.join(','), ...rows].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `gametime-transactions-${new Date().toISOString().slice(0,10)}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                {filtered.length === 0 ? (
                  <p className="helper-text">No transactions in this date range.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Child</th>
                          <th>Kind</th>
                          <th>Points</th>
                          <th>Type</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(0, 50).map((txn, i) => {
                          const child = children.find((c) => c.id === txn.childId);
                          return (
                            <tr key={txn.id || i}>
                              <td>{new Date(txn.createdAt).toLocaleDateString()}</td>
                              <td>{child?.name || '—'}</td>
                              <td>{txn.pointsKind || 'RP'}</td>
                              <td className={txn.type === 'Debit' ? 'txn-debit' : 'txn-credit'}>
                                {txn.type === 'Debit' ? '-' : '+'}{txn.points}
                              </td>
                              <td>{txn.type}</td>
                              <td>{txn.referenceId || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })()}

          <section className="panel">
            <h2>Manual RP Adjustment</h2>
            <form
              className="inline-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const payload = {
                  childId: pointsForm.childId,
                  points: Number(pointsForm.points),
                  note: sanitizeText(pointsForm.note)
                };
                if (!payload.childId) {
                  notify('Select a child for points adjustment.', 'error');
                  return;
                }
                if (!Number.isInteger(payload.points) || payload.points < -1000 || payload.points > 1000 || payload.points === 0) {
                  notify('Points must be an integer between -1000 and 1000 (excluding 0).', 'error');
                  return;
                }
                if (!payload.note) {
                  notify('A reason is required for points adjustment.', 'error');
                  return;
                }

                try {
                  await apiRequest('/points/adjust', { method: 'POST', token, body: payload });
                  notify(`Points updated: ${payload.points > 0 ? '+' : ''}${payload.points}`);
                  setUndoAdjustment({
                    childId: payload.childId,
                    points: payload.points * -1,
                    note: `Undo: ${payload.note}`
                  });
                  trackEvent('points_adjusted', payload);
                  await loadAll();
                } catch (error) {
                  notify(error.message, 'error');
                  trackEvent('points_adjust_failed', { childId: payload.childId, error: error.message });
                }
              }}
            >
              <label>
                Child
                <select value={pointsForm.childId} onChange={(e) => setPointsForm({ ...pointsForm, childId: e.target.value })} required>
                  <option value="">Select child</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name} (RP {child.pointsBalance} / GP {child.giftcardPointsBalance ?? 0})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                RP
                <input type="number" min="-1000" max="1000" value={pointsForm.points} onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })} />
              </label>
              <label>
                Reason
                <input value={pointsForm.note} onChange={(e) => setPointsForm({ ...pointsForm, note: e.target.value })} />
              </label>
              <button type="submit">Adjust</button>
            </form>
            {undoAdjustment ? (
              <div className="undo-bar">
                <p>Adjustment applied. Undo available for <strong>{undoSecondsLeft}s</strong>.</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiRequest('/points/adjust', {
                        method: 'POST',
                        token,
                        body: undoAdjustment
                      });
                      notify('Points adjustment was undone.');
                      setUndoAdjustment(null);
                      trackEvent('points_adjust_undone', { childId: undoAdjustment.childId });
                      await loadAll();
                    } catch (error) {
                      notify(error.message, 'error');
                      trackEvent('points_adjust_undo_failed', { error: error.message });
                    }
                  }}
                >
                  Undo
                </button>
              </div>
            ) : null}
          </section>

          <section className="panel">
            <h2>Parent Settings</h2>
            <form className="inline-form">
              <label>
                Default task points
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={settings.defaultTaskPoints}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    const normalized = Number.isFinite(value) ? Math.min(50, Math.max(5, Math.round(value))) : 10;
                    setSettings((prev) => ({ ...prev, defaultTaskPoints: normalized }));
                  }}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.requireApprovalNotes}
                  onChange={(e) => setSettings((prev) => ({ ...prev, requireApprovalNotes: e.target.checked }))}
                />
                Require approval notes for approve/reject
              </label>
            </form>
          </section>
        </>
      )
    },
    {
      id: 'tasks',
      label: 'Tasks',
      content: (
        <TaskTable
          token={token}
          tasks={tasks}
          children={children}
          onRefresh={loadAll}
        />
      )
    },
    {
      id: 'giftcards',
      label: 'Giftcards',
      content: (
        <>
          {/* ── How it works ──────────────────────────────────────────────── */}
          <section className="panel how-it-works-panel">
            <h2>How Gift Cards Work</h2>
            <div className="steps-row">
              <div className="step-card">
                <span className="step-num">1</span>
                <strong>Buy gift cards externally</strong>
                <p>Purchase gift cards from Amazon, Steam, etc. with any payment method.</p>
              </div>
              <div className="step-card">
                <span className="step-num">2</span>
                <strong>Add the codes here</strong>
                <p>Paste codes below. They're encrypted and stored securely.</p>
              </div>
              <div className="step-card">
                <span className="step-num">3</span>
                <strong>Children redeem with GP</strong>
                <p>Set GP bonuses on tasks. Children earn GP and spend it to claim codes.</p>
              </div>
            </div>
          </section>

          {/* ── Section 1: Add gift card codes ────────────────────────────── */}
          <section className="panel">
            <h2>Add Gift Card Codes</h2>
            <p className="helper-text">
              Bought gift cards from Amazon, Steam, or anywhere else? Paste the codes below — they'll be encrypted and published as a reward your child can redeem.
            </p>
            {message && (
              <p className={msgKind === 'error' ? 'error' : 'notice'} role={msgKind === 'error' ? 'alert' : undefined}>
                {message}
              </p>
            )}
            <form
              className="gc-add-form"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  const rewardTitle = sanitizeText(manualGiftcardForm.rewardTitle);
                  const giftcardName = sanitizeText(manualGiftcardForm.giftcardName);
                  const skuName = sanitizeText(manualGiftcardForm.skuName);
                  const purchaseReference = sanitizeText(manualGiftcardForm.purchaseReference);
                  const pointsCost = Number(manualGiftcardForm.pointsCost);
                  const requestedLimit = manualGiftcardForm.quantityLimit ? Number(manualGiftcardForm.quantityLimit) : null;
                  const codes = parseManualGiftcardCodes(manualGiftcardForm.codesInput);

                  if (!rewardTitle || !giftcardName || !skuName) {
                    throw new Error('Reward name, gift card type, and value are all required.');
                  }
                  if (!Number.isInteger(pointsCost) || pointsCost < 5 || pointsCost > 1000) {
                    throw new Error('GP cost must be a whole number between 5 and 1000.');
                  }
                  if (requestedLimit !== null && (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > codes.length)) {
                    throw new Error(`Quantity limit must be between 1 and ${codes.length}.`);
                  }

                  const batch = await apiRequest('/giftcards/inventory/manual', {
                    method: 'POST',
                    token,
                    body: {
                      store: sanitizeText(giftcardName, 80) || 'Manual',
                      purchaseReference: purchaseReference || undefined,
                      giftcardName,
                      skuName,
                      currency: sanitizeText(manualGiftcardForm.currency || 'SGD', 10).toUpperCase(),
                      codes
                    }
                  });

                  await apiRequest('/giftcards/inventory/create-reward', {
                    method: 'POST',
                    token,
                    body: {
                      batchId: batch.id,
                      title: rewardTitle,
                      pointsCost,
                      quantityLimit: requestedLimit ?? codes.length,
                      active: true
                    }
                  });

                  setManualGiftcardForm({
                    rewardTitle: '',
                    giftcardName: '',
                    skuName: '',
                    pointsCost: 25,
                    quantityLimit: '',
                    currency: 'SGD',
                    purchaseReference: '',
                    codesInput: ''
                  });
                  notify(`Reward published: ${rewardTitle} (${codes.length} code${codes.length !== 1 ? 's' : ''})`);
                  trackEvent('manual_giftcard_reward_published', { rewardTitle, giftcardName, skuName, codeCount: codes.length });
                  await loadAll();
                } catch (error) {
                  notify(error.message, 'error');
                  trackEvent('manual_giftcard_reward_failed', { error: error.message });
                }
              }}
            >
              <div className="gc-form-main">
                <label>
                  Reward name <span className="field-hint">(shown to child in their rewards list)</span>
                  <input
                    maxLength={50}
                    value={manualGiftcardForm.rewardTitle}
                    onChange={(e) => setManualGiftcardForm((prev) => ({ ...prev, rewardTitle: e.target.value }))}
                    placeholder="e.g. Amazon Gift Card"
                    required
                  />
                </label>

                <div className="gc-form-row">
                  <label>
                    Gift card type
                    <input
                      maxLength={120}
                      value={manualGiftcardForm.giftcardName}
                      onChange={(e) => setManualGiftcardForm((prev) => ({ ...prev, giftcardName: e.target.value }))}
                      placeholder="e.g. Amazon SGD, Steam, Xbox"
                      required
                    />
                  </label>
                  <label>
                    Value
                    <input
                      maxLength={120}
                      value={manualGiftcardForm.skuName}
                      onChange={(e) => setManualGiftcardForm((prev) => ({ ...prev, skuName: e.target.value }))}
                      placeholder="e.g. SGD 20"
                      required
                    />
                  </label>
                  <label>
                    GP cost to redeem
                    <input
                      type="number"
                      min="5"
                      max="1000"
                      value={manualGiftcardForm.pointsCost}
                      onChange={(e) => setManualGiftcardForm((prev) => ({ ...prev, pointsCost: e.target.value }))}
                      required
                    />
                  </label>
                </div>

                <label>
                  Gift card codes <span className="field-hint">(one per line — CODE or CODE,PIN or CODE,PIN,YYYY-MM-DD)</span>
                  <textarea
                    rows={5}
                    value={manualGiftcardForm.codesInput}
                    onChange={(e) => setManualGiftcardForm((prev) => ({ ...prev, codesInput: e.target.value }))}
                    placeholder={'ABCD-1234-EFGH\nXYZW-5678-IJKL,1234\nMNOP-9012-QRST,5678,2026-12-31'}
                    required
                  />
                </label>
              </div>

              <details className="gc-optional-details">
                <summary>Optional details</summary>
                <div className="gc-form-row gc-optional-row">
                  <label>
                    Max redeemable <span className="field-hint">(default: all codes)</span>
                    <input
                      type="number"
                      min="1"
                      value={manualGiftcardForm.quantityLimit}
                      onChange={(e) => setManualGiftcardForm((prev) => ({ ...prev, quantityLimit: e.target.value }))}
                      placeholder="Leave blank to use all"
                    />
                  </label>
                  <label>
                    Currency
                    <input
                      maxLength={10}
                      value={manualGiftcardForm.currency}
                      onChange={(e) => setManualGiftcardForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                    />
                  </label>
                  <label>
                    Order reference <span className="field-hint">(e.g. Amazon order ID)</span>
                    <input
                      maxLength={120}
                      value={manualGiftcardForm.purchaseReference}
                      onChange={(e) => setManualGiftcardForm((prev) => ({ ...prev, purchaseReference: e.target.value }))}
                      placeholder="Optional — for your records"
                    />
                  </label>
                </div>
              </details>

              <button type="submit" className="primary-button">
                Save &amp; Publish Reward
              </button>
            </form>
          </section>

          {/* ── Section 2: GP wallet ───────────────────────────────────────── */}
          <section className="panel">
            <h2>GP Wallet</h2>
            <p className="helper-text">
              GP (Giftcard Points) is the currency children use to redeem gift cards. Award GP to children by adding a GP bonus when creating tasks — children earn it when the task is approved.
            </p>

            <div className="gp-balances">
              <div className="gp-balance-card gp-balance-parent">
                <span className="gp-balance-label">Your GP balance</span>
                <strong className="gp-balance-value">{Number(gpSummary.parentGpBalance || 0)} GP</strong>
              </div>
              {Array.isArray(gpSummary.children) && gpSummary.children.map((child) => (
                <div key={child.id} className="gp-balance-card">
                  <span className="gp-balance-label">{child.name}</span>
                  <strong className="gp-balance-value">{Number(child.gpBalance || 0)} GP</strong>
                </div>
              ))}
            </div>

            {/* ── GP Top-Up Wizard ── */}
            <div className="stripe-topup-block">
              <h3 className="stripe-topup-heading">Add Gaming Funds</h3>
              <p className="helper-text">Top up your children's GP wallet using our guided 3-step flow. Powered by Stripe.</p>
              <button
                type="button"
                className="btn-primary stripe-pay-btn"
                onClick={() => setShowTopUp(true)}
              >
                Add Funds →
              </button>
            </div>

            {/* ── Stripe card payment (legacy) ── */}
            <div className="stripe-topup-block">
              <h3 className="stripe-topup-heading">Quick Top Up</h3>
              <p className="helper-text">Select an amount and pay securely via Stripe. Funds appear in your GP wallet instantly after payment.</p>
              <div className="stripe-amount-buttons">
                {[5, 10, 20, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`stripe-amount-btn${stripeAmountSgd === amt ? ' stripe-amount-btn--active' : ''}`}
                    onClick={() => setStripeAmountSgd(amt)}
                  >
                    S${amt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-primary stripe-pay-btn"
                onClick={handleStripeTopUp}
                disabled={stripeLoading}
              >
                {stripeLoading ? 'Redirecting…' : `Pay S$${stripeAmountSgd} with Card`}
              </button>
              <p className="stripe-powered-note">Powered by Stripe · PCI-compliant · No card data stored</p>
            </div>

            <hr className="section-divider" />

            <form
              className="gc-gp-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const payload = {
                  gpPoints: Number(gpPurchaseForm.gpPoints),
                  moneyAmount: gpPurchaseForm.moneyAmount ? sanitizeText(gpPurchaseForm.moneyAmount, 40) : undefined,
                  currency: sanitizeText(gpPurchaseForm.currency || 'SGD', 10).toUpperCase(),
                  note: gpPurchaseForm.note ? sanitizeText(gpPurchaseForm.note, 200) : undefined
                };
                if (!Number.isInteger(payload.gpPoints) || payload.gpPoints < 1 || payload.gpPoints > 100000) {
                  notify('GP amount must be a whole number between 1 and 100,000.', 'error');
                  return;
                }
                try {
                  await apiRequest('/giftcards/gp/purchase', { method: 'POST', token, body: payload });
                  notify(`Added ${payload.gpPoints} GP to your wallet.`);
                  trackEvent('gp_purchased', { gpPoints: payload.gpPoints, currency: payload.currency });
                  setGpPurchaseForm({ gpPoints: 100, moneyAmount: '', currency: 'SGD', note: '' });
                  await loadAll();
                } catch (error) {
                  notify(error.message, 'error');
                  trackEvent('gp_purchase_failed', { error: error.message });
                }
              }}
            >
              <label>
                GP to add to your wallet
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={gpPurchaseForm.gpPoints}
                  onChange={(e) => setGpPurchaseForm((prev) => ({ ...prev, gpPoints: e.target.value }))}
                  required
                />
              </label>
              <label>
                Amount paid <span className="field-hint">(optional — for your records)</span>
                <input
                  value={gpPurchaseForm.moneyAmount}
                  onChange={(e) => setGpPurchaseForm((prev) => ({ ...prev, moneyAmount: e.target.value }))}
                  placeholder="e.g. 49.90"
                />
              </label>
              <button type="submit">Top Up GP</button>
            </form>
          </section>

          {/* ── Section 3: Inventory ───────────────────────────────────────── */}
          <section className="panel">
            <h2>Gift Card Inventory</h2>
            {giftcardInventory.length === 0 ? (
              <p>No gift cards added yet. Use the form above to add your first batch.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Gift Card</th>
                      <th>Value</th>
                      <th>Codes Left</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftcardInventory.map((batch) => {
                      const exhausted = batch.quantityAvailable === 0;
                      return (
                        <tr key={batch.id} className={exhausted ? 'row-exhausted' : undefined}>
                          <td>
                            <img
                              src={pickGiftcardImage(batch)}
                              alt=""
                              aria-hidden="true"
                              className="giftcard-row-thumb"
                            />
                            {batch.giftcardName}
                          </td>
                          <td>{batch.skuName}</td>
                          <td>
                            {batch.quantityAvailable} / {batch.quantityPurchased}
                            {exhausted && (
                              <span className="badge-exhausted" aria-label="Out of stock"> Out of stock</span>
                            )}
                          </td>
                          <td><StatusChip state={batch.status} /></td>
                        </tr>
                      );
                    })}
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
          <section className="panel">
            <h2>Create Reward</h2>
            {/* ── AI contextual hints ─────────────────────────────────────── */}
          <div className="task-suggestions" aria-label="Reward suggestions">
            <p className="helper-text">Reward templates: select one to prefill this form.</p>
            <div className="suggestion-card-grid">
              {PARENT_REWARD_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="suggestion-card"
                  onClick={() => applyRewardSuggestion(suggestion)}
                >
                  <span className="suggestion-title">{suggestion.title}</span>
                  <span className="suggestion-meta">{suggestion.pointsCost} {suggestion.pointsType}</span>
                </button>
              ))}
            </div>
          </div>
          <form
            className="inline-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const payload = {
                title: sanitizeText(rewardForm.title),
                pointsCost: Number(rewardForm.pointsCost),
                pointsType: rewardForm.pointsType,
                quantityLimit: rewardForm.quantityLimit ? Number(rewardForm.quantityLimit) : null,
                active: true
              };
              if (!payload.title) {
                notify('Reward title is required.', 'error');
                return;
              }
              if (!Number.isInteger(payload.pointsCost) || payload.pointsCost < 5 || payload.pointsCost > 1000) {
                notify('Reward points cost must be an integer between 5 and 1000.', 'error');
                return;
              }
              if (payload.quantityLimit !== null && (!Number.isInteger(payload.quantityLimit) || payload.quantityLimit < 1 || payload.quantityLimit > 1000)) {
                notify('Quantity limit must be an integer between 1 and 1000.', 'error');
                return;
              }
              try {
                await apiRequest('/rewards/create', { method: 'POST', token, body: payload });
                notify(`Reward created: ${payload.title}`);
                trackEvent('reward_created', { pointsCost: payload.pointsCost, pointsType: payload.pointsType });
                setRewardForm({ title: '', pointsCost: 10, pointsType: 'RP', quantityLimit: '' });
                await loadAll();
              } catch (error) {
                notify(error.message, 'error');
                trackEvent('reward_create_failed', { error: error.message });
              }
            }}
          >
              <label>
                Title
                <input maxLength={50} value={rewardForm.title} onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })} required />
              </label>
              <label>
                Points required
                <input type="number" min="5" max="1000" value={rewardForm.pointsCost} onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: e.target.value })} required />
              </label>
              <label>
                Balance type
                <select value={rewardForm.pointsType} onChange={(e) => setRewardForm({ ...rewardForm, pointsType: e.target.value })}>
                  <option value="RP">RP (Regular Points)</option>
                  <option value="GP">GP (Giftcard Points)</option>
                </select>
              </label>
              <label>
                Quantity limit
                <input type="number" min="1" value={rewardForm.quantityLimit} onChange={(e) => setRewardForm({ ...rewardForm, quantityLimit: e.target.value })} />
              </label>
              <button type="submit">Create Reward</button>
            </form>
          </section>

          <section className="panel">
            <h2>Reward Inventory</h2>
            {rewards.length === 0 ? <p>No rewards yet.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Cost</th>
                      <th>Stock</th>
                      <th>Type</th>
                      <th>Details</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map((reward) => (
                      <tr key={reward.id}>
                        <td>{reward.title}</td>
                        <td>{reward.pointsCost} {reward.pointsType || 'RP'}</td>
                        <td>{reward.quantityLimit ?? 'Unlimited'}</td>
                        <td>{reward.isGiftcard ? 'Giftcard' : 'Standard'}</td>
                        <td>
                          {reward.giftcard
                            ? `${reward.giftcard.name} (${reward.giftcard.sku})`
                            : '-'}
                        </td>
                        <td className="table-actions">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await apiRequest(`/rewards/${reward.id}`, { method: 'DELETE', token });
                                notify(`Reward deleted: ${reward.title}`);
                                trackEvent('reward_deleted', { rewardId: reward.id });
                                await loadAll();
                              } catch (error) {
                                notify(error.message, 'error');
                                trackEvent('reward_delete_failed', { rewardId: reward.id, error: error.message });
                              }
                            }}
                          >
                            Delete
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
  ];

  return (
    <>
      <DashboardShell
        title="Parent Dashboard"
        sections={sections}
        variant="parent"
        controlRef={shellRef}
      />
      {reviewPanel && (
        <EvidenceReviewPanel
          taskId={reviewPanel.taskId}
          submissionId={reviewPanel.submissionId}
          token={token}
          onClose={() => setReviewPanel(null)}
          onReviewed={(_decision, _taskId) => {
            setReviewPanel(null);
            loadAll();
          }}
        />
      )}
      {showTopUp && (
        <GpTopUpFlow
          children={children}
          token={token}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => {
            setShowTopUp(false);
            loadAll();
          }}
        />
      )}
    </>
  );
}
