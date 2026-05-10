import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Banner from '../../components/Banner';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import BrutalistBox from '../../components/ui/BrutalistBox';
import MobileButton from '../../components/ui/MobileButton';
import MobileInput from '../../components/ui/MobileInput';
import OneBitAsciiHeader from '../../components/ui/OneBitAsciiHeader';
import StatusLine from '../../components/ui/StatusLine';
import { ONE_BIT } from '../../components/ui/oneBitTheme';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fmtDateTime, getErrorMessage, sanitizeText } from '../../utils/format';
import { DEFAULT_PARENT_SETTINGS, loadParentSettings } from '../../utils/parentSettings';
import { normalizeTasksListResponse } from '../../utils/tasksList.js';

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
    const [childList, taskListRaw, requestList, savedSettings] = await Promise.all([
      apiRequest('/children/list', { token }),
      apiRequest('/tasks/list', { token }),
      apiRequest('/tasks/requests', { token }),
      loadParentSettings()
    ]);
    setChildren(childList);
    setTasks(normalizeTasksListResponse(taskListRaw).tasks);
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

  if (initialLoading) {
    return (
      <View style={styles.root}>
        <Spinner full />
      </View>
    );
  }

    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ONE_BIT.ink} />}
      >
        <View style={[styles.topHeader, { paddingTop: insets.top + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.topHeaderTitle}>TASK_MATRIX</Text>
            <Text style={styles.topHeaderSub}>
              {tasks.length} TOTAL // {pendingRequests.length} REQ
              {pendingRequests.length !== 1 ? 'S' : ''}_PENDING
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.headerToggle, showForm && styles.headerToggleActive]}
            onPress={() => {
              setShowForm((v) => !v);
              setError('');
              setMessage('');
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.headerToggleText, showForm && styles.headerToggleTextActive]}>
              {showForm ? 'ABORT' : 'DEPLOY'}
            </Text>
          </TouchableOpacity>
        </View>

        <Banner message={message} tone="success" />
        <Banner message={error} />

        {showForm && (
          <BrutalistBox style={styles.formCard}>
            <OneBitAsciiHeader compact title="DEPLOY MISSION" style={styles.deployHeader} />

            <Text style={styles.formLabel}>QUICK_START_TEMPLATES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
              <View style={styles.templatesRow}>
                {TASK_TEMPLATES.map((tpl) => (
                  <TouchableOpacity
                    key={tpl.title}
                    style={[styles.templateChip, form.title === tpl.title && styles.templateChipActive]}
                    onPress={() => applyTemplate(tpl)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.templateChipText, form.title === tpl.title && styles.templateChipTextActive]}>
                      {tpl.title.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.templateChipPts,
                        form.title === tpl.title && styles.templateChipPtsActive
                      ]}
                    >
                      +{tpl.points} RP
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.formLabel}>ASSIGN_TO</Text>
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
                      <Text
                        style={[
                          styles.childChipAvatarText,
                          form.childId === child.id && styles.childChipAvatarTextActive
                        ]}
                      >
                        {child.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.childChipName, form.childId === child.id && styles.childChipNameActive]}>
                      {child.name.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>MISSION_TITLE</Text>
            <MobileInput
              value={form.title}
              onChangeText={(v) => setForm({ ...form, title: v })}
              placeholder="ENTER_TITLE"
              maxLength={50}
              autoCapitalize="sentences"
            />
            <StatusLine message="FORMAT: PLAINTEXT // MAX 50" style={styles.statusBelowField} />

            <Text style={styles.fieldLabel}>TIME_REWARD (RP)</Text>
            <MobileInput
              value={form.points}
              onChangeText={(v) => setForm({ ...form, points: v })}
              placeholder="10"
              keyboardType="number-pad"
            />
            <StatusLine message="FORMAT: MM" style={styles.statusBelowField} />

            <Text style={styles.fieldLabel}>MISSION_BRIEF</Text>
            <MobileInput
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              placeholder="OBJECTIVE_DETAILS"
              maxLength={200}
              multiline
              style={styles.inputMultiline}
              textAlignVertical="top"
            />
            <StatusLine message="REQUIRED // MAX 200 CHARS" style={styles.statusBelowField} />

            <View style={styles.formRow}>
              <View style={styles.formRowHalf}>
                <Text style={styles.fieldLabel}>GP_BONUS</Text>
                <MobileInput
                  value={form.gpPoints}
                  onChangeText={(v) => setForm({ ...form, gpPoints: v })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.formRowHalf}>
                <Text style={styles.fieldLabel}>DUE_HOURS</Text>
                <MobileInput
                  value={form.dueInHours}
                  onChangeText={(v) => setForm({ ...form, dueInHours: v })}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <StatusLine message="GP: 0–1000 // DUE: 1–168 H" style={styles.statusBelowField} />
          </BrutalistBox>
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
              <Text style={styles.fieldLabel}>RESPONSE_NOTE</Text>
              <MobileInput
                value={requestNotes[req.id] || ''}
                onChangeText={(v) => setRequestNotes((prev) => ({ ...prev, [req.id]: v }))}
                maxLength={200}
                placeholder="OPTIONAL_NOTE"
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

      <View style={{ height: showForm ? spacing.xl + 72 : spacing.xl }} />
    </ScrollView>
    {showForm ? (
      <View style={[styles.formFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <MobileButton
          title={loading ? 'SYNCING…' : 'SAVE_TO_LEDGER'}
          onPress={createTask}
          disabled={loading || !form.childId || !form.title || !form.description}
        />
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: ONE_BIT.borderWidth,
    borderBottomColor: ONE_BIT.borderColor,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md
  },
  topHeaderTitle: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 18,
    color: ONE_BIT.ink,
    letterSpacing: 0.5
  },
  topHeaderSub: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 11,
    color: ONE_BIT.ink,
    opacity: 0.72,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  headerToggle: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: ONE_BIT.background
  },
  headerToggleActive: {
    backgroundColor: ONE_BIT.ink
  },
  headerToggleText: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 12,
    color: ONE_BIT.ink,
    letterSpacing: 0.5
  },
  headerToggleTextActive: {
    color: ONE_BIT.background
  },

  formFooter: {
    borderTopWidth: ONE_BIT.borderWidth,
    borderTopColor: ONE_BIT.borderColor,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    backgroundColor: '#FFFFFF'
  },

  deployHeader: { marginBottom: 4 },
  formCard: {
    padding: spacing.md,
    gap: spacing.sm
  },
  fieldLabel: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 11,
    color: ONE_BIT.ink,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4
  },
  statusBelowField: { marginTop: 4, marginBottom: 2 },
  inputMultiline: { minHeight: 88 },
  formRow: { flexDirection: 'row', gap: spacing.sm },
  formRowHalf: { flex: 1, gap: 6 },

  formLabel: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 11,
    color: ONE_BIT.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4
  },

  templatesScroll: { marginHorizontal: -spacing.md },
  templatesRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: 2 },
  templateChip: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    backgroundColor: ONE_BIT.background,
    maxWidth: 200
  },
  templateChipActive: {
    backgroundColor: ONE_BIT.ink
  },
  templateChipText: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 11,
    color: ONE_BIT.ink
  },
  templateChipTextActive: {
    color: ONE_BIT.background
  },
  templateChipPts: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    color: ONE_BIT.ink,
    opacity: 0.7
  },
  templateChipPtsActive: {
    color: ONE_BIT.background,
    opacity: 0.85
  },

  childSelectorScroll: { marginHorizontal: -spacing.md },
  childSelectorRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: 2 },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    backgroundColor: ONE_BIT.background
  },
  childChipActive: {
    backgroundColor: ONE_BIT.ink
  },
  childChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 0,
    backgroundColor: ONE_BIT.background,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  childChipAvatarActive: {
    backgroundColor: ONE_BIT.background,
    borderColor: ONE_BIT.ink
  },
  childChipAvatarText: { fontFamily: ONE_BIT.fontBold, fontSize: 14, color: ONE_BIT.ink },
  childChipAvatarTextActive: { color: ONE_BIT.ink },
  childChipName: { fontFamily: ONE_BIT.fontRegular, fontSize: 12, color: ONE_BIT.ink },
  childChipNameActive: { color: ONE_BIT.background },

  section: { gap: spacing.sm },
  sectionTitle: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 15,
    color: ONE_BIT.ink
  },
  sectionCount: { fontFamily: ONE_BIT.fontRegular, opacity: 0.7 },

  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    borderLeftWidth: 4,
    borderLeftColor: ONE_BIT.ink,
    padding: spacing.md,
    gap: spacing.sm
  },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  requestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: ONE_BIT.background,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  requestAvatarText: { fontFamily: ONE_BIT.fontBold, color: ONE_BIT.ink, fontSize: 16 },
  requestTitle: { fontFamily: ONE_BIT.fontBold, fontSize: 14, color: ONE_BIT.ink },
  requestChild: { fontFamily: ONE_BIT.fontRegular, fontSize: 11, color: ONE_BIT.ink, opacity: 0.7 },
  requestDesc: { fontFamily: ONE_BIT.fontRegular, fontSize: 12, color: ONE_BIT.ink, opacity: 0.85 },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  approveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 0,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    backgroundColor: ONE_BIT.ink,
    alignItems: 'center'
  },
  approveBtnText: { fontFamily: ONE_BIT.fontBold, color: ONE_BIT.background, fontSize: 12, letterSpacing: 0.5 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 0,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    backgroundColor: ONE_BIT.background,
    alignItems: 'center'
  },
  rejectBtnText: { fontFamily: ONE_BIT.fontBold, color: ONE_BIT.ink, fontSize: 12, letterSpacing: 0.5 },

  tabsScroll: { marginHorizontal: -spacing.md },
  tabsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingBottom: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    backgroundColor: '#FFFFFF'
  },
  tabActive: { backgroundColor: ONE_BIT.ink },
  tabText: { fontFamily: ONE_BIT.fontRegular, fontSize: 12, color: ONE_BIT.ink },
  tabTextActive: { color: ONE_BIT.background },
  tabBadge: {
    backgroundColor: ONE_BIT.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: ONE_BIT.ink
  },
  tabBadgeActive: { backgroundColor: ONE_BIT.background, borderColor: ONE_BIT.background },
  tabBadgeText: { fontFamily: ONE_BIT.fontBold, fontSize: 10, color: ONE_BIT.ink },
  tabBadgeTextActive: { color: ONE_BIT.ink },

  taskList: { gap: spacing.sm },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: 8
  },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  taskTitle: { fontFamily: ONE_BIT.fontBold, fontSize: 14, color: ONE_BIT.ink, lineHeight: 20 },
  taskChild: { fontFamily: ONE_BIT.fontRegular, fontSize: 11, color: ONE_BIT.ink, opacity: 0.7, marginTop: 2 },
  taskPoints: { alignItems: 'center', gap: 1 },
  taskPointsValue: { fontFamily: ONE_BIT.fontBold, fontSize: 18, color: ONE_BIT.ink },
  taskPointsLabel: { fontFamily: ONE_BIT.fontRegular, fontSize: 10, color: ONE_BIT.ink, opacity: 0.65 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: ONE_BIT.ink
  },
  statusPillText: { fontFamily: ONE_BIT.fontBold, fontSize: 11 },
  taskDue: { fontFamily: ONE_BIT.fontRegular, fontSize: 11, color: ONE_BIT.ink, opacity: 0.7, flex: 1 },
  taskGp: { fontFamily: ONE_BIT.fontRegular, fontSize: 12, color: ONE_BIT.ink, fontWeight: '600' },
  deleteBtn: {
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  deleteBtnText: { fontFamily: ONE_BIT.fontRegular, fontSize: 12, color: ONE_BIT.ink, fontWeight: '600' }
});
