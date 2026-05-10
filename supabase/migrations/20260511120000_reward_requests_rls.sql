-- Row Level Security for reward_requests (PostgREST / Supabase clients).
-- Parents: full access within their family. Children: read own rows; insert only as self with matching family_id.

ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_requests_parent_all ON public.reward_requests;
CREATE POLICY reward_requests_parent_all
  ON public.reward_requests
  FOR ALL
  TO authenticated
  USING (family_id::text = public.gt_auth_parent_family_id())
  WITH CHECK (family_id::text = public.gt_auth_parent_family_id());

DROP POLICY IF EXISTS reward_requests_child_select ON public.reward_requests;
CREATE POLICY reward_requests_child_select
  ON public.reward_requests
  FOR SELECT
  TO authenticated
  USING (child_id::text = public.gt_auth_child_id());

DROP POLICY IF EXISTS reward_requests_child_insert ON public.reward_requests;
CREATE POLICY reward_requests_child_insert
  ON public.reward_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    child_id::text = public.gt_auth_child_id()
    AND family_id::text = (
      SELECT cp.family_id::text
      FROM public.child_profiles cp
      WHERE cp.id::text = public.gt_auth_child_id()
      LIMIT 1
    )
  );
