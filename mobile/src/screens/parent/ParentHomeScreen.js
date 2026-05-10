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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Banner from '../../components/Banner';
import Spinner from '../../components/Spinner';
import BrutalistBox from '../../components/ui/BrutalistBox';
import BrutalistHeader from '../../components/ui/BrutalistHeader';
import MobileButton from '../../components/ui/MobileButton';
import OneBitAsciiHeader from '../../components/ui/OneBitAsciiHeader';
import StatusLine from '../../components/ui/StatusLine';
import { ONE_BIT } from '../../components/ui/oneBitTheme';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { getErrorMessage } from '../../utils/format';
import { normalizeTasksListResponse } from '../../utils/tasksList.js';
import { childTelemetry } from '../../utils/oneBitTelemetry.js';

// ── Pending approval row ─────────────────────────────────────────────────────
function ApprovalRow({ task, children, onReview }) {
  const child = children.find((c) => c.id === task.childId);
  const verdictColor =
    task.aiRecommendation === 'Approve'
      ? colors.secondary
      : task.aiRecommendation === 'Reject'
        ? colors.danger
        : colors.warning;
  const verdictLabel =
    task.aiRecommendation === 'Approve'
      ? 'APPROVE'
      : task.aiRecommendation === 'Reject'
        ? 'REJECT'
        : 'REVIEW';

  return (
    <TouchableOpacity style={styles.approvalRow} onPress={onReview} activeOpacity={0.75}>
      <View style={styles.approvalAvatar}>
        <Text style={styles.approvalAvatarText}>
          {child?.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.approvalInfo}>
        <Text style={styles.approvalTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={styles.approvalChild}>{child?.name || 'CHILD'}</Text>
      </View>
      <View style={[styles.approvalVerdict, { borderColor: verdictColor }]}>
        <Text style={[styles.approvalVerdictText, { color: verdictColor }]}>{verdictLabel}</Text>
      </View>
      <Text style={styles.approvalPoints}>+{task.points} RP</Text>
    </TouchableOpacity>
  );
}

// ── Child profile (BrutalistBox + StatusLine telemetry) ───────────────────────
function ChildCard({ child, tasks, activeSessions, onSwitchToChild, onOpenDetail }) {
  const pending = tasks.filter((t) => t.childId === child.id && t.state === 'PendingApproval').length;
  const active = tasks.filter((t) => t.childId === child.id && t.state === 'Active').length;
  const initial = child.name?.charAt(0)?.toUpperCase() || '?';
  const tel = childTelemetry(child.id, tasks, activeSessions, child.createdAt);

  return (
    <BrutalistBox style={styles.brutalChildBox}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenDetail(child)}>
        <View style={styles.childCardHeader}>
          <View style={styles.childAvatar}>
            <Text style={styles.childAvatarText}>{initial}</Text>
          </View>
          <View style={styles.childCardInfo}>
            <Text style={styles.childCardName}>{child.name}</Text>
            <StatusLine status={tel.status} lastSync={tel.lastSync} />
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.childBadgeRow}>
        {pending > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pending} PENDING</Text>
          </View>
        )}
        {active > 0 && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{active} ACTIVE</Text>
          </View>
        )}
      </View>
      <View style={styles.childBalanceRow}>
        <View style={styles.childBalance}>
          <Text style={styles.childBalanceValue}>{child.pointsBalance ?? 0}</Text>
          <Text style={styles.childBalanceLabel}>RP</Text>
        </View>
        <View style={styles.childBalanceGap}>
          <Text style={[styles.childBalanceValue, { color: ONE_BIT.ink }]}>{child.giftcardPointsBalance ?? 0}</Text>
          <Text style={styles.childBalanceLabel}>GP</Text>
        </View>
        {(child.currentStreakDays ?? child.streak ?? 0) > 0 && (
          <View style={styles.streakPill}>
            <Text style={styles.streakPillText}>{child.currentStreakDays ?? child.streak}D_STREAK</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.childViewBtn}
        onPress={() => onSwitchToChild && onSwitchToChild(child.id)}
        activeOpacity={0.75}
      >
        <Text style={styles.childViewBtnText}>OPEN_CHILD_VIEW</Text>
      </TouchableOpacity>
    </BrutalistBox>
  );
}

