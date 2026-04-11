PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS parent_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  gp_balance INTEGER NOT NULL DEFAULT 0 CHECK(gp_balance >= 0 AND gp_balance <= 1000000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS child_profiles (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  pin_hash TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK(points_balance >= 0 AND points_balance <= 10000),
  giftcard_points_balance INTEGER NOT NULL DEFAULT 0 CHECK(giftcard_points_balance >= 0 AND giftcard_points_balance <= 100000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points INTEGER NOT NULL CHECK(points >= 5 AND points <= 50),
  gp_points INTEGER NOT NULL DEFAULT 0 CHECK(gp_points >= 0 AND gp_points <= 1000),
  state TEXT NOT NULL CHECK(state IN ('Draft','Active','PendingApproval','Approved','Rejected','Expired','Cancelled')),
  due_date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  recurrence_days TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completion_submitted_at TEXT,
  approved_at TEXT,
  rejected_at TEXT,
  FOREIGN KEY (child_id) REFERENCES child_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_requests (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  parent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requested_points INTEGER NOT NULL CHECK(requested_points >= 5 AND requested_points <= 50),
  status TEXT NOT NULL CHECK(status IN ('Pending','Approved','Rejected','Cancelled')),
  parent_note TEXT,
  linked_task_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (child_id) REFERENCES child_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_completions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PendingApproval','Approved','Rejected')),
  evidence_data TEXT,
  evidence_mime TEXT,
  evidence_type TEXT CHECK(evidence_type IN ('Photo','Video')),
  evidence_note TEXT,
  parent_note TEXT,
  ai_recommendation TEXT CHECK(ai_recommendation IN ('Approve','Reject','NeedsParentReview')),
  ai_confidence REAL,
  ai_reason TEXT,
  ai_model TEXT,
  ai_analyzed_at TEXT,
  ai_status TEXT CHECK(ai_status IN ('Completed','Unavailable','Error')),
  disputed INTEGER NOT NULL DEFAULT 0,
  dispute_note TEXT,
  disputed_at TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(task_id, child_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES child_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  points_cost INTEGER NOT NULL CHECK(points_cost >= 5 AND points_cost <= 1000),
  points_type TEXT NOT NULL DEFAULT 'RP' CHECK(points_type IN ('RP','GP')),
  quantity_limit INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS redemptions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  redeemed_at TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  points_type TEXT NOT NULL DEFAULT 'RP' CHECK(points_type IN ('RP','GP')),
  status TEXT NOT NULL CHECK(status IN ('Pending','Fulfilled','Cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES child_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS points_transactions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  points_kind TEXT NOT NULL DEFAULT 'RP' CHECK(points_kind IN ('RP','GP')),
  type TEXT NOT NULL CHECK(type IN ('Credit','Debit')),
  reference_type TEXT NOT NULL CHECK(reference_type IN ('Task','Reward','ManualAdjustment','Refund','GamingSession')),
  reference_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES child_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS giftcard_points_transactions (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  child_id TEXT,
  points INTEGER NOT NULL CHECK(points > 0),
  type TEXT NOT NULL CHECK(type IN ('Credit','Debit')),
  balance_type TEXT NOT NULL CHECK(balance_type IN ('ParentPool','ChildWallet')),
  reference_type TEXT NOT NULL CHECK(reference_type IN ('Purchase','TaskAllocation','TaskReward','TaskRefund','GiftcardRedemption','ManualAdjustment')),
  reference_id TEXT,
  money_amount TEXT,
  currency TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES child_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK(recipient_type IN ('Parent','Child')),
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
  parent_id TEXT PRIMARY KEY,
  points_unit INTEGER NOT NULL CHECK(points_unit >= 1 AND points_unit <= 200),
  minutes_unit INTEGER NOT NULL CHECK(minutes_unit >= 1 AND minutes_unit <= 240),
  daily_cap_minutes INTEGER NOT NULL CHECK(daily_cap_minutes >= 15 AND daily_cap_minutes <= 1440),
  weekly_cap_minutes INTEGER NOT NULL CHECK(weekly_cap_minutes >= 60 AND weekly_cap_minutes <= 10080),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gaming_games (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Blocked','Allowed')),
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE,
  UNIQUE(parent_id, name, platform)
);

CREATE TABLE IF NOT EXISTS gaming_sessions (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  game_id TEXT,
  game_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Started','Completed','Denied')),
  denial_reason TEXT,
  denial_code TEXT,
  granted_minutes INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  source TEXT NOT NULL CHECK(source IN ('InApp','Import')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES child_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES gaming_games(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS giftcard_inventory_batches (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  merchant_order_request_id TEXT NOT NULL,
  athena_order_id TEXT,
  giftcard_id TEXT NOT NULL,
  giftcard_name TEXT NOT NULL,
  sku_id TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  fulfilment_type TEXT NOT NULL CHECK(fulfilment_type IN ('VOUCHER','TOPUP')),
  currency TEXT NOT NULL DEFAULT 'INR',
  quantity_purchased INTEGER NOT NULL CHECK(quantity_purchased >= 1),
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK(quantity_available >= 0),
  status TEXT NOT NULL CHECK(status IN ('processing','completed','failed','cancelled')),
  invoice_amount TEXT,
  provider_payload_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(parent_id, merchant_order_request_id),
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS giftcard_codes (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  parent_id TEXT NOT NULL,
  code_encrypted TEXT NOT NULL,
  pin_encrypted TEXT,
  code_fingerprint TEXT NOT NULL,
  expiry_date TEXT,
  status TEXT NOT NULL CHECK(status IN ('Available','Assigned','Expired')),
  assigned_redemption_id TEXT UNIQUE,
  assigned_child_id TEXT,
  assigned_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES giftcard_inventory_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_child_id) REFERENCES child_profiles(id) ON DELETE SET NULL,
  UNIQUE(batch_id, code_fingerprint)
);

CREATE TABLE IF NOT EXISTS reward_giftcard_links (
  reward_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL UNIQUE,
  auto_fulfill INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES giftcard_inventory_batches(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_tasks_child_state ON tasks(child_id, state);
CREATE INDEX IF NOT EXISTS idx_task_requests_parent_status ON task_requests(parent_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_task_requests_child_status ON task_requests(child_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type, is_read);
CREATE INDEX IF NOT EXISTS idx_points_child ON points_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_gaming_games_parent ON gaming_games(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_gaming_sessions_child ON gaming_sessions(child_id, started_at);
CREATE INDEX IF NOT EXISTS idx_gaming_sessions_parent ON gaming_sessions(parent_id, child_id, started_at);
CREATE INDEX IF NOT EXISTS idx_giftcard_batches_parent ON giftcard_inventory_batches(parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gp_transactions_parent ON giftcard_points_transactions(parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gp_transactions_child ON giftcard_points_transactions(child_id, created_at);
CREATE INDEX IF NOT EXISTS idx_giftcard_batches_status ON giftcard_inventory_batches(status);
CREATE INDEX IF NOT EXISTS idx_giftcard_codes_batch_status ON giftcard_codes(batch_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_giftcard_codes_redemption ON giftcard_codes(assigned_redemption_id);
