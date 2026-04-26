-- Gametime schema for PostgreSQL (Supabase). Matches SQLite semantics; IDs are TEXT UUIDs.

CREATE TABLE IF NOT EXISTS parent_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  gp_balance INTEGER NOT NULL DEFAULT 0 CHECK (gp_balance >= 0 AND gp_balance <= 1000000),
  notification_preferences TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS child_profiles (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  email TEXT,
  password_hash TEXT,
  pin_hash TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0 AND points_balance <= 10000),
  giftcard_points_balance INTEGER NOT NULL DEFAULT 0 CHECK (giftcard_points_balance >= 0 AND giftcard_points_balance <= 100000),
  avatar_url TEXT,
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  last_completion_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_child_profiles_email_unique ON child_profiles (email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points >= 5 AND points <= 50),
  gp_points INTEGER NOT NULL DEFAULT 0 CHECK (gp_points >= 0 AND gp_points <= 1000),
  state TEXT NOT NULL CHECK (state IN ('Draft','Active','PendingApproval','Approved','Rejected','Expired','Cancelled')),
  due_date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  recurrence_days TEXT,
  required_evidence_type TEXT CHECK (required_evidence_type IS NULL OR required_evidence_type IN ('Photo','Video')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completion_submitted_at TEXT,
  approved_at TEXT,
  rejected_at TEXT
);

