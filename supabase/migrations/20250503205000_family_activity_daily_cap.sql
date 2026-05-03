-- Family economy: audit log, daily spend cap on children, and automatic log rows from time flows.
-- After reward_requests (20250503200000); before reward_requests_gift_card (20250503210000).

ALTER TABLE child_profiles
  ADD COLUMN IF NOT EXISTS daily_spend_limit INTEGER NOT NULL DEFAULT 0
  CHECK (daily_spend_limit >= 0 AND daily_spend_limit <= 10080);

COMMENT ON COLUMN child_profiles.daily_spend_limit IS 'Max minutes unlockable to apps per UTC calendar day; 0 = no limit.';

CREATE TABLE IF NOT EXISTS family_activity_logs (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  family_id TEXT NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('Earned', 'Spent', 'Unlocked')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_family_activity_logs_family_created
  ON family_activity_logs (family_id, created_at DESC);

COMMENT ON TABLE family_activity_logs IS 'Append-only family economy events for parent Command Center.';

CREATE OR REPLACE FUNCTION public.gt_log_family_activity(
  p_family_id text,
  p_actor_id text,
  p_action_type text,
  p_amount integer,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_family_id IS NULL OR btrim(p_family_id) = '' THEN
    RETURN;
  END IF;
  INSERT INTO public.family_activity_logs (family_id, actor_id, action_type, amount, description)
  VALUES (p_family_id, p_actor_id, p_action_type, p_amount, left(p_description, 2000));
END;
$$;

COMMENT ON FUNCTION public.gt_log_family_activity(text, text, text, integer, text) IS 'Inserts one family_activity_logs row; used by triggers.';

CREATE OR REPLACE FUNCTION public.gt_trg_log_task_time_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fid text;
  parent_actor text;
  child_name text;
BEGIN
  IF NEW.time_task_status IS DISTINCT FROM OLD.time_task_status
     AND NEW.time_task_status = 'approved'
     AND COALESCE(NEW.reward_minutes, 0) > 0 THEN
    SELECT cp.family_id::text, cp.parent_id::text, cp.name
    INTO fid, parent_actor, child_name
    FROM public.child_profiles cp
    WHERE cp.id = NEW.child_id;
    PERFORM public.gt_log_family_activity(
      fid,
      COALESCE(parent_actor, NEW.child_id::text),
      'Earned',
      NEW.reward_minutes,
      COALESCE(child_name, 'Child') || ' finished ' || COALESCE(NEW.title, 'a task') || ' (+' || NEW.reward_minutes::text || ' min)'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_log_time_approved ON public.tasks;
CREATE TRIGGER trg_tasks_log_time_approved
  AFTER UPDATE OF time_task_status ON public.tasks
  FOR EACH ROW
  EXECUTE PROCEDURE public.gt_trg_log_task_time_approved();

CREATE OR REPLACE FUNCTION public.gt_trg_log_app_allocation_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fid text;
  child_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.allocated_minutes > 0 THEN
    SELECT cp.family_id::text, cp.name
    INTO fid, child_name
    FROM public.child_profiles cp
    WHERE cp.id = NEW.child_id;
    PERFORM public.gt_log_family_activity(
      fid,
      NEW.child_id::text,
      'Unlocked',
      -NEW.allocated_minutes,
      COALESCE(child_name, 'Child') || ' unlocked ' || COALESCE(NEW.app_name, 'an app') || ' (-' || NEW.allocated_minutes::text || ' min)'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_allocations_log_unlocked ON public.app_allocations;
CREATE TRIGGER trg_app_allocations_log_unlocked
  AFTER INSERT ON public.app_allocations
  FOR EACH ROW
  EXECUTE PROCEDURE public.gt_trg_log_app_allocation_unlocked();

CREATE OR REPLACE FUNCTION public.gt_trg_log_reward_request_spent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  child_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.cost_minutes > 0 THEN
    SELECT cp.name INTO child_name
    FROM public.child_profiles cp
    WHERE cp.id = NEW.child_id;
    PERFORM public.gt_log_family_activity(
      NEW.family_id::text,
      NEW.child_id::text,
      'Spent',
      -NEW.cost_minutes,
      COALESCE(child_name, 'Child') || ' requested ' || COALESCE(NEW.reward_title, 'a reward') || ' (-' || NEW.cost_minutes::text || ' min)'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reward_requests_log_spent ON public.reward_requests;
CREATE TRIGGER trg_reward_requests_log_spent
  AFTER INSERT ON public.reward_requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.gt_trg_log_reward_request_spent();

GRANT EXECUTE ON FUNCTION public.gt_log_family_activity(text, text, text, integer, text) TO anon, authenticated;

ALTER TABLE public.family_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_activity_logs_parent_select ON public.family_activity_logs;
CREATE POLICY family_activity_logs_parent_select
  ON public.family_activity_logs
  FOR SELECT
  TO authenticated
  USING (family_id::text = public.gt_auth_parent_family_id());
