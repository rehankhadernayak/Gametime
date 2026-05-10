import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArcadeMobileButton, CHILD_OS, MissionBox } from '../../components/childOs';
import { useAuth } from '../../context/AuthContext';
import { createChildSupabaseClient, getSupabaseChildTableName } from '../../lib/supabase';
import { monoFont } from '../../theme/oneBit';

const BG = '#000000';

type ChildTaskRow = {
  id: string;
  title: string;
  state: string;
  rewardMinutes: number;
};

function readTimeBankMinutes(row: Record<string, unknown> | null | undefined): number {
  const v = row?.time_bank_minutes;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  return 0;
}

function readRewardMinutesField(row: Record<string, unknown> | null | undefined): number {
  const v = row?.reward_minutes;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  return 0;
}

function readDailySpendLimit(row: Record<string, unknown> | null | undefined): number {
  const v = row?.daily_spend_limit;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  return 0;
}

function utcTodayAllocationBounds(): { start: string; endExclusive: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const start = `${y}-${m}-${d}T00:00:00.000Z`;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(next.getUTCDate()).padStart(2, '0');
  return { start, endExclusive: `${ny}-${nm}-${nd}T00:00:00.000Z` };
}

function readTaskState(row: Record<string, unknown> | null | undefined): string {
  const v = row?.state;
  return typeof v === 'string' ? v : '';
}

function missionStatusLabel(state: string): string {
  if (state === 'PendingApproval') return 'STATUS: PENDING_REVIEW';
  if (state === 'Active') return 'STATUS: ACTIVE';
  if (!state) return 'STATUS: UNKNOWN';
  return `STATUS: ${state.toUpperCase()}`;
}

