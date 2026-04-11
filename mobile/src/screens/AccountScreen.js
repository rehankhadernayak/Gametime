import { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
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
import { apiRequest, getApiUrl, getSuggestedApiUrl, setApiUrl } from '../api/client';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/format';

export default function AccountScreen() {
  const { role, user, token, refreshMe, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const isParent = role === 'parent';

  const [apiUrl, setApiUrlState] = useState('http://localhost:4000');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [showConnection, setShowConnection] = useState(false);

  useEffect(() => {
    getApiUrl().then(setApiUrlState).catch(() => {});
  }, []);

  function showToast(msg, tone = 'success') {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRefreshProfile() {
    setRefreshBusy(true);
    setError('');
    try {
      await refreshMe();
      showToast('Profile refreshed.');
    } catch (e) { setError(getErrorMessage(e)); }
    setRefreshBusy(false);
  }

  async function handleSaveUrl() {
    setSaveBusy(true);
    setError('');
    try {
      await setApiUrl(apiUrl);
      showToast('API URL saved.');
    } catch (e) { setError(getErrorMessage(e)); }
    setSaveBusy(false);
  }

  async function handleTestConnection() {
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

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  const gradientColors = isParent ? ['#3B5BDB', '#2F4AC0'] : ['#7C3AED', '#6D28D9'];
  const accentColor = isParent ? colors.primary : colors.childAccent;
  const initial = (user?.name || '?').charAt(0).toUpperCase();

  const balanceItems = [
    ...(typeof user?.pointsBalance === 'number' ? [{ label: 'RP', value: user.pointsBalance, color: isParent ? colors.primary : colors.childAccent }] : []),
    ...(typeof user?.giftcardPointsBalance === 'number' ? [{ label: 'GP', value: user.giftcardPointsBalance, color: colors.xpGold }] : []),
    ...(typeof user?.gpBalance === 'number' ? [{ label: 'GP Wallet', value: user.gpBalance, color: colors.xpGold }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={gradientColors} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {/* Avatar */}
        <View style={styles.avatarRing}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        </View>

        <Text style={styles.profileName}>{user?.name || '—'}</Text>
        {user?.email ? <Text style={styles.profileEmail}>{user.email}</Text> : null}

        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{isParent ? '👨‍👩‍👧 Parent' : '👦 Child'}</Text>
        </View>

        {/* Balance chips */}
        {balanceItems.length > 0 ? (
          <View style={styles.balanceRow}>
            {balanceItems.map((b) => (
              <View key={b.label} style={styles.balanceChip}>
                <Text style={[styles.balanceValue, { color: b.color === colors.xpGold ? '#FCD34D' : '#fff' }]}>{b.value}</Text>
                <Text style={styles.balanceLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Toast */}
        {toast ? (
          <View style={[styles.toast, toast.tone === 'error' && styles.toastError]}>
            <Text style={styles.toastText}>{toast.msg}</Text>
          </View>
        ) : null}

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
          </View>
        ) : null}

        {/* Profile actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <InfoRow label="Name" value={user?.name || '—'} />
          {user?.email ? <InfoRow label="Email" value={user.email} /> : null}
          <InfoRow label="Role" value={isParent ? 'Parent' : 'Child'} />

          <TouchableOpacity
            style={[styles.actionRow, refreshBusy && { opacity: 0.6 }]}
            onPress={handleRefreshProfile}
            disabled={refreshBusy}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionLabel}>{refreshBusy ? 'Refreshing…' : 'Refresh profile'}</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Backend connection */}
        <TouchableOpacity
          style={styles.section}
          onPress={() => setShowConnection((v) => !v)}
          activeOpacity={0.9}
        >
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Backend Connection</Text>
            <Text style={[styles.actionChevron, showConnection && styles.chevronOpen]}>›</Text>
          </View>
        </TouchableOpacity>

        {showConnection ? (
          <View style={styles.connectionPanel}>
            <InputField
              label="API Base URL"
              value={apiUrl}
              onChangeText={setApiUrlState}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={() => setApiUrlState(getSuggestedApiUrl())}
            >
              <Text style={styles.smallBtnText}>Use detected: {getSuggestedApiUrl()}</Text>
            </TouchableOpacity>
            <View style={styles.twoCol}>
              <TouchableOpacity
                style={[styles.colBtn, { backgroundColor: accentColor }, saveBusy && { opacity: 0.6 }]}
                onPress={handleSaveUrl}
                disabled={saveBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.colBtnText}>{saveBusy ? '…' : 'Save URL'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.colBtn, styles.colBtnOutline, testBusy && { opacity: 0.6 }]}
                onPress={handleTestConnection}
                disabled={testBusy}
                activeOpacity={0.85}
              >
                <Text style={[styles.colBtnText, { color: accentColor }]}>{testBusy ? 'Testing…' : 'Test'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutRow} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.signOutIcon}>🚪</Text>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center', gap: 8 },
  avatarRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 34, fontWeight: '900' },
  profileName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  rolePillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  balanceChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  balanceValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  content: { padding: 16, gap: 12 },

  toast: { backgroundColor: colors.secondary, borderRadius: 12, padding: 12 },
  toastError: { backgroundColor: colors.danger },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.errorSurface, borderRadius: 12, borderWidth: 1, borderColor: colors.danger + '44',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorClose: { color: colors.danger, fontSize: 16 },

  // Section card
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 2,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: { color: colors.textMuted, fontSize: 14 },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '600' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
    marginTop: 4,
  },
  actionIcon: { fontSize: 18 },
  actionLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  actionChevron: { color: colors.textMuted, fontSize: 20, fontWeight: '300' },
  chevronOpen: { transform: [{ rotate: '90deg' }] },

  // Connection panel
  connectionPanel: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    marginTop: -8,
  },
  smallBtn: {
    backgroundColor: colors.surface2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  smallBtnText: { color: colors.textSecondary, fontSize: 12 },
  twoCol: { flexDirection: 'row', gap: 10 },
  colBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  colBtnOutline: { borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  colBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Sign out
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.errorSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger + '33',
    padding: 16,
  },
  signOutIcon: { fontSize: 20 },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
