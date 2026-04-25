"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api/client";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { trackEvent } from "@/lib/analytics";
import { GTCard } from "@/components/ui/GTCard";
import { GTBadge } from "@/components/ui/GTBadge";
import { GTButton } from "@/components/ui/GTButton";
import { GTInput } from "@/components/ui/GTInput";
import hubStyles from "@/components/child-gamer-hub/ChildGamerHub.module.css";
import themeModule from "@/styles/theme.module.css";
import styles from "./child-dashboard.module.css";

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

function questBadgeLabel(state: string): string {
  switch (state) {
    case "Active":
      return "Active";
    case "PendingApproval":
      return "Pending review";
    case "Approved":
      return "Completed";
    case "Rejected":
      return "Try again";
    case "Expired":
      return "Expired";
    default:
      return state;
  }
}

export default function ChildDashboardPage() {
  const { replace } = useAppRouter();
  const { auth } = useGametimeAuth();
  const token = auth.token;

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      setSubmitError("Select a quest first.");
      return;
    }
    if (!evidenceFile) {
      setSubmitError("Scan or upload evidence to continue.");
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

  function selectQuest(t: TaskRow) {
    if (t.state !== "Active") return;
    setTaskId(t.id);
    setSubmitError(null);
  }

  function onQuestKeyDown(e: React.KeyboardEvent, t: TaskRow) {
    if (t.state !== "Active") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectQuest(t);
    }
  }

  if (auth.role !== "child" || !auth.token) return null;

  const rp = me?.pointsBalance ?? 0;
  const gp = me?.giftcardPointsBalance ?? 0;

  const dsScope = `${themeModule.childTheme} ${styles.dsTokenScope}`;

  return (
    <div className={hubStyles.childTheme}>
      <div className={`${hubStyles.shell} ${dsScope}`}>
        <main className={styles.page}>
          <header>
            <h1 className={hubStyles.pageTitle}>Gamer Hub</h1>
            <p className={hubStyles.welcome}>
              Welcome back{me?.name ? <span className={styles.welcomeName}>, {me.name}</span> : null}. Your quests and
              loot are synced.
            </p>
          </header>

          <header className={styles.hero} aria-labelledby="rp-hero-label">
            <div className={styles.heroInner}>
              <p id="rp-hero-label" className={styles.heroLabel}>
                Balances
              </p>
              <div className={styles.heroBalances}>
                <div className={styles.heroBalanceCol}>
                  <p className={styles.heroValue} aria-live="polite">
                    {loading ? "…" : rp.toLocaleString()}
                  </p>
                  <span className={styles.heroUnit}>RP</span>
                </div>
                <div className={`${styles.heroBalanceCol} ${styles.heroBalanceColGp}`}>
                  <p className={`${styles.heroValue} ${styles.heroValueGp}`} aria-live="polite">
                    {loading ? "…" : gp.toLocaleString()}
                  </p>
                  <span className={`${styles.heroUnit} ${styles.heroUnitGp}`}>GP</span>
                </div>
              </div>
            </div>
          </header>

          {loading ? (
            <p className={styles.loadingRow} aria-busy="true">
              <span>Syncing your hub…</span>
            </p>
          ) : null}

          {error ? (
            <p className={styles.statusErr} role="alert">
              {error}{" "}
              <button type="button" className={styles.retryButton} onClick={() => void loadDashboard()}>
                Retry
              </button>
            </p>
          ) : null}

          {!loading && !error ? (
            <>
              <section aria-labelledby="quests-heading">
                <h2 id="quests-heading" className={hubStyles.sectionTitle}>
                  Available quests
                </h2>
                <p className={styles.sectionSubtitle}>
                  Tap an active quest to load it into the evidence scanner below. Complete chores to earn RP.
                </p>
                {tasks.length === 0 ? (
                  <p className={styles.emptyState}>No quests assigned yet. Check back soon.</p>
                ) : (
                  <motion.div
                    className={styles.questGrid}
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: {},
                      show: {
                        transition: { staggerChildren: 0.08, delayChildren: 0.05 },
                      },
                    }}
                  >
                    {tasks.map((t) => {
                      const rewardBits: string[] = [];
                      if (t.points != null) rewardBits.push(`${t.points} RP`);
                      rewardBits.push(`${t.gpPoints ?? 0} GP`);
                      const rewards = rewardBits.join(" · ");
                      const due = t.dueDate
                        ? `Due ${new Date(t.dueDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                        : null;
                      const isActive = t.state === "Active";
                      const isSelected = taskId === t.id;
                      const badgeTone = isActive ? "accent" : "success";

                      return (
                        <GTCard
                          key={t.id}
                          glass
                          padding="md"
                          className={`${styles.questCard} ${isActive ? styles.questCardInteractive : ""}`}
                          role={isActive ? "button" : undefined}
                          tabIndex={isActive ? 0 : undefined}
                          aria-pressed={isActive ? isSelected : undefined}
                          aria-label={isActive ? `Select quest: ${t.title}` : undefined}
                          onClick={() => selectQuest(t)}
                          onKeyDown={(e) => onQuestKeyDown(e, t)}
                          variants={{
                            hidden: { opacity: 0, y: 18, scale: 0.92 },
                            show: {
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              transition: { type: "spring", stiffness: 440, damping: 26 },
                            },
                          }}
                          whileHover={
                            isActive
                              ? {
                                  scale: 1.02,
                                  y: -3,
                                  transition: { type: "spring", stiffness: 420, damping: 26 },
                                }
                              : undefined
                          }
                          whileTap={isActive ? { scale: 0.98, y: 0 } : undefined}
                        >
                          <div className={styles.questCardHeader}>
                            <h3 className={styles.questTitle}>{t.title}</h3>
                            <GTBadge tone={badgeTone} size="sm">
                              {questBadgeLabel(t.state)}
                            </GTBadge>
                          </div>
                          <p className={styles.questMeta}>{rewards}</p>
                          {due ? <p className={styles.questMeta}>{due}</p> : null}
                          {isSelected ? <p className={styles.questHint}>Loaded in scanner</p> : null}
                        </GTCard>
                      );
                    })}
                  </motion.div>
                )}
              </section>

              <section aria-labelledby="evidence-heading">
                <h2 id="evidence-heading" className={hubStyles.sectionTitle}>
                  Evidence uplink
                </h2>
                <GTCard glass padding="lg" className={styles.evidenceCard}>
                  <p className={styles.evidenceIntro}>
                    Photo or video, max 10MB. Your parent reviews before you earn points.
                  </p>
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
                  <form className={styles.formStack} onSubmit={(e) => void handleSubmitChore(e)}>
                    <div>
                      <label className={styles.fieldLabel} htmlFor="child-task-select">
                        Quest
                      </label>
                      <select
                        id="child-task-select"
                        className={styles.select}
                        value={taskId}
                        onChange={(e) => {
                          setTaskId(e.target.value);
                          setSubmitError(null);
                        }}
                        required
                      >
                        <option value="">Choose an active quest</option>
                        {activeTasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.scanRow}>
                      <input
                        ref={galleryInputRef}
                        id="evidence-gallery"
                        type="file"
                        accept="image/*,video/*"
                        className={styles.visuallyHidden}
                        onChange={onEvidenceFromFiles}
                      />
                      <input
                        ref={cameraInputRef}
                        id="evidence-camera"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className={styles.visuallyHidden}
                        onChange={onEvidenceFromCamera}
                      />
                      <GTButton
                        type="button"
                        variant="primary"
                        size="lg"
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        Scan evidence — Files
                      </GTButton>
                      <GTButton
                        type="button"
                        variant="primary"
                        size="lg"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        Scan evidence — Camera
                      </GTButton>
                    </div>

                    {evidenceFile ? (
                      <p className={styles.fileName}>
                        Locked in: {evidenceFile.name} ({Math.round(evidenceFile.size / 1024)} KB)
                      </p>
                    ) : null}

                    <GTInput
                      label="Note for parent (optional)"
                      value={evidenceNote}
                      onChange={(e) => setEvidenceNote(e.target.value)}
                      maxLength={500}
                      placeholder="Anything your parent should know…"
                    />

                    <GTButton type="submit" variant="primary" size="lg" loading={submitBusy} disabled={submitBusy}>
                      Submit for review
                    </GTButton>
                  </form>
                </GTCard>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
