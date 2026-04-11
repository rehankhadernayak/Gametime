import { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ParentHomeScreen() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState({ children: 0, pendingApprovals: 0, rewards: 0, unread: 0 });
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    setError('');
    try {
      const [children, tasks, rewards, notifications] = await Promise.all([
        apiRequest('/children/list', { token }),
        apiRequest('/tasks/list', { token }),
        apiRequest('/rewards/list', { token }),
        apiRequest('/notifications/list', { token })
      ]);
      setStats({
        children: children.length,
        pendingApprovals: tasks.filter((t) => t.state === 'PendingApproval').length,
        rewards: rewards.length,
        unread: notifications.filter((n) => !n.read).length
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View>
        <Text style={styles.title}>Welcome back, {user?.name || 'Parent'}.</Text>
        <Text style={styles.subtitle}>Review progress and guide your family’s side quests.</Text>
      </View>

      <View style={styles.grid}>
        <StatCard label="Children" value={stats.children} />
        <StatCard label="Pending" value={stats.pendingApprovals} />
        <StatCard label="Rewards" value={stats.rewards} />
        <StatCard label="Unread" value={stats.unread} />
      </View>

      <MessageBanner text={error} />
    </Screen>
  );
}

function StatCard({ label, value }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primaryDark }}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text
  },
  subtitle: {
    color: colors.textMuted
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  }
});
