#!/usr/bin/env node
/**
 * One-off seed: insert an approved mock gift card row for manual QA.
 *
 * Usage:
 *   cd backend && node scripts/seed-mock-reward-request.mjs <child_uuid>
 *   CHILD_ID=<uuid> node scripts/seed-mock-reward-request.mjs
 *
 * Requires DATABASE_URL or SUPABASE_DATABASE_URL (PostgreSQL).
 * Looks up family_id from child_profiles for the given child.
 */
import pg from 'pg';
import { randomUUID } from 'crypto';

const childId = (process.argv[2] || process.env.CHILD_ID || process.env.SEED_CHILD_ID || '').trim();
const conn = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || '';

if (!childId) {
  process.stderr.write(
    'Usage: node scripts/seed-mock-reward-request.mjs <child_id>\n' +
      '   or: CHILD_ID=<uuid> node scripts/seed-mock-reward-request.mjs\n',
  );
  process.exit(1);
}

if (!conn) {
  process.stderr.write('Missing DATABASE_URL or SUPABASE_DATABASE_URL.\n');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: conn });
const id = randomUUID();
const now = new Date().toISOString();
const title = 'Amazon $10 Gift Card';
const code = 'GIFT-TEST-CODE-2026';

try {
  const { rows } = await pool.query(
    `SELECT family_id FROM child_profiles WHERE id = $1 LIMIT 1`,
    [childId],
  );
  const familyId = rows[0]?.family_id?.trim?.() ?? rows[0]?.family_id;
  if (!familyId) {
    process.stderr.write(
      `No family_id on child_profiles for id=${childId}. Run family migrations / ensure profile is linked.\n`,
    );
    process.exit(1);
  }

  await pool.query(
    `INSERT INTO reward_requests (
       id, child_id, family_id, reward_title, cost_minutes, status,
       gift_card_code, reward_type, created_at
     )
     VALUES ($1, $2, $3, $4, 0, 'approved', $5, 'Gift Card', $6)`,
    [id, childId, familyId, title, code, now],
  );
  process.stdout.write(
    `Inserted reward_requests row ${id} for child ${childId}\n` +
      `  reward_title: ${title}\n` +
      `  gift_card_code: ${code}\n`,
  );
} catch (err) {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
} finally {
  await pool.end();
}
