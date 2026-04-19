import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { env } from '../config/env.js';
import { createTask, approveTask, rejectTask } from './taskService.js';
import { createReward, fulfillRedemption, deleteReward } from './rewardService.js';
import { adjustPoints } from './pointsService.js';
import { getAllMemory, setMemory } from './aiMemoryService.js';
import { refreshFamilyContext } from './aiEventService.js';
import { createNotification } from './notificationService.js';

/* ── Anthropic client (lazy - initialised only when key is present) ── */
function getClient() {
  if (!env.anthropicApiKey) {
    return null; // Return null instead of throwing - calling code must handle this
  }
  return new Anthropic({ apiKey: env.anthropicApiKey });
}

const AI_UNAVAILABLE_MESSAGE = 'The AI assistant is currently unavailable. Please check back later or contact support.';

/* ── Tool definitions ───────────────────────────────────────────────── */
const AI_TOOLS = [
  {
    name: 'get_family_overview',
    description:
      'Fetch the current state of the parent\'s family: children (with ages, RP/GP balances), tasks by status, and active rewards. Call this whenever you need up-to-date data before acting.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'create_task',
    description:
      'Create a quest (task) for a specific child. The child earns RP when the parent approves their completed evidence. Points must be 5-50. Always call get_family_overview first to get the child\'s ID.',
    input_schema: {
      type: 'object',
      properties: {
        child_id:    { type: 'string',  description: 'The child profile ID from get_family_overview' },
        title:       { type: 'string',  description: 'Short quest title, max 80 characters' },
        description: { type: 'string',  description: 'What the child must do and what evidence (photo/video) to upload' },
        points:      { type: 'integer', description: 'RP reward amount, between 5 and 50' },
        due_days:    { type: 'integer', description: 'Days from today until the quest expires (1-7). Default 3.' }
      },
      required: ['child_id', 'title', 'description', 'points']
    }
  },
  {
    name: 'create_reward',
    description:
      'Create a reward item that children can redeem using their RP balance. The parent approves each redemption request.',
    input_schema: {
      type: 'object',
      properties: {
        title:          { type: 'string',  description: 'Reward name, max 50 characters' },
        points_cost:    { type: 'integer', description: 'RP cost for redemption (positive integer)' },
        quantity_limit: { type: 'integer', description: 'Max number of redemptions (omit for unlimited)' }
      },
      required: ['title', 'points_cost']
    }
  },
  {
    name: 'get_pending_approvals',
    description:
      'Fetch all task submissions currently awaiting parent approval. Returns task id, title, child name, RP points, evidence type, AI review verdict and score, and any note from the child. Always call this when the parent asks about pending items, approvals, or what needs their attention.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'approve_task',
    description:
      'Approve a task submission. The child immediately earns the RP reward. Optionally include a short congratulatory note.',
    input_schema: {
      type: 'object',
      properties: {
        task_id:    { type: 'string', description: 'The task ID to approve (from get_pending_approvals)' },
        parent_note: { type: 'string', description: 'Optional short note to the child (e.g. "Great job cleaning!")' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'reject_task',
    description:
      'Reject a task submission. You must provide a reason so the child knows how to improve. The child can dispute or resubmit.',
    input_schema: {
      type: 'object',
      properties: {
        task_id:    { type: 'string', description: 'The task ID to reject (from get_pending_approvals)' },
        parent_note: { type: 'string', description: 'Reason for rejection - shown to the child (required)' }
      },
      required: ['task_id', 'parent_note']
    }
  },
  {
    name: 'list_tasks',
    description:
      'List tasks for all children (or a specific child), optionally filtered by state. Use this when the parent asks to see tasks, check what tasks exist, or manage the task list. States: Active, PendingApproval, Approved, Rejected, Expired.',
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string', description: 'Filter to a specific child ID (optional - omit for all children)' },
        state:    { type: 'string', description: 'Filter by task state: Active, PendingApproval, Approved, Rejected, Expired (optional)' }
      },
      required: []
    }
  },
  {
    name: 'delete_task',
    description: 'Delete a task by its ID. Only use this when the parent explicitly wants to remove a task.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'The task ID to delete' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'get_gaming_settings',
    description: 'Get the current gaming settings: daily/weekly cap in minutes and the RP-to-minutes conversion rate.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'update_gaming_settings',
    description:
      'Update gaming time limits and conversion rate. All fields are optional - only provide the ones to change. daily_cap_minutes and weekly_cap_minutes are in minutes. points_unit and minutes_unit define conversion (e.g. 10 RP = 15 min).',
    input_schema: {
      type: 'object',
      properties: {
        daily_cap_minutes:  { type: 'integer', description: 'Max gaming minutes per day (e.g. 90)' },
        weekly_cap_minutes: { type: 'integer', description: 'Max gaming minutes per week (e.g. 420)' },
        points_unit:        { type: 'integer', description: 'RP amount in the conversion ratio (e.g. 10)' },
        minutes_unit:       { type: 'integer', description: 'Minutes earned per points_unit RP (e.g. 15)' }
      },
      required: []
    }
  },
  {
    name: 'add_game_to_blocklist',
    description: 'Block a game for ALL children in your family. Children will not be able to start sessions for this game. Platform is optional - defaults to "All".',
    input_schema: {
      type: 'object',
      properties: {
        game_name: { type: 'string', description: 'Game name to block (e.g. "Fortnite")' },
        platform:  { type: 'string', description: 'Platform (e.g. "PC", "Mobile", "Console"). Defaults to "All" if omitted.' }
      },
      required: ['game_name']
    }
  },
  {
    name: 'remove_game_from_blocklist',
    description: 'Unblock a previously blocked game for all children.',
    input_schema: {
      type: 'object',
      properties: {
        game_name: { type: 'string', description: 'Game name to unblock' },
        platform:  { type: 'string', description: 'Platform the game was blocked under. Defaults to "All".' }
      },
      required: ['game_name']
    }
  },
  {
    name: 'adjust_child_points',
    description:
      'Manually add or subtract RP for a child. Use positive numbers to add points (e.g. bonus for good behaviour), negative to deduct. Always provide a clear reason.',
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string', description: 'Child profile ID (from get_family_overview)' },
        points:   { type: 'integer', description: 'Points to add (positive) or subtract (negative). Cannot exceed ±500 per adjustment.' },
        reason:   { type: 'string', description: 'Reason for the adjustment - shown in the transaction history' }
      },
      required: ['child_id', 'points', 'reason']
    }
  },
  {
    name: 'list_pending_redemptions',
    description: 'List all reward redemptions that children have requested and are waiting for the parent to fulfill.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'fulfill_redemption',
    description: 'Mark a reward redemption as fulfilled (i.e. the parent has given the child the reward). This notifies the child.',
    input_schema: {
      type: 'object',
      properties: {
        redemption_id: { type: 'string', description: 'Redemption ID from list_pending_redemptions' }
      },
      required: ['redemption_id']
    }
  },
  {
    name: 'delete_reward',
    description: 'Delete a reward. Any pending redemptions will be automatically cancelled and points refunded to the children.',
    input_schema: {
      type: 'object',
      properties: {
        reward_id: { type: 'string', description: 'Reward ID to delete (from get_family_overview)' }
      },
      required: ['reward_id']
    }
  },
  {
    name: 'get_gaming_report',
    description: 'Get the weekly gaming usage report: which games each child played, how long, and how many sessions. Covers the current calendar week (Mon-Sun).',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'set_gaming_cap',
    description: 'Update a specific child\'s daily or weekly gaming time cap in minutes. Use this when the parent wants to set individual per-child caps (as opposed to family-wide caps via update_gaming_settings).',
    input_schema: {
      type: 'object',
      properties: {
        childId:            { type: 'string', description: 'The child\'s UUID (from get_family_overview)' },
        dailyCapMinutes:    { type: 'number', description: 'New daily gaming cap in minutes' },
        weeklyCapMinutes:   { type: 'number', description: 'New weekly gaming cap in minutes' }
      },
      required: ['childId']
    }
  },
  {
    name: 'send_child_message',
    description: 'Send a notification message directly to a child from the parent via AI. Use for encouragement, reminders, or quick communications. Keep messages concise and age-appropriate.',
    input_schema: {
      type: 'object',
      properties: {
        childId: { type: 'string', description: 'The child\'s UUID (from get_family_overview)' },
        message: { type: 'string', description: 'Message to send to the child (max 150 chars)' }
      },
      required: ['childId', 'message']
    }
  }
];

