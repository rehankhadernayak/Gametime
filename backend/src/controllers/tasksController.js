import {
  taskCompleteSchema,
  taskCreateSchema,
  taskDecisionSchema,
  taskDisputeSchema,
  taskRequestCreateSchema,
  taskRequestDecisionSchema,
  taskScheduleUpdateSchema
} from '../utils/validation.js';
import {
  approveTask,
  approveTaskRequest,
  cancelTaskRequest,
  completeTask,
  createTask,
  createTaskRequest,
  deleteTask,
  disputeTask,
  getPendingTasksForParent,
  listTaskRequestsForChild,
  listTaskRequestsForParent,
  listTasksForChild,
  listTasksForParent,
  rejectTask,
  rejectTaskRequest,
  updateTaskSchedule
} from '../services/taskService.js';
import { isLegacyDataUrl, readEvidenceFile } from '../services/evidenceStorageService.js';
import { getDb } from '../db/connection.js';
import { ApiError } from '../utils/errors.js';

export async function createTaskController(req, res, next) {
  try {
    const payload = taskCreateSchema.parse(req.body);
    const task = await createTask(req.auth.parentId, payload);
    return res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

function tasksListPayload(tasks) {
  return { serverTime: Date.now(), tasks: Array.isArray(tasks) ? tasks : [] };
}

export async function listTasksController(req, res, next) {
  try {
    if (req.auth.role === 'parent') {
      return res.json(tasksListPayload(await listTasksForParent(req.auth.parentId)));
    }

    return res.json(tasksListPayload(await listTasksForChild(req.auth.childId)));
  } catch (error) {
    next(error);
  }
}

export async function getPendingTasksController(req, res, next) {
  try {
    // Parent-only endpoint - get tasks pending their approval
    return res.json(await getPendingTasksForParent(req.auth.parentId));
  } catch (error) {
    next(error);
  }
}

export async function completeTaskController(req, res, next) {
  try {
    const data = taskCompleteSchema.parse(req.body);
    return res.json(await completeTask(req.auth.childId, data));
  } catch (error) {
    next(error);
  }
}

export async function approveTaskController(req, res, next) {
  try {
    const data = taskDecisionSchema.parse(req.body);
    return res.json(await approveTask(req.auth.parentId, data));
  } catch (error) {
    next(error);
  }
}

export async function rejectTaskController(req, res, next) {
  try {
    const data = taskDecisionSchema.parse(req.body);
    return res.json(await rejectTask(req.auth.parentId, data));
  } catch (error) {
    next(error);
  }
}

export async function disputeTaskController(req, res, next) {
  try {
    const data = taskDisputeSchema.parse(req.body);
    return res.json(await disputeTask(req.auth.childId, data));
  } catch (error) {
    next(error);
  }
}

export async function deleteTaskController(req, res, next) {
  try {
    return res.json(await deleteTask(req.auth.parentId, req.params.taskId));
  } catch (error) {
    next(error);
  }
}

export async function updateTaskScheduleController(req, res, next) {
  try {
    const { recurrenceDays } = taskScheduleUpdateSchema.parse(req.body);
    return res.json(await updateTaskSchedule(req.auth.parentId, req.params.taskId, recurrenceDays ?? null));
  } catch (error) {
    next(error);
  }
}

export async function createTaskRequestController(req, res, next) {
  try {
    const payload = taskRequestCreateSchema.parse(req.body);
    return res.status(201).json(await createTaskRequest(req.auth.childId, payload));
  } catch (error) {
    next(error);
  }
}

export async function listTaskRequestsController(req, res, next) {
  try {
    if (req.auth.role === 'parent') {
      return res.json(await listTaskRequestsForParent(req.auth.parentId));
    }
    return res.json(await listTaskRequestsForChild(req.auth.childId));
  } catch (error) {
    next(error);
  }
}

export async function approveTaskRequestController(req, res, next) {
  try {
    const payload = taskRequestDecisionSchema.parse(req.body || {});
    return res.json(await approveTaskRequest(req.auth.parentId, req.params.requestId, payload));
  } catch (error) {
    next(error);
  }
}

export async function rejectTaskRequestController(req, res, next) {
  try {
    const payload = taskRequestDecisionSchema.parse(req.body || {});
    return res.json(await rejectTaskRequest(req.auth.parentId, req.params.requestId, payload));
  } catch (error) {
    next(error);
  }
}

export async function cancelTaskRequestController(req, res, next) {
  try {
    return res.json(await cancelTaskRequest(req.auth.childId, req.params.requestId));
  } catch (error) {
    next(error);
  }
}

/**
 * Serve task evidence (photo or video) for an authenticated user.
 *
 * Auth rules:
 *  - Parent: may view evidence for any task belonging to their children
 *  - Child:  may view only their own submissions
 *
 * Handles both formats:
 *  - Legacy base64 data-URL (evidence_data starts with "data:") - decoded on the fly
 *  - New file-path format (e.g. "evidence/abc.jpg") - streamed from disk
 */
export async function serveEvidenceController(req, res, next) {
  try {
    const { completionId } = req.params;
    const db = await getDb();

    // Fetch the completion along with the task's parent so we can check auth
    const completion = await db.get(
      `SELECT tc.id, tc.child_id as childId, tc.evidence_data as evidenceData,
              tc.evidence_mime as evidenceMime, t.child_id as taskChildId,
              cp.parent_id as parentId
       FROM task_completions tc
       JOIN tasks t ON tc.task_id = t.id
       JOIN child_profiles cp ON cp.id = t.child_id
       WHERE tc.id = ?`,
      [completionId]
    );

    if (!completion) throw new ApiError(404, 'Evidence not found');

    // Authorisation check
    const { auth } = req;
    if (auth.role === 'parent' && auth.parentId !== completion.parentId) {
      throw new ApiError(403, 'Forbidden');
    }
    if (auth.role === 'child' && auth.childId !== completion.childId) {
      throw new ApiError(403, 'Forbidden');
    }

    if (!completion.evidenceData) throw new ApiError(404, 'No evidence for this completion');

    const mime = completion.evidenceMime || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    // Private cache: browsers may cache for up to 1 hour; intermediaries must not
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', 'inline');

    if (isLegacyDataUrl(completion.evidenceData)) {
      // ── Legacy path: evidence stored as raw base64 data-URL in SQLite ──
      const commaIdx = completion.evidenceData.indexOf(',');
      const b64 = commaIdx === -1 ? completion.evidenceData : completion.evidenceData.slice(commaIdx + 1);
      const buffer = Buffer.from(b64, 'base64');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }

    // ── New path: evidence stored as a file on disk ──────────────────────
    const buffer = await readEvidenceFile(completion.evidenceData);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /tasks/:taskId/submission
 * Returns the task submission details for the EvidenceReviewPanel.
 * Parent auth required - verifies the task belongs to one of their children.
 */
export async function getSubmissionController(req, res, next) {
  try {
    const { taskId } = req.params;
    const db = await getDb();

    const row = await db.get(
      `SELECT t.id, t.title AS taskTitle, t.points AS pointValue,
              cp.name AS childName, cp.parent_id AS parentId,
              tc.id AS completionId, tc.evidence_type AS evidenceType,
              tc.evidence_note AS evidenceNote, tc.completed_at AS submittedAt,
              tc.ai_recommendation AS aiRecommendation,
              tc.ai_confidence AS aiConfidence,
              tc.ai_reason AS aiReason,
              tc.ai_status AS aiStatus
       FROM tasks t
       JOIN child_profiles cp ON cp.id = t.child_id
       LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.child_id = t.child_id
       WHERE t.id = ?`,
      [taskId]
    );

    if (!row) throw new ApiError(404, 'Task not found');
    if (row.parentId !== req.auth.parentId) throw new ApiError(403, 'Forbidden');

    // Map DB field names to the shape EvidenceReviewPanel expects
    const verdict =
      row.aiStatus === null ? 'pending' :
      row.aiRecommendation === 'Approve'            ? 'approve' :
      row.aiRecommendation === 'Reject'             ? 'reject' :
      row.aiRecommendation === 'NeedsParentReview'  ? 'review' :
      'pending';

    return res.json({
      childName:        row.childName,
      taskTitle:        row.taskTitle,
      pointValue:       row.pointValue,
      mediaType:        row.evidenceType === 'Video' ? 'video' : row.completionId ? 'photo' : null,
      mediaUrl:         row.completionId ? `/tasks/evidence/${row.completionId}` : null,
      mediaThumbnailUrl: null,
      evidenceNote:     row.evidenceNote ?? null,
      aiVerdict:        verdict,
      aiScore:          row.aiConfidence != null ? Math.round(row.aiConfidence * 100) : null,
      aiNote:           row.aiReason ?? null,
      submittedAt:      row.submittedAt ?? null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /tasks/:taskId/review
 * Body: { decision: "approve"|"reject"|"return", parentNote?: string }
 * Used by EvidenceReviewPanel. Maps to existing approve/reject service functions.
 */
export async function reviewSubmissionController(req, res, next) {
  try {
    const { taskId } = req.params;
    const { decision, parentNote } = req.body ?? {};

    if (!['approve', 'reject', 'return'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be approve, reject, or return' });
    }

    const payload = { taskId, note: parentNote ?? null };

    if (decision === 'approve') {
      return res.json(await approveTask(req.auth.parentId, payload));
    }
    // "reject" and "return" (request revision) both call rejectTask
    return res.json(await rejectTask(req.auth.parentId, payload));
  } catch (error) {
    next(error);
  }
}
