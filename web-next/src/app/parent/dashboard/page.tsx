"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { trackEvent } from "@/lib/analytics";

const SETTINGS_KEY = "gametime_parent_settings";
const POLL_MS = 30_000;

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

function ParentDashboardInner() {
  const { replace, push } = useAppRouter();
  const searchParams = useSearchParams();
  const { auth, switchToChild } = useGametimeAuth();

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
  const [banner, setBanner] = useState<{ text: string; kind: "success" | "error" } | null>(null);

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
    if (!auth.token || auth.role !== "parent") {
      replace("/login");
    }
  }, [auth.role, auth.token, replace]);

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
      setBanner({ text: "Payment successful! Your GP wallet has been topped up.", kind: "success" });
    } else if (topup === "cancelled") {
      replace("/parent/dashboard");
      setBanner({ text: "Payment cancelled — no charge was made.", kind: "error" });
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

  const activeRewards = useMemo(
    () => rewards.filter((r) => r.active !== false),
    [rewards],
  );

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
      setBanner({ text: "Approval notes are required by settings.", kind: "error" });
      return;
    }
    setActionBusy(true);
    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, state: "Approved", parentNote: note || undefined } : item,
      ),
    );
    try {
      await apiRequest("/tasks/approve", {
        method: "POST",
        token,
        body: { taskId: task.id, note: note || null },
      });
      setBanner({ text: `Task approved: ${task.title}`, kind: "success" });
      trackEvent("task_decision", { decision: "approve", taskId: task.id, childId: task.childId });
      await loadDashboard({ showSpinner: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed.";
      setBanner({ text: msg, kind: "error" });
      trackEvent("task_decision_failed", { decision: "approve", taskId: task.id, error: msg });
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
      setBanner({ text: "Select a child for points adjustment.", kind: "error" });
      return;
    }
    if (
      !Number.isInteger(payload.points) ||
      payload.points < -1000 ||
      payload.points > 1000 ||
      payload.points === 0
    ) {
      setBanner({
        text: "Points must be an integer between -1000 and 1000 (excluding 0).",
        kind: "error",
      });
      return;
    }
    if (!payload.note) {
      setBanner({ text: "A reason is required for points adjustment.", kind: "error" });
      return;
    }
    setActionBusy(true);
    try {
      await apiRequest("/points/adjust", { method: "POST", token, body: payload });
      setBanner({
        text: `Points updated: ${payload.points > 0 ? "+" : ""}${payload.points}`,
        kind: "success",
      });
      trackEvent("points_adjusted", { ...payload });
      await loadDashboard({ showSpinner: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Points adjustment failed.";
      setBanner({ text: msg, kind: "error" });
      trackEvent("points_adjust_failed", { childId: payload.childId, error: msg });
    } finally {
      setActionBusy(false);
    }
  }

  if (auth.role !== "parent" || !auth.token) return null;

  return (
    <main style={{ padding: "1rem", maxWidth: 960 }}>
      <h1>Parent dashboard</h1>
      <p>Hello, {auth.user?.name ?? "parent"}.</p>

      <label>
        <input
          type="checkbox"
          checked={settings.requireApprovalNotes}
          onChange={(e) =>
            setSettings((s) => ({ ...s, requireApprovalNotes: e.target.checked }))
          }
        />{" "}
        Require approval notes before approving a chore
      </label>

      {banner ? (
        <p role={banner.kind === "error" ? "alert" : "status"}>{banner.text}</p>
      ) : null}

      {loading ? <p aria-busy="true">Loading…</p> : null}
      {error ? (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => void loadDashboard()}>
            Retry
          </button>
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          <section>
            <h2>Children</h2>
            {children.length === 0 ? (
              <p>No children yet.</p>
            ) : (
              <ul>
                {children.map((c) => (
                  <li key={c.id}>
                    <strong>{c.name}</strong> — RP {c.pointsBalance ?? 0}, GP{" "}
                    {c.giftcardPointsBalance ?? 0}{" "}
                    <button type="button" onClick={() => void switchToChild(c.id)}>
                      Open child view
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => push("/parent/settings?tab=children")}>
              Manage children in settings
            </button>
          </section>

          <section>
            <h2>Chore completion (task states)</h2>
            <ul>
              {Object.entries(choreCompletionSummary).map(([state, count]) => (
                <li key={state}>
                  {state}: {count}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Active rewards</h2>
            {activeRewards.length === 0 ? (
              <p>No active rewards.</p>
            ) : (
              <ul>
                {activeRewards.map((r) => (
                  <li key={r.id}>
                    {r.title} — {r.pointsCost} {r.pointsType ?? "RP"}
                    {r.quantityLimit != null ? ` (limit ${r.quantityLimit})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2>Pending chore approvals</h2>
            {Object.keys(pendingByChild).length === 0 ? (
              <p>No tasks waiting for approval.</p>
            ) : (
              Object.entries(pendingByChild).map(([childName, childTasks]) => (
                <article key={childName}>
                  <h3>{childName}</h3>
                  <ul>
                    {childTasks.map((task) => (
                      <li key={task.id}>
                        <strong>{task.title}</strong> ({task.state})
                        <div>
                          <label>
                            Approval note{" "}
                            <input
                              maxLength={200}
                              value={decisionNotes[task.id] ?? ""}
                              onChange={(e) =>
                                setDecisionNotes((prev) => ({ ...prev, [task.id]: e.target.value }))
                              }
                            />
                          </label>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => void handleApproveChore(task)}
                          >
                            Approve chore
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))
            )}
          </section>

          <section>
            <h2>Add points (RP)</h2>
            <form onSubmit={(e) => void handleAddPoints(e)}>
              <div>
                <label>
                  Child{" "}
                  <select
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
                  </select>
                </label>
              </div>
              <div>
                <label>
                  RP{" "}
                  <input
                    type="number"
                    min={-1000}
                    max={1000}
                    value={pointsForm.points}
                    onChange={(e) => setPointsForm((p) => ({ ...p, points: e.target.value }))}
                  />
                </label>
              </div>
              <div>
                <label>
                  Reason{" "}
                  <input
                    value={pointsForm.note}
                    onChange={(e) => setPointsForm((p) => ({ ...p, note: e.target.value }))}
                  />
                </label>
              </div>
              <button type="submit" disabled={actionBusy}>
                Add / adjust points
              </button>
            </form>
          </section>
        </>
      ) : null}
    </main>
  );
}

export default function ParentDashboardPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "1rem" }}>
          <p aria-busy="true">Loading…</p>
        </main>
      }
    >
      <ParentDashboardInner />
    </Suspense>
  );
}
