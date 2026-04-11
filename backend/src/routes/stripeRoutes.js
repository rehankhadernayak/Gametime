import { Router } from 'express';
import { requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { createCheckoutSessionController } from '../controllers/stripeController.js';

const router = Router();

// 5 checkout attempts per 60 seconds per IP — financial operation
const checkoutLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

// POST /stripe/checkout
router.post('/checkout', requireParentAuth, checkoutLimiter, createCheckoutSessionController);

export default router;
