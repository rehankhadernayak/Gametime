-- Gift card / reward handover requests (parent fulfills with code; child reveals when approved)

CREATE TABLE IF NOT EXISTS reward_requests (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  child_id TEXT NOT NULL REFERENCES child_profiles (id) ON DELETE CASCADE,
  reward_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  gift_card_code TEXT,
  created_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT),
  updated_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_reward_requests_child_status
  ON reward_requests (child_id, status, created_at DESC);

COMMENT ON TABLE reward_requests IS 'Parent-fulfilled rewards (e.g. gift cards); child sees code when status is approved.';

ALTER TABLE reward_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY reward_requests_child_select_own
  ON reward_requests FOR SELECT
  USING (
    coalesce(auth.jwt()->>'role', '') = 'child'
    AND coalesce(auth.jwt()->>'childId', '') = child_id
  );

CREATE POLICY reward_requests_parent_select_children
  ON reward_requests FOR SELECT
  USING (
    coalesce(auth.jwt()->>'role', '') = 'parent'
    AND EXISTS (
      SELECT 1 FROM child_profiles cp
      WHERE cp.id = reward_requests.child_id
        AND cp.parent_id = coalesce(auth.jwt()->>'parentId', '')
    )
  );

CREATE POLICY reward_requests_parent_update_children
  ON reward_requests FOR UPDATE
  USING (
    coalesce(auth.jwt()->>'role', '') = 'parent'
    AND EXISTS (
      SELECT 1 FROM child_profiles cp
      WHERE cp.id = reward_requests.child_id
        AND cp.parent_id = coalesce(auth.jwt()->>'parentId', '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM child_profiles cp
      WHERE cp.id = reward_requests.child_id
        AND cp.parent_id = coalesce(auth.jwt()->>'parentId', '')
    )
  );

GRANT SELECT, UPDATE ON reward_requests TO anon;
GRANT SELECT, UPDATE ON reward_requests TO authenticated;
