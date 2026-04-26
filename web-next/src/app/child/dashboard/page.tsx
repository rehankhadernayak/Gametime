"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { apiRequest } from "@/lib/api/client";
import { fireGoldConfettiBurst } from "@/lib/confettiBurst";
import { TASK_STATES } from "@/lib/gametimeTaskStates";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { useChildGamerHubRealtime } from "@/hooks/useChildGamerHubRealtime";
import { trackEvent } from "@/lib/analytics";
import { GTCard } from "@/components/ui/GTCard";
import { GTGlassModal } from "@/components/ui/GTGlassModal";
import { GTBadge } from "@/components/ui/GTBadge";
import { GTButton } from "@/components/ui/GTButton";
import { GTInput } from "@/components/ui/GTInput";
import { EmptyState, GTSkeleton } from "@/components/ui";
import hubStyles from "@/components/child-gamer-hub/ChildGamerHub.module.css";
import themeModule from "@/styles/theme.module.css";
import styles from "./child-dashboard.module.css";

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const POLL_MS = 30_000;
/** Minimum busy/success state after Submit (anti double-submit / console spam). */
const EVIDENCE_SUBMIT_MIN_UI_MS = 5000;
/** Block another uplink submit until this many ms after the previous attempt started. */
const EVIDENCE_SUBMIT_COOLDOWN_MS = 5000;

function lightTapVibrate() {
  try {
    if (typeof window !== "undefined" && typeof window.navigator?.vibrate === "function") {
      window.navigator.vibrate(10);
    }
  } catch {
    /* ignore unsupported vibrate */
  }
}

type MeUser = {
  id?: string;
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
  createdAt?: string | null;
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

function ChildQuestGridSkeleton() {
  return (
    <div className={styles.skeletonQuestGrid} aria-busy="true" aria-label="Loading quests">
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.skeletonQuestCard}>
          <div className={styles.skeletonQuestHeader}>
            <GTSkeleton className={styles.skeletonTitleLine} />
            <GTSkeleton className={styles.skeletonBadgePill} />
          </div>
          <GTSkeleton className={styles.skeletonMetaLine} />
          <GTSkeleton className={styles.skeletonMetaLine2} />
        </div>
      ))}
    </div>
  );
}

