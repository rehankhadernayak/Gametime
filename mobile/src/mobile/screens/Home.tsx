import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MobileButton } from '../../components/MobileButton';
import { OneBitAsciiHeader } from '../../components/OneBitAsciiHeader';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import { getErrorMessage } from '../../utils/format';
import { normalizeTasksListResponse } from '../../utils/tasksList.js';
import { ONE_BIT, monoFont } from '../../theme/oneBit';

const TITLE_FULL = 'DASHBOARD';

type Child = {
  id: string;
  name?: string;
  pointsBalance?: number;
  giftcardPointsBalance?: number;
  currentStreakDays?: number;
  streak?: number;
};

type TaskItem = {
  id: string;
  childId: string;
  title: string;
  state: string;
  points: number;
  aiRecommendation?: string;
};

type Nav = NativeStackNavigationProp<Record<string, object | undefined>>;

function ApprovalRow({
  task,
  children,
  onReview,
}: {
  task: TaskItem;
  children: Child[];
  onReview: () => void;
}) {
  const child = children.find((c) => c.id === task.childId);
  const verdictLabel =
    task.aiRecommendation === 'Approve'
      ? 'APPROVE'
      : task.aiRecommendation === 'Reject'
        ? 'REJECT'
        : 'REVIEW';

  return (
    <MobileButton variant="secondary" onPress={onReview} style={styles.approvalRowBtn}>
      <View style={styles.approvalInner}>
        <Text style={[styles.monoStrong, { fontFamily: monoFont.bold }]}>
          {(child?.name?.charAt(0) || '?').toUpperCase()}
        </Text>
        <View style={styles.approvalMid}>
          <Text style={[styles.rowTitle, { fontFamily: monoFont.semibold }]} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={[styles.rowSub, { fontFamily: monoFont.regular }]} numberOfLines={1}>
            {child?.name || 'CHILD'}
          </Text>
        </View>
        <Text style={[styles.verdict, { fontFamily: monoFont.regular }]}>{verdictLabel}</Text>
        <Text style={[styles.points, { fontFamily: monoFont.bold }]}>+{task.points} RP</Text>
      </View>
    </MobileButton>
  );
}

function ChildCard({
  child,
  tasks,
  onSwitchToChild,
}: {
  child: Child;
  tasks: TaskItem[];
  onSwitchToChild: (id: string) => void;
}) {
  const pending = tasks.filter((t) => t.childId === child.id && t.state === 'PendingApproval').length;
  const active = tasks.filter((t) => t.childId === child.id && t.state === 'Active').length;
  const initial = child.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={styles.card}>
      <View style={styles.childHeader}>
        <View style={[styles.avatar, styles.border2]}>
          <Text style={[styles.avatarTxt, { fontFamily: monoFont.bold }]}>{initial}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.childName, { fontFamily: monoFont.bold }]}>{child.name}</Text>
          <View style={styles.badgeRow}>
            {pending > 0 ? (
              <Text style={[styles.badgeTxt, { fontFamily: monoFont.regular }]}>{pending} PENDING</Text>
            ) : null}
            {active > 0 ? (
              <Text style={[styles.badgeTxt, { fontFamily: monoFont.regular }]}>{active} ACTIVE</Text>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.listSep} />
      <View style={styles.balanceRow}>
        <Text style={[styles.balanceVal, { fontFamily: monoFont.bold }]}>{child.pointsBalance ?? 0}</Text>
        <Text style={[styles.balanceLbl, { fontFamily: monoFont.regular }]}> RP</Text>
        <Text style={[styles.balanceVal, { fontFamily: monoFont.bold, marginLeft: 16 }]}>
          {child.giftcardPointsBalance ?? 0}
        </Text>
        <Text style={[styles.balanceLbl, { fontFamily: monoFont.regular }]}> GP</Text>
        {(child.currentStreakDays ?? child.streak ?? 0) > 0 ? (
          <Text style={[styles.streak, { fontFamily: monoFont.regular }]}>
            {(child.currentStreakDays ?? child.streak) as number}D STREAK
          </Text>
        ) : null}
      </View>
      <MobileButton variant="secondary" onPress={() => onSwitchToChild(child.id)}>
        OPEN CHILD VIEW
      </MobileButton>
    </View>
  );
}

