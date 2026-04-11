import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ChildHomeScreen() {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    const list = await apiRequest('/notifications/list', { token });
    setNotifications(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Hi {user?.name || 'Explorer'}, ready for your next quest?</Text>
        <Text style={styles.points}>Points Balance: {user?.pointsBalance ?? 0}</Text>
      </Card>

      <MessageBanner text={error} />

      <Card>
        <Text style={styles.subtitle}>Recent notifications</Text>
        {notifications.length === 0 ? <Text>No notifications yet.</Text> : notifications.slice(0, 8).map((item) => (
          <Text key={item.id} style={styles.note}>• {item.message}</Text>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  points: { color: colors.text, fontWeight: '700' },
  subtitle: { color: colors.text, fontWeight: '700' },
  note: { color: colors.textMuted }
});
