import { Router } from 'express';
import {
  listNotificationsController,
  markReadController,
  registerDeviceTokenController,
  unregisterDeviceTokenController,
  getNotifPrefsController,
  saveNotifPrefsController
} from '../controllers/notificationsController.js';
import { requireAnyAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const tokenLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
const prefsLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

const router = Router();

router.get('/list',    requireAnyAuth, listNotificationsController);
router.post('/markRead', requireAnyAuth, markReadController);

// Notification preferences (parent only)
router.get('/preferences',   requireAnyAuth, prefsLimiter, getNotifPrefsController);
router.patch('/preferences', requireAnyAuth, prefsLimiter, saveNotifPrefsController);

// Push device token registration - called after mobile login
router.post('/device-token',   requireAnyAuth, tokenLimiter, registerDeviceTokenController);
// Unregistration - called before logout so device stops receiving notifications
router.delete('/device-token', requireAnyAuth, tokenLimiter, unregisterDeviceTokenController);

export default router;
