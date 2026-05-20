-- Store optional per-user feature permissions.
-- NULL keeps the legacy behavior: permissions are derived from system role and settlement role.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS permissions TEXT[];

COMMENT ON COLUMN public.user_profiles.permissions IS
  'Optional explicit app feature permissions. NULL means use role and settlement-role defaults.';

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;

CREATE POLICY "Users with profile view permission can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles actor
      WHERE actor.id = auth.uid()
        AND actor.status = 'active'
        AND (
          actor.role = 'admin'
          OR COALESCE(actor.permissions, ARRAY[]::TEXT[]) && ARRAY['manage_users','view_all_users']::TEXT[]
        )
    )
  );

CREATE POLICY "Users with create user permission can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles actor
      WHERE actor.id = auth.uid()
        AND actor.status = 'active'
        AND (
          actor.role = 'admin'
          OR COALESCE(actor.permissions, ARRAY[]::TEXT[]) && ARRAY['manage_users','create_users']::TEXT[]
        )
    )
  );

CREATE POLICY "Users with edit user permission can update profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles actor
      WHERE actor.id = auth.uid()
        AND actor.status = 'active'
        AND (
          actor.role = 'admin'
          OR COALESCE(actor.permissions, ARRAY[]::TEXT[]) && ARRAY['manage_users','edit_users','change_user_roles']::TEXT[]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles actor
      WHERE actor.id = auth.uid()
        AND actor.status = 'active'
        AND (
          actor.role = 'admin'
          OR COALESCE(actor.permissions, ARRAY[]::TEXT[]) && ARRAY['manage_users','edit_users','change_user_roles']::TEXT[]
        )
    )
  );

CREATE POLICY "Users with delete user permission can delete profiles"
  ON public.user_profiles
  FOR DELETE
  USING (
    id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles actor
      WHERE actor.id = auth.uid()
        AND actor.status = 'active'
        AND (
          actor.role = 'admin'
          OR COALESCE(actor.permissions, ARRAY[]::TEXT[]) && ARRAY['manage_users','delete_users']::TEXT[]
        )
    )
  );
