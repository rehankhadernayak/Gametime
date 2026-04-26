"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api/client";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { trackEvent } from "@/lib/analytics";
import {
  theme,
  ParentTheme,
  GTCard,
  GTBadge,
  GTButton,
  GTInput,
  GTSelect,
} from "@/components/ui";
import styles from "./dashboard.module.css";

const SETTINGS_KEY = "gametime_parent_settings";
const POLL_MS = 30_000;

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const itemSlide = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 28 },
  },
};

type ChildRow = {
  id: string;
  name: string;
  pointsBalance?: number;
  giftcardPointsBalance?: number;
};

type TaskRow = {
  id: string;
  title: string;
  state: string;
  childId?: string;
  childName?: string;
};

type RewardRow = {
  id: string;
  title: string;
  pointsCost: number;
  pointsType?: string;
  active?: boolean;
  quantityLimit?: number | null;
};

function sanitizeText(value: unknown, max = 1000): string {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

function taskStatusBadge(state: string): { label: string; tone: "warning" | "neutral" | "success" | "info" } {
  if (state === "PendingApproval") return { label: "Needs review", tone: "warning" };
  if (state === "Approved") return { label: "Approved", tone: "success" };
  if (state === "Active") return { label: "Active", tone: "info" };
  return { label: state.replace(/([A-Z])/g, " $1").trim() || "Unknown", tone: "neutral" };
}

function ParentDashboardInner() {
  const { replace, push } = useAppRouter();
  const searchParams = useSearchParams();
  const { auth, authHydrated, switchToChild } = useGametimeAuth();

  const [children, setChildren] = useState<ChildRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [settings, setSettings] = useState({
    requireApprovalNotes: false,
  });
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [pointsForm, setPointsForm] = useState({
    childId: "",
    points: "10",
    note: "Manual adjustment",
  });
  const token = auth.token;

  const loadDashboard = useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      const showSpinner = opts?.showSpinner !== false;
      if (!token) return;
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const [childList, taskList, rewardList] = await Promise.all([
          apiRequest<ChildRow[]>("/children/list", { token }),
          apiRequest<TaskRow[]>("/tasks/list", { token }),
          apiRequest<RewardRow[]>("/rewards/list", { token }),
        ]);
        setChildren(Array.isArray(childList) ? childList : []);
        setTasks(Array.isArray(taskList) ? taskList : []);
        setRewards(Array.isArray(rewardList) ? rewardList : []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load dashboard.";
        setError(msg);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!authHydrated) return;
    if (!auth.token || auth.role !== "parent") {
      replace("/login");
    }
  }, [auth.role, auth.token, authHydrated, replace]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { requireApprovalNotes?: boolean };
        if (parsed && typeof parsed === "object") {
          setSettings((prev) => ({
            ...prev,
            requireApprovalNotes: Boolean(parsed.requireApprovalNotes),
          }));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    if (auth.role !== "parent" || !token) return;
    void loadDashboard({ showSpinner: true });
  }, [auth.role, token, loadDashboard]);

  useEffect(() => {
    if (auth.role !== "parent" || !token) return;
    const id = window.setInterval(() => {
      void loadDashboard({ showSpinner: false });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [auth.role, token, loadDashboard]);

  useEffect(() => {
    const topup = searchParams.get("topup");
    if (topup === "success") {
      replace("/parent/dashboard");
      toast.success("Payment successful", {
        description: "Your GP wallet has been topped up.",
      });
    } else if (topup === "cancelled") {
      replace("/parent/dashboard");
      toast.error("Payment cancelled", { description: "No charge was made." });
    }
  }, [searchParams, replace]);

  const pendingByChild = useMemo(() => {
    const pending = tasks.filter((t) => t.state === "PendingApproval");
    const groups: Record<string, TaskRow[]> = {};
    for (const task of pending) {
      const name = task.childName || "Unknown";
      if (!groups[name]) groups[name] = [];
      groups[name].push(task);
    }
    return groups;
  }, [tasks]);

  const activeRewards = useMemo(() => rewards.filter((r) => r.active !== false), [rewards]);

  const activeQuests = useMemo(
    () => tasks.filter((t) => t.state === "Active" || t.state === "PendingApproval"),
    [tasks],
  );

  const totalRpIssued = useMemo(
    () => children.reduce((sum, c) => sum + (c.pointsBalance ?? 0), 0),
    [children],
  );

  const pendingApprovalCount = useMemo(
    () => tasks.filter((t) => t.state === "PendingApproval").length,
    [tasks],
  );

  const activeChoresCount = useMemo(() => tasks.filter((t) => t.state === "Active").length, [tasks]);

  const choreCompletionSummary = useMemo(() => {
    const byState: Record<string, number> = {};
    for (const t of tasks) {
      byState[t.state] = (byState[t.state] ?? 0) + 1;
    }
    return byState;
  }, [tasks]);

  async function handleApproveChore(task: TaskRow) {
    const note = sanitizeText(decisionNotes[task.id] || "", 200);
    if (settings.requireApprovalNotes && !note) {
      toast.error("Approval notes are required by settings.");
      return;
    }
    setActionBusy(true);
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, state: "Approved" } : item)));
    try {
      await apiRequest("/tasks/approve", {
        method: "POST",
        token,
        body: { taskId: task.id, note: note || null },
      });
      toast.success("Task approved", { description: task.title });
      trackEvent("task_decision", { decision: "approve", taskId: task.id, childId: task.childId });
      await loadDashboard({ showSpinner: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed.";
      toast.error(msg);
      trackEvent("task_decision_failed", { decision: "approve", taskId: task.id, error: msg });
      await loadDashboard({ showSpinner: false });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRejectChore(task: TaskRow) {
    const note = sanitizeText(decisionNotes[task.id] || "", 200);
    if (settings.requireApprovalNotes && !note) {
      toast.error("Notes are required by settings before rejecting.");
      return;
    }
    setActionBusy(true);
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, state: "Active" } : item)));
    try {
      await apiRequest("/tasks/reject", {
        method: "POST",
        token,
        body: { taskId: task.id, note: note || null },
      });
      toast.success("Task returned for retry", { description: task.title });
      trackEvent("task_decision", { decision: "reject", taskId: task.id, childId: task.childId });
      await loadDashboard({ showSpinner: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reject failed.";
      toast.error(msg);
      trackEvent("task_decision_failed", { decision: "reject", taskId: task.id, error: msg });
      await loadDashboard({ showSpinner: false });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAddPoints(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      childId: pointsForm.childId,
      points: Number.parseInt(pointsForm.points, 10),
      note: sanitizeText(pointsForm.note),
    };
    if (!payload.childId) {
      toast.error("Select a child for points adjustment.");
      return;
    }
    if (
      !Number.isInteger(payload.points) ||
      payload.points < -1000 ||
      payload.points > 1000 ||
      payload.points === 0
    ) {
      toast.error("Points must be an integer between -1000 and 1000 (excluding 0).");
      return;
    }
    if (!payload.note) {
      toast.error("A reason is required for points adjustment.");
      return;
    }
    setActionBusy(true);
    try {
      await apiRequest("/points/adjust", { method: "POST", token, body: payload });
      toast.success("Points updated", {
        description: `${payload.points > 0 ? "+" : ""}${payload.points} RP`,
      });
      trackEvent("points_adjusted", { ...payload });
      await loadDashboard({ showSpinner: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Points adjustment failed.";
      toast.error(msg);
      trackEvent("points_adjust_failed", { childId: payload.childId, error: msg });
    } finally {
      setActionBusy(false);
    }
  }

  if (auth.role !== "parent" || !auth.token) return null;

  return (
    <ParentTheme>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.heroEyebrow}>Mission control</p>
          <h1 className={styles.heroTitle}>Parent dashboard</h1>
          <p className={styles.heroSub}>
            Hello, {auth.user?.name ?? "parent"}. Review submissions, scan family status, and act in one place.
          </p>
        </header>

        <div className={styles.settingsBar}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={settings.requireApprovalNotes}
              onChange={(e) =>
                setSettings((s) => ({ ...s, requireApprovalNotes: e.target.checked }))
              }
            />
            <span>Require approval notes before approving or rejecting a chore</span>
          </label>
        </div>

        {loading ? (
          <div className={styles.loadingRow} aria-busy="true">
            <span className={styles.spinner} aria-hidden />
            <span>Syncing mission data…</span>
          </div>
        ) : null}

        {error ? (
          <div className={styles.errorBox} role="alert">
            {error}{" "}
            <GTButton variant="secondary" size="sm" type="button" onClick={() => void loadDashboard()}>
              Retry
            </GTButton>
          </div>
        ) : null}

        {!loading && !error ? (
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div className={styles.statsRow} variants={itemSlide}>
              <GTCard padding="sm" className={styles.statCard} title="Total RP issued">
                <p className={styles.statValue}>{totalRpIssued.toLocaleString()}</p>
                <p className={styles.statHint}>Combined RP balances on children&apos;s accounts.</p>
              </GTCard>
              <GTCard padding="sm" className={styles.statCard} title="Pending approvals">
                <p className={styles.statValue}>{pendingApprovalCount}</p>
                <p className={styles.statHint}>Submissions waiting for your decision.</p>
              </GTCard>
              <GTCard padding="sm" className={styles.statCard} title="Active chores">
                <p className={styles.statValue}>{activeChoresCount}</p>
                <p className={styles.statHint}>Quests in progress right now.</p>
              </GTCard>
            </motion.div>

            <motion.div className={styles.mainRow} variants={itemSlide}>
              <div className={styles.mainFeed}>
                <div className={styles.feedStack}>
                  <GTCard
                    title="Pending approvals"
                    description="Chores waiting for your decision. Approve to award points, or reject to send back for retry."
                  >
                    {Object.keys(pendingByChild).length === 0 ? (
                      <p className={styles.emptyHint}>No tasks waiting for approval. You are all caught up.</p>
                    ) : (
                      <div className={styles.stack}>
                        {Object.entries(pendingByChild).map(([childName, childTasks]) => (
                          <div key={childName}>
                            <p className={styles.groupLabel}>{childName}</p>
                            <div className={styles.stack}>
                              {childTasks.map((task) => {
                                const badge = taskStatusBadge(task.state);
                                return (
                                  <GTCard
                                    key={task.id}
                                    title={task.title}
                                    titleLevel="h3"
                                    headerExtra={<GTBadge tone={badge.tone}>{badge.label}</GTBadge>}
                                  >
                                    <GTInput
                                      id={`note-${task.id}`}
                                      label="Approval note (optional)"
                                      maxLength={200}
                                      value={decisionNotes[task.id] ?? ""}
                                      onChange={(e) =>
                                        setDecisionNotes((prev) => ({
                                          ...prev,
                                          [task.id]: e.target.value,
                                        }))
                                      }
                                    />
                                    <div className={styles.rowActions}>
                                      <GTButton
                                        variant="primary"
                                        disabled={actionBusy}
                                        onClick={() => void handleApproveChore(task)}
                                      >
                                        Approve
                                      </GTButton>
                                      <GTButton
                                        variant="danger"
                                        disabled={actionBusy}
                                        onClick={() => void handleRejectChore(task)}
                                      >
                                        Reject
                                      </GTButton>
                                    </div>
                                  </GTCard>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GTCard>

                  <GTCard
                    title="Active quests"
                    description="In-flight and awaiting-review chores across the household."
                  >
                    {activeQuests.length === 0 ? (
                      <p className={styles.emptyHint}>No active or pending-review quests.</p>
                    ) : (
                      <div>
                        {activeQuests.map((task) => {
                          const badge = taskStatusBadge(task.state);
                          return (
                            <div key={task.id} className={styles.questRow}>
                              <div>
                                <p className={styles.questTitle}>{task.title}</p>
                                <p className={styles.questMeta}>{task.childName ?? "Unknown"}</p>
                              </div>
                              <GTBadge tone={badge.tone}>{badge.label}</GTBadge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </GTCard>
                </div>
              </div>

              <aside className={styles.sideRail}>
                <div className={styles.sideStack}>
                  <GTCard title="Family roster" description="Children and balances at a glance.">
                    {children.length === 0 ? (
                      <p className={styles.emptyHint}>No children yet. Add profiles in settings.</p>
                    ) : (
                      <div>
                        {children.map((c) => (
                          <div key={c.id} className={styles.childRow}>
                            <span className={styles.childName}>{c.name}</span>
                            <span className={styles.balances}>
                              RP {c.pointsBalance ?? 0} · GP {c.giftcardPointsBalance ?? 0}
                            </span>
                            <GTButton
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => void switchToChild(c.id)}
                            >
                              Child view
                            </GTButton>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.summaryBlock}>
                      <p className={styles.subsectionLabel}>Chore completion (states)</p>
                      <ul className={styles.mutedList}>
                        {Object.entries(choreCompletionSummary).map(([state, count]) => (
                          <li key={state}>
                            {state}: {count}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className={styles.rewardsBlock}>
                      <p className={styles.subsectionLabel}>Active rewards</p>
                      {activeRewards.length === 0 ? (
                        <p className={styles.emptyHint}>No active rewards.</p>
                      ) : (
                        <ul className={styles.mutedList}>
                          {activeRewards.map((r) => (
                            <li key={r.id}>
                              {r.title} — {r.pointsCost} {r.pointsType ?? "RP"}
                              {r.quantityLimit != null ? ` (limit ${r.quantityLimit})` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </GTCard>

                  <GTCard title="Quick actions" description="Assign quests and open settings without leaving the console.">
                    <div className={styles.rowActions}>
                      <GTButton variant="primary" type="button" onClick={() => push("/parent/tasks")}>
                        Assign new quest
                      </GTButton>
                      <GTButton variant="secondary" type="button" onClick={() => push("/parent/settings?tab=children")}>
                        Manage children
                      </GTButton>
                    </div>
                  </GTCard>

                  <GTCard title="Add points (RP)" description="Manual balance adjustment with an audit trail.">
                    <form onSubmit={(e) => void handleAddPoints(e)} className={styles.stack}>
                      <GTSelect
                        id="points-child"
                        label="Child"
                        value={pointsForm.childId}
                        onChange={(e) => setPointsForm((p) => ({ ...p, childId: e.target.value }))}
                        required
                      >
                        <option value="">Select child</option>
                        {children.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </GTSelect>
                      <GTInput
                        id="points-rp"
                        label="RP amount"
                        type="number"
                        min={-1000}
                        max={1000}
                        value={pointsForm.points}
                        onChange={(e) => setPointsForm((p) => ({ ...p, points: e.target.value }))}
                      />
                      <GTInput
                        id="points-reason"
                        label="Reason"
                        value={pointsForm.note}
                        onChange={(e) => setPointsForm((p) => ({ ...p, note: e.target.value }))}
                      />
                      <GTButton type="submit" variant="primary" disabled={actionBusy}>
                        Add / adjust points
                      </GTButton>
                    </form>
                  </GTCard>
                </div>
              </aside>
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </ParentTheme>
  );
}

export default function ParentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className={theme.parentTheme}>
          <div className={styles.shell}>
            <div className={styles.loadingRow} aria-busy="true">
              <span className={styles.spinner} aria-hidden />
              <span>Loading…</span>
            </div>
          </div>
        </div>
      }
    >
      <ParentDashboardInner />
    </Suspense>
  );
}
