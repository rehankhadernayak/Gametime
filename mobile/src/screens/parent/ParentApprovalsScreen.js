import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../components/Screen';
import Banner from '../../components/Banner';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import BrutalistBox from '../../components/ui/BrutalistBox';
import MobileButton from '../../components/ui/MobileButton';
import MobileInput from '../../components/ui/MobileInput';
import OneBitAsciiHeader from '../../components/ui/OneBitAsciiHeader';
import StatusLine from '../../components/ui/StatusLine';
import { ONE_BIT } from '../../components/ui/oneBitTheme';
import { apiRequest, getApiUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { spacing } from '../../theme/spacing';
import { fmtDateTime, getErrorMessage } from '../../utils/format';
import { DEFAULT_PARENT_SETTINGS, loadParentSettings } from '../../utils/parentSettings';
import { normalizeTasksListResponse } from '../../utils/tasksList.js';

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
    borderRadius: 0,
    padding: spacing.sm,
    gap: 3,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    backgroundColor: ONE_BIT.background
  },
  approve: { borderLeftWidth: 4, borderLeftColor: ONE_BIT.ink },
  reject: { borderLeftWidth: 4, borderLeftColor: ONE_BIT.ink, opacity: 0.85 },
  review: { borderLeftWidth: 4, borderLeftColor: ONE_BIT.ink },
  pending: { opacity: 0.75 },
  unavailable: { opacity: 0.8 },
  label: { fontSize: 12, fontFamily: ONE_BIT.fontBold, color: ONE_BIT.ink },
  reason: { fontSize: 11, fontFamily: ONE_BIT.fontRegular, color: ONE_BIT.ink, opacity: 0.8, lineHeight: 16 }
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

