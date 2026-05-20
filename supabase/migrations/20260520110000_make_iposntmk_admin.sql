-- Set iposntmk@gmail.com as admin with full permissions
-- 1. Update the existing user profile in public.user_profiles if it exists
UPDATE public.user_profiles
SET role = 'admin',
    status = 'active'
WHERE email = 'iposntmk@gmail.com';

-- 2. If the user exists in auth.users but not in public.user_profiles, insert them
INSERT INTO public.user_profiles (id, email, role, status)
SELECT id, email, 'admin', 'active'
FROM auth.users
WHERE email = 'iposntmk@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  status = 'active';

-- 3. Modify public.handle_new_user() trigger function to auto-assign admin role & active status on signup for iposntmk@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role TEXT := 'viewer';
  default_status TEXT := 'inactive';
BEGIN
  IF NEW.email = 'iposntmk@gmail.com' THEN
    default_role := 'admin';
    default_status := 'active';
  END IF;

  INSERT INTO public.user_profiles (id, email, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    default_role,
    default_status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
