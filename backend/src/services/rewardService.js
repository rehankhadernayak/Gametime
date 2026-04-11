import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { ApiError } from '../utils/errors.js';
import { sanitizeText } from '../utils/sanitize.js';
import { adjustPoints } from './pointsService.js';
import { createNotification } from './notificationService.js';
import { redeemLinkedGiftcardReward } from './giftcardService.js';
import { awardChildGp, debitChildGp } from './giftcardPointsService.js';
import { autoAssignCode } from './platformCodesService.js';

export async function createReward(parentId, payload) {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = uuidv4();
  const title = sanitizeText(payload.title, 50);

  if (!title) throw new ApiError(400, 'Reward title cannot be empty');

  await db.run(
    `INSERT INTO rewards (id, parent_id, title, points_cost, points_type, quantity_limit, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, parentId, title, payload.pointsCost, payload.pointsType || 'RP', payload.quantityLimit ?? null, payload.active ? 1 : 0, now, now]
  );

  return { id };
}

export async function listRewards(parentId, childId = null) {
  const db = await getDb();
  const rewards = await db.all(
    `SELECT r.id,
            r.title,
            r.points_cost as pointsCost,
            r.points_type as pointsType,
            r.quantity_limit as quantityLimit,
            r.active,
            r.created_at as createdAt,
            r.updated_at as updatedAt,
            l.batch_id as giftcardBatchId,
            b.giftcard_name as giftcardName,
            b.sku_name as giftcardSkuName,
            b.quantity_available as giftcardStock
     FROM rewards r
     LEFT JOIN reward_giftcard_links l ON l.reward_id = r.id
     LEFT JOIN giftcard_inventory_batches b ON b.id = l.batch_id
     WHERE r.parent_id = ?
     ORDER BY r.created_at DESC`,
    [parentId]
  );

  const enriched = rewards.map((reward) => ({
    ...reward,
    active: Boolean(reward.active),
    isGiftcard: Boolean(reward.giftcardBatchId),
    giftcard: reward.giftcardBatchId
      ? {
          batchId: reward.giftcardBatchId,
          name: reward.giftcardName,
          sku: reward.giftcardSkuName,
          availableCodes: reward.giftcardStock
        }
      : null
  }));

  if (!childId) {
    return enriched;
  }

  const child = await db.get(
    `SELECT points_balance as rpBalance, giftcard_points_balance as gpBalance
     FROM child_profiles
     WHERE id = ? AND parent_id = ?`,
    [childId, parentId]
  );
  if (!child) throw new ApiError(404, 'Child not found');

  return enriched.map((reward) => ({
    ...reward,
    canAfford: reward.pointsType === 'GP'
      ? Number(child.gpBalance || 0) >= reward.pointsCost
      : Number(child.rpBalance || 0) >= reward.pointsCost
  }));
}

export async function redeemReward(childId, rewardId) {
  const db = await getDb();
  const reward = await db.get(
    `SELECT r.*, c.parent_id as parentId
     FROM rewards r
     JOIN child_profiles c ON c.id = ?
     WHERE r.id = ? AND r.parent_id = c.parent_id`,
    [childId, rewardId]
  );
  if (!reward) throw new ApiError(404, 'Reward not found');
  if (!reward.active) throw new ApiError(400, 'Reward is inactive');

  if (reward.quantity_limit !== null && reward.quantity_limit <= 0) {
    throw new ApiError(400, 'Reward is out of stock');
  }

  const child = await db.get(
    `SELECT points_balance as rpBalance, giftcard_points_balance as gpBalance
     FROM child_profiles
     WHERE id = ?`,
    [childId]
  );
  const isGpReward = reward.points_type === 'GP';
  if (isGpReward) {
    if (Number(child.gpBalance || 0) < reward.points_cost) {
      throw new ApiError(400, 'Insufficient points (GP) for this giftcard reward');
    }
  } else if (Number(child.rpBalance || 0) < reward.points_cost) {
    throw new ApiError(400, 'Insufficient points (RP) for this reward');
  }

  const now = new Date().toISOString();
  await db.exec('BEGIN');
  try {
    if (isGpReward) {
      await debitChildGp({
        parentId: reward.parentId,
        childId,
        gpPoints: reward.points_cost,
        referenceType: 'GiftcardRedemption',
        referenceId: rewardId,
        note: `GP redeemed for reward: ${reward.title}`,
        dbClient: db
      });
    } else {
      await adjustPoints({
        childId,
        points: -reward.points_cost,
        type: 'Debit',
        referenceType: 'Reward',
        referenceId: rewardId,
        dbClient: db
      });
    }

    const linkedGiftcard = await redeemLinkedGiftcardReward({
      dbClient: db,
      childId,
      reward
    });

    if (linkedGiftcard) {
      await createNotification('Parent', reward.parentId, `Giftcard reward auto-fulfilled: ${reward.title}`);
      await createNotification('Child', childId, `Giftcard delivered: ${reward.title}`);
      await db.exec('COMMIT');
      return {
        redemptionId: linkedGiftcard.redemptionId,
        fulfilled: true,
        delivery: 'Giftcard'
      };
    }

    if (reward.quantity_limit !== null) {
      await db.run('UPDATE rewards SET quantity_limit = quantity_limit - 1, updated_at = ? WHERE id = ?', [now, rewardId]);
    }

    const redemptionId = uuidv4();
    await db.run(
      `INSERT INTO redemptions (id, child_id, reward_id, redeemed_at, points_spent, points_type, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [redemptionId, childId, rewardId, now, reward.points_cost, reward.points_type || 'RP', now, now]
    );

    await createNotification('Parent', reward.parentId, `Reward redeemed and pending delivery: ${reward.title}`, 'reward_redeemed');
    await createNotification('Child', childId, `Reward redeemed: ${reward.title} (${reward.points_cost} ${isGpReward ? 'GP' : 'RP'})`, 'reward_redeemed');

    await db.exec('COMMIT');
    return { redemptionId, fulfilled: false };
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function fulfillRedemption(parentId, redemptionId) {
  const db = await getDb();
  const redemption = await db.get(
    `SELECT rd.*, rw.parent_id as parentId, rw.title
     FROM redemptions rd
     JOIN rewards rw ON rw.id = rd.reward_id
     WHERE rd.id = ?`,
    [redemptionId]
  );

  if (!redemption || redemption.parentId !== parentId) throw new ApiError(404, 'Redemption not found');
  if (redemption.status !== 'Pending') return { ignored: true, message: 'Redemption already resolved' };

  const now = new Date().toISOString();
  await db.run('UPDATE redemptions SET status = ?, updated_at = ? WHERE id = ?', ['Fulfilled', now, redemptionId]);

  // Try to auto-assign a platform giftcard code for GP rewards
  let assignedCode = null;
  if (redemption.points_type === 'GP') {
    const rewardRow = await db.get('SELECT giftcard_brand, giftcard_denomination_cents FROM rewards WHERE id = ?', [redemption.reward_id]);
    const assignment = await autoAssignCode({
      childId:          redemption.child_id,
      redemptionId,
      brand:            rewardRow?.giftcard_brand || undefined,
      denominationCents: rewardRow?.giftcard_denomination_cents || undefined
    });
    if (assignment.assigned) {
      assignedCode = assignment.codeId;
      await createNotification('Child', redemption.child_id, `Your ${redemption.title} giftcard code is ready! Check "My Codes" in the app.`, 'reward_fulfilled');
    } else {
      await createNotification('Child', redemption.child_id, `Reward fulfilled: ${redemption.title}`, 'reward_fulfilled');
    }
  } else {
    await createNotification('Child', redemption.child_id, `Reward fulfilled: ${redemption.title}`, 'reward_fulfilled');
  }

  return { ignored: false, assignedCode };
}

export async function deleteReward(parentId, rewardId) {
  const db = await getDb();
  const reward = await db.get('SELECT * FROM rewards WHERE id = ? AND parent_id = ?', [rewardId, parentId]);
  if (!reward) throw new ApiError(404, 'Reward not found');

  const pending = await db.all('SELECT * FROM redemptions WHERE reward_id = ? AND status = ?', [rewardId, 'Pending']);
  const giftcardLink = await db.get('SELECT batch_id as batchId FROM reward_giftcard_links WHERE reward_id = ?', [rewardId]);

  await db.exec('BEGIN');
  try {
    for (const redemption of pending) {
      if (redemption.points_type === 'GP') {
        await awardChildGp({
          parentId,
          childId: redemption.child_id,
          gpPoints: redemption.points_spent,
          referenceType: 'ManualAdjustment',
          referenceId: redemption.id,
          note: `Refunded GP for cancelled reward: ${reward.title}`,
          dbClient: db
        });
      } else {
        await adjustPoints({
          childId: redemption.child_id,
          points: redemption.points_spent,
          type: 'Credit',
          referenceType: 'Refund',
          referenceId: redemption.id,
          dbClient: db
        });
      }

      if (reward.quantity_limit !== null) {
        await db.run('UPDATE rewards SET quantity_limit = quantity_limit + 1, updated_at = ? WHERE id = ?', [
          new Date().toISOString(),
          rewardId
        ]);
      }

      await db.run('UPDATE redemptions SET status = ?, updated_at = ? WHERE id = ?', [
        'Cancelled',
        new Date().toISOString(),
        redemption.id
      ]);

      if (giftcardLink?.batchId) {
        const releaseResult = await db.run(
          `UPDATE giftcard_codes
           SET status = 'Available',
               assigned_redemption_id = NULL,
               assigned_child_id = NULL,
               assigned_at = NULL,
               updated_at = ?
           WHERE assigned_redemption_id = ? AND status = 'Assigned'`,
          [new Date().toISOString(), redemption.id]
        );

        if (releaseResult?.changes) {
          await db.run(
            `UPDATE giftcard_inventory_batches
             SET quantity_available = quantity_available + ?,
                 updated_at = ?
             WHERE id = ?`,
            [releaseResult.changes, new Date().toISOString(), giftcardLink.batchId]
          );
        }
      }

      await createNotification('Child', redemption.child_id, `Reward removed and points restored: ${reward.title}`);
    }

    await db.run('DELETE FROM rewards WHERE id = ?', [rewardId]);

    await db.exec('COMMIT');
    return { refundedCount: pending.length };
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}
