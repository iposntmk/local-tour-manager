-- Admin accounts derive full permissions from role; explicit arrays are only overrides for non-admin users.
UPDATE public.user_profiles
SET permissions = NULL,
    updated_at = NOW()
WHERE role = 'admin'
  AND permissions IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_permission(user_id UUID, required_permissions TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  is_admin BOOLEAN;
  has_perm BOOLEAN;
BEGIN
  SELECT
    (role = 'admin'),
    (COALESCE(permissions, ARRAY[]::TEXT[]) && required_permissions)
  INTO is_admin, has_perm
  FROM public.user_profiles
  WHERE id = user_id
    AND status = 'active';

  RETURN COALESCE(is_admin, false) OR COALESCE(has_perm, false);
END;
$$;
