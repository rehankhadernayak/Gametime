-- Time Bank (child_profiles) + time-reward task fields + app_allocations
-- Note: Gametime uses `child_profiles` as the child "profile" table (not a separate `profiles` table).

-- Unspent earned screen time (minutes) for the child
ALTER TABLE child_profiles
  ADD COLUMN IF NOT EXISTS time_bank_minutes INTEGER NOT NULL DEFAULT 0
  CHECK (time_bank_minutes >= 0 AND time_bank_minutes <= 100000);

-- Optional: minutes granted when this task is approved (independent of existing `state` workflow)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS reward_minutes INTEGER NOT NULL DEFAULT 0
  CHECK (reward_minutes >= 0 AND reward_minutes <= 1440);

-- Simpler status for time-bank / screen-time task flows (use alongside `state` for full gametime lifecycle)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS time_task_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (time_task_status IN ('pending', 'approved', 'rejected'));

CREATE TABLE IF NOT EXISTS app_allocations (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  allocated_minutes INTEGER NOT NULL CHECK (allocated_minutes > 0 AND allocated_minutes <= 10080),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT,
  updated_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_allocations_child_status
  ON app_allocations (child_id, status);

COMMENT ON COLUMN child_profiles.time_bank_minutes IS 'Unspent earned screen-time minutes';
COMMENT ON COLUMN tasks.reward_minutes IS 'Minutes credited to time bank when time_task_status becomes approved';
COMMENT ON COLUMN tasks.time_task_status IS 'pending | approved | rejected for time-bank task semantics';
