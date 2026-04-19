import { Router } from 'express';
import { requireChildAuth, requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import {
  chatController,
  childChatController,
  clearHistoryController,
  evidencePreviewController,
  familyBriefingController,
  greetController,
  historyController,
  insightsController,
  signupChatController,
  signupStartController
} from '../controllers/aiController.js';

const router = Router();

const chatLimiter            = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });
const evidencePreviewLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
// Public signup AI routes: strict limit - no auth means anyone on the internet can hit them
const signupLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5  });

/* ── Public routes (no auth - used during account creation) ─────────── */
router.post('/signup-start',  signupLimiter, signupStartController);
router.post('/signup-chat',   signupLimiter, signupChatController);

/* ── Parent authenticated routes ─────────────────────────────────────── */
router.post('/greet',            requireParentAuth, greetController);
router.post('/chat',             requireParentAuth, chatLimiter, chatController);
router.get('/history',           requireParentAuth, historyController);
router.delete('/history',        requireParentAuth, clearHistoryController);
router.get('/parent/insights',   requireParentAuth, insightsController);
router.get('/family-briefing',   requireParentAuth, familyBriefingController);

/* ── Child authenticated routes ──────────────────────────────────────── */
router.post('/child/chat',       requireChildAuth, chatLimiter, childChatController);
router.post('/evidence-preview', requireChildAuth, evidencePreviewLimiter, evidencePreviewController);

export default router;
