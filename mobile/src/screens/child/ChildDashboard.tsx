import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

/** Light cream surface — Time Bank hero (brand brief). */
const TIME_BANK_CREAM = '#F9F9F4';
const TEXT_DARK = '#1A1A1E';

type LockedApp = { id: string; name: string };

const MOCK_LOCKED_APPS: LockedApp[] = [
  { id: 'roblox', name: 'Roblox' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'minecraft', name: 'Minecraft' },
];

/** Mock starting balance until Supabase wiring lands. */
const MOCK_INITIAL_BANK_MINUTES = 120;

export default function ChildDashboard() {
  const insets = useSafeAreaInsets();

  const [balanceMinutes, setBalanceMinutes] = useState(MOCK_INITIAL_BANK_MINUTES);
  const [draftByAppId, setDraftByAppId] = useState<Record<string, number>>(() =>
    Object.fromEntries(MOCK_LOCKED_APPS.map((a) => [a.id, 0]))
  );

  const totalDraft = useMemo(
    () =>
      MOCK_LOCKED_APPS.reduce((sum, a) => sum + (draftByAppId[a.id] ?? 0), 0),
    [draftByAppId]
  );

  /** Minutes still free while sliders reserve draft amounts (live header). */
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

  const handleUnlock = useCallback((app: LockedApp) => {
    const minutes = draftByAppId[app.id] ?? 0;
    if (minutes <= 0) return;

    setBalanceMinutes((b) => Math.max(0, b - minutes));
    setDraftByAppId((prev) => ({ ...prev, [app.id]: 0 }));
    // Allocation persistence → app_allocations / Edge Function later.
  }, [draftByAppId]);

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
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Time Bank</Text>
        <Text style={styles.heroValue} accessibilityRole="header">
          {availableMinutes} Minutes Available
        </Text>
        <Text style={styles.heroHint}>
          Drag a slider to reserve minutes for an app. Your balance updates live before you unlock.
        </Text>
      </View>

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
                onPress={() => handleUnlock(app)}
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
