import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
  clearAiHistory,
  getAiHistory,
  greetNewParent,
  saveAiMessage,
  streamAiChat,
  streamSignupChat,
  streamSignupGreeting
} from '../services/aiService.js';
import { streamChildAiChat, getChildContext } from '../services/aiChildService.js';
import { generateInsightsSummary, getInsightsData } from '../services/aiInsightsService.js';
import { refreshFamilyContext } from '../services/aiEventService.js';
import { getDb } from '../db/connection.js';
import { env } from '../config/env.js';

/* POST /ai/chat
 * Body: { message: string, history: Array<{role,content}> }
 * Streams SSE: data: <json>\n\n
 */
export async function chatController(req, res, next) {
  const { message, history = [] } = req.body ?? {};
  const parentId = req.auth.parentId;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!env.anthropicApiKey) {
    return res.status(503).json({ error: 'AI service unavailable. Please check back later.' });
  }

  // SSE headers - keep connection open
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present
  res.flushHeaders();

  const userMessage = message.trim();

  try {
    // Persist the user's message first
    await saveAiMessage(parentId, 'user', userMessage);

    let assistantMessage = '';

    await streamAiChat(parentId, history, userMessage, async (event) => {
      if (event.type === 'done') {
        assistantMessage = event.assistantMessage;
        // Persist the assistant's full response
        if (assistantMessage) {
          await saveAiMessage(parentId, 'assistant', assistantMessage);
        }
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  } catch (err) {
    // Try to send the error over the stream before closing
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'AI unavailable' })}\n\n`);
    } catch {
      // response may already be closed
    }
  } finally {
    res.end();
  }
}

/* POST /ai/signup-start - PUBLIC (no auth)
 * Returns Claude's initial onboarding greeting as a streaming SSE response.
 */
export async function signupStartController(req, res, next) {
  if (!env.anthropicApiKey) {
    return res.status(503).json({ error: 'AI service unavailable. Please check back later.' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  try {
    await streamSignupGreeting((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  } catch (err) {
    try { res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`); } catch { /* closed */ }
  } finally {
    res.end();
  }
}

/* POST /ai/signup-chat - PUBLIC (no auth)
 * Body: { message: string, history: Array<{role,content}> }
 * Streams SSE. Emits { type:'finalize', data:{...} } when Claude calls finalize_signup.
 */
