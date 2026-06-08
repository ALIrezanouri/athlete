-- Migration: Add Admin RBAC RLS Policies
-- Description: Row Level Security policies for role-based access control in admin panel
-- Date: 2024-05-22

-- ============================================================================
-- RLS Helper Function
-- ============================================================================

-- Create helper function to get user role from profiles table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create helper function to check if user is manager (role = 'gym_manager' in profiles)
CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'gym_manager'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create helper function to check if user is coach
CREATE OR REPLACE FUNCTION is_coach()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'coach'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create helper function to check if user is doctor
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'doctor'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create helper function to check if user is athlete
CREATE OR REPLACE FUNCTION is_athlete()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'athlete'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create helper function to get user's gym_id (for managers)
-- Note: profiles has no gym_id column; the relationship is gyms.manager_id → profiles.id
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS uuid AS $$
  SELECT id FROM gyms
  WHERE manager_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- RLS Policies for profiles table
-- ============================================================================

-- Enable RLS on profiles table (idempotent — already enabled in base_tables)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop simpler policies from base_tables migration that we're replacing
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Policy: Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Policy: Users can update their own profile (except role and wallet_balance)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
  wallet_balance = (SELECT wallet_balance FROM profiles WHERE id = auth.uid())
);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (is_admin());

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
USING (is_admin());

-- Policy: Admins can insert new profiles
CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
USING (is_admin());

-- ============================================================================
-- RLS Policies for gyms table
-- ============================================================================

-- Enable RLS on gyms table (idempotent — already enabled in gym_booking_schema)
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

-- Drop simpler policies from gym_booking_schema that we're replacing
DROP POLICY IF EXISTS "Gyms are publicly readable when active" ON gyms;
DROP POLICY IF EXISTS "Managers can create gyms" ON gyms;
DROP POLICY IF EXISTS "Managers can update own gyms" ON gyms;

-- Policy: Everyone can view all gyms (public access)
CREATE POLICY "Everyone can view gyms"
ON gyms FOR SELECT
USING (true);

-- Policy: Managers can update their own gym
CREATE POLICY "Managers can update own gym"
ON gyms FOR UPDATE
USING (id = get_user_gym_id());

-- Policy: Admins can update any gym
CREATE POLICY "Admins can update any gym"
ON gyms FOR UPDATE
USING (is_admin());

-- Policy: Admins can insert new gyms
CREATE POLICY "Admins can insert gyms"
ON gyms FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can delete gyms
CREATE POLICY "Admins can delete gyms"
ON gyms FOR DELETE
USING (is_admin());

-- ============================================================================
-- RLS Policies for bookings table
-- ============================================================================

-- Enable RLS on bookings table (idempotent — already enabled in gym_booking_schema)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop simpler policies from gym_booking_schema that we're replacing
DROP POLICY IF EXISTS "Athletes can read own bookings" ON bookings;
DROP POLICY IF EXISTS "Athletes can create bookings" ON bookings;
DROP POLICY IF EXISTS "Athletes can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can read bookings for own gyms" ON bookings;

-- Policy: Athletes can view their own bookings
CREATE POLICY "Athletes can view own bookings"
ON bookings FOR SELECT
USING (athlete_id = auth.uid());

-- Policy: Managers can view bookings for their gym
CREATE POLICY "Managers can view gym bookings"
ON bookings FOR SELECT
USING (gym_id = get_user_gym_id());

-- Policy: Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
USING (is_admin());

-- Policy: Athletes can create bookings
CREATE POLICY "Athletes can create bookings"
ON bookings FOR INSERT
WITH CHECK (athlete_id = auth.uid());

-- Policy: Admins can create any booking
CREATE POLICY "Admins can create any booking"
ON bookings FOR INSERT
WITH CHECK (is_admin());

-- Policy: Athletes can update their own bookings
CREATE POLICY "Athletes can update own bookings"
ON bookings FOR UPDATE
USING (athlete_id = auth.uid())
WITH CHECK (athlete_id = auth.uid());

-- Policy: Admins can update any booking
CREATE POLICY "Admins can update any booking"
ON bookings FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete bookings
CREATE POLICY "Admins can delete bookings"
ON bookings FOR DELETE
USING (is_admin());

