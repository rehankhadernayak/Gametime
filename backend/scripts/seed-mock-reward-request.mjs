#!/usr/bin/env node
/**
 * One-off seed: insert an approved mock gift card row for manual QA.
 *
 * Usage:
 *   cd backend && node scripts/seed-mock-reward-request.mjs <child_uuid>
 *   CHILD_ID=<uuid> node scripts/seed-mock-reward-request.mjs
 *
 * Requires DATABASE_URL or SUPABASE_DATABASE_URL (PostgreSQL).
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
  await pool.query(
    `INSERT INTO reward_requests (id, child_id, reward_title, status, gift_card_code, created_at, updated_at)
     VALUES ($1, $2, $3, 'approved', $4, $5, $5)`,
    [id, childId, title, code, now],
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
