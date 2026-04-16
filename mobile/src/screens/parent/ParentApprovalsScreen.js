import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import PageHeader from '../../components/PageHeader';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import StatusPill from '../../components/StatusPill';
import Banner from '../../components/Banner';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import { apiRequest, getApiUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fmtDateTime, getErrorMessage } from '../../utils/format';
import { DEFAULT_PARENT_SETTINGS, loadParentSettings } from '../../utils/parentSettings';

// Color-coded AI recommendation badge
function AiRecommendationBadge({ recommendation, confidence, reason, aiStatus }) {
  if (!aiStatus || aiStatus === 'Pending') {
    return (
      <View style={[aiBadgeStyles.wrap, aiBadgeStyles.pending]}>
        <Text style={aiBadgeStyles.label}>AI analysis in progress…</Text>
      </View>
    );
  }

  if (aiStatus === 'Unavailable' || aiStatus === 'Error') {
    return (
      <View style={[aiBadgeStyles.wrap, aiBadgeStyles.unavailable]}>
        <Text style={aiBadgeStyles.label}>Local advisory: {recommendation || '—'}</Text>
        {reason ? <Text style={aiBadgeStyles.reason}>{reason}</Text> : null}
      </View>
    );
  }

  const rec = recommendation || '';
  const pct = confidence != null ? Math.round(confidence * 100) : 0;
  const isApprove = rec === 'Approve';
  const isReject = rec === 'Reject';

  const badgeStyle = isApprove
    ? aiBadgeStyles.approve
    : isReject
    ? aiBadgeStyles.reject
    : aiBadgeStyles.review;

  const label = isApprove
    ? `Approve — ${pct}% confident`
    : isReject
    ? `Reject — ${pct}% confident`
    : `Needs your review — ${pct}% confident`;

  return (
    <View style={[aiBadgeStyles.wrap, badgeStyle]}>
      <Text style={aiBadgeStyles.label}>{label}</Text>
      {reason ? <Text style={aiBadgeStyles.reason}>{reason}</Text> : null}
    </View>
  );
}

const aiBadgeStyles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    padding: spacing.sm,
    gap: 3
  },
  approve: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  reject: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  review: { backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#fde047' },
  pending: { backgroundColor: colors.border + '55', borderWidth: 1, borderColor: colors.border },
  unavailable: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  reason: { fontSize: 12, color: colors.textMuted, lineHeight: 16 }
});

// Fetch evidence as a base64 data URI (React Native Image compatible)
async function fetchEvidenceDataUri(completionId, token) {
  try {
    const base = await getApiUrl();
    const response = await fetch(`${base}/tasks/evidence/${completionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return null;
    const mime = response.headers.get('Content-Type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${mime};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

function ApprovalCard({ task, token, parentSettings, decisionNote, onNoteChange, onDecide, onRefresh }) {
  const [evidenceUri, setEvidenceUri] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    if (!task.hasEvidence || !task.completionId || task.evidenceType !== 'Photo') return;
    setEvidenceLoading(true);
    fetchEvidenceDataUri(task.completionId, token).then((uri) => {
      setEvidenceUri(uri);
      setEvidenceLoading(false);
    });
  }, [task.completionId, task.hasEvidence, task.evidenceType, token]);
  function confirmDecide(action) {
    const verb = action === 'approve' ? 'Approve' : 'Reject';
    Alert.alert(
      `${verb} task?`,
      `"${task.title}" submitted by ${task.childName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: verb, style: action === 'reject' ? 'destructive' : 'default', onPress: () => onDecide(task.id, action) }
      ]
    );
  }

  return (
    <Card>
      {/* Header */}
      <View style={styles.approvalHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.childName}>{task.childName}</Text>
          <Text style={styles.taskTitle}>{task.title}</Text>
        </View>
        <StatusPill state={task.state} />
      </View>

      {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
      <Text style={styles.meta}>Submitted {fmtDateTime(task.updatedAt)}</Text>

      {/* Evidence */}
      {task.evidenceType === 'Photo' && task.hasEvidence ? (
        evidenceLoading ? (
          <View style={styles.evidenceLoadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.videoLabel}>Loading evidence…</Text>
          </View>
        ) : evidenceUri ? (
          <Image source={{ uri: evidenceUri }} style={styles.evidenceImage} resizeMode="cover" />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoLabel}>Could not load photo</Text>
          </View>
        )
      ) : task.evidenceType === 'Video' && task.hasEvidence ? (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoLabel}>Video evidence attached</Text>
        </View>
      ) : (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoLabel}>No evidence file</Text>
        </View>
      )}

      {task.evidenceNote ? (
        <View style={styles.childNoteWrap}>
          <Text style={styles.childNoteLabel}>Child's note</Text>
          <Text style={styles.childNoteText}>{task.evidenceNote}</Text>
        </View>
      ) : null}

      {/* AI Recommendation */}
      <AiRecommendationBadge
        recommendation={task.aiRecommendation}
        confidence={task.aiConfidence}
        reason={task.aiReason}
        aiStatus={task.aiStatus}
      />

      {/* Approval note */}
      <InputField
        label={`Approval note ${parentSettings.requireApprovalNotes ? '(required)' : '(optional)'}`}
        value={decisionNote}
        onChangeText={onNoteChange}
        maxLength={200}
        multiline
        style={{ minHeight: 64, textAlignVertical: 'top' }}
      />

      <View style={styles.decisionRow}>
        <Button title="Approve ✓" onPress={() => confirmDecide('approve')} style={{ flex: 1 }} />
        <Button title="Reject ✗" tone="secondary" onPress={() => confirmDecide('reject')} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

