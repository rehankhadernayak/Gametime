import { getDb } from '../db/connection.js';
import { sendWeeklyDigestEmail } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

/**
 * Compute Monday 00:00 UTC of the current week as a date string.
 */
function weekStart() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day; // offset to Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

function weekLabel() {
  const start = new Date(weekStart());
  return start.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

async function runDigest() {
  const db = await getDb();
  const since = weekStart();

  // Only send to parents who have weeklyReport enabled (or no pref saved = default true)
  const parents = await db.all(
    `SELECT id, name, email, notification_preferences
     FROM parent_accounts
     WHERE email IS NOT NULL`
  );

  let sent = 0;
  for (const parent of parents) {
    try {
      let prefs = { enabled: true, weeklyReport: true };
      if (parent.notification_preferences) {
        try { prefs = { ...prefs, ...JSON.parse(parent.notification_preferences) }; } catch { /* ignore */ }
      }
      if (!prefs.enabled || !prefs.weeklyReport) continue;

      // Per-child stats for this week
      const children = await db.all(
        `SELECT
           cp.id,
           cp.name,
           cp.current_streak_days AS streak,
           COUNT(DISTINCT t.id) AS tasksApproved,
           COALESCE(SUM(t.points), 0) AS rpEarned
         FROM child_profiles cp
         LEFT JOIN tasks t ON t.child_id = cp.id
           AND t.state = 'Approved'
           AND t.approved_at >= ?
         WHERE cp.parent_id = ?
         GROUP BY cp.id`,
        [since, parent.id]
      );

      const totalTasksApproved = children.reduce((s, c) => s + c.tasksApproved, 0);
      const totalRpEarned = children.reduce((s, c) => s + c.rpEarned, 0);

      const result = await sendWeeklyDigestEmail(parent.email, parent.name, {
        children,
        totalTasksApproved,
        totalRpEarned,
        weekOf: weekLabel()
      });

      if (result.previewUrl) {
        logger.info({ parentId: parent.id, previewUrl: result.previewUrl }, '[digest] sent (test mode)');
      } else {
        logger.info({ parentId: parent.id }, '[digest] sent');
      }
      sent++;
    } catch (err) {
      logger.error({ err, parentId: parent.id }, '[digest] failed to send for parent');
    }
  }
  logger.info({ sent, total: parents.length }, '[digest] weekly digest run complete');
}

let timer = null;

/**
 * Schedule the weekly digest to fire every Monday at 08:00 SGT (00:00 UTC).
 * Falls back to a weekly interval from the time of server start if the precise
 * Monday window is already past.
 */
export function startWeeklyDigestJob() {
  if (timer) return;

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  function msUntilNextMonday8amSGT() {
    // SGT = UTC+8, so 8am SGT = 00:00 UTC
    const now = new Date();
    const dayUTC = now.getUTCDay(); // 0=Sun,1=Mon,...
    const daysUntilMon = dayUTC === 1 ? 0 : (8 - dayUTC) % 7;
    const nextMon = new Date(now);
    nextMon.setUTCDate(now.getUTCDate() + daysUntilMon);
    nextMon.setUTCHours(0, 0, 0, 0);
    const ms = nextMon.getTime() - now.getTime();
    if (ms > 0) return ms;

    nextMon.setUTCDate(nextMon.getUTCDate() + 7);
    return nextMon.getTime() - now.getTime();
  }

  const initialDelay = msUntilNextMonday8amSGT();

  setTimeout(() => {
    runDigest().catch((err) => logger.error({ err }, '[digest] run failed'));
    timer = setInterval(() => {
      runDigest().catch((err) => logger.error({ err }, '[digest] run failed'));
    }, WEEK_MS);
  }, initialDelay);

  logger.info(
    { nextRunIn: `${Math.round(initialDelay / 3600000)}h` },
    '[digest] weekly digest job scheduled'
  );
}

export function stopWeeklyDigestJob() {
  if (timer) clearInterval(timer);
  timer = null;
}
