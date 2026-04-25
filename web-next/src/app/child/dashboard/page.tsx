"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { trackEvent } from "@/lib/analytics";

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const POLL_MS = 30_000;

type MeUser = {
  id: string;
  name?: string;
  pointsBalance?: number;
  giftcardPointsBalance?: number;
};

type TaskRow = {
  id: string;
  title: string;
  state: string;
  points?: number;
  gpPoints?: number;
  dueDate?: string | null;
};

type CompleteResponse = { message?: string };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read evidence file"));
    reader.readAsDataURL(file);
  });
}

export default function ChildDashboardPage() {
  const { replace } = useAppRouter();
  const { auth } = useGametimeAuth();
  const token = auth.token;

  const [me, setMe] = useState<MeUser | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [taskId, setTaskId] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const loadDashboard = useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      const showSpinner = opts?.showSpinner !== false;
      if (!token) return;
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const [meRes, taskRes] = await Promise.all([
          apiRequest<{ user: MeUser }>("/auth/me", { token }),
          apiRequest<TaskRow[]>("/tasks/list", { token }),
        ]);
        setMe(meRes.user ?? null);
        setTasks(Array.isArray(taskRes) ? taskRes : []);
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
    if (!auth.token || auth.role !== "child") {
      replace("/login");
    }
  }, [auth.role, auth.token, replace]);

  useEffect(() => {
    if (auth.role !== "child" || !token) return;
    void loadDashboard({ showSpinner: true });
  }, [auth.role, token, loadDashboard]);

  useEffect(() => {
    if (auth.role !== "child" || !token) return;
    const id = window.setInterval(() => {
      void loadDashboard({ showSpinner: false });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [auth.role, token, loadDashboard]);

  const activeTasks = useMemo(() => tasks.filter((t) => t.state === "Active"), [tasks]);

  async function handleSubmitChore(e: React.FormEvent) {
    e.preventDefault();
    setSubmitMessage(null);
    setSubmitError(null);
    if (!taskId) {
      setSubmitError("Select a task first.");
      return;
    }
    if (!evidenceFile) {
      setSubmitError("Evidence file is required.");
      return;
    }
    const isAllowed =
      evidenceFile.type.startsWith("image/") || evidenceFile.type.startsWith("video/");
    if (!isAllowed) {
      setSubmitError("Only image or video evidence is allowed.");
      return;
    }
    if (evidenceFile.size > MAX_EVIDENCE_BYTES) {
      setSubmitError("Evidence must be 10MB or less.");
      return;
    }

    setSubmitBusy(true);
    try {
      const evidenceData = await fileToDataUrl(evidenceFile);
      const evidenceMime = evidenceFile.type || null;
      const evidenceType = evidenceMime?.startsWith("video/") ? "Video" : "Photo";

      const result = await apiRequest<CompleteResponse>("/tasks/complete", {
        method: "POST",
        token,
        body: {
          taskId,
          evidenceData,
          evidenceMime,
          evidenceType,
          evidenceNote: evidenceNote.trim() || null,
        },
      });
      trackEvent("task_complete_submitted", { taskId });
      setSubmitMessage(result.message ?? "Submitted for parent review.");
      setTaskId("");
      setEvidenceFile(null);
      setEvidenceNote("");
      await loadDashboard({ showSpinner: false });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit task completion.");
    } finally {
      setSubmitBusy(false);
    }
  }

  function onEvidenceFromCamera(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setEvidenceFile(file);
    setSubmitError(null);
    e.target.value = "";
  }

  function onEvidenceFromFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setEvidenceFile(file);
    setSubmitError(null);
  }

  if (auth.role !== "child" || !auth.token) return null;

  const rp = me?.pointsBalance ?? 0;

  return (
    <main style={{ padding: "1rem", maxWidth: 720 }}>
      <h1>Child dashboard</h1>
      <p>
        Welcome{me?.name ? `, ${me.name}` : ""}.
      </p>
      <h2>Reward points (RP)</h2>
      <p>
        <strong>{rp}</strong> RP
      </p>

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
            <h2>Your chores</h2>
            {tasks.length === 0 ? (
              <p>No tasks assigned.</p>
            ) : (
              <ul>
                {tasks.map((t) => {
                  const bits: string[] = [];
                  if (t.points != null) bits.push(`${t.points} RP`);
                  bits.push(`${t.gpPoints ?? 0} GP`);
                  const pts = bits.length ? ` (${bits.join(", ")})` : "";
                  const due = t.dueDate ? ` — due ${new Date(t.dueDate).toLocaleString()}` : "";
                  return (
                    <li key={t.id}>
                      <strong>{t.title}</strong> — {t.state}
                      {pts}
                      {due}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2>Submit chore for review</h2>
            <p>Upload photo or video evidence (max 10MB).</p>
            {submitMessage ? <p role="status">{submitMessage}</p> : null}
            {submitError ? <p role="alert">{submitError}</p> : null}
            <form onSubmit={(e) => void handleSubmitChore(e)}>
              <div>
                <label>
                  Task{" "}
                  <select
                    value={taskId}
                    onChange={(e) => {
                      setTaskId(e.target.value);
                      setSubmitError(null);
                    }}
                    required
                  >
                    <option value="">Select active task</option>
                    {activeTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <label>
                  Evidence (gallery / files){" "}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={onEvidenceFromFiles}
                  />
                </label>
              </div>
              <div>
                <label>
                  Take photo{" "}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onEvidenceFromCamera}
                  />
                </label>
              </div>
              {evidenceFile ? (
                <p>
                  Selected: {evidenceFile.name} ({Math.round(evidenceFile.size / 1024)} KB)
                </p>
              ) : null}
              <div>
                <label>
                  Note for parent (optional){" "}
                  <input
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    maxLength={500}
                  />
                </label>
              </div>
              <button type="submit" disabled={submitBusy}>
                {submitBusy ? "Submitting…" : "Submit for review"}
              </button>
            </form>
          </section>
        </>
      ) : null}
    </main>
  );
}
