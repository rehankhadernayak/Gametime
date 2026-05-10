import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MobileButton } from '../../components/MobileButton';
import { MobileInput } from '../../components/MobileInput';
import { OneBitAsciiHeader } from '../../components/OneBitAsciiHeader';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import { getErrorMessage } from '../../utils/format';
import { ONE_BIT, monoFont } from '../../theme/oneBit';

const TITLE_FULL = 'CREATE ACCOUNT';

type AuthStackParamList = {
  Welcome: undefined;
  ParentLogin: undefined;
  ParentSignup: undefined;
  ChildLogin: undefined;
  LinkFamily: undefined;
  ApiSettings: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'ParentSignup'>;

export default function Signup({ navigation }: Props) {
  const { loginWithToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);

  useEffect(() => {
    if (titleIndex >= TITLE_FULL.length) return;
    const t = setTimeout(() => setTitleIndex((n) => n + 1), 42);
    return () => clearTimeout(t);
  }, [titleIndex]);

  async function signup() {
    setError('');
    setLoading(true);
    try {
      const normalized = { name: name.trim(), email: email.trim(), password };
      if (normalized.name.length < 2) throw new Error('Name must be at least 2 characters.');
      if (!normalized.email) throw new Error('Email is required.');
      if (normalized.password.length < 8) throw new Error('Password must be at least 8 characters.');
      const data = await apiRequest<{ token: string }>('/auth/signup', { method: 'POST', body: normalized });
      await loginWithToken(data.token);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const typedTitle = TITLE_FULL.slice(0, titleIndex);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <OneBitAsciiHeader
          routeLine="AUTH / SIGNUP"
          showBack={navigation.canGoBack()}
          onBack={() => navigation.goBack()}
        />

        <View style={[styles.block, styles.sepBottom]}>
          <Text style={[styles.typeTitle, { fontFamily: monoFont.bold }]}>
            {typedTitle}
            {titleIndex < TITLE_FULL.length ? '▌' : ''}
          </Text>
          <Text style={[styles.sub, { fontFamily: monoFont.regular }]}>
            Set up your parent account. Singapore families.
          </Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={[styles.errorRow, styles.sepBottom]}>
              <Text style={[styles.errorMsg, { fontFamily: monoFont.regular }]}>{error}</Text>
              <MobileButton variant="ghost" onPress={() => setError('')} textStyle={styles.dismissTxt}>
                [DISMISS]
              </MobileButton>
            </View>
          ) : null}

          <MobileInput
            label="Your name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            placeholder="e.g. Sarah Tan"
          />
          <MobileInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <MobileInput
            label="Password (min 8 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="••••••••"
          />

          <View style={styles.sepBottom} />
          <MobileButton onPress={signup} disabled={loading} variant="primary">
            {loading ? 'CREATING…' : 'CREATE ACCOUNT'}
          </MobileButton>

          <MobileButton
            variant="ghost"
            onPress={() => navigation.navigate('ParentLogin')}
            textStyle={styles.linkGhost}
          >
            ALREADY HAVE ACCOUNT? SIGN IN
          </MobileButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: ONE_BIT.bg },
  scrollContent: { flexGrow: 1, backgroundColor: ONE_BIT.bg },
  block: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: ONE_BIT.bg },
  sepBottom: {
    borderBottomWidth: ONE_BIT.borderWidth,
    borderBottomColor: ONE_BIT.borderColor,
  },
  typeTitle: {
    color: ONE_BIT.ink,
    fontSize: 22,
    letterSpacing: 1,
  },
  sub: {
    color: ONE_BIT.ink,
    fontSize: 12,
    marginTop: 8,
    opacity: 0.85,
    lineHeight: 18,
  },
  form: { padding: 16, gap: 14, backgroundColor: ONE_BIT.bg },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    marginBottom: 4,
  },
  errorMsg: { flex: 1, color: ONE_BIT.ink, fontSize: 12 },
  dismissTxt: { fontSize: 11, textTransform: 'none' },
  linkGhost: { fontSize: 12, textTransform: 'none', letterSpacing: 0 },
});
