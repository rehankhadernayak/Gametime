drop extension if exists "pg_net";

-- Idempotent with incremental migrations (e.g. child_streaks from 20250503220000).
CREATE TABLE IF NOT EXISTS public.child_streaks (
  child_id text NOT NULL,
  streak_days integer NOT NULL DEFAULT 0,
  last_approval_at timestamp with time zone,
  bonus_milestones_rewarded text NOT NULL DEFAULT '[]'::text,
  created_at text NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC'::text))::text,
  updated_at text NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC'::text))::text
);

ALTER TABLE public.child_streaks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.app_allocations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.child_profiles ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reference_photo_url text;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS child_profiles_user_id_key ON public.child_profiles USING btree (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS child_streaks_pkey ON public.child_streaks USING btree (child_id);

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON public.child_profiles USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_child_streaks_last_approval ON public.child_streaks USING btree (last_approval_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND rel.relname = 'child_streaks'
      AND c.contype = 'p'
  ) THEN
    ALTER TABLE public.child_streaks ADD CONSTRAINT child_streaks_pkey PRIMARY KEY USING INDEX child_streaks_pkey;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.child_profiles ADD CONSTRAINT child_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.child_profiles VALIDATE CONSTRAINT child_profiles_user_id_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.child_profiles ADD CONSTRAINT child_profiles_user_id_key UNIQUE USING INDEX child_profiles_user_id_key;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.child_streaks ADD CONSTRAINT child_streaks_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.child_profiles(id) ON DELETE CASCADE NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.child_streaks VALIDATE CONSTRAINT child_streaks_child_id_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.child_streaks ADD CONSTRAINT child_streaks_streak_days_check CHECK (((streak_days >= 0) AND (streak_days <= 10000))) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.child_streaks VALIDATE CONSTRAINT child_streaks_streak_days_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.gt_auth_child_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT cp.id::text
  FROM public.child_profiles cp
  WHERE cp.user_id IS NOT NULL
    AND cp.user_id::text = public.gt_jwt_sub()
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.gt_auth_parent_family_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pp.family_id::text
  FROM public.parent_profiles pp
  WHERE pp.id::text = public.gt_jwt_sub()
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.gt_auth_parent_is_family_admin(check_family_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_profiles pp
    WHERE pp.id::text = public.gt_jwt_sub()
      AND pp.family_id::text = check_family_id
      AND pp.role::text = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.gt_child_restrict_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (to_jsonb(NEW) - 'time_bank_minutes' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'time_bank_minutes' - 'updated_at') THEN
    RAISE EXCEPTION 'child_profiles: child sessions may only update time_bank_minutes and updated_at';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gt_jwt_sub()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    NULLIF(trim(auth.uid()::text), ''),
    NULLIF(trim((current_setting('request.jwt.claims', true)::json->>'sub')), '')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.gt_request_family_invite_code()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT NULLIF(
    upper(trim(COALESCE(
      (current_setting('request.headers', true)::json->>'x-family-invite-code'),
      (current_setting('request.headers', true)::json->>'X-Family-Invite-Code')
    ))),
    ''
  );
$function$
;

CREATE OR REPLACE FUNCTION public.gt_sync_child_family_from_parent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

grant delete on table "public"."child_streaks" to "anon";

grant insert on table "public"."child_streaks" to "anon";

grant references on table "public"."child_streaks" to "anon";

grant select on table "public"."child_streaks" to "anon";

grant trigger on table "public"."child_streaks" to "anon";

grant truncate on table "public"."child_streaks" to "anon";

grant update on table "public"."child_streaks" to "anon";

grant delete on table "public"."child_streaks" to "authenticated";

grant insert on table "public"."child_streaks" to "authenticated";

grant references on table "public"."child_streaks" to "authenticated";

grant select on table "public"."child_streaks" to "authenticated";

grant trigger on table "public"."child_streaks" to "authenticated";

grant truncate on table "public"."child_streaks" to "authenticated";

grant update on table "public"."child_streaks" to "authenticated";

grant delete on table "public"."child_streaks" to "service_role";

grant insert on table "public"."child_streaks" to "service_role";

grant references on table "public"."child_streaks" to "service_role";

grant select on table "public"."child_streaks" to "service_role";

grant trigger on table "public"."child_streaks" to "service_role";

grant truncate on table "public"."child_streaks" to "service_role";

grant update on table "public"."child_streaks" to "service_role";

-- RLS policies and child_profiles triggers are defined in earlier migrations:
-- 20250503190100_security_policies.sql, 20250503220000_child_streaks_reference_photo.sql.
-- The dashboard snapshot previously duplicated those CREATE POLICY / CREATE TRIGGER statements here.