-- ============================================================================
-- RLS Policies for wallet_transactions table
-- ============================================================================

-- Enable RLS on wallet_transactions table (idempotent — already enabled in gym_booking_schema)
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Drop simpler policies from gym_booking_schema that we're replacing
DROP POLICY IF EXISTS "Users can read own wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users can create own wallet transactions" ON wallet_transactions;

-- Policy: Users can view their own wallet transactions
CREATE POLICY "Users can view own wallet transactions"
ON wallet_transactions FOR SELECT
USING (profile_id = auth.uid());

-- Policy: Admins can view all wallet transactions
CREATE POLICY "Admins can view all wallet transactions"
ON wallet_transactions FOR SELECT
USING (is_admin());

-- Policy: Admins can insert wallet transactions
CREATE POLICY "Admins can insert wallet transactions"
ON wallet_transactions FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update wallet transactions
CREATE POLICY "Admins can update wallet transactions"
ON wallet_transactions FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete wallet transactions
CREATE POLICY "Admins can delete wallet transactions"
ON wallet_transactions FOR DELETE
USING (is_admin());

-- ============================================================================
-- RLS Policies for gym_trainers table
-- ============================================================================

-- Enable RLS on gym_trainers table (idempotent — already enabled in gym_booking_schema)
ALTER TABLE gym_trainers ENABLE ROW LEVEL SECURITY;

-- Drop simpler policies from gym_booking_schema that we're replacing
DROP POLICY IF EXISTS "Gym trainers are publicly readable" ON gym_trainers;
DROP POLICY IF EXISTS "Managers can manage trainers for own gyms" ON gym_trainers;

-- Policy: Everyone can view trainers
CREATE POLICY "Everyone can view trainers"
ON gym_trainers FOR SELECT
USING (true);

-- Policy: Managers can view their gym's trainers
CREATE POLICY "Managers can view gym trainers"
ON gym_trainers FOR SELECT
USING (gym_id = get_user_gym_id());

-- Policy: Managers can insert trainers for their gym
CREATE POLICY "Managers can insert gym trainers"
ON gym_trainers FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's trainers
CREATE POLICY "Managers can update gym trainers"
ON gym_trainers FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's trainers
CREATE POLICY "Managers can delete gym trainers"
ON gym_trainers FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any trainer
CREATE POLICY "Admins can insert any trainer"
ON gym_trainers FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any trainer
CREATE POLICY "Admins can update any trainer"
ON gym_trainers FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any trainer
CREATE POLICY "Admins can delete any trainer"
ON gym_trainers FOR DELETE
USING (is_admin());

-- ============================================================================
-- RLS Policies for gym_time_slots table
-- ============================================================================

-- Enable RLS on gym_time_slots table (idempotent — already enabled in gym_booking_schema)
ALTER TABLE gym_time_slots ENABLE ROW LEVEL SECURITY;

-- Drop simpler policies from gym_booking_schema that we're replacing
DROP POLICY IF EXISTS "Gym time slots are publicly readable" ON gym_time_slots;
DROP POLICY IF EXISTS "Managers can manage time slots for own gyms" ON gym_time_slots;

-- Policy: Everyone can view time slots
CREATE POLICY "Everyone can view time slots"
ON gym_time_slots FOR SELECT
USING (true);

-- Policy: Managers can view their gym's time slots
CREATE POLICY "Managers can view gym time slots"
ON gym_time_slots FOR SELECT
USING (gym_id = get_user_gym_id());

-- Policy: Managers can insert time slots for their gym
CREATE POLICY "Managers can insert gym time slots"
ON gym_time_slots FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's time slots
CREATE POLICY "Managers can update gym time slots"
ON gym_time_slots FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's time slots
CREATE POLICY "Managers can delete gym time slots"
ON gym_time_slots FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any time slot
CREATE POLICY "Admins can insert any time slot"
ON gym_time_slots FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any time slot
CREATE POLICY "Admins can update any time slot"
ON gym_time_slots FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any time slot
CREATE POLICY "Admins can delete any time slot"
ON gym_time_slots FOR DELETE
USING (is_admin());

