import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { encryptString, decryptString } from './cryptoService.js';
import { ApiError } from '../utils/errors.js';

/**
 * Add a batch of giftcard codes to the platform pool.
 * Called by admin.
 *
 * @param {string} adminId - parentId of the admin adding codes
 * @param {{ brand: string, denominationCents: number, currency?: string, label?: string, codes: Array<{code:string, pin?:string}> }} payload
 */
export async function addPlatformCodes(adminId, payload) {
  const { brand, denominationCents, currency = 'SGD', label, codes } = payload;

  if (!brand || typeof brand !== 'string' || !brand.trim()) {
    throw new ApiError(400, 'brand is required');
  }
  if (!Number.isInteger(denominationCents) || denominationCents <= 0) {
    throw new ApiError(400, 'denominationCents must be a positive integer (e.g. 1000 = S$10)');
  }
  if (!Array.isArray(codes) || codes.length === 0) {
    throw new ApiError(400, 'codes array must not be empty');
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const inserted = [];

  for (const entry of codes) {
    const rawCode = String(entry.code || '').trim();
    const rawPin  = entry.pin ? String(entry.pin).trim() : null;
    if (!rawCode) continue;

    const id = uuidv4();
    await db.run(
      `INSERT INTO platform_codes
         (id, brand, denomination_cents, currency, label, code_encrypted, pin_encrypted,
          status, created_by_admin_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, ?)`,
      [
        id,
        brand.trim().slice(0, 80),
        denominationCents,
        currency.toUpperCase().slice(0, 3),
        label ? label.trim().slice(0, 120) : null,
        encryptString(rawCode),
        rawPin ? encryptString(rawPin) : null,
        adminId,
        now,
        now
      ]
    );
    inserted.push({ id, brand, denominationCents, currency });
  }

  return { inserted: inserted.length, skipped: codes.length - inserted.length };
}

/**
 * List platform codes for the admin dashboard.
 * @param {{ brand?: string, status?: string, page?: number, limit?: number }} opts
 */
export async function listPlatformCodes({ brand, status, page = 1, limit = 50 } = {}) {
  const db = await getDb();
  const where = [];
  const params = [];

  if (brand) { where.push('pc.brand = ?'); params.push(brand); }
  if (status) { where.push('pc.status = ?'); params.push(status); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Math.max(1, page) - 1) * limit;

  const [{ total }] = await db.all(
    `SELECT COUNT(*) AS total FROM platform_codes pc ${whereClause}`,
    params
  );

  const rows = await db.all(
    `SELECT pc.id, pc.brand, pc.denomination_cents AS denominationCents,
            pc.currency, pc.label, pc.status,
            pc.assigned_child_id AS assignedChildId,
            cp.name AS assignedChildName,
            pc.assigned_at AS assignedAt,
            pc.created_at AS createdAt
     FROM platform_codes pc
     LEFT JOIN child_profiles cp ON cp.id = pc.assigned_child_id
     ${whereClause}
     ORDER BY pc.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Summary counts
  const summary = await db.all(
    `SELECT brand, status, COUNT(*) AS count, denomination_cents AS denominationCents
     FROM platform_codes
     GROUP BY brand, status, denomination_cents
     ORDER BY brand, denomination_cents`
  );

  return { codes: rows, total, page, limit, summary };
}

/**
 * Soft-remove an Available code (admins can't delete assigned codes).
 * @param {string} id
 */
export async function removePlatformCode(id) {
  const db = await getDb();
  const row = await db.get('SELECT status FROM platform_codes WHERE id = ?', [id]);
  if (!row) throw new ApiError(404, 'Code not found');
  if (row.status !== 'Available') throw new ApiError(409, 'Cannot remove a code that has already been assigned or is expired');

  await db.run(
    "UPDATE platform_codes SET status = 'Removed', updated_at = ? WHERE id = ?",
    [new Date().toISOString(), id]
  );
  return { ok: true };
}

/**
 * Auto-assign the best matching Available code to a child when they redeem a GP reward.
 * Matching: brand from reward.giftcard_brand, denomination from closest to gpCost.
 * Falls back to any Available code if no exact denomination match.
 *
 * @param {{ childId: string, redemptionId: string, brand?: string, denominationCents?: number }} opts
 * @returns {{ assigned: boolean, codeId?: string }}
 */
export async function autoAssignCode({ childId, redemptionId, brand, denominationCents }) {
  const db = await getDb();
  const now = new Date().toISOString();

  // Build a prioritised query — exact brand+denomination first, then brand only, then any
  let row = null;

  if (brand && denominationCents) {
    row = await db.get(
      `SELECT id FROM platform_codes WHERE status = 'Available' AND brand = ? AND denomination_cents = ? ORDER BY created_at ASC LIMIT 1`,
      [brand, denominationCents]
    );
  }
  if (!row && brand) {
    row = await db.get(
      `SELECT id FROM platform_codes WHERE status = 'Available' AND brand = ? ORDER BY denomination_cents ASC, created_at ASC LIMIT 1`,
      [brand]
    );
  }
  if (!row) {
    row = await db.get(
      `SELECT id FROM platform_codes WHERE status = 'Available' ORDER BY denomination_cents ASC, created_at ASC LIMIT 1`
    );
  }

  if (!row) return { assigned: false };

  await db.run(
    `UPDATE platform_codes
     SET status = 'Assigned', assigned_child_id = ?, assigned_redemption_id = ?, assigned_at = ?, updated_at = ?
     WHERE id = ? AND status = 'Available'`,
    [childId, redemptionId, now, now, row.id]
  );

  return { assigned: true, codeId: row.id };
}

/**
 * Get the decrypted code assigned to a child for a specific redemption.
 * Used by the child's "my codes" screen.
 * @param {string} childId
 * @returns {Array<{ id, brand, denominationCents, currency, label, code, pin, assignedAt }>}
 */
export async function getMyPlatformCodes(childId) {
  const db = await getDb();
  const rows = await db.all(
    `SELECT id, brand, denomination_cents AS denominationCents, currency, label,
            code_encrypted AS codeEncrypted, pin_encrypted AS pinEncrypted, assigned_at AS assignedAt
     FROM platform_codes
     WHERE assigned_child_id = ? AND status = 'Assigned'
     ORDER BY assigned_at DESC`,
    [childId]
  );

  return rows.map((r) => ({
    id:               r.id,
    brand:            r.brand,
    denominationCents: r.denominationCents,
    currency:         r.currency,
    label:            r.label,
    code:             decryptString(r.codeEncrypted),
    pin:              r.pinEncrypted ? decryptString(r.pinEncrypted) : null,
    assignedAt:       r.assignedAt
  }));
}