export default function ParentApprovalsScreen() {
  const { token } = useAuth();
  const [parentSettings, setParentSettings] = useState(DEFAULT_PARENT_SETTINGS);
  const [tasks, setTasks] = useState([]);
  const [decisionNotes, setDecisionNotes] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const [list, savedSettings] = await Promise.all([
        apiRequest('/tasks/list', { token }),
        loadParentSettings()
      ]);
      setTasks(list);
      setParentSettings(savedSettings);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load(true);
  }

  async function decide(taskId, action) {
    setError('');
    try {
      const latestSettings = await loadParentSettings();
      setParentSettings(latestSettings);
      const note = (decisionNotes[taskId] || '').trim();
      if (latestSettings.requireApprovalNotes && !note) {
        setError('Approval note is required by your parent settings.');
        return;
      }
      await apiRequest(`/tasks/${action}`, {
        method: 'POST',
        token,
        body: { taskId, note: note || null }
      });
      setDecisionNotes((prev) => { const next = { ...prev }; delete next[taskId]; return next; });
      await load(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  const pending = useMemo(() => tasks.filter((t) => t.state === 'PendingApproval'), [tasks]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader
        title="Approvals"
        subtitle={pending.length > 0 ? `${pending.length} task${pending.length === 1 ? '' : 's'} waiting for your review` : 'All caught up!'}
      />

      <Banner message={error} />

      {loading ? (
        <Spinner full />
      ) : pending.length === 0 ? (
        <EmptyState
          title="All caught up!"
          message="No tasks are waiting for your approval right now."
        />
      ) : (
        pending.map((task) => (
          <ApprovalCard
            key={task.id}
            task={task}
            token={token}
            parentSettings={parentSettings}
            decisionNote={decisionNotes[task.id] || ''}
            onNoteChange={(v) => setDecisionNotes((prev) => ({ ...prev, [task.id]: v }))}
            onDecide={decide}
          />
        ))
      )}

      {!loading && tasks.filter((t) => t.state !== 'PendingApproval' && t.state !== 'Active').length > 0 ? (
        <Card>
          <Text style={styles.section}>Recently decided</Text>
          {tasks
            .filter((t) => ['Approved', 'Rejected'].includes(t.state))
            .slice(0, 5)
            .map((task) => (
              <View key={task.id} style={styles.historyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{task.childName} — {task.title}</Text>
                  <Text style={styles.meta}>{fmtDateTime(task.updatedAt)}</Text>
                </View>
                <StatusPill state={task.state} />
              </View>
            ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '700', color: colors.text },

  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm
  },
  childName: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  taskTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 2 },
  description: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  meta: { fontSize: 11, color: colors.textMuted },

  evidenceImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: colors.border
  },
  evidenceLoadingWrap: {
    width: '100%',
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.border + '55',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  videoPlaceholder: {
    width: '100%',
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.border + '55',
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoLabel: { fontSize: 13, color: colors.textMuted },

  childNoteWrap: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    gap: 2
  },
  childNoteLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  childNoteText: { fontSize: 13, color: colors.text },

  decisionRow: { flexDirection: 'row', gap: spacing.sm },

  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs
  },
  historyName: { fontSize: 13, fontWeight: '600', color: colors.text },
});
