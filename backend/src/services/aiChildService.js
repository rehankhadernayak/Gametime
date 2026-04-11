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

/* ── Child AI tools ───────────────────────────────────────────────────────── */
const CHILD_AI_TOOLS = [
  {
    name: 'get_my_stats',
    description:
      "Fetch the child's live stats: RP balance, GP balance, active tasks, completions this week, gaming usage today and this week, and available play minutes. Call this when you need up-to-date information to answer a question about their progress or gaming time.",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_my_tasks',
    description:
      "Get the child's task list. Use this when they ask what they need to do, what tasks are active, or whether a task was approved. Optional state filter: Active, PendingApproval, Approved, Rejected.",
    input_schema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: 'Optional filter: Active, PendingApproval, Approved, Rejected' }
      },
      required: []
    }
  },
  {
    name: 'get_available_rewards',
    description:
      "Get the list of rewards the child can redeem, including whether they can currently afford each one. Use when they ask what rewards are available, what they can get, or how close they are to a reward.",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_my_achievements',
    description:
      "Get the child's achievements — both unlocked ones (to celebrate) and locked ones (to set goals). Use when they ask about badges, achievements, or what to work towards next.",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_leaderboard',
    description:
      "Get the family leaderboard showing how all siblings rank by RP balance. Use to motivate the child with friendly competition, or when they ask how they compare to siblings.",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'start_break_timer',
    description:
      'Signal the UI to show a countdown break or rest timer. Use this when suggesting study breaks, the 20-20-20 eye rest rule, stretch breaks, or water reminders. Always call this when recommending a timed break so the child sees a visible countdown.',
    input_schema: {
      type: 'object',
      properties: {
        duration_minutes: {
          type: 'number',
          description:
            'Length of the break in minutes. Use 0.33 (≈20 seconds) for 20-20-20 eye rest. Use 5 for short breaks, 10-15 for study breaks.'
        },
        break_type: {
          type: 'string',
          enum: ['eye_rest', 'study_break', 'stretch', 'water', 'custom'],
          description: 'Category of break to show on the timer screen'
        },
        message: {
          type: 'string',
          description: 'Short, encouraging message to display on the timer (max 80 chars)'
        }
      },
      required: ['duration_minutes', 'break_type', 'message']
    }
  }
];

/* ── Child context builder ────────────────────────────────────────────────── */
export async function getChildContext(childId) {
  const db = await getDb();

  const child = await db.get(
    `SELECT id, name, points_balance AS rpBalance, giftcard_points_balance AS gpBalance,
            date_of_birth AS dateOfBirth, parent_id AS parentId,
            current_streak_days AS streakDays, last_completion_date AS lastCompletionDate
     FROM child_profiles WHERE id = ?`,
    [childId]
  );

  /* Active tasks */
  const activeTasks = await db.all(
    `SELECT title, points, category, due_date AS dueDate
     FROM tasks WHERE child_id = ? AND state = 'Active'
     ORDER BY due_date ASC LIMIT 10`,
    [childId]
  );

  /* Completions this week (Mon → now) */
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMon);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartIso = weekStart.toISOString();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const weeklyCompletions = await db.get(
    `SELECT COUNT(*) AS count FROM task_completions
     WHERE child_id = ? AND status = 'Approved' AND completed_at >= ?`,
    [childId, weekStartIso]
  );

  /* Gaming today */
  const gamingToday = await db.get(
    `SELECT COALESCE(SUM(duration_minutes), 0) AS minutes
     FROM gaming_sessions
     WHERE child_id = ? AND status = 'Completed' AND started_at >= ?`,
    [childId, todayStartIso]
  );

  /* Gaming this week */
  const gamingWeek = await db.get(
    `SELECT COALESCE(SUM(duration_minutes), 0) AS minutes
     FROM gaming_sessions
     WHERE child_id = ? AND status = 'Completed' AND started_at >= ?`,
    [childId, weekStartIso]
  );

  /* Recent sessions (last 3 completed) */
  const recentSessions = await db.all(
    `SELECT game_name AS gameName, duration_minutes AS durationMinutes, started_at AS startedAt
     FROM gaming_sessions
     WHERE child_id = ? AND status = 'Completed'
     ORDER BY started_at DESC LIMIT 3`,
    [childId]
  );

  /* Gaming settings from parent */
  let settings = null;
  let playableMinutes = 0;
  if (child?.parentId) {
    settings = await db.get(
      `SELECT points_unit AS pointsUnit, minutes_unit AS minutesUnit,
              daily_cap_minutes AS dailyCapMinutes, weekly_cap_minutes AS weeklyCapMinutes
       FROM gaming_settings WHERE parent_id = ?`,
      [child.parentId]
    );
    if (settings && child?.rpBalance != null) {
      const earnedMinutes = Math.floor((child.rpBalance / settings.pointsUnit) * settings.minutesUnit);
      const remainingToday = Math.max(0, settings.dailyCapMinutes - (gamingToday?.minutes || 0));
      const remainingWeek  = Math.max(0, settings.weeklyCapMinutes - (gamingWeek?.minutes || 0));
      playableMinutes = Math.max(0, Math.min(earnedMinutes, remainingToday, remainingWeek));
    }
  }

  return {
    child,
    activeTasks,
    weeklyCompletions: weeklyCompletions?.count || 0,
    gamingToday:       gamingToday?.minutes || 0,
    gamingWeek:        gamingWeek?.minutes  || 0,
    recentSessions,
    settings,
    playableMinutes
  };
}

