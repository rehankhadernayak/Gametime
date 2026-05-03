import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getAppleReviewDemoParentEmails } from '../config/env.js';
import { getDb } from '../db/connection.js';
import { TASK_STATES } from '../utils/constants.js';
import { ApiError } from '../utils/errors.js';
import { saveEvidenceFile } from './evidenceStorageService.js';
import { createTask, createTaskRequest } from './taskService.js';

/** 1×1 transparent PNG as data URL — minimal valid image for demo evidence. */
const DEMO_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isAppleReviewDemoParentEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return false;
  const allow = getAppleReviewDemoParentEmails();
  return allow.length > 0 && allow.includes(e);
}

/**
 * Creates demo tasks (2 active + 1 pending approval) and 1 pending Roblox gift-card task request for Apple review.
 * Idempotent per family: skips rows that already match demo titles for the same child.
 */
export async function seedReviewDemoData(parentId, parentEmail) {
  if (!isAppleReviewDemoParentEmail(parentEmail)) {
    throw new ApiError(403, 'Demo seed is not enabled for this account');
  }

  const db = await getDb();
  let children = await db.all(
    'SELECT id, name FROM child_profiles WHERE parent_id = ? ORDER BY created_at ASC',
    [parentId]
  );

  let demoChildCreated = false;
  if (!children.length) {
    const now = new Date().toISOString();
    const childId = uuidv4();
    const dob = new Date(Date.UTC(new Date().getUTCFullYear() - 8, new Date().getUTCMonth(), new Date().getUTCDate()))
      .toISOString()
      .slice(0, 10);
    const pinHash = await bcrypt.hash('1234', 10);
    await db.run(
      `INSERT INTO child_profiles (id, parent_id, name, date_of_birth, email, password_hash, pin_hash, points_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, 0, ?, ?)`,
      [childId, parentId, 'Demo Child', dob, pinHash, now, now]
    );
    children = [{ id: childId, name: 'Demo Child' }];
    demoChildCreated = true;
  }

  const child = children[0];
  const childId = child.id;

  const demoTaskTitles = ['Clean Room', 'Read 20 mins'];
  const createdTasks = [];
  const skippedTasks = [];

  for (const title of demoTaskTitles) {
    const existing = await db.get(
      'SELECT id FROM tasks WHERE child_id = ? AND title = ? AND state = ?',
      [childId, title, TASK_STATES.ACTIVE]
    );
    if (existing) {
      skippedTasks.push(title);
      continue;
    }
    const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const description = `Complete "${title}" and upload the required proof before the due time. Parent will review and award RP.`;
    const row = await createTask(parentId, {
      childId,
      title,
      description: description.slice(0, 200),
      points: 10,
      gpPoints: 0,
      dueDate,
      category: 'chores',
      recurrenceDays: null,
      requiredEvidenceType: 'Photo'
    });
    createdTasks.push({ id: row.id, title });
  }

  /** Third task: already submitted so the parent approval inbox is non-empty. */
  const inboxTitle = 'Practice piano';
  let pendingApprovalTask = null;

  const existingInbox = await db.get(
    `SELECT t.id FROM tasks t
     JOIN task_completions tc ON tc.task_id = t.id AND tc.child_id = t.child_id
     WHERE t.child_id = ? AND t.title = ? AND t.state = ? AND tc.status = ?`,
    [childId, inboxTitle, TASK_STATES.PENDING_APPROVAL, TASK_STATES.PENDING_APPROVAL]
  );

  if (!existingInbox) {
    const dueDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
    const taskRow = await createTask(parentId, {
      childId,
      title: inboxTitle,
      description: 'Demo submission so you can approve from the inbox.',
      points: 10,
      gpPoints: 0,
      dueDate,
      category: 'activities',
      recurrenceDays: null,
      requiredEvidenceType: 'Photo'
    });
    const taskId = taskRow.id;
    const now = new Date().toISOString();
    const completionId = uuidv4();
    const evidencePath = await saveEvidenceFile(completionId, DEMO_PNG_DATA_URL, 'image/png');
    await db.run(
      `INSERT INTO task_completions (id, task_id, child_id, completed_at, status, evidence_data, evidence_mime, evidence_type, evidence_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        completionId,
        taskId,
        childId,
        now,
        TASK_STATES.PENDING_APPROVAL,
        evidencePath,
        'image/png',
        'Photo',
        'Demo mode — sample photo',
        now,
        now
      ]
    );
    await db.run('UPDATE tasks SET state = ?, updated_at = ? WHERE id = ?', [
      TASK_STATES.PENDING_APPROVAL,
      now,
      taskId
    ]);
    pendingApprovalTask = { id: taskId, completionId };
    createdTasks.push({ id: taskId, title: inboxTitle });
  } else {
    pendingApprovalTask = { id: existingInbox.id, skipped: true };
    skippedTasks.push(inboxTitle);
  }

  const requestTitle = 'Roblox Gift Card';
  const existingReq = await db.get(
    `SELECT id FROM task_requests
     WHERE parent_id = ? AND child_id = ? AND title = ? AND status = 'Pending'`,
    [parentId, childId, requestTitle]
  );

  let taskRequest = null;
  if (existingReq) {
    taskRequest = { id: existingReq.id, skipped: true };
  } else {
    const created = await createTaskRequest(childId, {
      title: requestTitle,
      description: 'Please approve GP for a Roblox gift card.',
      requestedPoints: 25
    });
    taskRequest = { id: created.id, skipped: false };
  }

  return {
    childId,
    childName: child.name,
    demoChildCreated,
    demoChildPin: demoChildCreated ? '1234' : undefined,
    createdTasks,
    skippedTasks,
    taskRequest,
    pendingApprovalTask
  };
}
