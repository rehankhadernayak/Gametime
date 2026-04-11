import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ChildRewardsScreen() {
  const { token, refreshMe } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function load() {
    const list = await apiRequest('/rewards/list', { token });
    setRewards(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function redeem(rewardId) {
    setError('');
    setInfo('');
    try {
      await apiRequest('/rewards/redeem', {
        method: 'POST',
        token,
        body: { rewardId }
      });
      setInfo('Reward redeemed. Parent will fulfill it.');
      await load();
      await refreshMe();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Screen>
      <MessageBanner text={info} tone="success" />
      <MessageBanner text={error} />

      <Card>
        <Text style={styles.title}>Rewards</Text>
        {rewards.length === 0 ? <Text>No rewards available.</Text> : rewards.map((reward) => (
          <View key={reward.id} style={styles.item}>
            <Text style={styles.name}>{reward.title}</Text>
            <Text style={styles.meta}>Cost: {reward.pointsCost} pts</Text>
            <Text style={styles.meta}>Stock: {reward.quantityLimit ?? 'Unlimited'}</Text>
            <Button title="Redeem" onPress={() => redeem(reward.id)} disabled={!reward.active} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', fontSize: 16, color: colors.text },
  item: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, marginTop: 8, gap: 3 },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted }
});
