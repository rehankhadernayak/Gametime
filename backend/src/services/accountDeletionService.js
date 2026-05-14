import { logger } from '../utils/logger.js';

/**
 * True when Postgres has the multi-tenant `families` table (Supabase migrations applied).
 */
export async function pgHasFamiliesModel(db) {
  const row = await db.get(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'families'`
  );
  return Boolean(row);
}

/**
 * Resolves the parent table name after optional rename (`parent_profiles` vs `parent_accounts`).
 */
export async function pgResolveParentTable(db) {
  const row = await db.get(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('parent_profiles', 'parent_accounts')
     ORDER BY CASE table_name WHEN 'parent_profiles' THEN 0 ELSE 1 END
     LIMIT 1`
  );
  return row?.name || 'parent_accounts';
}

/**
 * Returns family_id for the parent row, or null when the column or table layout is legacy-only.
 */
export async function pgGetFamilyIdForParent(db, parentTable, parentId) {
  const col = await db.get(
    `SELECT 1 AS ok FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ? AND column_name = 'family_id'`,
    [parentTable]
  );
  if (!col) return null;
  const row = await db.get(`SELECT family_id AS familyId FROM ${parentTable} WHERE id = ?`, [parentId]);
  const fid = row?.familyId != null ? String(row.familyId).trim() : '';
  return fid || null;
}

/**
 * Permanently removes one household: all children (by family_id), all parent profiles in that family,
 * then the `families` row. Uses a transaction. Caller must verify password first.
 */
export async function pgDeleteFamilyCascade(db, familyId, parentTable) {
  await db.withTransaction(async () => {
    const parents = await db.all(`SELECT id, email FROM ${parentTable} WHERE family_id = ?`, [familyId]);
    const parentIds = parents.map((p) => p.id);
    const childRows = await db.all('SELECT id FROM child_profiles WHERE family_id = ?', [familyId]);
    const childIds = childRows.map((c) => c.id);

    if (parentIds.length) {
      const placeholders = parentIds.map(() => '?').join(',');
      await db.run(`UPDATE sessions SET revoked = 1 WHERE parent_id IN (${placeholders})`, parentIds);
    }

    for (const pid of parentIds) {
      await db.run(
        `DELETE FROM notifications WHERE recipient_type = 'Parent' AND recipient_id = ?`,
        [pid]
      );
      await db.run(
        `DELETE FROM device_tokens WHERE recipient_type = 'Parent' AND recipient_id = ?`,
        [pid]
      );
    }
    for (const cid of childIds) {
      await db.run(
        `DELETE FROM notifications WHERE recipient_type = 'Child' AND recipient_id = ?`,
        [cid]
      );
      await db.run(
        `DELETE FROM device_tokens WHERE recipient_type = 'Child' AND recipient_id = ?`,
        [cid]
      );
    }

    if (parentIds.length) {
      const ph = parentIds.map(() => '?').join(',');
      await db.run(`DELETE FROM stripe_sessions WHERE parent_id IN (${ph})`, parentIds);
    }

    for (const p of parents) {
      const email = p.email != null ? String(p.email).toLowerCase().trim() : '';
      if (email) {
        await db.run('DELETE FROM failed_login_attempts WHERE identifier = ?', [`parent:${email}`]);
      }
    }

    await db.run('DELETE FROM child_profiles WHERE family_id = ?', [familyId]);
    await db.run(`DELETE FROM ${parentTable} WHERE family_id = ?`, [familyId]);
    await db.run('DELETE FROM families WHERE id = ?', [familyId]);

    logger.info({ familyId, parentCount: parentIds.length, childCount: childIds.length }, 'Family account deleted (cascade)');
  });
}

/**
 * Legacy single-parent delete (SQLite dev / Postgres without `families` table).
 */
export async function deleteSingleParentAccount(db, parentId, parentTable = 'parent_accounts') {
  await db.run('UPDATE sessions SET revoked = 1 WHERE parent_id = ?', [parentId]);
  await db.run(`DELETE FROM ${parentTable} WHERE id = ?`, [parentId]);
  logger.info({ parentId, parentTable }, 'Account deleted (single parent)');
}
