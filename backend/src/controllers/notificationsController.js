import { listNotifications, markNotificationsRead, getNotifPrefs, saveNotifPrefs } from '../services/notificationService.js';
import { registerDeviceToken, unregisterDeviceToken } from '../services/deviceTokenService.js';
import { markReadSchema } from '../utils/validation.js';

export async function listNotificationsController(req, res, next) {
  try {
    const recipientType = req.auth.role === 'parent' ? 'Parent' : 'Child';
    const recipientId = req.auth.role === 'parent' ? req.auth.parentId : req.auth.childId;
    return res.json(await listNotifications(recipientType, recipientId));
  } catch (error) {
    next(error);
  }
}

export async function markReadController(req, res, next) {
  try {
    const data = markReadSchema.parse(req.body);
    const recipientType = req.auth.role === 'parent' ? 'Parent' : 'Child';
    const recipientId = req.auth.role === 'parent' ? req.auth.parentId : req.auth.childId;

    await markNotificationsRead(recipientType, recipientId, data.notificationIds);
    return res.json({ message: 'Notifications updated' });
  } catch (error) {
    next(error);
  }
}

export async function registerDeviceTokenController(req, res, next) {
  try {
    const { deviceToken } = req.body || {};
    if (!deviceToken || typeof deviceToken !== 'string') {
      return res.status(400).json({ error: 'deviceToken (string) is required' });
    }
    const recipientType = req.auth.role === 'parent' ? 'Parent' : 'Child';
    const recipientId = req.auth.role === 'parent' ? req.auth.parentId : req.auth.childId;
    await registerDeviceToken(recipientType, recipientId, deviceToken);
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function unregisterDeviceTokenController(req, res, next) {
  try {
    const { deviceToken } = req.body || {};
    if (!deviceToken || typeof deviceToken !== 'string') {
      return res.status(400).json({ error: 'deviceToken (string) is required' });
    }
    await unregisterDeviceToken(deviceToken);
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function getNotifPrefsController(req, res, next) {
  try {
    if (req.auth.role !== 'parent') return res.status(403).json({ error: 'Parents only' });
    const prefs = await getNotifPrefs(req.auth.parentId);
    return res.json(prefs);
  } catch (error) {
    next(error);
  }
}

export async function saveNotifPrefsController(req, res, next) {
  try {
    if (req.auth.role !== 'parent') return res.status(403).json({ error: 'Parents only' });
    const saved = await saveNotifPrefs(req.auth.parentId, req.body || {});
    return res.json(saved);
  } catch (error) {
    next(error);
  }
}
