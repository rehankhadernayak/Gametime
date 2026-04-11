import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ChildLoginScreen() {
  const { loginWithToken } = useAuth();
  const [mode, setMode] = useState('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [parentEmail, setParentEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [pin, setPin] = useState('');

  async function login() {
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest(mode === 'email' ? '/auth/child-login-direct' : '/auth/child-login-pin', {
        method: 'POST',
        body: mode === 'email' ? { email, password } : { parentEmail, childName, pin }
      });
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
        <Text style={styles.title}>Child login</Text>
        <View style={styles.row}>
          <Button title="Email" onPress={() => setMode('email')} tone={mode === 'email' ? 'primary' : 'secondary'} />
          <Button title="4-digit PIN" onPress={() => setMode('pin')} tone={mode === 'pin' ? 'primary' : 'secondary'} />
        </View>

        {mode === 'email' ? (
          <>
            <InputField label="Child Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <InputField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          </>
        ) : (
          <>
            <InputField label="Parent Email" autoCapitalize="none" keyboardType="email-address" value={parentEmail} onChangeText={setParentEmail} />
            <InputField label="Child Name" value={childName} onChangeText={setChildName} />
            <InputField label="PIN" keyboardType="number-pad" maxLength={4} value={pin} onChangeText={setPin} />
          </>
        )}

        <Button title="Login" onPress={login} loading={loading} />
      </Card>
      <MessageBanner text={error} />
      <Text style={styles.note}>PIN mode only works for younger children (age 9 and under).</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text
  },
  row: {
    flexDirection: 'row',
    gap: 8
  },
  note: {
    color: colors.textMuted,
    fontSize: 12
  }
});
