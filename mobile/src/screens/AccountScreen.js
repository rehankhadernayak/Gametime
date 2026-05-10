import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileButton } from '../components/MobileButton';
import { MobileInput } from '../components/MobileInput';
import { useAuth } from '../context/AuthContext';
import { apiRequest, getApiUrl, getSuggestedApiUrl, setApiUrl } from '../api/client';
import { getErrorMessage } from '../utils/format';
import ParentalGateModal from './settings/ParentalGateModal';
import { ONE_BIT } from '../theme/oneBit';
import { MonoBold, MonoReg } from '../styles/global';

export default function AccountScreen() {
  const { role, user, token, refreshMe, logout, clearLocalGametimeData } = useAuth();
  const insets = useSafeAreaInsets();
  const isParent = role === 'parent';

  const [apiUrl, setApiUrlState] = useState('http://localhost:4000');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [childGateOpen, setChildGateOpen] = useState(false);
  const [childGateAction, setChildGateAction] = useState(null);

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
      showToast('PROFILE_REFRESHED');
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setRefreshBusy(false);
  }

  async function handleSaveUrl() {
    setSaveBusy(true);
    setError('');
    try {
      await setApiUrl(apiUrl);
      showToast('API_URL_SAVED');
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setSaveBusy(false);
  }

  async function handleTestConnection() {
    setTestBusy(true);
    setError('');
    try {
      const data = await apiRequest('/health');
      showToast(`CONNECTED_${data.timestamp}`);
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setTestBusy(false);
  }

  async function handleLogout() {
    if (isParent) {
      Alert.alert('Sign out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]);
      return;
    }
    setChildGateAction('signout');
    setChildGateOpen(true);
  }

  function handleChildGateVerified() {
    if (childGateAction === 'delete') {
      void clearLocalGametimeData().then(() => showToast('DEVICE_DATA_CLEARED'));
    } else {
      logout();
    }
    setChildGateAction(null);
  }

  const balanceItems = [
    ...(typeof user?.pointsBalance === 'number' ? [{ label: 'RP', value: user.pointsBalance }] : []),
    ...(typeof user?.giftcardPointsBalance === 'number'
      ? [{ label: 'GP', value: user.giftcardPointsBalance }]
      : []),
    ...(typeof user?.gpBalance === 'number' ? [{ label: 'GP_WALLET', value: user.gpBalance }] : []),
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshBusy} onRefresh={handleRefreshProfile} tintColor={ONE_BIT.ink} />
        }
      >
        <Text style={[styles.screenTitle, MonoBold]}>/// SETTINGS /// PROFILE ///</Text>

        {toast ? (
          <View style={[styles.toast, toast.tone === 'error' && styles.toastError]}>
            <Text style={[styles.toastText, MonoBold]}>{toast.msg}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={[styles.errorText, MonoReg]}>{error}</Text>
            <Pressable onPress={() => setError('')} hitSlop={12}>
              <Text style={[styles.errorClose, MonoBold]}>×</Text>
            </Pressable>
          </View>
        ) : null}

        <SettingsRow label="NAME" value={(user?.name || '—').toUpperCase()} />
        {user?.email ? <SettingsRow label="EMAIL" value={user.email.toUpperCase()} /> : null}
        <SettingsRow label="ROLE" value={(isParent ? 'PARENT' : 'CHILD')} />

        {balanceItems.map((b) => (
          <SettingsRow key={b.label} label={b.label} value={String(b.value)} />
        ))}

        <Pressable
          style={[styles.row, refreshBusy && styles.rowDisabled]}
          onPress={handleRefreshProfile}
          disabled={refreshBusy}
        >
          <Text style={[styles.rowLabel, MonoBold]}>{refreshBusy ? 'REFRESHING…' : 'REFRESH_PROFILE'}</Text>
          <Text style={[styles.rowChevron, MonoBold]}>›</Text>
        </Pressable>

        <Pressable style={styles.row} onPress={() => setShowConnection((v) => !v)}>
          <Text style={[styles.rowLabel, MonoBold]}>BACKEND_CONNECTION</Text>
          <Text style={[styles.rowChevron, MonoBold, showConnection && styles.chevronOpen]}>›</Text>
        </Pressable>

        {showConnection ? (
          <View style={styles.connectionBlock}>
            <MobileInput
              label="API_BASE_URL"
              value={apiUrl}
              onChangeText={setApiUrlState}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <MobileButton variant="ghost" onPress={() => setApiUrlState(getSuggestedApiUrl())}>
              USE_DETECTED_URL
            </MobileButton>
            <Text style={[styles.detectedHint, MonoReg]}>{getSuggestedApiUrl()}</Text>
            <View style={styles.connectionActions}>
              <MobileButton
                variant="primary"
                disabled={saveBusy}
                onPress={handleSaveUrl}
                style={styles.connBtn}
              >
                {saveBusy ? 'SAVING…' : 'SAVE_URL'}
              </MobileButton>
              <MobileButton
                variant="secondary"
                disabled={testBusy}
                onPress={handleTestConnection}
                style={styles.connBtn}
              >
                {testBusy ? 'TESTING…' : 'TEST'}
              </MobileButton>
            </View>
          </View>
        ) : null}

        {!isParent ? (
          <>
            <Text style={[styles.gateHint, MonoReg]}>
              SIGN_OUT_AND_REMOVE_DATA_ARE_PROTECTED_SO_ACCIDENTAL_TAPS_DO_NOT_LOG_YOU_OUT.
            </Text>
            <Pressable
              style={styles.row}
              onPress={() => {
                setChildGateAction('delete');
                setChildGateOpen(true);
              }}
            >
              <Text style={[styles.rowLabel, MonoBold]}>DELETE_DATA_ON_THIS_DEVICE</Text>
              <Text style={[styles.rowChevron, MonoBold]}>›</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.logoutBar,
          {
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <MobileButton
          variant="secondary"
          onPress={handleLogout}
          style={styles.logoutBtn}
          textStyle={styles.logoutBtnText}
        >
          SYSTEM_LOGOUT
        </MobileButton>
      </View>

      <ParentalGateModal
        visible={childGateOpen}
        title={childGateAction === 'delete' ? 'Remove Gametime from this device?' : 'Sign out?'}
        message={
          childGateAction === 'delete'
            ? 'A parent should be nearby. This signs you out and clears saved login on this device only.'
            : 'Solve the problem below to sign out — ask a parent if you need help.'
        }
        onClose={() => {
          setChildGateOpen(false);
          setChildGateAction(null);
        }}
        onVerified={handleChildGateVerified}
      />
    </View>
  );
}

function SettingsRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, MonoBold]}>{label}</Text>
      <Text style={[styles.rowValue, MonoBold]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ONE_BIT.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 0,
  },
  screenTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
    color: ONE_BIT.ink,
  },
  toast: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    padding: 12,
    marginBottom: 12,
    backgroundColor: ONE_BIT.bg,
  },
  toastError: {
    borderStyle: 'dashed',
  },
  toastText: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: ONE_BIT.ink,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: ONE_BIT.ink,
  },
  errorClose: {
    fontSize: 18,
    color: ONE_BIT.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowLabel: {
    flex: 1,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: ONE_BIT.ink,
  },
  rowValue: {
    flex: 1,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'right',
    color: ONE_BIT.ink,
  },
  rowChevron: {
    fontSize: 20,
    fontWeight: '300',
    color: ONE_BIT.ink,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  connectionBlock: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    gap: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  detectedHint: {
    fontSize: 10,
    letterSpacing: 0.3,
    color: ONE_BIT.ink,
    opacity: 0.75,
  },
  connectionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  connBtn: {
    flex: 1,
    paddingVertical: 12,
    minHeight: 48,
  },
  gateHint: {
    fontSize: 10,
    letterSpacing: 0.3,
    lineHeight: 15,
    marginTop: 16,
    marginBottom: 8,
    color: ONE_BIT.ink,
    opacity: 0.8,
  },
  logoutBar: {
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: ONE_BIT.bg,
  },
  logoutBtn: {
    minHeight: 64,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: ONE_BIT.ink,
    backgroundColor: ONE_BIT.bg,
  },
  logoutBtnText: {
    fontSize: 15,
    letterSpacing: 0.8,
  },
});
