-- Drop all existing policies on user_profiles to clean up and prevent conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users with profile view permission can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users with create user permission can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users with edit user permission can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users with delete user permission can delete profiles" ON public.user_profiles;

-- Create SECURITY DEFINER function to check permissions without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.check_user_permission(user_id UUID, required_permissions TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  has_perm BOOLEAN;
BEGIN
  -- Query user_profiles directly. Since this function is SECURITY DEFINER, it runs with bypass_rls (as table owner)
  SELECT 
    (role = 'admin'),
    (COALESCE(permissions, ARRAY[]::TEXT[]) && required_permissions)
  INTO is_admin, has_perm
  FROM public.user_profiles
  WHERE id = user_id AND status = 'active';

  RETURN COALESCE(is_admin, false) OR COALESCE(has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 1. Select policy: Users can read their own profile, or users with view permission can read all profiles
CREATE POLICY "Users can view profiles with permission"
  ON public.user_profiles
  FOR SELECT
  USING (
    id = auth.uid() OR public.check_user_permission(auth.uid(), ARRAY['manage_users','view_all_users'])
  );

-- 2. Insert policy: Users with create permission can insert new profiles
CREATE POLICY "Users can insert profiles with permission"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    public.check_user_permission(auth.uid(), ARRAY['manage_users','create_users'])
  );

-- 3. Update policy: Users with edit permission can update profiles
CREATE POLICY "Users can update profiles with permission"
  ON public.user_profiles
  FOR UPDATE
  USING (
    public.check_user_permission(auth.uid(), ARRAY['manage_users','edit_users','change_user_roles'])
  )
  WITH CHECK (
    public.check_user_permission(auth.uid(), ARRAY['manage_users','edit_users','change_user_roles'])
  );

-- 4. Delete policy: Users with delete permission can delete other profiles (cannot delete self)
CREATE POLICY "Users can delete profiles with permission"
  ON public.user_profiles
  FOR DELETE
  USING (
    id != auth.uid() AND public.check_user_permission(auth.uid(), ARRAY['manage_users','delete_users'])
  );
