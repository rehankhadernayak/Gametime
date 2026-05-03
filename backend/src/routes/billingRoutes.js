import { Router } from 'express';
import { requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { createBillingCheckoutController } from '../controllers/billingController.js';

const router = Router();

const checkoutLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

router.post('/create-checkout', requireParentAuth, checkoutLimiter, createBillingCheckoutController);

export default router;
