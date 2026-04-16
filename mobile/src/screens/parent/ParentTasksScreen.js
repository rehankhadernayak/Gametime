import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { fmtDateTime, getErrorMessage, sanitizeText } from '../../utils/format';
import { DEFAULT_PARENT_SETTINGS, loadParentSettings } from '../../utils/parentSettings';

// Status config
const STATE_CONFIG = {
  Active:          { label: 'Active',          color: colors.primary,   bg: colors.primarySurface },
  PendingApproval: { label: 'Pending Review',  color: colors.warning,   bg: colors.warningSurface },
  Approved:        { label: 'Approved',        color: colors.secondary, bg: colors.successSurface },
  Rejected:        { label: 'Rejected',        color: colors.danger,    bg: colors.errorSurface },
  Expired:         { label: 'Expired',         color: colors.textMuted, bg: colors.surface2 },
  Cancelled:       { label: 'Cancelled',       color: colors.textMuted, bg: colors.surface2 }
};
function stateConfig(state) {
  return STATE_CONFIG[state] || { label: state, color: colors.textMuted, bg: colors.surface2 };
}

// Quick-select task templates
const TASK_TEMPLATES = [
  { icon: '', title: 'Clean bedroom',       description: 'Tidy up and vacuum the bedroom.', points: 20 },
  { icon: '', title: 'Finish homework',     description: 'Complete all assigned homework.', points: 15 },
  { icon: '', title: 'Clear the table',    description: 'Clear and wipe the dining table after dinner.', points: 10 },
  { icon: '', title: 'Water the plants',   description: 'Water all indoor plants.', points: 10 },
  { icon: '', title: 'Make the bed',       description: 'Make bed neatly every morning.', points: 5 },
  { icon: '', title: 'Read for 20 min',    description: 'Read a book for at least 20 minutes.', points: 15 }
];

const STATUS_TABS = ['All', 'Active', 'Pending', 'Done'];

const initialForm = { childId: '', title: '', description: '', points: '10', gpPoints: '0', dueInHours: '24' };

