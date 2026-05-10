import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import PageHeader from '../../components/PageHeader';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import StatusPill from '../../components/StatusPill';
import { GamingBlockOverlay } from '../../components/GamingBlockOverlay';
import { useGamingBlocker } from '../../hooks/useGamingBlocker';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { getErrorMessage, sanitizeText } from '../../utils/format';
import { syncSystemRestrictions } from '../../utils/syncSystemRestrictions';

const ALLOWED_PLATFORMS = ['iOS', 'Android', 'Windows', 'macOS', 'Web', 'Console', 'Other', 'Unknown'];
const DENIAL_MESSAGES = {
  BLOCKED_GAME: 'This game is blocked by your parent.',
  ACTIVE_SESSION_EXISTS: 'You already have an active session.',
  DAILY_CAP_REACHED: 'Daily gaming cap reached for today.',
  WEEKLY_CAP_REACHED: 'Weekly gaming cap reached.',
  NO_MINUTES_FROM_POINTS: 'Not enough points for gaming time.'
};

function formatDenial(response) {
  const base = DENIAL_MESSAGES[response?.code] || response?.reason || 'Session denied by family controls.';
  return response?.nextStep ? `${base} ${response.nextStep}` : base;
}

function GamingHero({ overview }) {
  const playable = overview?.usage?.playableNow ?? 0;
  const todayUsed = overview?.usage?.todayUsedMinutes ?? 0;
  const weekUsed = overview?.usage?.weekUsedMinutes ?? 0;
  const dailyCap = overview?.caps?.dailyCapMinutes ?? 120;
  const weeklyCap = overview?.caps?.weeklyCapMinutes ?? 600;
  const pts = overview?.conversion?.pointsUnit ?? 10;
  const mins = overview?.conversion?.minutesUnit ?? 30;
  const dailyPct = dailyCap > 0 ? Math.min(1, todayUsed / dailyCap) : 0;

  return (
    <Card>
      <Text style={heroStyles.label}>Available Now</Text>
      <Text style={heroStyles.big}>{playable} <Text style={heroStyles.unit}>min</Text></Text>
      <Text style={heroStyles.conversion}>{pts} RP = {mins} gaming minutes</Text>

      <View style={heroStyles.capRow}>
        <View style={{ flex: 1 }}>
          <View style={heroStyles.barTrack}>
            <View style={[heroStyles.barFill, { width: `${Math.round(dailyPct * 100)}%` }]} />
          </View>
          <Text style={heroStyles.capMeta}>Today: {todayUsed} / {dailyCap} min</Text>
        </View>
        <Text style={heroStyles.capMeta}>Week: {weekUsed} / {weeklyCap} min</Text>
      </View>
    </Card>
  );
}

const heroStyles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  big: { fontSize: 52, fontWeight: '900', color: colors.childAccentDark, lineHeight: 58 },
  unit: { fontSize: 24, fontWeight: '700', color: colors.childAccentDark },
  conversion: { fontSize: 13, color: colors.textMuted },
  capRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginTop: 4 },
  barTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', backgroundColor: colors.childAccent, borderRadius: 4 },
  capMeta: { fontSize: 12, color: colors.textMuted }
});

function ActiveSessionCard({ session, loading, onEnd }) {
  return (
    <Card style={activeStyles.card}>
      <View style={activeStyles.header}>
        <View style={activeStyles.dot} />
        <Text style={activeStyles.title}>Session active</Text>
      </View>
      <Text style={activeStyles.gameName}>{session.gameName}</Text>
      <Text style={activeStyles.platform}>{session.platform} · {session.grantedMinutes ?? '?'} min granted</Text>
      <Button title="End Session" tone="secondary" onPress={onEnd} loading={loading} />
    </Card>
  );
}

const activeStyles = StyleSheet.create({
  card: { borderColor: colors.childAccent, borderWidth: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.childAccent },
  title: { fontSize: 12, fontWeight: '700', color: colors.childAccentDark, textTransform: 'uppercase', letterSpacing: 0.5 },
  gameName: { fontSize: 20, fontWeight: '800', color: colors.text },
  platform: { fontSize: 13, color: colors.textMuted }
});

