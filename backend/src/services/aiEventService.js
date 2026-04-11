import { setMemory } from './aiMemoryService.js';

/**
 * Count tasks in PendingApproval state for this parent's children.
 * If > 3, persist count to memory key 'approval_backlog'.
 */
export async function checkApprovalBacklog(parentId, db) {
  const row = await db.get(
    `SELECT COUNT(*) AS count
     FROM tasks t
     JOIN child_profiles cp ON cp.id = t.child_id
     WHERE cp.parent_id = ? AND t.state = 'PendingApproval'`,
    [parentId]
  );
  const count = row?.count ?? 0;
  if (count > 3) {
    await setMemory(parentId, 'approval_backlog', count.toString());
  } else {
    // Clear stale backlog warning when it no longer applies
    await setMemory(parentId, 'approval_backlog', count.toString());
  }
}

/**
 * Find children whose streak will break today (last_completion_date = yesterday,
 * current_streak_days > 0). Store names in 'streak_at_risk'.
 */
export async function checkStreakRisk(parentId, db) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD

  const rows = await db.all(
    `SELECT name FROM child_profiles
     WHERE parent_id = ?
       AND current_streak_days > 0
       AND last_completion_date = ?`,
    [parentId, yesterdayStr]
  );

  const names = rows.map((r) => r.name).join(', ');
  await setMemory(parentId, 'streak_at_risk', names || 'none');
}

/**
 * Find children with no approved tasks in the last 48 hours.
 * Store names in 'inactive_children'.
 */
export async function checkFamilyInactivity(parentId, db) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const rows = await db.all(
    `SELECT cp.name
     FROM child_profiles cp
     WHERE cp.parent_id = ?
       AND cp.id NOT IN (
         SELECT DISTINCT tc.child_id
         FROM task_completions tc
         WHERE tc.status = 'Approved' AND tc.completed_at >= ?
       )`,
    [parentId, cutoff]
  );

  const names = rows.map((r) => r.name).join(', ');
  await setMemory(parentId, 'inactive_children', names || 'none');
}

/**
 * Run all context checks, plus store child names/ages, weekly tasks, top performer.
 * Call at the start of every parent AI chat request.
 */
export async function refreshFamilyContext(parentId, db) {
  // Run all three checks in parallel
  await Promise.all([
    checkApprovalBacklog(parentId, db),
    checkStreakRisk(parentId, db),
    checkFamilyInactivity(parentId, db)
  ]);

  // Child names and ages
  const children = await db.all(
    `SELECT name, date_of_birth FROM child_profiles WHERE parent_id = ? ORDER BY created_at`,
    [parentId]
  );

  function calcAge(dob) {
    if (!dob) return '?';
    const d = new Date(dob);
    const now = new Date();
    let age = now.getUTCFullYear() - d.getUTCFullYear();
    const m = now.getUTCMonth() - d.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
    return age;
  }

  const childSummary = children
    .map((c) => `${c.name} (age ${calcAge(c.date_of_birth)})`)
    .join(', ');
  await setMemory(parentId, 'children', childSummary || 'none');

  // Total approved tasks this week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMon);
  weekStart.setHours(0, 0, 0, 0);

  const weeklyRow = await db.get(
    `SELECT COUNT(*) AS count
     FROM task_completions tc
     JOIN child_profiles cp ON cp.id = tc.child_id
     WHERE cp.parent_id = ? AND tc.status = 'Approved' AND tc.completed_at >= ?`,
    [parentId, weekStart.toISOString()]
  );
  await setMemory(parentId, 'weekly_tasks_approved', (weeklyRow?.count ?? 0).toString());

  // Top performer this week
  const topRow = await db.get(
    `SELECT cp.name, COUNT(*) AS cnt
     FROM task_completions tc
     JOIN child_profiles cp ON cp.id = tc.child_id
     WHERE cp.parent_id = ? AND tc.status = 'Approved' AND tc.completed_at >= ?
     GROUP BY tc.child_id, cp.name
     ORDER BY cnt DESC
     LIMIT 1`,
    [parentId, weekStart.toISOString()]
  );
  await setMemory(
    parentId,
    'top_performer_this_week',
    topRow ? `${topRow.name} (${topRow.cnt} tasks)` : 'none'
  );
}
