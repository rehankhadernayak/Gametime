import { useState } from 'react';
import { Text } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import MessageBanner from '../components/MessageBanner';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ParentSignupScreen() {
  const { loginWithToken } = useAuth();
  const [step, setStep] = useState('start');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: { name, email, password }
      });
      setStep('verify');
      if (data.deliveryMode === 'test') {
        setInfo(data.previewUrl ? `Email test mode only. Preview: ${data.previewUrl}` : 'Email is in test mode; configure SMTP for real inbox delivery.');
      } else {
        setInfo('OTP sent to your inbox. Enter it below.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/signup/verify', {
        method: 'POST',
        body: { email, otp }
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
        {step === 'start' ? (
          <>
            <Text>Create parent account</Text>
            <InputField label="Name" value={name} onChangeText={setName} />
            <InputField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <InputField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
            <Button title="Send OTP" onPress={sendOtp} loading={loading} />
          </>
        ) : (
          <>
            <Text>Verify your email</Text>
            <Text>{email}</Text>
            <InputField label="6-digit OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} maxLength={6} />
            <Button title="Verify and continue" onPress={verifyOtp} loading={loading} />
            <Button title="Back" tone="secondary" onPress={() => setStep('start')} />
          </>
        )}
      </Card>
      <MessageBanner text={info} tone="success" />
      <MessageBanner text={error} />
    </Screen>
  );
}
