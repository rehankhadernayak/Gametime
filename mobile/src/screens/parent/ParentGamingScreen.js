import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InputField from '../../components/InputField';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import { colors } from '../../theme/colors';
import { getErrorMessage, sanitizeText } from '../../utils/format';

const ALLOWED_PLATFORMS = ['iOS', 'Android', 'Windows', 'macOS', 'Web', 'Console', 'Other', 'Unknown'];

const PLATFORM_ICONS = { iOS: '📱', Android: '📱', Windows: '💻', macOS: '💻', Web: '🌐', Console: '🎮', Other: '🕹️', Unknown: '🕹️' };

function CapBar({ used, cap, color }) {
  const pct = cap > 0 ? Math.min(1, used / cap) : 0;
  const isHigh = pct > 0.8;
  return (
    <View style={{ gap: 4 }}>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: isHigh ? colors.warning : (color || colors.primary) }]} />
      </View>
      <Text style={barStyles.meta}>{used} / {cap} min ({Math.round(pct * 100)}%)</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  meta: { color: colors.textMuted, fontSize: 11 },
});

function SectionCard({ title, children, style }) {
  return (
    <View style={[sectionStyles.card, style]}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
});

export default function ParentGamingScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [children, setChildren] = useState([]);
  const [settings, setSettings] = useState({ pointsUnit: '10', minutesUnit: '15', dailyCapMinutes: '90', weeklyCapMinutes: '420' });
  const [games, setGames] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);
  const [gameForm, setGameForm] = useState({ name: '', platform: 'iOS', status: 'Blocked' });
  const [reports, setReports] = useState({});

  const [saveBusy, setSaveBusy] = useState(false);
  const [gameBusy, setGameBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [childList, settingRes, gameList, auditRes] = await Promise.all([
      apiRequest('/children/list', { token }),
      apiRequest('/gaming/settings', { token }),
      apiRequest('/gaming/games', { token }),
      apiRequest('/gaming/sessions/audit?limit=30', { token }),
    ]);

    const reportList = await Promise.all(
      childList.map(async (child) => ({
        childId: child.id,
        report: await apiRequest(`/gaming/reports/weekly?childId=${child.id}`, { token }),
        overview: await apiRequest(`/gaming/overview/${child.id}`, { token }),
      }))
    );

    setChildren(childList);
    setSettings({
      pointsUnit: String(settingRes.pointsUnit),
      minutesUnit: String(settingRes.minutesUnit),
      dailyCapMinutes: String(settingRes.dailyCapMinutes),
      weeklyCapMinutes: String(settingRes.weeklyCapMinutes),
    });
    setGames(gameList);
    setAuditEntries(auditRes);
    setReports(reportList.reduce((acc, item) => ({ ...acc, [item.childId]: item }), {}));
  }, [token]);

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e))).finally(() => setInitialLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try { await load(); } catch (e) { setError(getErrorMessage(e)); }
    setRefreshing(false);
  }

  function showToast(msg, tone = 'success') {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveSettings() {
    setSaveBusy(true);
    setError('');
    try {
      const payload = {
        pointsUnit: Number(settings.pointsUnit),
        minutesUnit: Number(settings.minutesUnit),
        dailyCapMinutes: Number(settings.dailyCapMinutes),
        weeklyCapMinutes: Number(settings.weeklyCapMinutes),
      };
      if (!Number.isInteger(payload.pointsUnit) || payload.pointsUnit < 1 || payload.pointsUnit > 200)
        throw new Error('Points unit must be 1–200.');
      if (!Number.isInteger(payload.minutesUnit) || payload.minutesUnit < 1 || payload.minutesUnit > 240)
        throw new Error('Minutes unit must be 1–240.');
      if (!Number.isInteger(payload.dailyCapMinutes) || payload.dailyCapMinutes < 15 || payload.dailyCapMinutes > 1440)
        throw new Error('Daily cap must be 15–1440 min.');
      if (!Number.isInteger(payload.weeklyCapMinutes) || payload.weeklyCapMinutes < 60 || payload.weeklyCapMinutes > 10080)
        throw new Error('Weekly cap must be 60–10080 min.');
      if (payload.weeklyCapMinutes < payload.dailyCapMinutes)
        throw new Error('Weekly cap must be ≥ daily cap.');
      await apiRequest('/gaming/settings', { method: 'PATCH', token, body: payload });
      await load();
      showToast('Gaming rules saved.');
    } catch (e) { setError(getErrorMessage(e)); }
    setSaveBusy(false);
  }

  async function addGame() {
    setGameBusy(true);
    setError('');
    try {
      const name = sanitizeText(gameForm.name);
      const platform = sanitizeText(gameForm.platform);
      const status = sanitizeText(gameForm.status);
      if (!name) throw new Error('Game name is required.');
      if (!ALLOWED_PLATFORMS.includes(platform)) throw new Error(`Platform must be one of: ${ALLOWED_PLATFORMS.join(', ')}`);
      if (!['Blocked', 'Allowed'].includes(status)) throw new Error('Rule must be Blocked or Allowed.');
      await apiRequest('/gaming/games', { method: 'POST', token, body: { name, platform, status } });
      setGameForm({ name: '', platform: 'iOS', status: 'Blocked' });
      await load();
      showToast(`${name} added (${status}).`);
    } catch (e) { setError(getErrorMessage(e)); }
    setGameBusy(false);
  }

  async function toggleGame(game) {
    setToggleBusy(game.id);
    const next = game.status === 'Blocked' ? 'Allowed' : 'Blocked';
    try {
      await apiRequest(`/gaming/games/${game.id}`, { method: 'PATCH', token, body: { status: next } });
      await load();
      showToast(`${game.name} is now ${next}.`);
    } catch (e) { setError(getErrorMessage(e)); }
    setToggleBusy(null);
  }

  async function deleteGame(gameId) {
    setDeleteBusy(gameId);
    try {
      await apiRequest(`/gaming/games/${gameId}`, { method: 'DELETE', token });
      await load();
      showToast('Game rule deleted.');
    } catch (e) { setError(getErrorMessage(e)); }
    setDeleteBusy(null);
  }

  const totalActive = auditEntries.filter((e) => e.status === 'Started').length;

  if (initialLoading) return <View style={{ flex: 1, backgroundColor: colors.background }}><Spinner full /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Gradient Header ── */}
      <LinearGradient colors={['#3B5BDB', '#2F4AC0']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Gaming Controls</Text>
        <Text style={styles.headerSub}>Caps, conversion rates, and game access rules</Text>

        <View style={styles.headerStats}>
          <View style={styles.headerStatPill}>
            <Text style={styles.headerStatValue}>{settings.dailyCapMinutes}</Text>
            <Text style={styles.headerStatLabel}>Daily cap (min)</Text>
          </View>
          <View style={styles.headerStatPill}>
            <Text style={styles.headerStatValue}>{settings.pointsUnit} RP</Text>
            <Text style={styles.headerStatLabel}>= {settings.minutesUnit} min</Text>
          </View>
          {totalActive > 0 ? (
            <View style={[styles.headerStatPill, styles.activeSessionPill]}>
              <View style={styles.activeDot} />
              <Text style={styles.activeSessionText}>{totalActive} active</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Toast / Error */}
        {toast ? <View style={[styles.toast, toast.tone === 'error' && styles.toastError]}><Text style={styles.toastText}>{toast.msg}</Text></View> : null}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
          </View>
        ) : null}

        {/* ── Per-child Usage ── */}
        {children.length > 0 ? (
          <SectionCard title="Weekly Usage">
            {children.map((child) => {
              const item = reports[child.id];
              const overview = item?.overview;
              const report = item?.report;
              const playable = overview?.usage?.playableNow ?? 0;
              const todayUsed = overview?.usage?.todayUsedMinutes ?? 0;
              const dailyCap = overview?.caps?.dailyCapMinutes ?? 90;
              const weekUsed = report?.totals?.totalMinutes ?? 0;
              const weeklyCap = overview?.caps?.weeklyCapMinutes ?? 420;
              return (
                <View key={child.id} style={styles.childUsageCard}>
                  <View style={styles.childUsageTop}>
                    <View style={styles.childAvatar}>
                      <Text style={styles.childAvatarText}>{child.name?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childUsageName}>{child.name}</Text>
                      <Text style={styles.childUsageSub}>{playable} min available now</Text>
                    </View>
                    <View style={styles.playableBadge}>
                      <Text style={styles.playableValue}>{playable}</Text>
                      <Text style={styles.playableLabel}>min</Text>
                    </View>
                  </View>
                  <View style={styles.childUsageBars}>
                    <View>
                      <Text style={styles.capBarLabel}>Today</Text>
                      <CapBar used={todayUsed} cap={dailyCap} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.capBarLabel}>This week</Text>
                      <CapBar used={weekUsed} cap={weeklyCap} color={colors.primaryDark} />
                    </View>
                  </View>
                </View>
              );
            })}
          </SectionCard>
        ) : null}

        {/* ── Gaming Rules ── */}
        <SectionCard title="Gaming Rules">
          <Text style={styles.ruleHint}>
            Main loop: every <Text style={styles.ruleHighlight}>{settings.pointsUnit} RP</Text> converts to <Text style={styles.ruleHighlight}>{settings.minutesUnit} minutes</Text> of playtime.
          </Text>

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <InputField label="RP per unit" value={settings.pointsUnit} onChangeText={(v) => setSettings((p) => ({ ...p, pointsUnit: v }))} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="Minutes per unit" value={settings.minutesUnit} onChangeText={(v) => setSettings((p) => ({ ...p, minutesUnit: v }))} keyboardType="number-pad" />
            </View>
          </View>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <InputField label="Daily cap (min)" value={settings.dailyCapMinutes} onChangeText={(v) => setSettings((p) => ({ ...p, dailyCapMinutes: v }))} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="Weekly cap (min)" value={settings.weeklyCapMinutes} onChangeText={(v) => setSettings((p) => ({ ...p, weeklyCapMinutes: v }))} keyboardType="number-pad" />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, saveBusy && styles.saveBtnDisabled]} onPress={saveSettings} disabled={saveBusy} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{saveBusy ? 'Saving…' : 'Save Gaming Rules'}</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── Game Access List ── */}
        <SectionCard title="Game Access Rules">
          {/* Add game form */}
          <View style={styles.twoCol}>
            <View style={{ flex: 2 }}>
              <InputField label="Game name" value={gameForm.name} onChangeText={(v) => setGameForm((p) => ({ ...p, name: v }))} maxLength={80} placeholder="e.g. Roblox" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="Platform" value={gameForm.platform} onChangeText={(v) => setGameForm((p) => ({ ...p, platform: v }))} maxLength={40} />
            </View>
          </View>

          {/* Rule toggle */}
          <View style={styles.ruleToggleRow}>
            {['Blocked', 'Allowed'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.ruleToggleChip, gameForm.status === status && (status === 'Blocked' ? styles.ruleToggleBlocked : styles.ruleToggleAllowed)]}
                onPress={() => setGameForm((p) => ({ ...p, status }))}
              >
                <Text style={[styles.ruleToggleText, gameForm.status === status && styles.ruleToggleTextActive]}>
                  {status === 'Blocked' ? '🚫 Block' : '✅ Allow'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.addGameBtn, (!gameForm.name.trim() || gameBusy) && styles.saveBtnDisabled]} onPress={addGame} disabled={!gameForm.name.trim() || gameBusy} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{gameBusy ? 'Adding…' : 'Add Game Rule'}</Text>
          </TouchableOpacity>

          {/* Games list */}
          {games.length > 0 ? (
            <>
              <View style={styles.divider} />
              {games.map((game) => (
                <View key={game.id} style={styles.gameRow}>
                  <Text style={styles.gamePlatformIcon}>{PLATFORM_ICONS[game.platform] || '🕹️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gameName}>{game.name}</Text>
                    <Text style={styles.gamePlatform}>{game.platform}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.statusToggleBtn, game.status === 'Blocked' ? styles.blockedBtn : styles.allowedBtn]}
                    onPress={() => toggleGame(game)}
                    disabled={toggleBusy === game.id}
                  >
                    <Text style={styles.statusToggleBtnText}>
                      {toggleBusy === game.id ? '…' : game.status === 'Blocked' ? '🚫 Blocked' : '✅ Allowed'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteGame(game.id)} disabled={deleteBusy === game.id}>
                    <Text style={styles.deleteBtnText}>{deleteBusy === game.id ? '…' : '🗑'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyGames}>
              <Text style={styles.emptyGamesText}>🎮 No game rules yet — all games allowed by default.</Text>
            </View>
          )}
        </SectionCard>

        {/* ── Audit Log ── */}
        {auditEntries.length > 0 ? (
          <SectionCard title="Gaming Activity Log">
            {auditEntries.slice(0, 20).map((entry) => {
              const isActive = entry.status === 'Started';
              const isDenied = entry.status === 'Denied';
              const statusColor = isActive ? colors.secondary : isDenied ? colors.danger : colors.textMuted;
              return (
                <View key={entry.id} style={styles.auditRow}>
                  {isActive ? <View style={styles.auditDot} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditName}>
                      {entry.childName} · {entry.gameName}
                    </Text>
                    <Text style={styles.auditPlatform}>{entry.platform} · {entry.durationMinutes || entry.grantedMinutes || 0} min</Text>
                    {entry.denialReason || entry.denialCode ? (
                      <Text style={styles.auditDenial}>{entry.denialReason || entry.denialCode}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.auditStatus, { color: statusColor }]}>{entry.status}</Text>
                </View>
              );
            })}
          </SectionCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2, marginBottom: 14 },
  headerStats: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  headerStatPill: {
    flexDirection: 'column', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  headerStatValue: { color: '#fff', fontSize: 16, fontWeight: '900' },
  headerStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  activeSessionPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  activeSessionText: { color: '#fff', fontSize: 13, fontWeight: '700' },

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

  twoCol: { flexDirection: 'row', gap: 10 },

  // Rule hint
  ruleHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  ruleHighlight: { color: colors.primary, fontWeight: '700' },

  // Save button
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  addGameBtn: { backgroundColor: colors.primaryDark, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Rule toggle
  ruleToggleRow: { flexDirection: 'row', gap: 10 },
  ruleToggleChip: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  ruleToggleBlocked: { borderColor: colors.danger, backgroundColor: colors.errorSurface },
  ruleToggleAllowed: { borderColor: colors.secondary, backgroundColor: colors.successSurface },
  ruleToggleText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  ruleToggleTextActive: { color: colors.text },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  // Child usage
  childUsageCard: {
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  childUsageTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  childAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  childUsageName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  childUsageSub: { color: colors.textMuted, fontSize: 12 },
  playableBadge: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  playableValue: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  playableLabel: { color: colors.primary, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  childUsageBars: { gap: 6 },
  capBarLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 3 },

  // Games list
  gameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  gamePlatformIcon: { fontSize: 20 },
  gameName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  gamePlatform: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  statusToggleBtn: {
    borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  blockedBtn: { borderColor: colors.danger + '66', backgroundColor: colors.errorSurface },
  allowedBtn: { borderColor: colors.secondary + '66', backgroundColor: colors.successSurface },
  statusToggleBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
  deleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 18 },

  emptyGames: { paddingVertical: 12, alignItems: 'center' },
  emptyGamesText: { color: colors.textMuted, fontSize: 13 },

  // Audit log
  auditRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary, marginTop: 5, flexShrink: 0 },
  auditName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  auditPlatform: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  auditDenial: { color: colors.danger, fontSize: 11, marginTop: 1 },
  auditStatus: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
