import { Router } from 'express';
import { listAchievements, getStreak } from '../services/achievementService.js';
import { requireAnyAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const listLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });
const router = Router();

/**
 * GET /achievements/list
 * Returns all achievements with unlocked status for the requesting child,
 * or for a specific child when called by a parent (?childId=<id>).
 */
router.get('/list', requireAnyAuth, listLimiter, async (req, res, next) => {
  try {
    const childId = req.auth.role === 'parent' ? req.query.childId : req.auth.childId;
    if (!childId) return res.status(400).json({ error: 'childId required' });
    const achievements = await listAchievements(childId);
    res.json({ achievements });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /achievements/streak
 * Returns the current streak for the requesting child (or a specific child for parents).
 */
router.get('/streak', requireAnyAuth, listLimiter, async (req, res, next) => {
  try {
    const childId = req.auth.role === 'parent' ? req.query.childId : req.auth.childId;
    if (!childId) return res.status(400).json({ error: 'childId required' });
    const streak = await getStreak(childId);
    res.json({ streak });
  } catch (err) {
    next(err);
  }
});

export default router;