export default function ParentTasksScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [parentSettings, setParentSettings] = useState(DEFAULT_PARENT_SETTINGS);
  const [children,       setChildren]       = useState([]);
  const [tasks,          setTasks]          = useState([]);
  const [taskRequests,   setTaskRequests]   = useState([]);
  const [form,           setForm]           = useState(initialForm);
  const [requestNotes,   setRequestNotes]   = useState({});
  const [message,        setMessage]        = useState('');
  const [error,          setError]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [showForm,       setShowForm]       = useState(false);
  const [activeTab,      setActiveTab]      = useState('All');

  const load = useCallback(async () => {
    const [childList, taskList, requestList, savedSettings] = await Promise.all([
      apiRequest('/children/list', { token }),
      apiRequest('/tasks/list', { token }),
      apiRequest('/tasks/requests', { token }),
      loadParentSettings()
    ]);
    setChildren(childList);
    setTasks(taskList);
    setTaskRequests(requestList);
    setParentSettings(savedSettings);
    setForm((prev) => ({
      ...prev,
      childId: prev.childId || childList[0]?.id || '',
      points: prev.points === '10' ? String(savedSettings.defaultTaskPoints) : prev.points
    }));
    setInitialLoading(false);
  }, [token]);

  useEffect(() => {
    load().catch((e) => { setError(getErrorMessage(e)); setInitialLoading(false); });
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await load(); } catch (e) { setError(getErrorMessage(e)); }
    finally { setRefreshing(false); }
  }

  function applyTemplate(tpl) {
    setForm((prev) => ({ ...prev, title: tpl.title, description: tpl.description, points: String(tpl.points) }));
  }

  async function createTask() {
    setLoading(true); setMessage(''); setError('');
    try {
      const title       = sanitizeText(form.title);
      const description = sanitizeText(form.description);
      const points      = Number(form.points);
      const gpPoints    = Number(form.gpPoints);
      const dueHours    = Number(form.dueInHours);
      if (!form.childId) throw new Error('Select a child for this task.');
      if (!title)        throw new Error('Task title is required.');
      if (!description)  throw new Error('Task description is required.');
      if (!Number.isInteger(points)   || points  < 5  || points  > 50)  throw new Error('RP must be 5–50.');
      if (!Number.isInteger(gpPoints) || gpPoints < 0  || gpPoints > 1000) throw new Error('GP must be 0–1000.');
      if (!Number.isInteger(dueHours) || dueHours < 1  || dueHours > 168)  throw new Error('Due hours must be 1–168.');
      const dueDate = new Date(Date.now() + dueHours * 3600000).toISOString();
      await apiRequest('/tasks/create', { method: 'POST', token, body: { childId: form.childId, title, description, points, gpPoints, dueDate } });
      const childName = children.find((c) => c.id === form.childId)?.name || 'child';
      setMessage(`Task created for ${childName}!`);
      setForm((prev) => ({ ...initialForm, childId: prev.childId, points: String(parentSettings.defaultTaskPoints) }));
      setShowForm(false);
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }

  async function deleteTask(taskId) {
    setMessage(''); setError('');
    try {
      await apiRequest(`/tasks/${taskId}`, { method: 'DELETE', token });
      setMessage('Task removed.');
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
  }

  async function decideRequest(requestId, action) {
    setMessage(''); setError('');
    try {
      const note = (requestNotes[requestId] || '').trim();
      await apiRequest(`/tasks/requests/${requestId}/${action}`, { method: 'POST', token, body: { note: note || null } });
      setMessage(action === 'approve' ? 'Request approved!' : 'Request rejected.');
      setRequestNotes((prev) => ({ ...prev, [requestId]: '' }));
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
  }

  const pendingRequests = taskRequests.filter((r) => r.status === 'Pending');

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'All')     return true;
    if (activeTab === 'Active')  return t.state === 'Active';
    if (activeTab === 'Pending') return t.state === 'PendingApproval';
    if (activeTab === 'Done')    return ['Approved', 'Rejected', 'Expired', 'Cancelled'].includes(t.state);
    return true;
  });

  if (initialLoading) return <Spinner full />;

  const selectedChild = children.find((c) => c.id === form.childId);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      {/* ── Header gradient ── */}
      <LinearGradient
        colors={['#3B5BDB', '#2F4AC0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>{tasks.length} total · {pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''} pending</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => { setShowForm((v) => !v); setError(''); setMessage(''); }}
          activeOpacity={0.8}
        >
          <Text style={styles.createBtnText}>{showForm ? '✕ Cancel' : '+ Create Task'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <Banner message={message} tone="success" />
      <Banner message={error} />

      {/* ── Create task form ── */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Task</Text>

          {/* Quick templates */}
          <Text style={styles.formLabel}>Quick-start templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
            <View style={styles.templatesRow}>
              {TASK_TEMPLATES.map((tpl) => (
                <TouchableOpacity
                  key={tpl.title}
                  style={[styles.templateChip, form.title === tpl.title && styles.templateChipActive]}
                  onPress={() => applyTemplate(tpl)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.templateChipIcon}>{tpl.icon}</Text>
                  <Text style={[styles.templateChipText, form.title === tpl.title && styles.templateChipTextActive]}>
                    {tpl.title}
                  </Text>
                  <Text style={styles.templateChipPts}>+{tpl.points} RP</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Child selector */}
          <Text style={styles.formLabel}>Assign to</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSelectorScroll}>
            <View style={styles.childSelectorRow}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.childChip, form.childId === child.id && styles.childChipActive]}
                  onPress={() => setForm((p) => ({ ...p, childId: child.id }))}
                  activeOpacity={0.75}
                >
                  <View style={[styles.childChipAvatar, form.childId === child.id && styles.childChipAvatarActive]}>
                    <Text style={[styles.childChipAvatarText, form.childId === child.id && { color: '#fff' }]}>
                      {child.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.childChipName, form.childId === child.id && styles.childChipNameActive]}>
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <InputField label="Task title" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} maxLength={50} />
          <InputField label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} maxLength={200} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <InputField label="RP reward (5–50)" value={form.points} onChangeText={(v) => setForm({ ...form, points: v })} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="GP bonus (0–1000)" value={form.gpPoints} onChangeText={(v) => setForm({ ...form, gpPoints: v })} keyboardType="number-pad" />
            </View>
          </View>
          <InputField label="Due in hours (1–168)" value={form.dueInHours} onChangeText={(v) => setForm({ ...form, dueInHours: v })} keyboardType="number-pad" />

          <Button
            title={loading ? 'Creating…' : `Create Task${selectedChild ? ` for ${selectedChild.name}` : ''}`}
            onPress={createTask}
            loading={loading}
            disabled={!form.childId || !form.title || !form.description}
          />
        </View>
      )}

      {/* ── Task requests ── */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Child Requests
            <Text style={styles.sectionCount}> ({pendingRequests.length})</Text>
          </Text>
          {pendingRequests.map((req) => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestAvatar}>
                  <Text style={styles.requestAvatarText}>{(req.childName || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestTitle}>{req.title}</Text>
                  <Text style={styles.requestChild}>{req.childName} · {req.requestedPoints} RP requested</Text>
                </View>
              </View>
              {req.description ? <Text style={styles.requestDesc}>{req.description}</Text> : null}
              <InputField
                label="Response note (optional)"
                value={requestNotes[req.id] || ''}
                onChangeText={(v) => setRequestNotes((prev) => ({ ...prev, [req.id]: v }))}
                maxLength={200}
              />
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => decideRequest(req.id, 'approve')} activeOpacity={0.8}>
                  <Text style={styles.approveBtnText}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => decideRequest(req.id, 'reject')} activeOpacity={0.8}>
                  <Text style={styles.rejectBtnText}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Tasks list ── */}
      <View style={styles.section}>
        {/* Status tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabsRow}>
            {STATUS_TABS.map((tab) => {
              const count = tab === 'All' ? tasks.length :
                            tab === 'Active' ? tasks.filter((t) => t.state === 'Active').length :
                            tab === 'Pending' ? tasks.filter((t) => t.state === 'PendingApproval').length :
                            tasks.filter((t) => ['Approved','Rejected','Expired','Cancelled'].includes(t.state)).length;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                  {count > 0 && (
                    <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {filteredTasks.length === 0 ? (
          <EmptyState title="No tasks" message="Create a task to get started." />
        ) : (
          <View style={styles.taskList}>
            {filteredTasks.map((task) => {
              const cfg = stateConfig(task.state);
              const canDelete = ['Active', 'Draft', 'PendingApproval'].includes(task.state);
              return (
                <View key={task.id} style={[styles.taskCard, { borderLeftColor: cfg.color }]}>
                  <View style={styles.taskTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                      <Text style={styles.taskChild}>{task.childName}</Text>
                    </View>
                    <View style={styles.taskPoints}>
                      <Text style={[styles.taskPointsValue, { color: cfg.color }]}>+{task.points}</Text>
                      <Text style={styles.taskPointsLabel}>RP</Text>
                    </View>
                  </View>
                  <View style={styles.taskMeta}>
                    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.taskDue}>Due {fmtDateTime(task.dueDate)}</Text>
                  </View>
                  {task.gpPoints > 0 && (
                    <Text style={styles.taskGp}>+{task.gpPoints} GP bonus</Text>
                  )}
                  {canDelete && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteTask(task.id)} activeOpacity={0.75}>
                      <Text style={styles.deleteBtnText}>Cancel task</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  createBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Form ──
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  formTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  formLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  formRow: { flexDirection: 'row', gap: spacing.sm },

  // ── Templates ──
  templatesScroll: { marginHorizontal: -spacing.md },
  templatesRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: 2 },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  templateChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  templateChipIcon: { fontSize: 16 },
  templateChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  templateChipTextActive: { color: colors.primary },
  templateChipPts: { fontSize: 11, color: colors.textMuted },

  // ── Child selector ──
  childSelectorScroll: { marginHorizontal: -spacing.md },
  childSelectorRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: 2 },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  childChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  childChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  childChipAvatarActive: { backgroundColor: colors.primary },
  childChipAvatarText: { fontWeight: '800', fontSize: 14, color: colors.textMuted },
  childChipName: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  childChipNameActive: { color: colors.primary },

  // ── Section ──
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionCount: { fontWeight: '600', color: colors.textMuted },

  // ── Request card ──
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    gap: spacing.sm
  },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  requestAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.warningSurface,
    alignItems: 'center', justifyContent: 'center'
  },
  requestAvatarText: { fontWeight: '800', color: colors.warning, fontSize: 16 },
  requestTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  requestChild: { fontSize: 12, color: colors.textMuted },
  requestDesc: { fontSize: 13, color: colors.textSecondary },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  approveBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.secondary, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.danger, alignItems: 'center' },
  rejectBtnText: { color: colors.danger, fontWeight: '700', fontSize: 14 },

  // ── Status tabs ──
  tabsScroll: { marginHorizontal: -spacing.md },
  tabsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingBottom: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  tabBadge: { backgroundColor: colors.surface2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full },
  tabBadgeActive: { backgroundColor: colors.primary + '30' },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  tabBadgeTextActive: { color: colors.primary },

  // ── Task cards ──
  taskList: { gap: spacing.sm },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  taskTitle: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 20 },
  taskChild: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  taskPoints: { alignItems: 'center', gap: 1 },
  taskPointsValue: { fontSize: 18, fontWeight: '900' },
  taskPointsLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  taskDue: { fontSize: 12, color: colors.textMuted, flex: 1 },
  taskGp: { fontSize: 12, color: colors.xpGold, fontWeight: '600' },
  deleteBtn: { paddingVertical: 7, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' }
});
