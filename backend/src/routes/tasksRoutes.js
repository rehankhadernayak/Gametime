import { Router } from 'express';
import {
  approveTaskController,
  approveTaskRequestController,
  cancelTaskRequestController,
  completeTaskController,
  createTaskRequestController,
  createTaskController,
  deleteTaskController,
  disputeTaskController,
  getSubmissionController,
  listTaskRequestsController,
  listTasksController,
  rejectTaskController,
  rejectTaskRequestController,
  reviewSubmissionController,
  serveEvidenceController,
  updateTaskScheduleController
} from '../controllers/tasksController.js';
import { requireAnyAuth, requireChildAuth, requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Rate-limit mutation endpoints that involve evidence uploads or GP/RP side-effects.
const completeLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
const actionLimiter  = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

router.post('/create',  requireParentAuth, actionLimiter, createTaskController);
router.get('/list',     requireAnyAuth,    listTasksController);
router.post('/complete', requireChildAuth, completeLimiter, completeTaskController);
router.post('/dispute',  requireChildAuth, actionLimiter,   disputeTaskController);
router.post('/approve',  requireParentAuth, actionLimiter,  approveTaskController);
router.post('/reject',   requireParentAuth, actionLimiter,  rejectTaskController);
router.post('/request',  requireChildAuth, actionLimiter,   createTaskRequestController);
router.get('/requests',  requireAnyAuth,    listTaskRequestsController);
router.post('/requests/:requestId/approve', requireParentAuth, actionLimiter, approveTaskRequestController);
router.post('/requests/:requestId/reject',  requireParentAuth, actionLimiter, rejectTaskRequestController);
router.delete('/requests/:requestId',       requireChildAuth,  cancelTaskRequestController);
// Evidence serve — must be declared BEFORE the /:taskId wildcards to avoid
// "evidence" being captured as a taskId parameter.
router.get('/evidence/:completionId', requireAnyAuth, serveEvidenceController);

// Submission detail + review — declared before the /:taskId delete wildcard
router.get('/:taskId/submission',  requireParentAuth, actionLimiter, getSubmissionController);
router.post('/:taskId/review',     requireParentAuth, actionLimiter, reviewSubmissionController);

router.patch('/:taskId/schedule',           requireParentAuth, actionLimiter, updateTaskScheduleController);
router.delete('/:taskId',                   requireParentAuth, deleteTaskController);

export default router;
