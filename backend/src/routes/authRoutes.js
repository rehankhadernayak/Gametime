import { Router } from 'express';
import {
  changePassword,
  childDirectLogin,
  childLogin,
  childPinLogin,
  deleteAccount,
  exportData,
  forgotPassword,
  login,
  logout,
  me,
  resetPassword,
  signup
} from '../controllers/authController.js';
import { requireAnyAuth, requireParentAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();
const authLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });
// Tighter limiter for password reset to prevent email flooding: 5 per 15 minutes per IP.
const resetLimiter = createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 5 });

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/child-login', requireParentAuth, childLogin);
router.post('/child-login-direct', authLimiter, childDirectLogin);
router.post('/child-login-pin', authLimiter, childPinLogin);
router.get('/me', requireAnyAuth, me);
router.post('/logout', requireAnyAuth, logout);
router.post('/forgot-password', resetLimiter, forgotPassword);
router.post('/reset-password', resetLimiter, resetPassword);
router.post('/change-password', requireParentAuth, authLimiter, changePassword);
router.get('/export-data', requireParentAuth, authLimiter, exportData);
router.delete('/account', requireParentAuth, authLimiter, deleteAccount);

export default router;
