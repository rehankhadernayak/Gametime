-- Serialized FamilyActivityPicker selection for native Screen Time shields (child device).
ALTER TABLE public.child_profiles
ADD COLUMN IF NOT EXISTS screen_time_selection TEXT;

COMMENT ON COLUMN public.child_profiles.screen_time_selection IS 'JSON string consumed by gametime-screen-time applyShield on iOS.';