-- ============================================================================
-- RLS Policies for gym_photos table
-- ============================================================================

-- Enable RLS on gym_photos table (idempotent — already enabled in gym_booking_schema)
ALTER TABLE gym_photos ENABLE ROW LEVEL SECURITY;

-- Drop simpler policies from gym_booking_schema that we're replacing
DROP POLICY IF EXISTS "Gym photos are publicly readable" ON gym_photos;
DROP POLICY IF EXISTS "Managers can add photos to own gyms" ON gym_photos;
DROP POLICY IF EXISTS "Managers can delete photos from own gyms" ON gym_photos;

-- Policy: Everyone can view gym photos
CREATE POLICY "Everyone can view gym photos"
ON gym_photos FOR SELECT
USING (true);

-- Policy: Managers can insert photos for their gym
CREATE POLICY "Managers can insert gym photos"
ON gym_photos FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's photos
CREATE POLICY "Managers can update gym photos"
ON gym_photos FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's photos
CREATE POLICY "Managers can delete gym photos"
ON gym_photos FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any gym photo
CREATE POLICY "Admins can insert any gym photo"
ON gym_photos FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any gym photo
CREATE POLICY "Admins can update any gym photo"
ON gym_photos FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any gym photo
CREATE POLICY "Admins can delete any gym photo"
ON gym_photos FOR DELETE
USING (is_admin());

-- ============================================================================
-- RLS Policies for gym_amenities table
-- ============================================================================

-- Enable RLS on gym_amenities table (idempotent — already enabled in gym_booking_schema)
ALTER TABLE gym_amenities ENABLE ROW LEVEL SECURITY;

-- Drop simpler policies from gym_booking_schema that we're replacing
DROP POLICY IF EXISTS "Gym amenities are publicly readable" ON gym_amenities;
DROP POLICY IF EXISTS "Managers can manage amenities for own gyms" ON gym_amenities;

-- Policy: Everyone can view gym amenities
CREATE POLICY "Everyone can view gym amenities"
ON gym_amenities FOR SELECT
USING (true);

-- Policy: Managers can insert amenities for their gym
CREATE POLICY "Managers can insert gym amenities"
ON gym_amenities FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's amenities
CREATE POLICY "Managers can update gym amenities"
ON gym_amenities FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's amenities
CREATE POLICY "Managers can delete gym amenities"
ON gym_amenities FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any gym amenity
CREATE POLICY "Admins can insert any gym amenity"
ON gym_amenities FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any gym amenity
CREATE POLICY "Admins can update any gym amenity"
ON gym_amenities FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any gym amenity
CREATE POLICY "Admins can delete any gym amenity"
ON gym_amenities FOR DELETE
USING (is_admin());

-- ============================================================================
-- RLS Policies for gym_sport_types table
-- ============================================================================

-- Enable RLS on gym_sport_types table (idempotent — already enabled in gym_booking_schema)
ALTER TABLE gym_sport_types ENABLE ROW LEVEL SECURITY;

-- Drop simpler policies from gym_booking_schema that we're replacing
DROP POLICY IF EXISTS "Gym sport types are publicly readable" ON gym_sport_types;
DROP POLICY IF EXISTS "Managers can manage sport types for own gyms" ON gym_sport_types;

-- Policy: Everyone can view gym sport types
CREATE POLICY "Everyone can view gym sport types"
ON gym_sport_types FOR SELECT
USING (true);

-- Policy: Managers can insert sport types for their gym
CREATE POLICY "Managers can insert gym sport types"
ON gym_sport_types FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's sport types
CREATE POLICY "Managers can update gym sport types"
ON gym_sport_types FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's sport types
CREATE POLICY "Managers can delete gym sport types"
ON gym_sport_types FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any gym sport type
CREATE POLICY "Admins can insert any gym sport type"
ON gym_sport_types FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any gym sport type
CREATE POLICY "Admins can update any gym sport type"
ON gym_sport_types FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any gym sport type
CREATE POLICY "Admins can delete any gym sport type"
ON gym_sport_types FOR DELETE
USING (is_admin());