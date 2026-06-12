-- Migration: Fix auth trigger - column name mismatch and conflict handling
-- Created: 2024-05-19
--
-- Fixes:
--   1. handle_new_user() referenced column "name" but profiles table has "full_name"
--      This caused "column 'name' of relation 'profiles' does not exist" which rolled
--      back the entire auth.users INSERT, producing "Database error creating new user".
--   2. Added ON CONFLICT (id) DO NOTHING to handle orphaned profile rows gracefully.
--   3. Added ON CONFLICT (id) DO NOTHING to handle_new_profile() for robustness.
--   4. Added email column to profiles (needed by trigger before 20240528000000 adds it).

-- ============================================================
-- 0. Add email column to profiles (required by handle_new_user trigger)
--    20240528000000 also adds this with IF NOT EXISTS, so no conflict.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
END $$;

-- ============================================================
-- 1. Fix: handle_new_user — correct column name + ON CONFLICT + default role
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, mobile_number, full_name, role, wallet_balance, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_app_meta_data->>'role', 'athlete'),
    0,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Fix: handle_new_profile — add ON CONFLICT for robustness
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.athlete_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
