-- Optional parent-supplied code when approving gift-card reward requests.

ALTER TABLE reward_requests
  ADD COLUMN IF NOT EXISTS gift_card_code TEXT;

ALTER TABLE reward_requests
  ADD COLUMN IF NOT EXISTS reward_type TEXT NOT NULL DEFAULT 'Standard'
  CHECK (reward_type IN ('Standard', 'Gift Card'));

COMMENT ON COLUMN reward_requests.gift_card_code IS 'Set by parent on approval for Gift Card rewards; visible to child.';
COMMENT ON COLUMN reward_requests.reward_type IS 'Standard | Gift Card — drives approval UI and code entry.';
