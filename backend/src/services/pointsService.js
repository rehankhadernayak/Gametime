import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { runInDbTransaction } from '../db/runInTransaction.js';
import { ApiError } from '../utils/errors.js';

export async function adjustPoints({ childId, points, type, referenceType, referenceId = null, dbClient = null }) {
  const db = dbClient || (await getDb());
  const ownTransaction = !dbClient;

  const work = async (client) => {
    const row = await client.get('SELECT points_balance FROM child_profiles WHERE id = ?', childId);
    if (!row) throw new ApiError(404, 'Child not found');

    const nextBalance = row.points_balance + points;
    if (nextBalance < 0 || nextBalance > 10000) {
      throw new ApiError(400, 'Points balance must stay between 0 and 10000');
    }

    await client.run(
      'UPDATE child_profiles SET points_balance = ?, updated_at = ? WHERE id = ?',
      [nextBalance, new Date().toISOString(), childId]
    );

    await client.run(
      `INSERT INTO points_transactions (id, child_id, points, points_kind, type, reference_type, reference_id, created_at)
       VALUES (?, ?, ?, 'RP', ?, ?, ?, ?)`,
      [
        uuidv4(),
        childId,
        Math.abs(points),
        type,
        referenceType,
        referenceId,
        new Date().toISOString()
      ]
    );

    return nextBalance;
  };

  if (ownTransaction) {
    return runInDbTransaction(db, work);
  }
  return work(db);
}

export async function listTransactions(childId) {
  const db = await getDb();
  return db.all(
    `SELECT id, points, points_kind as pointsKind, type, reference_type as referenceType, reference_id as referenceId, created_at as createdAt
     FROM points_transactions
     WHERE child_id = ?
     ORDER BY created_at DESC`,
    [childId]
  );
}
