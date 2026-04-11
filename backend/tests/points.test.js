import { beforeEach, describe, expect, test } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();

const { initDb } = await import('../src/db/init.js');
const { getDb } = await import('../src/db/connection.js');
const { adjustPoints } = await import('../src/services/pointsService.js');

describe('Points service', () => {
  beforeEach(async () => {
    await resetTestDb();
    await initDb();

    const db = await getDb();
    await db.exec(`
      DELETE FROM notifications;
      DELETE FROM points_transactions;
      DELETE FROM redemptions;
      DELETE FROM rewards;
      DELETE FROM task_completions;
      DELETE FROM tasks;
      DELETE FROM child_profiles;
      DELETE FROM sessions;
      DELETE FROM parent_accounts;
    `);

    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO parent_accounts (id, name, email, password_hash, created_at, updated_at)
       VALUES ('p1', 'Parent', 'p1@example.com', 'hash', ?, ?)`,
      [now, now]
    );
    await db.run(
      `INSERT INTO child_profiles (id, parent_id, name, date_of_birth, points_balance, created_at, updated_at)
       VALUES ('c1', 'p1', 'Kid', '2015-01-01', 20, ?, ?)`,
      [now, now]
    );
  });

  test('cannot drop below zero', async () => {
    await expect(
      adjustPoints({
        childId: 'c1',
        points: -25,
        type: 'Debit',
        referenceType: 'ManualAdjustment',
        referenceId: 'x'
      })
    ).rejects.toThrow(/between 0 and 10000/);
  });

  test('cannot exceed max balance', async () => {
    await expect(
      adjustPoints({
        childId: 'c1',
        points: 10001,
        type: 'Credit',
        referenceType: 'ManualAdjustment',
        referenceId: 'x'
      })
    ).rejects.toThrow(/between 0 and 10000/);
  });
});
