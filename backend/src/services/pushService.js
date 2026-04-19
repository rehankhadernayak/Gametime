import { Expo } from 'expo-server-sdk';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const expo = new Expo({ useFcmV1: true });

/**
 * Send a push notification to all registered devices for a recipient.
 *
 * Non-blocking by design - callers should fire-and-forget via setImmediate.
 * Stale tokens flagged as DeviceNotRegistered are pruned automatically.
 *
 * @param {'Parent'|'Child'} recipientType
 * @param {string}           recipientId
 * @param {string}           title       - Short heading shown in the notification tray
 * @param {string}           body        - Full notification message
 * @param {object}           [extraData] - Extra fields merged into notification data
 *                                         (e.g. { type: 'task_submitted' } for deep-linking)
 */
export async function sendPushToRecipient(recipientType, recipientId, title, body, extraData = {}) {
  try {
    const db = await getDb();
    const rows = await db.all(
      'SELECT id, token FROM device_tokens WHERE recipient_type = ? AND recipient_id = ?',
      [recipientType, recipientId]
    );

    if (!rows.length) return;

    // Only send to valid Expo push tokens; skip anything that looks malformed.
    const messages = rows
      .filter(({ token }) => Expo.isExpoPushToken(token))
      .map(({ token }) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: { recipientType, recipientId, ...extraData }
      }));

    if (!messages.length) return;

    // Expo recommends chunking large batches (each chunk ≤ 100 messages).
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      let tickets;
      try {
        tickets = await expo.sendPushNotificationsAsync(chunk);
      } catch (chunkErr) {
        logger.error({ err: chunkErr }, '[push] Chunk send failed');
        continue;
      }

      // Prune any tokens that Expo reports as no longer registered.
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const staleToken = messages[i]?.to;
          if (staleToken) {
            await db.run('DELETE FROM device_tokens WHERE token = ?', [staleToken]).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    // Never throw - push delivery is always best-effort.
    logger.error({ err }, '[push] sendPushToRecipient error');
  }
}