export default function ChildHome() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { token, role, user } = useAuth();
  const childId =
    user && typeof user === 'object' && 'id' in user && typeof (user as { id?: unknown }).id === 'string'
      ? (user as { id: string }).id
      : '';

  const [balanceMinutes, setBalanceMinutes] = useState(0);
  const [dailySpendLimit, setDailySpendLimit] = useState(0);
  const [spentTodayMinutes, setSpentTodayMinutes] = useState(0);
  const [childTasks, setChildTasks] = useState<ChildTaskRow[]>([]);

  const supabaseRef = useRef(createChildSupabaseClient(token));
  useEffect(() => {
    supabaseRef.current = createChildSupabaseClient(token);
  }, [token]);

  const maxTotalDraftMinutes = useMemo(() => {
    const cap = dailySpendLimit;
    const bankCap = balanceMinutes;
    if (cap <= 0) return bankCap;
    const underDaily = Math.max(0, cap - spentTodayMinutes);
    return Math.min(bankCap, underDaily);
  }, [balanceMinutes, dailySpendLimit, spentTodayMinutes]);

  const availableMinutes = Math.max(0, maxTotalDraftMinutes);

  useEffect(() => {
    if (role !== 'child' || !childId || !token) return;

    const supabase = supabaseRef.current;
    if (!supabase) return;

    const childTable = getSupabaseChildTableName();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadProfile() {
      const { data, error } = await supabase
        .from(childTable)
        .select('time_bank_minutes, daily_spend_limit')
        .eq('id', childId)
        .maybeSingle();
      if (cancelled) return;
      if (error) return;
      const row = data as Record<string, unknown>;
      setBalanceMinutes(readTimeBankMinutes(row));
      setDailySpendLimit(readDailySpendLimit(row));
    }

    void loadProfile();

    const setupChannel = () => {
      if (cancelled) return;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      const nextChannel = supabase.channel(`child-os-home-bank:${childId}`);
      channel = nextChannel;
      nextChannel
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: childTable, filter: `id=eq.${childId}` },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new as Record<string, unknown>;
            setBalanceMinutes(readTimeBankMinutes(row));
            setDailySpendLimit(readDailySpendLimit(row));
          },
        )
        .subscribe((status: string) => {
          if (cancelled) return;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            void supabase.removeChannel(nextChannel);
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

  useEffect(() => {
    if (role !== 'child' || !childId || !token) return;

    const supabase = supabaseRef.current;
    if (!supabase) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadSpentToday() {
      const { start, endExclusive } = utcTodayAllocationBounds();
      const { data, error } = await supabase
        .from('app_allocations')
        .select('allocated_minutes')
        .eq('child_id', childId)
        .gte('created_at', start)
        .lt('created_at', endExclusive);
      if (cancelled) return;
      if (error) return;
      const rows = (data ?? []) as { allocated_minutes?: unknown }[];
      const sum = rows.reduce((s, r) => {
        const v = r.allocated_minutes;
        const n = typeof v === 'number' ? v : Number(v);
        return s + (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
      }, 0);
      setSpentTodayMinutes(sum);
    }

    void loadSpentToday();

    const setupChannel = () => {
      if (cancelled) return;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      const nextChannel = supabase.channel(`child-os-home-spend:${childId}`);
      channel = nextChannel;
      nextChannel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'app_allocations',
            filter: `child_id=eq.${childId}`,
          },
          () => {
            void loadSpentToday();
          },
        )
        .subscribe((status: string) => {
          if (cancelled) return;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            void supabase.removeChannel(nextChannel);
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
          rewardMinutes: readRewardMinutesField(r),
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
      const nextChannel = supabase.channel(`child-os-home-tasks:${childId}`);
      channel = nextChannel;
      nextChannel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `child_id=eq.${childId}` },
          () => {
            void loadTasks();
          },
        )
        .subscribe((status: string) => {
          if (cancelled) return;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            void supabase.removeChannel(nextChannel);
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

  const onStartSystem = useCallback(() => {
    navigation.navigate('ChildGaming' as never);
  }, [navigation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <Text style={[styles.header, { fontFamily: monoFont.regular }]} accessibilityRole="header">
        {'> TERMINAL_LINK_ESTABLISHED'}
      </Text>

      <View style={styles.centerColumn}>
        <View style={styles.timeBlock}>
          <Text
            style={[styles.timeValue, { fontFamily: monoFont.bold }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.04}
            accessibilityLabel={`${availableMinutes} minutes screen time available`}
          >
            {String(availableMinutes)}
          </Text>
          <Text style={[styles.timeUnit, { fontFamily: monoFont.regular }]}>SCREEN TIME · MIN</Text>
        </View>

        <ArcadeMobileButton onPress={onStartSystem} style={styles.startBtn} children="START SYSTEM" />
      </View>

      <Text style={[styles.listHeading, { fontFamily: monoFont.semibold }]}>CURRENT TASKS</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          gap: 10,
          paddingTop: 8,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {childTasks.length === 0 ? (
          <Text style={[styles.empty, { fontFamily: monoFont.regular }]}>{'> NO_ACTIVE_MISSIONS'}</Text>
        ) : (
          childTasks.map((t: ChildTaskRow) => (
            <View key={t.id}>
              <MissionBox
                title={t.title}
                status={missionStatusLabel(t.state)}
                rewardLine={t.rewardMinutes > 0 ? `+${t.rewardMinutes} MIN` : null}
                onPress={() => navigation.navigate('ChildTasks' as never)}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16,
  },
  header: {
    color: CHILD_OS.ink,
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingTop: 4,
  },
  centerColumn: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    minHeight: 200,
    paddingVertical: 12,
    gap: 20,
  },
  timeBlock: {
    minHeight: 120,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  timeValue: {
    color: CHILD_OS.ink,
    fontSize: 160,
    lineHeight: 164,
    width: '100%',
    textAlign: 'center',
  },
  timeUnit: {
    marginTop: 10,
    color: CHILD_OS.muted,
    fontSize: 11,
    letterSpacing: 2,
  },
  startBtn: {
    alignSelf: 'stretch',
  },
  listHeading: {
    color: CHILD_OS.muted,
    fontSize: 11,
    letterSpacing: 1.6,
    marginTop: 8,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 320,
  },
  empty: {
    color: CHILD_OS.muted,
    fontSize: 12,
    paddingVertical: 16,
    letterSpacing: 0.5,
  },
});
