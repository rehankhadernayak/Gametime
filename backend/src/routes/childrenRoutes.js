import { Router } from 'express';
import { createChild, deleteChild, listChildren, leaderboard, serveChildAvatar, uploadChildAvatar } from '../controllers/childrenController.js';
import { requireAnyAuth, requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const createLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
const avatarLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
const readLimiter  = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

const router = Router();

router.post('/create',              requireParentAuth, createLimiter, createChild);
router.get('/list',                 requireParentAuth, listChildren);
router.get('/leaderboard',          requireParentAuth, readLimiter,  leaderboard);
router.delete('/:id',               requireParentAuth, createLimiter, deleteChild);
router.post('/:id/avatar',          requireParentAuth, avatarLimiter, uploadChildAvatar);
router.get('/:id/avatar',           requireAnyAuth, serveChildAvatar);

export default router;
