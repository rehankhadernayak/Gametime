import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { HAPTIC_PATTERNS } from '../../theme/kinetic-mobile-theme.js';
import { createChildSupabaseClient } from '../../lib/supabase';

/** Matches ChildDashboard (Time Bank) kinetic cream theme. */
const TIME_BANK_CREAM = '#F9F9F4';
const TEXT_DARK = '#1A1A1E';

type PurchasableReward = {
  id: string;
  title: string;
  costMinutes: number;
  description?: string;
};

type ClaimedRewardRow = {
  id: string;
  reward_title: string;
  gift_card_code: string | null;
  status: string;
};

const MOCK_PURCHASABLE: PurchasableReward[] = [
  {
    id: 'late_30',
    title: 'Stay up 30 mins late',
    costMinutes: 120,
    description: 'One-time bedtime extension — parent approves.',
  },
  {
    id: 'skip_chore',
    title: 'Skip a chore',
    costMinutes: 200,
    description: 'Ask to skip one assigned chore this week.',
  },
  {
    id: 'extra_screen',
    title: 'Extra 15 min screen time',
    costMinutes: 45,
    description: 'Bonus play time on a school night.',
  },
  {
    id: 'pick_dinner',
    title: 'Pick dinner for the family',
    costMinutes: 80,
    description: 'You choose the meal (within reason!).',
  },
];

