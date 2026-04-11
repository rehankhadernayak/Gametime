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

export default function ParentSignupScreen({ navigation }) {
  const { loginWithToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function signup() {
    setError('');
    setLoading(true);
    try {
      const normalized = { name: name.trim(), email: email.trim(), password };
      if (normalized.name.length < 2) throw new Error('Name must be at least 2 characters.');
      if (!normalized.email) throw new Error('Email is required.');
      if (normalized.password.length < 8) throw new Error('Password must be at least 8 characters.');
      const data = await apiRequest('/auth/signup', { method: 'POST', body: normalized });
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
        <LinearGradient colors={['#3B5BDB', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 40 }]}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🎮</Text>
          </View>
          <Text style={styles.heroTitle}>Create account</Text>
          <Text style={styles.heroSub}>Set up your parent account to get started</Text>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>Singapore families 🇸🇬</Text>
          </View>
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
            label="Your name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            placeholder="e.g. Sarah Tan"
          />
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <InputField
            label="Password (min 8 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={signup}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Text style={styles.submitBtnText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signinLink} onPress={() => navigation.navigate('ParentLogin')}>
            <Text style={styles.signinLinkText}>Already have an account? <Text style={styles.signinLinkBold}>Sign in</Text></Text>
          </TouchableOpacity>
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
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 8,
  },
  logoEmoji: { fontSize: 30 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.78)', fontSize: 14, textAlign: 'center' },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  heroPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },

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

  signinLink: { alignItems: 'center', paddingVertical: 4 },
  signinLinkText: { color: colors.textMuted, fontSize: 14 },
  signinLinkBold: { color: colors.primary, fontWeight: '700' },
});
