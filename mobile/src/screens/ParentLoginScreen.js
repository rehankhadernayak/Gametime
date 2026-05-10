import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InputField from '../components/InputField';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/format';

export default function ParentLoginScreen({ navigation }) {
  const { loginWithToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const normalized = { email: email.trim(), password };
      if (!normalized.email || !normalized.password) throw new Error('Email and password are required.');
      const data = await apiRequest('/auth/login', { method: 'POST', body: normalized });
      await loginWithToken(data.token);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Gradient header */}
        <LinearGradient colors={colors.gradientHero} style={[styles.hero, { paddingTop: insets.top + 48 }]}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>GT</Text>
          </View>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSub}>Sign in to manage your family</Text>
        </LinearGradient>

        {/* Form card */}
        <View style={[styles.card, { marginBottom: insets.bottom + 24 }]}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
            </View>
          ) : null}

          <InputField
            testID="parent-login-email"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <InputField
            testID="parent-login-password"
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            testID="parent-login-submit"
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Text style={styles.submitBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </TouchableOpacity>

          <View style={styles.links}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ParentSignup')}>
              <Text style={styles.link}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 8,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 8,
  },
  logoEmoji: { fontSize: 30, color: '#000000', fontWeight: '800' },
  heroTitle: { color: '#000000', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  heroSub: { color: '#525252', fontSize: 14 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    margin: 16,
    padding: 20,
    gap: 12,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.errorSurface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.danger + '44',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorClose: { color: colors.danger, fontSize: 16 },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600', paddingVertical: 4 },
});
