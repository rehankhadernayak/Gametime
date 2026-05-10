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
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/format';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function PinDots({ pin }) {
  return (
    <View style={pinStyles.row}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[pinStyles.dot, pin.length > i && pinStyles.dotFilled]} />
      ))}
    </View>
  );
}

function PinKey({ label, onPress, variant }) {
  if (variant === 'empty') return <View style={pinStyles.key} />;
  return (
    <TouchableOpacity
      testID={variant === 'delete' ? 'child-pin-delete' : `child-pin-key-${label}`}
      style={[pinStyles.key, variant === 'delete' && pinStyles.keyDelete]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <Text style={[pinStyles.keyText, variant === 'delete' && pinStyles.keyDeleteText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const pinStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 16 },
  dot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.childAccent,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: colors.childAccent },
  key: {
    width: 76, height: 60, borderRadius: 14,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  keyDelete: { backgroundColor: colors.errorSurface, borderColor: colors.danger + '44' },
  keyText: { fontSize: 24, fontWeight: '700', color: colors.text },
  keyDeleteText: { fontSize: 22, color: colors.danger },
});

export default function ChildLoginScreen() {
  const { loginWithToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('pin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [parentEmail, setParentEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [pin, setPin] = useState('');

  function appendPin(digit) {
    if (pin.length < 4) setPin((p) => p + digit);
  }

  async function submit() {
    setError('');
    setLoading(true);
    try {
      if (mode === 'email') {
        const normalizedEmail = email.trim();
        if (!normalizedEmail || !password) throw new Error('Email and password are required.');
        if (!isValidEmail(normalizedEmail)) throw new Error('Enter a valid email address.');
      } else {
        const ne = parentEmail.trim();
        const nc = childName.trim();
        if (!ne || !nc || !pin) throw new Error('Parent email, child name, and PIN are required.');
        if (!isValidEmail(ne)) throw new Error('Enter a valid parent email.');
        if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits.');
      }

      const data = await apiRequest(
        mode === 'email' ? '/auth/child-login-direct' : '/auth/child-login-pin',
        {
          method: 'POST',
          body: mode === 'email'
            ? { email: email.trim(), password }
            : { parentEmail: parentEmail.trim(), childName: childName.trim(), pin },
        }
      );
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
        {/* Header */}
        <View style={[styles.hero, { paddingTop: insets.top + 36 }]}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>GT</Text>
          </View>
          <Text style={styles.heroTitle}>Child Login</Text>
          <Text style={styles.heroSub}>Sign in to see your tasks and rewards</Text>

          {/* Mode tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'pin' && styles.tabActive]}
              onPress={() => setMode('pin')}
            >
              <Text style={[styles.tabLabel, mode === 'pin' && styles.tabLabelActive]}>PIN (ages 6–9)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'email' && styles.tabActive]}
              onPress={() => setMode('email')}
            >
              <Text style={[styles.tabLabel, mode === 'email' && styles.tabLabelActive]}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form card */}
        <View style={[styles.card, { marginBottom: insets.bottom + 24 }]}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
            </View>
          ) : null}

          {mode === 'pin' ? (
            <>
              <InputField
                testID="child-login-parent-email"
                label="Parent Email"
                value={parentEmail}
                onChangeText={setParentEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="mum@example.com"
              />
              <InputField
                testID="child-login-child-name"
                label="Your Name"
                value={childName}
                onChangeText={setChildName}
                placeholder="e.g. Alex"
              />

              <PinDots pin={pin} />

              {/* Numpad */}
              <View style={styles.numpad}>
                {['1','2','3','4','5','6','7','8','9'].map((d) => (
                  <PinKey key={d} label={d} onPress={() => appendPin(d)} />
                ))}
                <PinKey variant="empty" />
                <PinKey label="0" onPress={() => appendPin('0')} />
                <PinKey label="⌫" variant="delete" onPress={() => setPin((p) => p.slice(0, -1))} />
              </View>
            </>
          ) : (
            <>
              <InputField
                label="Child Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <InputField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          )}

          <TouchableOpacity
            testID="child-login-submit"
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Text style={styles.submitBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
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
    paddingBottom: 36,
    gap: 8,
    backgroundColor: colors.bgRoot,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
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
  logoEmoji: { fontSize: 30, color: '#000000' },
  heroTitle: { color: '#000000', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  heroSub: { color: '#525252', fontSize: 14 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 0,
    padding: 4,
    marginTop: 12,
    gap: 4,
    borderWidth: 2,
    borderColor: '#000000',
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 0,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#000000' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#404040' },
  tabLabelActive: { color: '#FFFFFF' },

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
    backgroundColor: colors.errorSurface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.danger + '44',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorClose: { color: colors.danger, fontSize: 16 },

  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 4,
  },

  submitBtn: {
    backgroundColor: colors.childAccent,
    borderRadius: 0,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 2,
    borderColor: '#000000',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
