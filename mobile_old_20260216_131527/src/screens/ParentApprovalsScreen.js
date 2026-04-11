import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ParentApprovalsScreen() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');

  async function load() {
    const list = await apiRequest('/tasks/list', { token });
    setTasks(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const pending = useMemo(() => tasks.filter((task) => task.state === 'PendingApproval'), [tasks]);

  async function decide(taskId, decision) {
    setError('');
    try {
      await apiRequest(`/tasks/${decision}`, {
        method: 'POST',
        token,
        body: { taskId, note: notes[taskId] || null }
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Approvals queue</Text>
        <Text style={styles.meta}>Parent final decision. AI only gives advice.</Text>
      </Card>

      <MessageBanner text={error} />

      <Card>
        {pending.length === 0 ? <Text>No tasks pending approval.</Text> : pending.map((task) => (
          <View key={task.id} style={styles.item}>
            <Text style={styles.name}>{task.childName}: {task.title} ({task.points} pts)</Text>
            <Text style={styles.meta}>{task.description}</Text>
            <Text style={styles.meta}>Evidence: {task.evidenceType || 'Missing'} | {task.evidenceMime || '-'}</Text>
            {task.aiStatus ? (
              <Text style={styles.meta}>AI: {task.aiRecommendation || 'No recommendation'} ({task.aiConfidence || 0}%) {task.aiReason ? `- ${task.aiReason}` : ''}</Text>
            ) : null}
            <InputField
              label="Approval note (optional)"
              value={notes[task.id] || ''}
              maxLength={200}
              onChangeText={(v) => setNotes((prev) => ({ ...prev, [task.id]: v }))}
            />
            <View style={styles.row}>
              <Button title="Approve" onPress={() => decide(task.id, 'approve')} />
              <Button title="Reject" tone="secondary" onPress={() => decide(task.id, 'reject')} />
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12 },
  item: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 8, gap: 6 },
  name: { fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', gap: 8 }
});
