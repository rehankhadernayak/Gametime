import { Router } from 'express';
import {
  createRewardController,
  deleteRewardController,
  fulfillRedemptionController,
  listRewardsController,
  redeemRewardController
} from '../controllers/rewardsController.js';
import { requireAnyAuth, requireChildAuth, requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

const redeemLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
const actionLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

router.post('/create',                   requireParentAuth, actionLimiter, createRewardController);
router.get('/list',                      requireAnyAuth,    listRewardsController);
router.post('/redeem',                   requireChildAuth,  redeemLimiter, redeemRewardController);
router.post('/fulfill/:redemptionId',    requireParentAuth, actionLimiter, fulfillRedemptionController);
router.delete('/:rewardId',              requireParentAuth, deleteRewardController);

export default router;
