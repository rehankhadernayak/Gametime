"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { trackEvent } from "@/lib/analytics";
import { GTCard } from "@/components/child-gamer-hub/GTCard";
import { GTBadge } from "@/components/child-gamer-hub/GTBadge";
import * as theme from "@/theme/childTheme";
import styles from "@/components/child-gamer-hub/ChildGamerHub.module.css";

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

function ScanEvidenceIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 7h4l2-2h4l2 2h4v12H4V7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
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
    e.target.value = "";
  }

  if (auth.role !== "child" || !auth.token) return null;

  const rp = me?.pointsBalance ?? 0;
  const gp = me?.giftcardPointsBalance ?? 0;

  return (
    <div className={theme.childTheme}>
      <div className={styles.shell}>
        <header>
          <h1 className={styles.pageTitle}>Gamer Hub</h1>
          <p className={styles.welcome}>
            Welcome back{me?.name ? `, ${me.name}` : ""}. Your quests and loot are synced.
          </p>
        </header>

        <GTCard glass className={styles.heroCard}>
          <p className={styles.heroLabel}>Balance</p>
          <div className={styles.balanceRow}>
            <div className={styles.balanceBlock}>
              <span className={styles.balanceValue}>{rp.toLocaleString()}</span>
              <span className={styles.balanceUnit}>Reward pts</span>
            </div>
            <div className={styles.balanceBlock}>
              <span className={`${styles.balanceValue} ${styles.balanceValueGp}`}>
                {gp.toLocaleString()}
              </span>
              <span className={`${styles.balanceUnit} ${styles.balanceUnitGp}`}>Giftcard pts</span>
            </div>
          </div>
        </GTCard>

        {loading ? (
          <p className={styles.loadingRow} aria-busy="true">
            Syncing hub…
          </p>
        ) : null}
        {error ? (
          <p className={styles.statusErr} role="alert">
            {error}{" "}
            <button type="button" className={styles.retryBtn} onClick={() => void loadDashboard()}>
              Retry
            </button>
          </p>
        ) : null}

        {!loading && !error ? (
          <>
            <section aria-labelledby="quests-heading">
              <h2 id="quests-heading" className={styles.sectionTitle}>
                Active quests
              </h2>
              {tasks.length === 0 ? (
                <p className={styles.emptyQuests}>No missions assigned yet. Check back soon.</p>
              ) : (
                <div className={styles.questGrid}>
                  {tasks.map((t) => {
                    const bits: string[] = [];
                    if (t.points != null) bits.push(`${t.points} RP`);
                    bits.push(`${t.gpPoints ?? 0} GP`);
                    const pts = bits.join(" · ");
                    const due = t.dueDate
                      ? `Due ${new Date(t.dueDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                      : null;
                    const isActive = t.state === "Active";
                    return (
                      <GTCard key={t.id} glass interactive>
                        <div className={styles.questHeader}>
                          <span className={styles.questTitle}>{t.title}</span>
                          {isActive ? <GTBadge tone="accent">Available</GTBadge> : null}
                        </div>
                        <div className={styles.questMeta}>
                          <span>{t.state}</span>
                          <span>{pts}</span>
                          {due ? <span>{due}</span> : null}
                        </div>
                      </GTCard>
                    );
                  })}
                </div>
              )}
            </section>

            <section aria-labelledby="submit-heading">
              <h2 id="submit-heading" className={styles.sectionTitle}>
                Turn in quest
              </h2>
              {submitMessage ? (
                <p className={styles.statusOk} role="status">
                  {submitMessage}
                </p>
              ) : null}
              {submitError ? (
                <p className={styles.statusErr} role="alert">
                  {submitError}
                </p>
              ) : null}
              <form className={styles.formBlock} onSubmit={(e) => void handleSubmitChore(e)}>
                <div>
                  <span className={styles.fieldLabel}>Quest</span>
                  <select
                    className={styles.select}
                    value={taskId}
                    onChange={(e) => {
                      setTaskId(e.target.value);
                      setSubmitError(null);
                    }}
                    required
                  >
                    <option value="">Select active quest</option>
                    {activeTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <GTCard glass>
                  <div className={styles.scanCardInner}>
                    <div className={styles.scanIcon} aria-hidden="true">
                      <ScanEvidenceIcon />
                    </div>
                    <div className={styles.scanTitle}>Scan evidence</div>
                    <p className={styles.scanHint}>
                      Use your camera to capture photo proof (max 10MB). Video proof can be added from
                      your gallery below.
                    </p>
                    <input
                      id="child-evidence-camera"
                      className={styles.visuallyHiddenInput}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={onEvidenceFromCamera}
                    />
                    <label htmlFor="child-evidence-camera" className={styles.scanTrigger}>
                      Open camera
                    </label>
                    <input
                      id="child-evidence-gallery"
                      className={styles.visuallyHiddenInput}
                      type="file"
                      accept="image/*,video/*"
                      onChange={onEvidenceFromFiles}
                    />
                    <label htmlFor="child-evidence-gallery" className={styles.galleryLink}>
                      Pick from gallery instead
                    </label>
                    {evidenceFile ? (
                      <p className={styles.fileName}>
                        Selected: {evidenceFile.name} ({Math.round(evidenceFile.size / 1024)} KB)
                      </p>
                    ) : null}
                  </div>
                </GTCard>

                <div>
                  <span className={styles.fieldLabel}>Note for parent (optional)</span>
                  <input
                    className={styles.textInput}
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    maxLength={500}
                    placeholder="Add context for your proof…"
                  />
                </div>

                <button className={styles.submitBtn} type="submit" disabled={submitBusy}>
                  {submitBusy ? "Transmitting…" : "Submit for review"}
                </button>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
