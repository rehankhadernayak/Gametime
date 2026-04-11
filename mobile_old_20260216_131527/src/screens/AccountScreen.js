import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import MessageBanner from '../components/MessageBanner';
import { apiRequest, getApiBaseUrl, setApiBaseUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function AccountScreen() {
  const { role, user, token, pushToken, logout, refreshMe } = useAuth();
  const [apiUrl, setApiUrl] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getApiBaseUrl().then(setApiUrl);
  }, []);

  async function saveApi() {
    setError('');
    setInfo('');
    try {
      await setApiBaseUrl(apiUrl);
      setInfo('API URL saved.');
    } catch (e) {
      setError(e.message);
    }
  }

  async function testConnection() {
    setError('');
    setInfo('');
    try {
      const res = await apiRequest('/health', { token: token || undefined });
      setInfo(`Connected: ${res.timestamp}`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleLogout() {
    await logout();
    Alert.alert('Logged out', 'You have been signed out.');
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.meta}>Role: {role}</Text>
        <Text style={styles.meta}>Name: {user?.name || '-'}</Text>
        {user?.email ? <Text style={styles.meta}>Email: {user.email}</Text> : null}
        {typeof user?.pointsBalance === 'number' ? <Text style={styles.meta}>Points: {user.pointsBalance}</Text> : null}
        <Button title="Refresh Profile" tone="secondary" onPress={() => refreshMe().catch((e) => setError(e.message))} />
      </Card>

      <Card>
        <Text style={styles.title}>Backend Connection</Text>
        <InputField label="API Base URL" value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" />
        <Button title="Save API URL" onPress={saveApi} />
        <Button title="Test Connection" tone="secondary" onPress={testConnection} />
      </Card>

      <Card>
        <Text style={styles.title}>Push Token</Text>
        <Text style={styles.meta}>{pushToken || 'Not available yet (needs physical device + permissions).'}</Text>
      </Card>

      <MessageBanner text={info} tone="success" />
      <MessageBanner text={error} />

      <Button title="Logout" tone="secondary" onPress={handleLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.textMuted }
});
