-- Migration: Create auth trigger for auto-profile creation
-- Created: 2024-05-18

-- ============================================================
-- 1. Function: handle_new_user
-- Automatically creates a profile when a new auth user is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, mobile_number, name, wallet_balance, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    0,
    false
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Trigger: on_auth_user_created
-- Fires after each insert on auth.users
-- ============================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. Function: handle_new_profile
-- Automatically creates an athlete_profile when a profile is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.athlete_profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Trigger: on_profile_created
-- Fires after each insert on public.profiles
-- ============================================================
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();
