import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import InputField from '../../components/InputField';
import Spinner from '../../components/Spinner';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { fmtDateTime, getErrorMessage } from '../../utils/format';
import { normalizeTasksListResponse } from '../../utils/tasksList.js';

const STATUS_TABS = ['All', 'Active', 'Pending', 'Done'];

const TASK_ICONS = {
  Active: '▶',
  PendingApproval: '...',
  Approved: 'OK',
  Completed: 'OK',
  Rejected: 'No',
  Expired: 'Exp',
  Cancelled: 'X',
};

function stateConfig(state) {
  const s = String(state || '');
  if (s === 'Active') return { label: 'Active', color: colors.childAccent, bg: colors.childAccentLight };
  if (s === 'PendingApproval') return { label: 'Pending Review', color: colors.warning, bg: colors.warningSurface };
  if (s === 'Approved' || s === 'Completed') return { label: 'Done', color: colors.secondary, bg: colors.successSurface };
  if (s === 'Rejected') return { label: 'Rejected', color: colors.danger, bg: colors.errorSurface };
  if (s === 'Expired') return { label: 'Expired', color: colors.textMuted, bg: colors.surface2 };
  if (s === 'Cancelled') return { label: 'Cancelled', color: colors.textMuted, bg: colors.surface2 };
  return { label: s, color: colors.borderStrong, bg: colors.surface2 };
}

