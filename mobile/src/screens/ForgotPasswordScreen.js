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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InputField from '../components/InputField';
import { apiRequest } from '../api/client';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/format';

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    const trimmed = email.trim();
    if (!trimmed) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await apiRequest('/auth/forgot-password', { method: 'POST', body: { email: trimmed } });
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.hero, { paddingTop: insets.top + 48, paddingBottom: 60 }]}>
          <Text style={styles.sentIconLg}>Email sent</Text>
          <Text style={styles.heroTitle}>Check your email</Text>
        </View>
        <View style={[styles.card, { marginBottom: insets.bottom + 24 }]}>
          <Text style={styles.sentMessage}>
            If <Text style={styles.sentEmailBold}>{email.trim()}</Text> is registered, we've sent a password reset link. Check your inbox and spam folder.
          </Text>
          <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.navigate('ParentLogin')} activeOpacity={0.88}>
            <Text style={styles.submitBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 48 }]}>
          <Text style={styles.heroIcon}>Reset</Text>
          <Text style={styles.heroTitle}>Reset password</Text>
          <Text style={styles.heroSub}>Enter your email and we'll send a reset link</Text>
        </View>

        <View style={[styles.card, { marginBottom: insets.bottom + 24 }]}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
            </View>
          ) : null}

          <InputField
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="your@email.com"
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Text style={styles.submitBtnText}>{loading ? 'Sending…' : 'Send Reset Link'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>← Back to login</Text>
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
    backgroundColor: colors.bgRoot,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  heroIcon: { fontSize: 40, marginBottom: 4 },
  heroTitle: { color: '#000000', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  heroSub: { color: '#525252', fontSize: 14, textAlign: 'center' },
  sentIconLg: { fontSize: 56 },
  sentMessage: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  sentEmailBold: { color: colors.primary, fontWeight: '700' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    margin: 16,
    padding: 20,
    gap: 12,
    marginTop: -20,
    elevation: 0,
    shadowOpacity: 0,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.errorSurface, borderRadius: 10, borderWidth: 1, borderColor: colors.danger + '44',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorClose: { color: colors.danger, fontSize: 16 },

  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  backLink: { alignItems: 'center', paddingVertical: 4 },
  backLinkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
