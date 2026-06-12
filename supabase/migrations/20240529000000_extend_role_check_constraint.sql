-- Extend profiles.role CHECK constraint to include coach and doctor roles
-- The admin panel uses 'coach' and 'doctor' roles for specialized access,
-- and RLS helper functions (is_coach, is_doctor, has_admin_access) already reference these roles.
-- Without this change, inserting profiles with role='coach' or role='doctor' would violate the CHECK constraint.

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Add the new CHECK constraint with all roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('athlete', 'gym_manager', 'admin', 'coach', 'doctor'));