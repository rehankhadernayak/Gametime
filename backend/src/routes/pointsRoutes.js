import { Router } from 'express';
import { adjustPointsController, listTransactionsController } from '../controllers/pointsController.js';
import { requireAnyAuth, requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const adjustLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

const router = Router();

router.post('/adjust',      requireParentAuth, adjustLimiter, adjustPointsController);
router.get('/transactions', requireAnyAuth,    listTransactionsController);

export default router;
