-- Server-side cascade delete for Apple "Right to be Forgotten" / family account deletion.
-- Called from the API with service role or from SQL admin tools. Validates caller is a family admin.

CREATE OR REPLACE FUNCTION public.delete_family_account(p_family_id text, p_actor_parent_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid text;
  cid text;
  email_lower text;
BEGIN
  IF p_family_id IS NULL OR trim(p_family_id) = '' THEN
    RAISE EXCEPTION 'family_id required';
  END IF;
  IF p_actor_parent_id IS NULL OR trim(p_actor_parent_id) = '' THEN
    RAISE EXCEPTION 'actor_parent_id required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.parent_profiles pp
    WHERE pp.id::text = trim(p_actor_parent_id)
      AND pp.family_id::text = trim(p_family_id)
      AND pp.role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden: only the family admin may delete the household';
  END IF;

  UPDATE public.sessions s
  SET revoked = 1
  WHERE s.parent_id::text = ANY (
    SELECT pp.id::text FROM public.parent_profiles pp WHERE pp.family_id::text = trim(p_family_id)
  );

  FOR pid IN
    SELECT pp.id::text FROM public.parent_profiles pp WHERE pp.family_id::text = trim(p_family_id)
  LOOP
    DELETE FROM public.notifications n
    WHERE n.recipient_type = 'Parent' AND n.recipient_id::text = pid;

    DELETE FROM public.device_tokens dt
    WHERE dt.recipient_type = 'Parent' AND dt.recipient_id::text = pid;
  END LOOP;

  FOR cid IN
    SELECT cp.id::text FROM public.child_profiles cp WHERE cp.family_id::text = trim(p_family_id)
  LOOP
    DELETE FROM public.notifications n
    WHERE n.recipient_type = 'Child' AND n.recipient_id::text = cid;

    DELETE FROM public.device_tokens dt
    WHERE dt.recipient_type = 'Child' AND dt.recipient_id::text = cid;
  END LOOP;

  DELETE FROM public.stripe_sessions ss
  WHERE ss.parent_id::text IN (
    SELECT pp.id::text FROM public.parent_profiles pp WHERE pp.family_id::text = trim(p_family_id)
  );

  FOR email_lower IN
    SELECT lower(trim(pp.email::text))
    FROM public.parent_profiles pp
    WHERE pp.family_id::text = trim(p_family_id)
      AND pp.email IS NOT NULL
      AND trim(pp.email::text) <> ''
  LOOP
    DELETE FROM public.failed_login_attempts f
    WHERE f.identifier = 'parent:' || email_lower;
  END LOOP;

  DELETE FROM public.child_profiles WHERE family_id::text = trim(p_family_id);
  DELETE FROM public.parent_profiles WHERE family_id::text = trim(p_family_id);
  DELETE FROM public.families WHERE id::text = trim(p_family_id);
END;
$$;

COMMENT ON FUNCTION public.delete_family_account(text, text) IS
  'Permanently removes a household: sessions revoked, notifications/device tokens cleared, then children, parents, and families row. Only callable when p_actor_parent_id is the family admin for p_family_id.';

REVOKE ALL ON FUNCTION public.delete_family_account(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_family_account(text, text) TO service_role;
