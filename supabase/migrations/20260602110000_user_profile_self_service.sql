-- Allow authenticated users to update only their own public profile fields.
-- Role, status, permissions, guide defaults, and languages remain admin-managed.

CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_profile public.user_profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_profiles
  SET
    full_name = CASE
      WHEN p_full_name IS NULL THEN full_name
      ELSE NULLIF(BTRIM(p_full_name), '')
    END,
    phone = CASE
      WHEN p_phone IS NULL THEN phone
      ELSE COALESCE(NULLIF(BTRIM(p_phone), ''), '')
    END,
    note = CASE
      WHEN p_note IS NULL THEN note
      ELSE COALESCE(NULLIF(BTRIM(p_note), ''), '')
    END,
    updated_at = NOW()
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_profile(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_profile(TEXT, TEXT, TEXT) TO authenticated;
