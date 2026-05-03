import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
