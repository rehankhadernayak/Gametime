import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { TASK_REQUEST_STATES, TASK_STATES, TASK_DUE_DATE_MAX_MS, TASK_REQUEST_DEFAULT_DUE_MS } from '../utils/constants.js';
import { ApiError } from '../utils/errors.js';
import { sanitizeText } from '../utils/sanitize.js';
import { adjustPoints } from './pointsService.js';
import { createNotification } from './notificationService.js';
import { analyzeTaskEvidence } from './aiReviewService.js';
import { awardChildGp, refundTaskGpToParent, reserveTaskGp } from './giftcardPointsService.js';
import { checkAndUnlockAchievements } from './achievementService.js';
import { deleteEvidenceFile, isLegacyDataUrl, saveEvidenceFile } from './evidenceStorageService.js';

function ensureDueDateWithinSevenDays(dueDateIso) {
  const dueDate = new Date(dueDateIso);
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  if (Number.isNaN(dueDate.getTime()) || diffMs < 0 || diffMs > TASK_DUE_DATE_MAX_MS) {
    throw new ApiError(400, 'Due date must be in the next 7 days');
  }
}

function defaultDueDateForRequest() {
  return new Date(Date.now() + TASK_REQUEST_DEFAULT_DUE_MS).toISOString();
}

function buildRewardSummary({ rpPoints, gpPoints }) {
  const parts = [];
  if (rpPoints > 0) parts.push(`+${rpPoints} RP`);
  if (gpPoints > 0) parts.push(`+${gpPoints} GP`);
  return parts.join(', ');
}

/**
 * Pessimistic gate for child evidence uplink: only Active (or Rejected + resubmit path) may proceed.
 * Pending approval is a hard reject (no silent ignore) to block duplicate / scripted submits.
 */
function assertEvidenceSubmissionAllowed({ task, existingCompletion }) {
  if (task.state === TASK_STATES.APPROVED) {
    throw new ApiError(409, 'This quest is already approved.');
  }
  if (task.state === TASK_STATES.PENDING_APPROVAL) {
    if (existingCompletion?.status === TASK_STATES.PENDING_APPROVAL) {
      throw new ApiError(409, 'Evidence for this quest is already being reviewed. Please wait for your parent.');
    }
    throw new ApiError(409, 'This quest is already submitted for review.');
  }
  if (task.state === TASK_STATES.EXPIRED) {
    throw new ApiError(400, 'Task is expired');
  }
  if (task.state === TASK_STATES.CANCELLED) {
    throw new ApiError(400, 'This quest is no longer available.');
  }
  if (task.state === TASK_STATES.DRAFT) {
    throw new ApiError(400, 'This quest is not active yet.');
  }

  if (existingCompletion?.status === TASK_STATES.PENDING_APPROVAL) {
    throw new ApiError(409, 'Evidence for this quest is already being reviewed. Please wait for your parent.');
  }
  if (existingCompletion?.status === TASK_STATES.APPROVED) {
    throw new ApiError(409, 'This quest is already approved.');
  }

  if (existingCompletion?.status === TASK_STATES.REJECTED) {
    if (![TASK_STATES.ACTIVE, TASK_STATES.REJECTED].includes(task.state)) {
      throw new ApiError(400, 'Task is not open for resubmission');
    }
  }
}