/* ── Family context builder ─────────────────────────────────────────── */
function calcAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export async function getFamilyContext(parentId) {
  const db = await getDb();

  const parent = await db.get(
    'SELECT id, name, email FROM parent_accounts WHERE id = ?',
    [parentId]
  );

  const children = await db.all(
    `SELECT id, name, date_of_birth, points_balance AS rpBalance, giftcard_points_balance AS gpBalance
     FROM child_profiles WHERE parent_id = ? ORDER BY created_at`,
    [parentId]
  );

  const taskRows = await db.all(
    `SELECT state, COUNT(*) AS count FROM tasks
     WHERE child_id IN (SELECT id FROM child_profiles WHERE parent_id = ?)
     GROUP BY state`,
    [parentId]
  );
  const taskCounts = Object.fromEntries(taskRows.map((r) => [r.state, r.count]));

  const rewards = await db.all(
    `SELECT id, title, points_cost AS pointsCost, points_type AS pointsType
     FROM rewards WHERE parent_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 8`,
    [parentId]
  );

  const msgRow = await db.get(
    'SELECT COUNT(*) AS count FROM ai_messages WHERE parent_id = ?',
    [parentId]
  );

  return {
    parent,
    children: children.map((c) => ({ ...c, age: calcAge(c.date_of_birth) })),
    taskCounts,
    rewards,
    isFirstTime: msgRow.count === 0
  };
}

