import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAuth } from '../../context/AuthContext';
import { createChildSupabaseClient, getSupabaseChildTableName } from '../../lib/supabase';

/** Light cream surface — Time Bank hero (brand brief). */
const TIME_BANK_CREAM = '#F9F9F4';
const TEXT_DARK = '#1A1A1E';

type LockedApp = { id: string; name: string };

type ChildTaskRow = {
  id: string;
  title: string;
  state: string;
  rewardMinutes: number;
};

const MOCK_LOCKED_APPS: LockedApp[] = [
  { id: 'roblox', name: 'Roblox' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'minecraft', name: 'Minecraft' },
];

function readTimeBankMinutes(row: Record<string, unknown> | null | undefined): number {
  const v = row?.time_bank_minutes;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  return 0;
}

function readTaskState(row: Record<string, unknown> | null | undefined): string {
  const v = row?.state;
  return typeof v === 'string' ? v : '';
}

function SubmissionConfettiOverlay({
  visible,
  onAnimationEnd,
}: {
  visible: boolean;
  onAnimationEnd: () => void;
}) {
  const { width: W, height: H } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        key: i,
        left: Math.random() * W,
        delay: Math.random() * 400,
        duration: 1800 + Math.random() * 900,
        size: 6 + Math.floor(Math.random() * 7),
        drift: (Math.random() - 0.5) * 140,
        hue: Math.floor(Math.random() * 360),
        rotateTo: Math.random() * 720 - 360,
      })),
    [W],
  );

  const anims = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!visible) return;
    const controls = pieces.map((p, i) =>
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(anims[i], {
          toValue: 1,
          duration: p.duration,
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.parallel(controls).start(() => {
      onAnimationEnd();
    });
    return () => {
      anims.forEach((a) => a.stopAnimation());
      anims.forEach((a) => a.setValue(0));
    };
  }, [visible, pieces, anims, onAnimationEnd]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={confettiStyles.root} pointerEvents="none">
        <Text style={confettiStyles.celebrateTitle}>Nice work!</Text>
        <Text style={confettiStyles.celebrateSub}>Submitted for review</Text>
        {pieces.map((p, i) => {
          const translateY = anims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [-40, H + 60],
          });
          const translateX = anims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0, p.drift],
          });
          const rotate = anims[i].interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${p.rotateTo}deg`],
          });
          const opacity = anims[i].interpolate({
            inputRange: [0, 0.08, 1],
            outputRange: [0, 1, 0.95],
          });
          return (
            <Animated.View
              key={p.key}
              style={[
                confettiStyles.bit,
                {
                  left: p.left,
                  width: p.size,
                  height: p.size * 1.6,
                  backgroundColor: `hsl(${p.hue}, 85%, 58%)`,
                  opacity,
                  transform: [{ translateY }, { translateX }, { rotate }],
                },
              ]}
            />
          );
        })}
      </View>
    </Modal>
  );
}

const confettiStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 14, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrateTitle: {
    position: 'absolute',
    top: '34%',
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  celebrateSub: {
    position: 'absolute',
    top: '41%',
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  bit: {
    position: 'absolute',
    top: -20,
    borderRadius: 2,
  },
});

function PendingPulseWrap({ active, children }: { active: boolean; children: ReactNode }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.02, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      {children}
    </Animated.View>
  );
}

export default function ChildDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const celebrateSubmission =
    typeof route.params === 'object' &&
    route.params !== null &&
    'celebrateSubmission' in route.params &&
    (route.params as { celebrateSubmission?: boolean }).celebrateSubmission === true;
  const childId = user && typeof user === 'object' && 'id' in user && typeof (user as { id?: unknown }).id === 'string'
    ? (user as { id: string }).id
    : '';

  const [balanceMinutes, setBalanceMinutes] = useState(0);
  const [draftByAppId, setDraftByAppId] = useState<Record<string, number>>(() =>
    Object.fromEntries(MOCK_LOCKED_APPS.map((a) => [a.id, 0]))
  );
  const [childTasks, setChildTasks] = useState<ChildTaskRow[]>([]);
  const [showSubmissionConfetti, setShowSubmissionConfetti] = useState(false);
  const celebrationConsumedRef = useRef(false);

  const endSubmissionCelebration = useCallback(() => {
    setShowSubmissionConfetti(false);
    celebrationConsumedRef.current = false;
  }, []);

  const supabaseRef = useRef(createChildSupabaseClient(token));
  useEffect(() => {
    supabaseRef.current = createChildSupabaseClient(token);
  }, [token]);

  const totalDraft = useMemo(
    () =>
      MOCK_LOCKED_APPS.reduce((sum, a) => sum + (draftByAppId[a.id] ?? 0), 0),
    [draftByAppId]
  );

  const availableMinutes = Math.max(0, balanceMinutes - totalDraft);

  const setDraftForApp = useCallback((appId: string, value: number) => {
    setDraftByAppId((prev) => {
      const others = MOCK_LOCKED_APPS.filter((a) => a.id !== appId);
      const sumOthers = others.reduce((s, a) => s + (prev[a.id] ?? 0), 0);
      const maxForThis = Math.max(0, balanceMinutes - sumOthers);
      const clamped = Math.min(Math.max(0, Math.round(value)), maxForThis);
      return { ...prev, [appId]: clamped };
    });
  }, [balanceMinutes]);

  /** Load balance + subscribe to parent top-ups (time_bank_minutes). */
  useEffect(() => {
    if (role !== 'child' || !childId || !token) return;

    const supabase = supabaseRef.current;
    if (!supabase) return;

    const childTable = getSupabaseChildTableName();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadBalance() {
      const { data, error } = await supabase
        .from(childTable)
        .select('time_bank_minutes')
        .eq('id', childId)
        .maybeSingle();
      if (cancelled) return;
      if (error) return;
      setBalanceMinutes(readTimeBankMinutes(data as Record<string, unknown>));
    }

    void loadBalance();

    const setupChannel = () => {
      if (cancelled) return;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      channel = supabase.channel(`child-time-bank:${childId}`);
      channel
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: childTable, filter: `id=eq.${childId}` },
          (payload) => {
            const next = readTimeBankMinutes(payload.new as Record<string, unknown>);
            setBalanceMinutes(next);
          }
        )
        .subscribe((status) => {
          if (cancelled) return;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            void supabase.removeChannel(channel!);
            channel = null;
            retryTimer = setTimeout(() => {
              retryTimer = null;
              if (!cancelled) setupChannel();
            }, 2000);
          }
        });
    };

    setupChannel();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [role, childId, token]);

  /** Quest rows + realtime updates for pending-review pulse */
  useEffect(() => {
    if (role !== 'child' || !childId || !token) {
      setChildTasks([]);
      return;
    }

    const supabase = supabaseRef.current;
    if (!supabase) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('id,title,state,reward_minutes')
        .eq('child_id', childId)
        .order('updated_at', { ascending: false });
      if (cancelled || error) return;
      const rows = (data ?? []) as Record<string, unknown>[];
      setChildTasks(
        rows.map((r) => ({
          id: String(r.id ?? ''),
          title: String(r.title ?? ''),
          state: readTaskState(r),
          rewardMinutes: readTimeBankMinutes({ time_bank_minutes: r.reward_minutes }),
        })),
      );
    }

    void loadTasks();

    const setupChannel = () => {
      if (cancelled) return;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      channel = supabase.channel(`child-tasks-dash:${childId}`);
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `child_id=eq.${childId}` },
          () => {
            void loadTasks();
          },
        )
        .subscribe((status) => {
          if (cancelled) return;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            void supabase.removeChannel(channel!);
            channel = null;
            retryTimer = setTimeout(() => {
              retryTimer = null;
              if (!cancelled) setupChannel();
            }, 2000);
          }
        });
    };

    setupChannel();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [role, childId, token]);

  useFocusEffect(
    useCallback(() => {
      if (!celebrateSubmission || celebrationConsumedRef.current) return;
      celebrationConsumedRef.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSubmissionConfetti(true);
      navigation.setParams({
        celebrateSubmission: undefined,
        celebrateTaskId: undefined,
      } as never);
    }, [celebrateSubmission, navigation]),
  );

  const handleUnlock = useCallback(
    async (app: LockedApp) => {
      const minutes = draftByAppId[app.id] ?? 0;
      if (minutes <= 0 || role !== 'child' || !childId) return;

      const supabase = supabaseRef.current;
      if (!supabase) {
        Alert.alert('Unavailable', 'Supabase is not configured on this build.');
        return;
      }

      const childTable = getSupabaseChildTableName();
      const now = new Date().toISOString();

      const { data: profile, error: fetchErr } = await supabase
        .from(childTable)
        .select('time_bank_minutes')
        .eq('id', childId)
        .maybeSingle();

      if (fetchErr) {
        Alert.alert('Could not read Time Bank', fetchErr.message);
        return;
      }

      const bank = readTimeBankMinutes(profile as Record<string, unknown>);
      if (minutes > bank) {
        Alert.alert('Not enough minutes', 'Your balance changed. Try again.');
        setBalanceMinutes(bank);
        return;
      }

      const { data: updatedRow, error: decErr } = await supabase
        .from(childTable)
        .update({ time_bank_minutes: bank - minutes, updated_at: now })
        .eq('id', childId)
        .eq('time_bank_minutes', bank)
        .select('time_bank_minutes')
        .maybeSingle();

      if (decErr || !updatedRow) {
        const { data: fresh } = await supabase
          .from(childTable)
          .select('time_bank_minutes')
          .eq('id', childId)
          .maybeSingle();
        if (fresh) setBalanceMinutes(readTimeBankMinutes(fresh as Record<string, unknown>));
        Alert.alert('Balance updated', 'Your Time Bank changed. Adjust the slider and try again.');
        return;
      }

      const { error: insErr } = await supabase.from('app_allocations').insert({
        child_id: childId,
        app_name: app.name,
        allocated_minutes: minutes,
        status: 'active',
        created_at: now,
        updated_at: now,
      });

      if (insErr) {
        await supabase
          .from(childTable)
          .update({ time_bank_minutes: bank, updated_at: new Date().toISOString() })
          .eq('id', childId);
        Alert.alert('Could not save unlock', insErr.message);
        return;
      }

      setBalanceMinutes(bank - minutes);
      setDraftByAppId((prev) => ({ ...prev, [app.id]: 0 }));
    },
    [draftByAppId, role, childId]
  );

  const pendingReviewTasks = useMemo(
    () => childTasks.filter((t) => t.state === 'PendingApproval'),
    [childTasks],
  );

  return (
    <ScrollView
      style={[styles.scrollRoot, { backgroundColor: TIME_BANK_CREAM }]}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <SubmissionConfettiOverlay visible={showSubmissionConfetti} onAnimationEnd={endSubmissionCelebration} />

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Time Bank</Text>
        <Text style={styles.heroValue} accessibilityRole="header">
          {availableMinutes} Minutes Available
        </Text>
        <Text style={styles.heroHint}>
          Drag a slider to reserve minutes for an app. Your balance updates live before you unlock.
        </Text>
      </View>

      <Pressable
        onPress={() => navigation.navigate('ChildRewardsStore' as never)}
        style={({ pressed }) => [styles.storeCard, pressed && styles.storeCardPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open reward store"
      >
        <View style={styles.storeCardText}>
          <Text style={styles.storeCardTitle}>Reward store</Text>
          <Text style={styles.storeCardSub}>Trade Time Bank minutes for perks — parent approves.</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={TEXT_DARK} style={{ opacity: 0.45 }} />
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('ChildTasks' as never)}
        style={({ pressed }) => [styles.questsCard, pressed && styles.questsCardPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open tasks and submit proof"
      >
        <View style={styles.questsCardText}>
          <Text style={styles.questsCardTitle}>Tasks & proof</Text>
          <Text style={styles.questsCardSub}>
            {pendingReviewTasks.length > 0
              ? `${pendingReviewTasks.length} waiting for parent review`
              : 'Complete chores and submit photo proof'}
          </Text>
        </View>
        <Ionicons name="checkbox-outline" size={22} color={TEXT_DARK} style={{ opacity: 0.45 }} />
      </Pressable>

      {childTasks.length > 0 ? (
        <View style={styles.questPreviewBlock}>
          <Text style={styles.questPreviewHeading}>On your list</Text>
          {childTasks.slice(0, 5).map((t) => {
            const pending = t.state === 'PendingApproval';
            const cardInner = (
              <View style={[styles.questRow, pending && styles.questRowPending]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.questTitle} numberOfLines={2}>
                    {t.title}
                  </Text>
                  <Text style={pending ? styles.questStatusPulse : styles.questStatusMuted}>
                    {pending ? 'Pending review' : t.state === 'Active' ? 'Active' : t.state}
                  </Text>
                </View>
                {t.rewardMinutes > 0 ? (
                  <View style={styles.questMinPill}>
                    <Text style={styles.questMinPillText}>+{t.rewardMinutes} min</Text>
                  </View>
                ) : null}
              </View>
            );
            return (
              <Pressable
                key={t.id}
                onPress={() => navigation.navigate('ChildTasks' as never)}
                style={({ pressed }) => [pressed && { opacity: 0.92 }]}
              >
                {pending ? <PendingPulseWrap active>{cardInner}</PendingPulseWrap> : cardInner}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.sectionHead}>
        <Ionicons name="lock-closed-outline" size={20} color={TEXT_DARK} />
        <Text style={styles.sectionTitle}>Locked Apps</Text>
      </View>

      {MOCK_LOCKED_APPS.map((app) => {
        const draft = draftByAppId[app.id] ?? 0;
        const othersSum =
          totalDraft - draft;
        const maxForSlider = Math.max(0, balanceMinutes - othersSum);

        return (
          <View key={app.id} style={styles.appCard}>
            <View style={styles.appRow}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.draftPill}>{draft} min</Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={maxForSlider <= 0 ? 1 : maxForSlider}
              step={1}
              value={Math.min(draft, maxForSlider)}
              onValueChange={(v) => setDraftForApp(app.id, v)}
              disabled={maxForSlider <= 0}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor="rgba(26,26,30,0.15)"
              thumbTintColor={colors.primary}
            />

            <View style={styles.unlockRow}>
              <Text style={styles.sliderCapHint}>
                Max {maxForSlider} min (your Time Bank)
              </Text>
              <Pressable
                onPress={() => void handleUnlock(app)}
                disabled={draft <= 0}
                style={({ pressed }) => [
                  styles.unlockBtn,
                  draft <= 0 && styles.unlockBtnDisabled,
                  pressed && draft > 0 && styles.unlockBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Unlock ${draft} minutes for ${app.name}`}
              >
                <Text style={[styles.unlockBtnText, draft <= 0 && styles.unlockBtnTextDisabled]}>
                  Unlock
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
  },
  hero: {
    backgroundColor: TIME_BANK_CREAM,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(26,26,30,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
      },
      android: { elevation: 3 },
    }),
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: TEXT_DARK,
    opacity: 0.55,
    marginBottom: spacing.sm,
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '800',
    color: TEXT_DARK,
    letterSpacing: -0.5,
  },
  heroHint: {
    marginTop: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_DARK,
    opacity: 0.65,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(26,26,30,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: { elevation: 2 },
    }),
  },
  storeCardPressed: {
    opacity: 0.92,
  },
  storeCardText: {
    flex: 1,
    gap: 4,
  },
  storeCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  storeCardSub: {
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_DARK,
    opacity: 0.55,
  },
  questsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(26,26,30,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: { elevation: 2 },
    }),
  },
  questsCardPressed: { opacity: 0.92 },
  questsCardText: { flex: 1, gap: 4 },
  questsCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  questsCardSub: {
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_DARK,
    opacity: 0.55,
  },
  questPreviewBlock: { gap: spacing.sm },
  questPreviewHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: TEXT_DARK,
    opacity: 0.45,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(26,26,30,0.06)',
  },
  questRowPending: {
    borderColor: 'rgba(124, 91, 255, 0.45)',
    backgroundColor: 'rgba(124, 91, 255, 0.06)',
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  questStatusMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_DARK,
    opacity: 0.45,
  },
  questStatusPulse: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.3,
  },
  questMinPill: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  questMinPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  appCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(26,26,30,0.06)',
    gap: spacing.sm,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appName: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  draftPill: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: 'rgba(124, 91, 255, 0.12)',
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
  },
  slider: {
    width: '100%',
    height: 44,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  sliderCapHint: {
    flex: 1,
    fontSize: 12,
    color: TEXT_DARK,
    opacity: 0.5,
  },
  unlockBtn: {
    minHeight: 48,
    minWidth: 112,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  unlockBtnPressed: {
    opacity: 0.88,
  },
  unlockBtnDisabled: {
    opacity: 0.35,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  unlockBtnTextDisabled: {
    color: '#FFFFFF',
  },
});
