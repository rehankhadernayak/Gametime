import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";

let browserClient: SupabaseClient | null | undefined;

/** Edge Functions can `realtime.broadcast` this event when a reward request is approved (pairs with mobile listener). */
export const REWARD_APPROVED_BROADCAST_EVENT = "reward_request_approved";

export type RewardApprovedBroadcastPayload = {
  child_id?: string;
  reward_title?: string;
  request_id?: string;
};

/**
 * Browser-only Supabase client for Realtime. Returns null if env is not configured
 * so the app can fall back to polling without throwing.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (browserClient !== undefined) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    browserClient = null;
    return null;
  }

  browserClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return browserClient;
}

export function getSupabaseChildTableName(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_CHILD_TABLE?.trim() || "child_profiles";
}

/**
 * Authenticated browser client (parent JWT). Not singleton — create per token / page.
 */
export function createSupabaseBrowserAuthedClient(accessToken: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

function showBrowserRewardApprovedToast(title: string) {
  if (typeof window === "undefined") return;
  toast.success("Reward approved", {
    description: title ? `${title} — child session will refresh.` : "Child session will refresh.",
  });
}

/**
 * Subscribe to `realtime.broadcast` from Edge Functions (same topic/event as mobile).
 * For a signed-in **child** web session: shows a toast and optional callback.
 * Parents typically do not subscribe (they trigger the approval server-side).
 */
export function subscribeRewardApprovedBroadcast(
  client: SupabaseClient,
  childId: string,
  onPayload?: (payload: RewardApprovedBroadcastPayload) => void,
): () => void {
  const trimmed = childId.trim();
  if (!trimmed) return () => {};

  const topic = `reward-child:${trimmed}`;
  const channel = client.channel(topic);

  channel.on("broadcast", { event: REWARD_APPROVED_BROADCAST_EVENT }, ({ payload }) => {
    const p = (payload ?? {}) as RewardApprovedBroadcastPayload;
    const forChild = String(p.child_id ?? "").trim();
    if (forChild && forChild !== trimmed) return;

    onPayload?.(p);

    const title = String(p.reward_title ?? "").trim();
    showBrowserRewardApprovedToast(title);
  });

  void channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