/** Prefer closest due date, then earliest created time (API returns createdAt). */
function pickSmartDefaultTaskId(active: TaskRow[]): string {
  if (active.length === 0) return "";
  const sorted = [...active].sort((a, b) => {
    const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (dueA !== dueB) return dueA - dueB;
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createdA - createdB;
  });
  return sorted[0]?.id ?? "";
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
  const { auth, authHydrated } = useGametimeAuth();
  const token = auth.token;
  const reduceMotion = useReducedMotion();

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const evidenceNoteRef = useRef<HTMLInputElement>(null);
  const focusEvidenceFieldAfterOpenRef = useRef(false);
  const prevTaskStateByIdRef = useRef<Map<string, string>>(new Map());
  const prevRpRef = useRef<number | null>(null);
  const prevGpRef = useRef<number | null>(null);
  const skipNextPollingBalanceConfettiRef = useRef(false);
  const lastConfettiAtRef = useRef(0);
  const lastEvidenceSubmitAtRef = useRef<number>(0);

  const [me, setMe] = useState<MeUser | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [taskId, setTaskId] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);

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
    if (!authHydrated) return;
    if (!auth.token || auth.role !== "child") {
      replace("/login");
    }
  }, [auth.role, auth.token, authHydrated, replace]);

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

  const dispatchQuestStatusToast = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("gametime:toast", { detail: { message: "Quest Status Updated!" } }),
    );
  }, []);

  const burstConfettiThrottled = useCallback(() => {
    if (reduceMotion) return;
    const now = Date.now();
    if (now - lastConfettiAtRef.current < 700) return;
    lastConfettiAtRef.current = now;
    fireGoldConfettiBurst();
  }, [reduceMotion]);

  const realtimeHandlers = useMemo(
    () => ({
      onTaskParentDecision: (_taskId: string, nextState: typeof TASK_STATES.APPROVED | typeof TASK_STATES.REJECTED) => {
        dispatchQuestStatusToast();
        if (nextState === TASK_STATES.APPROVED) {
          burstConfettiThrottled();
        }
        void loadDashboard({ showSpinner: false });
      },
      onPointsBalanceIncrease: () => {
        skipNextPollingBalanceConfettiRef.current = true;
        burstConfettiThrottled();
        void loadDashboard({ showSpinner: false });
      },
    }),
    [burstConfettiThrottled, dispatchQuestStatusToast, loadDashboard],
  );

  useChildGamerHubRealtime(me?.id, auth.role === "child" && Boolean(token), realtimeHandlers);

  /** Gold confetti when a quest flips to Approved or balances increase (claim / payout). */
  useEffect(() => {
    if (loading || error) return;

    const prevMap = prevTaskStateByIdRef.current;
    let questJustApproved = false;
    for (const t of tasks) {
      const was = prevMap.get(t.id);
      if (was === "PendingApproval" && t.state === "Approved") {
        questJustApproved = true;
        break;
      }
    }
    const nextMap = new Map(tasks.map((t) => [t.id, t.state]));
    prevTaskStateByIdRef.current = nextMap;

    const rpNow = me?.pointsBalance ?? 0;
    const gpNow = me?.giftcardPointsBalance ?? 0;
    let balanceUp = false;
    if (prevRpRef.current !== null && rpNow > prevRpRef.current) balanceUp = true;
    if (prevGpRef.current !== null && gpNow > prevGpRef.current) balanceUp = true;
    prevRpRef.current = rpNow;
    prevGpRef.current = gpNow;

    if (skipNextPollingBalanceConfettiRef.current && balanceUp) {
      skipNextPollingBalanceConfettiRef.current = false;
      return;
    }
    skipNextPollingBalanceConfettiRef.current = false;

    if (!reduceMotion && (questJustApproved || balanceUp)) {
      burstConfettiThrottled();
    }
  }, [tasks, me, loading, error, reduceMotion, burstConfettiThrottled]);

  useEffect(() => {
    if (!evidenceModalOpen) return;
    setSubmitSuccess(false);
  }, [evidenceModalOpen]);

  const activeTasks = useMemo(() => tasks.filter((t) => t.state === "Active"), [tasks]);
  const activeQuestCount = activeTasks.length;
  const fabDisabled = !loading && activeQuestCount === 0;

  useEffect(() => {
    if (evidenceModalOpen) return;
    if (taskId && !activeTasks.some((t) => t.id === taskId)) {
      setTaskId("");
    }
  }, [activeTasks, evidenceModalOpen, taskId]);

  useEffect(() => {
    if (!evidenceModalOpen || submitBusy || submitSuccess) return;
    if (!focusEvidenceFieldAfterOpenRef.current) return;
    focusEvidenceFieldAfterOpenRef.current = false;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!taskId || activeTasks.length < 1) return;
        evidenceNoteRef.current?.focus();
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [evidenceModalOpen, taskId, activeTasks.length, submitBusy, submitSuccess]);

  const evidenceFormVariants = useMemo(
    () => ({
      hidden: {},
      show: {
        transition: reduceMotion
          ? { staggerChildren: 0, delayChildren: 0 }
          : { staggerChildren: 0.09, delayChildren: 0.08 },
      },
    }),
    [reduceMotion],
  );

  const evidenceFieldVariants = useMemo(
    () =>
      reduceMotion
        ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
        : {
            hidden: { opacity: 0, y: 10 },
            show: {
              opacity: 1,
              y: 0,
              transition: { type: "spring" as const, stiffness: 380, damping: 28 },
            },
          },
    [reduceMotion],
  );

  async function handleSubmitChore(e: React.FormEvent) {
    e.preventDefault();
    setSubmitMessage(null);
    setSubmitError(null);
    if (!taskId) {
      setSubmitError("Select a quest first.");
      return;
    }
    const questOk = activeTasks.some((t) => t.id === taskId);
    if (!questOk) {
      setSubmitError("That quest is not active. Refresh and pick an active quest.");
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

    const now = Date.now();
    if (now - lastEvidenceSubmitAtRef.current < EVIDENCE_SUBMIT_COOLDOWN_MS) {
      setSubmitError("Please wait a few seconds before submitting again.");
      return;
    }
    lastEvidenceSubmitAtRef.current = now;
    const submitStartedAt = now;

    const waitMinUi = () =>
      new Promise<void>((resolve) => {
        const elapsed = Date.now() - submitStartedAt;
        const left = Math.max(0, EVIDENCE_SUBMIT_MIN_UI_MS - elapsed);
        window.setTimeout(resolve, left);
      });

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
      setSubmitSuccess(true);
      await loadDashboard({ showSpinner: false });
      await waitMinUi();
      window.setTimeout(() => {
        setEvidenceModalOpen(false);
        setSubmitSuccess(false);
        setSubmitMessage(null);
        setTaskId("");
        setEvidenceFile(null);
        setEvidenceNote("");
      }, 450);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit task completion.");
      await waitMinUi();
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
    if (!reduceMotion) lightTapVibrate();
    setTaskId(t.id);
    setSubmitError(null);
    focusEvidenceFieldAfterOpenRef.current = true;
    setEvidenceModalOpen(true);
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
                {loading ? (
                  <div className={styles.heroSkeletonWrap} aria-hidden>
                    <div className={styles.heroSkeletonCol}>
                      <GTSkeleton className={styles.skeletonHeroValue} />
                      <GTSkeleton className={styles.skeletonMetaLine} />
                    </div>
                    <div className={styles.heroSkeletonCol}>
                      <GTSkeleton className={styles.skeletonHeroValue} />
                      <GTSkeleton className={styles.skeletonMetaLine2} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.heroBalanceCol}>
                      <p className={styles.heroValue} aria-live="polite">
                        {rp.toLocaleString()}
                      </p>
                      <span className={styles.heroUnit}>RP</span>
                    </div>
                    <div className={`${styles.heroBalanceCol} ${styles.heroBalanceColGp}`}>
                      <p className={`${styles.heroValue} ${styles.heroValueGp}`} aria-live="polite">
                        {gp.toLocaleString()}
                      </p>
                      <span className={`${styles.heroUnit} ${styles.heroUnitGp}`}>GP</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {error ? (
            <p className={styles.statusErr} role="alert">
              {error}{" "}
              <button type="button" className={styles.retryButton} onClick={() => void loadDashboard()}>
                Retry
              </button>
            </p>
          ) : null}

          {!error ? (
            <>
              <section aria-labelledby="quests-heading">
                <h2 id="quests-heading" className={hubStyles.sectionTitle}>
                  Available quests
                </h2>
                <p className={styles.sectionSubtitle}>
                  Tap an active quest to open the evidence uplink and submit photo or video proof. Complete chores to earn RP.
                </p>
                {loading ? (
                  <ChildQuestGridSkeleton />
                ) : tasks.length === 0 ? (
                  <EmptyState
                    title="No quests assigned yet."
                    description="When a parent assigns you a mission, it will appear here. Check back soon."
                  />
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
                    <AnimatePresence initial={false} mode="popLayout">
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

                      const questMotionKey = `${t.id}-${t.state}`;
                      const questExit =
                        reduceMotion || t.state !== TASK_STATES.PENDING_APPROVAL
                          ? undefined
                          : { opacity: 0, scale: 0.88, y: -16, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const } };

                      return (
                        <GTCard
                          key={questMotionKey}
                          glass
                          padding="md"
                          layout
                          className={`${styles.questCard} ${isActive ? styles.questCardInteractive : ""} ${isActive ? hubStyles.questReadyPulse : ""}`}
                          role={isActive ? "button" : undefined}
                          tabIndex={isActive ? 0 : undefined}
                          aria-pressed={isActive ? isSelected : undefined}
                          aria-label={isActive ? `Select quest: ${t.title}` : undefined}
                          onClick={() => selectQuest(t)}
                          onKeyDown={(e) => onQuestKeyDown(e, t)}
                          exit={questExit}
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
                          {isSelected ? <p className={styles.questHint}>Ready in uplink</p> : null}
                        </GTCard>
                      );
                    })}
                    </AnimatePresence>
                  </motion.div>
                )}
              </section>

              <div className={styles.evidenceFabWrap} aria-hidden={loading}>
                <button
                  type="button"
                  className={`${styles.evidenceFab} ${hubStyles.shimmerFab}${fabDisabled ? ` ${styles.evidenceFabDisabled}` : ""}`}
                  onClick={() => {
                    setSubmitError(null);
                    const keepExisting = Boolean(taskId && activeTasks.some((t) => t.id === taskId));
                    const nextId = keepExisting ? taskId : pickSmartDefaultTaskId(activeTasks);
                    setTaskId(nextId);
                    if (nextId) focusEvidenceFieldAfterOpenRef.current = true;
                    setEvidenceModalOpen(true);
                  }}
                  disabled={loading || fabDisabled}
                  title={fabDisabled ? "No active quests" : undefined}
                  aria-haspopup="dialog"
                  aria-expanded={evidenceModalOpen}
                  aria-controls="child-evidence-uplink-dialog"
                >
                  <span className={hubStyles.shimmer} aria-hidden />
                  <span className={hubStyles.shimmerFabInner}>
                    Evidence uplink
                    {taskId ? <span className={styles.evidenceFabBadge}>1</span> : null}
                  </span>
                </button>
              </div>

              <GTGlassModal
                open={evidenceModalOpen}
                onClose={() => {
                  if (submitSuccess) return;
                  setEvidenceModalOpen(false);
                }}
                titleId="evidence-heading"
              >
                <div id="child-evidence-uplink-dialog" className={styles.evidenceModalBody}>
                  <div className={styles.evidenceModalHeader}>
                    <h2 id="evidence-heading" className={hubStyles.sectionTitle}>
                      Evidence uplink
                    </h2>
                    <GTButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={submitBusy || submitSuccess}
                      onClick={() => setEvidenceModalOpen(false)}
                    >
                      Close
                    </GTButton>
                  </div>
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
                  <motion.form
                    className={styles.formStack}
                    onSubmit={(e) => void handleSubmitChore(e)}
                    initial="hidden"
                    animate="show"
                    variants={evidenceFormVariants}
                  >
                    <motion.div variants={evidenceFieldVariants}>
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
                        disabled={submitBusy || submitSuccess}
                      >
                        <option value="">Choose an active quest</option>
                        {activeTasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </motion.div>

                    <motion.div className={styles.scanRow} variants={evidenceFieldVariants}>
                      <input
                        ref={galleryInputRef}
                        id="evidence-gallery"
                        type="file"
                        accept="image/*,video/*"
                        className={styles.visuallyHidden}
                        onChange={onEvidenceFromFiles}
                        disabled={submitBusy || submitSuccess}
                      />
                      <input
                        ref={cameraInputRef}
                        id="evidence-camera"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className={styles.visuallyHidden}
                        onChange={onEvidenceFromCamera}
                        disabled={submitBusy || submitSuccess}
                      />
                      <GTButton
                        type="button"
                        variant="primary"
                        size="lg"
                        disabled={submitBusy || submitSuccess}
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        Scan evidence — Files
                      </GTButton>
                      <GTButton
                        type="button"
                        variant="primary"
                        size="lg"
                        disabled={submitBusy || submitSuccess}
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        Scan evidence — Camera
                      </GTButton>
                    </motion.div>

                    <motion.div variants={evidenceFieldVariants}>
                      {evidenceFile ? (
                        <p className={styles.fileName}>
                          Locked in: {evidenceFile.name} ({Math.round(evidenceFile.size / 1024)} KB)
                        </p>
                      ) : null}
                    </motion.div>

                    <motion.div variants={evidenceFieldVariants}>
                      <GTInput
                        ref={evidenceNoteRef}
                        label="Note for parent (optional)"
                        value={evidenceNote}
                        onChange={(e) => setEvidenceNote(e.target.value)}
                        maxLength={500}
                        placeholder="Anything your parent should know…"
                        disabled={submitBusy || submitSuccess}
                      />
                    </motion.div>

                    <motion.div variants={evidenceFieldVariants}>
                      <GTButton
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={submitBusy && !submitSuccess}
                        disabled={submitBusy || submitSuccess}
                        className={submitSuccess ? styles.submitBtnSuccess : ""}
                        aria-label={submitSuccess ? "Submitted successfully" : "Submit for review"}
                      >
                        {submitSuccess ? (
                          <span className={styles.submitCheckIcon} aria-hidden>
                            ✓
                          </span>
                        ) : (
                          "Submit for review"
                        )}
                      </GTButton>
                    </motion.div>
                  </motion.form>
                </div>
              </GTGlassModal>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
