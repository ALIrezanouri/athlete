-- Create admin user migration
-- This migration creates a Supabase auth user with admin role

-- Insert admin user into auth.users
-- Note: This uses gen_random_uuid() to generate a proper UUID
-- Exception handling makes migration idempotent (handles duplicate users)
DO $$
BEGIN
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'admin@rokhdad.fit',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    '{"name": "Admin User"}',
    '{"provider": "email", "role": "admin"}',
    now(),
    now()
  );
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, ignore the error
    NULL;
END $$;

-- Create profile entry for admin user (email column added later in 20240528000000)
INSERT INTO public.profiles (
  id,
  full_name,
  role,
  mobile_number,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.raw_user_meta_data->>'name',
  u.raw_app_meta_data->>'role',
  ''::text,
  u.created_at,
  u.updated_at
FROM auth.users u
WHERE u.email = 'admin@rokhdad.fit'
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;