export async function createTask(parentId, payload) {
  const db = await getDb();
  ensureDueDateWithinSevenDays(payload.dueDate);
  const title = sanitizeText(payload.title);
  const description = sanitizeText(payload.description);
  const gpPoints = Number(payload.gpPoints || 0);
  const requiredEvidenceType = payload.requiredEvidenceType ?? null;
  if (requiredEvidenceType != null && requiredEvidenceType !== 'Photo' && requiredEvidenceType !== 'Video') {
    throw new ApiError(400, 'Invalid required evidence type');
  }

  if (!title || !description) {
    throw new ApiError(400, 'Task title and description cannot be empty');
  }
  if (!Number.isInteger(gpPoints) || gpPoints < 0 || gpPoints > 1000) {
    throw new ApiError(400, 'GP reward must be an integer between 0 and 1000');
  }

  const child = await db.get('SELECT id FROM child_profiles WHERE id = ? AND parent_id = ?', [payload.childId, parentId]);
  if (!child) throw new ApiError(404, 'Child not found');

  const now = new Date().toISOString();
  const id = uuidv4();
  await db.exec('BEGIN');
  try {
    const category = payload.category || 'other';
    const recurrenceDays = payload.recurrenceDays || null;
    await db.run(
      `INSERT INTO tasks (id, child_id, title, description, points, gp_points, state, due_date, category, recurrence_days, required_evidence_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.childId,
        title,
        description,
        payload.points,
        gpPoints,
        TASK_STATES.ACTIVE,
        payload.dueDate,
        category,
        recurrenceDays,
        requiredEvidenceType,
        now,
        now
      ]
    );

    if (gpPoints > 0) {
      await reserveTaskGp({
        parentId,
        taskId: id,
        gpPoints,
        note: `Allocated GP for task: ${title}`,
        dbClient: db
      });
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  const proofHint = requiredEvidenceType ? ` | Proof: ${requiredEvidenceType}` : '';
  await createNotification(
    'Child',
    payload.childId,
    `New task: ${title}${buildRewardSummary({ rpPoints: payload.points, gpPoints }) ? ` | Reward: ${buildRewardSummary({ rpPoints: payload.points, gpPoints })}` : ''}${proofHint}`
  );

  return { id };
}

export async function expireTasks() {
  const db = await getDb();
  const now = new Date().toISOString();
  const activeTasks = await db.all(
    `SELECT t.id, t.child_id, t.gp_points, t.title, c.parent_id as parentId
     FROM tasks t
     JOIN child_profiles c ON c.id = t.child_id
     WHERE state IN (?, ?, ?) AND due_date < ?`,
    [TASK_STATES.ACTIVE, TASK_STATES.DRAFT, TASK_STATES.PENDING_APPROVAL, now]
  );

  for (const task of activeTasks) {
    await db.exec('BEGIN');
    try {
      await db.run('UPDATE tasks SET state = ?, gp_points = 0, updated_at = ? WHERE id = ?', [TASK_STATES.EXPIRED, now, task.id]);
      if (Number(task.gp_points || 0) > 0) {
        await refundTaskGpToParent({
          parentId: task.parentId,
          taskId: task.id,
          gpPoints: Number(task.gp_points),
          note: `Refunded reserved GP because task expired: ${task.title}`,
          dbClient: db
        });
      }
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
    await createNotification('Child', task.child_id, 'A task has expired with no points awarded');
  }
}

export async function listTasksForParent(parentId) {
  // Task expiry is handled exclusively by the background job (taskExpirationJob).
  // Running expireTasks() inline here caused a full table scan on every GET request.
  const db = await getDb();
  return db.all(
    `SELECT t.id, t.child_id as childId, c.name as childName, t.title, t.description, t.points, t.gp_points as gpPoints, t.state, t.due_date as dueDate,
            t.category, t.recurrence_days as recurrenceDays,
            t.required_evidence_type as requiredEvidenceType,
            t.created_at as createdAt, t.updated_at as updatedAt,
            tc.id as completionId,
            CASE WHEN tc.evidence_data IS NOT NULL AND tc.evidence_data != '' THEN 1 ELSE 0 END as hasEvidence,
            tc.evidence_mime as evidenceMime, tc.evidence_type as evidenceType,
            tc.evidence_note as evidenceNote, tc.parent_note as parentNote,
            tc.ai_recommendation as aiRecommendation, tc.ai_confidence as aiConfidence, tc.ai_reason as aiReason,
            tc.ai_model as aiModel, tc.ai_analyzed_at as aiAnalyzedAt, tc.ai_status as aiStatus,
            tc.disputed as disputed, tc.dispute_note as disputeNote, tc.disputed_at as disputedAt
     FROM tasks t
     JOIN child_profiles c ON c.id = t.child_id
     LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.child_id = t.child_id
     WHERE c.parent_id = ?
     ORDER BY t.created_at DESC`,
    [parentId]
  );
}

export async function listTasksForChild(childId) {
  // Expiry is handled by background job only - not inline on read paths.
  const db = await getDb();
  return db.all(
    `SELECT t.id, t.title, t.description, t.points, t.gp_points as gpPoints, t.state, t.due_date as dueDate,
            t.category, t.recurrence_days as recurrenceDays,
            t.required_evidence_type as requiredEvidenceType,
            t.created_at as createdAt, t.updated_at as updatedAt,
            tc.id as completionId,
            CASE WHEN tc.evidence_data IS NOT NULL AND tc.evidence_data != '' THEN 1 ELSE 0 END as hasEvidence,
            tc.evidence_mime as evidenceMime, tc.evidence_type as evidenceType,
            tc.evidence_note as evidenceNote, tc.parent_note as parentNote,
            tc.ai_recommendation as aiRecommendation, tc.ai_confidence as aiConfidence, tc.ai_reason as aiReason,
            tc.ai_model as aiModel, tc.ai_analyzed_at as aiAnalyzedAt, tc.ai_status as aiStatus,
            tc.disputed as disputed, tc.dispute_note as disputeNote, tc.disputed_at as disputedAt
     FROM tasks t
     LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.child_id = t.child_id
     WHERE t.child_id = ?
     ORDER BY t.created_at DESC`,
    [childId]
  );
}

export async function completeTask(childId, payload) {
  const db = await getDb();
  const taskId = payload.taskId;
  const task = await db.get('SELECT * FROM tasks WHERE id = ? AND child_id = ?', [taskId, childId]);
  if (!task) throw new ApiError(404, 'Task not found');
  // Treat overdue tasks as expired even if the background job has not yet run.
  if (task.state === TASK_STATES.EXPIRED || (task.due_date && new Date(task.due_date) < new Date())) {
    throw new ApiError(400, 'Task is expired');
  }
  if (!payload.evidenceData || !payload.evidenceMime || !payload.evidenceType) {
    throw new ApiError(400, 'Evidence (photo/video) is required for task completion');
  }

  const requiredType = task.required_evidence_type;
  if (requiredType && payload.evidenceType !== requiredType) {
    throw new ApiError(400, `This quest requires ${requiredType} proof. Please upload a ${requiredType.toLowerCase()}.`);
  }

  const existingCompletion = await db.get('SELECT * FROM task_completions WHERE task_id = ? AND child_id = ?', [taskId, childId]);

  assertEvidenceSubmissionAllowed({ task, existingCompletion });

  const now = new Date().toISOString();
  const isResubmission = Boolean(existingCompletion);

  // ── Pre-transaction: persist evidence to disk ─────────────────────────
  // We save the file BEFORE the DB transaction so the transaction stays fast.
  // If the transaction later rolls back the file becomes an orphan, but it is
  // harmless and will be overwritten on the next submission attempt.
  const completionIdToUse = isResubmission ? existingCompletion.id : uuidv4();
  let evidencePath;
  try {
    // For resubmissions, remove the previous evidence file if it was disk-stored
    if (isResubmission && existingCompletion.evidence_data && !isLegacyDataUrl(existingCompletion.evidence_data)) {
      await deleteEvidenceFile(existingCompletion.evidence_data);
    }
    evidencePath = await saveEvidenceFile(completionIdToUse, payload.evidenceData, payload.evidenceMime);
  } catch (storageError) {
    logger.error({ err: storageError }, '[evidence] Failed to save evidence file');
    throw new ApiError(500, 'Failed to save evidence file. Please try again.');
  }

  // ── Phase 1: Main transaction - must succeed atomically ───────────────
  await db.exec('BEGIN IMMEDIATE');
  try {
    const taskLocked = await db.get('SELECT * FROM tasks WHERE id = ? AND child_id = ?', [taskId, childId]);
    if (!taskLocked) {
      throw new ApiError(404, 'Task not found');
    }
    const completionLocked = await db.get('SELECT * FROM task_completions WHERE task_id = ? AND child_id = ?', [taskId, childId]);
    assertEvidenceSubmissionAllowed({ task: taskLocked, existingCompletion: completionLocked });

    if (completionLocked && completionLocked.status === TASK_STATES.REJECTED) {
      await db.run(
        `UPDATE task_completions
         SET completed_at = ?,
             status = ?,
             evidence_data = ?,
             evidence_mime = ?,
             evidence_type = ?,
             evidence_note = ?,
             parent_note = NULL,
             ai_recommendation = NULL,
             ai_confidence = NULL,
             ai_reason = NULL,
             ai_model = NULL,
             ai_analyzed_at = NULL,
             ai_status = NULL,
             disputed = 0,
             dispute_note = NULL,
             disputed_at = NULL,
             resolved_at = NULL,
             updated_at = ?
         WHERE id = ?`,
        [
          now,
          TASK_STATES.PENDING_APPROVAL,
          evidencePath,
          payload.evidenceMime ?? null,
          payload.evidenceType ?? null,
          sanitizeText(payload.evidenceNote ?? null),
          now,
          completionLocked.id
        ]
      );
    } else {
      try {
        await db.run(
          `INSERT INTO task_completions (id, task_id, child_id, completed_at, status, evidence_data, evidence_mime, evidence_type, evidence_note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            completionIdToUse,
            taskId,
            childId,
            now,
            TASK_STATES.PENDING_APPROVAL,
            evidencePath,
            payload.evidenceMime ?? null,
            payload.evidenceType ?? null,
            sanitizeText(payload.evidenceNote ?? null),
            now,
            now
          ]
        );
      } catch (insertErr) {
        if (insertErr && insertErr.code === 'SQLITE_CONSTRAINT') {
          throw new ApiError(
            409,
            'Evidence for this quest is already being reviewed. Please wait for your parent.'
          );
        }
        throw insertErr;
      }
    }

    await db.run(
      'UPDATE tasks SET state = ?, completion_submitted_at = ?, rejected_at = NULL, updated_at = ? WHERE id = ? AND child_id = ?',
      [TASK_STATES.PENDING_APPROVAL, now, now, taskId, childId]
    );

    const parent = await db.get('SELECT parent_id FROM child_profiles WHERE id = ?', childId);
    await createNotification('Parent', parent.parent_id, `Task ready for approval: ${task.title}`, 'task_submitted');

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  // ── Phase 2: AI review - best-effort, non-blocking ────────────────────
  // Runs after the transaction commits. Never throws back to the caller.
  // analyzeTaskEvidence has an internal local-rules fallback, so it always
  // resolves. The db.run below is a separate lightweight UPDATE; any failure
  // is logged but must NOT propagate - the submission already succeeded.
  const aiInput = {
    taskTitle: task.title,
    taskDescription: task.description,
    evidenceType: payload.evidenceType,
    evidenceMime: payload.evidenceMime,
    evidenceData: payload.evidenceData,
    evidenceNote: payload.evidenceNote
  };
  setImmediate(async () => {
    try {
      const ai = await analyzeTaskEvidence(aiInput);
      await db.run(
        `UPDATE task_completions
         SET ai_recommendation = ?, ai_confidence = ?, ai_reason = ?, ai_model = ?, ai_analyzed_at = ?, ai_status = ?, updated_at = ?
         WHERE task_id = ? AND child_id = ?`,
        [
          ai.recommendation,
          ai.confidence,
          sanitizeText(ai.reason),
          ai.model,
          new Date().toISOString(),
          ai.status,
          new Date().toISOString(),
          taskId,
          childId
        ]
      );
    } catch (aiError) {
      logger.warn({ err: aiError }, '[aiReview] Background AI review failed (non-critical)');
    }
  });

  return {
    ignored: false,
    message: isResubmission ? 'Task completion resubmitted for approval' : 'Task completion submitted'
  };
}

