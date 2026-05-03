-- Purchasable perks: child debits time_bank_minutes when requesting; parent approves or denies (refund on deny).

CREATE TABLE IF NOT EXISTS reward_requests (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  family_id TEXT NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  reward_title TEXT NOT NULL,
  cost_minutes INTEGER NOT NULL CHECK (cost_minutes > 0 AND cost_minutes <= 100000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_reward_requests_family_status
  ON reward_requests (family_id, status);

CREATE INDEX IF NOT EXISTS idx_reward_requests_child_status
  ON reward_requests (child_id, status);

COMMENT ON TABLE reward_requests IS 'Child-initiated reward purchases; minutes held until parent approves or refunds on deny.';
