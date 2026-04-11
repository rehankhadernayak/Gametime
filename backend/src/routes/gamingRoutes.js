import { Router } from 'express';
import {
  childGamingOverviewController,
  createGamingGameController,
  deleteGamingGameController,
  endGamingSessionController,
  getGamingSettingsController,
  importGamingUsageController,
  listParentGamingAuditController,
  listGamingGamesController,
  listGamingSessionsController,
  parentChildGamingOverviewController,
  startGamingSessionController,
  syncDetectedGamesController,
  updateGamingGameController,
  updateGamingSettingsController,
  weeklyGamingReportController
} from '../controllers/gamingController.js';
import { requireAnyAuth, requireChildAuth, requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const sessionLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });
const actionLimiter  = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

const router = Router();

router.get('/settings',  requireParentAuth, getGamingSettingsController);
router.patch('/settings', requireParentAuth, actionLimiter, updateGamingSettingsController);

router.get('/games',                  requireAnyAuth,    listGamingGamesController);
router.post('/games',                 requireParentAuth, actionLimiter, createGamingGameController);
router.patch('/games/:gameId',        requireParentAuth, actionLimiter, updateGamingGameController);
router.delete('/games/:gameId',       requireParentAuth, deleteGamingGameController);
router.post('/games/sync-detected',   requireParentAuth, actionLimiter, syncDetectedGamesController);

router.get('/overview',          requireChildAuth,  childGamingOverviewController);
router.get('/overview/:childId', requireParentAuth, parentChildGamingOverviewController);

router.get('/sessions/audit',  requireParentAuth, listParentGamingAuditController);
router.get('/sessions',        requireAnyAuth,    listGamingSessionsController);
router.post('/sessions/start', requireAnyAuth,    sessionLimiter, startGamingSessionController);
router.post('/sessions/end',   requireAnyAuth,    sessionLimiter, endGamingSessionController);

router.post('/usage/import',  requireParentAuth, actionLimiter, importGamingUsageController);
router.get('/reports/weekly', requireAnyAuth,    weeklyGamingReportController);

export default router;
