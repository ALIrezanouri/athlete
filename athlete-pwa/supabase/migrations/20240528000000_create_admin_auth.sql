-- Migration: Create admin auth infrastructure
-- This enables email+password authentication for admin panel users
-- while keeping phone OTP for athlete app users

-- Step 1: Add email column to profiles if not exists (for admin login)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Step 2: Create an admin user with email+password auth
-- This uses Supabase Auth API to create the user
-- Note: In production, you should create admin users via the Supabase Dashboard
-- or via a secure admin endpoint, NOT via SQL migrations with hardcoded passwords.

-- For development purposes, we'll use the service role to create an admin user:
-- The actual user creation should be done via the Supabase Auth Admin API:
-- 
-- Example using supabase-js:
-- const { data, error } = await supabase.auth.admin.createUser({
--   email: 'admin@rokhdad.fit',
--   password: 'secure-password-here',
--   email_confirm: true,
--   user_metadata: {
--     full_name: 'System Admin',
--     role: 'admin'
--   }
-- })
--
-- Then insert the profile:
-- INSERT INTO profiles (id, full_name, role, email)
-- VALUES (data.user.id, 'System Admin', 'admin', 'admin@rokhdad.fit');

-- Step 3: Create a helper function to check if a user has admin access
CREATE OR REPLACE FUNCTION has_admin_access(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  
  IF user_role IN ('admin', 'gym_manager', 'coach', 'doctor') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Add comment for documentation
COMMENT ON FUNCTION has_admin_access IS 'Checks if a user has admin panel access (admin, manager, coach, or doctor role)';