import { v4 as uuidv4 } from 'uuid';
import { Expo } from 'expo-server-sdk';
import { getDb } from '../db/connection.js';

/**
 * Register (or update) an Expo push token for a recipient.
 *
 * Uses an UPSERT so that if the same device logs in with a different account,
 * the token is reassigned rather than duplicated.
 *
 * @param {'Parent'|'Child'} recipientType
 * @param {string}           recipientId
 * @param {string}           token  - Expo push token (ExponentPushToken[…])
 */
export async function registerDeviceToken(recipientType, recipientId, token) {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error(`Invalid Expo push token: "${token}"`);
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO device_tokens (id, recipient_type, recipient_id, token, platform, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'expo', ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       recipient_type = excluded.recipient_type,
       recipient_id   = excluded.recipient_id,
       updated_at     = excluded.updated_at`,
    [uuidv4(), recipientType, recipientId, token, now, now]
  );
}

/**
 * Remove an Expo push token (called on logout so the device stops receiving
 * notifications for that session).
 *
 * @param {string} token - Expo push token to remove
 */
export async function unregisterDeviceToken(token) {
  const db = await getDb();
  await db.run('DELETE FROM device_tokens WHERE token = ?', [token]);
}