/* ── System prompt ──────────────────────────────────────────────────── */
function buildSystemPrompt({ parent, children, taskCounts, rewards, isFirstTime, memoryBlock = '' }) {
  const childrenText =
    children.length === 0
      ? 'No children added yet.'
      : children
          .map((c) => `  • ${c.name} (age ${c.age}) - ${c.rpBalance} RP, ${c.gpBalance} GP  [id: ${c.id}]`)
          .join('\n');

  const pendingApproval = taskCounts.PendingApproval || 0;
  const activeTasks     = taskCounts.Active || 0;
  const approvedTasks   = taskCounts.Approved || 0;

  const rewardsText =
    rewards.length === 0
      ? 'No rewards set up yet.'
      : rewards.map((r) => `  • ${r.title} - ${r.pointsCost} ${r.pointsType}`).join('\n');

  const onboardingBlock = isFirstTime
    ? `
## This is a NEW parent - Onboarding Mode
${parent.name} has just created their account. Begin with:
"Hi ${parent.name}! I'm your Gametime AI - here to help you set up your family and get the most out of the app. Let's start simple: how many children will be using Gametime, and what are their names?"

Walk them through step by step (one question at a time):
1. How many kids, names, and rough ages
2. Typical household tasks/chores you'd assign
3. What motivates them as rewards (treats, screen time, gift cards, etc.)
4. Preferred gaming time limits per day
5. Use your tools to create tasks and rewards as they describe them

Keep it warm, conversational, and practical. Don't overwhelm them.`
    : `
## Returning Parent
${parent.name} is an existing user. Be a helpful, proactive assistant - answer questions, suggest quest ideas based on children's ages, help diagnose issues (e.g. why a child can't log in), suggest reward optimisations, and explain features clearly.`;

  return `You are Gametime AI - the built-in intelligent assistant for Gametime, a family gaming management platform.

## What Gametime Does
- Parents create "quests" (tasks) for children worth 5-50 RP (Reward Points)
- Children complete quests, upload photo/video evidence, and earn RP after parent approval
- RP is spent on "rewards" the parent configures (screen time, treats, gift cards, etc.)
- GP (Gift-Card Points) are a separate currency for real gift-card redemption
- Gaming time is managed via daily/weekly RP-to-minutes conversion with parent-set caps

## Live Family Data
Parent: ${parent.name} (${parent.email})

Children:
${childrenText}

Tasks: ${activeTasks} active, ${pendingApproval} awaiting your approval, ${approvedTasks} approved total

Active Rewards:
${rewardsText}

## Your Tools
You can do EVERYTHING through this chat. Here's what each tool does:

**Family & Overview**
- get_family_overview - Refresh live data: children, balances, task counts, rewards. Call before create_task to get child IDs.
- get_pending_approvals - All task submissions waiting for approval with AI verdict and evidence info.

**Task Management**
- create_task - Create a quest for a specific child (need child_id from get_family_overview first)
- list_tasks - See all tasks, filtered by child or state (Active/PendingApproval/Approved/Rejected/Expired)
- delete_task - Delete a task permanently
- approve_task - Approve a submission. Child earns RP immediately. Add a note optionally.
- reject_task - Reject with a reason. Child can resubmit or dispute.

**Rewards & Redemptions**
- create_reward - Create a reward item children can redeem with RP
- delete_reward - Remove a reward (auto-refunds pending redemptions)
- list_pending_redemptions - See reward redemptions waiting for you to fulfill
- fulfill_redemption - Mark a redemption as delivered (notifies child)

**Points**
- adjust_child_points - Manually add or subtract RP for any child (bonus, deduction, correction)

**Gaming**
- get_gaming_settings - See current time caps and RP conversion rate
- update_gaming_settings - Change family-wide daily/weekly caps or RP-to-minutes conversion
- set_gaming_cap - Set individual daily/weekly gaming caps for a specific child
- add_game_to_blocklist - Block a specific game for a child
- remove_game_from_blocklist - Unblock a game
- get_gaming_report - Weekly gaming usage: which games, how long, by child

**Direct Communication**
- send_child_message - Send a notification/message directly to a child (max 150 chars)

## Proactive Behaviour
If there are pending approvals (shown in Live Family Data above), open the conversation by acknowledging them. Example: "You have 2 tasks waiting for your review. Want me to pull them up?" Then call get_pending_approvals when they say yes - or proactively if it's the start of a session with pending items.

## Hard Limits
- You CANNOT create children - child accounts require email verification and age-specific PIN/password setup. Always tell the parent to add children via the **Family** section in the dashboard sidebar, then come back to chat.
- Task points must be 5-50 RP. Due date is always within 7 days.
- Never make up child IDs - always call get_family_overview first.
- When approving/rejecting, always call get_pending_approvals first if you don't already have the task IDs.

## Tone & Style
Warm, smart, and concise - like a knowledgeable family coach who knows the app inside out. Use ${parent.name}'s first name naturally. Ask one question at a time. When you take an action, confirm it clearly and briefly. Never be robotic or use corporate language.

## Formatting - Critical
Write in plain text only. Never use markdown. No # headers, no **bold**, no *italics*, no --- dividers, no hyphen or asterisk bullet lists. If you need to list things, use plain numbered lines like "1. ... 2. ... 3. ..." or just natural prose. Responses should read like a friendly chat message, not a formatted document.
NEVER use em dashes (-) or en dashes (-) in any response. Use commas, colons, or rewrite the sentence instead.
${onboardingBlock}${memoryBlock ? `\n\n${memoryBlock}` : ''}`;
}

/* ── Tool labels (shown in the UI while executing) ──────────────────── */
function toolLabel(name, input) {
  if (name === 'get_family_overview')   return 'Fetching family data…';
  if (name === 'get_pending_approvals') return 'Fetching pending approvals…';
  if (name === 'approve_task')              return 'Approving task…';
  if (name === 'reject_task')               return 'Rejecting task…';
  if (name === 'create_task')               return `Creating quest "${input.title || '…'}"`;
  if (name === 'create_reward')             return `Creating reward "${input.title || '…'}"`;
  if (name === 'list_tasks')                return 'Fetching task list…';
  if (name === 'delete_task')               return 'Deleting task…';
  if (name === 'get_gaming_settings')       return 'Fetching gaming settings…';
  if (name === 'update_gaming_settings')    return 'Updating gaming settings…';
  if (name === 'add_game_to_blocklist')      return `Blocking ${input.game_name || 'game'}…`;
  if (name === 'remove_game_from_blocklist') return `Unblocking ${input.game_name || 'game'}…`;
  if (name === 'adjust_child_points')       return `Adjusting points for child…`;
  if (name === 'list_pending_redemptions')  return 'Fetching pending redemptions…';
  if (name === 'fulfill_redemption')        return 'Fulfilling redemption…';
  if (name === 'delete_reward')             return 'Deleting reward…';
  if (name === 'get_gaming_report')         return 'Generating gaming report…';
  if (name === 'set_gaming_cap')            return 'Updating gaming cap…';
  if (name === 'send_child_message')        return 'Sending message to child…';
  return `Running ${name}…`;
}

