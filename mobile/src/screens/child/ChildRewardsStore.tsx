import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { HAPTIC_PATTERNS } from '../../theme/kinetic-mobile-theme.js';
import { createChildSupabaseClient, getSupabaseChildTableName } from '../../lib/supabase';

/** Matches ChildDashboard (Time Bank) kinetic cream theme. */
const TIME_BANK_CREAM = '#F9F9F4';
const TEXT_DARK = '#1A1A1E';

type PurchasableReward = {
  id: string;
  title: string;
  costMinutes: number;
  description?: string;
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

function newRequestId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function ChildRewardsStore() {
  const insets = useSafeAreaInsets();
  const { user, refreshMe, token, role } = useAuth();
  const childId =
    user && typeof user === 'object' && 'id' in user && typeof (user as { id?: unknown }).id === 'string'
      ? (user as { id: string }).id
      : '';

  const supabaseRef = useRef(createChildSupabaseClient(token));
  useEffect(() => {
    supabaseRef.current = createChildSupabaseClient(token);
  }, [token]);

  const timeBankMinutes = useMemo(() => readTimeBankMinutes(user as Record<string, unknown>), [user]);

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe])
  );

  const onBuy = useCallback(
    async (reward: PurchasableReward) => {
      if (role !== 'child' || !childId || !token) return;
      if (timeBankMinutes < reward.costMinutes) return;

      const supabase = supabaseRef.current;
      if (!supabase) {
        Alert.alert('Unavailable', 'Supabase is not configured on this build.');
        return;
      }

      const childTable = getSupabaseChildTableName();
      const now = new Date().toISOString();

      const { data: profile, error: fetchErr } = await supabase
        .from(childTable)
        .select('time_bank_minutes, family_id')
        .eq('id', childId)
        .maybeSingle();

      if (fetchErr) {
        Alert.alert('Could not read Time Bank', fetchErr.message);
        return;
      }

      const row = profile as Record<string, unknown>;
      const bank = readTimeBankMinutes(row);
      const familyId =
        typeof row.family_id === 'string' && row.family_id.trim() !== ''
          ? row.family_id.trim()
          : null;

      if (!familyId) {
        Alert.alert('Cannot send request', 'Your profile is missing family information. Ask a parent to refresh the app.');
        return;
      }

      if (reward.costMinutes > bank) {
        Alert.alert('Not enough minutes', 'Your balance changed. Try again.');
        void refreshMe();
        return;
      }

      const { data: updatedRow, error: decErr } = await supabase
        .from(childTable)
        .update({ time_bank_minutes: bank - reward.costMinutes, updated_at: now })
        .eq('id', childId)
        .eq('time_bank_minutes', bank)
        .select('time_bank_minutes')
        .maybeSingle();

      if (decErr || !updatedRow) {
        void refreshMe();
        Alert.alert('Balance updated', 'Your Time Bank changed. Try again.');
        return;
      }

      const { error: insErr } = await supabase.from('reward_requests').insert({
        id: newRequestId(),
        child_id: childId,
        family_id: familyId,
        reward_title: reward.title,
        cost_minutes: reward.costMinutes,
        status: 'pending',
        created_at: now,
      });

      if (insErr) {
        await supabase
          .from(childTable)
          .update({ time_bank_minutes: bank, updated_at: new Date().toISOString() })
          .eq('id', childId);
        Alert.alert('Could not send request', insErr.message);
        void refreshMe();
        return;
      }

      HAPTIC_PATTERNS.success();
      void refreshMe();
      Alert.alert('Request sent to parent!');
    },
    [childId, refreshMe, role, timeBankMinutes, token]
  );

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
