-- Optional reference image URL on tasks (parent-defined template for comparison in inbox UI).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reference_photo_url TEXT;

COMMENT ON COLUMN public.tasks.reference_photo_url IS 'Optional URL or data URL for parent reference photo when comparing child proof';

-- Per-child approval streak for Time Bank task flow (24h window between approvals).
CREATE TABLE IF NOT EXISTS public.child_streaks (
  child_id TEXT PRIMARY KEY REFERENCES public.child_profiles (id) ON DELETE CASCADE,
  streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0 AND streak_days <= 10000),
  last_approval_at TIMESTAMPTZ,
  bonus_milestones_rewarded TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT),
  updated_at TEXT NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::TEXT)
);

COMMENT ON TABLE public.child_streaks IS 'Tracks consecutive parent approvals within 24h for streak bonuses';
COMMENT ON COLUMN public.child_streaks.bonus_milestones_rewarded IS 'JSON array of milestone days (3,5,7) already credited with +10% bonus in current streak run';

CREATE INDEX IF NOT EXISTS idx_child_streaks_last_approval ON public.child_streaks (last_approval_at);

ALTER TABLE public.child_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS child_streaks_parent_all ON public.child_streaks;
CREATE POLICY child_streaks_parent_all
  ON public.child_streaks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles c
      WHERE c.id = child_streaks.child_id
        AND c.family_id::text = public.gt_auth_parent_family_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.child_profiles c
      WHERE c.id = child_streaks.child_id
        AND c.family_id::text = public.gt_auth_parent_family_id()
    )
  );

DROP POLICY IF EXISTS child_streaks_child_select ON public.child_streaks;
CREATE POLICY child_streaks_child_select
  ON public.child_streaks
  FOR SELECT
  TO authenticated
  USING (child_id::text = public.gt_auth_child_id());

-- Parents need to read pending evidence rows for inbox proof viewer.
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_completions_parent_select ON public.task_completions;
CREATE POLICY task_completions_parent_select
  ON public.task_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      INNER JOIN public.child_profiles c ON c.id = t.child_id
      WHERE t.id = task_completions.task_id
        AND c.family_id::text = public.gt_auth_parent_family_id()
    )
  );

DROP POLICY IF EXISTS task_completions_child_select ON public.task_completions;
CREATE POLICY task_completions_child_select
  ON public.task_completions
  FOR SELECT
  TO authenticated
  USING (child_id::text = public.gt_auth_child_id());