/* ── Tool executor ──────────────────────────────────────────────────── */
async function executeTool(parentId, name, input) {
  try {
    if (name === 'get_family_overview') {
      const ctx = await getFamilyContext(parentId);
      return {
        success: true,
        message: `Retrieved ${ctx.children.length} children, ${Object.values(ctx.taskCounts).reduce((a, b) => a + b, 0)} tasks, ${ctx.rewards.length} rewards.`,
        data: ctx
      };
    }

    if (name === 'create_task') {
      const dueDays = Math.max(1, Math.min(7, Number(input.due_days) || 3));
      const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString();
      const points  = Math.max(5, Math.min(50, Number(input.points) || 10));

      const task = await createTask(parentId, {
        childId:     input.child_id,
        title:       input.title,
        description: input.description,
        points,
        gpPoints:    0,
        dueDate
      });

      return {
        success: true,
        message: `Quest "${input.title}" created - ${points} RP, due in ${dueDays} day${dueDays > 1 ? 's' : ''}.`,
        data: task
      };
    }

    if (name === 'create_reward') {
      const reward = await createReward(parentId, {
        title:         input.title,
        pointsCost:    input.points_cost,
        pointsType:    'RP',
        quantityLimit: input.quantity_limit ?? null,
        active:        true
      });

      return {
        success: true,
        message: `Reward "${input.title}" created - ${input.points_cost} RP to redeem.`,
        data: reward
      };
    }

    if (name === 'get_pending_approvals') {
      const db = await getDb();
      const rows = await db.all(
        `SELECT t.id, t.title, t.points, t.state,
                tc.evidence_note, tc.evidence_type, tc.evidence_mime,
                tc.ai_review_verdict, tc.ai_review_score, tc.ai_review_summary,
                tc.submitted_at,
                cp.name AS childName
         FROM tasks t
         JOIN task_completions tc ON tc.task_id = t.id
         JOIN child_profiles cp ON cp.id = t.child_id
         WHERE cp.parent_id = ? AND t.state = 'PendingApproval'
         ORDER BY tc.submitted_at DESC`,
        [parentId]
      );
      return {
        success: true,
        message: `${rows.length} task${rows.length !== 1 ? 's' : ''} awaiting approval.`,
        data: rows
      };
    }

    if (name === 'approve_task') {
      await approveTask(parentId, { taskId: input.task_id, parentNote: input.parent_note || null });
      return {
        success: true,
        message: `Task approved.`,
        data: { taskId: input.task_id }
      };
    }

    if (name === 'reject_task') {
      await rejectTask(parentId, { taskId: input.task_id, parentNote: input.parent_note });
      return {
        success: true,
        message: `Task rejected.`,
        data: { taskId: input.task_id }
      };
    }

    if (name === 'list_tasks') {
      const db = await getDb();
      let query = `SELECT t.id, t.title, t.description, t.points, t.state, t.due_date AS dueDate,
                          cp.name AS childName, cp.id AS childId
                   FROM tasks t
                   JOIN child_profiles cp ON cp.id = t.child_id
                   WHERE cp.parent_id = ?`;
      const params = [parentId];
      if (input.child_id) { query += ' AND t.child_id = ?'; params.push(input.child_id); }
      if (input.state)    { query += ' AND t.state = ?';    params.push(input.state); }
      query += ' ORDER BY t.created_at DESC LIMIT 20';
      const rows = await db.all(query, params);
      return {
        success: true,
        message: `${rows.length} task${rows.length !== 1 ? 's' : ''} found.`,
        data: rows
      };
    }

    if (name === 'delete_task') {
      const db = await getDb();
      const task = await db.get(
        `SELECT t.id FROM tasks t JOIN child_profiles cp ON cp.id = t.child_id
         WHERE t.id = ? AND cp.parent_id = ?`,
        [input.task_id, parentId]
      );
      if (!task) return { success: false, message: 'Task not found or does not belong to your family.', data: null };
      await db.run('DELETE FROM tasks WHERE id = ?', [input.task_id]);
      return { success: true, message: 'Task deleted.', data: { taskId: input.task_id } };
    }

    if (name === 'get_gaming_settings') {
      const db = await getDb();
      const settings = await db.get(
        `SELECT points_unit AS pointsUnit, minutes_unit AS minutesUnit,
                daily_cap_minutes AS dailyCapMinutes, weekly_cap_minutes AS weeklyCapMinutes
         FROM gaming_settings WHERE parent_id = ?`,
        [parentId]
      );
      if (!settings) {
        return {
          success: true,
          message: 'No gaming settings configured yet - defaults will apply.',
          data: { pointsUnit: 10, minutesUnit: 15, dailyCapMinutes: 90, weeklyCapMinutes: 420 }
        };
      }
      return { success: true, message: 'Gaming settings loaded.', data: settings };
    }

    if (name === 'update_gaming_settings') {
      const db = await getDb();
      const existing = await db.get('SELECT * FROM gaming_settings WHERE parent_id = ?', [parentId]);
      const now = new Date().toISOString();
      if (existing) {
        const fields = [];
        const vals   = [];
        if (input.daily_cap_minutes  != null) { fields.push('daily_cap_minutes = ?');  vals.push(input.daily_cap_minutes); }
        if (input.weekly_cap_minutes != null) { fields.push('weekly_cap_minutes = ?'); vals.push(input.weekly_cap_minutes); }
        if (input.points_unit        != null) { fields.push('points_unit = ?');        vals.push(input.points_unit); }
        if (input.minutes_unit       != null) { fields.push('minutes_unit = ?');       vals.push(input.minutes_unit); }
        if (fields.length === 0) return { success: false, message: 'No settings provided to update.', data: null };
        fields.push('updated_at = ?'); vals.push(now); vals.push(parentId);
        await db.run(`UPDATE gaming_settings SET ${fields.join(', ')} WHERE parent_id = ?`, vals);
      } else {
        await db.run(
          `INSERT INTO gaming_settings (parent_id, points_unit, minutes_unit, daily_cap_minutes, weekly_cap_minutes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            parentId,
            input.points_unit        ?? 10,
            input.minutes_unit       ?? 15,
            input.daily_cap_minutes  ?? 90,
            input.weekly_cap_minutes ?? 420,
            now, now
          ]
        );
      }
      return { success: true, message: 'Gaming settings updated.', data: null };
    }

    if (name === 'add_game_to_blocklist') {
      const db  = await getDb();
      const now = new Date().toISOString();
      const gameName = String(input.game_name).trim();
      const platform = String(input.platform || 'All').trim();

      const existing = await db.get(
        'SELECT id FROM gaming_games WHERE parent_id = ? AND LOWER(name) = LOWER(?) AND LOWER(platform) = LOWER(?)',
        [parentId, gameName, platform]
      );
      if (existing) {
        await db.run(
          'UPDATE gaming_games SET status = ?, updated_at = ? WHERE id = ?',
          ['Blocked', now, existing.id]
        );
      } else {
        await db.run(
          `INSERT INTO gaming_games (id, parent_id, name, platform, status, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Blocked', 'manual', ?, ?)`,
          [uuidv4(), parentId, gameName, platform, now, now]
        );
      }
      return { success: true, message: `${gameName} blocked for all children.`, data: null };
    }

    if (name === 'remove_game_from_blocklist') {
      const db       = await getDb();
      const gameName = String(input.game_name).trim();
      const platform = String(input.platform || 'All').trim();
      await db.run(
        `UPDATE gaming_games SET status = 'Allowed', updated_at = ?
         WHERE parent_id = ? AND LOWER(name) = LOWER(?) AND LOWER(platform) = LOWER(?)`,
        [new Date().toISOString(), parentId, gameName, platform]
      );
      return { success: true, message: `${gameName} unblocked.`, data: null };
    }

    if (name === 'adjust_child_points') {
      const db = await getDb();
      const child = await db.get(
        'SELECT id FROM child_profiles WHERE id = ? AND parent_id = ?',
        [input.child_id, parentId]
      );
      if (!child) return { success: false, message: 'Child not found.', data: null };
      const points = Math.max(-500, Math.min(500, Number(input.points)));
      const newBalance = await adjustPoints({
        childId:       input.child_id,
        points,
        type:          points > 0 ? 'Credit' : 'Debit',
        referenceType: 'ManualAdjustment',
        referenceId:   null
      });
      return {
        success: true,
        message: `${points > 0 ? '+' : ''}${points} RP applied. New balance: ${newBalance} RP.`,
        data:    { newBalance, points }
      };
    }

    if (name === 'list_pending_redemptions') {
      const db = await getDb();
      const rows = await db.all(
        `SELECT rd.id, rd.points_spent AS pointsSpent, rd.points_type AS pointsType,
                rd.redeemed_at AS redeemedAt, rw.title AS rewardTitle, cp.name AS childName
         FROM redemptions rd
         JOIN rewards rw ON rw.id = rd.reward_id
         JOIN child_profiles cp ON cp.id = rd.child_id
         WHERE rw.parent_id = ? AND rd.status = 'Pending'
         ORDER BY rd.redeemed_at DESC`,
        [parentId]
      );
      return {
        success: true,
        message: `${rows.length} pending redemption${rows.length !== 1 ? 's' : ''}.`,
        data: rows
      };
    }

    if (name === 'fulfill_redemption') {
      const result = await fulfillRedemption(parentId, input.redemption_id);
      if (result.ignored) return { success: true, message: 'Redemption was already resolved.', data: result };
      return { success: true, message: 'Redemption marked as fulfilled. Child has been notified.', data: result };
    }

    if (name === 'delete_reward') {
      const result = await deleteReward(parentId, input.reward_id);
      return {
        success: true,
        message: `Reward deleted.${result.refundedCount > 0 ? ` ${result.refundedCount} pending redemption(s) cancelled and points refunded.` : ''}`,
        data: result
      };
    }

    if (name === 'get_gaming_report') {
      const db = await getDb();
      const now = new Date();
      const weekStart = new Date(now);
      const day = (weekStart.getUTCDay() + 6) % 7;
      weekStart.setUTCDate(weekStart.getUTCDate() - day);
      weekStart.setUTCHours(0, 0, 0, 0);

      const rows = await db.all(
        `SELECT cp.name AS childName, gs.game_name AS gameName,
                SUM(gs.duration_minutes) AS totalMinutes, COUNT(*) AS sessionCount
         FROM gaming_sessions gs
         JOIN child_profiles cp ON cp.id = gs.child_id
         WHERE cp.parent_id = ? AND gs.started_at >= ? AND gs.status = 'Completed'
         GROUP BY cp.id, cp.name, gs.game_name
         ORDER BY totalMinutes DESC`,
        [parentId, weekStart.toISOString()]
      );

      const totalMinutes = rows.reduce((s, r) => s + r.totalMinutes, 0);
      return {
        success: true,
        message: `Gaming report: ${rows.length} game${rows.length !== 1 ? 's' : ''} played this week, ${totalMinutes} total minutes.`,
        data: { weekStart: weekStart.toISOString(), rows, totalMinutes }
      };
    }

    if (name === 'set_gaming_cap') {
      const db = await getDb();
      // Verify child belongs to this parent
      const child = await db.get(
        'SELECT id, name FROM child_profiles WHERE id = ? AND parent_id = ?',
        [input.childId, parentId]
      );
      if (!child) return { success: false, message: 'Child not found.', data: null };

      if (input.dailyCapMinutes == null && input.weeklyCapMinutes == null) {
        return { success: false, message: 'Provide dailyCapMinutes or weeklyCapMinutes (or both).', data: null };
      }

      // Update the family-wide gaming settings (schema is family-level, not per-child)
      const now      = new Date().toISOString();
      const existing = await db.get('SELECT * FROM gaming_settings WHERE parent_id = ?', [parentId]);
      if (existing) {
        const fields = [];
        const vals   = [];
        if (input.dailyCapMinutes  != null) { fields.push('daily_cap_minutes = ?');  vals.push(input.dailyCapMinutes); }
        if (input.weeklyCapMinutes != null) { fields.push('weekly_cap_minutes = ?'); vals.push(input.weeklyCapMinutes); }
        fields.push('updated_at = ?');
        vals.push(now, parentId);
        await db.run(`UPDATE gaming_settings SET ${fields.join(', ')} WHERE parent_id = ?`, vals);
      } else {
        await db.run(
          `INSERT INTO gaming_settings (parent_id, points_unit, minutes_unit, daily_cap_minutes, weekly_cap_minutes, created_at, updated_at)
           VALUES (?, 10, 15, ?, ?, ?, ?)`,
          [parentId, input.dailyCapMinutes ?? 90, input.weeklyCapMinutes ?? 420, now, now]
        );
      }

      // Store child-specific note in memory for context
      await setMemory(
        parentId,
        `cap_${child.name}`,
        `daily=${input.dailyCapMinutes ?? 'unchanged'} weekly=${input.weeklyCapMinutes ?? 'unchanged'}`
      );
      return {
        success: true,
        message: `Gaming cap updated for ${child.name}.`,
        data: { childId: input.childId, dailyCapMinutes: input.dailyCapMinutes, weeklyCapMinutes: input.weeklyCapMinutes }
      };
    }

    if (name === 'send_child_message') {
      const db = await getDb();
      const child = await db.get(
        'SELECT id, name FROM child_profiles WHERE id = ? AND parent_id = ?',
        [input.childId, parentId]
      );
      if (!child) return { success: false, message: 'Child not found.', data: null };
      const message = String(input.message || '').slice(0, 150);
      await createNotification('Child', input.childId, message, 'parent_message');
      return { success: true, message: `Message sent to ${child.name}.`, data: null };
    }

    return { success: false, message: `Unknown tool: ${name}`, data: null };
  } catch (err) {
    return { success: false, message: err.message || 'Action failed.', data: null };
  }
}

/* ── Family briefing ────────────────────────────────────────────────── */
/**
 * Generate a morning briefing for a parent:
 * - Refreshes family context in memory
 * - Asks Claude to produce a short 2-3 sentence summary
 * - Returns { briefing, stats, actions }
 */
export async function generateFamilyBriefing(parentId) {
  const client = getClient();
  const db     = await getDb();

  await refreshFamilyContext(parentId, db);
  const memory = await getAllMemory(parentId);

  // Stats
  const pendingRow = await db.get(
    `SELECT COUNT(*) AS count FROM tasks t
     JOIN child_profiles cp ON cp.id = t.child_id
     WHERE cp.parent_id = ? AND t.state = 'PendingApproval'`,
    [parentId]
  );
  const pendingApprovals = pendingRow?.count ?? 0;

  const streakRiskNames = (memory.streak_at_risk && memory.streak_at_risk !== 'none')
    ? memory.streak_at_risk.split(', ').filter(Boolean)
    : [];

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMon);
  weekStart.setHours(0, 0, 0, 0);
  const weeklyRow = await db.get(
    `SELECT COALESCE(SUM(t.points), 0) AS rp
     FROM task_completions tc
     JOIN tasks t ON t.id = tc.task_id
     JOIN child_profiles cp ON cp.id = tc.child_id
     WHERE cp.parent_id = ? AND tc.status = 'Approved' AND tc.completed_at >= ?`,
    [parentId, weekStart.toISOString()]
  );
  const weeklyRp = weeklyRow?.rp ?? 0;

  // Build a quick context string for Claude
  const memoryLines = Object.entries(memory)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const prompt = `You are Gametime AI giving a concise morning briefing to a parent.

Family context:
${memoryLines || '(no context yet)'}

Pending approvals: ${pendingApprovals}
Children with streak at risk today: ${streakRiskNames.join(', ') || 'none'}
RP earned this week: ${weeklyRp}

Write a 2-3 sentence friendly morning briefing in plain English. Mention anything urgent first (pending approvals, streak risk). Keep it warm and practical. No lists. No markdown.`;

  const response = await client.messages.create({
    model:      env.claudeModel,
    max_tokens: 200,
    messages:   [{ role: 'user', content: prompt }]
  });

  const briefing = response.content?.[0]?.text?.trim() ?? 'Good morning! Everything looks good today.';

  // Suggest actions
  const actions = [];
  if (pendingApprovals > 0) {
    actions.push({ label: `Review ${pendingApprovals} pending approval${pendingApprovals > 1 ? 's' : ''}`, endpoint: '/tasks/list?state=PendingApproval', method: 'GET' });
  }
  if (streakRiskNames.length > 0) {
    actions.push({ label: 'Message child about streak', endpoint: '/ai/chat', method: 'POST' });
  }

  return {
    briefing,
    stats: { pendingApprovals, streakRisk: streakRiskNames, weeklyRp },
    actions
  };
}

