import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ParentTasksScreen() {
  const { token } = useAuth();
  const [children, setChildren] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('10');
  const [dueInHours, setDueInHours] = useState('24');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const [childList, taskList] = await Promise.all([
      apiRequest('/children/list', { token }),
      apiRequest('/tasks/list', { token })
    ]);
    setChildren(childList);
    setTasks(taskList);
    if (!selectedChildId && childList[0]) setSelectedChildId(childList[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const childName = useMemo(() => {
    const map = new Map(children.map((child) => [child.id, child.name]));
    return (id) => map.get(id) || 'Child';
  }, [children]);

  async function createTask() {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const due = new Date(Date.now() + Number(dueInHours || 24) * 60 * 60 * 1000).toISOString();
      await apiRequest('/tasks/create', {
        method: 'POST',
        token,
        body: {
          childId: selectedChildId,
          title,
          description,
          points: Number(points),
          dueDate: due
        }
      });
      setInfo('Task created.');
      setTitle('');
      setDescription('');
      setPoints('10');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTask(taskId) {
    setError('');
    try {
      await apiRequest(`/tasks/${taskId}`, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Create task</Text>
        <InputField label="Child ID" value={selectedChildId} onChangeText={setSelectedChildId} />
        {children.length > 0 ? (
          <View style={styles.childPickRow}>
            {children.map((child) => (
              <Button
                key={child.id}
                title={child.name}
                tone={selectedChildId === child.id ? 'primary' : 'secondary'}
                onPress={() => setSelectedChildId(child.id)}
              />
            ))}
          </View>
        ) : null}
        <InputField label="Title" value={title} onChangeText={setTitle} maxLength={50} />
        <InputField label="Description" value={description} onChangeText={setDescription} maxLength={200} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
        <InputField label="Points (5-50)" value={points} onChangeText={setPoints} keyboardType="number-pad" />
        <InputField label="Due in hours (max 168)" value={dueInHours} onChangeText={setDueInHours} keyboardType="number-pad" />
        <Button title="Create Task" onPress={createTask} loading={loading} disabled={!selectedChildId || !title || !description} />
      </Card>

      <MessageBanner text={info} tone="success" />
      <MessageBanner text={error} />

      <Card>
        <Text style={styles.title}>All tasks</Text>
        {tasks.length === 0 ? <Text>No tasks yet.</Text> : tasks.map((task) => (
          <View key={task.id} style={styles.item}>
            <Text style={styles.name}>{task.title} ({task.points} pts)</Text>
            <Text style={styles.meta}>Child: {task.childName || childName(task.childId)}</Text>
            <Text style={styles.meta}>State: {task.state}</Text>
            <Text style={styles.meta}>Due: {new Date(task.dueDate).toLocaleString()}</Text>
            {(task.state === 'Active' || task.state === 'Draft') ? <Button title="Delete task" tone="secondary" onPress={() => deleteTask(task.id)} /> : null}
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
  meta: { color: colors.textMuted, fontSize: 12 },
  childPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});
