import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Banner from '../../components/Banner';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { getErrorMessage } from '../../utils/format';

// ── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, accent, badge }) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: accent }]}>
      {badge ? (
        <View style={[styles.metricBadge, { backgroundColor: accent + '20' }]}>
          <Text style={[styles.metricBadgeText, { color: accent }]}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.metricValue}>{value ?? '—'}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ── Pending approval row ─────────────────────────────────────────────────────
function ApprovalRow({ task, children, onReview }) {
  const child = children.find((c) => c.id === task.childId);
  const verdictColor =
    task.aiRecommendation === 'Approve' ? colors.secondary :
    task.aiRecommendation === 'Reject'  ? colors.danger :
    colors.warning;
  const verdictLabel =
    task.aiRecommendation === 'Approve' ? '✓ Approve' :
    task.aiRecommendation === 'Reject'  ? '✗ Reject' :
    'Review';

  return (
    <TouchableOpacity style={styles.approvalRow} onPress={onReview} activeOpacity={0.75}>
      <View style={styles.approvalAvatar}>
        <Text style={styles.approvalAvatarText}>
          {child?.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.approvalInfo}>
        <Text style={styles.approvalTitle} numberOfLines={1}>{task.title}</Text>
        <Text style={styles.approvalChild}>{child?.name || 'Child'}</Text>
      </View>
      <View style={[styles.approvalVerdict, { backgroundColor: verdictColor + '18', borderColor: verdictColor + '40' }]}>
        <Text style={[styles.approvalVerdictText, { color: verdictColor }]}>{verdictLabel}</Text>
      </View>
      <Text style={styles.approvalPoints}>+{task.points} RP</Text>
    </TouchableOpacity>
  );
}

// ── Child progress card ──────────────────────────────────────────────────────
function ChildCard({ child, tasks, onSwitchToChild }) {
  const pending  = tasks.filter((t) => t.childId === child.id && t.state === 'PendingApproval').length;
  const active   = tasks.filter((t) => t.childId === child.id && t.state === 'Active').length;
  const initial  = child.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={styles.childCard}>
      <View style={styles.childCardHeader}>
        <View style={styles.childAvatar}>
          <Text style={styles.childAvatarText}>{initial}</Text>
        </View>
        <View style={styles.childCardInfo}>
          <Text style={styles.childCardName}>{child.name}</Text>
          <View style={styles.childBadgeRow}>
            {pending > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pending} pending</Text>
              </View>
            )}
            {active > 0 && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{active} active</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.childBalanceRow}>
        <View style={styles.childBalance}>
          <Text style={styles.childBalanceValue}>{child.pointsBalance ?? 0}</Text>
          <Text style={styles.childBalanceLabel}>RP</Text>
        </View>
        <View style={[styles.childBalance, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.sm }]}>
          <Text style={[styles.childBalanceValue, { color: colors.xpGold }]}>{child.giftcardPointsBalance ?? 0}</Text>
          <Text style={styles.childBalanceLabel}>GP</Text>
        </View>
        {(child.currentStreakDays ?? child.streak ?? 0) > 0 && (
          <View style={styles.streakPill}>
            <Text style={styles.streakPillText}>{child.currentStreakDays ?? child.streak}d streak</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.childViewBtn}
        onPress={() => onSwitchToChild && onSwitchToChild(child.id)}
        activeOpacity={0.75}
      >
        <Text style={styles.childViewBtnText}>Open Child View →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Activity item ────────────────────────────────────────────────────────────
function ActivityItem({ icon, text, time }) {
  return (
    <View style={styles.activityItem}>
      <Text style={styles.activityIcon}>{icon}</Text>
      <Text style={styles.activityText} numberOfLines={2}>{text}</Text>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  );
}

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins   = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function ParentHomeScreen() {
  const { token, user, loginWithToken } = useAuth();
  const navigation = useNavigation();
  const [children, setChildren]           = useState([]);
  const [tasks, setTasks]                 = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [parentGpBalance, setParentGpBalance] = useState(0);
  const [insights, setInsights]           = useState(null);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [childList, taskList, notificationList, gpSummary] = await Promise.all([
        apiRequest('/children/list', { token }),
        apiRequest('/tasks/list', { token }),
        apiRequest('/notifications/list', { token }),
        apiRequest('/giftcards/gp/summary', { token }).catch(() => ({ parentGpBalance: 0, children: [] }))
      ]);

      const [reports, sessions, insightsData] = await Promise.all([
        Promise.all(
          childList.map((c) =>
            apiRequest(`/gaming/reports/weekly?childId=${c.id}`, { token }).catch(() => ({ totals: { totalMinutes: 0 } }))
          )
        ),
        apiRequest('/gaming/sessions/audit?limit=20', { token }).catch(() => []),
        apiRequest('/ai/parent/insights', { token }).catch(() => null),
      ]);

      setChildren(childList);
      setTasks(taskList);
      setNotifications(notificationList);
      setActiveSessions(Array.isArray(sessions) ? sessions.filter((s) => s.status === 'Started') : []);
      setWeeklyMinutes(reports.reduce((sum, r) => sum + (r?.totals?.totalMinutes || 0), 0));
      setParentGpBalance(Number(gpSummary.parentGpBalance || 0));
      setInsights(insightsData);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.state === 'PendingApproval').slice(0, 5),
    [tasks]
  );

  const recentActivity = useMemo(() => {
    return notifications
      .slice(0, 6)
      .map((n) => ({
        id: n.id,
        icon: n.type === 'task_submitted'       ? 'Sub' :
              n.type === 'task_approved'         ? 'OK'  :
              n.type === 'reward_redeemed'       ? 'Rwd' :
              n.type === 'achievement_unlocked'  ? 'Ach' :
              'i',
        text: n.message,
        time: timeAgo(n.createdAt)
      }));
  }, [notifications]);

  async function switchToChild(childId) {
    try {
      const data = await apiRequest('/auth/child-login', { method: 'POST', token, body: { childId } });
      await loginWithToken(data.token);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  if (loading && !refreshing) {
    return <Spinner full />;
  }

  const firstName = user?.name?.split(' ')[0] || 'Parent';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
    >
      {/* ── Header gradient ── */}
      <LinearGradient
        colors={['#3B5BDB', '#2F4AC0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerGreeting}>Good day, {firstName}!</Text>
            <Text style={styles.headerSub}>Here's your family overview</Text>
          </View>
          <TouchableOpacity
            style={styles.aiBubble}
            onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentAiTab' })}
            activeOpacity={0.8}
          >
            <Text style={styles.aiBubbleIcon}>AI</Text>
            <Text style={styles.aiBubbleLabel}>AI</Text>
          </TouchableOpacity>
        </View>

        {/* Metric row inside gradient */}
        <View style={styles.metricsRow}>
          <View style={styles.metricInline}>
            <Text style={styles.metricInlineValue}>{pendingTasks.length}</Text>
            <Text style={styles.metricInlineLabel}>Pending</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricInline}>
            <Text style={styles.metricInlineValue}>{children.length}</Text>
            <Text style={styles.metricInlineLabel}>Children</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricInline}>
            <Text style={styles.metricInlineValue}>{weeklyMinutes}m</Text>
            <Text style={styles.metricInlineLabel}>Gaming Wk</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricInline}>
            <Text style={[styles.metricInlineValue, { color: '#FCD34D' }]}>{parentGpBalance} GP</Text>
            <Text style={styles.metricInlineLabel}>Wallet</Text>
          </View>
        </View>
      </LinearGradient>

      {error ? <Banner message={error} style={{ margin: spacing.md }} /> : null}

      {/* ── Active gaming session banner ── */}
      {activeSessions.length > 0 && (
        <View style={styles.sessionBanner}>
          <Text style={styles.sessionBannerIcon}>Live</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sessionBannerTitle}>Gaming session active</Text>
            <Text style={styles.sessionBannerDesc}>
              {activeSessions.length} child{activeSessions.length > 1 ? 'ren' : ''} currently gaming
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sessionBannerBtn}
            onPress={() => navigation.navigate('ParentGaming')}
          >
            <Text style={styles.sessionBannerBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Pending approvals ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Needs Your Review</Text>
            {pendingTasks.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pendingTasks.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentApprovals' })}>
            <Text style={styles.sectionLink}>View all →</Text>
          </TouchableOpacity>
        </View>

        {pendingTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>All clear</Text>
            <Text style={styles.emptyText}>All caught up! No tasks waiting for review.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {pendingTasks.map((task, idx) => (
              <View key={task.id}>
                {idx > 0 && <View style={styles.rowDivider} />}
                <ApprovalRow
                  task={task}
                  children={children}
                  onReview={() => navigation.navigate('ParentTabs', { screen: 'ParentApprovals' })}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Children ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Children</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentChildren' })}>
            <Text style={styles.sectionLink}>Manage →</Text>
          </TouchableOpacity>
        </View>

        {children.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>—</Text>
            <Text style={styles.emptyText}>Add a child to get started.</Text>
          </View>
        ) : (
          <View style={styles.childrenGrid}>
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                tasks={tasks}
                onSwitchToChild={switchToChild}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Recent activity ── */}
      {recentActivity.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.card}>
            {recentActivity.map((item, idx) => (
              <View key={item.id || idx}>
                {idx > 0 && <View style={styles.rowDivider} />}
                <ActivityItem icon={item.icon} text={item.text} time={item.time} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── AI Insights ── */}
      {insights?.narrative ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Family Insights</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentAiTab' })}>
              <Text style={styles.sectionLink}>Ask AI →</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.card, styles.insightsCard]}>
            <Text style={styles.insightsText}>{insights.narrative}</Text>
          </View>
        </View>
      ) : null}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 0 },

  // ── Header gradient ──
  headerGradient: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  aiBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full
  },
  aiBubbleIcon: { fontSize: 16 },
  aiBubbleLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },

  metricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm
  },
  metricInline: { flex: 1, alignItems: 'center', gap: 2 },
  metricInlineValue: { fontSize: 17, fontWeight: '800', color: '#fff' },
  metricInlineLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  metricDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  // ── Session banner ──
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.sm
  },
  sessionBannerIcon: { fontSize: 22 },
  sessionBannerTitle: { fontWeight: '700', color: '#92400E', fontSize: 14 },
  sessionBannerDesc: { color: '#B45309', fontSize: 12, marginTop: 1 },
  sessionBannerBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md
  },
  sessionBannerBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Section ──
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  countBadge: {
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1
  },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2
  },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },

  // ── Approval row ──
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm
  },
  approvalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  approvalAvatarText: { fontWeight: '800', color: colors.primary, fontSize: 16 },
  approvalInfo: { flex: 1, gap: 2 },
  approvalTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  approvalChild: { fontSize: 12, color: colors.textMuted },
  approvalVerdict: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  approvalVerdictText: { fontSize: 11, fontWeight: '700' },
  approvalPoints: { fontSize: 13, fontWeight: '800', color: colors.primary, flexShrink: 0 },

  // ── Children grid ──
  childrenGrid: { gap: spacing.sm },
  childCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  childCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.childAccentLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  childAvatarText: { fontWeight: '900', color: colors.childAccent, fontSize: 20 },
  childCardInfo: { flex: 1, gap: 4 },
  childCardName: { fontSize: 16, fontWeight: '800', color: colors.text },
  childBadgeRow: { flexDirection: 'row', gap: 6 },
  pendingBadge: {
    backgroundColor: colors.warningSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full
  },
  pendingBadgeText: { fontSize: 11, color: colors.warning, fontWeight: '700' },
  activeBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full
  },
  activeBadgeText: { fontSize: 11, color: colors.primary, fontWeight: '700' },

  childBalanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  childBalance: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  childBalanceValue: { fontSize: 20, fontWeight: '900', color: colors.text },
  childBalanceLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  streakPill: {
    marginLeft: 'auto',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  streakPillText: { fontSize: 12, color: '#B45309', fontWeight: '700' },

  childViewBtn: {
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center'
  },
  childViewBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  // ── Activity ──
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm
  },
  activityIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  activityText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  activityTime: { fontSize: 12, color: colors.textMuted },

  // ── Empty state ──
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  // ── Insights ──
  insightsCard: {
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  insightsText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // ── Legacy metric cards (kept for backward compat) ──
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: spacing.sm,
    gap: 4
  },
  metricBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  metricBadgeText: { fontSize: 11, fontWeight: '700' },
  metricValue: { fontSize: 28, fontWeight: '900', color: colors.text },
  metricLabel: { fontSize: 12, color: colors.textMuted }
});
