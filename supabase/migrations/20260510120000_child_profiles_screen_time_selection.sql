-- Opaque FamilyControls selection payload (JSON) for iOS Screen Time blocking; written by parent, read by child device.
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS screen_time_selection TEXT;

COMMENT ON COLUMN public.child_profiles.screen_time_selection IS 'Opaque Screen Time FamilyControls encoded selection (JSON string); parent configures on iOS, child retrieves for shields.';