async function decideTask(parentId, payload, approve) {
  const db = await getDb();
  const taskId = payload.taskId;
  const task = await db.get(
    `SELECT t.*, c.parent_id as parentId
     FROM tasks t
     JOIN child_profiles c ON c.id = t.child_id
     WHERE t.id = ?`,
    [taskId]
  );

  if (!task || task.parentId !== parentId) throw new ApiError(404, 'Task not found');

  if (task.state === TASK_STATES.APPROVED && approve) {
    return { ignored: true, message: 'Task already approved' };
  }
  if (task.state === TASK_STATES.REJECTED && !approve) {
    return { ignored: true, message: 'Task already rejected' };
  }

  if (task.state !== TASK_STATES.PENDING_APPROVAL) {
    return { ignored: true, message: 'Task is not pending approval' };
  }

  const now = new Date().toISOString();
  const sanitizedNote = sanitizeText(payload.note ?? null);
  await db.exec('BEGIN');
  try {
    const nextTaskState = approve ? TASK_STATES.APPROVED : TASK_STATES.ACTIVE;
    const nextCompletionState = approve ? TASK_STATES.APPROVED : TASK_STATES.REJECTED;
    await db.run('UPDATE tasks SET state = ?, updated_at = ?, approved_at = ?, rejected_at = ? WHERE id = ?', [
      nextTaskState,
      now,
      approve ? now : null,
      approve ? null : now,
      taskId
    ]);

    await db.run('UPDATE task_completions SET status = ?, updated_at = ? WHERE task_id = ?', [
      nextCompletionState,
      now,
      taskId
    ]);

    await db.run(
      'UPDATE task_completions SET parent_note = ?, resolved_at = ?, disputed = 0 WHERE task_id = ?',
      [sanitizedNote, now, taskId]
    );

    if (approve) {
      await adjustPoints({
        childId: task.child_id,
        points: task.points,
        type: 'Credit',
        referenceType: 'Task',
        referenceId: taskId,
        dbClient: db
      });
      if (Number(task.gp_points || 0) > 0) {
        await awardChildGp({
          parentId,
          childId: task.child_id,
          gpPoints: Number(task.gp_points),
          referenceType: 'TaskReward',
          referenceId: taskId,
          note: `GP awarded for approved task: ${task.title}`,
          dbClient: db
        });
      }
    }

    await createNotification(
      'Child',
      task.child_id,
      approve
        ? `Task approved. ${buildRewardSummary({ rpPoints: task.points, gpPoints: Number(task.gp_points || 0) })}${sanitizedNote ? ` | Note: ${sanitizedNote}` : ''}`
        : `Task sent back for retry: ${task.title}${sanitizedNote ? ` | Note: ${sanitizedNote}` : ''}`,
      approve ? 'task_approved' : 'task_rejected'
    );

    await db.exec('COMMIT');

    // Post-commit: check achievements (fire-and-forget, never blocks approval)
    if (approve) {
      checkAndUnlockAchievements(task.child_id, db).catch(
        (err) => logger.warn({ err }, '[achievements] unlock check failed (non-critical)')
      );
    }

    return { ignored: false, message: approve ? 'Approved' : 'Returned to child for retry' };
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function approveTask(parentId, payload) {
  return decideTask(parentId, payload, true);
}

export async function rejectTask(parentId, payload) {
  return decideTask(parentId, payload, false);
}

export async function disputeTask(childId, payload) {
  const db = await getDb();
  const task = await db.get('SELECT id, title FROM tasks WHERE id = ? AND child_id = ?', [payload.taskId, childId]);
  if (!task) throw new ApiError(404, 'Task not found');

  const completion = await db.get('SELECT * FROM task_completions WHERE task_id = ? AND child_id = ?', [payload.taskId, childId]);
  if (!completion) throw new ApiError(400, 'Task has no submitted completion');
  if (completion.status !== TASK_STATES.REJECTED) {
    throw new ApiError(400, 'Only rejected tasks can be disputed');
  }

  const now = new Date().toISOString();
  await db.run(
    `UPDATE task_completions
     SET disputed = 1, dispute_note = ?, disputed_at = ?, updated_at = ?
     WHERE task_id = ? AND child_id = ?`,
    [sanitizeText(payload.note), now, now, payload.taskId, childId]
  );

  const parent = await db.get('SELECT parent_id FROM child_profiles WHERE id = ?', [childId]);
  await createNotification('Parent', parent.parent_id, `Dispute submitted for task "${task.title}": ${sanitizeText(payload.note)}`);

  return { message: 'Dispute submitted' };
}

export async function deleteTask(parentId, taskId) {
  const db = await getDb();
  const task = await db.get(
    `SELECT t.*, c.parent_id as parentId
     FROM tasks t
     JOIN child_profiles c ON c.id = t.child_id
     WHERE t.id = ?`,
    [taskId]
  );

  if (!task || task.parentId !== parentId) throw new ApiError(404, 'Task not found');

  if ([TASK_STATES.ACTIVE, TASK_STATES.DRAFT, TASK_STATES.PENDING_APPROVAL].includes(task.state)) {
    await db.exec('BEGIN');
    try {
      await db.run('UPDATE tasks SET state = ?, gp_points = 0, updated_at = ? WHERE id = ?', [
        TASK_STATES.CANCELLED,
        new Date().toISOString(),
        taskId
      ]);
      if (Number(task.gp_points || 0) > 0) {
        await refundTaskGpToParent({
          parentId,
          taskId,
          gpPoints: Number(task.gp_points),
          note: `Refunded reserved GP because task was cancelled: ${task.title}`,
          dbClient: db
        });
      }
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
    await createNotification('Child', task.child_id, `Task cancelled: ${task.title}`);
    return { message: 'Task cancelled without points' };
  }

  if (task.state !== TASK_STATES.APPROVED && Number(task.gp_points || 0) > 0) {
    await db.exec('BEGIN');
    try {
      await refundTaskGpToParent({
        parentId,
        taskId,
        gpPoints: Number(task.gp_points),
        note: `Refunded reserved GP because task was deleted: ${task.title}`,
        dbClient: db
      });
      await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
    return { message: 'Task deleted and GP refunded' };
  }

  await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
  return { message: 'Task deleted' };
}

export async function createTaskRequest(childId, payload) {
  const db = await getDb();
  const child = await db.get(
    'SELECT id, parent_id as parentId, name FROM child_profiles WHERE id = ?',
    [childId]
  );
  if (!child) throw new ApiError(404, 'Child not found');

  const title = sanitizeText(payload.title).slice(0, 50);
  const description = sanitizeText(payload.description).slice(0, 200);
  if (!title || !description) {
    throw new ApiError(400, 'Task request title and description cannot be empty');
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  await db.run(
    `INSERT INTO task_requests
      (id, child_id, parent_id, title, description, requested_points, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      childId,
      child.parentId,
      title,
      description,
      payload.requestedPoints,
      TASK_REQUEST_STATES.PENDING,
      now,
      now
    ]
  );

  await createNotification('Parent', child.parentId, `${child.name} requested a new task: ${title}`, 'task_request');
  return { id, status: TASK_REQUEST_STATES.PENDING };
}

export async function listTaskRequestsForParent(parentId) {
  const db = await getDb();
  return db.all(
    `SELECT tr.id,
            tr.child_id as childId,
            c.name as childName,
            tr.parent_id as parentId,
            tr.title,
            tr.description,
            tr.requested_points as requestedPoints,
            tr.status,
            tr.parent_note as parentNote,
            tr.linked_task_id as linkedTaskId,
            tr.created_at as createdAt,
            tr.updated_at as updatedAt,
            tr.resolved_at as resolvedAt
     FROM task_requests tr
     JOIN child_profiles c ON c.id = tr.child_id
     WHERE tr.parent_id = ?
     ORDER BY tr.created_at DESC`,
    [parentId]
  );
}

export async function listTaskRequestsForChild(childId) {
  const db = await getDb();
  return db.all(
    `SELECT tr.id,
            tr.child_id as childId,
            tr.parent_id as parentId,
            tr.title,
            tr.description,
            tr.requested_points as requestedPoints,
            tr.status,
            tr.parent_note as parentNote,
            tr.linked_task_id as linkedTaskId,
            tr.created_at as createdAt,
            tr.updated_at as updatedAt,
            tr.resolved_at as resolvedAt
     FROM task_requests tr
     WHERE tr.child_id = ?
     ORDER BY tr.created_at DESC`,
    [childId]
  );
}

export async function approveTaskRequest(parentId, requestId, payload) {
  const db = await getDb();
  const request = await db.get(
    `SELECT tr.*,
            c.name as childName
     FROM task_requests tr
     JOIN child_profiles c ON c.id = tr.child_id
     WHERE tr.id = ? AND tr.parent_id = ?`,
    [requestId, parentId]
  );

  if (!request) throw new ApiError(404, 'Task request not found');
  if (request.status === TASK_REQUEST_STATES.APPROVED) {
    return {
      ignored: true,
      message: 'Task request already approved',
      taskId: request.linked_task_id || null
    };
  }
  if (request.status !== TASK_REQUEST_STATES.PENDING) {
    return { ignored: true, message: 'Task request already resolved' };
  }

  const now = new Date().toISOString();
  const dueDate = payload.dueDate || defaultDueDateForRequest();
  ensureDueDateWithinSevenDays(dueDate);
  const points = payload.points ?? request.requested_points;
  const gpPoints = Number(payload.gpPoints || 0);
  const parentNote = sanitizeText(payload.note ?? null);
  const taskId = uuidv4();
  if (!Number.isInteger(gpPoints) || gpPoints < 0 || gpPoints > 1000) {
    throw new ApiError(400, 'GP reward must be an integer between 0 and 1000');
  }

  await db.exec('BEGIN');
  try {
    await db.run(
      `INSERT INTO tasks (id, child_id, title, description, points, gp_points, state, due_date, category, recurrence_days, required_evidence_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'other', NULL, NULL, ?, ?)`,
      [
        taskId,
        request.child_id,
        request.title,
        request.description,
        points,
        gpPoints,
        TASK_STATES.ACTIVE,
        dueDate,
        now,
        now
      ]
    );
    if (gpPoints > 0) {
      await reserveTaskGp({
        parentId,
        taskId,
        gpPoints,
        note: `Allocated GP from task request approval: ${request.title}`,
        dbClient: db
      });
    }

    await db.run(
      `UPDATE task_requests
       SET status = ?, parent_note = ?, linked_task_id = ?, resolved_at = ?, updated_at = ?
       WHERE id = ?`,
      [TASK_REQUEST_STATES.APPROVED, parentNote, taskId, now, now, requestId]
    );

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  // Single combined notification avoids duplicate messages for the child.
  await createNotification('Child', request.child_id, `Task request approved - new task created: ${request.title}`, 'task_request_approved');
  return { ignored: false, taskId, message: 'Task request approved and task created' };
}

export async function rejectTaskRequest(parentId, requestId, payload) {
  const db = await getDb();
  const request = await db.get(
    `SELECT tr.*,
            c.name as childName
     FROM task_requests tr
     JOIN child_profiles c ON c.id = tr.child_id
     WHERE tr.id = ? AND tr.parent_id = ?`,
    [requestId, parentId]
  );

  if (!request) throw new ApiError(404, 'Task request not found');
  if (request.status === TASK_REQUEST_STATES.REJECTED) {
    return { ignored: true, message: 'Task request already rejected' };
  }
  if (request.status !== TASK_REQUEST_STATES.PENDING) {
    return { ignored: true, message: 'Task request already resolved' };
  }

  const now = new Date().toISOString();
  const parentNote = sanitizeText(payload.note ?? null);
  await db.run(
    `UPDATE task_requests
     SET status = ?, parent_note = ?, resolved_at = ?, updated_at = ?
     WHERE id = ?`,
    [TASK_REQUEST_STATES.REJECTED, parentNote, now, now, requestId]
  );

  await createNotification(
    'Child',
    request.child_id,
    `Task request declined: ${request.title}${parentNote ? ` | Note: ${parentNote}` : ''}`,
    'task_request_rejected'
  );
  return { ignored: false, message: 'Task request rejected' };
}

export async function updateTaskSchedule(parentId, taskId, recurrenceDays) {
  const db = await getDb();
  const task = await db.get(
    `SELECT t.*, c.parent_id as parentId
     FROM tasks t
     JOIN child_profiles c ON c.id = t.child_id
     WHERE t.id = ?`,
    [taskId]
  );
  if (!task || task.parentId !== parentId) throw new ApiError(404, 'Task not found');

  const now = new Date().toISOString();
  await db.run(
    'UPDATE tasks SET recurrence_days = ?, updated_at = ? WHERE id = ?',
    [recurrenceDays || null, now, taskId]
  );
  return { message: 'Task schedule updated' };
}

export async function cancelTaskRequest(childId, requestId) {
  const db = await getDb();
  const request = await db.get(
    `SELECT tr.*, c.name as childName
     FROM task_requests tr
     JOIN child_profiles c ON c.id = tr.child_id
     WHERE tr.id = ? AND tr.child_id = ?`,
    [requestId, childId]
  );

  if (!request) throw new ApiError(404, 'Task request not found');
  if (request.status !== TASK_REQUEST_STATES.PENDING) {
    return { ignored: true, message: 'Only pending requests can be cancelled' };
  }

  const now = new Date().toISOString();
  await db.run(
    `UPDATE task_requests
     SET status = ?, resolved_at = ?, updated_at = ?
     WHERE id = ?`,
    [TASK_REQUEST_STATES.CANCELLED, now, now, requestId]
  );

  await createNotification('Parent', request.parent_id, `${request.childName} cancelled task request: ${request.title}`);
  return { ignored: false, message: 'Task request cancelled' };
}
