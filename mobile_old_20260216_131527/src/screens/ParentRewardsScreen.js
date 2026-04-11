import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ParentRewardsScreen() {
  const { token } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [title, setTitle] = useState('');
  const [pointsCost, setPointsCost] = useState('25');
  const [quantityLimit, setQuantityLimit] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function load() {
    const list = await apiRequest('/rewards/list', { token });
    setRewards(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createReward() {
    setError('');
    setInfo('');
    try {
      await apiRequest('/rewards/create', {
        method: 'POST',
        token,
        body: {
          title,
          pointsCost: Number(pointsCost),
          quantityLimit: quantityLimit ? Number(quantityLimit) : null,
          active: true
        }
      });
      setInfo('Reward created.');
      setTitle('');
      setPointsCost('25');
      setQuantityLimit('');
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeReward(rewardId) {
    setError('');
    try {
      await apiRequest(`/rewards/${rewardId}`, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Create reward</Text>
        <InputField label="Title" value={title} onChangeText={setTitle} maxLength={50} />
        <InputField label="Points required" value={pointsCost} onChangeText={setPointsCost} keyboardType="number-pad" />
        <InputField label="Quantity limit (optional)" value={quantityLimit} onChangeText={setQuantityLimit} keyboardType="number-pad" />
        <Button title="Create Reward" onPress={createReward} disabled={!title} />
      </Card>

      <MessageBanner text={info} tone="success" />
      <MessageBanner text={error} />

      <Card>
        <Text style={styles.title}>All rewards</Text>
        {rewards.length === 0 ? <Text>No rewards yet.</Text> : rewards.map((reward) => (
          <View key={reward.id} style={styles.item}>
            <Text style={styles.name}>{reward.title}</Text>
            <Text style={styles.meta}>Cost: {reward.pointsCost} pts</Text>
            <Text style={styles.meta}>Quantity: {reward.quantityLimit ?? 'Unlimited'}</Text>
            <Text style={styles.meta}>Active: {reward.active ? 'Yes' : 'No'}</Text>
            <Button title="Delete" tone="secondary" onPress={() => removeReward(reward.id)} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', fontSize: 16, color: colors.text },
  item: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, marginTop: 8, gap: 2 },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted }
});
