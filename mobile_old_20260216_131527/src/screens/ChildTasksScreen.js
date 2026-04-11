import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Screen from '../components/Screen';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const MAX_FILE_BYTES = 40 * 1024 * 1024;

async function pickFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo library permission is required');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.85
  });
  if (result.canceled) return null;
  return result.assets[0];
}

async function captureFromCamera() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Camera permission is required');

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.8,
    videoMaxDuration: 120
  });
  if (result.canceled) return null;
  return result.assets[0];
}

async function toDataUrl(asset) {
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64
  });
  const mime = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
  return {
    mime,
    evidenceType: mime.startsWith('video/') ? 'Video' : 'Photo',
    evidenceData: `data:${mime};base64,${base64}`
  };
}

export default function ChildTasksScreen() {
  const { token, refreshMe } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [taskId, setTaskId] = useState('');
  const [note, setNote] = useState('');
  const [disputeNotes, setDisputeNotes] = useState({});
  const [evidence, setEvidence] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const list = await apiRequest('/tasks/list', { token });
    setTasks(list);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const activeTasks = useMemo(() => tasks.filter((task) => task.state === 'Active'), [tasks]);

  async function selectEvidence(fromCamera) {
    setError('');
    const asset = fromCamera ? await captureFromCamera() : await pickFromLibrary();
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > MAX_FILE_BYTES) {
      throw new Error('Evidence file must be 40MB or less');
    }
    setEvidence(asset);
  }

  async function submitCompletion() {
    if (!taskId) {
      setError('Select an active task first.');
      return;
    }
    if (!evidence) {
      setError('Evidence (photo/video) is mandatory.');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    try {
      const payload = await toDataUrl(evidence);
      const result = await apiRequest('/tasks/complete', {
        method: 'POST',
        token,
        body: {
          taskId,
          evidenceData: payload.evidenceData,
          evidenceMime: payload.mime,
          evidenceType: payload.evidenceType,
          evidenceNote: note || null
        }
      });
      setInfo(result.message || 'Submitted for parent approval.');
      setTaskId('');
      setNote('');
      setEvidence(null);
      await load();
      await refreshMe();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitDispute(task) {
    const text = (disputeNotes[task.id] || '').trim();
    if (!text) {
      setError('Write a dispute note first.');
      return;
    }

    setError('');
    try {
      await apiRequest('/tasks/dispute', {
        method: 'POST',
        token,
        body: {
          taskId: task.id,
          note: text
        }
      });
      setDisputeNotes((prev) => ({ ...prev, [task.id]: '' }));
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Submit task evidence</Text>
        <InputField label="Task ID" value={taskId} onChangeText={setTaskId} placeholder="Paste active task ID" />
        {activeTasks.length > 0 ? <Text style={styles.meta}>Active tasks: {activeTasks.map((t) => `${t.title} (${t.id.slice(0, 8)})`).join(', ')}</Text> : <Text style={styles.meta}>No active tasks available.</Text>}
        <InputField label="Evidence note (optional)" value={note} onChangeText={setNote} maxLength={200} />
        <View style={styles.row}>
          <Button title="Use Camera" onPress={() => selectEvidence(true).catch((e) => setError(e.message))} tone="secondary" />
          <Button title="Pick Photo/Video" onPress={() => selectEvidence(false).catch((e) => setError(e.message))} tone="secondary" />
        </View>
        {evidence ? (
          <View style={styles.previewWrap}>
            <Text style={styles.meta}>Selected: {evidence.fileName || evidence.uri.split('/').pop()}</Text>
            <Text style={styles.meta}>Type: {evidence.type || 'media'} | Size: {Math.round((evidence.fileSize || 0) / 1024)} KB</Text>
            {(evidence.type === 'image' || evidence.mimeType?.startsWith('image/')) ? (
              <Image source={{ uri: evidence.uri }} style={styles.preview} />
            ) : null}
          </View>
        ) : null}
        <Button title="Submit Completion" onPress={submitCompletion} loading={loading} />
      </Card>

      <MessageBanner text={info} tone="success" />
      <MessageBanner text={error} />

      <Card>
        <Text style={styles.title}>My tasks</Text>
        {tasks.length === 0 ? <Text>No tasks yet.</Text> : tasks.map((task) => (
          <View key={task.id} style={styles.item}>
            <Text style={styles.name}>{task.title} ({task.points} pts)</Text>
            <Text style={styles.meta}>State: {task.state}</Text>
            <Text style={styles.meta}>Due: {new Date(task.dueDate).toLocaleString()}</Text>
            {task.parentNote ? <Text style={styles.meta}>Parent note: {task.parentNote}</Text> : null}

            {task.state === 'Rejected' && !task.disputed ? (
              <>
                <InputField
                  label="Dispute note"
                  value={disputeNotes[task.id] || ''}
                  onChangeText={(v) => setDisputeNotes((prev) => ({ ...prev, [task.id]: v }))}
                  maxLength={200}
                />
                <Button title="Submit Dispute" tone="secondary" onPress={() => submitDispute(task)} />
              </>
            ) : null}

            {task.disputed ? <Text style={styles.meta}>Dispute sent: {task.disputeNote}</Text> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', fontSize: 16, color: colors.text },
  row: { flexDirection: 'row', gap: 8 },
  item: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, marginTop: 8, gap: 4 },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12 },
  previewWrap: { gap: 4 },
  preview: { width: '100%', height: 180, borderRadius: 8 }
});