/* ── System prompt builder ────────────────────────────────────────────────── */
function buildChildSystemPrompt(ctx) {
  const { child, activeTasks, weeklyCompletions, gamingToday, gamingWeek, recentSessions, settings, playableMinutes } = ctx;
  const name = child?.name || 'Player';

  const taskList =
    activeTasks.length === 0
      ? 'No active tasks right now.'
      : activeTasks.map((t) => `  ${t.title} (${t.points} RP) — due ${t.dueDate ? t.dueDate.slice(0, 10) : 'soon'}`).join('\n');

  const recentGaming =
    recentSessions.length === 0
      ? 'No recent sessions recorded.'
      : recentSessions.map((s) => `  ${s.gameName}: ${s.durationMinutes} min`).join('\n');

  const limitsText = settings
    ? `Daily cap: ${settings.dailyCapMinutes} min | Weekly cap: ${settings.weeklyCapMinutes} min | Conversion: ${settings.pointsUnit} RP = ${settings.minutesUnit} min`
    : 'Gaming limits not configured yet.';

  const streakDays  = child?.streakDays || 0;
  const streakText  = streakDays > 0
    ? `Current streak: ${streakDays} day${streakDays !== 1 ? 's' : ''} in a row!`
    : 'No active streak yet — do a task today to start one!';

  return `You are Buddy, ${name}'s personal AI coach on Gametime. You know ${name} personally and genuinely care about their progress!

## Who You're Talking To
Name: ${name}
RP balance: ${child?.rpBalance || 0} RP
GP balance: ${child?.gpBalance || 0} GP
${streakText}
Tasks completed this week (approved by parent): ${weeklyCompletions}
Gaming today: ${gamingToday} minutes
Gaming this week: ${gamingWeek} minutes
Play minutes available right now: ${playableMinutes} min

## ${name}'s Active Tasks (${activeTasks.length} total)
${taskList}

## Recent Gaming Sessions
${recentGaming}

## Gaming Settings
${limitsText}

## Your Role as ${name}'s Coach
You are warm, playful, and genuinely encouraging. Think of yourself as ${name}'s biggest fan and smartest friend. You help with:
1. Homework and study help — break things down step by step, offer worked examples, make it fun
2. Study breaks — use start_break_timer whenever suggesting a timed break so they see a real countdown on screen
3. Eye rest (the 20-20-20 rule) — every 20 minutes of screen time, look 20 feet away for 20 seconds. Use break_type "eye_rest" and duration_minutes 0.33
4. Healthy habits — stretch reminders, water breaks, posture checks (keep it light and fun, not preachy)
5. Gaming awareness — celebrate responsible gaming, give gentle heads-up when approaching the cap
6. Task motivation — celebrate every win, suggest which task to tackle next, make tasks feel like quests
7. Focus sprints — challenge ${name} to earn more gaming time with a study sprint
8. Quiz time — quiz them on topics they mention (ask, wait for answer, give warm feedback)
9. Achievements and goals — use get_my_achievements to cheer wins and show what to unlock next
10. Leaderboard — use get_leaderboard for friendly sibling competition and motivation
11. Rewards planning — use get_available_rewards to help ${name} plan what to work towards

## Tool Instructions
Use get_my_stats to get live data before answering about RP, gaming time, tasks, or play minutes.
Use get_my_tasks when they ask what tasks they have, what's due, or if something was approved.
Use get_available_rewards when they ask what they can redeem or what rewards exist.
Use get_my_achievements when they ask about badges, progress, or what to unlock next.
Use get_leaderboard for friendly sibling comparison or motivation.
Use start_break_timer whenever suggesting any timed break — always include message, break_type, and duration_minutes.

## Tone and Style
Warm, playful, and real. Use ${name}'s first name naturally. Keep it short and punchy like a friendly text. Celebrate wins with genuine excitement (but not over the top). Use simple words. If ${name} is stuck or struggling, be patient and encouraging. Never lecture or be negative about gaming.

## About Streaks
${streakDays > 0 ? `${name} has a ${streakDays}-day streak going! Mention it when relevant to motivate them to keep it going.` : `${name} doesn't have a streak yet. Encourage them to complete a task today to start one!`}

## Formatting Rules
Plain text only. No markdown. No # headers, no bold, no italics, no hyphens or asterisks for bullets. Write like a friendly text message. Use numbered lines for lists: "1. ... 2. ...".
Never use em dashes or en dashes. Use commas or colons instead.`;
}

/* ── Tool labels ──────────────────────────────────────────────────────────── */
function childToolLabel(name, input) {
  if (name === 'get_my_stats')          return 'Checking your stats…';
  if (name === 'start_break_timer')     return `Setting up ${input?.break_type || 'a'} timer…`;
  if (name === 'get_my_tasks')          return 'Checking your tasks…';
  if (name === 'get_available_rewards') return 'Checking rewards…';
  if (name === 'get_my_achievements')   return 'Loading your achievements…';
  if (name === 'get_leaderboard')       return 'Checking the leaderboard…';
  return `Running ${name}…`;
}

/* ── Tool executor ────────────────────────────────────────────────────────── */
async function executeChildTool(childId, name, input) {
  try {
    if (name === 'get_my_stats') {
      const ctx = await getChildContext(childId);
      return {
        success: true,
        message: `Stats loaded — ${ctx.child?.rpBalance || 0} RP, ${ctx.gamingToday} min gaming today, ${ctx.playableMinutes} min available`,
        data: ctx
      };
    }

    if (name === 'start_break_timer') {
      /* Frontend reads the tool_done event and renders the countdown */
      return {
        success: true,
        message: `${input.break_type} timer started — ${input.duration_minutes} min`,
        data: {
          durationMinutes: Number(input.duration_minutes),
          breakType:       input.break_type,
          message:         String(input.message || 'Take a break!')
        }
      };
    }

    if (name === 'get_my_tasks') {
      const db = await getDb();
      let query = `SELECT id, title, description, points, state, due_date AS dueDate, category
                   FROM tasks WHERE child_id = ?`;
      const params = [childId];
      if (input.state) { query += ' AND state = ?'; params.push(input.state); }
      query += ` ORDER BY CASE state WHEN 'Active' THEN 0 WHEN 'PendingApproval' THEN 1 ELSE 2 END, due_date ASC LIMIT 15`;
      const tasks = await db.all(query, params);
      return {
        success: true,
        message: `${tasks.length} task${tasks.length !== 1 ? 's' : ''} found.`,
        data: tasks
      };
    }

    if (name === 'get_available_rewards') {
      const db = await getDb();
      const child = await db.get(
        'SELECT points_balance AS rpBalance, giftcard_points_balance AS gpBalance, parent_id AS parentId FROM child_profiles WHERE id = ?',
        [childId]
      );
      if (!child) return { success: false, message: 'Could not load your profile.', data: null };
      const rewards = await db.all(
        `SELECT id, title, points_cost AS pointsCost, points_type AS pointsType, quantity_limit AS quantityLimit
         FROM rewards WHERE parent_id = ? AND active = 1 ORDER BY points_cost ASC`,
        [child.parentId]
      );
      const enriched = rewards.map((r) => ({
        ...r,
        canAfford: r.pointsType === 'GP'
          ? Number(child.gpBalance || 0) >= r.pointsCost
          : Number(child.rpBalance || 0) >= r.pointsCost
      }));
      return {
        success: true,
        message: `${enriched.length} reward${enriched.length !== 1 ? 's' : ''} available.`,
        data: { rewards: enriched, rpBalance: child.rpBalance, gpBalance: child.gpBalance }
      };
    }

    if (name === 'get_my_achievements') {
      const db = await getDb();
      const rows = await db.all(
        `SELECT a.id, a.name, a.description, a.icon, a.threshold,
                ua.unlocked_at AS unlockedAt
         FROM achievements a
         LEFT JOIN child_achievements ua ON ua.achievement_id = a.id AND ua.child_id = ?
         ORDER BY ua.unlocked_at DESC NULLS LAST, a.id ASC`,
        [childId]
      );
      const unlocked = rows.filter((r) => r.unlockedAt);
      const locked   = rows.filter((r) => !r.unlockedAt);
      return {
        success: true,
        message: `${unlocked.length} achievement${unlocked.length !== 1 ? 's' : ''} unlocked, ${locked.length} to go!`,
        data: { unlocked, locked }
      };
    }

    if (name === 'get_leaderboard') {
      const db = await getDb();
      const child = await db.get('SELECT parent_id FROM child_profiles WHERE id = ?', [childId]);
      if (!child) return { success: false, message: 'Could not load leaderboard.', data: null };
      const siblings = await db.all(
        'SELECT id, name, points_balance AS rpBalance, current_streak_days AS streakDays FROM child_profiles WHERE parent_id = ? ORDER BY points_balance DESC',
        [child.parent_id]
      );
      const ranked = siblings.map((s, i) => ({ ...s, rank: i + 1, isMe: s.id === childId }));
      return {
        success: true,
        message: `Leaderboard loaded — ${ranked.length} player${ranked.length !== 1 ? 's' : ''}.`,
        data: ranked
      };
    }

    return { success: false, message: `Unknown tool: ${name}`, data: null };
  } catch (err) {
    return { success: false, message: err.message || 'Action failed.', data: null };
  }
}

/* ── Streaming chat function ──────────────────────────────────────────────── */
/**
 * Streams the child AI response via onEvent(event).
 * No DB persistence — child sessions are ephemeral per component mount.
 *
 * Event shapes (same as parent streamAiChat):
 *   { type: 'text',       delta: string }
 *   { type: 'tool_start', tool: string, label: string }
 *   { type: 'tool_done',  tool: string, success: boolean, message: string, data: any }
 *   { type: 'done',       assistantMessage: string }
 *   { type: 'error',      message: string }
 */
export async function streamChildAiChat(childId, history, userMessage, onEvent) {
  const client = getClient();

  const ctx          = await getChildContext(childId);
  const systemPrompt = buildChildSystemPrompt(ctx);

  const apiMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  let fullAssistantText = '';
  let currentMessages   = [...apiMessages];
  const MAX_TOOL_ROUNDS = 4;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = await client.messages.stream({
      model:      env.claudeModel,
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      CHILD_AI_TOOLS,
      messages:   currentMessages
    });

    stream.on('text', (delta) => {
      fullAssistantText += delta;
      onEvent({ type: 'text', delta });
    });

    const finalMsg = await stream.finalMessage();

    if (finalMsg.stop_reason === 'end_turn') break;

    if (finalMsg.stop_reason === 'tool_use') {
      const toolBlocks  = finalMsg.content.filter((b) => b.type === 'tool_use');
      const toolResults = [];

      for (const block of toolBlocks) {
        onEvent({ type: 'tool_start', tool: block.name, label: childToolLabel(block.name, block.input) });

        const result = await executeChildTool(childId, block.name, block.input);

        onEvent({
          type:    'tool_done',
          tool:    block.name,
          success: result.success,
          message: result.message,
          data:    result.success ? result.data : null,
          input:   block.input
        });

        toolResults.push({
          type:        'tool_result',
          tool_use_id: block.id,
          content:     JSON.stringify(result.data ?? { ok: result.success })
        });
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: finalMsg.content },
        { role: 'user',      content: toolResults }
      ];
    } else {
      break;
    }
  }

  onEvent({ type: 'done', assistantMessage: fullAssistantText });
}
