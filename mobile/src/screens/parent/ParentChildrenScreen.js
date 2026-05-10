import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, getApiUrl } from '../../api/client';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { getErrorMessage, sanitizeText } from '../../utils/format';
import { DEFAULT_PARENT_SETTINGS, loadParentSettings, saveParentSettings } from '../../utils/parentSettings';
import { normalizeTasksListResponse } from '../../utils/tasksList.js';
import { childTelemetry } from '../../utils/oneBitTelemetry.js';
import BrutalistBox from '../../components/ui/BrutalistBox';
import BrutalistHeader from '../../components/ui/BrutalistHeader';
import MobileButton from '../../components/ui/MobileButton';
import StatusLine from '../../components/ui/StatusLine';
import { ONE_BIT } from '../../components/ui/oneBitTheme';

function getAgeYears(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

const initialForm = { name: '', dateOfBirth: '', email: '', password: '', pin: '' };

export default function ParentChildrenScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, loginWithToken, logout } = useAuth();
  const [children, setChildren]             = useState([]);
  const [tasks, setTasks]                   = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [uploadingChildId, setUploadingChildId] = useState(null);
  const [apiBase, setApiBase]               = useState('');
  const [message, setMessage]               = useState('');
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [showAddForm, setShowAddForm]       = useState(false);
  const [showSettings, setShowSettings]     = useState(false);
  const [form, setForm]                     = useState(initialForm);
  const [parentSettings, setParentSettings] = useState(DEFAULT_PARENT_SETTINGS);
  const [deleteGateOpen, setDeleteGateOpen] = useState(false);
  const [deletePasswordOpen, setDeletePasswordOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadChildren = useCallback(async () => {
    const [list, taskListRaw, sessions] = await Promise.all([
      apiRequest('/children/list', { token }),
      apiRequest('/tasks/list', { token }),
      apiRequest('/gaming/sessions/audit?limit=20', { token }).catch(() => [])
    ]);
    setChildren(list);
    setTasks(normalizeTasksListResponse(taskListRaw).tasks);
    setActiveSessions(Array.isArray(sessions) ? sessions.filter((s) => s.status === 'Started') : []);
  }, [token]);

  useEffect(() => {
    loadChildren().catch((e) => setError(getErrorMessage(e)));
    getApiUrl().then(setApiBase).catch(() => {});
    loadParentSettings().then(setParentSettings).catch(() => {});
  }, [loadChildren]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadChildren(); } catch (e) { setError(getErrorMessage(e)); }
    finally { setRefreshing(false); }
  }

  async function uploadAvatar(childId) {
    setMessage(''); setError('');
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Media library permission required.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setUploadingChildId(childId);
      const mime = asset.mimeType || 'image/jpeg';
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      await apiRequest(`/children/${childId}/avatar`, {
        method: 'POST', token,
        body: { avatarData: `data:${mime};base64,${base64}`, avatarMime: mime }
      });
      setMessage("Avatar updated!");
      await loadChildren();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setUploadingChildId(null); }
  }

  async function switchToChild(childId, childName) {
    setError('');
    try {
      const data = await apiRequest('/auth/child-login', { method: 'POST', token, body: { childId } });
      await loginWithToken(data.token);
    } catch (e) { setError(getErrorMessage(e)); }
  }

  async function createChild() {
    setLoading(true); setMessage(''); setError('');
    try {
      const name = sanitizeText(form.name);
      const dateOfBirth = form.dateOfBirth.trim();
      const email = form.email.trim().toLowerCase();
      const password = form.password;
      const pin = form.pin.trim();
      if (!name) throw new Error('Child name is required.');
      const parsedDob = new Date(dateOfBirth);
      if (!dateOfBirth || Number.isNaN(parsedDob.getTime()))
        throw new Error('Date of birth must be a valid date (YYYY-MM-DD).');
      const age = getAgeYears(dateOfBirth);
      if (age < 6 || age > 13) throw new Error('Child age must be between 6 and 13 years.');
      const hasEmail = Boolean(email);
      const hasPassword = Boolean(password);
      const hasPin = Boolean(pin);
      if (hasEmail !== hasPassword) throw new Error('Email and password must be provided together.');
      if (hasPin && !/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits.');
      if (age <= 9 && !hasPin && !(hasEmail && hasPassword))
        throw new Error('For younger children, provide PIN or email/password.');
      if (age > 9 && (!hasEmail || !hasPassword))
        throw new Error('For children age 10+, email and password are required.');
      if (age > 9 && hasPin) throw new Error('PIN mode is for younger children only (age 9 and below).');
      await apiRequest('/children/create', {
        method: 'POST', token,
        body: { name, dateOfBirth, email: hasEmail ? email : null, password: hasPassword ? password : null, pin: hasPin ? pin : null }
      });
      setMessage(`${name} added!`);
      setForm(initialForm);
      setShowAddForm(false);
      await loadChildren();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }

  async function confirmDeleteFamilyAccount() {
    setDeleteBusy(true);
    setError('');
    try {
      await apiRequest('/auth/account', { method: 'DELETE', token, body: { password: deletePassword } });
      setDeletePasswordOpen(false);
      setDeletePassword('');
      await logout();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  }

  async function saveSettings() {
    setMessage(''); setError('');
    const points = Number(parentSettings.defaultTaskPoints);
    if (!Number.isInteger(points) || points < 5 || points > 50) {
      setError('Default task points must be between 5 and 50.');
      return;
    }
    try {
      const saved = await saveParentSettings({ ...parentSettings, defaultTaskPoints: points });
      setParentSettings(saved);
      setMessage('Settings saved.');
    } catch (e) { setError(getErrorMessage(e)); }
  }

  const fabBottom = insets.bottom + 16;
  const scrollBottomPad = fabBottom + 64;

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ONE_BIT.ink} />}
      >
      <Modal
        visible={deleteGateOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !deleteBusy && setDeleteGateOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete your family account?</Text>
            <Text style={styles.modalBody}>
              This action is permanent. It will remove every child profile, all task history, and unused playtime
              minutes for your household.
            </Text>
            <Text style={styles.modalCompliance}>
              All data will be removed from our servers within 24 hours to comply with privacy regulations.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setDeleteGateOpen(false)}
                disabled={deleteBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={() => {
                  setDeleteGateOpen(false);
                  setDeletePassword('');
                  setDeletePasswordOpen(true);
                }}
                disabled={deleteBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnDangerText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deletePasswordOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !deleteBusy && setDeletePasswordOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm deletion</Text>
            <Text style={styles.modalBody}>
              Enter your parent account password to permanently delete your family account.
            </Text>
            <InputField
              label="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.modalCompliance}>
              All data will be removed from our servers within 24 hours to comply with privacy regulations.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => {
                  if (deleteBusy) return;
                  setDeletePasswordOpen(false);
                  setDeletePassword('');
                }}
                disabled={deleteBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDanger, deleteBusy && styles.modalBtnDisabled]}
                onPress={confirmDeleteFamilyAccount}
                disabled={deleteBusy || !deletePassword.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnDangerText}>{deleteBusy ? 'Deleting…' : 'Delete forever'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <BrutalistHeader title="FAMILY_NODES" />
          <Text style={styles.headerSub}>
            {children.length} NODE{children.length !== 1 ? 'S' : ''}_REGISTERED
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setShowAddForm((v) => !v); setError(''); setMessage(''); }}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>{showAddForm ? 'CANCEL' : '+ ADD'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick links ── */}
      <View style={styles.quickLinks}>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.navigate('ParentGaming')} activeOpacity={0.8}>
          <Text style={styles.quickLinkLabel}>Gaming</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.navigate('ParentRewards')} activeOpacity={0.8}>
          <Text style={styles.quickLinkLabel}>Rewards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.navigate('ParentHome')} activeOpacity={0.8}>
          <Text style={styles.quickLinkLabel}>Dashboard</Text>
        </TouchableOpacity>
      </View>

      <Banner message={message} tone="success" style={styles.bannerPad} />
      <Banner message={error} style={styles.bannerPad} />

      {/* ── Add child form ── */}
      {showAddForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add New Child</Text>
          <InputField label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <InputField label="Date of Birth (YYYY-MM-DD)" value={form.dateOfBirth} onChangeText={(v) => setForm({ ...form, dateOfBirth: v })} />
          <View style={styles.formHint}>
            <Text style={styles.formHintText}>Ages 6–9 can use a PIN. Ages 10–13 need email + password.</Text>
          </View>
          <InputField label="Child Email (optional for age 6–9)" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} autoCapitalize="none" keyboardType="email-address" />
          <InputField label="Child Password (required for age 10+)" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry />
          <InputField label="4-digit PIN (age 6–9 only)" value={form.pin} onChangeText={(v) => setForm({ ...form, pin: v })} keyboardType="number-pad" maxLength={4} />
          <Button title={loading ? 'Creating…' : 'Create Child Account'} onPress={createChild} loading={loading} disabled={!form.name || !form.dateOfBirth} />
        </View>
      )}

      {/* ── Children list ── */}
      {children.length === 0 && !showAddForm ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="No children yet" message="Tap + Add Child to create your first child account." />
        </View>
      ) : (
        <View style={styles.childrenList}>
          {children.map((child) => {
            const tel = childTelemetry(child.id, tasks, activeSessions, child.createdAt);
            return (
              <BrutalistBox key={child.id} style={styles.childCard}>
                <View style={styles.childTop}>
                  <View style={styles.avatarWrap}>
                    {child.avatarUrl && apiBase ? (
                      <Image
                        source={{ uri: `${apiBase}/children/${child.id}/avatar` }}
                        style={styles.avatarImg}
                      />
                    ) : (
                      <View style={[styles.avatarCircle, { backgroundColor: ONE_BIT.background, borderColor: ONE_BIT.ink, borderWidth: ONE_BIT.borderWidth }]}>
                        <Text style={[styles.avatarInitial, { color: ONE_BIT.ink }]}>
                          {(child.name || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.avatarEditBtn}
                      onPress={() => uploadAvatar(child.id)}
                      disabled={uploadingChildId === child.id}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.avatarEditIcon}>{uploadingChildId === child.id ? '…' : 'EDIT'}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.childMeta}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('ParentChildDetail', { childId: child.id, childName: child.name })}
                  >
                    <Text style={styles.childName}>{child.name}</Text>
                    <StatusLine status={tel.status} lastSync={tel.lastSync} />
                    <View style={styles.loginBadges}>
                      {child.hasPasswordLogin && (
                        <View style={styles.loginBadge}>
                          <Text style={styles.loginBadgeText}>Email</Text>
                        </View>
                      )}
                      {child.hasPinLogin && (
                        <View style={[styles.loginBadge, { backgroundColor: colors.childAccentLight }]}>
                          <Text style={[styles.loginBadgeText, { color: colors.childAccent }]}>PIN</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Balance row */}
                <View style={styles.balanceRow}>
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceValue}>{child.pointsBalance ?? 0}</Text>
                    <Text style={styles.balanceLabel}>RP</Text>
                  </View>
                  <View style={styles.balanceDivider} />
                  <View style={styles.balanceItem}>
                    <Text style={[styles.balanceValue, { color: colors.xpGold }]}>{child.giftcardPointsBalance ?? 0}</Text>
                    <Text style={styles.balanceLabel}>GP</Text>
                  </View>
                  {child.dateOfBirth && (
                    <>
                      <View style={styles.balanceDivider} />
                      <View style={styles.balanceItem}>
                        <Text style={styles.balanceValue}>{getAgeYears(child.dateOfBirth)}</Text>
                        <Text style={styles.balanceLabel}>yrs old</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Actions */}
                <TouchableOpacity
                  style={styles.switchBtn}
                  onPress={() => switchToChild(child.id, child.name)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.switchBtnText}>OPEN_CHILD_VIEW</Text>
                </TouchableOpacity>
              </BrutalistBox>
            );
          })}
        </View>
      )}

      <View style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>Safety and Privacy</Text>
        <Text style={styles.safetyDesc}>
          Permanently delete your Gametime household: all child profiles, task history, and unused playtime minutes.
        </Text>
        <Text style={styles.safetyCompliance}>
          All data will be removed from our servers within 24 hours to comply with privacy regulations.
        </Text>
        <TouchableOpacity
          style={styles.deleteFamilyBtn}
          onPress={() => {
            setError('');
            setMessage('');
            setDeleteGateOpen(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.deleteFamilyBtnText}>Delete My Family Account</Text>
        </TouchableOpacity>
      </View>

      {/* ── Parent Settings (collapsible) ── */}
      <TouchableOpacity
        style={styles.settingsToggle}
        onPress={() => setShowSettings((v) => !v)}
        activeOpacity={0.8}
      >
        <Text style={styles.settingsToggleText}>Parent Settings</Text>
        <Text style={styles.settingsToggleChevron}>{showSettings ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showSettings && (
        <View style={styles.settingsCard}>
          <InputField
            label="Default task points (5–50)"
            value={String(parentSettings.defaultTaskPoints)}
            onChangeText={(v) => setParentSettings((p) => ({ ...p, defaultTaskPoints: v }))}
            keyboardType="number-pad"
          />
          <Text style={styles.settingsLabel}>Require notes on approval</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, parentSettings.requireApprovalNotes && styles.toggleBtnActive]}
              onPress={() => setParentSettings((p) => ({ ...p, requireApprovalNotes: true }))}
            >
              <Text style={[styles.toggleBtnText, parentSettings.requireApprovalNotes && styles.toggleBtnTextActive]}>Required</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !parentSettings.requireApprovalNotes && styles.toggleBtnActive]}
              onPress={() => setParentSettings((p) => ({ ...p, requireApprovalNotes: false }))}
            >
              <Text style={[styles.toggleBtnText, !parentSettings.requireApprovalNotes && styles.toggleBtnTextActive]}>Optional</Text>
            </TouchableOpacity>
          </View>
          <Button title="Save Settings" onPress={saveSettings} />
        </View>
      )}

      <View style={{ height: spacing.xl }} />
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: fabBottom }]} pointerEvents="box-none">
        <MobileButton
          title={children.length ? 'EMERGENCY_LOCK' : 'ADD_NODE'}
          onPress={() =>
            children.length
              ? navigation.navigate('ParentGaming')
              : setShowAddForm(true)
          }
          style={styles.fabButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: ONE_BIT.background },
  screen: { flex: 1, backgroundColor: ONE_BIT.background },
  content: { padding: spacing.md, gap: spacing.md },
  bannerPad: { marginHorizontal: 0 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  headerSub: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    color: ONE_BIT.ink,
    marginTop: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  addBtn: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: ONE_BIT.background
  },
  addBtnText: {
    color: ONE_BIT.ink,
    fontFamily: ONE_BIT.fontBold,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },

  // ── Quick links ──
  quickLinks: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  quickLink: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  quickLinkIcon: { fontSize: 20 },
  quickLinkLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted },

  // ── Add form ──
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  formHint: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.md,
    padding: spacing.sm
  },
  formHintText: { fontSize: 12, color: colors.primaryDark },

  // ── Children list ──
  childrenList: { gap: spacing.md },
  emptyWrap: { marginTop: spacing.xl },

  // ── Child card ──
  childCard: {
    padding: spacing.md,
    gap: spacing.md
  },
  childTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarWrap: { position: 'relative', width: 56, height: 56 },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: { fontSize: 24, fontWeight: '900' },
  avatarEditBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarEditIcon: { fontSize: 13 },

  childMeta: { flex: 1, gap: 6 },
  childName: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 15,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },
  loginBadges: { flexDirection: 'row', gap: 6 },
  loginBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full
  },
  loginBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  // ── Balance row ──
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm
  },
  balanceItem: { flex: 1, alignItems: 'center', gap: 2 },
  balanceValue: { fontSize: 20, fontWeight: '900', color: colors.text },
  balanceLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  balanceDivider: { width: 1, height: 32, backgroundColor: colors.border },

  // ── Switch btn ──
  switchBtn: {
    paddingVertical: 11,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.ink,
    alignItems: 'center'
  },
  switchBtnText: {
    color: ONE_BIT.ink,
    fontFamily: ONE_BIT.fontBold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },

  fabWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md
  },
  fabButton: {
    width: '100%'
  },

  // ── Settings ──
  settingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  settingsToggleText: { fontWeight: '700', color: colors.textSecondary, fontSize: 14 },
  settingsToggleChevron: { color: colors.textMuted, fontSize: 12 },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: -spacing.sm
  },
  settingsLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center'
  },
  toggleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  toggleBtnText: { fontWeight: '600', color: colors.textMuted, fontSize: 13 },
  toggleBtnTextActive: { color: colors.primary },

  safetyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  safetyTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  safetyDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  safetyCompliance: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  deleteFamilyBtn: {
    marginTop: spacing.xs,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.errorSurface,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: 'center'
  },
  deleteFamilyBtnText: { color: colors.error, fontWeight: '800', fontSize: 14 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 35, 0.55)',
    justifyContent: 'center',
    padding: spacing.lg
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  modalBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  modalCompliance: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center'
  },
  modalBtnGhost: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface2
  },
  modalBtnGhostText: { fontWeight: '700', color: colors.textSecondary, fontSize: 14 },
  modalBtnDanger: { backgroundColor: colors.error },
  modalBtnDangerText: { fontWeight: '800', color: '#fff', fontSize: 14 },
  modalBtnDisabled: { opacity: 0.55 }
});