export async function signupChatController(req, res, next) {
  const { message, history = [] } = req.body ?? {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (!env.anthropicApiKey) {
    return res.status(503).json({ error: 'AI service unavailable. Please check back later.' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  try {
    await streamSignupChat(history, message.trim(), (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  } catch (err) {
    try { res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`); } catch { /* closed */ }
  } finally {
    res.end();
  }
}

/* POST /ai/greet
 * Called once after a new parent signs up. Generates a warm onboarding greeting
 * via Claude and persists it to the DB. Subsequent calls are no-ops (returns null).
 */
export async function greetController(req, res, next) {
  try {
    if (!env.anthropicApiKey) {
      return res.status(503).json({ error: 'AI service unavailable. Please check back later.' });
    }
    const parentId     = req.auth.parentId;
    const signupContext = req.body?.signupContext ?? null; // optional - from AI signup flow
    const greeting     = await greetNewParent(parentId, signupContext);
    res.json({ greeting });
  } catch (err) {
    next(err);
  }
}

/* GET /ai/history */
export async function historyController(req, res, next) {
  try {
    const messages = await getAiHistory(req.auth.parentId);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

/* DELETE /ai/history */
export async function clearHistoryController(req, res, next) {
  try {
    await clearAiHistory(req.auth.parentId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/* POST /ai/child/chat
 * Body: { message: string, history: Array<{role,content}> }
 * Streams SSE - child auth required.
 */
export async function childChatController(req, res, next) {
  const { message, history = [] } = req.body ?? {};
  const childId = req.auth.childId;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!env.anthropicApiKey) {
    return res.status(503).json({ error: 'AI service unavailable. Please check back later.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    await streamChildAiChat(childId, history, message.trim(), (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  } catch (err) {
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'AI unavailable' })}\n\n`);
    } catch {
      /* response may already be closed */
    }
  } finally {
    res.end();
  }
}

/* GET /ai/parent/insights
 * Returns per-child gaming & task insights + an AI narrative summary.
 * Parent auth required.
 */
export async function insightsController(req, res, next) {
  try {
    if (!env.anthropicApiKey) {
      return res.status(503).json({ error: 'AI insights currently unavailable.' });
    }
    const parentId    = req.auth.parentId;
    const insightsData = await getInsightsData(parentId);
    const narrative    = await generateInsightsSummary(insightsData);
    res.json({ ...insightsData, narrative });
  } catch (err) {
    next(err);
  }
}

/* ── Evidence preview Zod schema ─────────────────────────────────────── */
const evidencePreviewSchema = z.object({
  taskId:       z.string().uuid(),
  evidenceData: z.string().min(1),
  evidenceMime: z.string().min(1)
});

/* POST /ai/evidence-preview
 * Child auth required. Rate limited to 10/minute (applied in route).
 * Assesses submitted evidence and gives coaching feedback.
 */
export async function evidencePreviewController(req, res, next) {
  try {
    const parsed = evidencePreviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    }

    if (!env.anthropicApiKey) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }

    const { taskId, evidenceData, evidenceMime } = parsed.data;
    const childId = req.auth.childId;
    const db      = await getDb();

    // Verify task belongs to this child
    const task = await db.get(
      'SELECT id, title, description FROM tasks WHERE id = ? AND child_id = ?',
      [taskId, childId]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found or does not belong to you.' });
    }

    // Get child age for prompt
    const ctx = await getChildContext(childId);
    const childAge = ctx.child?.dateOfBirth
      ? (() => {
          const dob = new Date(ctx.child.dateOfBirth);
          const now = new Date();
          let age = now.getUTCFullYear() - dob.getUTCFullYear();
          const m = now.getUTCMonth() - dob.getUTCMonth();
          if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
          return age;
        })()
      : 10;

    const client = new Anthropic({ apiKey: env.anthropicApiKey });

    // Build vision message - data URL expected for evidenceData
    const isImage = evidenceMime.startsWith('image/');
    const mediaType = isImage ? evidenceMime : 'image/jpeg';

    // Strip data URL prefix if present
    const base64Data = evidenceData.includes(',')
      ? evidenceData.split(',')[1]
      : evidenceData;

    const prompt =
      `You are a helpful assistant for a child completing a chore task. ` +
      `The task is: ${task.title} - ${task.description}. ` +
      `The child has submitted a photo as proof. ` +
      `Assess the photo briefly: Is it clear enough for a parent to approve? Is the task visibly completed? ` +
      `Give encouraging feedback in 1-2 sentences suitable for a child aged ${childAge}. ` +
      `End with either LOOKS_GOOD or NEEDS_IMPROVEMENT.`;

    const response = await client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type:       'image',
              source:     { type: 'base64', media_type: mediaType, data: base64Data }
            },
            { type: 'text', text: prompt }
          ]
        }
      ]
    });

    const coaching = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    const isGood       = coaching.includes('LOOKS_GOOD');
    const recommendation = isGood ? 'submit' : 'retake';
    // Simple confidence: if the verdict keyword appears, high confidence
    const confidence   = isGood || coaching.includes('NEEDS_IMPROVEMENT') ? 0.85 : 0.5;

    // Clean coaching text - remove trailing verdict keyword
    const cleanedCoaching = coaching
      .replace(/LOOKS_GOOD$/, '')
      .replace(/NEEDS_IMPROVEMENT$/, '')
      .trim();

    res.json({ coaching: cleanedCoaching, recommendation, confidence });
  } catch (err) {
    next(err);
  }
}

/* GET /ai/family-briefing
 * Parent auth required.
 * Returns a morning briefing for the parent with stats and action links.
 */