function matchesTab(task, tab) {
  const s = String(task.state || '');
  if (tab === 'All') return true;
  if (tab === 'Active') return s === 'Active';
  if (tab === 'Pending') return s === 'PendingApproval';
  if (tab === 'Done') return s === 'Approved' || s === 'Completed' || s === 'Rejected' || s === 'Expired' || s === 'Cancelled';
  return false;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ChildTasksScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [tasks, setTasks] = useState([]);
  const [taskRequests, setTaskRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('Active');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ title: '', description: '', requestedPoints: '10' });
  const [disputeNotes, setDisputeNotes] = useState({});
  const [expandedDispute, setExpandedDispute] = useState(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [disputeBusy, setDisputeBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const formAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const [listRaw, requests] = await Promise.all([
      apiRequest('/tasks/list', { token }),
      apiRequest('/tasks/requests', { token }),
    ]);
    setTasks(normalizeTasksListResponse(listRaw).tasks);
    setTaskRequests(requests);
  }, [token]);

  useEffect(() => {
    load()
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setInitialLoading(false));
  }, [load]);

  function showToast(msg, tone = 'success') {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  }

  function toggleRequestForm() {
    const toOpen = !showRequestForm;
    setShowRequestForm(toOpen);
    Animated.spring(formAnim, {
      toValue: toOpen ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }

  async function onRefresh() {
    setRefreshing(true);
    try { await load(); } catch (e) { setError(getErrorMessage(e)); }
    setRefreshing(false);
  }

  async function submitRequest() {
    setError('');
    const title = requestForm.title.trim();
    const description = requestForm.description.trim();
    const requestedPoints = Number(requestForm.requestedPoints);
    if (!title || !description) { setError('Title and description are required.'); return; }
    if (!Number.isInteger(requestedPoints) || requestedPoints < 5 || requestedPoints > 50) {
      setError('Requested points must be between 5 and 50.');
      return;
    }
    setRequestBusy(true);
    try {
      await apiRequest('/tasks/request', { method: 'POST', token, body: { title, description, requestedPoints } });
      setRequestForm({ title: '', description: '', requestedPoints: '10' });
      toggleRequestForm();
      await load();
      showToast('Request sent to parent!');
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setRequestBusy(false);
  }

  async function submitDispute(taskId) {
    const note = (disputeNotes[taskId] || '').trim();
    if (!note) { setError('Enter a dispute note.'); return; }
    setDisputeBusy(taskId);
    try {
      await apiRequest('/tasks/dispute', { method: 'POST', token, body: { taskId, note } });
      setDisputeNotes((prev) => ({ ...prev, [taskId]: '' }));
      setExpandedDispute(null);
      await load();
      showToast('Dispute submitted!');
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setDisputeBusy(null);
  }

  const filtered = tasks.filter((t) => matchesTab(t, activeTab));
  const tabCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab] = tasks.filter((t) => matchesTab(t, tab)).length;
    return acc;
  }, {});

  if (initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Spinner full />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>My Tasks</Text>
            <Text style={styles.headerSub}>{tasks.filter((t) => t.state === 'Active').length} active · {tasks.filter((t) => t.state === 'PendingApproval').length} in review</Text>
          </View>
          <TouchableOpacity style={styles.requestBtn} onPress={toggleRequestForm} activeOpacity={0.85}>
            <Text style={styles.requestBtnText}>{showRequestForm ? '✕ Close' : '+ Request'}</Text>
          </TouchableOpacity>
        </View>

        {/* Status Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRow}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab} {tabCounts[tab] > 0 ? `(${tabCounts[tab]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Collapsible Request Form ── */}
      <Animated.View style={[styles.formPanel, {
        maxHeight: formAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 420] }),
        opacity: formAnim,
        overflow: 'hidden',
      }]}>
        <View style={styles.formPanelInner}>
          <Text style={styles.formTitle}>Request a Task</Text>
          <Text style={styles.formSub}>Ask your parent to add a new task for you</Text>

          <InputField
            label="Task title"
            value={requestForm.title}
            onChangeText={(v) => setRequestForm((p) => ({ ...p, title: v }))}
            maxLength={50}
            placeholder="e.g. Clean the bathroom"
          />
          <InputField
            label="Description"
            value={requestForm.description}
            onChangeText={(v) => setRequestForm((p) => ({ ...p, description: v }))}
            maxLength={200}
            multiline
            style={{ minHeight: 72, textAlignVertical: 'top' }}
            placeholder="Describe what you'll do…"
          />
          <View style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>Requested RP (5–50)</Text>
            <TextInput
              style={styles.pointsInput}
              value={requestForm.requestedPoints}
              onChangeText={(v) => setRequestForm((p) => ({ ...p, requestedPoints: v }))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitRequestBtn, requestBusy && { opacity: 0.6 }]}
            onPress={submitRequest}
            disabled={requestBusy}
            activeOpacity={0.85}
          >
            <Text style={styles.submitRequestBtnText}>{requestBusy ? 'Sending…' : 'Send Request to Parent'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.childAccent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Toast ── */}
        {toast ? (
          <View style={[styles.toast, toast.tone === 'error' && styles.toastError]}>
            <Text style={styles.toastText}>{toast.msg}</Text>
          </View>
        ) : null}

        {/* ── Error Banner ── */}
        {error && !showRequestForm ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorBannerClose}>✕</Text></TouchableOpacity>
          </View>
        ) : null}

        {/* ── Task List ── */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{activeTab === 'Active' ? '—' : activeTab === 'Pending' ? '—' : '—'}</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'Active' ? 'No active tasks' : activeTab === 'Pending' ? 'None pending review' : 'Nothing here yet'}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'Active' ? 'Complete tasks to earn RP!' : 'Submit proof on active tasks to earn RP.'}
            </Text>
          </View>
        ) : (
          filtered.map((task) => {
            const cfg = stateConfig(task.state);
            const isDisputing = expandedDispute === task.id;
            return (
              <View key={task.id} style={[styles.taskCard, { borderLeftColor: cfg.color }]}>
                <View style={styles.taskTop}>
                  <View style={styles.taskMeta}>
                    <Text style={styles.taskIcon}>{TASK_ICONS[task.state] || '?'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      {task.dueDate ? (
                        <Text style={styles.taskDue}>Due {fmtDateTime(task.dueDate)}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={[styles.rpChip, { backgroundColor: cfg.bg, borderColor: cfg.color + '55' }]}>
                    <Text style={[styles.rpChipValue, { color: cfg.color }]}>{task.points}</Text>
                    <Text style={[styles.rpChipLabel, { color: cfg.color }]}>RP</Text>
                  </View>
                </View>

                {/* Status pill */}
                <View style={styles.taskPillRow}>
                  <View style={[styles.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.color + '66' }]}>
                    <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {task.gpPoints > 0 ? (
                    <View style={styles.gpPill}>
                      <Text style={styles.gpPillText}>+{task.gpPoints} GP bonus</Text>
                    </View>
                  ) : null}
                </View>

                {/* Parent note */}
                {task.parentNote ? (
                  <View style={styles.parentNoteBox}>
                    <Text style={styles.parentNoteLabel}>Parent note</Text>
                    <Text style={styles.parentNoteText}>{task.parentNote}</Text>
                  </View>
                ) : null}

                {/* Dispute submitted */}
                {task.disputed ? (
                  <View style={styles.disputeSubmittedBox}>
                    <Text style={styles.disputeSubmittedLabel}>Dispute submitted</Text>
                    <Text style={styles.disputeSubmittedText}>{task.disputeNote}</Text>
                  </View>
                ) : null}

                {/* Actions */}
                {task.state === 'Active' ? (
                  <TouchableOpacity
                    style={styles.proofBtn}
                    onPress={() => navigation.navigate('TaskProof', {
                      taskId: task.id,
                      taskTitle: task.title,
                      taskPoints: task.points,
                    })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.proofBtnText}>Submit Proof</Text>
                  </TouchableOpacity>
                ) : null}

                {task.state === 'Rejected' && !task.disputed ? (
                  <View style={styles.disputeSection}>
                    <TouchableOpacity
                      style={styles.disputeToggle}
                      onPress={() => setExpandedDispute(isDisputing ? null : task.id)}
                    >
                      <Text style={styles.disputeToggleText}>{isDisputing ? 'Hide dispute' : 'Dispute rejection'}</Text>
                    </TouchableOpacity>
                    {isDisputing ? (
                      <>
                        <TextInput
                          style={styles.disputeInput}
                          value={disputeNotes[task.id] || ''}
                          onChangeText={(v) => setDisputeNotes((p) => ({ ...p, [task.id]: v }))}
                          placeholder="Explain why you think this should be approved…"
                          placeholderTextColor={colors.textMuted}
                          multiline
                          maxLength={200}
                        />
                        <TouchableOpacity
                          style={[styles.disputeSubmitBtn, disputeBusy === task.id && { opacity: 0.6 }]}
                          onPress={() => submitDispute(task.id)}
                          disabled={disputeBusy === task.id}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.disputeSubmitBtnText}>
                            {disputeBusy === task.id ? 'Submitting…' : 'Submit Dispute'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {/* ── Request History ── */}
        {taskRequests.length > 0 ? (
          <>
            <Text style={styles.sectionHeader}>Request History</Text>
            {taskRequests.map((req) => {
              const statusColor = req.status === 'approved' ? colors.secondary : req.status === 'rejected' ? colors.danger : colors.warning;
              return (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestCardTop}>
                    <Text style={styles.requestCardTitle}>{req.title}</Text>
                    <View style={[styles.requestStatusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
                      <Text style={[styles.requestStatusText, { color: statusColor }]}>
                        {String(req.status || 'pending')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.requestCardDesc}>{req.description}</Text>
                  <Text style={styles.requestCardMeta}>Requested: {req.requestedPoints} RP</Text>
                  {req.parentNote ? (
                    <Text style={styles.requestCardNote}>Parent: "{req.parentNote}"</Text>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    backgroundColor: colors.bgRoot,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { color: '#000000', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#525252', fontSize: 13, marginTop: 2 },
  requestBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  requestBtnText: { color: '#000000', fontSize: 13, fontWeight: '700' },

  // Tabs
  tabsScroll: { marginHorizontal: -20 },
  tabsRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 14, flexDirection: 'row' },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 0,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#000000',
  },
  tabActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  tabText: { color: '#404040', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },

  // Collapsible form panel
  formPanel: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formPanelInner: { padding: 20 },
  formTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  formSub: { color: colors.textMuted, fontSize: 12, marginBottom: 14 },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pointsLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  pointsInput: {
    width: 64,
    height: 40,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  errorText: { color: colors.danger, fontSize: 13, marginBottom: 8 },
  submitRequestBtn: {
    backgroundColor: colors.childAccent,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitRequestBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Content
  content: { padding: 16, gap: 12 },

  // Toast
  toast: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  toastError: { backgroundColor: colors.danger },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorSurface,
    borderWidth: 1,
    borderColor: colors.danger + '44',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  errorBannerText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorBannerClose: { color: colors.danger, fontSize: 16, marginLeft: 8 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  // Task card
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taskMeta: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  taskIcon: { fontSize: 20, lineHeight: 24 },
  taskTitle: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  taskDue: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rpChip: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 44,
  },
  rpChipValue: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  rpChipLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Pills
  taskPillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  gpPill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.xpGold + '55',
    backgroundColor: colors.xpGoldSurface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  gpPillText: { fontSize: 12, fontWeight: '700', color: colors.xpGold },

  // Parent note
  parentNoteBox: {
    backgroundColor: colors.infoSurface,
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  parentNoteLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  parentNoteText: { color: colors.textSecondary, fontSize: 13 },

  // Dispute submitted
  disputeSubmittedBox: {
    backgroundColor: colors.warningSurface,
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  disputeSubmittedLabel: { color: colors.warning, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  disputeSubmittedText: { color: colors.textSecondary, fontSize: 13 },

  // Submit proof button
  proofBtn: {
    backgroundColor: colors.childAccentLight,
    borderWidth: 1.5,
    borderColor: colors.childAccent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  proofBtnText: { color: colors.childAccent, fontSize: 14, fontWeight: '800' },

  // Dispute section
  disputeSection: { gap: 8, marginTop: 4 },
  disputeToggle: { alignSelf: 'flex-start' },
  disputeToggleText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  disputeInput: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  disputeSubmitBtn: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  disputeSubmitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Section header
  sectionHeader: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },

  // Request history card
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  requestCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  requestCardTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  requestStatusBadge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  requestStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  requestCardDesc: { color: colors.textMuted, fontSize: 13 },
  requestCardMeta: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  requestCardNote: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic' },
});