/* ── Evidence coaching preview ──────────────────────────────────────── */
/**
 * Give a child quick AI coaching on their evidence before they submit.
 * Returns { coaching: string, recommendation: 'submit' | 'retake' }
 */
export async function previewEvidence({ childId, taskId, evidenceData, evidenceMime }) {
  const client = getClient();
  const db     = await getDb();

  const task = await db.get(
    `SELECT t.title, t.description, cp.name AS childName
     FROM tasks t JOIN child_profiles cp ON cp.id = t.child_id
     WHERE t.id = ? AND t.child_id = ?`,
    [taskId, childId]
  );

  if (!task) {
    return { coaching: "I couldn't find that task. Please try again.", recommendation: 'retake' };
  }

  const isImage = evidenceMime?.startsWith('image/');
  let content;

  if (isImage && evidenceData) {
    // Strip data URL prefix if present
    const base64 = evidenceData.includes(',') ? evidenceData.split(',')[1] : evidenceData;
    content = [
      {
        type: 'image',
        source: { type: 'base64', media_type: evidenceMime, data: base64 }
      },
      {
        type: 'text',
        text: `Task: "${task.title}"\nDescription: ${task.description}\n\nLook at this photo evidence from ${task.childName}. In 1-2 short sentences, give friendly coaching: does it clearly show the task is done? Say "submit" if it looks good or "retake" if they should try again. Start your reply with either "✅ Looks good!" or "📸 Try again -".`
      }
    ];
  } else {
    // Video or non-image - text-only coaching based on mime type
    content = `Task: "${task.title}"\nDescription: ${task.description}\nEvidence type: ${evidenceMime || 'unknown'}\n\nGive brief friendly advice (1-2 sentences) on whether this evidence type is likely to convince a parent. Start with "✅ Looks good!" or "📸 Try again -".`;
  }

  const response = await client.messages.create({
    model:      env.claudeModel,
    max_tokens: 150,
    messages:   [{ role: 'user', content }]
  });

  const coaching = response.content?.[0]?.text?.trim() ?? '✅ Looks good! Go ahead and submit.';
  const recommendation = coaching.startsWith('✅') ? 'submit' : 'retake';

  return { coaching, recommendation };
}

