import { Router } from 'express';
import {
  createChild,
  deleteChild,
  getMyScreenTimeSelection,
  listChildren,
  leaderboard,
  serveChildAvatar,
  updateChildPin,
  updateChildScreenTimeSelection,
  uploadChildAvatar
} from '../controllers/childrenController.js';
import { requireAnyAuth, requireChildAuth, requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const createLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
const avatarLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
const readLimiter  = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

const router = Router();

router.post('/create',              requireParentAuth, createLimiter, createChild);
router.get('/list',                 requireParentAuth, listChildren);
router.get('/leaderboard',          requireParentAuth, readLimiter,  leaderboard);
router.get('/screen-time-selection', requireChildAuth, readLimiter, getMyScreenTimeSelection);
router.patch('/:id/pin',            requireParentAuth, createLimiter, updateChildPin);
router.patch('/:id/screen-time-selection', requireParentAuth, createLimiter, updateChildScreenTimeSelection);
router.delete('/:id',               requireParentAuth, createLimiter, deleteChild);
router.post('/:id/avatar',          requireParentAuth, avatarLimiter, uploadChildAvatar);
router.get('/:id/avatar',           requireAnyAuth, serveChildAvatar);

export default router;
