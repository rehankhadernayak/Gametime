import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/connection.js';
import { env } from '../config/env.js';

/* ── Anthropic client ─────────────────────────────────────────────────────── */
function getClient() {
  if (!env.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to your .env file and restart the server.');
  }
  return new Anthropic({ apiKey: env.anthropicApiKey });
}

/* ── Per-child insights data ──────────────────────────────────────────────── */
/**
 * Computes a rich insights object for every child belonging to parentId.
 * All data is scoped to the current ISO week (Mon–Sun).
 */
export async function getInsightsData(parentId) {
  const db = await getDb();

  const children = await db.all(
    `SELECT id, name, points_balance AS rpBalance, giftcard_points_balance AS gpBalance
     FROM child_profiles WHERE parent_id = ? ORDER BY created_at`,
    [parentId]
  );

  /* Current week start (Monday 00:00:00 local, stored in ISO) */
  const now       = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMon);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartIso = weekStart.toISOString();

  const childInsights = await Promise.all(
    children.map(async (child) => {

      /* Top games this week (by total duration, top 3) */
      const topGames = await db.all(
        `SELECT game_name AS gameName,
                SUM(duration_minutes) AS totalMinutes,
                COUNT(*) AS sessionCount
         FROM gaming_sessions
         WHERE child_id = ? AND status = 'Completed' AND started_at >= ?
         GROUP BY game_name
         ORDER BY totalMinutes DESC
         LIMIT 3`,
        [child.id, weekStartIso]
      );

      /* Average session duration + total session count this week */
      const avgSession = await db.get(
        `SELECT ROUND(AVG(duration_minutes), 1) AS avgMinutes,
                COUNT(*) AS sessionCount
         FROM gaming_sessions
         WHERE child_id = ? AND status = 'Completed' AND started_at >= ?`,
        [child.id, weekStartIso]
      );

      /* Late-night gaming sessions (started at or after 21:00) */
      const lateNight = await db.get(
        `SELECT COUNT(*) AS count
         FROM gaming_sessions
         WHERE child_id = ? AND started_at >= ?
           AND CAST(strftime('%H', started_at) AS INTEGER) >= 21`,
        [child.id, weekStartIso]
      );

      /* Total gaming minutes this week */
      const totalGaming = await db.get(
        `SELECT COALESCE(SUM(duration_minutes), 0) AS minutes
         FROM gaming_sessions
         WHERE child_id = ? AND status = 'Completed' AND started_at >= ?`,
        [child.id, weekStartIso]
      );

      /* Task completions approved this week */
      const completions = await db.get(
        `SELECT COUNT(*) AS count
         FROM task_completions
         WHERE child_id = ? AND status = 'Approved' AND completed_at >= ?`,
        [child.id, weekStartIso]
      );

      /* Active tasks remaining */
      const activeTasks = await db.get(
        `SELECT COUNT(*) AS count FROM tasks WHERE child_id = ? AND state = 'Active'`,
        [child.id]
      );

      /* Gaming settings for cap reference */
      const gamingSettings = await db.get(
        `SELECT weekly_cap_minutes AS weeklyCapMinutes,
                daily_cap_minutes  AS dailyCapMinutes,
                points_unit AS pointsUnit, minutes_unit AS minutesUnit
         FROM gaming_settings
         WHERE parent_id = (SELECT parent_id FROM child_profiles WHERE id = ?)`,
        [child.id]
      );

      /* ── Healthy Balance Score (0–100) ─────────────────────────────────
         Task component (0–50): min(completions × 10, 50)
         Gaming moderation component (0–50):
           ≤ 50 % of weekly cap used → 50
           ≤ 80 % used               → 40
           ≤ 100 % used              → 25
           > 100 % (over cap)        → 10
           No cap set                → 50 (neutral)
      ─────────────────────────────────────────────────────────────────── */
      const completionScore = Math.min(50, (completions?.count || 0) * 10);

      let gamingScore = 50;
      if (gamingSettings?.weeklyCapMinutes > 0) {
        const usagePct = (totalGaming?.minutes || 0) / gamingSettings.weeklyCapMinutes;
        if      (usagePct <= 0.50) gamingScore = 50;
        else if (usagePct <= 0.80) gamingScore = 40;
        else if (usagePct <= 1.00) gamingScore = 25;
        else                       gamingScore = 10;
      }

      const healthyBalanceScore = Math.min(100, completionScore + gamingScore);

      return {
        childId:               child.id,
        childName:             child.name,
        rpBalance:             child.rpBalance,
        gpBalance:             child.gpBalance,
        topGames:              topGames,
        avgSessionMinutes:     avgSession?.avgMinutes || 0,
        sessionCount:          avgSession?.sessionCount || 0,
        lateNightSessions:     lateNight?.count || 0,
        totalGamingMinutes:    totalGaming?.minutes || 0,
        tasksCompletedThisWeek: completions?.count || 0,
        activeTasksCount:      activeTasks?.count || 0,
        healthyBalanceScore,
        weeklyCapMinutes:      gamingSettings?.weeklyCapMinutes || null,
        dailyCapMinutes:       gamingSettings?.dailyCapMinutes  || null
      };
    })
  );

  return { children: childInsights, weekStart: weekStartIso };
}

/* ── AI narrative summary ─────────────────────────────────────────────────── */
/**
 * Generates a short parent-friendly AI narrative about the week's activity.
 * Returns a string, or null on failure.
 */
export async function generateInsightsSummary(insightsData) {
  if (!insightsData?.children?.length) return null;

  const client = getClient();

  const childSummaries = insightsData.children
    .map((c) => {
      const topGame = c.topGames[0];
      const cap     = c.weeklyCapMinutes ? `/${c.weeklyCapMinutes} min cap` : '';
      return (
        `${c.childName}: ${c.tasksCompletedThisWeek} tasks completed, ` +
        `${c.totalGamingMinutes}${cap} gaming, ` +
        `top game: ${topGame ? `${topGame.gameName} (${topGame.totalMinutes} min)` : 'none'}, ` +
        `late-night sessions: ${c.lateNightSessions}, ` +
        `balance score: ${c.healthyBalanceScore}/100`
      );
    })
    .join('\n');

  const userPrompt =
    `Here is this week's family gaming and task summary:\n${childSummaries}\n\n` +
    `Write a 2-3 sentence parent-friendly narrative highlighting key wins, healthy habits, and any gentle concerns. ` +
    `Be warm, constructive, and specific. Plain text only. No markdown.`;

  try {
    const response = await client.messages.create({
      model:      env.claudeModel,
      max_tokens: 250,
      messages:   [{ role: 'user', content: userPrompt }]
    });

    return response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('') || null;
  } catch {
    return null;
  }
}
