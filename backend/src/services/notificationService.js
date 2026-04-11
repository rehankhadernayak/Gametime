import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { sendPushToRecipient } from './pushService.js';

// ─── Notification preference helpers ──────────────────────────────────────────

const DEFAULT_PREFS = {
  enabled: true,
  taskApprovals: true,
  childActivity: true,
  weeklyReport: true,
  reminderSchedule: 'daily'
};

// Maps notification `type` strings to the preference key that gates them.
// Unmapped types fall back to 'childActivity' (the catch-all for parents).
const TYPE_TO_PREF_KEY = {
  task_submitted:        'taskApprovals',
  task_request:          'taskApprovals',
  task_dispute:          'taskApprovals',
  task_request_rejected: 'childActivity',
  reward_redeemed:       'childActivity',
  weekly_report:         'weeklyReport'
};

export async function getNotifPrefs(parentId) {
  const db = await getDb();
  const row = await db.get(
    'SELECT notification_preferences FROM parent_accounts WHERE id = ?',
    [parentId]
  );
  if (!row?.notification_preferences) return { ...DEFAULT_PREFS };
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(row.notification_preferences) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function saveNotifPrefs(parentId, prefs) {
  const db = await getDb();
  // Only persist known keys — strip anything unexpected
  const safe = {
    enabled:           Boolean(prefs.enabled ?? DEFAULT_PREFS.enabled),
    taskApprovals:     Boolean(prefs.taskApprovals ?? DEFAULT_PREFS.taskApprovals),
    childActivity:     Boolean(prefs.childActivity ?? DEFAULT_PREFS.childActivity),
    weeklyReport:      Boolean(prefs.weeklyReport ?? DEFAULT_PREFS.weeklyReport),
    reminderSchedule:  ['off', 'daily', 'weekly'].includes(prefs.reminderSchedule)
                         ? prefs.reminderSchedule
                         : DEFAULT_PREFS.reminderSchedule
  };
  await db.run(
    'UPDATE parent_accounts SET notification_preferences = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(safe), new Date().toISOString(), parentId]
  );
  return safe;
}

/**
 * Returns false if a parent's preferences say to suppress this notification.
 * Always returns true for child recipients (no prefs system for children yet).
 */
async function shouldNotify(recipientType, recipientId, type) {
  if (recipientType !== 'Parent') return true;
  const prefs = await getNotifPrefs(recipientId);
  if (!prefs.enabled) return false;
  const prefKey = TYPE_TO_PREF_KEY[type] || 'childActivity';
  return prefs[prefKey] !== false;
}

/**
 * @param {'Parent'|'Child'} recipientType
 * @param {string}           recipientId
 * @param {string}           message
 * @param {string}           [type]  - Notification type for mobile deep-linking
 *                                     (e.g. 'task_submitted', 'task_approved', 'reward_redeemed')
 */
export async function createNotification(recipientType, recipientId, message, type) {
  // Respect parent notification preferences before doing any work.
  if (!(await shouldNotify(recipientType, recipientId, type))) return;

  const db = await getDb();
  const now = new Date().toISOString();
  const truncated = message.slice(0, 200);

  await db.run(
    `INSERT INTO notifications (id, recipient_type, recipient_id, message, is_read, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [uuidv4(), recipientType, recipientId, truncated, now]
  );

  // Fire-and-forget push delivery — never blocks or throws back to the caller.
  const extraData = type ? { type } : {};
  setImmediate(() => {
    sendPushToRecipient(recipientType, recipientId, 'Gametime', truncated, extraData).catch(() => {});
  });
}

export async function listNotifications(recipientType, recipientId) {
  const db = await getDb();
  return db.all(
    `SELECT id, message, is_read as read, created_at as createdAt
     FROM notifications
     WHERE recipient_type = ? AND recipient_id = ?
     ORDER BY created_at DESC`,
    [recipientType, recipientId]
  );
}

export async function markNotificationsRead(recipientType, recipientId, notificationIds) {
  const db = await getDb();
  const placeholders = notificationIds.map(() => '?').join(',');
  await db.run(
    `UPDATE notifications
     SET is_read = 1
     WHERE recipient_type = ? AND recipient_id = ? AND id IN (${placeholders})`,
    [recipientType, recipientId, ...notificationIds]
  );
}