function ApprovalCard({ task, token, parentSettings, decisionNote, onNoteChange, onDecide }) {
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
    <BrutalistBox style={styles.dossier}>
      <View style={styles.dossierHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dossierKicker}>{String(task.childName || '?').toUpperCase()}</Text>
          <Text style={styles.dossierTitle}>{task.title}</Text>
        </View>
        <View style={styles.stateStrip}>
          <Text style={styles.stateStripText}>{String(task.state || '').toUpperCase()}</Text>
        </View>
      </View>

      {task.description ? <Text style={styles.dossierBody}>{task.description}</Text> : null}
      <StatusLine message={`SUBMITTED: ${fmtDateTime(task.updatedAt)}`} style={styles.dossierMeta} />

      {task.evidenceType === 'Photo' && task.hasEvidence ? (
        evidenceLoading ? (
          <View style={styles.evidenceLoadingWrap}>
            <ActivityIndicator size="small" color={ONE_BIT.ink} />
            <Text style={styles.videoLabel}>LOADING_EVIDENCE…</Text>
          </View>
        ) : evidenceUri ? (
          <Image source={{ uri: evidenceUri }} style={styles.evidenceImage} resizeMode="cover" />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoLabel}>PHOTO_LOAD_FAILED</Text>
          </View>
        )
      ) : task.evidenceType === 'Video' && task.hasEvidence ? (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoLabel}>VIDEO_ATTACHMENT // PREVIEW_N/A</Text>
        </View>
      ) : (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoLabel}>NO_EVIDENCE_FILE</Text>
        </View>
      )}

      {task.evidenceNote ? (
        <View style={styles.childNoteWrap}>
          <Text style={styles.childNoteLabel}>FIELD_NOTE</Text>
          <Text style={styles.childNoteText}>{task.evidenceNote}</Text>
        </View>
      ) : null}

      <AiRecommendationBadge
        recommendation={task.aiRecommendation}
        confidence={task.aiConfidence}
        reason={task.aiReason}
        aiStatus={task.aiStatus}
      />

      <Text style={styles.fieldLabel}>
        APPROVAL_NOTE {parentSettings.requireApprovalNotes ? '(REQUIRED)' : '(OPTIONAL)'}
      </Text>
      <MobileInput
        value={decisionNote}
        onChangeText={onNoteChange}
        maxLength={200}
        multiline
        style={styles.noteInput}
        textAlignVertical="top"
        placeholder="ADD_NOTE"
      />

      <View style={styles.actionStack}>
        <MobileButton title="AUTHORIZE" onPress={() => confirmDecide('approve')} />
        <MobileButton title="REJECT" onPress={() => confirmDecide('reject')} />
      </View>
    </BrutalistBox>
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
      const [listRaw, savedSettings] = await Promise.all([
        apiRequest('/tasks/list', { token }),
        loadParentSettings()
      ]);
      setTasks(normalizeTasksListResponse(listRaw).tasks);
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
    <Screen
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ backgroundColor: '#FFFFFF', gap: spacing.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <OneBitAsciiHeader compact title="DOSSIER QUEUE" />
      <StatusLine
        message={
          pending.length > 0
            ? `${pending.length} PENDING // AWAITING_PARENT_CLEARANCE`
            : 'QUEUE_EMPTY // ALL_CLEAR'
        }
        style={styles.queueStrip}
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
        <BrutalistBox style={styles.historyBox}>
          <Text style={styles.section}>RECENTLY_DECIDED</Text>
          {tasks
            .filter((t) => ['Approved', 'Rejected'].includes(t.state))
            .slice(0, 5)
            .map((task) => (
              <View key={task.id} style={styles.historyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>
                    {task.childName} — {task.title}
                  </Text>
                  <Text style={styles.meta}>{fmtDateTime(task.updatedAt)}</Text>
                </View>
                <View style={styles.historyState}>
                  <Text style={styles.historyStateText}>{String(task.state).toUpperCase()}</Text>
                </View>
              </View>
            ))}
        </BrutalistBox>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  queueStrip: { marginTop: -4 },

  dossier: {
    padding: spacing.md,
    gap: spacing.sm
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm
  },
  dossierKicker: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 11,
    color: ONE_BIT.ink,
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  dossierTitle: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 16,
    color: ONE_BIT.ink,
    marginTop: 4,
    lineHeight: 22
  },
  dossierBody: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 13,
    color: ONE_BIT.ink,
    opacity: 0.85,
    lineHeight: 18
  },
  dossierMeta: { marginVertical: 2 },
  stateStrip: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: ONE_BIT.background
  },
  stateStripText: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 9,
    letterSpacing: 0.4,
    color: ONE_BIT.ink
  },

  evidenceImage: {
    width: '100%',
    height: 220,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    backgroundColor: ONE_BIT.background
  },
  evidenceLoadingWrap: {
    width: '100%',
    minHeight: 80,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  videoPlaceholder: {
    width: '100%',
    minHeight: 64,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoLabel: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 11,
    color: ONE_BIT.ink,
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },

  childNoteWrap: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    borderRadius: 0,
    padding: spacing.sm,
    gap: 4,
    backgroundColor: ONE_BIT.background
  },
  childNoteLabel: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 10,
    color: ONE_BIT.ink,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  childNoteText: { fontFamily: ONE_BIT.fontRegular, fontSize: 13, color: ONE_BIT.ink },

  fieldLabel: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 11,
    color: ONE_BIT.ink,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4
  },
  noteInput: { minHeight: 72 },

  actionStack: { gap: 10, marginTop: 4 },

  section: { fontFamily: ONE_BIT.fontBold, fontSize: 14, color: ONE_BIT.ink, marginBottom: 4 },
  historyBox: { padding: spacing.md, gap: spacing.sm },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    marginTop: spacing.xs
  },
  historyName: { fontFamily: ONE_BIT.fontBold, fontSize: 12, color: ONE_BIT.ink },
  meta: { fontFamily: ONE_BIT.fontRegular, fontSize: 10, color: ONE_BIT.ink, opacity: 0.65 },
  historyState: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  historyStateText: { fontFamily: ONE_BIT.fontBold, fontSize: 9, color: ONE_BIT.ink }
});
