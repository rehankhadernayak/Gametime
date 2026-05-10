import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Banner from '../../components/Banner';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { getErrorMessage } from '../../utils/format';

function HeroBalanceCard({ rp, gp }) {
  return (
    <View style={heroStyles.card}>
      <View style={heroStyles.row}>
        <View style={heroStyles.col}>
          <Text style={heroStyles.number}>{rp}</Text>
          <Text style={heroStyles.unit}>Reward Points</Text>
        </View>
        <View style={heroStyles.divider} />
        <View style={heroStyles.col}>
          <Text style={heroStyles.number}>{gp}</Text>
          <View style={heroStyles.gpPill}>
            <Text style={heroStyles.gpPillText}>GP</Text>
          </View>
          <Text style={heroStyles.unit}>Gift Points</Text>
        </View>
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    borderRadius: 0,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: '#000000',
    elevation: 0,
    shadowOpacity: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  col: { alignItems: 'center', gap: 4 },
  divider: {
    width: 2,
    height: 56,
    backgroundColor: '#000000',
  },
  number: {
    fontSize: 56,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 60,
    letterSpacing: -1,
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#525252',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gpPill: {
    backgroundColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  gpPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

function GamingTimeCard({ overview }) {
  const playable = overview?.usage?.playableNow ?? 0;
  const todayUsed = overview?.usage?.todayUsedMinutes ?? 0;
  const dailyCap = overview?.caps?.dailyCapMinutes ?? 120;
  const capPct = dailyCap > 0 ? Math.min(1, todayUsed / dailyCap) : 0;

  return (
    <Card>
      <Text style={styles.cardLabel}>Gaming Time</Text>
      <View style={styles.gamingRow}>
        <View>
          <Text style={styles.gamingBig}>{playable}</Text>
          <Text style={styles.gamingUnit}>minutes available</Text>
        </View>
        <View style={styles.gamingRight}>
          <Text style={styles.gamingMeta}>Today: {todayUsed} / {dailyCap} min</Text>
          <View style={styles.capBarTrack}>
            <View style={[styles.capBarFill, { width: `${Math.round(capPct * 100)}%` }]} />
          </View>
          <Text style={styles.gamingMeta}>{Math.round(capPct * 100)}% of daily cap used</Text>
        </View>
      </View>
    </Card>
  );
}

// ─── AI Hero Panel ─────────────────────────────────────────────────────────────

const AI_QUICK_CHIPS = [
  { label: 'What tasks do I have?', text: 'What tasks do I have?' },
  { label: 'How many RP do I have?', text: 'How many RP do I have?' },
  { label: 'What can I buy?', text: 'What can I buy?' },
];

function AiHeroPanel({ user, tasks, streak, navigation }) {
  const [chatInput, setChatInput] = useState('');
  const firstName = user?.name?.split(' ')[0] || 'Explorer';

  // Build context-aware greeting
  let greeting;
  const pendingCount = tasks.filter((t) => t.status === 'active' || t.status === 'started').length;
  if (pendingCount > 0) {
    greeting = `Hey ${firstName}! You have ${pendingCount} task${pendingCount !== 1 ? 's' : ''} waiting. Want to tackle the easiest one first?`;
  } else if (streak > 0) {
    greeting = `You're on a ${streak}-day streak! Keep it going today!`;
  } else {
    greeting = `All caught up! Ask me anything or I can suggest some tasks.`;
  }

  function handleSend() {
    const msg = chatInput.trim();
    if (!msg) return;
    navigation.navigate('ChildAi', { initialMessage: msg });
    setChatInput('');
  }

  function handleChip(text) {
    navigation.navigate('ChildAi', { initialMessage: text });
  }

  return (
    <View style={styles.aiHero}>
      {/* Avatar + greeting */}
      <View style={styles.aiHeroTop}>
        <View style={styles.aiHeroAvatar}>
          <Text style={styles.aiHeroAvatarEmoji}>AI</Text>
        </View>
        <View style={styles.aiHeroBubble}>
          <Text style={styles.aiHeroGreeting}>{greeting}</Text>
        </View>
      </View>

      {/* Quick reply chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.aiHeroChips}
      >
        {AI_QUICK_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.label}
            style={styles.aiHeroChip}
            onPress={() => handleChip(chip.text)}
            activeOpacity={0.7}
          >
            <Text style={styles.aiHeroChipText}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Inline chat input */}
      <View style={styles.aiHeroInputRow}>
        <TextInput
          style={styles.aiHeroInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Ask Study Buddy…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.aiHeroSendBtn, !chatInput.trim() && styles.aiHeroSendBtnDisabled]}
          onPress={handleSend}
          disabled={!chatInput.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.aiHeroSendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ChildHomeScreen() {
  const { token, user, refreshMe } = useAuth();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [gamingOverview, setGamingOverview] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [streak, setStreak] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const [list, overview, achRes, streakRes, taskRes] = await Promise.all([
        apiRequest('/notifications/list', { token }),
        apiRequest('/gaming/overview', { token }),
        apiRequest('/achievements/list', { token }).catch(() => ({ achievements: [] })),
        apiRequest('/achievements/streak', { token }).catch(() => ({ streak: 0 })),
        apiRequest('/tasks/list', { token }).catch(() => ({ tasks: [] })),
      ]);
      setNotifications(list);
      setGamingOverview(overview);
      setAchievements(achRes?.achievements ?? []);
      setStreak(streakRes?.streak ?? 0);
      setTasks(Array.isArray(taskRes?.tasks) ? taskRes.tasks : Array.isArray(taskRes) ? taskRes : []);
      await refreshMe();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, refreshMe]);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load(true);
  }

  const unread = notifications.filter((n) => !n.read);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Top bar — greeting + nav icons */}
      <View style={styles.topBar}>
        <Text style={styles.topGreeting}>Hi, {user?.name?.split(' ')[0] ?? 'there'}</Text>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => navigation.navigate('ChildNotifications')} style={styles.topBtn} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={20} color={colors.childAccentDark} />
            {unread.length > 0 && <View style={styles.topBtnBadge} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Account')} style={styles.topBtn} accessibilityLabel="Account">
            <Ionicons name="person-circle-outline" size={22} color={colors.childAccentDark} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <Spinner full />
      ) : (
        <>
          {/* AI Hero — primary surface */}
          <AiHeroPanel
            user={user}
            tasks={tasks}
            streak={streak}
            navigation={navigation}
          />

          {/* Hero balance card */}
          <HeroBalanceCard
            rp={user?.pointsBalance ?? 0}
            gp={user?.giftcardPointsBalance ?? 0}
          />

          {/* Gaming time */}
          {gamingOverview ? <GamingTimeCard overview={gamingOverview} /> : null}

          {/* Achievements strip */}
          {achievements.length > 0 ? (
            <Card>
              <View style={styles.achHeader}>
                <Text style={styles.cardLabel}>Achievements</Text>
                {streak > 0 ? (
                  <View style={styles.streakChip}>
                    <Text style={styles.streakText}>{streak} day streak</Text>
                  </View>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achScroll}>
                {achievements.map((ach) => (
                  <View key={ach.id} style={[styles.achBadge, ach.unlocked && styles.achBadgeUnlocked]}>
                    <Text style={[styles.achIcon, !ach.unlocked && styles.achIconLocked]}>{ach.icon}</Text>
                    <Text style={[styles.achName, !ach.unlocked && styles.achNameLocked]} numberOfLines={2}>{ach.name}</Text>
                    {ach.unlocked ? <Text style={styles.achCheck}>✓</Text> : null}
                  </View>
                ))}
              </ScrollView>
            </Card>
          ) : null}

          {/* Notifications */}
          {unread.length > 0 ? (
            <Card>
              <View style={styles.notifHeader}>
                <Text style={styles.cardLabel}>Notifications ({unread.length} new)</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ChildNotifications')}>
                  <Text style={styles.seeAll}>See all →</Text>
                </TouchableOpacity>
              </View>
              {unread.slice(0, 5).map((n) => (
                <View key={n.id} style={styles.notifItem}>
                  <View style={styles.notifDot} />
                  <Text style={styles.notifText}>{n.message}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      )}

      <Banner message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  topGreeting: { fontSize: 18, fontWeight: '800', color: colors.text },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topBtn: {
    width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 17,
  },
  topBtnBadge: {
    position: 'absolute',
    top: 5, right: 4,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.background,
  },

  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  seeAll: { fontSize: 12, fontWeight: '700', color: colors.childAccent },

  cardLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  gamingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gamingBig: { fontSize: 42, fontWeight: '900', color: colors.primaryDark, lineHeight: 46 },
  gamingUnit: { fontSize: 13, color: colors.textMuted },
  gamingRight: { flex: 1, gap: 4 },
  gamingMeta: { fontSize: 12, color: colors.textMuted },
  capBarTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  capBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

  // ── AI Hero Panel ──────────────────────────────────────────────────────────
  aiHero: {
    backgroundColor: colors.childSurface,
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.childAccent + '44',
    gap: spacing.sm,
    shadowColor: colors.childAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  aiHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  aiHeroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.childAccent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: colors.childAccent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  aiHeroAvatarEmoji: { fontSize: 26 },
  aiHeroBubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  aiHeroGreeting: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  aiHeroChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  aiHeroChip: {
    backgroundColor: colors.childAccent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiHeroChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.surface,
  },
  aiHeroInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  aiHeroInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiHeroSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.childAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeroSendBtnDisabled: {
    backgroundColor: colors.border,
  },
  aiHeroSendText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 16,
  },

  notifItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.childAccent, marginTop: 4 },
  notifText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },

  achHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  streakChip: {
    backgroundColor: colors.streakFire,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  streakText: { fontSize: 12, fontWeight: '700', color: colors.surface },

  achScroll: { marginTop: 4 },
  achBadge: {
    width: 76,
    alignItems: 'center',
    marginRight: spacing.sm,
    padding: spacing.sm,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.45,
  },
  achBadgeUnlocked: {
    opacity: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  achIcon: { fontSize: 26, lineHeight: 30 },
  achIconLocked: { opacity: 0.4 },
  achName: { fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 4, lineHeight: 13 },
  achNameLocked: { color: colors.textMuted },
  achCheck: { fontSize: 10, fontWeight: '900', color: colors.primary, marginTop: 2 },
});
