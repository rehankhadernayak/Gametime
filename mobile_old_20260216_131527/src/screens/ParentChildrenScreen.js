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

export default function ParentChildrenScreen() {
  const { token } = useAuth();
  const [children, setChildren] = useState([]);
  const [form, setForm] = useState({ name: '', dateOfBirth: '', email: '', password: '', pin: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadChildren() {
    const list = await apiRequest('/children/list', { token });
    setChildren(list);
  }

  useEffect(() => {
    loadChildren().catch((e) => setError(e.message));
  }, []);

  async function createChild() {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await apiRequest('/children/create', {
        method: 'POST',
        token,
        body: {
          name: form.name,
          dateOfBirth: form.dateOfBirth,
          email: form.email || null,
          password: form.password || null,
          pin: form.pin || null
        }
      });
      setInfo('Child account created.');
      setForm({ name: '', dateOfBirth: '', email: '', password: '', pin: '' });
      await loadChildren();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Add child account</Text>
        <InputField label="Name" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
        <InputField label="Date of Birth (YYYY-MM-DD)" value={form.dateOfBirth} onChangeText={(v) => setForm((p) => ({ ...p, dateOfBirth: v }))} />
        <InputField label="Child Email (optional for younger child)" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
        <InputField label="Child Password (required for age 10+)" secureTextEntry value={form.password} onChangeText={(v) => setForm((p) => ({ ...p, password: v }))} />
        <InputField label="4-digit PIN (younger child only)" keyboardType="number-pad" maxLength={4} value={form.pin} onChangeText={(v) => setForm((p) => ({ ...p, pin: v }))} />
        <Button title="Create Child" onPress={createChild} loading={loading} />
      </Card>

      <MessageBanner text={info} tone="success" />
      <MessageBanner text={error} />

      <Card>
        <Text style={styles.title}>Child accounts</Text>
        {children.length === 0 ? <Text>No children yet.</Text> : children.map((child) => (
          <View key={child.id} style={styles.listItem}>
            <Text style={styles.name}>{child.name}</Text>
            <Text style={styles.meta}>Points: {child.pointsBalance}</Text>
            <Text style={styles.meta}>Email login: {child.hasPasswordLogin ? 'Enabled' : 'No'}</Text>
            <Text style={styles.meta}>PIN login: {child.hasPinLogin ? 'Enabled' : 'No'}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', fontSize: 16, color: colors.text },
  listItem: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, marginTop: 8 },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted }
});