function readTimeBankMinutes(user: Record<string, unknown> | null | undefined): number {
  if (!user) return 0;
  const v =
    user.timeBankMinutes ??
    user.time_bank_minutes ??
    (user as { timeBank?: { minutes?: number } }).timeBank?.minutes;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function obscureCode(code: string): string {
  const len = Math.min(Math.max(code.length, 8), 24);
  return '●'.repeat(len);
}

export default function ChildRewardsStore() {
  const insets = useSafeAreaInsets();
  const { token, role, user, refreshMe } = useAuth();
  const childId =
    user && typeof user === 'object' && 'id' in user && typeof (user as { id?: unknown }).id === 'string'
      ? (user as { id: string }).id
      : '';

  const timeBankMinutes = useMemo(() => readTimeBankMinutes(user as Record<string, unknown>), [user]);

  const supabaseRef = useRef(createChildSupabaseClient(token));
  useEffect(() => {
    supabaseRef.current = createChildSupabaseClient(token);
  }, [token]);

  const supabaseConfigured = Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );

  const [claimed, setClaimed] = useState<ClaimedRewardRow[]>([]);
  const [claimedLoading, setClaimedLoading] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const loadClaimed = useCallback(async () => {
    if (role !== 'child' || !childId || !token) {
      setClaimed([]);
      return;
    }
    const supabase = supabaseRef.current;
    if (!supabase) {
      setClaimed([]);
      return;
    }
    setClaimedLoading(true);
    const { data, error } = await supabase
      .from('reward_requests')
      .select('id, reward_title, gift_card_code, status')
      .eq('child_id', childId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      setClaimed([]);
      setClaimedLoading(false);
      return;
    }
    setClaimed((data ?? []) as ClaimedRewardRow[]);
    setClaimedLoading(false);
  }, [role, childId, token]);

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
      void loadClaimed();
    }, [refreshMe, loadClaimed])
  );

  const toggleReveal = useCallback((id: string) => {
    HAPTIC_PATTERNS.success();
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const copyCode = useCallback(async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      HAPTIC_PATTERNS.success();
      Alert.alert('Copied', 'Gift card code copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Could not copy to clipboard.');
    }
  }, []);

  const onBuy = (reward: PurchasableReward) => {
    if (timeBankMinutes < reward.costMinutes) return;
    HAPTIC_PATTERNS.success();
    Alert.alert('Request sent to parent!');
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: TIME_BANK_CREAM }]}
      contentContainerStyle={{
        paddingTop: spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Time Bank</Text>
        <Text style={styles.heroValue} accessibilityRole="header">
          {timeBankMinutes} min available
        </Text>
        <Text style={styles.heroHint}>
          Spend your saved minutes on special perks. Your parent will confirm each request.
        </Text>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>My Claimed Rewards</Text>
      </View>

      {!supabaseConfigured ? (
        <Text style={styles.hintMuted}>Connect Supabase in app config to load claimed rewards.</Text>
      ) : claimedLoading ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Loading claimed rewards" />
      ) : claimed.length === 0 ? (
        <Text style={styles.hintMuted}>No approved rewards yet. When your parent approves a gift card, it shows up here.</Text>
      ) : (
        claimed.map((row) => {
          const code = row.gift_card_code?.trim() ?? '';
          const hasCode = code.length > 0;
          const revealed = revealedIds[row.id] ?? false;
          return (
            <View key={row.id} style={styles.claimedCard}>
              <Text style={styles.rewardTitle}>{row.reward_title}</Text>
              <Text style={styles.claimedLabel}>Gift card code</Text>
              {hasCode ? (
                <>
                  <Pressable
                    onPress={() => toggleReveal(row.id)}
                    style={({ pressed }) => [styles.revealShell, pressed && styles.revealPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={revealed ? 'Hide gift card code' : 'Tap to reveal gift card code'}
                  >
                    <Text
                      style={[styles.codeText, !revealed && styles.codeTextHidden]}
                      selectable={revealed}
                      numberOfLines={1}
                    >
                      {revealed ? code : obscureCode(code)}
                    </Text>
                    {!revealed ? (
                      <Text style={styles.revealHint}>Tap to reveal</Text>
                    ) : null}
                  </Pressable>
                  {revealed ? (
                    <Pressable
                      onPress={() => void copyCode(code)}
                      style={({ pressed }) => [styles.copyBtn, pressed && styles.copyBtnPressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Copy gift card code"
                    >
                      <Text style={styles.copyBtnText}>Copy</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : (
                <Text style={styles.hintMuted}>Your parent hasn&apos;t added the code yet.</Text>
              )}
            </View>
          );
        })
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Purchasable rewards</Text>
      </View>

      {MOCK_PURCHASABLE.map((reward) => {
        const canBuy = timeBankMinutes >= reward.costMinutes;
        return (
          <View key={reward.id} style={styles.rewardCard}>
            <View style={styles.rewardTop}>
              <View style={styles.rewardTextCol}>
                <Text style={styles.rewardTitle}>{reward.title}</Text>
                {reward.description ? (
                  <Text style={styles.rewardDesc}>{reward.description}</Text>
                ) : null}
              </View>
              <View style={styles.costPill}>
                <Text style={styles.costValue}>{reward.costMinutes}</Text>
                <Text style={styles.costLabel}>min</Text>
              </View>
            </View>

            {!canBuy ? (
              <Text style={styles.needMore}>
                Need {reward.costMinutes - timeBankMinutes} more min in your Time Bank
              </Text>
            ) : null}

            <Pressable
              onPress={() => onBuy(reward)}
              disabled={!canBuy}
              style={({ pressed }) => [
                styles.buyBtn,
                !canBuy && styles.buyBtnDisabled,
                pressed && canBuy && styles.buyBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canBuy }}
              accessibilityLabel={`Buy ${reward.title} for ${reward.costMinutes} minutes`}
            >
              <Text style={[styles.buyBtnText, !canBuy && styles.buyBtnTextDisabled]}>Buy</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const glassCard = {
  backgroundColor: 'rgba(255, 255, 255, 0.55)',
  borderWidth: 1,
  borderColor: 'rgba(26, 26, 30, 0.08)',
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.07,
      shadowRadius: 24,
    },
    android: { elevation: 3 },
  }),
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 20,
    padding: spacing.xl,
    ...glassCard,
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
  sectionRow: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  hintMuted: {
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_DARK,
    opacity: 0.5,
  },
  claimedCard: {
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    ...glassCard,
  },
  claimedLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TEXT_DARK,
    opacity: 0.45,
    marginTop: spacing.xs,
  },
  revealShell: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(26, 26, 30, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(124, 91, 255, 0.18)',
    minHeight: 52,
    justifyContent: 'center',
  },
  revealPressed: {
    opacity: 0.92,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: TEXT_DARK,
    fontVariant: ['tabular-nums'],
  },
  codeTextHidden: {
    letterSpacing: 2,
    opacity: 0.85,
  },
  revealHint: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    opacity: 0.9,
  },
  copyBtn: {
    marginTop: spacing.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(124, 91, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124, 91, 255, 0.35)',
  },
  copyBtnPressed: {
    opacity: 0.88,
  },
  copyBtnText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 15,
  },
  rewardCard: {
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    ...glassCard,
  },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rewardTextCol: {
    flex: 1,
    gap: spacing.xs,
  },
  rewardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  rewardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_DARK,
    opacity: 0.62,
  },
  costPill: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 91, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 91, 255, 0.22)',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  costLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    opacity: 0.75,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  needMore: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_DARK,
    opacity: 0.45,
  },
  buyBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  buyBtnPressed: {
    opacity: 0.88,
  },
  buyBtnDisabled: {
    backgroundColor: 'rgba(26, 26, 30, 0.12)',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  buyBtnTextDisabled: {
    color: 'rgba(26, 26, 30, 0.35)',
  },
});
