import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Spinner from '../../components/Spinner';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { fmtDateTime, getErrorMessage } from '../../utils/format';

const TYPE_ICONS = {
  task_approved:   '✅',
  task_rejected:   '❌',
  task_expired:    '💤',
  task_dispute:    '⚠️',
  reward_redeemed: '🎁',
  achievement:     '🏆',
  gaming_cap:      '🎮',
  gp_received:     '💰',
  default:         '🔔',
};

function notifIcon(type) {
  const key = String(type || '').toLowerCase();
  for (const [k, v] of Object.entries(TYPE_ICONS)) {
    if (k !== 'default' && key.includes(k.replace('_', ''))) return v;
  }
  return TYPE_ICONS.default;
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

function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function ChildNotificationsScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);

  const load = useCallback(async () => {
    const list = await apiRequest('/notifications/list', { token });
    setNotifications(list);
  }, [token]);

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e))).finally(() => setInitialLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try { await load(); } catch (e) { setError(getErrorMessage(e)); }
    setRefreshing(false);
  }

  const unreadIds = useMemo(() => notifications.filter((n) => !n.read).map((n) => n.id), [notifications]);

  async function markAllRead() {
    if (!unreadIds.length || markBusy) return;
    setMarkBusy(true);
    try {
      await apiRequest('/notifications/markRead', { method: 'POST', token, body: { notificationIds: unreadIds } });
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
    setMarkBusy(false);
  }

  const todayList = notifications.filter((n) => isToday(n.createdAt));
  const earlierList = notifications.filter((n) => !isToday(n.createdAt));

  if (initialLoading) return <View style={{ flex: 1, backgroundColor: colors.background }}><Spinner full /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={['#7C3AED', '#6D28D9']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSub}>
              {unreadIds.length > 0 ? `${unreadIds.length} unread` : 'All caught up!'}
            </Text>
          </View>
          {unreadIds.length > 0 ? (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} disabled={markBusy} activeOpacity={0.8}>
              <Text style={styles.markAllText}>{markBusy ? '…' : 'Mark all read'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.childAccent} />}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
          </View>
        ) : null}

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>Your parent will send you updates here.</Text>
          </View>
        ) : null}

        {todayList.length > 0 ? (
          <>
            <Text style={styles.groupLabel}>Today</Text>
            {todayList.map((n) => <NotifRow key={n.id} n={n} />)}
          </>
        ) : null}

        {earlierList.length > 0 ? (
          <>
            <Text style={styles.groupLabel}>Earlier</Text>
            {earlierList.map((n) => <NotifRow key={n.id} n={n} />)}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function NotifRow({ n }) {
  const icon = notifIcon(n.type);
  return (
    <View style={[styles.notifRow, !n.read && styles.notifRowUnread]}>
      <View style={styles.notifIconWrap}>
        <Text style={styles.notifIcon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.notifMsg, !n.read && styles.notifMsgUnread]} numberOfLines={3}>
          {n.message}
        </Text>
        <Text style={styles.notifTime}>{timeAgo(n.createdAt)} · {fmtDateTime(n.createdAt)}</Text>
      </View>
      {!n.read ? <View style={styles.unreadDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  markAllText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  content: { padding: 16, gap: 8 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.errorSurface, borderRadius: 12, borderWidth: 1, borderColor: colors.danger + '44',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorClose: { color: colors.danger, fontSize: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  groupLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifRowUnread: {
    borderColor: colors.childAccent + '44',
    backgroundColor: colors.childAccentLight,
  },
  notifIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    backgroundColor: colors.childAccent + '18',
  },
  notifIcon: { fontSize: 20 },
  notifMsg: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  notifMsgUnread: { color: colors.text, fontWeight: '600' },
  notifTime: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0,
    backgroundColor: colors.childAccent,
  },
});