/* ── DB helpers ─────────────────────────────────────────────────────── */
export async function saveAiMessage(parentId, role, content) {
  const db = await getDb();
  await db.run(
    'INSERT INTO ai_messages (id, parent_id, role, content) VALUES (?, ?, ?, ?)',
    [uuidv4(), parentId, role, content]
  );
}

export async function getAiHistory(parentId, limit = 60) {
  const db = await getDb();
  return db.all(
    `SELECT role, content, created_at AS createdAt
     FROM ai_messages WHERE parent_id = ?
     ORDER BY created_at ASC LIMIT ?`,
    [parentId, limit]
  );
}

export async function clearAiHistory(parentId) {
  const db = await getDb();
  await db.run('DELETE FROM ai_messages WHERE parent_id = ?', [parentId]);
}

/* ── Signup intake: tools & system prompt ──────────────────────────── */
const SIGNUP_TOOLS = [
  {
    name: 'finalize_signup',
    description:
      'Call this immediately once all 6 answers are collected. ' +
      'Triggers the account-creation step on the frontend.',
    input_schema: {
      type: 'object',
      properties: {
        name:             { type: 'string',  description: "Parent's full name" },
        email:            { type: 'string',  description: "Parent's email address" },
        country:          { type: 'string',  description: 'Country or region the parent is in' },
        children: {
          type: 'array',
          description: 'Children who will use Gametime, with name and approximate age',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age:  { type: 'integer' }
            },
            required: ['name']
          }
        },
        primary_concern:  { type: 'string',  description: "Parent's primary concern about their kids' gaming (e.g. screen time, content, spending, social)" },
        referral_source:  { type: 'string',  description: 'How the parent heard about Gametime' }
      },
      required: ['name', 'email']
    }
  }
];

