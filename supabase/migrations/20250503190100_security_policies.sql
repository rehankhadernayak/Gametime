-- Row Level Security for family-scoped tables (requires 20250503180000_family_accounts).
-- JWT identity: Supabase Auth users linked via parent_profiles.id / child_profiles.user_id (uuid text).

-- ── Helpers (SECURITY DEFINER avoids RLS recursion when policies reference profile tables) ──

CREATE OR REPLACE FUNCTION public.gt_jwt_sub()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim(auth.uid()::text), ''),
    NULLIF(trim((current_setting('request.jwt.claims', true)::json->>'sub')), '')
  );
$$;

COMMENT ON FUNCTION public.gt_jwt_sub() IS 'Supabase Auth subject from auth.uid() or PostgREST JWT claims.';

CREATE OR REPLACE FUNCTION public.gt_auth_parent_family_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pp.family_id::text
  FROM public.parent_profiles pp
  WHERE pp.id::text = public.gt_jwt_sub()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.gt_auth_parent_family_id() IS 'family_id for the current JWT if it matches parent_profiles.id.';

-- Must exist before SQL functions reference cp.user_id (Postgres validates columns at CREATE FUNCTION).
-- Links child_profiles rows to Supabase Auth users for child-scoped RLS.
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON public.child_profiles (user_id);

CREATE OR REPLACE FUNCTION public.gt_auth_child_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT cp.id::text
  FROM public.child_profiles cp
  WHERE cp.user_id IS NOT NULL
    AND cp.user_id::text = public.gt_jwt_sub()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.gt_auth_child_id() IS 'child_profiles.id for the current JWT if it matches child_profiles.user_id.';

CREATE OR REPLACE FUNCTION public.gt_auth_parent_is_family_admin(check_family_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_profiles pp
    WHERE pp.id::text = public.gt_jwt_sub()
      AND pp.family_id::text = check_family_id
      AND pp.role::text = 'admin'
  );
$$;

COMMENT ON FUNCTION public.gt_auth_parent_is_family_admin(text) IS 'True when JWT maps to this family parent_profiles row with role admin (family admin).';

CREATE OR REPLACE FUNCTION public.gt_request_family_invite_code()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    upper(trim(COALESCE(
      (current_setting('request.headers', true)::json->>'x-family-invite-code'),
      (current_setting('request.headers', true)::json->>'X-Family-Invite-Code')
    ))),
    ''
  );
$$;

COMMENT ON FUNCTION public.gt_request_family_invite_code() IS 'Client must send the invite code via x-family-invite-code header for unlinked invite lookup.';

-- Keep family_id consistent with parent_id on child_profiles (parents drive household membership).
CREATE OR REPLACE FUNCTION public.gt_sync_child_family_from_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fid text;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT p.family_id::text INTO fid
    FROM public.parent_profiles p
    WHERE p.id = NEW.parent_id;
    IF fid IS NULL THEN
      RAISE EXCEPTION 'parent_profiles row not found for parent_id %', NEW.parent_id;
    END IF;
    NEW.family_id := fid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_child_profiles_sync_family ON public.child_profiles;
CREATE TRIGGER trg_child_profiles_sync_family
  BEFORE INSERT OR UPDATE OF parent_id ON public.child_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.gt_sync_child_family_from_parent();

-- Enforce: children may only change time_bank_minutes and updated_at on their profile (defense in depth).
CREATE OR REPLACE FUNCTION public.gt_child_restrict_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'time_bank_minutes' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'time_bank_minutes' - 'updated_at') THEN
    RAISE EXCEPTION 'child_profiles: child sessions may only update time_bank_minutes and updated_at';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_child_profiles_child_update_guard ON public.child_profiles;
CREATE TRIGGER trg_child_profiles_child_update_guard
  BEFORE UPDATE ON public.child_profiles
  FOR EACH ROW
  WHEN (public.gt_auth_child_id() IS NOT NULL AND OLD.id::text = public.gt_auth_child_id())
  EXECUTE PROCEDURE public.gt_child_restrict_profile_update();

GRANT EXECUTE ON FUNCTION public.gt_jwt_sub() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gt_auth_parent_family_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gt_auth_child_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gt_auth_parent_is_family_admin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gt_request_family_invite_code() TO anon, authenticated;

-- ── Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- ── families ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS families_select_parent ON public.families;
CREATE POLICY families_select_parent
  ON public.families
  FOR SELECT
  TO authenticated
  USING (id::text = public.gt_auth_parent_family_id());

DROP POLICY IF EXISTS families_update_parent ON public.families;
CREATE POLICY families_update_parent
  ON public.families
  FOR UPDATE
  TO authenticated
  USING (id::text = public.gt_auth_parent_family_id())
  WITH CHECK (id::text = public.gt_auth_parent_family_id());

DROP POLICY IF EXISTS families_delete_family_admin ON public.families;
CREATE POLICY families_delete_family_admin
  ON public.families
  FOR DELETE
  TO authenticated
  USING (public.gt_auth_parent_is_family_admin(id::text));

-- ── parent_profiles ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS parent_profiles_parent_rw ON public.parent_profiles;
CREATE POLICY parent_profiles_parent_rw
  ON public.parent_profiles
  FOR ALL
  TO authenticated
  USING (family_id::text = public.gt_auth_parent_family_id())
  WITH CHECK (family_id::text = public.gt_auth_parent_family_id());

-- ── child_profiles ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS child_profiles_parent_all ON public.child_profiles;
CREATE POLICY child_profiles_parent_all
  ON public.child_profiles
  FOR ALL
  TO authenticated
  USING (family_id::text = public.gt_auth_parent_family_id())
  WITH CHECK (family_id::text = public.gt_auth_parent_family_id());

DROP POLICY IF EXISTS child_profiles_child_select_self ON public.child_profiles;
CREATE POLICY child_profiles_child_select_self
  ON public.child_profiles
  FOR SELECT
  TO authenticated
  USING (id::text = public.gt_auth_child_id());

DROP POLICY IF EXISTS child_profiles_child_update_time_bank ON public.child_profiles;
CREATE POLICY child_profiles_child_update_time_bank
  ON public.child_profiles
  FOR UPDATE
  TO authenticated
  USING (id::text = public.gt_auth_child_id())
  WITH CHECK (id::text = public.gt_auth_child_id());

-- ── app_allocations ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS app_allocations_parent_all ON public.app_allocations;
CREATE POLICY app_allocations_parent_all
  ON public.app_allocations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles c
      WHERE c.id = app_allocations.child_id
        AND c.family_id::text = public.gt_auth_parent_family_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.child_profiles c
      WHERE c.id = app_allocations.child_id
        AND c.family_id::text = public.gt_auth_parent_family_id()
    )
  );

DROP POLICY IF EXISTS app_allocations_child_select ON public.app_allocations;
CREATE POLICY app_allocations_child_select
  ON public.app_allocations
  FOR SELECT
  TO authenticated
  USING (child_id::text = public.gt_auth_child_id());

DROP POLICY IF EXISTS app_allocations_child_insert ON public.app_allocations;
CREATE POLICY app_allocations_child_insert
  ON public.app_allocations
  FOR INSERT
  TO authenticated
  WITH CHECK (child_id::text = public.gt_auth_child_id());

-- ── tasks ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS tasks_parent_all ON public.tasks;
CREATE POLICY tasks_parent_all
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles c
      WHERE c.id = tasks.child_id
        AND c.family_id::text = public.gt_auth_parent_family_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.child_profiles c
      WHERE c.id = tasks.child_id
        AND c.family_id::text = public.gt_auth_parent_family_id()
    )
  );

DROP POLICY IF EXISTS tasks_child_rw ON public.tasks;
CREATE POLICY tasks_child_rw
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (child_id::text = public.gt_auth_child_id())
  WITH CHECK (child_id::text = public.gt_auth_child_id());

-- ── family_invites ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS family_invites_parent_all ON public.family_invites;
CREATE POLICY family_invites_parent_all
  ON public.family_invites
  FOR ALL
  TO authenticated
  USING (family_id::text = public.gt_auth_parent_family_id())
  WITH CHECK (family_id::text = public.gt_auth_parent_family_id());

DROP POLICY IF EXISTS family_invites_anon_read_by_code ON public.family_invites;
CREATE POLICY family_invites_anon_read_by_code
  ON public.family_invites
  FOR SELECT
  TO anon, authenticated
  USING (
    public.gt_request_family_invite_code() IS NOT NULL
    AND code::text = public.gt_request_family_invite_code()
    AND expires_at > (NOW() AT TIME ZONE 'utc')
  );
