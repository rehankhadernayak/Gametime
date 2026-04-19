import fs from 'fs';
import path from 'path';
import { getDb } from './connection.js';

async function ensureColumn(db, table, column, definition) {
  const columns = await db.all(`PRAGMA table_info(${table})`);
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

export async function initDb() {
  const db = await getDb();
  const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);

  await ensureColumn(db, 'task_completions', 'evidence_data', 'evidence_data TEXT');
  await ensureColumn(db, 'task_completions', 'evidence_mime', 'evidence_mime TEXT');
  await ensureColumn(db, 'task_completions', 'evidence_type', "evidence_type TEXT CHECK(evidence_type IN ('Photo','Video'))");
  await ensureColumn(db, 'task_completions', 'evidence_note', 'evidence_note TEXT');
  await ensureColumn(db, 'task_completions', 'parent_note', 'parent_note TEXT');
  await ensureColumn(db, 'task_completions', 'ai_recommendation', "ai_recommendation TEXT CHECK(ai_recommendation IN ('Approve','Reject','NeedsParentReview'))");
  await ensureColumn(db, 'task_completions', 'ai_confidence', 'ai_confidence REAL');
  await ensureColumn(db, 'task_completions', 'ai_reason', 'ai_reason TEXT');
  await ensureColumn(db, 'task_completions', 'ai_model', 'ai_model TEXT');
  await ensureColumn(db, 'task_completions', 'ai_analyzed_at', 'ai_analyzed_at TEXT');
  await ensureColumn(db, 'task_completions', 'ai_status', "ai_status TEXT CHECK(ai_status IN ('Completed','Unavailable','Error'))");
  await ensureColumn(db, 'task_completions', 'disputed', 'disputed INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'task_completions', 'dispute_note', 'dispute_note TEXT');
  await ensureColumn(db, 'task_completions', 'disputed_at', 'disputed_at TEXT');
  await ensureColumn(db, 'task_completions', 'resolved_at', 'resolved_at TEXT');
  await ensureColumn(db, 'child_profiles', 'email', 'email TEXT');
  await ensureColumn(db, 'child_profiles', 'password_hash', 'password_hash TEXT');
  await ensureColumn(db, 'child_profiles', 'pin_hash', 'pin_hash TEXT');
  await ensureColumn(
    db,
    'child_profiles',
    'giftcard_points_balance',
    'giftcard_points_balance INTEGER NOT NULL DEFAULT 0 CHECK(giftcard_points_balance >= 0 AND giftcard_points_balance <= 100000)'
  );
  await ensureColumn(
    db,
    'parent_accounts',
    'gp_balance',
    'gp_balance INTEGER NOT NULL DEFAULT 0 CHECK(gp_balance >= 0 AND gp_balance <= 1000000)'
  );
  await ensureColumn(db, 'parent_accounts', 'notification_preferences', 'notification_preferences TEXT');
  await ensureColumn(db, 'tasks', 'gp_points', 'gp_points INTEGER NOT NULL DEFAULT 0 CHECK(gp_points >= 0 AND gp_points <= 1000)');
  await ensureColumn(db, 'tasks', 'category', "category TEXT NOT NULL DEFAULT 'other'");
  await ensureColumn(db, 'tasks', 'recurrence_days', 'recurrence_days TEXT');
  await ensureColumn(db, 'rewards', 'points_type', "points_type TEXT NOT NULL DEFAULT 'RP' CHECK(points_type IN ('RP','GP'))");
  await ensureColumn(db, 'redemptions', 'points_type', "points_type TEXT NOT NULL DEFAULT 'RP' CHECK(points_type IN ('RP','GP'))");
  await ensureColumn(db, 'points_transactions', 'points_kind', "points_kind TEXT NOT NULL DEFAULT 'RP' CHECK(points_kind IN ('RP','GP'))");
  await ensureColumn(db, 'gaming_sessions', 'denial_code', 'denial_code TEXT');
  // Keep only the newest Started session per child before adding unique index.
  await db.exec(
    `DELETE FROM gaming_sessions
     WHERE status = 'Started'
       AND EXISTS (
         SELECT 1
         FROM gaming_sessions newer
         WHERE newer.child_id = gaming_sessions.child_id
           AND newer.status = 'Started'
           AND (
             newer.started_at > gaming_sessions.started_at
             OR (newer.started_at = gaming_sessions.started_at AND newer.id > gaming_sessions.id)
           )
       )`
  );
  await db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_gaming_started_session_per_child
     ON gaming_sessions(child_id)
     WHERE status = 'Started'`
  );
  await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_child_profiles_email_unique ON child_profiles(email) WHERE email IS NOT NULL');

  // Family AI memory - persistent key/value store per parent
  await db.exec(`
    CREATE TABLE IF NOT EXISTS family_ai_memory (
      id         TEXT PRIMARY KEY,
      parent_id  TEXT NOT NULL,
      key        TEXT NOT NULL,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(parent_id, key),
      FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE
    )
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_family_ai_memory_parent ON family_ai_memory(parent_id)');

  // AI assistant conversation history
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id         TEXT PRIMARY KEY,
      parent_id  TEXT NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_ai_messages_parent ON ai_messages(parent_id, created_at)');

  // Push notification device tokens
  await db.exec(`
    CREATE TABLE IF NOT EXISTS device_tokens (
      id             TEXT PRIMARY KEY,
      recipient_type TEXT NOT NULL CHECK(recipient_type IN ('Parent','Child')),
      recipient_id   TEXT NOT NULL,
      token          TEXT NOT NULL,
      platform       TEXT NOT NULL DEFAULT 'expo',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_device_tokens_recipient ON device_tokens(recipient_id, recipient_type)');

  // Failed login attempt tracking for brute-force lockout
  await db.exec(`
    CREATE TABLE IF NOT EXISTS failed_login_attempts (
      id           TEXT PRIMARY KEY,
      identifier   TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_failed_login_identifier ON failed_login_attempts(identifier, created_at)');

  // Purge attempts older than 1 hour on startup to keep the table lean
  await db.exec(`DELETE FROM failed_login_attempts WHERE created_at < datetime('now', '-1 hour')`);

  // Stripe Checkout session idempotency tracking
  await db.exec(`
    CREATE TABLE IF NOT EXISTS stripe_sessions (
      id           TEXT PRIMARY KEY,
      parent_id    TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TEXT NOT NULL,
      completed_at TEXT
    )
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_stripe_sessions_parent ON stripe_sessions(parent_id, created_at)');

  // Password reset tokens (1-hour TTL, single-use)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         TEXT PRIMARY KEY,
      parent_id  TEXT NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_prt_parent ON password_reset_tokens(parent_id, created_at)');
  await db.exec(`DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')`);

  // Child avatar support
  await ensureColumn(db, 'child_profiles', 'avatar_url', 'avatar_url TEXT');

  // Admin flag on parent accounts
  await ensureColumn(db, 'parent_accounts', 'is_admin', 'is_admin INTEGER NOT NULL DEFAULT 0');

  // Achievement streak tracking on child profiles
  await ensureColumn(db, 'child_profiles', 'current_streak_days', 'current_streak_days INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'child_profiles', 'last_completion_date', 'last_completion_date TEXT');

  // Achievement definitions (seeded once, never changes at runtime)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id          TEXT PRIMARY KEY,
      key         TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL,
      icon        TEXT NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('task_count','streak','points')),
      threshold   INTEGER NOT NULL
    )
  `);

  // Per-child unlock records
  await db.exec(`
    CREATE TABLE IF NOT EXISTS child_achievements (
      id             TEXT PRIMARY KEY,
      child_id       TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
      unlocked_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(child_id, achievement_id)
    )
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_child_achievements_child ON child_achievements(child_id)');

  // Optional giftcard metadata on rewards - used to match platform code pool on fulfillment
  await ensureColumn(db, 'rewards', 'giftcard_brand', 'giftcard_brand TEXT');
  await ensureColumn(db, 'rewards', 'giftcard_denomination_cents', 'giftcard_denomination_cents INTEGER');

  // Platform-managed giftcard code pool (admin adds codes, auto-assigned on GP redemption)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS platform_codes (
      id                    TEXT PRIMARY KEY,
      brand                 TEXT NOT NULL,
      denomination_cents    INTEGER NOT NULL CHECK(denomination_cents > 0),
      currency              TEXT NOT NULL DEFAULT 'SGD',
      label                 TEXT,
      code_encrypted        TEXT NOT NULL,
      pin_encrypted         TEXT,
      status                TEXT NOT NULL DEFAULT 'Available'
                                CHECK(status IN ('Available','Assigned','Expired','Removed')),
      assigned_child_id     TEXT,
      assigned_redemption_id TEXT UNIQUE,
      assigned_at           TEXT,
      created_by_admin_id   TEXT NOT NULL,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      FOREIGN KEY (assigned_child_id)     REFERENCES child_profiles(id) ON DELETE SET NULL
    )
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_platform_codes_status ON platform_codes(status, brand, denomination_cents)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_platform_codes_child  ON platform_codes(assigned_child_id)');

  // Seed achievements (INSERT OR IGNORE so re-runs are safe)
  await db.exec(`
    INSERT OR IGNORE INTO achievements (id, key, name, description, icon, type, threshold) VALUES
      ('ach_01', 'first_task',  'First Step',      'Complete your first task',           '1st', 'task_count', 1),
      ('ach_02', 'tasks_5',     'Getting Started',  'Complete 5 tasks',                   'x5',  'task_count', 5),
      ('ach_03', 'tasks_10',    'Taskmaster Jr.',   'Complete 10 tasks',                  'x10', 'task_count', 10),
      ('ach_04', 'tasks_25',    'Consistent',       'Complete 25 tasks',                  'x25', 'task_count', 25),
      ('ach_05', 'tasks_50',    'Half-Century',     'Complete 50 tasks',                  'x50', 'task_count', 50),
      ('ach_06', 'tasks_100',   'Century Club',     'Complete 100 tasks',                 '100', 'task_count', 100),
      ('ach_07', 'streak_3',    'Hat-Trick',        'Complete tasks 3 days in a row',     '3d',  'streak',     3),
      ('ach_08', 'streak_7',    'Week Warrior',     'Complete tasks 7 days in a row',     '7d',  'streak',     7),
      ('ach_09', 'streak_30',   'Unstoppable',      'Complete tasks 30 days in a row',    '30d', 'streak',     30),
      ('ach_10', 'points_100',  'Point Collector',  'Earn 100 Reward Points',             '100', 'points',     100),
      ('ach_11', 'points_500',  'High Scorer',      'Earn 500 Reward Points',             '500', 'points',     500),
      ('ach_12', 'points_1000', 'RP Legend',        'Earn 1000 Reward Points',            '1k',  'points',     1000)
  `);

  // Fix icon values for any existing rows that still have the old emoji icons
  await db.exec(`
    UPDATE achievements SET icon = '1st' WHERE id = 'ach_01' AND icon = '🌟';
    UPDATE achievements SET icon = 'x5'  WHERE id = 'ach_02' AND icon = '🔥';
    UPDATE achievements SET icon = 'x10' WHERE id = 'ach_03' AND icon = '💪';
    UPDATE achievements SET icon = 'x25' WHERE id = 'ach_04' AND icon = '🏅';
    UPDATE achievements SET icon = 'x50' WHERE id = 'ach_05' AND icon = '🥈';
    UPDATE achievements SET icon = '100' WHERE id = 'ach_06' AND icon = '🏆';
    UPDATE achievements SET icon = '3d'  WHERE id = 'ach_07' AND icon = '📅';
    UPDATE achievements SET icon = '7d'  WHERE id = 'ach_08' AND icon = '⚡';
    UPDATE achievements SET icon = '30d' WHERE id = 'ach_09' AND icon = '🌈';
    UPDATE achievements SET icon = '100' WHERE id = 'ach_10' AND icon = '💰';
    UPDATE achievements SET icon = '500' WHERE id = 'ach_11' AND icon = '💎';
    UPDATE achievements SET icon = '1k'  WHERE id = 'ach_12' AND icon = '👑';
  `);
}
