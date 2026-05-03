import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';

/** Edge Functions / DB webhooks can `realtime.broadcast` this topic when reward_requests becomes approved. */
export const REWARD_APPROVED_BROADCAST_EVENT = 'reward_request_approved';

export type RewardApprovedBroadcastPayload = {
  child_id?: string;
  reward_title?: string;
  request_id?: string;
};

/**
 * Browser/RN Supabase client with the child's Gametime JWT forwarded so RLS can
 * identify the session. Recreate when the token changes.
 */
export function createChildSupabaseClient(accessToken: string | undefined): SupabaseClient | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;

  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

export function getSupabaseChildTableName(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_CHILD_TABLE?.trim() || 'child_profiles';
}

/**
 * Subscribe to Edge Function / server `realtime.broadcast` payloads on the child session.
 * When `reward_request_approved` fires for this child, shows a local Expo notification
 * (push may already be sent server-side; this covers foreground + broadcast-only setups).
 */
export function subscribeRewardApprovedBroadcast(
  client: SupabaseClient,
  childId: string,
  onPayload?: (payload: RewardApprovedBroadcastPayload) => void
): () => void {
  const trimmed = childId.trim();
  if (!trimmed) return () => {};

  const topic = `reward-child:${trimmed}`;
  const channel = client.channel(topic);

  channel.on('broadcast', { event: REWARD_APPROVED_BROADCAST_EVENT }, ({ payload }) => {
    const p = (payload ?? {}) as RewardApprovedBroadcastPayload;
    const forChild = String(p.child_id ?? '').trim();
    if (forChild && forChild !== trimmed) return;

    onPayload?.(p);

    const title = String(p.reward_title ?? '').trim() || 'Reward approved';
    void Notifications.scheduleNotificationAsync({
      content: {
        title: 'Reward approved!',
        body: `${title} — tap to open your reward store.`,
        data: { type: 'reward_request_approved', request_id: p.request_id, child_id: forChild || trimmed },
      },
      trigger: null,
    });
  });

  void channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