export async function familyBriefingController(req, res, next) {
  try {
    const parentId = req.auth.parentId;
    const db       = await getDb();

    // Refresh memory context
    await refreshFamilyContext(parentId, db);

    // Gather stats
    const pendingRow = await db.get(
      `SELECT COUNT(*) AS count FROM tasks t
       JOIN child_profiles cp ON cp.id = t.child_id
       WHERE cp.parent_id = ? AND t.state = 'PendingApproval'`,
      [parentId]
    );
    const pendingApprovals = pendingRow?.count ?? 0;

    // Children with streak at risk (last_completion_date = yesterday, streak > 0)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const streakRiskRows = await db.all(
      `SELECT name FROM child_profiles
       WHERE parent_id = ? AND current_streak_days > 0 AND last_completion_date = ?`,
      [parentId, yesterdayStr]
    );
    const streakRisk = streakRiskRows.map((r) => r.name);

    // Total RP awarded this week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMon);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyRpRow = await db.get(
      `SELECT COALESCE(SUM(pt.amount), 0) AS total
       FROM points_transactions pt
       JOIN child_profiles cp ON cp.id = pt.child_id
       WHERE cp.parent_id = ? AND pt.type = 'Credit' AND pt.points_kind = 'RP' AND pt.created_at >= ?`,
      [parentId, weekStart.toISOString()]
    );
    const weeklyRp = weeklyRpRow?.total ?? 0;

    // Active gaming sessions
    const activeSessionsRow = await db.get(
      `SELECT COUNT(*) AS count FROM gaming_sessions gs
       JOIN child_profiles cp ON cp.id = gs.child_id
       WHERE cp.parent_id = ? AND gs.status = 'Started'`,
      [parentId]
    );
    const activeSessions = activeSessionsRow?.count ?? 0;

    if (!env.anthropicApiKey) {
      // Return stats without AI briefing if no API key
      const actions = buildBriefingActions(pendingApprovals, streakRisk);
      return res.json({
        briefing: `You have ${pendingApprovals} pending approval${pendingApprovals !== 1 ? 's' : ''} and ${weeklyRp} RP awarded this week.`,
        stats:    { pendingApprovals, streakRisk, weeklyRp },
        actions
      });
    }

    const client = new Anthropic({ apiKey: env.anthropicApiKey });

    const briefingPrompt =
      `You are a family coach assistant. Write a warm, concise 2-3 sentence morning briefing for a parent using the Gametime app. ` +
      `Keep it positive and actionable. Stats: ` +
      `${pendingApprovals} task submission${pendingApprovals !== 1 ? 's' : ''} pending approval, ` +
      `${streakRisk.length > 0 ? streakRisk.join(' and ') + (streakRisk.length === 1 ? ' has' : ' have') + ' a streak at risk today, ' : ''}` +
      `${weeklyRp} RP awarded this week, ` +
      `${activeSessions} child${activeSessions !== 1 ? 'ren' : ''} currently gaming. ` +
      `Do not use markdown, bullet points, or em dashes. Write in plain friendly prose.`;

    const response = await client.messages.create({
      model:      env.claudeModel,
      max_tokens: 200,
      messages:   [{ role: 'user', content: briefingPrompt }]
    });

    const briefing = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    const actions = buildBriefingActions(pendingApprovals, streakRisk);

    res.json({
      briefing,
      stats:   { pendingApprovals, streakRisk, weeklyRp },
      actions
    });
  } catch (err) {
    next(err);
  }
}

function buildBriefingActions(pendingApprovals, streakRisk) {
  const actions = [];
  if (pendingApprovals > 0) {
    actions.push({
      label:    `Review ${pendingApprovals} approval${pendingApprovals !== 1 ? 's' : ''}`,
      endpoint: '/tasks/list',
      method:   'GET'
    });
  }
  if (streakRisk.length > 0) {
    actions.push({
      label:    'View active tasks',
      endpoint: '/tasks/list?state=Active',
      method:   'GET'
    });
  }
  actions.push({ label: 'View family overview', endpoint: '/family', method: 'GET' });
  return actions;
}