function ActivityRow({ icon, text, time }: { icon: string; text: string; time: string }) {
  return (
    <View style={[styles.activityRow, styles.sepBottom]}>
      <Text style={[styles.actIcon, { fontFamily: monoFont.regular }]}>{icon}</Text>
      <Text style={[styles.actText, { fontFamily: monoFont.regular }]} numberOfLines={2}>
        {text}
      </Text>
      <Text style={[styles.actTime, { fontFamily: monoFont.regular }]}>{time}</Text>
    </View>
  );
}

function timeAgo(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'NOW';
  if (mins < 60) return `${mins}M`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}H`;
  return `${Math.floor(hrs / 24)}D`;
}

export default function Home() {
  const { token, user, loginWithToken } = useAuth();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notifications, setNotifications] = useState<{ id?: string; type?: string; message?: string; createdAt: string }[]>(
    []
  );
  const [activeSessions, setActiveSessions] = useState<{ status?: string }[]>([]);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [parentGpBalance, setParentGpBalance] = useState(0);
  const [insights, setInsights] = useState<{ narrative?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);

  useEffect(() => {
    if (titleIndex >= TITLE_FULL.length) return;
    const t = setTimeout(() => setTitleIndex((n) => n + 1), 38);
    return () => clearTimeout(t);
  }, [titleIndex]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      setError('');
      try {
        const [childList, taskListRaw, notificationList, gpSummary] = await Promise.all([
          apiRequest<Child[]>('/children/list', { token }),
          apiRequest<unknown>('/tasks/list', { token }),
          apiRequest<{ id?: string; type?: string; message?: string; createdAt: string }[]>('/notifications/list', {
            token,
          }),
          apiRequest<{ parentGpBalance?: number }>('/giftcards/gp/summary', { token }).catch(() => ({
            parentGpBalance: 0,
            children: [],
          })),
        ]);

        const [reports, sessions, insightsData] = await Promise.all([
          Promise.all(
            childList.map((c) =>
              apiRequest<{ totals?: { totalMinutes?: number } }>(`/gaming/reports/weekly?childId=${c.id}`, { token }).catch(
                () => ({ totals: { totalMinutes: 0 } })
              )
            )
          ),
          apiRequest<unknown[]>('/gaming/sessions/audit?limit=20', { token }).catch(() => []),
          apiRequest<{ narrative?: string }>('/ai/parent/insights', { token }).catch(() => null),
        ]);

        setChildren(childList);
        setTasks(normalizeTasksListResponse(taskListRaw).tasks as TaskItem[]);
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
    void load();
  }, [load]);

  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.state === 'PendingApproval').slice(0, 5),
    [tasks]
  );

  const recentActivity = useMemo(() => {
    return notifications.slice(0, 6).map((n) => ({
      id: n.id,
      icon:
        n.type === 'task_submitted'
          ? 'SUB'
          : n.type === 'task_approved'
            ? 'OK '
            : n.type === 'reward_redeemed'
              ? 'RWD'
              : n.type === 'achievement_unlocked'
                ? 'ACH'
                : ' · ',
      text: n.message,
      time: timeAgo(n.createdAt),
    }));
  }, [notifications]);

  async function switchToChild(childId: string) {
    try {
      const data = await apiRequest<{ token: string }>('/auth/child-login', { method: 'POST', token, body: { childId } });
      await loginWithToken(data.token);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, styles.screenBg]}>
        <ActivityIndicator size="large" color={ONE_BIT.ink} />
        <Text style={[styles.loadingTxt, { fontFamily: monoFont.regular }]}>LOADING…</Text>
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'PARENT';
  const typedTitle = TITLE_FULL.slice(0, titleIndex);

  return (
    <ScrollView
      testID="parent-dashboard-screen"
      style={styles.screenBg}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={ONE_BIT.ink} />
      }
    >
      <OneBitAsciiHeader
        routeLine="HOME / OVERVIEW"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={[styles.hero, styles.sepBottom]}>
        <Text style={[styles.typeTitle, { fontFamily: monoFont.bold }]}>
          {typedTitle}
          {titleIndex < TITLE_FULL.length ? '▌' : ''}
        </Text>
        <Text style={[styles.greet, { fontFamily: monoFont.regular }]}>GOOD DAY, {firstName.toUpperCase()}</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Text style={[styles.metricVal, { fontFamily: monoFont.bold }]}>{pendingTasks.length}</Text>
            <Text style={[styles.metricLbl, { fontFamily: monoFont.regular }]}>PENDING</Text>
          </View>
          <View style={styles.metricVsep} />
          <View style={styles.metricCell}>
            <Text style={[styles.metricVal, { fontFamily: monoFont.bold }]}>{children.length}</Text>
            <Text style={[styles.metricLbl, { fontFamily: monoFont.regular }]}>CHILDREN</Text>
          </View>
          <View style={styles.metricVsep} />
          <View style={styles.metricCell}>
            <Text style={[styles.metricVal, { fontFamily: monoFont.bold }]}>{weeklyMinutes}M</Text>
            <Text style={[styles.metricLbl, { fontFamily: monoFont.regular }]}>GAME WK</Text>
          </View>
          <View style={styles.metricVsep} />
          <View style={styles.metricCell}>
            <Text style={[styles.metricVal, { fontFamily: monoFont.bold }]}>{parentGpBalance}</Text>
            <Text style={[styles.metricLbl, { fontFamily: monoFont.regular }]}>GP WALLET</Text>
          </View>
        </View>
        <MobileButton
          variant="secondary"
          onPress={() => navigation.navigate('ParentTabs' as never, { screen: 'ParentAiTab' } as never)}
        >
          OPEN AI TAB
        </MobileButton>
      </View>

      {error ? (
        <View style={[styles.errBanner, styles.sepBottom]}>
          <Text style={[styles.errTxt, { fontFamily: monoFont.regular }]}>{error}</Text>
          <MobileButton variant="ghost" onPress={() => setError('')} textStyle={styles.dismissTxt}>
            [DISMISS]
          </MobileButton>
        </View>
      ) : null}

      {activeSessions.length > 0 ? (
        <View style={[styles.sessionBlock, styles.sepBottom]}>
          <Text style={[styles.sessionTitle, { fontFamily: monoFont.bold }]}>LIVE SESSION</Text>
          <Text style={[styles.sessionSub, { fontFamily: monoFont.regular }]}>
            {activeSessions.length} CHILD{activeSessions.length > 1 ? 'REN' : ''} GAMING
          </Text>
          <MobileButton variant="primary" onPress={() => navigation.navigate('ParentGaming' as never)}>
            VIEW GAMING
          </MobileButton>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={[styles.sectionHead, styles.sepBottom]}>
          <Text style={[styles.sectionTitle, { fontFamily: monoFont.bold }]}>NEEDS REVIEW</Text>
          <MobileButton
            variant="ghost"
            onPress={() => navigation.navigate('ParentTabs' as never, { screen: 'ParentApprovals' } as never)}
            textStyle={styles.sectionLinkTxt}
          >
            VIEW ALL
          </MobileButton>
        </View>
        {pendingTasks.length === 0 ? (
          <View style={[styles.empty, styles.sepBottom]}>
            <Text style={[styles.emptyTxt, { fontFamily: monoFont.regular }]}>ALL CLEAR — NOTHING PENDING.</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {pendingTasks.map((task) => (
              <ApprovalRow
                key={task.id}
                task={task}
                children={children}
                onReview={() => navigation.navigate('ParentTabs' as never, { screen: 'ParentApprovals' } as never)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHead, styles.sepBottom]}>
          <Text style={[styles.sectionTitle, { fontFamily: monoFont.bold }]}>MY CHILDREN</Text>
          <MobileButton
            variant="ghost"
            onPress={() => navigation.navigate('ParentTabs' as never, { screen: 'ParentChildren' } as never)}
            textStyle={styles.sectionLinkTxt}
          >
            MANAGE
          </MobileButton>
        </View>
        {children.length === 0 ? (
          <View style={[styles.empty, styles.sepBottom]}>
            <Text style={[styles.emptyTxt, { fontFamily: monoFont.regular }]}>ADD A CHILD TO GET STARTED.</Text>
          </View>
        ) : (
          <View style={styles.childrenList}>
            {children.map((child) => (
              <View key={child.id} style={styles.sepBottom}>
                <ChildCard child={child} tasks={tasks} onSwitchToChild={switchToChild} />
              </View>
            ))}
          </View>
        )}
      </View>

      {recentActivity.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitleBare, styles.sepBottom, { fontFamily: monoFont.bold }]}>
            RECENT ACTIVITY
          </Text>
          <View>
            {recentActivity.map((item, idx) => (
              <View key={item.id || String(idx)}>
                <ActivityRow icon={item.icon} text={item.text} time={item.time} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {insights?.narrative ? (
        <View style={styles.section}>
          <View style={[styles.sectionHead, styles.sepBottom]}>
            <Text style={[styles.sectionTitle, { fontFamily: monoFont.bold }]}>FAMILY INSIGHTS</Text>
            <MobileButton
              variant="ghost"
              onPress={() => navigation.navigate('ParentTabs' as never, { screen: 'ParentAiTab' } as never)}
              textStyle={styles.sectionLinkTxt}
            >
              ASK AI
            </MobileButton>
          </View>
          <View style={[styles.insights, styles.border2]}>
            <Text style={[styles.insightsTxt, { fontFamily: monoFont.regular }]}>{insights.narrative}</Text>
          </View>
        </View>
      ) : null}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenBg: { flex: 1, backgroundColor: ONE_BIT.bg },
  scrollContent: { paddingBottom: 8, backgroundColor: ONE_BIT.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { color: ONE_BIT.ink, fontSize: 12 },
  hero: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 12 },
  typeTitle: { color: ONE_BIT.ink, fontSize: 22, letterSpacing: 2 },
  greet: { color: ONE_BIT.ink, fontSize: 12, letterSpacing: 0.5 },
  metricsRow: { flexDirection: 'row', alignItems: 'stretch', borderWidth: ONE_BIT.borderWidth, borderColor: ONE_BIT.ink },
  metricCell: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  metricVal: { color: ONE_BIT.ink, fontSize: 15 },
  metricLbl: { color: ONE_BIT.ink, fontSize: 9, marginTop: 2, opacity: 0.8 },
  metricVsep: { width: ONE_BIT.borderWidth, backgroundColor: ONE_BIT.ink },
  listSep: { height: ONE_BIT.borderWidth, backgroundColor: ONE_BIT.ink },
  section: { marginTop: 20 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sectionTitle: { color: ONE_BIT.ink, fontSize: 13, letterSpacing: 1 },
  sectionTitleBare: { color: ONE_BIT.ink, fontSize: 13, letterSpacing: 1, paddingHorizontal: 16, paddingBottom: 10 },
  sectionLinkTxt: { fontSize: 11, letterSpacing: 0.5, textTransform: 'none' },
  listWrap: { paddingHorizontal: 0 },
  approvalRowBtn: {
    borderRadius: ONE_BIT.radius,
    borderWidth: 0,
    borderBottomWidth: ONE_BIT.borderWidth,
    borderBottomColor: ONE_BIT.ink,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    alignItems: 'stretch',
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 0,
    backgroundColor: ONE_BIT.bg,
  },
  approvalInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  monoStrong: { fontSize: 14, color: ONE_BIT.ink, width: 22, textAlign: 'center' },
  approvalMid: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, color: ONE_BIT.ink },
  rowSub: { fontSize: 11, color: ONE_BIT.ink, opacity: 0.75 },
  verdict: { fontSize: 10, color: ONE_BIT.ink },
  points: { fontSize: 12, color: ONE_BIT.ink },
  card: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: ONE_BIT.bg },
  border2: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    borderRadius: ONE_BIT.radius,
  },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 18, color: ONE_BIT.ink },
  flex1: { flex: 1 },
  childName: { fontSize: 15, color: ONE_BIT.ink },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  badgeTxt: { fontSize: 10, color: ONE_BIT.ink },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 },
  balanceVal: { fontSize: 18, color: ONE_BIT.ink },
  balanceLbl: { fontSize: 11, color: ONE_BIT.ink },
  streak: { marginLeft: 'auto', fontSize: 10, color: ONE_BIT.ink },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16 },
  actIcon: { width: 32, fontSize: 11, color: ONE_BIT.ink },
  actText: { flex: 1, fontSize: 12, color: ONE_BIT.ink },
  actTime: { fontSize: 10, color: ONE_BIT.ink, opacity: 0.75 },
  empty: { padding: 20, alignItems: 'center' },
  emptyTxt: { fontSize: 12, color: ONE_BIT.ink, textAlign: 'center' },
  childrenList: {},
  sessionBlock: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  sessionTitle: { fontSize: 12, color: ONE_BIT.ink },
  sessionSub: { fontSize: 11, color: ONE_BIT.ink, opacity: 0.85 },
  errBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errTxt: { flex: 1, fontSize: 12, color: ONE_BIT.ink },
  dismissTxt: { fontSize: 10, textTransform: 'none' },
  insights: { marginHorizontal: 16, padding: 12, marginBottom: 8 },
  insightsTxt: { fontSize: 12, color: ONE_BIT.ink, lineHeight: 18 },
});