const SIGNUP_SYSTEM_PROMPT = `You are the Gametime setup assistant. Collect 6 answers from this new parent, one question at a time, then call finalize_signup.

## Tone
Direct and efficient. No filler words ("Great!", "Wonderful!", "Sure thing!"). Acknowledge each answer briefly (one phrase at most) then immediately ask the next question. Keep every message under 50 words.

## Question Sequence - ask EXACTLY ONE question per message

Q1: "Welcome to Gametime! I'll get your account ready with 6 quick questions.

What is your full name?"

Q2: "What is your email address?"

Q3: "Which country or region are you in?"

Q4: "How many children will use Gametime? Please share their names and rough ages."

Q5: "What is your biggest concern about your kids' gaming? Pick the closest:
A) Too much screen time
B) Inappropriate game content
C) In-app purchases or spending
D) Online social interactions"

Q6: "Last one: how did you hear about Gametime?
A) Social media
B) Friend or family recommendation
C) App store or search
D) Blog, podcast, or article
E) Other"

## After all 6 answers
Call finalize_signup immediately with all collected data. Then say exactly:
"All set! Create your password below to finish."

## Rules
- Ask ONLY ONE question per message, no exceptions
- Never combine two questions in one turn
- Never invent or assume data - wait for each answer
- If an answer is ambiguous, ask once for clarification then move on
- Do NOT introduce yourself, explain Gametime, or add any preamble beyond Q1's welcome line`;

/**
 * Streams an initial signup greeting from Claude (no history).
 * The 'Hi' trigger is never shown in the UI - only Claude's reply is.
 */
export async function streamSignupGreeting(onEvent) {
  const client = getClient();

  const stream = await client.messages.stream({
    model:      env.claudeModel,
    max_tokens: 450,
    system:     SIGNUP_SYSTEM_PROMPT,
    tools:      SIGNUP_TOOLS,
    messages:   [{ role: 'user', content: 'Hi' }]
  });

  let fullText = '';
  stream.on('text', (delta) => {
    fullText += delta;
    onEvent({ type: 'text', delta });
  });

  await stream.finalMessage();
  onEvent({ type: 'done', assistantMessage: fullText });
}

/**
 * Streams a signup chat turn. History may start with an assistant message
 * (the greeting) - we silently prepend the 'Hi' trigger to satisfy Anthropic's
 * alternating user/assistant requirement.
 */
