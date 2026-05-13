import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { runInDbTransaction } from '../db/runInTransaction.js';
import { ApiError } from '../utils/errors.js';
import { sanitizeText } from '../utils/sanitize.js';

async function withOptionalTransaction(db, dbClient, fn) {
  if (dbClient) return fn(dbClient);
  return runInDbTransaction(db, fn);
}

async function insertGpTransaction({
  db,
  parentId,
  childId = null,
  points,
  type,
  balanceType,
  referenceType,
  referenceId = null,
  moneyAmount = null,
  currency = null,
  note = null
}) {
  await db.run(
    `INSERT INTO giftcard_points_transactions
      (id, parent_id, child_id, points, type, balance_type, reference_type, reference_id, money_amount, currency, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      parentId,
      childId,
      Math.abs(Number(points)),
      type,
      balanceType,
      referenceType,
      referenceId,
      moneyAmount,
      currency,
      note ? sanitizeText(note, 200) : null,
      new Date().toISOString()
    ]
  );
}

export async function purchaseParentGp({
  parentId,
  points,
  moneyAmount = null,
  currency = null,
  note = null,
  dbClient = null
}) {
  const db = dbClient || (await getDb());

  const amount = Number(points);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, 'GP purchase points must be a positive whole number');
  }

  return withOptionalTransaction(db, dbClient, async (client) => {
    const parent = await client.get('SELECT id, gp_balance as gpBalance FROM parent_accounts WHERE id = ?', [parentId]);
    if (!parent) throw new ApiError(404, 'Parent account not found');

    const nextBalance = Number(parent.gpBalance || 0) + amount;
    if (nextBalance > 1000000) {
      throw new ApiError(400, 'Parent GP balance cannot exceed 1000000');
    }

    await client.run('UPDATE parent_accounts SET gp_balance = ?, updated_at = ? WHERE id = ?', [
      nextBalance,
      new Date().toISOString(),
      parentId
    ]);

    await insertGpTransaction({
      db: client,
      parentId,
      points: amount,
      type: 'Credit',
      balanceType: 'ParentPool',
      referenceType: 'Purchase',
      moneyAmount: moneyAmount === null || moneyAmount === undefined ? null : String(moneyAmount).slice(0, 40),
      currency: currency ? sanitizeText(currency, 12).toUpperCase() : null,
      note
    });

    return { parentGpBalance: nextBalance };
  });
}

export async function reserveTaskGp({
  parentId,
  taskId,
  gpPoints,
  note = null,
  dbClient = null
}) {
  const db = dbClient || (await getDb());
  const amount = Number(gpPoints || 0);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new ApiError(400, 'Task GP allocation must be a whole number 0 or higher');
  }
  if (amount === 0) return { parentGpBalance: null };

  return withOptionalTransaction(db, dbClient, async (client) => {
    const parent = await client.get('SELECT id, gp_balance as gpBalance FROM parent_accounts WHERE id = ?', [parentId]);
    if (!parent) throw new ApiError(404, 'Parent account not found');
    if (Number(parent.gpBalance || 0) < amount) {
      throw new ApiError(400, 'Insufficient GP in parent wallet. Buy GP before allocating to tasks.');
    }

    const nextBalance = Number(parent.gpBalance || 0) - amount;
    await client.run('UPDATE parent_accounts SET gp_balance = ?, updated_at = ? WHERE id = ?', [
      nextBalance,
      new Date().toISOString(),
      parentId
    ]);

    await insertGpTransaction({
      db: client,
      parentId,
      points: amount,
      type: 'Debit',
      balanceType: 'ParentPool',
      referenceType: 'TaskAllocation',
      referenceId: taskId,
      note
    });

    return { parentGpBalance: nextBalance };
  });
}

export async function refundTaskGpToParent({
  parentId,
  taskId,
  gpPoints,
  note = null,
  dbClient = null
}) {
  const db = dbClient || (await getDb());
  const amount = Number(gpPoints || 0);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new ApiError(400, 'Task GP refund must be a whole number 0 or higher');
  }
  if (amount === 0) return { parentGpBalance: null };

  return withOptionalTransaction(db, dbClient, async (client) => {
    const parent = await client.get('SELECT id, gp_balance as gpBalance FROM parent_accounts WHERE id = ?', [parentId]);
    if (!parent) throw new ApiError(404, 'Parent account not found');

    const nextBalance = Number(parent.gpBalance || 0) + amount;
    if (nextBalance > 1000000) {
      throw new ApiError(400, 'Parent GP balance cannot exceed 1000000');
    }

    await client.run('UPDATE parent_accounts SET gp_balance = ?, updated_at = ? WHERE id = ?', [
      nextBalance,
      new Date().toISOString(),
      parentId
    ]);

    await insertGpTransaction({
      db: client,
      parentId,
      points: amount,
      type: 'Credit',
      balanceType: 'ParentPool',
      referenceType: 'TaskRefund',
      referenceId: taskId,
      note
    });

    return { parentGpBalance: nextBalance };
  });
}

export async function awardChildGp({
  parentId,
  childId,
  gpPoints,
  referenceType,
  referenceId = null,
  note = null,
  dbClient = null
}) {
  const db = dbClient || (await getDb());
  const amount = Number(gpPoints || 0);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new ApiError(400, 'Child GP award must be a whole number 0 or higher');
  }
  if (amount === 0) return { childGpBalance: null };

  return withOptionalTransaction(db, dbClient, async (client) => {
    const child = await client.get(
      'SELECT id, parent_id as parentId, giftcard_points_balance as giftcardPointsBalance FROM child_profiles WHERE id = ?',
      [childId]
    );
    if (!child || child.parentId !== parentId) throw new ApiError(404, 'Child not found');

    const nextBalance = Number(child.giftcardPointsBalance || 0) + amount;
    if (nextBalance > 100000) {
      throw new ApiError(400, 'Child GP balance cannot exceed 100000');
    }

    await client.run('UPDATE child_profiles SET giftcard_points_balance = ?, updated_at = ? WHERE id = ?', [
      nextBalance,
      new Date().toISOString(),
      childId
    ]);

    await insertGpTransaction({
      db: client,
      parentId,
      childId,
      points: amount,
      type: 'Credit',
      balanceType: 'ChildWallet',
      referenceType,
      referenceId,
      note
    });

    return { childGpBalance: nextBalance };
  });
}

export async function debitChildGp({
  parentId,
  childId,
  gpPoints,
  referenceType,
  referenceId = null,
  note = null,
  dbClient = null
}) {
  const db = dbClient || (await getDb());
  const amount = Number(gpPoints || 0);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new ApiError(400, 'Child GP debit must be a whole number 0 or higher');
  }
  if (amount === 0) return { childGpBalance: null };

  return withOptionalTransaction(db, dbClient, async (client) => {
    const child = await client.get(
      'SELECT id, parent_id as parentId, giftcard_points_balance as giftcardPointsBalance FROM child_profiles WHERE id = ?',
      [childId]
    );
    if (!child || child.parentId !== parentId) throw new ApiError(404, 'Child not found');
    if (Number(child.giftcardPointsBalance || 0) < amount) {
      throw new ApiError(400, 'Insufficient GP for this giftcard redemption');
    }

    const nextBalance = Number(child.giftcardPointsBalance || 0) - amount;
    await client.run('UPDATE child_profiles SET giftcard_points_balance = ?, updated_at = ? WHERE id = ?', [
      nextBalance,
      new Date().toISOString(),
      childId
    ]);

    await insertGpTransaction({
      db: client,
      parentId,
      childId,
      points: amount,
      type: 'Debit',
      balanceType: 'ChildWallet',
      referenceType,
      referenceId,
      note
    });

    return { childGpBalance: nextBalance };
  });
}

export async function listGpTransactions({ parentId, childId = null, limit = 100 }) {
  const db = await getDb();
  if (childId) {
    return db.all(
      `SELECT id,
              parent_id as parentId,
              child_id as childId,
              points,
              type,
              balance_type as balanceType,
              reference_type as referenceType,
              reference_id as referenceId,
              money_amount as moneyAmount,
              currency,
              note,
              created_at as createdAt
       FROM giftcard_points_transactions
       WHERE parent_id = ? AND child_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [parentId, childId, Math.min(Math.max(Number(limit) || 100, 1), 500)]
    );
  }
  return db.all(
    `SELECT id,
            parent_id as parentId,
            child_id as childId,
            points,
            type,
            balance_type as balanceType,
            reference_type as referenceType,
            reference_id as referenceId,
            money_amount as moneyAmount,
            currency,
            note,
            created_at as createdAt
     FROM giftcard_points_transactions
     WHERE parent_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [parentId, Math.min(Math.max(Number(limit) || 100, 1), 500)]
  );
}

export async function getGpSummaryForParent(parentId) {
  const db = await getDb();
  const parent = await db.get('SELECT id, gp_balance as gpBalance FROM parent_accounts WHERE id = ?', [parentId]);
  if (!parent) throw new ApiError(404, 'Parent account not found');

  const children = await db.all(
    `SELECT id, name, points_balance as rpBalance, giftcard_points_balance as gpBalance
     FROM child_profiles
     WHERE parent_id = ?
     ORDER BY created_at DESC`,
    [parentId]
  );

  return {
    parentGpBalance: Number(parent.gpBalance || 0),
    children: children.map((item) => ({
      id: item.id,
      name: item.name,
      rpBalance: Number(item.rpBalance || 0),
      gpBalance: Number(item.gpBalance || 0)
    }))
  };
}