CREATE TABLE IF NOT EXISTS task_requests (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requested_points INTEGER NOT NULL CHECK (requested_points >= 5 AND requested_points <= 50),
  status TEXT NOT NULL CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
  parent_note TEXT,
  linked_task_id TEXT REFERENCES tasks (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS task_completions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PendingApproval','Approved','Rejected')),
  evidence_data TEXT,
  evidence_mime TEXT,
  evidence_type TEXT CHECK (evidence_type IN ('Photo','Video')),
  evidence_note TEXT,
  parent_note TEXT,
  ai_recommendation TEXT CHECK (ai_recommendation IN ('Approve','Reject','NeedsParentReview')),
  ai_confidence DOUBLE PRECISION,
  ai_reason TEXT,
  ai_model TEXT,
  ai_analyzed_at TEXT,
  ai_status TEXT CHECK (ai_status IN ('Completed','Unavailable','Error')),
  disputed INTEGER NOT NULL DEFAULT 0,
  dispute_note TEXT,
  disputed_at TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (task_id, child_id)
);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  points_cost INTEGER NOT NULL CHECK (points_cost >= 5 AND points_cost <= 1000),
  points_type TEXT NOT NULL DEFAULT 'RP' CHECK (points_type IN ('RP','GP')),
  quantity_limit INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  giftcard_brand TEXT,
  giftcard_denomination_cents INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS redemptions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL REFERENCES rewards (id) ON DELETE CASCADE,
  redeemed_at TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  points_type TEXT NOT NULL DEFAULT 'RP' CHECK (points_type IN ('RP','GP')),
  status TEXT NOT NULL CHECK (status IN ('Pending','Fulfilled','Cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS points_transactions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  points_kind TEXT NOT NULL DEFAULT 'RP' CHECK (points_kind IN ('RP','GP')),
  type TEXT NOT NULL CHECK (type IN ('Credit','Debit')),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('Task','Reward','ManualAdjustment','Refund','GamingSession')),
  reference_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS giftcard_points_transactions (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  child_id TEXT REFERENCES child_profiles (id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points > 0),
  type TEXT NOT NULL CHECK (type IN ('Credit','Debit')),
  balance_type TEXT NOT NULL CHECK (balance_type IN ('ParentPool','ChildWallet')),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('Purchase','TaskAllocation','TaskReward','TaskRefund','GiftcardRedemption','ManualAdjustment')),
  reference_id TEXT,
  money_amount TEXT,
  currency TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('Parent','Child')),
  recipient_id TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS signup_verifications (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gaming_settings (
  parent_id TEXT PRIMARY KEY REFERENCES parent_accounts (id) ON DELETE CASCADE,
  points_unit INTEGER NOT NULL CHECK (points_unit >= 1 AND points_unit <= 200),
  minutes_unit INTEGER NOT NULL CHECK (minutes_unit >= 1 AND minutes_unit <= 240),
  daily_cap_minutes INTEGER NOT NULL CHECK (daily_cap_minutes >= 15 AND daily_cap_minutes <= 1440),
  weekly_cap_minutes INTEGER NOT NULL CHECK (weekly_cap_minutes >= 60 AND weekly_cap_minutes <= 10080),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gaming_games (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Blocked','Allowed')),
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (parent_id, name, platform)
);

CREATE TABLE IF NOT EXISTS gaming_sessions (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  game_id TEXT REFERENCES gaming_games (id) ON DELETE SET NULL,
  game_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Started','Completed','Denied')),
  denial_reason TEXT,
  denial_code TEXT,
  granted_minutes INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  source TEXT NOT NULL CHECK (source IN ('InApp','Import')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gaming_started_session_per_child ON gaming_sessions (child_id) WHERE status = 'Started';

CREATE TABLE IF NOT EXISTS giftcard_inventory_batches (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  merchant_order_request_id TEXT NOT NULL,
  athena_order_id TEXT,
  giftcard_id TEXT NOT NULL,
  giftcard_name TEXT NOT NULL,
  sku_id TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  fulfilment_type TEXT NOT NULL CHECK (fulfilment_type IN ('VOUCHER','TOPUP')),
  currency TEXT NOT NULL DEFAULT 'INR',
  quantity_purchased INTEGER NOT NULL CHECK (quantity_purchased >= 1),
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  status TEXT NOT NULL CHECK (status IN ('processing','completed','failed','cancelled')),
  invoice_amount TEXT,
  provider_payload_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (parent_id, merchant_order_request_id)
);

CREATE TABLE IF NOT EXISTS giftcard_codes (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES giftcard_inventory_batches (id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  code_encrypted TEXT NOT NULL,
  pin_encrypted TEXT,
  code_fingerprint TEXT NOT NULL,
  expiry_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('Available','Assigned','Expired')),
  assigned_redemption_id TEXT UNIQUE,
  assigned_child_id TEXT REFERENCES child_profiles (id) ON DELETE SET NULL,
  assigned_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (batch_id, code_fingerprint)
);

CREATE TABLE IF NOT EXISTS reward_giftcard_links (
  reward_id TEXT PRIMARY KEY REFERENCES rewards (id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL UNIQUE REFERENCES giftcard_inventory_batches (id) ON DELETE RESTRICT,
  auto_fulfill INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_ai_memory (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (parent_id, key)
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT
);

CREATE TABLE IF NOT EXISTS device_tokens (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('Parent','Child')),
  recipient_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'expo',
  created_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT,
  updated_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens (token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_recipient ON device_tokens (recipient_id, recipient_type);

CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT
);

CREATE TABLE IF NOT EXISTS stripe_sessions (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task_count','streak','points')),
  threshold INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS child_achievements (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements (id) ON DELETE CASCADE,
  unlocked_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT,
  UNIQUE (child_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS platform_codes (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  denomination_cents INTEGER NOT NULL CHECK (denomination_cents > 0),
  currency TEXT NOT NULL DEFAULT 'SGD',
  label TEXT,
  code_encrypted TEXT NOT NULL,
  pin_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Assigned','Expired','Removed')),
  assigned_child_id TEXT REFERENCES child_profiles (id) ON DELETE SET NULL,
  assigned_redemption_id TEXT UNIQUE,
  assigned_at TEXT,
  created_by_admin_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_child_state ON tasks (child_id, state);
CREATE INDEX IF NOT EXISTS idx_task_requests_parent_status ON task_requests (parent_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_task_requests_child_status ON task_requests (child_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, recipient_type, is_read);
CREATE INDEX IF NOT EXISTS idx_points_child ON points_transactions (child_id);
CREATE INDEX IF NOT EXISTS idx_gaming_games_parent ON gaming_games (parent_id, status);
CREATE INDEX IF NOT EXISTS idx_gaming_sessions_child ON gaming_sessions (child_id, started_at);
CREATE INDEX IF NOT EXISTS idx_gaming_sessions_parent ON gaming_sessions (parent_id, child_id, started_at);
CREATE INDEX IF NOT EXISTS idx_giftcard_batches_parent ON giftcard_inventory_batches (parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gp_transactions_parent ON giftcard_points_transactions (parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gp_transactions_child ON giftcard_points_transactions (child_id, created_at);
CREATE INDEX IF NOT EXISTS idx_giftcard_batches_status ON giftcard_inventory_batches (status);
CREATE INDEX IF NOT EXISTS idx_giftcard_codes_batch_status ON giftcard_codes (batch_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_giftcard_codes_redemption ON giftcard_codes (assigned_redemption_id);
CREATE INDEX IF NOT EXISTS idx_family_ai_memory_parent ON family_ai_memory (parent_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_parent ON ai_messages (parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_failed_login_identifier ON failed_login_attempts (identifier, created_at);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_parent ON stripe_sessions (parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prt_parent ON password_reset_tokens (parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_child_achievements_child ON child_achievements (child_id);
CREATE INDEX IF NOT EXISTS idx_platform_codes_status ON platform_codes (status, brand, denomination_cents);
CREATE INDEX IF NOT EXISTS idx_platform_codes_child ON platform_codes (assigned_child_id);

-- Seed achievements (idempotent)
INSERT INTO achievements (id, key, name, description, icon, type, threshold) VALUES
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
ON CONFLICT (id) DO NOTHING;

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

DELETE FROM failed_login_attempts
WHERE created_at::timestamptz < (NOW() AT TIME ZONE 'utc') - interval '1 hour';

DELETE FROM password_reset_tokens
WHERE expires_at::timestamptz < (NOW() AT TIME ZONE 'utc');

DELETE FROM gaming_sessions gs
WHERE gs.status = 'Started'
  AND EXISTS (
    SELECT 1 FROM gaming_sessions newer
    WHERE newer.child_id = gs.child_id
      AND newer.status = 'Started'
      AND (
        newer.started_at > gs.started_at
        OR (newer.started_at = gs.started_at AND newer.id > gs.id)
      )
  );
