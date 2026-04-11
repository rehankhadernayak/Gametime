import { Router } from 'express';
import {
  createManualGiftcardInventoryController,
  getGiftcardPointsSummaryController,
  createRewardFromGiftcardInventoryController,
  getGiftcardWalletBalanceController,
  giftcardRedemptionDetailsController,
  listGiftcardCatalogController,
  listGiftcardInventoryController,
  listGiftcardPointsTransactionsController,
  listGiftcardSkusController,
  listMyGiftcardCodesController,
  purchaseGiftcardPointsController,
  purchaseGiftcardInventoryController,
  syncGiftcardInventoryController
} from '../controllers/giftcardsController.js';
import { requireAnyAuth, requireChildAuth, requireParentAuth } from '../middleware/auth.js';
import { getMyPlatformCodes } from '../services/platformCodesService.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

// Financial actions get a strict limiter to prevent accidental or malicious bursts
const purchaseLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5  });
const actionLimiter   = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

const router = Router();

router.get('/catalog',                   requireParentAuth, listGiftcardCatalogController);
router.get('/catalog/:giftcardId/skus',  requireParentAuth, listGiftcardSkusController);
router.get('/wallet',                    requireParentAuth, getGiftcardWalletBalanceController);

router.post('/purchase',                 requireParentAuth, purchaseLimiter, purchaseGiftcardInventoryController);
router.post('/inventory/manual',         requireParentAuth, actionLimiter,   createManualGiftcardInventoryController);
router.get('/inventory',                 requireParentAuth, listGiftcardInventoryController);
router.post('/inventory/:batchId/sync',  requireParentAuth, actionLimiter,   syncGiftcardInventoryController);
router.post('/inventory/create-reward',  requireParentAuth, actionLimiter,   createRewardFromGiftcardInventoryController);
router.post('/gp/purchase',              requireParentAuth, purchaseLimiter, purchaseGiftcardPointsController);
router.get('/gp/summary',               requireAnyAuth,    getGiftcardPointsSummaryController);
router.get('/gp/transactions',          requireAnyAuth,    listGiftcardPointsTransactionsController);

router.get('/my-codes',                              requireChildAuth, listMyGiftcardCodesController);
router.get('/my-platform-codes',                     requireChildAuth, async (req, res, next) => {
  try {
    const codes = await getMyPlatformCodes(req.auth.childId);
    return res.json({ codes });
  } catch (err) { next(err); }
});
router.get('/redemptions/:redemptionId/details',     requireAnyAuth,  giftcardRedemptionDetailsController);

export default router;
