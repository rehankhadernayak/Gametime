"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { GTButton, GTInput, ParentTheme, EmptyState } from "@/components/ui";
import { createSupabaseBrowserAuthedClient, getSupabaseChildTableName } from "@/lib/supabase/client";
import styles from "./inbox.module.css";

type PendingTask = {
  id: string;
  title: string;
  rewardMinutes: number;
  childId: string;
};

type RewardRequestRow = {
  id: string;
  childId: string;
  rewardTitle: string;
  costMinutes: number;
  rewardType: string;
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

function readCostMinutes(row: Record<string, unknown>): number {
  const v = row.cost_minutes;
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
  const [rewardRequests, setRewardRequests] = useState<RewardRequestRow[]>([]);
  const [childNameById, setChildNameById] = useState<Record<string, string>>({});
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [giftCardCodeByRequestId, setGiftCardCodeByRequestId] = useState<Record<string, string>>({});
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
      setRewardRequests([]);
      setChildNameById({});
      setFamilyId(null);
      setChildIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: children, error: childErr } = await supabase
      .from(childTable)
      .select("id, name, family_id")
      .eq("parent_id", parentId);
    if (childErr) {
      toast.error("Could not load inbox", { description: childErr.message });
      setTasks([]);
      setRewardRequests([]);
      setChildNameById({});
      setFamilyId(null);
      setChildIds([]);
      setLoading(false);
      return;
    }

    const names: Record<string, string> = {};
    for (const c of children ?? []) {
      const row = c as { id: unknown; name: unknown };
      names[String(row.id)] = String(row.name ?? "");
    }
    setChildNameById(names);

    const ids = (children ?? []).map((r) => String((r as { id: unknown }).id));
    setChildIds(ids);

    const fidRow = (children ?? []).find((c) => {
      const f = (c as { family_id?: unknown }).family_id;
      return typeof f === "string" && f.trim() !== "";
    }) as { family_id?: string } | undefined;
    const nextFamilyId = fidRow?.family_id?.trim() ?? null;
    setFamilyId(nextFamilyId);

    if (ids.length === 0) {
      setTasks([]);
      setRewardRequests([]);
      setLoading(false);
      return;
    }

    const taskRes = await supabase
      .from("tasks")
      .select("id, title, reward_minutes, child_id")
      .eq("time_task_status", "pending")
      .in("child_id", ids);

    if (taskRes.error) {
      toast.error("Could not load inbox", { description: taskRes.error.message });
      setTasks([]);
      setRewardRequests([]);
      setLoading(false);
      return;
    }

    let rewardRows: Record<string, unknown>[] = [];
    if (nextFamilyId != null) {
      const rewardRes = await supabase
        .from("reward_requests")
        .select("id, child_id, reward_title, cost_minutes, status, reward_type")
        .eq("family_id", nextFamilyId)
        .eq("status", "pending");

      if (rewardRes.error) {
        toast.error("Could not load reward requests", { description: rewardRes.error.message });
        setTasks([]);
        setRewardRequests([]);
        setLoading(false);
        return;
      }
      rewardRows = (rewardRes.data ?? []) as Record<string, unknown>[];
    }

    const taskRows = (taskRes.data ?? []) as Record<string, unknown>[];
    const mappedTasks: PendingTask[] = taskRows.map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      rewardMinutes: readRewardMinutes(r),
      childId: String(r.child_id ?? ""),
    }));
    setTasks(mappedTasks);

    const mappedRewards: RewardRequestRow[] = rewardRows.map((r) => ({
      id: String(r.id),
      childId: String(r.child_id ?? ""),
      rewardTitle: String(r.reward_title ?? ""),
      costMinutes: readCostMinutes(r),
      rewardType: String(r.reward_type ?? "Standard"),
    }));
    setRewardRequests(mappedRewards);
    setLoading(false);
  }, [parentId, childTable]);

  useEffect(() => {
    if (!authHydrated || auth.role !== "parent" || !parentId) return;
    void loadPending();
  }, [authHydrated, auth.role, parentId, loadPending]);

  /** Realtime: tasks + reward_requests for this family refresh the lists. */
  useEffect(() => {
    if (!authHydrated || auth.role !== "parent" || !parentId) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const ids = childIds.filter(Boolean);
    const taskFilter = ids.length > 0 ? `child_id=in.(${ids.join(",")})` : null;
    const rewardFilter =
      familyId != null && familyId.trim() !== "" ? `family_id=eq.${familyId.trim()}` : null;

    if (!taskFilter && !rewardFilter) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let retryTimer: number | null = null;

    const setup = () => {
      if (cancelled) return;
      if (retryTimer != null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      const topicKey = `${[...ids].sort().join(",")}|${familyId ?? ""}`;
      channel = supabase.channel(`parent-inbox:${parentId}:${topicKey}`);
      if (taskFilter) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks", filter: taskFilter },
          () => {
            void loadPending();
          },
        );
      }
      if (rewardFilter) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reward_requests", filter: rewardFilter },
          () => {
            void loadPending();
          },
        );
      }
      channel.subscribe((status) => {
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
  }, [authHydrated, auth.role, parentId, childIds, familyId, loadPending]);

  const dismissTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const restoreTask = useCallback((task: PendingTask) => {
    setTasks((prev) => {
      if (prev.some((t) => t.id === task.id)) return prev;
      return [task, ...prev];
    });
  }, []);

  const dismissReward = useCallback((id: string) => {
    setRewardRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const onApproveReward = useCallback(
    async (req: RewardRequestRow, giftCardCodeField?: string) => {
      const supabase = supabaseRef.current;
      if (!supabase) {
        toast.error("Supabase is not configured.");
        return;
      }

      const isGiftCard = req.rewardType === "Gift Card";
      const pasted = (giftCardCodeField ?? "").trim();
      if (isGiftCard && !pasted) {
        toast.error("Enter the gift card code before approving.");
        return;
      }

      const updatePayload: { status: string; gift_card_code?: string | null } = { status: "approved" };
      if (isGiftCard) {
        updatePayload.gift_card_code = pasted;
      }

      const { data: updated, error } = await supabase
        .from("reward_requests")
        .update(updatePayload)
        .eq("id", req.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (error || !updated) {
        toast.error("Could not approve reward", { description: error?.message ?? "No rows updated." });
        void loadPending();
        return;
      }

      setGiftCardCodeByRequestId((prev) => {
        const next = { ...prev };
        delete next[req.id];
        return next;
      });
      dismissReward(req.id);
      toast.success("Reward request approved.");
    },
    [dismissReward, loadPending],
  );

  const onDenyReward = useCallback(
    async (req: RewardRequestRow) => {
      const supabase = supabaseRef.current;
      if (!supabase) {
        toast.error("Supabase is not configured.");
        return;
      }

      const now = new Date().toISOString();

      const { data: rr, error: fetchErr } = await supabase
        .from("reward_requests")
        .select("id, status, child_id, cost_minutes, reward_type")
        .eq("id", req.id)
        .maybeSingle();

      if (fetchErr || !rr) {
        toast.error("Could not load reward request", { description: fetchErr?.message });
        return;
      }

      const row = rr as Record<string, unknown>;
      if (row.status !== "pending") {
        toast.message("Request is no longer pending.");
        dismissReward(req.id);
        return;
      }

      const childId = String(row.child_id ?? "");
      const cost = readCostMinutes(row);

      const { data: childRow, error: childFetchErr } = await supabase
        .from(childTable)
        .select("time_bank_minutes")
        .eq("id", childId)
        .maybeSingle();

      if (childFetchErr || !childRow) {
        toast.error("Could not read child profile for refund", { description: childFetchErr?.message });
        return;
      }

      const bank = readTimeBankMinutes(childRow as Record<string, unknown>);
      const nextBank = Math.min(100000, bank + cost);

      const { data: credited, error: childUpErr } = await supabase
        .from(childTable)
        .update({ time_bank_minutes: nextBank, updated_at: now })
        .eq("id", childId)
        .eq("time_bank_minutes", bank)
        .select("id")
        .maybeSingle();

      if (childUpErr || !credited) {
        toast.error("Could not refund Time Bank", { description: childUpErr?.message ?? "Balance may have changed." });
        void loadPending();
        return;
      }

      const { data: denied, error: denyErr } = await supabase
        .from("reward_requests")
        .update({ status: "denied" })
        .eq("id", req.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (denyErr || !denied) {
        await supabase
          .from(childTable)
          .update({ time_bank_minutes: bank, updated_at: new Date().toISOString() })
          .eq("id", childId)
          .eq("time_bank_minutes", nextBank);
        toast.error("Could not deny request", { description: denyErr?.message ?? "No rows updated." });
        void loadPending();
        return;
      }

      dismissReward(req.id);
      toast.success("Request denied and minutes refunded.");
    },
    [childTable, dismissReward, loadPending],
  );

  const onApprove = useCallback(
    async (task: PendingTask) => {
      const supabase = supabaseRef.current;
      if (!supabase) {
        toast.error("Supabase is not configured.");
        return;
      }

      dismissTask(task.id);

      const now = new Date().toISOString();

      const { data: taskRow, error: taskFetchErr } = await supabase
        .from("tasks")
        .select("id, child_id, reward_minutes, time_task_status")
        .eq("id", task.id)
        .maybeSingle();

      if (taskFetchErr || !taskRow) {
        restoreTask(task);
        toast.error("Could not load task", { description: taskFetchErr?.message });
        return;
      }

      const tr = taskRow as Record<string, unknown>;
      if (tr.time_task_status !== "pending") {
        toast.message("Task is no longer pending.");
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
        restoreTask(task);
        toast.error("Could not approve task", { description: taskUpErr?.message ?? "No rows updated." });
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
        restoreTask(task);
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
        restoreTask(task);
        toast.error("Could not credit Time Bank", { description: childUpErr.message });
        return;
      }

      toast.success("Time added to child bank!", { duration: 3200 });
    },
    [childTable, dismissTask, restoreTask],
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

  const taskList = useMemo(() => tasks, [tasks]);
  const rewardList = useMemo(() => rewardRequests, [rewardRequests]);
  const inboxEmpty = !loading && taskList.length === 0 && rewardList.length === 0;

  if (!authHydrated || auth.role !== "parent") return null;

  return (
    <ParentTheme>
      <div className={styles.shell}>
        <header>
          <p className={styles.heroEyebrow}>Review queue</p>
          <h1 className={styles.heroTitle}>Approval inbox</h1>
          <p className={styles.heroSub}>
            Pending chores with photo evidence, plus reward-store requests your kids paid for with Time Bank minutes.
            Approve tasks to credit time, or approve rewards when you&apos;re happy to grant the perk.
          </p>
        </header>

        {loading ? <p className={styles.loadingNote}>Loading…</p> : null}

        {!loading && inboxEmpty ? (
          <div className={styles.emptyWrap}>
            <EmptyState
              title="Inbox clear"
              description="No task submissions or reward requests are waiting right now."
            />
          </div>
        ) : null}

        {!loading && !inboxEmpty ? (
          <>
            <section className={styles.sectionBlock} aria-labelledby="inbox-tasks-heading">
              <h2 id="inbox-tasks-heading" className={styles.sectionHeading}>
                Task submissions
              </h2>
              {taskList.length === 0 ? (
                <p className={styles.heroSub}>No pending tasks.</p>
              ) : (
                <ul className={styles.feed} aria-label="Pending tasks">
                  <AnimatePresence initial={false}>
                    {taskList.map((task) => (
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
                              <h3 className={styles.taskTitle}>{task.title}</h3>
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
            </section>

            <section className={styles.sectionBlock} aria-labelledby="inbox-rewards-heading">
              <h2 id="inbox-rewards-heading" className={styles.sectionHeading}>
                Reward requests
              </h2>
              {rewardList.length === 0 ? (
                <p className={styles.heroSub}>No pending reward requests.</p>
              ) : (
                <ul className={styles.feed} aria-label="Reward requests">
                  <AnimatePresence initial={false}>
                    {rewardList.map((rr) => (
                      <motion.li
                        key={rr.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      >
                        <article className={styles.card}>
                          <div className={styles.cardBody}>
                            <div className={styles.cardTop}>
                              <h3 className={styles.taskTitle}>{rr.rewardTitle}</h3>
                              <span className={styles.costBadge}>{rr.costMinutes} min</span>
                            </div>
                            <p className={styles.metaRow}>
                              <span className={styles.metaChild}>{childNameById[rr.childId] ?? "Child"}</span>
                              <span aria-hidden>·</span>
                              <span>
                                Paid {rr.costMinutes} min from Time Bank
                              </span>
                              {rr.rewardType === "Gift Card" ? (
                                <>
                                  <span aria-hidden>·</span>
                                  <span className={styles.typeBadge}>Gift Card</span>
                                </>
                              ) : null}
                            </p>
                            {rr.rewardType === "Gift Card" ? (
                              <GTInput
                                id={`gift-code-${rr.id}`}
                                label="Gift card code"
                                hint="Paste the code your child will redeem — they’ll see it after you approve."
                                autoComplete="off"
                                value={giftCardCodeByRequestId[rr.id] ?? ""}
                                onChange={(e) =>
                                  setGiftCardCodeByRequestId((prev) => ({
                                    ...prev,
                                    [rr.id]: e.target.value,
                                  }))
                                }
                                placeholder="XXXX-XXXX-XXXX"
                              />
                            ) : null}
                            <div className={styles.actions}>
                              <GTButton
                                type="button"
                                variant="primary"
                                size="lg"
                                fullWidth
                                className={styles.approveButton}
                                onClick={() =>
                                  void onApproveReward(rr, giftCardCodeByRequestId[rr.id])
                                }
                              >
                                Approve
                              </GTButton>
                              <GTButton
                                type="button"
                                variant="danger"
                                size="lg"
                                fullWidth
                                onClick={() => void onDenyReward(rr)}
                              >
                                Deny
                              </GTButton>
                            </div>
                          </div>
                        </article>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </ParentTheme>
  );
}
