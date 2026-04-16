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
import { apiRequest } from '../api/client';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/format';

export default function ResetPasswordScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState(route?.params?.token || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!token.trim()) { setError('Enter the reset token from your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', { method: 'POST', body: { token: token.trim(), password } });
      setDone(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LinearGradient colors={['#22C55E', '#16A34A']} style={[styles.hero, { paddingTop: insets.top + 48, paddingBottom: 60 }]}>
          <Text style={styles.doneIcon}>Done</Text>
          <Text style={styles.heroTitle}>Password updated!</Text>
        </LinearGradient>
        <View style={[styles.card, { marginBottom: insets.bottom + 24 }]}>
          <Text style={styles.doneMessage}>
            Your password has been changed. You can now sign in with your new password.
          </Text>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.secondary }]} onPress={() => navigation.navigate('ParentLogin')} activeOpacity={0.88}>
            <Text style={styles.submitBtnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#3B5BDB', '#2F4AC0']} style={[styles.hero, { paddingTop: insets.top + 48 }]}>
          <Text style={styles.heroTitle}>New password</Text>
          <Text style={styles.heroSub}>Enter the reset token from your email</Text>
        </LinearGradient>

        <View style={[styles.card, { marginBottom: insets.bottom + 24 }]}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
            </View>
          ) : null}

          <InputField
            label="Reset token (from email)"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Paste token from email"
          />
          <InputField
            label="New password (min 8 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <InputField
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Text style={styles.submitBtnText}>{loading ? 'Setting password…' : 'Set New Password'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.backLinkText}>Request a new reset link</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40, gap: 8 },
  heroIcon: { fontSize: 40, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.78)', fontSize: 14, textAlign: 'center' },
  doneIcon: { fontSize: 56 },
  doneMessage: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border,
    margin: 16, padding: 20, gap: 12, marginTop: -20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
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
