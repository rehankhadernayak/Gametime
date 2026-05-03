import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { createChildSupabaseClient, getSupabaseChildTableName } from '../../lib/supabase';
import ParentalGateModal from '../settings/ParentalGateModal';
import { HAPTIC_PATTERNS } from '../../theme/kinetic-mobile-theme';

/** Kinetic Time Bank palette (cream + ink) */
const CREAM = '#F9F9F4';
const INK = '#1A1A1E';
const INK_MUTED = 'rgba(26, 26, 30, 0.55)';
const CARD_LINE = 'rgba(26, 26, 30, 0.08)';
const ERROR_BG = 'rgba(200, 48, 48, 0.08)';
const ERROR_BORDER = 'rgba(200, 48, 48, 0.35)';
const ERROR_TEXT = '#B42318';

type AuthStackParamList = {
  Welcome: undefined;
  LinkFamily: undefined;
  ChildLogin: undefined;
  ParentLogin: undefined;
  ParentSignup: undefined;
  ApiSettings: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

type Nav = NativeStackNavigationProp<AuthStackParamList, 'LinkFamily'>;

function isInviteExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  const t = new Date(expiresAt).getTime();
  return !Number.isFinite(t) || t <= Date.now();
}

export default function LinkFamilyScreen({ navigation }: { navigation: Nav }) {
  const insets = useSafeAreaInsets();
  const { token, user, refreshMe, markChildFamilyLinked } = useAuth();
  const childId =
    user && typeof user === 'object' && 'id' in user && typeof (user as { id?: unknown }).id === 'string'
      ? (user as { id: string }).id
      : '';

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const shakeX = useRef(new Animated.Value(0)).current;

  const onCodeChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (invalid) setInvalid(false);
  }, [invalid]);

  const runShake = useCallback(() => {
    shakeX.setValue(0);
    Animated.sequence(
      [-14, 12, -10, 8, -4, 0].map((toValue) =>
        Animated.timing(shakeX, {
          toValue,
          duration: 55,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [shakeX]);

  const triggerInvalid = useCallback(() => {
    setInvalid(true);
    runShake();
    HAPTIC_PATTERNS.error();
  }, [runShake]);

  const runLinkAfterGate = useCallback(async () => {
    if (code.length !== 6) {
      triggerInvalid();
      return;
    }
    if (!token || !childId) {
      Alert.alert('Session required', 'Sign in as a child first, then enter your family code.');
      return;
    }

    const supabase = createChildSupabaseClient(token);
    if (!supabase) {
      Alert.alert('Unavailable', 'Supabase is not configured in this build (URL / anon key).');
      return;
    }

    setBusy(true);
    setInvalid(false);
    try {
      const { data: invite, error: inviteErr } = await supabase
        .from('family_invites')
        .select('family_id, expires_at')
        .eq('code', code)
        .maybeSingle();

      if (inviteErr) {
        Alert.alert('Could not verify code', inviteErr.message);
        return;
      }

      if (!invite || isInviteExpired(invite.expires_at as string | undefined)) {
        triggerInvalid();
        return;
      }

      const familyId = String(invite.family_id ?? '').trim();
      if (!familyId) {
        triggerInvalid();
        return;
      }

      const childTable = getSupabaseChildTableName();
      const now = new Date().toISOString();
      const { error: updErr } = await supabase
        .from(childTable)
        .update({ family_id: familyId, updated_at: now })
        .eq('id', childId);

      if (updErr) {
        Alert.alert('Could not link account', updErr.message);
        return;
      }

      HAPTIC_PATTERNS.success();
      await markChildFamilyLinked();
      await refreshMe();
    } finally {
      setBusy(false);
    }
  }, [childId, code, markChildFamilyLinked, refreshMe, token, triggerInvalid]);

  const submit = useCallback(() => {
    if (code.length !== 6) {
      triggerInvalid();
      return;
    }
    setParentGateOpen(true);
  }, [code.length, triggerInvalid]);

  const onParentGateVerified = useCallback(() => {
    void runLinkAfterGate();
  }, [runLinkAfterGate]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#EDE9DC', CREAM]}
        style={[styles.gradient, { paddingTop: insets.top + 8, paddingBottom: 24 }]}
      >
        <Pressable
          onPress={() => navigation.navigate('Welcome')}
          style={({ pressed }) => [styles.backLink, pressed && styles.backLinkPressed]}
          hitSlop={12}
        >
          <Text style={styles.backLinkText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Join your family</Text>
        <Text style={styles.subtitle}>Ask a parent for the 6-digit code, then tap Submit.</Text>

        <Animated.View style={[styles.card, { transform: [{ translateX: shakeX }] }]}>
          <Text style={styles.label}>Family code</Text>
          <TextInput
            value={code}
              onChangeText={onCodeChange}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              editable={!busy}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              placeholder="000000"
              placeholderTextColor="rgba(26,26,30,0.25)"
              style={styles.codeInput}
              selectionColor={INK}
              returnKeyType="done"
              onSubmitEditing={submit}
          />

          {invalid ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Invalid code — check with a parent and try again.</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={busy || code.length !== 6}
            style={({ pressed }) => [
              styles.submit,
              (busy || code.length !== 6) && styles.submitDisabled,
              pressed && !(busy || code.length !== 6) && styles.submitPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={CREAM} />
            ) : (
              <Text style={styles.submitText}>Submit</Text>
            )}
          </Pressable>
        </Animated.View>
      </LinearGradient>

      <ParentalGateModal
        visible={parentGateOpen}
        title="Link this device to a family?"
        message="A parent should approve joining a new family. Solve the problem below to continue."
        onClose={() => setParentGateOpen(false)}
        onVerified={onParentGateVerified}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: CREAM },
  gradient: { flex: 1, paddingHorizontal: 22 },
  backLink: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12, marginBottom: 8 },
  backLinkPressed: { opacity: 0.6 },
  backLinkText: { fontSize: 15, fontWeight: '700', color: INK_MUTED },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, lineHeight: 22, color: INK_MUTED, marginBottom: 28 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: CARD_LINE,
    ...Platform.select({
      ios: {
        shadowColor: INK,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: { elevation: 3 },
    }),
  },
  label: { fontSize: 13, fontWeight: '700', color: INK_MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  codeInput: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 10,
    color: INK,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(26,26,30,0.12)',
    backgroundColor: 'rgba(249,249,244,0.9)',
    marginBottom: 14,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: ERROR_BG,
    borderWidth: 1,
    borderColor: ERROR_BORDER,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  errorText: { color: ERROR_TEXT, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  submit: {
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitPressed: { opacity: 0.92 },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: CREAM, fontSize: 16, fontWeight: '800' },
});
