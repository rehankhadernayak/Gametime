import { useEffect, useState } from 'react';
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
import { apiRequest, getApiUrl, getSuggestedApiUrl, setApiUrl } from '../api/client';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/format';

export default function ApiSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState('http://localhost:4000');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  useEffect(() => {
    getApiUrl().then(setUrl).catch(() => {});
  }, []);

  function showToast(msg, tone = 'success') {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  }

  async function save() {
    setSaveBusy(true);
    setError('');
    try {
      await setApiUrl(url);
      showToast('API URL saved.');
    } catch (e) { setError(getErrorMessage(e)); }
    setSaveBusy(false);
  }

  async function testConnection() {
    setTestBusy(true);
    setError('');
    try {
      const data = await apiRequest('/health');
      showToast(`Connected — ${data.timestamp}`);
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setTestBusy(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={colors.gradientHero} style={[styles.hero, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.heroTitle}>Connection Settings</Text>
          <Text style={styles.heroSub}>Point the app at your Gametime backend server</Text>
        </LinearGradient>

        <View style={[styles.card, { marginBottom: insets.bottom + 24 }]}>
          {toast ? (
            <View style={[styles.toast, toast.tone === 'error' && styles.toastError]}>
              <Text style={styles.toastText}>{toast.msg}</Text>
            </View>
          ) : null}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.detectedRow}>
            <Text style={styles.detectedLabel}>Auto-detected</Text>
            <TouchableOpacity style={styles.detectedBtn} onPress={() => setUrl(getSuggestedApiUrl())} activeOpacity={0.8}>
              <Text style={styles.detectedUrl}>{getSuggestedApiUrl()}</Text>
              <Text style={styles.detectedUse}>Use →</Text>
            </TouchableOpacity>
          </View>

          <InputField
            label="API Base URL"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.x.x:4000"
          />

          <View style={styles.twoCol}>
            <TouchableOpacity
              style={[styles.saveBtn, saveBusy && styles.btnDisabled]}
              onPress={save}
              disabled={saveBusy}
              activeOpacity={0.88}
            >
              <Text style={styles.saveBtnText}>{saveBusy ? 'Saving…' : 'Save URL'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.testBtn, testBusy && styles.btnDisabled]}
              onPress={testConnection}
              disabled={testBusy}
              activeOpacity={0.88}
            >
              <Text style={styles.testBtnText}>{testBusy ? 'Testing…' : 'Test Connection'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40, gap: 8 },
  heroIcon: { fontSize: 36, marginBottom: 4 },
  heroTitle: { color: '#000000', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  heroSub: { color: '#525252', fontSize: 14, textAlign: 'center' },

  card: {
    backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border,
    margin: 16, padding: 20, gap: 12, marginTop: -20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },

  toast: { backgroundColor: colors.secondary, borderRadius: 10, padding: 12 },
  toastError: { backgroundColor: colors.danger },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.errorSurface, borderRadius: 10, borderWidth: 1, borderColor: colors.danger + '44',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorClose: { color: colors.danger, fontSize: 16 },

  detectedRow: { gap: 4 },
  detectedLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  detectedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primarySurface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.primaryLight,
  },
  detectedUrl: { color: colors.primaryDark, fontSize: 13, fontWeight: '600', flex: 1 },
  detectedUse: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  twoCol: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  testBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primarySurface,
  },
  testBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
