drop extension if exists "pg_net";


  create table "public"."child_streaks" (
    "child_id" text not null,
    "streak_days" integer not null default 0,
    "last_approval_at" timestamp with time zone,
    "bonus_milestones_rewarded" text not null default '[]'::text,
    "created_at" text not null default ((now() AT TIME ZONE 'UTC'::text))::text,
    "updated_at" text not null default ((now() AT TIME ZONE 'UTC'::text))::text
      );


alter table "public"."child_streaks" enable row level security;

alter table "public"."app_allocations" enable row level security;

alter table "public"."child_profiles" add column "user_id" uuid;

alter table "public"."child_profiles" enable row level security;

alter table "public"."families" enable row level security;

alter table "public"."family_invites" enable row level security;

alter table "public"."parent_profiles" enable row level security;

alter table "public"."task_completions" enable row level security;

alter table "public"."tasks" add column "reference_photo_url" text;

alter table "public"."tasks" enable row level security;

CREATE UNIQUE INDEX child_profiles_user_id_key ON public.child_profiles USING btree (user_id);

CREATE UNIQUE INDEX child_streaks_pkey ON public.child_streaks USING btree (child_id);

CREATE INDEX idx_child_profiles_user_id ON public.child_profiles USING btree (user_id);

CREATE INDEX idx_child_streaks_last_approval ON public.child_streaks USING btree (last_approval_at);

alter table "public"."child_streaks" add constraint "child_streaks_pkey" PRIMARY KEY using index "child_streaks_pkey";

alter table "public"."child_profiles" add constraint "child_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."child_profiles" validate constraint "child_profiles_user_id_fkey";

alter table "public"."child_profiles" add constraint "child_profiles_user_id_key" UNIQUE using index "child_profiles_user_id_key";

alter table "public"."child_streaks" add constraint "child_streaks_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.child_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."child_streaks" validate constraint "child_streaks_child_id_fkey";

alter table "public"."child_streaks" add constraint "child_streaks_streak_days_check" CHECK (((streak_days >= 0) AND (streak_days <= 10000))) not valid;

alter table "public"."child_streaks" validate constraint "child_streaks_streak_days_check";

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


  create policy "app_allocations_child_insert"
  on "public"."app_allocations"
  as permissive
  for insert
  to authenticated
with check ((child_id = public.gt_auth_child_id()));



  create policy "app_allocations_child_select"
  on "public"."app_allocations"
  as permissive
  for select
  to authenticated
using ((child_id = public.gt_auth_child_id()));



  create policy "app_allocations_parent_all"
  on "public"."app_allocations"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.child_profiles c
  WHERE ((c.id = app_allocations.child_id) AND (c.family_id = public.gt_auth_parent_family_id())))))
with check ((EXISTS ( SELECT 1
   FROM public.child_profiles c
  WHERE ((c.id = app_allocations.child_id) AND (c.family_id = public.gt_auth_parent_family_id())))));



  create policy "child_profiles_child_select_self"
  on "public"."child_profiles"
  as permissive
  for select
  to authenticated
using ((id = public.gt_auth_child_id()));



  create policy "child_profiles_child_update_time_bank"
  on "public"."child_profiles"
  as permissive
  for update
  to authenticated
using ((id = public.gt_auth_child_id()))
with check ((id = public.gt_auth_child_id()));



  create policy "child_profiles_parent_all"
  on "public"."child_profiles"
  as permissive
  for all
  to authenticated
using ((family_id = public.gt_auth_parent_family_id()))
with check ((family_id = public.gt_auth_parent_family_id()));



  create policy "child_streaks_child_select"
  on "public"."child_streaks"
  as permissive
  for select
  to authenticated
using ((child_id = public.gt_auth_child_id()));



  create policy "child_streaks_parent_all"
  on "public"."child_streaks"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.child_profiles c
  WHERE ((c.id = child_streaks.child_id) AND (c.family_id = public.gt_auth_parent_family_id())))))
with check ((EXISTS ( SELECT 1
   FROM public.child_profiles c
  WHERE ((c.id = child_streaks.child_id) AND (c.family_id = public.gt_auth_parent_family_id())))));



  create policy "families_delete_family_admin"
  on "public"."families"
  as permissive
  for delete
  to authenticated
using (public.gt_auth_parent_is_family_admin(id));



  create policy "families_select_parent"
  on "public"."families"
  as permissive
  for select
  to authenticated
using ((id = public.gt_auth_parent_family_id()));



  create policy "families_update_parent"
  on "public"."families"
  as permissive
  for update
  to authenticated
using ((id = public.gt_auth_parent_family_id()))
with check ((id = public.gt_auth_parent_family_id()));



  create policy "family_invites_anon_read_by_code"
  on "public"."family_invites"
  as permissive
  for select
  to anon, authenticated
using (((public.gt_request_family_invite_code() IS NOT NULL) AND ((code)::text = public.gt_request_family_invite_code()) AND (expires_at > (now() AT TIME ZONE 'utc'::text))));



  create policy "family_invites_parent_all"
  on "public"."family_invites"
  as permissive
  for all
  to authenticated
using ((family_id = public.gt_auth_parent_family_id()))
with check ((family_id = public.gt_auth_parent_family_id()));



  create policy "parent_profiles_parent_rw"
  on "public"."parent_profiles"
  as permissive
  for all
  to authenticated
using ((family_id = public.gt_auth_parent_family_id()))
with check ((family_id = public.gt_auth_parent_family_id()));



  create policy "task_completions_child_select"
  on "public"."task_completions"
  as permissive
  for select
  to authenticated
using ((child_id = public.gt_auth_child_id()));



  create policy "task_completions_parent_select"
  on "public"."task_completions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.tasks t
     JOIN public.child_profiles c ON ((c.id = t.child_id)))
  WHERE ((t.id = task_completions.task_id) AND (c.family_id = public.gt_auth_parent_family_id())))));



  create policy "tasks_child_rw"
  on "public"."tasks"
  as permissive
  for all
  to authenticated
using ((child_id = public.gt_auth_child_id()))
with check ((child_id = public.gt_auth_child_id()));



  create policy "tasks_parent_all"
  on "public"."tasks"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.child_profiles c
  WHERE ((c.id = tasks.child_id) AND (c.family_id = public.gt_auth_parent_family_id())))))
with check ((EXISTS ( SELECT 1
   FROM public.child_profiles c
  WHERE ((c.id = tasks.child_id) AND (c.family_id = public.gt_auth_parent_family_id())))));


CREATE TRIGGER trg_child_profiles_child_update_guard BEFORE UPDATE ON public.child_profiles FOR EACH ROW WHEN (((public.gt_auth_child_id() IS NOT NULL) AND (old.id = public.gt_auth_child_id()))) EXECUTE FUNCTION public.gt_child_restrict_profile_update();

CREATE TRIGGER trg_child_profiles_sync_family BEFORE INSERT OR UPDATE OF parent_id ON public.child_profiles FOR EACH ROW EXECUTE FUNCTION public.gt_sync_child_family_from_parent();


