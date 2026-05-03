"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { GTButton, ParentTheme, EmptyState } from "@/components/ui";
import { createSupabaseBrowserAuthedClient, getSupabaseChildTableName } from "@/lib/supabase/client";
import styles from "./inbox.module.css";

type PendingTask = {
  id: string;
  title: string;
  rewardMinutes: number;
  childId: string;
};

type PendingGiftRequest = {
  id: string;
  rewardTitle: string;
  childId: string;
};

function readRewardMinutes(row: Record<string, unknown>): number {
  const v = row.reward_minutes;
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  return 0;
}

function readTimeBankMinutes(row: Record<string, unknown> | null | undefined): number {
  const v = row?.time_bank_minutes;
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  return 0;
}

function EvidencePlaceholder() {
  return (
    <div className={styles.evidence} aria-hidden>
      <svg className={styles.evidenceIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.evidenceCaption}>Photo evidence</span>
    </div>
  );
}

export default function ParentApprovalInboxPage() {
  const router = useRouter();
  const { auth, authHydrated } = useGametimeAuth();
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [giftRequests, setGiftRequests] = useState<PendingGiftRequest[]>([]);
  const [giftDraftById, setGiftDraftById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createSupabaseBrowserAuthedClient(auth.token));

  useEffect(() => {
    supabaseRef.current = createSupabaseBrowserAuthedClient(auth.token);
  }, [auth.token]);

  useEffect(() => {
    if (!authHydrated) return;
    if (auth.role !== "parent") router.replace("/login");
  }, [auth.role, authHydrated, router]);

  const parentId = auth.user?.id?.trim() ?? "";
  const childTable = getSupabaseChildTableName();
  const [childIds, setChildIds] = useState<string[]>([]);

  const loadPending = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase || !parentId) {
      setTasks([]);
      setGiftRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: children, error: childErr } = await supabase.from(childTable).select("id").eq("parent_id", parentId);
    if (childErr) {
      toast.error("Could not load inbox", { description: childErr.message });
      setTasks([]);
      setGiftRequests([]);
      setLoading(false);
      return;
    }
    const ids = (children ?? []).map((r) => String((r as { id: unknown }).id));
    setChildIds(ids);

    if (ids.length === 0) {
      setTasks([]);
      setGiftRequests([]);
      setLoading(false);
      return;
    }

    const [taskRes, giftRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, reward_minutes, child_id")
        .eq("time_task_status", "pending")
        .in("child_id", ids),
      supabase
        .from("reward_requests")
        .select("id, reward_title, child_id")
        .eq("status", "pending")
        .in("child_id", ids),
    ]);

    if (taskRes.error) {
      toast.error("Could not load inbox", { description: taskRes.error.message });
      setTasks([]);
      setGiftRequests([]);
      setLoading(false);
      return;
    }

    if (giftRes.error) {
      const msg = giftRes.error.message ?? "";
      const missing =
        msg.includes("reward_requests") ||
        msg.includes("schema cache") ||
        msg.toLowerCase().includes("does not exist");
      if (!missing) {
        toast.error("Could not load gift requests", { description: giftRes.error.message });
      }
      setGiftRequests([]);
    } else {
      const grows = (giftRes.data ?? []) as Record<string, unknown>[];
      setGiftRequests(
        grows.map((r) => ({
          id: String(r.id),
          rewardTitle: String(r.reward_title ?? ""),
          childId: String(r.child_id ?? ""),
        })),
      );
    }

    const rows = (taskRes.data ?? []) as Record<string, unknown>[];
    const mapped: PendingTask[] = rows.map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      rewardMinutes: readRewardMinutes(r),
      childId: String(r.child_id ?? ""),
    }));
    setTasks(mapped);
    setLoading(false);
  }, [parentId, childTable]);

  useEffect(() => {
    if (!authHydrated || auth.role !== "parent" || !parentId) return;
    void loadPending();
  }, [authHydrated, auth.role, parentId, loadPending]);

  /** Realtime: task inserts/updates for this parent's children refresh the list. */
  useEffect(() => {
    if (!authHydrated || auth.role !== "parent" || !parentId) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const ids = childIds.filter(Boolean);
    if (ids.length === 0) return;

    const filter = `child_id=in.(${ids.join(",")})`;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let retryTimer: number | null = null;

    const setup = () => {
      if (cancelled) return;
      if (retryTimer != null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      channel = supabase.channel(`parent-inbox:${parentId}:${[...ids].sort().join(",")}`);
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks", filter },
          () => {
            void loadPending();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reward_requests", filter },
          () => {
            void loadPending();
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
            }, 2000);
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
  }, [authHydrated, auth.role, parentId, childIds, loadPending]);

  const dismissGift = useCallback((id: string) => {
    setGiftRequests((prev) => prev.filter((g) => g.id !== id));
    setGiftDraftById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const onApproveGift = useCallback(
    async (req: PendingGiftRequest) => {
      const supabase = supabaseRef.current;
      if (!supabase) {
        toast.error("Supabase is not configured.");
        return;
      }

      const code = (giftDraftById[req.id] ?? "").trim();
      if (!code) {
        toast.error("Enter the gift card code", { description: "Paste or type the code before approving." });
        return;
      }

      const now = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from("reward_requests")
        .update({ status: "approved", gift_card_code: code, updated_at: now })
        .eq("id", req.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (error || !updated) {
        toast.error("Could not save gift card", { description: error?.message ?? "No rows updated." });
        void loadPending();
        return;
      }

      dismissGift(req.id);
      toast.success("Gift card saved — your child can reveal it in the app.", { duration: 3400 });
    },
    [dismissGift, giftDraftById, loadPending],
  );

  const onRejectGift = useCallback(
    async (req: PendingGiftRequest) => {
      const supabase = supabaseRef.current;
      if (!supabase) {
        dismissGift(req.id);
        return;
      }
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("reward_requests")
        .update({ status: "rejected", updated_at: now })
        .eq("id", req.id)
        .eq("status", "pending");

      if (error) {
        toast.error("Could not update request", { description: error.message });
        void loadPending();
        return;
      }
      dismissGift(req.id);
    },
    [dismissGift, loadPending],
  );

  const dismissTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const onApprove = useCallback(
    async (task: PendingTask) => {
      const supabase = supabaseRef.current;
      if (!supabase) {
        toast.error("Supabase is not configured.");
        return;
      }

      const now = new Date().toISOString();

      const { data: taskRow, error: taskFetchErr } = await supabase
        .from("tasks")
        .select("id, child_id, reward_minutes, time_task_status")
        .eq("id", task.id)
        .maybeSingle();

      if (taskFetchErr || !taskRow) {
        toast.error("Could not load task", { description: taskFetchErr?.message });
        return;
      }

      const tr = taskRow as Record<string, unknown>;
      if (tr.time_task_status !== "pending") {
        toast.message("Task is no longer pending.");
        dismissTask(task.id);
        return;
      }

      const childId = String(tr.child_id ?? "");
      const rewardMinutes = readRewardMinutes(tr);

      const { data: updatedTask, error: taskUpErr } = await supabase
        .from("tasks")
        .update({ time_task_status: "approved", updated_at: now })
        .eq("id", task.id)
        .eq("time_task_status", "pending")
        .select("id")
        .maybeSingle();

      if (taskUpErr || !updatedTask) {
        toast.error("Could not approve task", { description: taskUpErr?.message ?? "No rows updated." });
        void loadPending();
        return;
      }

      const { data: childRow, error: childFetchErr } = await supabase
        .from(childTable)
        .select("time_bank_minutes")
        .eq("id", childId)
        .maybeSingle();

      if (childFetchErr || !childRow) {
        await supabase
          .from("tasks")
          .update({ time_task_status: "pending", updated_at: new Date().toISOString() })
          .eq("id", task.id)
          .eq("time_task_status", "approved");
        toast.error("Could not read child profile", { description: childFetchErr?.message });
        return;
      }

      const bank = readTimeBankMinutes(childRow as Record<string, unknown>);
      const nextBank = Math.min(100000, bank + rewardMinutes);

      const { error: childUpErr } = await supabase
        .from(childTable)
        .update({ time_bank_minutes: nextBank, updated_at: now })
        .eq("id", childId)
        .eq("time_bank_minutes", bank);

      if (childUpErr) {
        await supabase
          .from("tasks")
          .update({ time_task_status: "pending", updated_at: new Date().toISOString() })
          .eq("id", task.id)
          .eq("time_task_status", "approved");
        toast.error("Could not credit Time Bank", { description: childUpErr.message });
        void loadPending();
        return;
      }

      dismissTask(task.id);
      toast.success("Time added to child bank!", { duration: 3200 });
    },
    [childTable, dismissTask, loadPending],
  );

  const onReject = useCallback(
    async (task: PendingTask) => {
      const supabase = supabaseRef.current;
      if (!supabase) {
        dismissTask(task.id);
        return;
      }
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("tasks")
        .update({ time_task_status: "rejected", updated_at: now })
        .eq("id", task.id)
        .eq("time_task_status", "pending");

      if (error) {
        toast.error("Could not update task", { description: error.message });
        void loadPending();
        return;
      }
      dismissTask(task.id);
    },
    [dismissTask, loadPending],
  );

  const list = useMemo(() => tasks, [tasks]);
  const gifts = useMemo(() => giftRequests, [giftRequests]);
  const inboxEmpty = !loading && list.length === 0 && gifts.length === 0;

  if (!authHydrated || auth.role !== "parent") return null;

  return (
    <ParentTheme>
      <div className={styles.shell}>
        <header>
          <p className={styles.heroEyebrow}>Review queue</p>
          <h1 className={styles.heroTitle}>Approval inbox</h1>
          <p className={styles.heroSub}>
            Pending chores with photo evidence. Approve to add reward time to your child&apos;s bank, or send back for
            another try. Gift card requests appear here too — enter the code when you approve.
          </p>
        </header>

        {inboxEmpty ? (
          <div className={styles.emptyWrap}>
            <EmptyState
              title="Inbox clear"
              description="No tasks or gift cards are waiting for approval right now."
            />
          </div>
        ) : (
          <ul className={styles.feed} aria-label="Pending approvals">
            <AnimatePresence initial={false}>
              {gifts.map((req) => (
                <motion.li
                  key={`gift-${req.id}`}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                >
                  <article className={styles.card}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTop}>
                        <h2 className={styles.taskTitle}>{req.rewardTitle}</h2>
                        <span className={styles.giftBadge}>Gift card</span>
                      </div>
                      <p className={styles.giftHint}>
                        Enter the code from your retailer or voucher email. Your child will tap to reveal it after you
                        approve.
                      </p>
                      <div className={styles.codeField}>
                        <label className={styles.codeLabel} htmlFor={`gift-code-${req.id}`}>
                          Gift card code
                        </label>
                        <input
                          id={`gift-code-${req.id}`}
                          className={styles.codeInput}
                          type="text"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="Paste code here"
                          value={giftDraftById[req.id] ?? ""}
                          onChange={(e) =>
                            setGiftDraftById((prev) => ({
                              ...prev,
                              [req.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className={styles.actions}>
                        <GTButton
                          type="button"
                          variant="primary"
                          size="lg"
                          fullWidth
                          className={styles.approveButton}
                          onClick={() => void onApproveGift(req)}
                        >
                          Approve &amp; save code
                        </GTButton>
                        <GTButton type="button" variant="danger" size="lg" fullWidth onClick={() => void onRejectGift(req)}>
                          Reject
                        </GTButton>
                      </div>
                    </div>
                  </article>
                </motion.li>
              ))}
              {list.map((task) => (
                <motion.li
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                >
                  <article className={styles.card}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTop}>
                        <h2 className={styles.taskTitle}>{task.title}</h2>
                        <span className={styles.rewardBadge}>+{task.rewardMinutes} mins</span>
                      </div>
                      <EvidencePlaceholder />
                      <div className={styles.actions}>
                        <GTButton
                          type="button"
                          variant="primary"
                          size="lg"
                          fullWidth
                          className={styles.approveButton}
                          onClick={() => void onApprove(task)}
                        >
                          Approve
                        </GTButton>
                        <GTButton
                          type="button"
                          variant="danger"
                          size="lg"
                          fullWidth
                          onClick={() => void onReject(task)}
                        >
                          Reject / needs work
                        </GTButton>
                      </div>
                    </div>
                  </article>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </ParentTheme>
  );
}
