import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { createNotification } from './notificationService.js';

/**
 * Update the child's streak and check for newly unlocked achievements.
 * Called after a task is approved — must be invoked AFTER the DB transaction
 * commits so a failure here never rolls back the point award.
 *
 * @param {string} childId
 * @param {object} db — the already-open db connection (passed in to avoid extra getDb call)
 */
export async function checkAndUnlockAchievements(childId, db) {
  // ── 1. Update streak ────────────────────────────────────────────────────────
  const child = await db.get(
    'SELECT current_streak_days, last_completion_date FROM child_profiles WHERE id = ?',
    [childId]
  );
  if (!child) return;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  let newStreak;
  if (child.last_completion_date === today) {
    newStreak = child.current_streak_days; // already counted today
  } else if (child.last_completion_date === yesterday) {
    newStreak = child.current_streak_days + 1; // extending streak
  } else {
    newStreak = 1; // gap or first ever — reset
  }

  await db.run(
    'UPDATE child_profiles SET current_streak_days = ?, last_completion_date = ? WHERE id = ?',
    [newStreak, today, childId]
  );

  // ── 2. Gather current stats in one round-trip ────────────────────────────────
  const stats = await db.get(
    `SELECT
       (SELECT COUNT(*) FROM tasks WHERE child_id = ? AND state = 'Approved') AS task_count,
       (SELECT COALESCE(SUM(points), 0) FROM points_transactions WHERE child_id = ? AND type = 'Credit' AND points_kind = 'RP') AS total_rp`,
    [childId, childId]
  );
  const { task_count: taskCount, total_rp: totalRp } = stats;
  const streak = newStreak;

  // ── 3. Find unlockable achievements not yet earned ───────────────────────────
  const newlyUnlocked = await db.all(
    `SELECT a.id, a.name, a.icon, a.type, a.threshold
     FROM achievements a
     WHERE a.id NOT IN (
       SELECT achievement_id FROM child_achievements WHERE child_id = ?
     )
     AND (
       (a.type = 'task_count' AND ? >= a.threshold) OR
       (a.type = 'streak'     AND ? >= a.threshold) OR
       (a.type = 'points'     AND ? >= a.threshold)
     )`,
    [childId, taskCount, streak, totalRp]
  );

  if (newlyUnlocked.length === 0) return;

  // ── 4. Insert unlock records and notify ─────────────────────────────────────
  const now = new Date().toISOString();
  for (const ach of newlyUnlocked) {
    await db.run(
      'INSERT OR IGNORE INTO child_achievements (id, child_id, achievement_id, unlocked_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), childId, ach.id, now]
    );
    await createNotification(
      'Child',
      childId,
      `Achievement unlocked: ${ach.icon} ${ach.name}`,
      'achievement_unlocked'
    );
    logger.info({ childId, achievement: ach.name }, '[achievements] unlocked');
  }
}

/**
 * Return all achievements for a child with unlocked status.
 * @param {string} childId
 * @returns {Promise<Array>}
 */
export async function listAchievements(childId) {
  const db = await getDb();
  return db.all(
    `SELECT
       a.id, a.key, a.name, a.description, a.icon, a.type, a.threshold,
       CASE WHEN ca.id IS NOT NULL THEN 1 ELSE 0 END AS unlocked,
       ca.unlocked_at AS unlockedAt
     FROM achievements a
     LEFT JOIN child_achievements ca ON ca.achievement_id = a.id AND ca.child_id = ?
     ORDER BY a.type, a.threshold`,
    [childId]
  );
}

/**
 * Return the current streak for a child.
 * @param {string} childId
 * @returns {Promise<number>}
 */
export async function getStreak(childId) {
  const db = await getDb();
  const row = await db.get('SELECT current_streak_days FROM child_profiles WHERE id = ?', [childId]);
  return row?.current_streak_days ?? 0;
}
