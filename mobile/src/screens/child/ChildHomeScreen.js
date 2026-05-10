import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Banner from '../../components/Banner';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { getErrorMessage } from '../../utils/format';
import { normalizeTasksListResponse } from '../../utils/tasksList.js';

// ─── Animated Counter (smooth number transitions) ─────────────────────────────
function AnimatedNumber({ value, style }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 600,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(Math.floor(v));
    });

    return () => animatedValue.removeListener(listener);
  }, [value]);

  return <Text style={style}>{displayValue}</Text>;
}

// ─── Premium Hero Balance Card (with scale & glow animation) ────────────────────
function HeroBalanceCard({ rp, gp }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <LinearGradient
        colors={colors.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={heroStyles.card}
      >
        {/* Animated glow overlay */}
        <MotiView
          style={heroStyles.glowOverlay}
          animate={{
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            type: 'timing',
            duration: 3000,
            loop: true,
            easing: Easing.inOut(Easing.ease),
          }}
        />

        <View style={heroStyles.row}>
          {/* RP Column */}
          <MotiView
            style={heroStyles.col}
            animate={{ translateY: 0 }}
            from={{ translateY: 20 }}
            transition={{
              type: 'timing',
              duration: 500,
              delay: 100,
            }}
          >
            <AnimatedNumber value={rp} style={heroStyles.number} />
            <Text style={heroStyles.unit}>Reward</Text>
            <Text style={heroStyles.unit}>Points</Text>
          </MotiView>

          <View style={heroStyles.divider} />

          {/* GP Column */}
          <MotiView
            style={heroStyles.col}
            animate={{ translateY: 0 }}
            from={{ translateY: 20 }}
            transition={{
              type: 'timing',
              duration: 500,
              delay: 200,
            }}
          >
            <AnimatedNumber value={gp} style={heroStyles.number} />
            <View style={heroStyles.gpPill}>
              <Text style={heroStyles.gpPillText}>🎁 GP</Text>
            </View>
            <Text style={heroStyles.unit}>Gift Points</Text>
          </MotiView>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    borderRadius: 0,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[6],
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 4,
    overflow: 'hidden',
    marginVertical: spacing.md,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  col: { alignItems: 'center', gap: 6 },
  divider: {
    width: 2,
    height: 64,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  number: {
    fontSize: 56,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 60,
    letterSpacing: -1,
  },
  unit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#404040',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  gpPill: {
    backgroundColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  gpPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

// ─── Gaming Time Card (with smooth progress animation) ──────────────────────────
function GamingTimeCard({ overview }) {
  const playable = overview?.usage?.playableNow ?? 0;
  const todayUsed = overview?.usage?.todayUsedMinutes ?? 0;
  const dailyCap = overview?.caps?.dailyCapMinutes ?? 120;
  const capPct = dailyCap > 0 ? Math.min(1, todayUsed / dailyCap) : 0;

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: capPct,
      duration: 800,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [capPct]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <MotiView
      style={{ marginVertical: spacing.sm }}
      animate={{ opacity: 1, scale: 1 }}
      from={{ opacity: 0.8, scale: 0.95 }}
      transition={{
        type: 'timing',
        duration: 400,
        delay: 300,
      }}
    >
      <Card>
        <Text style={styles.cardLabel}>⏱️ Gaming Time Available</Text>
        <View style={styles.gamingRow}>
          <MotiView
            animate={{ scale: 1 }}
            from={{ scale: 0.8 }}
            transition={{ type: 'timing', duration: 500 }}
          >
            <Text style={styles.gamingBig}>{playable}</Text>
            <Text style={styles.gamingUnit}>minutes</Text>
          </MotiView>

          <View style={styles.gamingRight}>
            <Text style={styles.gamingMeta}>
              Today: {todayUsed} / {dailyCap} min
            </Text>
            <View style={styles.capBarTrack}>
              <Animated.View
                style={[
                  styles.capBarFill,
                  { width: progressWidth },
                  capPct > 0.8 && { backgroundColor: colors.warning },
                ]}
              />
            </View>
            <Text style={styles.gamingMeta}>{Math.round(capPct * 100)}% of daily cap</Text>
          </View>
        </View>
      </Card>
    </MotiView>
  );
}

// ─── Interactive Speed Control Slider (astrodither-inspired) ────────────────────
function SpeedControlSlider() {
  const [speed, setSpeed] = useState(1);
  const speedAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(speedAnim, {
      toValue: speed,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [speed]);

  return (
    <MotiView
      style={styles.speedControl}
      animate={{ opacity: 1 }}
      from={{ opacity: 0 }}
      transition={{ type: 'timing', duration: 400, delay: 400 }}
    >
      <View style={styles.speedHeader}>
        <Text style={styles.speedTitle}>⚡ Interaction Speed</Text>
        <Text style={styles.speedValue}>{(speed * 100).toFixed(0)}%</Text>
      </View>

      <View style={styles.speedSliderTrack}>
        <View
          style={[
            styles.speedSliderFill,
            {
              width: `${(speed - 0.5) / 1.5 * 100}%`,
            },
          ]}
        />
      </View>

      <Text style={styles.speedHint}>Drag to adjust animation speed ↓</Text>
    </MotiView>
  );
}

// ─── AI Hero Panel with smooth entry animation ─────────────────────────────────
const AI_QUICK_CHIPS = [
  { label: 'What tasks?', text: 'What tasks do I have?' },
  { label: 'My RP?', text: 'How many RP do I have?' },
  { label: 'Shop?', text: 'What can I buy?' },
];

function AiHeroPanel({ user, tasks, streak, navigation }) {
  const [chatInput, setChatInput] = useState('');
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Explorer';

  let greeting;
  const pendingCount = tasks.filter((t) => t.status === 'active' || t.status === 'started').length;
  if (pendingCount > 0) {
    greeting = `Hey ${firstName}! You have ${pendingCount} task${pendingCount !== 1 ? 's' : ''} waiting.`;
  } else if (streak > 0) {
    greeting = `You're on a ${streak}-day streak! Keep it going! 🔥`;
  } else {
    greeting = `All caught up! Ask me anything.`;
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
    <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
      <MotiView style={styles.aiHero}>
        {/* Avatar + greeting */}
        <View style={styles.aiHeroTop}>
          <MotiView
            style={styles.aiHeroAvatar}
            animate={{ rotate: '360deg' }}
            from={{ rotate: '0deg' }}
            transition={{
              type: 'timing',
              duration: 3000,
              loop: true,
            }}
          >
            <Text style={styles.aiHeroAvatarEmoji}>🤖</Text>
          </MotiView>

          <MotiView
            style={styles.aiHeroBubble}
            animate={{ scale: 1 }}
            from={{ scale: 0.9 }}
            transition={{ type: 'timing', duration: 400, delay: 100 }}
          >
            <Text style={styles.aiHeroGreeting}>{greeting}</Text>
          </MotiView>
        </View>

        {/* Quick reply chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiHeroChips}>
          {AI_QUICK_CHIPS.map((chip, idx) => (
            <MotiView
              key={chip.label}
              style={styles.aiHeroChipWrap}
              animate={{ opacity: 1, translateY: 0 }}
              from={{ opacity: 0, translateY: 10 }}
              transition={{
                type: 'timing',
                duration: 300,
                delay: 200 + idx * 50,
              }}
            >
              <TouchableOpacity
                style={styles.aiHeroChip}
                onPress={() => handleChip(chip.text)}
                activeOpacity={0.7}
              >
                <Text style={styles.aiHeroChipText}>{chip.label}</Text>
              </TouchableOpacity>
            </MotiView>
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
      </MotiView>
    </Animated.View>
  );
}

// ─── Achievements Strip (smooth horizontal scroll with scale on tap) ─────────────
function AchievementsStrip({ achievements, streak }) {
  return achievements.length > 0 ? (
    <MotiView
      style={{ marginVertical: spacing.sm }}
      animate={{ opacity: 1 }}
      from={{ opacity: 0 }}
      transition={{ type: 'timing', duration: 400, delay: 500 }}
    >
      <Card>
        <View style={styles.achHeader}>
          <Text style={styles.cardLabel}>✨ Achievements</Text>
          {streak > 0 ? (
            <MotiView
              style={styles.streakChip}
              animate={{ scale: 1 }}
              from={{ scale: 0.8 }}
              transition={{ type: 'timing', duration: 300 }}
            >
              <Text style={styles.streakText}>🔥 {streak} day streak</Text>
            </MotiView>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achScroll}>
          {achievements.map((ach, idx) => (
            <MotiView
              key={ach.id}
              style={[styles.achBadge, ach.unlocked && styles.achBadgeUnlocked]}
              animate={{ scale: 1, opacity: 1 }}
              from={{ scale: 0.8, opacity: 0 }}
              transition={{
                type: 'timing',
                duration: 400,
                delay: 550 + idx * 30,
              }}
              onPress={() => {
                // Haptic feedback on tap (if available)
              }}
            >
              <Text style={[styles.achIcon, !ach.unlocked && styles.achIconLocked]}>{ach.icon}</Text>
              <Text
                style={[styles.achName, !ach.unlocked && styles.achNameLocked]}
                numberOfLines={2}
              >
                {ach.name}
              </Text>
              {ach.unlocked ? <Text style={styles.achCheck}>✓</Text> : null}
            </MotiView>
          ))}
        </ScrollView>
      </Card>
    </MotiView>
  ) : null;
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
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
        apiRequest('/tasks/list', { token }).catch(() => ({ tasks: [], serverTime: null })),
      ]);
      setNotifications(list);
      setGamingOverview(overview);
      setAchievements(achRes?.achievements ?? []);
      setStreak(streakRes?.streak ?? 0);
      setTasks(normalizeTasksListResponse(taskRes).tasks);
      await refreshMe();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, refreshMe]);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load(true);
  }

  const unread = notifications.filter((n) => !n.read);

  return (
    <Screen testID="child-home-screen" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Top bar with smooth entry */}
      <MotiView
        style={styles.topBar}
        animate={{ opacity: 1, translateY: 0 }}
        from={{ opacity: 0, translateY: -20 }}
        transition={{ type: 'timing', duration: 300 }}
      >
        <Text style={styles.topGreeting}>Hi, {user?.name?.split(' ')[0] ?? 'there'}</Text>
        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChildNotifications')}
            style={styles.topBtn}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.childAccentDark} />
            {unread.length > 0 && (
              <MotiView
                style={styles.topBtnBadge}
                animate={{ scale: 1 }}
                from={{ scale: 1.5 }}
                transition={{ type: 'timing', duration: 300 }}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Account')}
            style={styles.topBtn}
            accessibilityLabel="Account"
          >
            <Ionicons name="person-circle-outline" size={22} color={colors.childAccentDark} />
          </TouchableOpacity>
        </View>
      </MotiView>

      {loading ? (
        <Spinner full />
      ) : (
        <>
          {/* AI Hero Panel */}
          <AiHeroPanel user={user} tasks={tasks} streak={streak} navigation={navigation} />

          {/* Premium Hero Balance Card */}
          <HeroBalanceCard rp={user?.pointsBalance ?? 0} gp={user?.giftcardPointsBalance ?? 0} />

          {/* Speed Control Slider */}
          <SpeedControlSlider />

          {/* Gaming Time Card */}
          {gamingOverview ? <GamingTimeCard overview={gamingOverview} /> : null}

          {/* Achievements Strip */}
          <AchievementsStrip achievements={achievements} streak={streak} />

          {/* Notifications Preview */}
          {unread.length > 0 ? (
            <MotiView
              style={{ marginVertical: spacing.sm }}
              animate={{ opacity: 1 }}
              from={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 400, delay: 600 }}
            >
              <Card>
                <View style={styles.notifHeader}>
                  <Text style={styles.cardLabel}>🔔 New Notifications</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('ChildNotifications')}>
                    <Text style={styles.seeAll}>See all →</Text>
                  </TouchableOpacity>
                </View>
                {unread.slice(0, 3).map((n, idx) => (
                  <MotiView
                    key={n.id}
                    style={styles.notifItem}
                    animate={{ opacity: 1, translateX: 0 }}
                    from={{ opacity: 0, translateX: -10 }}
                    transition={{
                      type: 'timing',
                      duration: 300,
                      delay: 650 + idx * 50,
                    }}
                  >
                    <View style={styles.notifDot} />
                    <Text style={styles.notifText}>{n.message}</Text>
                  </MotiView>
                ))}
              </Card>
            </MotiView>
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
    marginBottom: spacing.md,
  },
  topGreeting: { fontSize: 18, fontWeight: '800', color: colors.text },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  topBtnBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.background,
  },

  // ── Card labels ──
  cardLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Gaming Time ──
  gamingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gamingBig: { fontSize: 42, fontWeight: '900', color: colors.primaryDark, lineHeight: 46 },
  gamingUnit: { fontSize: 13, color: colors.textMuted },
  gamingRight: { flex: 1, gap: spacing.sm },
  gamingMeta: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  capBarTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  capBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },

  // ── Speed Control ──
  speedControl: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  speedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  speedTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  speedValue: { fontSize: 14, fontWeight: '800', color: colors.primary },
  speedSliderTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.sm },
  speedSliderFill: { height: '100%', backgroundColor: colors.warning },
  speedHint: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },

  // ── AI Hero Panel ──
  aiHero: {
    backgroundColor: colors.childSurface,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.childAccent + '44',
    gap: spacing.md,
    shadowColor: colors.childAccent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  aiHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  aiHeroAvatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.childAccent + '20',
    borderRadius: 24,
  },
  aiHeroAvatarEmoji: { fontSize: 28 },
  aiHeroBubble: {
    flex: 1,
    backgroundColor: colors.childAccent + '10',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.childAccent,
  },
  aiHeroGreeting: { fontSize: 13, color: colors.text, fontWeight: '500', lineHeight: 18 },
  aiHeroChips: { gap: spacing.xs, paddingHorizontal: 0 },
  aiHeroChipWrap: { marginRight: spacing.xs },
  aiHeroChip: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  aiHeroChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  aiHeroInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  aiHeroInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 13,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiHeroSendBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.childAccent,
    borderRadius: 10,
  },
  aiHeroSendBtnDisabled: { backgroundColor: colors.border },
  aiHeroSendText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // ── Achievements ──
  achHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  streakChip: {
    backgroundColor: colors.warning + '20',
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  streakText: { fontSize: 12, fontWeight: '700', color: colors.warning },
  achScroll: { gap: spacing.xs },
  achBadge: {
    alignItems: 'center',
    gap: 6,
    padding: spacing.xs,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    minWidth: 64,
    opacity: 0.6,
    marginRight: spacing.xs,
  },
  achBadgeUnlocked: {
    backgroundColor: colors.secondary + '20',
    opacity: 1,
  },
  achIcon: { fontSize: 24 },
  achIconLocked: { opacity: 0.4 },
  achName: { fontSize: 10, fontWeight: '600', color: colors.text, textAlign: 'center' },
  achNameLocked: { color: colors.textMuted },
  achCheck: { fontSize: 12, fontWeight: '800', color: colors.secondary },

  // ── Notifications ──
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  seeAll: { fontSize: 12, fontWeight: '700', color: colors.childAccent },
  notifItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  notifDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.childAccent },
  notifText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 16 },
});