export async function streamSignupChat(history, userMessage, onEvent) {
  const client = getClient();

  // Build Anthropic messages: if history starts with assistant (greeting), prepend trigger
  let apiMessages = history.map((m) => ({ role: m.role, content: m.content }));
  if (apiMessages.length > 0 && apiMessages[0].role === 'assistant') {
    apiMessages = [{ role: 'user', content: 'Hi' }, ...apiMessages];
  }
  apiMessages.push({ role: 'user', content: userMessage });

  let fullAssistantText = '';
  let currentMessages   = [...apiMessages];

  for (let round = 0; round < 4; round++) {
    const stream = await client.messages.stream({
      model:      env.claudeModel,
      max_tokens: 600,
      system:     SIGNUP_SYSTEM_PROMPT,
      tools:      SIGNUP_TOOLS,
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
        if (block.name === 'finalize_signup') {
          onEvent({ type: 'finalize', data: block.input });
          toolResults.push({
            type:        'tool_result',
            tool_use_id: block.id,
            content:     JSON.stringify({ ok: true, message: 'Account creation triggered on the frontend.' })
          });
        }
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

/* ── Onboarding greeting (called once for brand-new parents) ─────────── */
/**
 * Generates and persists a warm onboarding greeting for a first-time parent.
 * The 'Hi' trigger message is NOT saved - only the assistant reply is stored,
 * so the chat starts with the AI speaking first (no awkward blank user message).
 * Returns the greeting text, or null if the parent already has chat history.
 */
/**
 * @param {string} parentId
 * @param {object|null} signupContext - optional context collected during the AI signup chat
 *   (children, games, tasks, rewards, dailyLimitMinutes). When present the greeting
 *   references it directly and offers to start creating content immediately.
 */
export async function greetNewParent(parentId, signupContext = null) {
  const client = getClient();
  const ctx    = await getFamilyContext(parentId);

  // Only greet if this is truly a first-time parent (no prior messages)
  if (!ctx.isFirstTime) return null;

  const memory = await getAllMemory(parentId);
  const memoryEntries = Object.entries(memory);
  const memoryBlock = memoryEntries.length > 0
    ? `## Family Context\n${memoryEntries.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : '';

  const systemPrompt = buildSystemPrompt({ ...ctx, memoryBlock });

  // If the parent came through the AI signup flow, inject the context they shared
  // so we don't repeat questions they've already answered.
  const triggerContent = signupContext
    ? `Hi! I just finished the signup chat. Here's what I shared during setup: ${JSON.stringify(signupContext)}. ` +
      'Please reference this info in your greeting so I know you remember it, and offer to create some initial quests and rewards based on what I described.'
    : 'Hi';

  const response = await client.messages.create({
    model:      env.claudeModel,
    max_tokens: 700,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: triggerContent }]
  });

  const greeting = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  if (greeting) {
    await saveAiMessage(parentId, 'assistant', greeting);
  }

  return greeting || null;
}

/* ── Main streaming chat function ───────────────────────────────────── */
/**
 * Streams the AI response back to the caller via onEvent(event).
 *
 * Event shapes:
 *   { type: 'text',       delta: string }
 *   { type: 'tool_start', tool: string, label: string }
 *   { type: 'tool_done',  tool: string, success: boolean, message: string }
 *   { type: 'done',       assistantMessage: string }
 *   { type: 'error',      message: string }
 */
export async function streamAiChat(parentId, history, userMessage, onEvent) {
  const client = getClient();
  const db     = await getDb();

  // Refresh family context in memory before building the system prompt
  await refreshFamilyContext(parentId, db);
  const memory = await getAllMemory(parentId);
  const memoryEntries = Object.entries(memory);
  const memoryBlock = memoryEntries.length > 0
    ? `## Family Context\n${memoryEntries.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : '';

  const ctx          = await getFamilyContext(parentId);
  const systemPrompt = buildSystemPrompt({ ...ctx, memoryBlock });

  // Build the Anthropic messages array from saved history + new user message
  const apiMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  let fullAssistantText = '';
  let currentMessages   = [...apiMessages];
  const MAX_TOOL_ROUNDS = 6; // safety limit on tool-call loops
  const toolsCalledThisTurn = new Set();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Start a streaming request
    const stream = await client.messages.stream({
      model:      env.claudeModel,
      max_tokens: 2048,
      system:     systemPrompt,
      tools:      AI_TOOLS,
      messages:   currentMessages
    });

    // Stream text deltas as they arrive
    stream.on('text', (delta) => {
      fullAssistantText += delta;
      onEvent({ type: 'text', delta });
    });

    // Wait for the full response (needed to inspect tool_use blocks)
    const finalMsg = await stream.finalMessage();

    if (finalMsg.stop_reason === 'end_turn') {
      break; // normal completion
    }

    if (finalMsg.stop_reason === 'tool_use') {
      const toolBlocks  = finalMsg.content.filter((b) => b.type === 'tool_use');
      const toolResults = [];

      for (const block of toolBlocks) {
        toolsCalledThisTurn.add(block.name);
        onEvent({ type: 'tool_start', tool: block.name, label: toolLabel(block.name, block.input) });

        const result = await executeTool(parentId, block.name, block.input);

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

      // Append assistant turn + tool results, then loop for the follow-up
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: finalMsg.content },
        { role: 'user',      content: toolResults }
      ];
    } else {
      break; // max_tokens or other stop reason
    }
  }

  // Build action hints based on which tools were called this turn
  const actions = buildStreamingActions(toolsCalledThisTurn);

  onEvent({ type: 'done', assistantMessage: fullAssistantText });
  if (actions.length > 0) {
    onEvent({ type: 'actions', actions });
  }
}

/* ── Streaming action hints ──────────────────────────────────────────── */
function buildStreamingActions(toolsCalledSet) {
  const actions = [];
  if (toolsCalledSet.has('get_pending_approvals') || toolsCalledSet.has('approve_task') || toolsCalledSet.has('reject_task')) {
    actions.push({ label: 'Review approvals', endpoint: '/tasks/list?state=PendingApproval', method: 'GET' });
  }
  if (toolsCalledSet.has('create_task')) {
    actions.push({ label: 'View tasks', endpoint: '/tasks/list', method: 'GET' });
  }
  if (toolsCalledSet.has('adjust_child_points')) {
    actions.push({ label: 'View points history', endpoint: '/points/history', method: 'GET' });
  }
  if (toolsCalledSet.has('create_reward')) {
    actions.push({ label: 'View rewards', endpoint: '/rewards/list', method: 'GET' });
  }
  if (toolsCalledSet.has('set_gaming_cap') || toolsCalledSet.has('update_gaming_settings')) {
    actions.push({ label: 'View gaming settings', endpoint: '/gaming/settings', method: 'GET' });
  }
  return actions;
}
