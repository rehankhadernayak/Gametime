-- Purchasable perks: child debits time_bank_minutes when requesting; parent approves or denies (refund on deny).
-- Idempotent: upgrades legacy `reward_requests` tables created without family_id / cost_minutes (e.g. early
-- migration ordering or CREATE TABLE IF NOT EXISTS skipping when an older shape already existed).

CREATE TABLE IF NOT EXISTS reward_requests (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  family_id TEXT NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  reward_title TEXT NOT NULL,
  cost_minutes INTEGER NOT NULL CHECK (cost_minutes > 0 AND cost_minutes <= 100000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT)
);

-- ── Legacy repair (Preview / DBs that created an older reward_requests shape first) ─────────────
ALTER TABLE reward_requests ADD COLUMN IF NOT EXISTS family_id TEXT;
ALTER TABLE reward_requests ADD COLUMN IF NOT EXISTS cost_minutes INTEGER;

UPDATE reward_requests rr
SET family_id = cp.family_id
FROM child_profiles cp
WHERE rr.child_id = cp.id
  AND (rr.family_id IS NULL OR trim(rr.family_id) = '');

UPDATE reward_requests
SET cost_minutes = 1
WHERE cost_minutes IS NULL OR cost_minutes < 1;

UPDATE reward_requests
SET cost_minutes = 100000
WHERE cost_minutes > 100000;

-- Remove status/cost CHECK constraints so we can normalize values (rejected → denied) and re-apply canonical checks
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.reward_requests'::regclass
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%status%'
        OR pg_get_constraintdef(c.oid) ILIKE '%cost_minutes%'
      )
  LOOP
    EXECUTE format('ALTER TABLE reward_requests DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE reward_requests DROP CONSTRAINT IF EXISTS reward_requests_status_check;
ALTER TABLE reward_requests DROP CONSTRAINT IF EXISTS reward_requests_cost_minutes_check;

UPDATE reward_requests
SET status = 'denied'
WHERE lower(trim(status)) = 'rejected';

ALTER TABLE reward_requests
  ADD CONSTRAINT reward_requests_status_check CHECK (status IN ('pending', 'approved', 'denied'));

ALTER TABLE reward_requests
  ADD CONSTRAINT reward_requests_cost_minutes_check CHECK (cost_minutes > 0 AND cost_minutes <= 100000);

ALTER TABLE reward_requests ALTER COLUMN cost_minutes SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reward_requests WHERE family_id IS NULL OR trim(family_id) = ''
  ) THEN
    RAISE EXCEPTION 'reward_requests.family_id could not be backfilled — fix child_profiles.family_id first';
  END IF;
END $$;

ALTER TABLE reward_requests ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE reward_requests DROP CONSTRAINT IF EXISTS reward_requests_family_id_fkey;
ALTER TABLE reward_requests
  ADD CONSTRAINT reward_requests_family_id_fkey
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reward_requests_family_status
  ON reward_requests (family_id, status);

CREATE INDEX IF NOT EXISTS idx_reward_requests_child_status
  ON reward_requests (child_id, status);

COMMENT ON TABLE reward_requests IS 'Child-initiated reward purchases; minutes held until parent approves or refunds on deny.';
