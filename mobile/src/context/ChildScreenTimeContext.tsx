import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createChildSupabaseClient, getSupabaseChildTableName } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type ChildScreenTimeContextValue = {
  /** Serialized picker JSON for `applyShield`, or null when unset / empty */
  screenTimeSelectionJson: string | null;
  refresh: () => Promise<void>;
};

const ChildScreenTimeContext = createContext<ChildScreenTimeContextValue | null>(null);

function readScreenTimeSelection(row: Record<string, unknown> | null | undefined): string | null {
  const raw = row?.screen_time_selection;
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

export function ChildScreenTimeProvider({ children }: { children: ReactNode }) {
  const { token, role, user } = useAuth();
  const childId =
    user && typeof user === 'object' && 'id' in user && typeof (user as { id?: unknown }).id === 'string'
      ? (user as { id: string }).id
      : '';

  const [screenTimeSelectionJson, setScreenTimeSelectionJson] = useState<string | null>(null);

  const supabaseRef = useRef(createChildSupabaseClient(token));
  useEffect(() => {
    supabaseRef.current = createChildSupabaseClient(token);
  }, [token]);

  const refresh = useCallback(async () => {
    if (role !== 'child' || !childId || !token) {
      setScreenTimeSelectionJson(null);
      return;
    }
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const childTable = getSupabaseChildTableName();
    const { data, error } = await supabase
      .from(childTable)
      .select('screen_time_selection')
      .eq('id', childId)
      .maybeSingle();
    if (error) return;
    setScreenTimeSelectionJson(readScreenTimeSelection(data as Record<string, unknown> | null));
  }, [role, childId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (role !== 'child' || !childId || !token) return;

    const supabase = supabaseRef.current;
    if (!supabase) return;

    const childTable = getSupabaseChildTableName();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const setupChannel = () => {
      if (cancelled) return;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      const nextChannel = supabase.channel(`child-screen-time:${childId}`);
      channel = nextChannel;
      nextChannel
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: childTable, filter: `id=eq.${childId}` },
          (payload: { new: Record<string, unknown> }) => {
            setScreenTimeSelectionJson(readScreenTimeSelection(payload.new));
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

  const value = useMemo(
    () => ({ screenTimeSelectionJson, refresh }),
    [screenTimeSelectionJson, refresh],
  );

  return <ChildScreenTimeContext.Provider value={value}>{children}</ChildScreenTimeContext.Provider>;
}

export function useChildScreenTime(): ChildScreenTimeContextValue {
  const ctx = useContext(ChildScreenTimeContext);
  if (!ctx) {
    throw new Error('useChildScreenTime must be used within ChildScreenTimeProvider');
  }
  return ctx;
}

/** For hooks that may run outside the child tree; returns null when unavailable. */
export function useChildScreenTimeOptional(): ChildScreenTimeContextValue | null {
  return useContext(ChildScreenTimeContext);
}
