import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

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
