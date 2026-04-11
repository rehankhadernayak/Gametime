import { useState } from 'react';
import { Text } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ParentLoginScreen() {
  const { loginWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
      await loginWithToken(data.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Text>Sign in as parent</Text>
        <InputField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <InputField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title="Login" onPress={submit} loading={loading} />
      </Card>
      <MessageBanner text={error} />
    </Screen>
  );
}
