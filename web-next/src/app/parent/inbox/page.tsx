"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useGametimeAuth } from "@/hooks/useGametimeAuth";
import { GTButton, ParentTheme, EmptyState } from "@/components/ui";
import styles from "./inbox.module.css";

type PendingTask = {
  id: string;
  title: string;
  rewardMinutes: number;
};

const MOCK_PENDING: PendingTask[] = [
  { id: "mock-1", title: "Do Math Homework", rewardMinutes: 30 },
  { id: "mock-2", title: "Clean Room", rewardMinutes: 45 },
  { id: "mock-3", title: "Practice Piano (20 min)", rewardMinutes: 20 },
];

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
  const [tasks, setTasks] = useState<PendingTask[]>(MOCK_PENDING);

  useEffect(() => {
    if (!authHydrated) return;
    if (auth.role !== "parent") router.replace("/login");
  }, [auth.role, authHydrated, router]);

  const dismissTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const onApprove = useCallback(
    (id: string) => {
      dismissTask(id);
      toast.success("Time added to child bank!", { duration: 3200 });
    },
    [dismissTask],
  );

  const onReject = useCallback(
    (id: string) => {
      dismissTask(id);
    },
    [dismissTask],
  );

  const list = useMemo(() => tasks, [tasks]);

  if (!authHydrated || auth.role !== "parent") return null;

  return (
    <ParentTheme>
      <div className={styles.shell}>
        <header>
          <p className={styles.heroEyebrow}>Review queue</p>
          <h1 className={styles.heroTitle}>Approval inbox</h1>
          <p className={styles.heroSub}>
            Pending chores with photo evidence. Approve to add reward time to your child&apos;s bank, or send back for
            another try.
          </p>
        </header>

        {list.length === 0 ? (
          <div className={styles.emptyWrap}>
            <EmptyState
              title="Inbox clear"
              description="No tasks are waiting for approval right now."
            />
          </div>
        ) : (
          <ul className={styles.feed} aria-label="Pending tasks">
            <AnimatePresence initial={false}>
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
                          onClick={() => onApprove(task.id)}
                        >
                          Approve
                        </GTButton>
                        <GTButton
                          type="button"
                          variant="danger"
                          size="lg"
                          fullWidth
                          onClick={() => onReject(task.id)}
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