export default function ChildGamingScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [blockedGames, setBlockedGames] = useState([]);
  const [form, setForm] = useState({ gameName: '', platform: 'iOS', requestedMinutes: '30' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeSession = sessions.find((s) => s.status === 'Started') || null;

  const { isBlocked, blockCode, dismissBlock } = useGamingBlocker(activeSession?.id, (code, reason) => {
    setError(reason || 'Gaming session blocked');
    load(true); // Reload to update state
  });

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const [overviewRes, sessionsRes, blockedList] = await Promise.all([
        apiRequest('/gaming/overview', { token }),
        apiRequest('/gaming/sessions', { token }),
        apiRequest('/gaming/games', { token })
      ]);
      setOverview(overviewRes);
      setSessions(sessionsRes);
      setBlockedGames(blockedList.filter((g) => g.status === 'Blocked'));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load(true);
  }

  async function startSession() {
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const gameName = sanitizeText(form.gameName);
      const platform = sanitizeText(form.platform);
      const requestedMinutes = Number(form.requestedMinutes);

      if (!gameName) throw new Error('Game name is required.');
      if (!ALLOWED_PLATFORMS.includes(platform)) {
        throw new Error(`Platform must be one of: ${ALLOWED_PLATFORMS.join(', ')}`);
      }
      if (!Number.isInteger(requestedMinutes) || requestedMinutes < 1 || requestedMinutes > 240) {
        throw new Error('Minutes must be between 1 and 240.');
      }

      const response = await apiRequest('/gaming/sessions/start', {
        method: 'POST',
        token,
        body: { gameName, platform, requestedMinutes }
      });

      if (!response.allowed) {
        setError(formatDenial(response));
      } else {
        setMessage(response.message || `Session started! ${response.grantedMinutes} minutes granted.`);
        setForm((prev) => ({ ...prev, gameName: '' }));
        if (response.sessionId && response.expiresAt && response.grantedMinutes != null) {
          navigation.navigate('ChildSession', {
            sessionId: response.sessionId,
            expiresAt: response.expiresAt,
            grantedMinutes: response.grantedMinutes,
            gameName: response.gameName
          });
        }
      }
      await load(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function endSession() {
    if (!activeSession) return;
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/gaming/sessions/end', {
        method: 'POST',
        token,
        body: { sessionId: activeSession.id, actualMinutes: activeSession.grantedMinutes || 1 }
      });
      await syncSystemRestrictions(token);
      setMessage('Session ended. Time recorded.');
      await load(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader title="Gaming" subtitle="Earn RP by completing tasks, convert to play time" accent="child" />

      {loading ? (
        <Spinner full />
      ) : (
        <>
          {/* Gaming time hero */}
          {overview ? <GamingHero overview={overview} /> : null}

          {/* Active session */}
          {activeSession ? (
            <ActiveSessionCard session={activeSession} loading={submitting} onEnd={endSession} />
          ) : (
            <Card>
              <Text style={styles.sectionTitle}>Start a session</Text>
              <InputField
                label="Game name"
                value={form.gameName}
                onChangeText={(v) => setForm((prev) => ({ ...prev, gameName: v }))}
                maxLength={80}
                placeholder="e.g. Roblox"
              />
              <InputField
                label="Platform"
                value={form.platform}
                onChangeText={(v) => setForm((prev) => ({ ...prev, platform: v }))}
                maxLength={40}
                placeholder="iOS, Android, Windows…"
              />
              <InputField
                label="Minutes requested"
                value={form.requestedMinutes}
                onChangeText={(v) => setForm((prev) => ({ ...prev, requestedMinutes: v }))}
                keyboardType="number-pad"
              />
              <Button
                title="Start Gaming Session"
                onPress={startSession}
                loading={submitting}
                disabled={!form.gameName.trim()}
              />
            </Card>
          )}

          <Banner message={message} tone="success" />
          <Banner message={error} />

          {/* Blocked games */}
          {blockedGames.length > 0 ? (
            <Card>
              <Text style={styles.sectionTitle}>Blocked games</Text>
              {blockedGames.map((game) => (
                <View key={game.id} style={styles.blockedItem}>
                  <Text style={styles.blockedIcon}>BLK</Text>
                  <Text style={styles.blockedName}>{game.name}</Text>
                  <Text style={styles.blockedPlatform}>{game.platform}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* Recent sessions */}
          <Card>
            <Text style={styles.sectionTitle}>Recent sessions</Text>
            {sessions.length === 0 ? (
              <EmptyState title="No sessions yet" message="Start your first gaming session above." />
            ) : (
              sessions.slice(0, 8).map((session) => (
                <View key={session.id} style={styles.sessionItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionGame}>{session.gameName} · {session.platform}</Text>
                    {session.durationMinutes ? (
                      <Text style={styles.sessionMeta}>{session.durationMinutes} min played</Text>
                    ) : session.denialCode ? (
                      <Text style={[styles.sessionMeta, { color: colors.danger }]}>
                        {DENIAL_MESSAGES[session.denialCode] || session.denialCode}
                      </Text>
                    ) : null}
                  </View>
                  <StatusPill state={session.status} />
                </View>
              ))
            )}
          </Card>
        </>
      )}

      <GamingBlockOverlay visible={isBlocked} code={blockCode} onDismiss={dismissBlock} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  blockedItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  blockedIcon: { fontSize: 16 },
  blockedName: { flex: 1, fontWeight: '600', color: colors.text },
  blockedPlatform: { fontSize: 12, color: colors.textMuted },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs
  },
  sessionGame: { fontSize: 14, fontWeight: '600', color: colors.text },
  sessionMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 }
});
