"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { TASK_STATES } from "@/lib/gametimeTaskStates";
import { getSupabaseBrowserClient, getSupabaseChildTableName } from "@/lib/supabase/client";

type PostgresRow = Record<string, unknown>;

function readString(row: PostgresRow | null | undefined, key: string): string | null {
  const v = row?.[key];
  return typeof v === "string" ? v : null;
}

function readNumber(row: PostgresRow | null | undefined, key: string): number | null {
  const v = row?.[key];
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type ChildGamerHubRealtimeHandlers = {
  /** PendingApproval → Approved | Rejected (Supabase row uses same state strings as API). */
  onTaskParentDecision: (taskId: string, nextState: typeof TASK_STATES.APPROVED | typeof TASK_STATES.REJECTED) => void;
  /** Reward points (RP) increased — fire confetti immediately; caller may suppress duplicate from polling effect. */
  onPointsBalanceIncrease: (nextBalance: number) => void;
};

/**
 * Subscribes to Supabase Realtime for the signed-in child. If the client is missing
 * or the channel errors, invokes onChannelClosed (optional) and relies on polling.
 */
export function useChildGamerHubRealtime(
  childId: string | undefined,
  enabled: boolean,
  handlers: ChildGamerHubRealtimeHandlers,
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !childId) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const childTable = getSupabaseChildTableName();
    const channelName = `child-gamer-hub:${childId}`;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    /** Browser `setTimeout` id; avoids Node `Timeout` vs `number` mismatch in Next's typecheck. */
    let retryTimer: number | null = null;

    const setup = () => {
      if (cancelled) return;
      if (retryTimer != null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      channel = supabase.channel(channelName);

      channel
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tasks", filter: `child_id=eq.${childId}` },
          (payload) => {
            const oldRow = payload.old as PostgresRow | null;
            const newRow = payload.new as PostgresRow;
            const prevState = readString(oldRow, "state");
            const nextState = readString(newRow, "state");
            const taskId = readString(newRow, "id");
            if (!taskId || !nextState) return;

            if (
              prevState === TASK_STATES.PENDING_APPROVAL &&
              (nextState === TASK_STATES.APPROVED || nextState === TASK_STATES.REJECTED)
            ) {
              handlersRef.current.onTaskParentDecision(
                taskId,
                nextState as typeof TASK_STATES.APPROVED | typeof TASK_STATES.REJECTED,
              );
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: childTable, filter: `id=eq.${childId}` },
          (payload) => {
            const oldRow = payload.old as PostgresRow | null;
            const newRow = payload.new as PostgresRow;
            const prev = readNumber(oldRow, "points_balance");
            const next = readNumber(newRow, "points_balance");
            if (prev !== null && next !== null && next > prev) {
              handlersRef.current.onPointsBalanceIncrease(next);
            }
          },
        )
        .subscribe((status) => {
          if (cancelled) return;
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            void supabase.removeChannel(channel!);
            channel = null;
            retryTimer = window.setTimeout(() => {
              retryTimer = null;
              if (!cancelled) setup();
            }, 2000) as unknown as number;
          }
        });
    };

    setup();

    return () => {
      cancelled = true;
      if (retryTimer != null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (channel) void supabase.removeChannel(channel);
    };
  }, [childId, enabled]);
}
