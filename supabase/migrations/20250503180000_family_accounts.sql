-- Family Account model: one family, up to two parent slots (admin + co-parent), unlimited children.
-- Renames legacy `parent_accounts` to `parent_profiles` and links parents + children to `families`.
-- Idempotent: if `parent_profiles` already exists (rename done), only ensures `family_invites` exists.

-- ── Types ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parent_family_role') THEN
    CREATE TYPE parent_family_role AS ENUM ('admin', 'co-parent');
  END IF;
END$$;

-- ── Core tables ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  created_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT),
  updated_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT)
);

DO $migrate$
BEGIN
  -- Already applied (table renamed in a previous run)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'parent_profiles'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'parent_accounts'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'parent_accounts'
  ) THEN
    RAISE EXCEPTION 'family_accounts migration: expected public.parent_accounts (run base schema migration first)';
  END IF;

  ALTER TABLE parent_accounts
    ADD COLUMN IF NOT EXISTS family_id TEXT,
    ADD COLUMN IF NOT EXISTS role parent_family_role;

  UPDATE parent_accounts pa
  SET
    family_id = gen_random_uuid()::text,
    role = 'admin'::parent_family_role
  WHERE pa.family_id IS NULL;

  INSERT INTO families (id, created_at, updated_at)
  SELECT pa.family_id, pa.created_at, pa.updated_at
  FROM parent_accounts pa
  ON CONFLICT (id) DO NOTHING;

  ALTER TABLE parent_accounts
    ALTER COLUMN family_id SET NOT NULL,
    ALTER COLUMN role SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_parent_accounts_family'
  ) THEN
    ALTER TABLE parent_accounts
      ADD CONSTRAINT fk_parent_accounts_family
        FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE RESTRICT;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_parent_accounts_family_id ON parent_accounts (family_id);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_one_admin_per_family
    ON parent_accounts (family_id)
    WHERE role = 'admin';

  CREATE UNIQUE INDEX IF NOT EXISTS idx_one_coparent_per_family
    ON parent_accounts (family_id)
    WHERE role = 'co-parent';

  ALTER TABLE child_profiles
    ADD COLUMN IF NOT EXISTS family_id TEXT;

  UPDATE child_profiles cp
  SET family_id = pa.family_id
  FROM parent_accounts pa
  WHERE cp.parent_id = pa.id AND (cp.family_id IS NULL OR cp.family_id IS DISTINCT FROM pa.family_id);

  ALTER TABLE child_profiles
    ALTER COLUMN family_id SET NOT NULL;

  ALTER TABLE child_profiles
    DROP CONSTRAINT IF EXISTS fk_child_profiles_family;

  ALTER TABLE child_profiles
    ADD CONSTRAINT fk_child_profiles_family
      FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE;

  CREATE INDEX IF NOT EXISTS idx_child_profiles_family_id ON child_profiles (family_id);

  ALTER TABLE parent_accounts RENAME TO parent_profiles;

  ALTER INDEX IF EXISTS idx_parent_accounts_family_id RENAME TO idx_parent_profiles_family_id;
  ALTER INDEX IF EXISTS idx_one_admin_per_family RENAME TO idx_one_admin_per_family_parent_profiles;
  ALTER INDEX IF EXISTS idx_one_coparent_per_family RENAME TO idx_one_coparent_per_family_parent_profiles;

  ALTER TABLE parent_profiles RENAME CONSTRAINT fk_parent_accounts_family TO fk_parent_profiles_family;
END
$migrate$;

-- Invites for adding a child device to a family (short-lived 6-digit code).
CREATE TABLE IF NOT EXISTS family_invites (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  family_id TEXT NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  code CHAR(6) NOT NULL CHECK (code ~ '^[0-9]{6}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_invites_code ON family_invites (code);

CREATE INDEX IF NOT EXISTS idx_family_invites_family_expires
  ON family_invites (family_id, expires_at);

COMMENT ON TABLE families IS 'Household / billing unit; supports two parent_profiles (admin + co-parent) and N children.';
COMMENT ON COLUMN parent_profiles.role IS 'admin | co-parent — max one of each per family (partial unique indexes).';
COMMENT ON COLUMN child_profiles.family_id IS 'Household membership; mirrors parent family for the owning parent_id.';
COMMENT ON TABLE family_invites IS 'Short-lived numeric code to pair a child device with a family.';