// ── Activity item ────────────────────────────────────────────────────────────
function ActivityItem({ icon, text, time }) {
  return (
    <View style={styles.activityItem}>
      <Text style={styles.activityIcon}>{icon}</Text>
      <Text style={styles.activityText} numberOfLines={2}>
        {text}
      </Text>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  );
}

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ParentHomeScreen() {
  const { token, user, loginWithToken } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [parentGpBalance, setParentGpBalance] = useState(0);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      setError('');
      try {
        const [childList, taskListRaw, notificationList, gpSummary] = await Promise.all([
          apiRequest('/children/list', { token }),
          apiRequest('/tasks/list', { token }),
          apiRequest('/notifications/list', { token }),
          apiRequest('/giftcards/gp/summary', { token }).catch(() => ({ parentGpBalance: 0, children: [] }))
        ]);

        const [reports, sessions, insightsData] = await Promise.all([
          Promise.all(
            childList.map((c) =>
              apiRequest(`/gaming/reports/weekly?childId=${c.id}`, { token }).catch(() => ({
                totals: { totalMinutes: 0 }
              }))
            )
          ),
          apiRequest('/gaming/sessions/audit?limit=20', { token }).catch(() => []),
          apiRequest('/ai/parent/insights', { token }).catch(() => null)
        ]);

        setChildren(childList);
        setTasks(normalizeTasksListResponse(taskListRaw).tasks);
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
    },
    [token]
  );

  useEffect(() => {
    load();
  }, [load]);

  const pendingTasks = useMemo(() => tasks.filter((t) => t.state === 'PendingApproval').slice(0, 5), [tasks]);

  const recentActivity = useMemo(() => {
    return notifications.slice(0, 6).map((n) => ({
      id: n.id,
      icon:
        n.type === 'task_submitted'
          ? 'SUB'
          : n.type === 'task_approved'
            ? 'OK'
            : n.type === 'reward_redeemed'
              ? 'RWD'
              : n.type === 'achievement_unlocked'
                ? 'ACH'
                : '·',
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

  const firstName = user?.name?.split(' ')[0] || 'PARENT';
  const fabBottom = insets.bottom + 16;
  const scrollBottomPad = fabBottom + 64;

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        testID="parent-dashboard-screen"
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ONE_BIT.ink} />
        }
      >
        <View style={[styles.hero, { paddingTop: spacing.sm }]}>
          <OneBitAsciiHeader title={`${firstName.toUpperCase()}_CLUSTER`} />
          <Text style={styles.heroSub}>OPERATOR_LINK_ACTIVE</Text>
          <TouchableOpacity
            style={styles.aiCapsule}
            onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentAiTab' })}
            activeOpacity={0.85}
          >
            <Text style={styles.aiCapsuleText}>AI_CONSOLE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{pendingTasks.length}</Text>
            <Text style={styles.metricLabel}>PENDING</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{children.length}</Text>
            <Text style={styles.metricLabel}>NODES</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{weeklyMinutes}M</Text>
            <Text style={styles.metricLabel}>GAME_WK</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{parentGpBalance}</Text>
            <Text style={styles.metricLabel}>GP_WALLET</Text>
          </View>
        </View>

        {error ? <Banner message={error} style={styles.bannerMargin} /> : null}

        {activeSessions.length > 0 && (
          <View style={styles.sessionBanner}>
            <Text style={styles.sessionBannerIcon}>●</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionBannerTitle}>GAMING_SESSION_ACTIVE</Text>
              <Text style={styles.sessionBannerDesc}>
                {activeSessions.length} CHILD{activeSessions.length > 1 ? 'REN' : ''}_IN_SESSION
              </Text>
            </View>
            <TouchableOpacity style={styles.sessionBannerBtn} onPress={() => navigation.navigate('ParentGaming')}>
              <Text style={styles.sessionBannerBtnText}>VIEW</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BrutalistHeader title="PENDING_QUEUE" />
            <TouchableOpacity onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentApprovals' })}>
              <Text style={styles.sectionLink}>ALL →</Text>
            </TouchableOpacity>
          </View>

          {pendingTasks.length === 0 ? (
            <BrutalistBox style={styles.paddedBox}>
              <Text style={styles.emptyIcon}>∅</Text>
              <Text style={styles.emptyText}>QUEUE_EMPTY</Text>
            </BrutalistBox>
          ) : (
            <BrutalistBox style={styles.flushBox}>
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
            </BrutalistBox>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BrutalistHeader title="CHILD_NODES" />
            <TouchableOpacity onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentChildren' })}>
              <Text style={styles.sectionLink}>MANAGE →</Text>
            </TouchableOpacity>
          </View>

          {children.length === 0 ? (
            <BrutalistBox style={styles.paddedBox}>
              <Text style={styles.emptyIcon}>—</Text>
              <Text style={styles.emptyText}>NO_NODES // USE ADD_NODE</Text>
            </BrutalistBox>
          ) : (
            <View style={styles.childrenStack}>
              {children.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  tasks={tasks}
                  activeSessions={activeSessions}
                  onSwitchToChild={switchToChild}
                  onOpenDetail={(c) =>
                    navigation.navigate('ParentChildDetail', { childId: c.id, childName: c.name })
                  }
                />
              ))}
            </View>
          )}
        </View>

        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <BrutalistHeader title="ACTIVITY_LOG" />
            <BrutalistBox style={styles.flushBox}>
              {recentActivity.map((item, idx) => (
                <View key={item.id || idx}>
                  {idx > 0 && <View style={styles.rowDivider} />}
                  <ActivityItem icon={item.icon} text={item.text} time={item.time} />
                </View>
              ))}
            </BrutalistBox>
          </View>
        )}

        {insights?.narrative ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BrutalistHeader title="FAMILY_INSIGHTS" />
              <TouchableOpacity onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentAiTab' })}>
                <Text style={styles.sectionLink}>AI →</Text>
              </TouchableOpacity>
            </View>
            <BrutalistBox style={styles.insightsBox}>
              <Text style={styles.insightsText}>{insights.narrative}</Text>
            </BrutalistBox>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: fabBottom }]} pointerEvents="box-none">
        <MobileButton
          title={children.length ? 'EMERGENCY_LOCK' : 'ADD_NODE'}
          onPress={() =>
            children.length
              ? navigation.navigate('ParentGaming')
              : navigation.navigate('ParentTabs', { screen: 'ParentChildren' })
          }
          style={styles.fabButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: ONE_BIT.background
  },
  screen: { flex: 1 },
  content: { gap: 0 },
  bannerMargin: { margin: spacing.md },

  hero: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'center'
  },
  heroSub: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 11,
    color: ONE_BIT.ink,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  aiCapsule: {
    alignSelf: 'center',
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 8
  },
  aiCapsuleText: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: ONE_BIT.ink
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.md,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    borderBottomWidth: 4
  },
  metricCell: {
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRightWidth: ONE_BIT.borderWidth,
    borderBottomWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    alignItems: 'center',
    gap: 4
  },
  metricValue: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 18,
    color: ONE_BIT.ink
  },
  metricLabel: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 9,
    letterSpacing: 0.5,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },

  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    borderBottomWidth: 4,
    padding: spacing.sm,
    backgroundColor: ONE_BIT.background
  },
  sessionBannerIcon: { fontSize: 14, color: ONE_BIT.ink },
  sessionBannerTitle: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 12,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },
  sessionBannerDesc: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    color: ONE_BIT.ink,
    marginTop: 2,
    textTransform: 'uppercase'
  },
  sessionBannerBtn: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: ONE_BIT.background
  },
  sessionBannerBtnText: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 11,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },

  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLink: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 11,
    color: ONE_BIT.ink,
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },

  paddedBox: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  flushBox: { overflow: 'hidden' },
  insightsBox: { padding: spacing.md, borderLeftWidth: 4 },
  rowDivider: { height: ONE_BIT.borderWidth, backgroundColor: ONE_BIT.ink },

  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm
  },
  approvalAvatar: {
    width: 36,
    height: 36,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  approvalAvatarText: { fontFamily: ONE_BIT.fontBold, color: ONE_BIT.ink, fontSize: 14 },
  approvalInfo: { flex: 1, gap: 2 },
  approvalTitle: { fontFamily: ONE_BIT.fontBold, fontSize: 13, color: ONE_BIT.ink },
  approvalChild: { fontFamily: ONE_BIT.fontRegular, fontSize: 11, color: ONE_BIT.ink },
  approvalVerdict: {
    borderWidth: ONE_BIT.borderWidth,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  approvalVerdictText: { fontFamily: ONE_BIT.fontBold, fontSize: 10, textTransform: 'uppercase' },
  approvalPoints: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 12,
    color: ONE_BIT.ink,
    flexShrink: 0
  },

  childrenStack: { gap: spacing.md },

  brutalChildBox: {
    padding: spacing.md,
    gap: spacing.sm
  },
  childCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  childAvatar: {
    width: 44,
    height: 44,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  childAvatarText: { fontFamily: ONE_BIT.fontBold, color: ONE_BIT.ink, fontSize: 18 },
  childCardInfo: { flex: 1, gap: 6 },
  childCardName: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 15,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },
  childBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pendingBadge: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  pendingBadgeText: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },
  activeBadge: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: ONE_BIT.background
  },
  activeBadgeText: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },

  childBalanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  childBalance: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  childBalanceGap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    borderLeftWidth: ONE_BIT.borderWidth,
    borderLeftColor: ONE_BIT.ink,
    paddingLeft: spacing.sm
  },
  childBalanceValue: { fontFamily: ONE_BIT.fontBold, fontSize: 18, color: ONE_BIT.ink },
  childBalanceLabel: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 11,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },
  streakPill: {
    marginLeft: 'auto',
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  streakPillText: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 11,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },

  childViewBtn: {
    paddingVertical: 10,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    alignItems: 'center'
  },
  childViewBtnText: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 12,
    color: ONE_BIT.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm
  },
  activityIcon: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 12,
    width: 28,
    textAlign: 'center',
    color: ONE_BIT.ink
  },
  activityText: { flex: 1, fontSize: 12, fontFamily: ONE_BIT.fontRegular, color: ONE_BIT.ink },
  activityTime: { fontSize: 10, fontFamily: ONE_BIT.fontRegular, color: ONE_BIT.ink },

  emptyIcon: { fontSize: 28, color: ONE_BIT.ink },
  emptyText: {
    fontSize: 12,
    fontFamily: ONE_BIT.fontRegular,
    color: ONE_BIT.ink,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },

  insightsText: {
    fontSize: 13,
    fontFamily: ONE_BIT.fontRegular,
    color: ONE_BIT.ink,
    lineHeight: 20
  },

  fabWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md
  },
  fabButton: {
    width: '100%'
  }
});
