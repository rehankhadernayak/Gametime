import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { apiRequest } from '../api/client';
import { ONE_BIT, monoFont } from '../theme/oneBit';

export function googleSsoEnvConfigured() {
  const w = String(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
  const i = String(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '').trim();
  const a = String(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '').trim();
  return Boolean(w || i || a);
}

/**
 * Native Google SSO — ID token from expo-auth-session (code exchange on iOS/Android).
 * @param {{ role: 'parent' | 'child'; parentIntent?: 'signin' | 'signup'; loginWithToken: (t: string) => Promise<void>; onError: (m: string) => void; disabled?: boolean }} props
 */
export default function GametimeGoogleSsoBlock({ role, parentIntent, loginWithToken, onError, disabled }) {
  const [busy, setBusy] = useState(false);
  const web = String(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
  const ios = String(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '').trim();
  const android = String(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '').trim();

  const webClientId = useMemo(() => web || ios || android, [web, ios, android]);

  const [request, result, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    iosClientId: ios || web || undefined,
    androidClientId: android || web || undefined,
  });

  const handledIdToken = useRef('');

  useEffect(() => {
    if (!result || result.type !== 'success') return;
    const idToken = result.params?.id_token;
    if (!idToken) {
      onError('Google did not return an ID token.');
      return;
    }
    if (handledIdToken.current === idToken) return;
    handledIdToken.current = idToken;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const body = { role, idToken };
        if (role === 'parent') body.intent = parentIntent;
        const data = await apiRequest('/auth/google', { method: 'POST', body });
        if (!cancelled) await loginWithToken(data.token);
      } catch (e) {
        if (!cancelled) onError(e?.message || 'Google sign-in failed');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result, role, parentIntent, loginWithToken, onError]);

  const ready = Boolean(request) && googleSsoEnvConfigured();

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, (disabled || busy || !ready) && styles.btnDisabled]}
        onPress={() => promptAsync()}
        disabled={disabled || busy || !ready}
        activeOpacity={0.85}
      >
        <View style={styles.gWrap}>
          <Text style={styles.gText}>G</Text>
        </View>
        <Text style={[styles.btnLabel, { fontFamily: monoFont.bold }]}>CONTINUE WITH GOOGLE</Text>
      </TouchableOpacity>
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={[styles.orText, { fontFamily: monoFont.bold }]}>OR</Text>
        <View style={styles.orLine} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    backgroundColor: ONE_BIT.bg,
    borderRadius: 0,
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.45 },
  gWrap: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: ONE_BIT.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gText: { fontSize: 14, fontWeight: '900', color: ONE_BIT.ink },
  btnLabel: { color: ONE_BIT.ink, fontSize: 12, letterSpacing: 1 },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  orLine: { flex: 1, height: 2, backgroundColor: ONE_BIT.ink },
  orText: { fontSize: 10, letterSpacing: 2, color: ONE_BIT.ink },
});
