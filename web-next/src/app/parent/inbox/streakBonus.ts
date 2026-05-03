const STREAK_WINDOW_MS = 24 * 60 * 60 * 1000;
export const STREAK_BONUS_MILESTONES = [3, 5, 7] as const;

export function parseMilestoneRewarded(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    try {
      const j = JSON.parse(raw) as unknown;
      return Array.isArray(j) ? j.filter((x): x is number => typeof x === "number" && Number.isFinite(x)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Next streak count and newly hit milestones (for +10% each), after an approval at `now`. */
export function computeStreakAfterApproval(args: {
  nowMs: number;
  priorStreakDays: number;
  lastApprovalAtMs: number | null;
  milestonesAlreadyRewarded: number[];
}): { nextStreak: number; newMilestones: number[]; clearedRewarded: boolean } {
  const { nowMs, priorStreakDays, lastApprovalAtMs, milestonesAlreadyRewarded } = args;

  let nextStreak: number;
  let streakBroken = false;

  if (lastApprovalAtMs == null || !Number.isFinite(lastApprovalAtMs)) {
    nextStreak = 1;
  } else if (nowMs - lastApprovalAtMs <= STREAK_WINDOW_MS) {
    nextStreak = Math.max(1, priorStreakDays + 1);
  } else {
    nextStreak = 1;
    streakBroken = true;
  }

  const clearedRewarded =
    streakBroken || lastApprovalAtMs == null || !Number.isFinite(lastApprovalAtMs);
  const rewardedBase = clearedRewarded ? [] : milestonesAlreadyRewarded;

  const newMilestones = STREAK_BONUS_MILESTONES.filter(
    (m) => nextStreak >= m && !rewardedBase.includes(m),
  );

  return { nextStreak, newMilestones: [...newMilestones], clearedRewarded };
}

export function bonusMinutesForMilestones(baseMinutes: number, milestones: readonly number[]): number {
  if (milestones.length === 0 || baseMinutes <= 0) return 0;
  const per = Math.floor(baseMinutes * 0.1);
  return per * milestones.length;
}
