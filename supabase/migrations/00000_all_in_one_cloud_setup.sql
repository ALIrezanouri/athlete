-- ============================================================
-- rokhdad FIT — All-in-One Supabase Cloud Setup
-- ============================================================
-- This file combines ALL 26 migrations into a single script
-- that you can paste into the Supabase Cloud SQL Editor.
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase project dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Paste this entire script into the editor
-- 4. Click "Run" to execute
-- 5. Wait for execution to complete (may take 30-60 seconds)
--
-- IMPORTANT NOTES:
-- - This script is idempotent (safe to run multiple times)
-- - ON CONFLICT DO NOTHING handles duplicate inserts
-- - DROP POLICY IF EXISTS handles policy replacements
-- - The pg_cron extension is enabled for auto-expiring bookings
-- - An admin user (admin@rokhdad.fit) is created with password "Admin123!"
--   CHANGE THIS PASSWORD after first login!
-- - Seed data includes 6 gyms, 10 athletes, exercises, translations, etc.
-- ============================================================


-- ============================================================
-- MIGRATION: supabase/migrations/20240515000000_create_base_tables.sql
-- ============================================================

-- ============================================================
-- Base Tables: countries, profiles, athlete_profiles
-- MUST be applied BEFORE the gym booking schema migration
-- ============================================================

-- ============================================================
-- 1. COUNTRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.countries (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_local TEXT NOT NULL,
    is_rtl BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    currency_code TEXT DEFAULT 'USD',
    currency_symbol TEXT DEFAULT '$',
    phone_prefix TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Countries are publicly readable
DROP POLICY IF EXISTS "Countries are publicly readable" ON public.countries;
CREATE POLICY "Countries are publicly readable"
    ON public.countries FOR SELECT
    USING (true);

-- Insert seed countries
INSERT INTO public.countries (id, name_en, name_local, is_rtl, currency_code, currency_symbol, phone_prefix) VALUES
    ('IR', 'Iran', 'ایران', true, 'IRR', '﷼', '+98'),
    ('AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', true, 'AED', 'د.إ', '+971'),
    ('US', 'United States', 'United States', false, 'USD', '$', '+1'),
    ('TR', 'Turkey', 'Türkiye', false, 'TRY', '₺', '+90')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'athlete'
        CHECK (role IN ('athlete', 'gym_manager', 'admin')),
    full_name TEXT,
    avatar_url TEXT,
    wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    country_id TEXT REFERENCES public.countries(id),
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Index for looking up profiles by mobile number
CREATE INDEX IF NOT EXISTS idx_profiles_mobile ON public.profiles(mobile_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role can insert profiles (handled via admin client)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- 3. ATHLETE_PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.athlete_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    sport_preferences TEXT[],
    fitness_level TEXT DEFAULT 'beginner'
        CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
    height_cm INTEGER,
    weight_kg DECIMAL(5, 2),
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;

-- Athletes can read own extended profile
DROP POLICY IF EXISTS "Athletes can read own extended profile" ON public.athlete_profiles;
CREATE POLICY "Athletes can read own extended profile"
    ON public.athlete_profiles FOR SELECT
    USING (auth.uid() = id);

-- Athletes can update own extended profile
DROP POLICY IF EXISTS "Athletes can update own extended profile" ON public.athlete_profiles;
CREATE POLICY "Athletes can update own extended profile"
    ON public.athlete_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Athletes can insert own extended profile
DROP POLICY IF EXISTS "Athletes can insert own extended profile" ON public.athlete_profiles;
CREATE POLICY "Athletes can insert own extended profile"
    ON public.athlete_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================
-- TRIGGER: Auto-update updated_at timestamp for profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_athlete_profiles_updated_at ON public.athlete_profiles;
CREATE TRIGGER trg_athlete_profiles_updated_at
    BEFORE UPDATE ON public.athlete_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- MIGRATION: supabase/migrations/20240516000000_create_gym_booking_schema.sql
-- ============================================================

-- ============================================================
-- Phase 0: Gym Booking Schema for rokhdad FIT Athlete PWA
-- Creates: gyms, gym_photos, gym_amenities, gym_sport_types,
--          gym_trainers, gym_time_slots, bookings, gym_reviews,
--          wallet_transactions, favorite_gyms
-- ============================================================

-- ============================================================
-- 1. GYMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    area TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    price_per_session DECIMAL(10, 2) NOT NULL DEFAULT 0,
    phone TEXT,
    instagram TEXT,
    website TEXT,
    avg_rating DECIMAL(3, 2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    open_time TIME NOT NULL DEFAULT '08:00:00',
    close_time TIME NOT NULL DEFAULT '22:00:00',
    country_id TEXT NOT NULL REFERENCES public.countries(id),
    manager_id UUID REFERENCES public.profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for gym searches by country and city
CREATE INDEX IF NOT EXISTS idx_gyms_country_city ON public.gyms(country_id, city);
CREATE INDEX IF NOT EXISTS idx_gyms_active ON public.gyms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gyms_location ON public.gyms(latitude, longitude);

-- ============================================================
-- 2. GYM_PHOTOS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gym_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_photos_gym_id ON public.gym_photos(gym_id);

-- ============================================================
-- 3. GYM_AMENITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gym_amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    amenity_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_amenities_gym_id ON public.gym_amenities(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_amenities_key ON public.gym_amenities(amenity_key);

-- ============================================================
-- 4. GYM_SPORT_TYPES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gym_sport_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    sport_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_sport_types_gym_id ON public.gym_sport_types(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_sport_types_key ON public.gym_sport_types(sport_key);

-- ============================================================
-- 5. GYM_TRAINERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gym_trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialty TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_trainers_gym_id ON public.gym_trainers(gym_id);

-- ============================================================
-- 6. GYM_TIME_SLOTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gym_time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 20,
    booked_count INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_time_slots_gym_date ON public.gym_time_slots(gym_id, date);
CREATE INDEX IF NOT EXISTS idx_gym_time_slots_available ON public.gym_time_slots(gym_id, date, is_available) WHERE is_available = true;

-- ============================================================
-- 7. BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.profiles(id),
    gym_id UUID NOT NULL REFERENCES public.gyms(id),
    time_slot_id UUID NOT NULL REFERENCES public.gym_time_slots(id),
    status TEXT NOT NULL DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled', 'expired')),
    amount DECIMAL(10, 2) NOT NULL,
    booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bookings_athlete ON public.bookings(athlete_id);
CREATE INDEX IF NOT EXISTS idx_bookings_athlete_status ON public.bookings(athlete_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_gym ON public.bookings(gym_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot ON public.bookings(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booked_at DESC);

-- ============================================================
-- 8. GYM_REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gym_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_gym_reviews_gym ON public.gym_reviews(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_reviews_athlete ON public.gym_reviews(athlete_id);

-- ============================================================
-- 9. WALLET_TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    type TEXT NOT NULL
        CHECK (type IN ('top_up', 'session_purchase', 'refund', 'bonus')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    booking_id UUID REFERENCES public.bookings(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_profile ON public.wallet_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_profile_date ON public.wallet_transactions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking ON public.wallet_transactions(booking_id);

-- ============================================================
-- 10. FAVORITE_GYMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorite_gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.profiles(id),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(athlete_id, gym_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_gyms_athlete ON public.favorite_gyms(athlete_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_sport_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_gyms ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: GYMS (public read, manager write)
-- ============================================================

-- Anyone can read active gyms
DROP POLICY IF EXISTS "Gyms are publicly readable when active" ON public.gyms;
CREATE POLICY "Gyms are publicly readable when active"
    ON public.gyms FOR SELECT
    USING (is_active = true);

-- Managers can insert their own gyms
DROP POLICY IF EXISTS "Managers can create gyms" ON public.gyms;
CREATE POLICY "Managers can create gyms"
    ON public.gyms FOR INSERT
    WITH CHECK (manager_id = auth.uid());

-- Managers can update their own gyms
DROP POLICY IF EXISTS "Managers can update own gyms" ON public.gyms;
CREATE POLICY "Managers can update own gyms"
    ON public.gyms FOR UPDATE
    USING (manager_id = auth.uid())
    WITH CHECK (manager_id = auth.uid());

-- ============================================================
-- RLS POLICIES: GYM_PHOTOS (public read, manager write)
-- ============================================================

DROP POLICY IF EXISTS "Gym photos are publicly readable" ON public.gym_photos;
CREATE POLICY "Gym photos are publicly readable"
    ON public.gym_photos FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Managers can add photos to own gyms" ON public.gym_photos;
CREATE POLICY "Managers can add photos to own gyms"
    ON public.gym_photos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = gym_photos.gym_id
            AND gyms.manager_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Managers can delete photos from own gyms" ON public.gym_photos;
CREATE POLICY "Managers can delete photos from own gyms"
    ON public.gym_photos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = gym_photos.gym_id
            AND gyms.manager_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: GYM_AMENITIES (public read, manager write)
-- ============================================================

DROP POLICY IF EXISTS "Gym amenities are publicly readable" ON public.gym_amenities;
CREATE POLICY "Gym amenities are publicly readable"
    ON public.gym_amenities FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Managers can manage amenities for own gyms" ON public.gym_amenities;
CREATE POLICY "Managers can manage amenities for own gyms"
    ON public.gym_amenities FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = gym_amenities.gym_id
            AND gyms.manager_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: GYM_SPORT_TYPES (public read, manager write)
-- ============================================================

DROP POLICY IF EXISTS "Gym sport types are publicly readable" ON public.gym_sport_types;
CREATE POLICY "Gym sport types are publicly readable"
    ON public.gym_sport_types FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Managers can manage sport types for own gyms" ON public.gym_sport_types;
CREATE POLICY "Managers can manage sport types for own gyms"
    ON public.gym_sport_types FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = gym_sport_types.gym_id
            AND gyms.manager_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: GYM_TRAINERS (public read, manager write)
-- ============================================================

DROP POLICY IF EXISTS "Gym trainers are publicly readable" ON public.gym_trainers;
CREATE POLICY "Gym trainers are publicly readable"
    ON public.gym_trainers FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Managers can manage trainers for own gyms" ON public.gym_trainers;
CREATE POLICY "Managers can manage trainers for own gyms"
    ON public.gym_trainers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = gym_trainers.gym_id
            AND gyms.manager_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: GYM_TIME_SLOTS (public read, manager write)
-- ============================================================

DROP POLICY IF EXISTS "Gym time slots are publicly readable" ON public.gym_time_slots;
CREATE POLICY "Gym time slots are publicly readable"
    ON public.gym_time_slots FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Managers can manage time slots for own gyms" ON public.gym_time_slots;
CREATE POLICY "Managers can manage time slots for own gyms"
    ON public.gym_time_slots FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = gym_time_slots.gym_id
            AND gyms.manager_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: BOOKINGS (athlete read own, athlete create)
-- ============================================================

-- Athletes can read their own bookings
DROP POLICY IF EXISTS "Athletes can read own bookings" ON public.bookings;
CREATE POLICY "Athletes can read own bookings"
    ON public.bookings FOR SELECT
    USING (athlete_id = auth.uid());

-- Athletes can create bookings for themselves
DROP POLICY IF EXISTS "Athletes can create bookings" ON public.bookings;
CREATE POLICY "Athletes can create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (athlete_id = auth.uid());

-- Athletes can update their own bookings (for cancellation)
DROP POLICY IF EXISTS "Athletes can update own bookings" ON public.bookings;
CREATE POLICY "Athletes can update own bookings"
    ON public.bookings FOR UPDATE
    USING (athlete_id = auth.uid());

-- Gym managers can read bookings for their gyms
DROP POLICY IF EXISTS "Managers can read bookings for own gyms" ON public.bookings;
CREATE POLICY "Managers can read bookings for own gyms"
    ON public.bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = bookings.gym_id
            AND gyms.manager_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: GYM_REVIEWS (public read, athlete write own)
-- ============================================================

-- Anyone can read reviews
DROP POLICY IF EXISTS "Gym reviews are publicly readable" ON public.gym_reviews;
CREATE POLICY "Gym reviews are publicly readable"
    ON public.gym_reviews FOR SELECT
    USING (true);

-- Athletes can create reviews for their own bookings
DROP POLICY IF EXISTS "Athletes can create reviews" ON public.gym_reviews;
CREATE POLICY "Athletes can create reviews"
    ON public.gym_reviews FOR INSERT
    WITH CHECK (athlete_id = auth.uid());

-- Athletes can update their own reviews
DROP POLICY IF EXISTS "Athletes can update own reviews" ON public.gym_reviews;
CREATE POLICY "Athletes can update own reviews"
    ON public.gym_reviews FOR UPDATE
    USING (athlete_id = auth.uid());

-- ============================================================
-- RLS POLICIES: WALLET_TRANSACTIONS (user read own only)
-- ============================================================

-- Users can only read their own transactions
DROP POLICY IF EXISTS "Users can read own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can read own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (profile_id = auth.uid());

-- Users can create transactions for their own wallet (top-up via service role in practice)
DROP POLICY IF EXISTS "Users can create own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can create own wallet transactions"
    ON public.wallet_transactions FOR INSERT
    WITH CHECK (profile_id = auth.uid());

-- ============================================================
-- RLS POLICIES: FAVORITE_GYMS (user read/write own only)
-- ============================================================

-- Users can read their own favorites
DROP POLICY IF EXISTS "Users can read own favorite gyms" ON public.favorite_gyms;
CREATE POLICY "Users can read own favorite gyms"
    ON public.favorite_gyms FOR SELECT
    USING (athlete_id = auth.uid());

-- Users can add favorites for themselves
DROP POLICY IF EXISTS "Users can add own favorite gyms" ON public.favorite_gyms;
CREATE POLICY "Users can add own favorite gyms"
    ON public.favorite_gyms FOR INSERT
    WITH CHECK (athlete_id = auth.uid());

-- Users can remove their own favorites
DROP POLICY IF EXISTS "Users can remove own favorite gyms" ON public.favorite_gyms;
CREATE POLICY "Users can remove own favorite gyms"
    ON public.favorite_gyms FOR DELETE
    USING (athlete_id = auth.uid());

-- ============================================================
-- TRIGGER: Update gym avg_rating on review insert/update/delete
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_gym_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.gyms
    SET 
        avg_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM public.gym_reviews
            WHERE gym_id = COALESCE(NEW.gym_id, OLD.gym_id)
        ),
        review_count = (
            SELECT COUNT(*)
            FROM public.gym_reviews
            WHERE gym_id = COALESCE(NEW.gym_id, OLD.gym_id)
        ),
        updated_at = now()
    WHERE id = COALESCE(NEW.gym_id, OLD.gym_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_gym_rating_after_review ON public.gym_reviews;
CREATE TRIGGER trg_update_gym_rating_after_review
    AFTER INSERT OR UPDATE OR DELETE ON public.gym_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gym_rating();

-- ============================================================
-- TRIGGER: Update time slot availability on booking changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_time_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.gym_time_slots
        SET booked_count = booked_count + 1,
            is_available = (booked_count + 1 < capacity)
        WHERE id = NEW.time_slot_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE public.gym_time_slots
        SET booked_count = GREATEST(booked_count - 1, 0),
            is_available = true
        WHERE id = NEW.time_slot_id;
        RETURN NEW;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_time_slot_on_booking ON public.bookings;
CREATE TRIGGER trg_update_time_slot_on_booking
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_time_slot_availability();

-- ============================================================
-- TRIGGER: Update profiles wallet_balance on transactions
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'top_up' OR NEW.type = 'refund' OR NEW.type = 'bonus' THEN
        UPDATE public.profiles
        SET wallet_balance = wallet_balance + NEW.amount
        WHERE id = NEW.profile_id;
    ELSIF NEW.type = 'session_purchase' THEN
        UPDATE public.profiles
        SET wallet_balance = wallet_balance - NEW.amount
        WHERE id = NEW.profile_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_wallet_on_transaction ON public.wallet_transactions;
CREATE TRIGGER trg_update_wallet_on_transaction
    AFTER INSERT ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_wallet_balance();

-- ============================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gyms_updated_at ON public.gyms;
CREATE TRIGGER trg_gyms_updated_at
    BEFORE UPDATE ON public.gyms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- MIGRATION: supabase/migrations/20240517000000_seed_gym_data.sql
-- ============================================================

-- ============================================================
-- Phase 9: Seed Data for rokhdad FIT Athlete PWA
-- Creates: 6 gyms in Tehran with photos, amenities, sport types,
--          trainers, and time slots for the next 7 days
-- ============================================================
-- NOTE: Run this via Supabase Dashboard SQL Editor (superuser)
--       RLS policies won't block inserts from SQL Editor.
--       manager_id is NULL for all gyms (no manager accounts yet).
-- ============================================================

-- ============================================================
-- 1. GYMS — 6 mock gyms in Tehran
-- ============================================================
INSERT INTO public.gyms (id, name, description, address, city, area, latitude, longitude, price_per_session, phone, instagram, website, avg_rating, review_count, open_time, close_time, country_id, is_active) VALUES
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    'آکادمی بدنسازی طلایی',
    'یکی از مجهزترین باشگاه‌های تهران با دستگاه‌های حرفه‌ای و مربیان باتجربه. فضایی مدرن با نورپردازی حرفه‌ای برای تمرین بهینه.',
    'خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۱۲۵',
    'تهران', 'ونک',
    35.75750000, 51.41000000,
    350000.00,
    '021-88123456',
    '@golden_gym_tehran',
    'https://goldengym.ir',
    4.80, 24,
    '06:00:00', '23:00:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000002',
    'باشگاه ورزشی آریا',
    'باشگاه آریا با سالن‌های مجزا برای بدنسازی، استخر و کلاس‌های گروهی. محیطی دوستانه برای تمام سطوح ورزشی.',
    'خیابان شریعتی، بالاتر از پل سیدخندان، کوچه بهروز',
    'تهران', 'سیدخندان',
    35.74400000, 51.44500000,
    250000.00,
    '021-77554433',
    '@aria_sport_club',
    NULL,
    4.50, 18,
    '07:00:00', '22:00:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000003',
    'مجموعه ورزشی پارسه',
    'مجموعه‌ای کامل با سالن فوتسال، استخر سرپوشیده، سونا و بدنسازی. مناسب برای خانواده‌ها.',
    'بلوار کشاورز، نبش خیابان وصال',
    'تهران', 'عباس‌آباد',
    35.71500000, 51.43000000,
    400000.00,
    '021-66998877',
    '@parseh_sports',
    'https://parseh-sport.com',
    4.60, 32,
    '06:30:00', '23:30:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000004',
    'باشگاه کراس‌فیت تهران',
    'اولین و بزرگترین مرکز کراس‌فیت در ایران با مربیان بین‌المللی. تمرینات گروهی و شخصی.',
    'خیابان ایرانشهر، بالاتر از تقاطع ولیعصر',
    'تهران', 'میرداماد',
    35.76200000, 51.41800000,
    500000.00,
    '021-22223344',
    '@crossfit_tehran',
    'https://crossfittehran.com',
    4.90, 45,
    '05:30:00', '22:30:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000005',
    'باشگاه بوکس و هنرهای رزمی سپاهان',
    'باشگاهی تخصصی برای بوکس، کیک‌بوکسینگ و MMA. مربیان ملی با سابقه قهرمانی.',
    'خیابان انقلاب، نرسیده به چهارراه ولیعصر',
    'تهران', 'انقلاب',
    35.70000000, 51.40000000,
    300000.00,
    '021-33445566',
    '@sepahan_boxing',
    NULL,
    4.30, 15,
    '08:00:00', '22:00:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000006',
    'استودیو یوگا و پیلاتس آرامش',
    'فضایی آرام و دلنشین برای یوگا، پیلاتس و مدیتیشن. مناسب برای تمام سطوح از مبتدی تا پیشرفته.',
    'خیابان فرشته، بالاتر از دروس، پلاک ۸۰',
    'تهران', 'دروس',
    35.77000000, 51.42000000,
    280000.00,
    '021-99887766',
    '@aramesh_yoga',
    'https://aramesh-yoga.ir',
    4.70, 28,
    '07:00:00', '21:00:00',
    'IR', true
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. GYM_PHOTOS — 3-4 photos per gym (placeholder URLs)
-- ============================================================
INSERT INTO public.gym_photos (gym_id, url, sort_order, is_primary) VALUES
-- Golden Gym (4 photos)
('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&h=500&fit=crop', 2, false),
('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=500&fit=crop', 3, false),

-- Aria Sport (3 photos)
('a1b2c3d4-0001-4000-8000-000000000002', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000002', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000002', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop', 2, false),

-- Parseh Sports (4 photos)
('a1b2c3d4-0001-4000-8000-000000000003', 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000003', 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000003', 'https://images.unsplash.com/photo-1571244656531-4e0ce9b7e9eb?w=800&h=500&fit=crop', 2, false),
('a1b2c3d4-0001-4000-8000-000000000003', 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=800&h=500&fit=crop', 3, false),

-- CrossFit Tehran (3 photos)
('a1b2c3d4-0001-4000-8000-000000000004', 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000004', 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000004', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=500&fit=crop', 2, false),

-- Sepahan Boxing (3 photos)
('a1b2c3d4-0001-4000-8000-000000000005', 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000005', 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000005', 'https://images.unsplash.com/photo-1569567082830-4e4657a29736?w=800&h=500&fit=crop', 2, false),

-- Aramesh Yoga (3 photos)
('a1b2c3d4-0001-4000-8000-000000000006', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000006', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000006', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&h=500&fit=crop', 2, false) ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. GYM_AMENITIES — amenity keys per gym
-- ============================================================
-- Amenity keys: parking, shower, locker, wifi, sauna, pool, ac, cafe, personal_trainer, group_classes

INSERT INTO public.gym_amenities (gym_id, amenity_key) VALUES
-- Golden Gym
('a1b2c3d4-0001-4000-8000-000000000001', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000001', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000001', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000001', 'wifi'),
('a1b2c3d4-0001-4000-8000-000000000001', 'sauna'),
('a1b2c3d4-0001-4000-8000-000000000001', 'ac'),
('a1b2c3d4-0001-4000-8000-000000000001', 'personal_trainer'),
('a1b2c3d4-0001-4000-8000-000000000001', 'cafe'),

-- Aria Sport
('a1b2c3d4-0001-4000-8000-000000000002', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000002', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000002', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000002', 'pool'),
('a1b2c3d4-0001-4000-8000-000000000002', 'group_classes'),
('a1b2c3d4-0001-4000-8000-000000000002', 'ac'),

-- Parseh Sports
('a1b2c3d4-0001-4000-8000-000000000003', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000003', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000003', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000003', 'wifi'),
('a1b2c3d4-0001-4000-8000-000000000003', 'sauna'),
('a1b2c3d4-0001-4000-8000-000000000003', 'pool'),
('a1b2c3d4-0001-4000-8000-000000000003', 'ac'),
('a1b2c3d4-0001-4000-8000-000000000003', 'cafe'),
('a1b2c3d4-0001-4000-8000-000000000003', 'personal_trainer'),
('a1b2c3d4-0001-4000-8000-000000000003', 'group_classes'),

-- CrossFit Tehran
('a1b2c3d4-0001-4000-8000-000000000004', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000004', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000004', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000004', 'group_classes'),
('a1b2c3d4-0001-4000-8000-000000000004', 'personal_trainer'),

-- Sepahan Boxing
('a1b2c3d4-0001-4000-8000-000000000005', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000005', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000005', 'personal_trainer'),
('a1b2c3d4-0001-4000-8000-000000000005', 'group_classes'),

-- Aramesh Yoga
('a1b2c3d4-0001-4000-8000-000000000006', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000006', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000006', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000006', 'wifi'),
('a1b2c3d4-0001-4000-8000-000000000006', 'ac'),
('a1b2c3d4-0001-4000-8000-000000000006', 'group_classes') ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. GYM_SPORT_TYPES — sport keys per gym
-- ============================================================
-- Sport keys: bodybuilding, swimming, boxing, kickboxing, mma, yoga, pilates, crossfit, fitness, cardio, futsal, weightlifting

INSERT INTO public.gym_sport_types (gym_id, sport_key) VALUES
-- Golden Gym
('a1b2c3d4-0001-4000-8000-000000000001', 'bodybuilding'),
('a1b2c3d4-0001-4000-8000-000000000001', 'fitness'),
('a1b2c3d4-0001-4000-8000-000000000001', 'cardio'),
('a1b2c3d4-0001-4000-8000-000000000001', 'weightlifting'),

-- Aria Sport
('a1b2c3d4-0001-4000-8000-000000000002', 'bodybuilding'),
('a1b2c3d4-0001-4000-8000-000000000002', 'swimming'),
('a1b2c3d4-0001-4000-8000-000000000002', 'fitness'),
('a1b2c3d4-0001-4000-8000-000000000002', 'cardio'),

-- Parseh Sports
('a1b2c3d4-0001-4000-8000-000000000003', 'bodybuilding'),
('a1b2c3d4-0001-4000-8000-000000000003', 'swimming'),
('a1b2c3d4-0001-4000-8000-000000000003', 'futsal'),
('a1b2c3d4-0001-4000-8000-000000000003', 'fitness'),
('a1b2c3d4-0001-4000-8000-000000000003', 'cardio'),

-- CrossFit Tehran
('a1b2c3d4-0001-4000-8000-000000000004', 'crossfit'),
('a1b2c3d4-0001-4000-8000-000000000004', 'fitness'),
('a1b2c3d4-0001-4000-8000-000000000004', 'weightlifting'),

-- Sepahan Boxing
('a1b2c3d4-0001-4000-8000-000000000005', 'boxing'),
('a1b2c3d4-0001-4000-8000-000000000005', 'kickboxing'),
('a1b2c3d4-0001-4000-8000-000000000005', 'mma'),

-- Aramesh Yoga
('a1b2c3d4-0001-4000-8000-000000000006', 'yoga'),
('a1b2c3d4-0001-4000-8000-000000000006', 'pilates') ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. GYM_TRAINERS — 2-3 trainers per gym
-- ============================================================
INSERT INTO public.gym_trainers (gym_id, name, specialty, photo_url) VALUES
-- Golden Gym
('a1b2c3d4-0001-4000-8000-000000000001', 'علی محمدی', 'بدنسازی حرفه‌ای', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000001', 'سارا احمدی', 'فیتنس و کاردیو', 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000001', 'رضا کریمی', 'وزنه‌برداری', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200&h=200&fit=crop'),

-- Aria Sport
('a1b2c3d4-0001-4000-8000-000000000002', 'مریم حسینی', 'شنا و آبروبیکس', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000002', 'امیر نوری', 'بدنسازی', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'),

-- Parseh Sports
('a1b2c3d4-0001-4000-8000-000000000003', 'حسن رضایی', 'فوتسال و آمادگی جسمانی', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000003', 'نازنین کاظمی', 'یوگا و پیلاتس', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000003', 'محمد جعفری', 'بدنسازی حرفه‌ای', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop'),

-- CrossFit Tehran
('a1b2c3d4-0001-4000-8000-000000000004', 'داریوش صالحی', 'کراس‌فیت سطح ۳', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000004', 'شیما رحمانی', 'کراس‌فیت و وزنه‌برداری', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'),

-- Sepahan Boxing
('a1b2c3d4-0001-4000-8000-000000000005', 'کامران فرهادی', 'بوکس حرفه‌ای - قهرمان آسیا', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000005', 'زهرا تقوی', 'کیک‌بوکسینگ و MMA', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop'),

-- Aramesh Yoga
('a1b2c3d4-0001-4000-8000-000000000006', 'آناهیتا شریفی', 'یوگا - مدرک RYT-500', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000006', 'لیلا صادقی', 'پیلاتس و مدیتیشن', 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=200&h=200&fit=crop') ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. GYM_TIME_SLOTS — next 7 days, 3-4 slots per gym per day
-- ============================================================
-- Using CURRENT_DATE for dynamic date generation

-- Golden Gym time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000001'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('08:00:00'::time, '10:00:00'::time, 20, 5, true),
        ('14:00:00'::time, '16:00:00'::time, 15, 12, true),
        ('18:00:00'::time, '20:00:00'::time, 25, 20, true),
        ('20:00:00'::time, '22:00:00'::time, 20, 8, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available) ON CONFLICT DO NOTHING;

-- Aria Sport time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000002'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('09:00:00'::time, '11:00:00'::time, 18, 10, true),
        ('15:00:00'::time, '17:00:00'::time, 18, 6, true),
        ('19:00:00'::time, '21:00:00'::time, 22, 18, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available) ON CONFLICT DO NOTHING;

-- Parseh Sports time slots (4 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000003'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('07:00:00'::time, '09:00:00'::time, 30, 15, true),
        ('10:00:00'::time, '12:00:00'::time, 25, 20, true),
        ('16:00:00'::time, '18:00:00'::time, 30, 22, true),
        ('20:00:00'::time, '22:00:00'::time, 25, 10, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available) ON CONFLICT DO NOTHING;

-- CrossFit Tehran time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000004'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('06:00:00'::time, '07:30:00'::time, 12, 10, true),
        ('10:00:00'::time, '11:30:00'::time, 12, 8, true),
        ('17:00:00'::time, '18:30:00'::time, 15, 14, true),
        ('19:00:00'::time, '20:30:00'::time, 12, 5, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available) ON CONFLICT DO NOTHING;

-- Sepahan Boxing time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000005'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('09:00:00'::time, '11:00:00'::time, 15, 8, true),
        ('15:00:00'::time, '17:00:00'::time, 15, 12, true),
        ('18:00:00'::time, '20:00:00'::time, 20, 16, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available) ON CONFLICT DO NOTHING;

-- Aramesh Yoga time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000006'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('08:00:00'::time, '09:30:00'::time, 10, 6, true),
        ('12:00:00'::time, '13:30:00'::time, 10, 4, true),
        ('17:00:00'::time, '18:30:00'::time, 12, 10, true),
        ('19:00:00'::time, '20:30:00'::time, 10, 3, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available) ON CONFLICT DO NOTHING;

-- ============================================================
-- DONE. Seed data summary:
--   6 gyms (Tehran, IR)
--   20 gym photos (Unsplash placeholder URLs)
--   40 gym amenities (10 unique amenity keys)
--   21 gym sport types (12 unique sport keys)
--   15 trainers
--   ~147 time slots (next 7 days, 3-4 per gym per day)
-- ============================================================

-- ============================================================
-- MIGRATION: supabase/migrations/20240518000000_create_auth_trigger.sql
-- ============================================================

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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================
-- MIGRATION: supabase/migrations/20240519000000_fix_auth_trigger_conflict.sql
-- ============================================================

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

-- ============================================================
-- MIGRATION: supabase/migrations/20240520000000_add_country_fields.sql
-- ============================================================

-- ============================================================
-- Add default_locale to countries table
-- phone_prefix already exists from the initial migration
-- ============================================================

ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS default_locale TEXT DEFAULT 'fa';

-- Update existing country data with locale info
UPDATE public.countries SET default_locale = 'fa' WHERE id = 'IR';
UPDATE public.countries SET default_locale = 'ar' WHERE id = 'AE';
UPDATE public.countries SET default_locale = 'en' WHERE id = 'US';
UPDATE public.countries SET default_locale = 'tr' WHERE id = 'TR';

-- ============================================================
-- MIGRATION: supabase/migrations/20240521000000_create_translations_feature_flags.sql
-- ============================================================

-- ============================================================
-- Translations, Feature Flags, and Country Currency Config
-- Replaces mock data in GlobalEngineContext.tsx
-- ============================================================

-- ============================================================
-- 1. Add currency config columns to countries
-- ============================================================
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_decimals INTEGER NOT NULL DEFAULT 2;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_display_unit TEXT;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_unit_divisor INTEGER;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_locale TEXT NOT NULL DEFAULT 'en-US';

-- Update existing countries with full currency config
UPDATE public.countries SET
  currency_decimals = 0,
  currency_display_unit = 'تومان',
  currency_unit_divisor = 10,
  currency_locale = 'fa-IR'
WHERE id = 'IR';

UPDATE public.countries SET
  currency_decimals = 2,
  currency_locale = 'ar-AE'
WHERE id = 'AE';

UPDATE public.countries SET
  currency_decimals = 2,
  currency_locale = 'en-US'
WHERE id = 'US';

UPDATE public.countries SET
  currency_decimals = 2,
  currency_locale = 'tr-TR'
WHERE id = 'TR';

-- ============================================================
-- 2. TRANSLATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale TEXT NOT NULL CHECK (locale IN ('en', 'fa')),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one translation per locale+key pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_translations_locale_key
    ON public.translations (locale, key);

-- Enable RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Translations are publicly readable (needed for UI rendering)
DROP POLICY IF EXISTS "Translations are publicly readable" ON public.translations;
CREATE POLICY "Translations are publicly readable"
    ON public.translations FOR SELECT
    USING (true);

-- Only service role can insert/update translations (admin operation)
DROP POLICY IF EXISTS "Service role can manage translations" ON public.translations;
CREATE POLICY "Service role can manage translations"
    ON public.translations FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update translations" ON public.translations;
CREATE POLICY "Service role can update translations"
    ON public.translations FOR UPDATE
    USING (true);

-- Trigger for auto-update updated_at
DROP TRIGGER IF EXISTS trg_translations_updated_at ON public.translations;
CREATE TRIGGER trg_translations_updated_at
    BEFORE UPDATE ON public.translations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. FEATURE FLAGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    country_id TEXT REFERENCES public.countries(id),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Feature flags are publicly readable
DROP POLICY IF EXISTS "Feature flags are publicly readable" ON public.feature_flags;
CREATE POLICY "Feature flags are publicly readable"
    ON public.feature_flags FOR SELECT
    USING (true);

-- Only service role can manage feature flags
DROP POLICY IF EXISTS "Service role can manage feature flags" ON public.feature_flags;
CREATE POLICY "Service role can manage feature flags"
    ON public.feature_flags FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update feature flags" ON public.feature_flags;
CREATE POLICY "Service role can update feature flags"
    ON public.feature_flags FOR UPDATE
    USING (true);

-- Trigger for auto-update updated_at
DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. SEED FEATURE FLAGS
-- ============================================================
INSERT INTO public.feature_flags (feature_key, is_enabled, country_id, description) VALUES
    ('wallet', true, NULL, 'Wallet and payment features'),
    ('social_feed', false, NULL, 'Social feed and community features'),
    ('premium_coaching', false, NULL, 'Premium coaching and personal trainer features')
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================
-- 5. SEED TRANSLATIONS (English)
-- ============================================================
INSERT INTO public.translations (locale, key, value) VALUES
    ('en', 'global_demo.title', 'Global Engine Demo'),
    ('en', 'global_demo.subtitle', 'Centralized i18n, multi-currency & feature flag system'),
    ('en', 'global_demo.language', 'Language'),
    ('en', 'global_demo.english', 'English'),
    ('en', 'global_demo.persian', 'فارسی'),
    ('en', 'global_demo.currency_title', 'Multi-Currency Display'),
    ('en', 'global_demo.currency_desc', 'Same value (500,000 minor units) formatted per country'),
    ('en', 'global_demo.usd_label', 'United States (USD)'),
    ('en', 'global_demo.irr_label', 'Iran (Toman)'),
    ('en', 'global_demo.feature_title', 'Feature Flags'),
    ('en', 'global_demo.feature_desc', 'Toggle features on/off — simulates per-country config'),
    ('en', 'global_demo.wallet', 'Wallet'),
    ('en', 'global_demo.wallet_desc', 'Your balance and transaction history'),
    ('en', 'global_demo.wallet_balance', 'Wallet Balance'),
    ('en', 'global_demo.wallet_disabled', 'Disabled in your country'),
    ('en', 'global_demo.dynamic_title', 'Dynamic Layout Engine'),
    ('en', 'global_demo.dynamic_desc', 'Components rendered from a JSON configuration array'),
    ('en', 'global_demo.header_card', 'Welcome Back'),
    ('en', 'global_demo.header_card_desc', 'Ready to crush your workout today?'),
    ('en', 'global_demo.stats_card', 'Workout Stats'),
    ('en', 'global_demo.stats_card_desc', 'Track your progress over time'),
    ('en', 'global_demo.toggle', 'Toggle'),
    ('en', 'global_demo.enabled', 'Enabled'),
    ('en', 'global_demo.disabled', 'Disabled'),
    ('en', 'global_demo.minor_units', 'Minor units (raw):'),
    ('en', 'login.title', 'Welcome Back'),
    ('en', 'login.subtitle', 'Sign in to continue'),
    ('en', 'login.phone_placeholder', 'Phone Number'),
    ('en', 'login.otp_placeholder', 'Verification Code'),
    ('en', 'login.button_send', 'Send Code'),
    ('en', 'login.button_verify', 'Verify'),
    ('en', 'login.button_resend', 'Resend Code'),
    ('en', 'login.select_country', 'Select Country'),
    ('en', 'login.otp_sent', 'Code sent!'),
    ('en', 'login.invalid_otp', 'Invalid code'),
    ('en', 'login.invalid_phone', 'Invalid phone number'),
    ('en', 'login.verifying', 'Verifying...'),
    ('en', 'login.sending', 'Sending...'),
    ('en', 'login.back', 'Back'),
    ('en', 'nav.home', 'Home'),
    ('en', 'nav.explore', 'Explore'),
    ('en', 'nav.bookings', 'Bookings'),
    ('en', 'nav.profile', 'Profile'),
    ('en', 'home.goodMorning', 'Good Morning'),
    ('en', 'home.goodAfternoon', 'Good Afternoon'),
    ('en', 'home.goodEvening', 'Good Evening'),
    ('en', 'home.readyToTrain', 'Ready to crush your workout today?'),
    ('en', 'home.walletBalance', 'Wallet Balance'),
    ('en', 'home.topUp', 'Top Up'),
    ('en', 'home.upcomingSession', 'Upcoming Session'),
    ('en', 'home.explore', 'Explore'),
    ('en', 'home.bookings', 'Bookings'),
    ('en', 'home.favorites', 'Favorites'),
    ('en', 'home.support', 'Support'),
    ('en', 'home.popularGyms', 'Popular Gyms'),
    ('en', 'home.viewAll', 'View All'),
    ('en', 'home.session', 'session'),
    ('en', 'explore.title', 'Explore Gyms'),
    ('en', 'explore.search', 'Search gyms...'),
    ('en', 'explore.filters', 'Filters'),
    ('en', 'explore.sort', 'Sort'),
    ('en', 'explore.sportTypes', 'Sport Types'),
    ('en', 'explore.distance', 'Distance'),
    ('en', 'explore.priceRange', 'Price Range'),
    ('en', 'explore.rating', 'Rating'),
    ('en', 'explore.amenities', 'Amenities'),
    ('en', 'explore.sortNearest', 'Nearest'),
    ('en', 'explore.sortCheapest', 'Cheapest'),
    ('en', 'explore.sortHighestRated', 'Highest Rated'),
    ('en', 'explore.sortMostPopular', 'Most Popular'),
    ('en', 'explore.open', 'Open'),
    ('en', 'explore.closed', 'Closed'),
    ('en', 'explore.perSession', 'per session'),
    ('en', 'explore.reviews', 'reviews'),
    ('en', 'explore.noResults', 'No gyms found'),
    ('en', 'explore.clearFilters', 'Clear All'),
    ('en', 'explore.applyFilters', 'Apply Filters'),
    ('en', 'explore.all', 'All'),
    ('en', 'explore.km', 'km'),
    ('en', 'explore.results', 'results'),
    ('en', 'gymDetail.back', 'Back'),
    ('en', 'gymDetail.photos', 'Photos'),
    ('en', 'gymDetail.about', 'About'),
    ('en', 'gymDetail.readMore', 'Read More'),
    ('en', 'gymDetail.readLess', 'Read Less'),
    ('en', 'gymDetail.workingHours', 'Working Hours'),
    ('en', 'gymDetail.open', 'Open Now'),
    ('en', 'gymDetail.closed', 'Closed'),
    ('en', 'gymDetail.selectDate', 'Select Date'),
    ('en', 'gymDetail.selectTime', 'Select Time'),
    ('en', 'gymDetail.available', 'Available'),
    ('en', 'gymDetail.full', 'Full'),
    ('en', 'gymDetail.selected', 'Selected'),
    ('en', 'gymDetail.trainers', 'Trainers'),
    ('en', 'gymDetail.specialty', 'Specialty'),
    ('en', 'gymDetail.amenities', 'Amenities'),
    ('en', 'gymDetail.location', 'Location'),
    ('en', 'gymDetail.getDirections', 'Get Directions'),
    ('en', 'gymDetail.contact', 'Contact'),
    ('en', 'gymDetail.phone', 'Phone'),
    ('en', 'gymDetail.instagram', 'Instagram'),
    ('en', 'gymDetail.website', 'Website'),
    ('en', 'gymDetail.reviews', 'Reviews'),
    ('en', 'gymDetail.writeReview', 'Write a Review'),
    ('en', 'gymDetail.noReviews', 'No reviews yet'),
    ('en', 'gymDetail.ratingSummary', 'Rating Summary'),
    ('en', 'gymDetail.buySession', 'Buy Session'),
    ('en', 'gymDetail.perSession', 'per session'),
    ('en', 'gymDetail.sessionsLeft', 'sessions left'),
    ('en', 'gymDetail.today', 'Today'),
    ('en', 'gymDetail.tomorrow', 'Tomorrow'),
    ('en', 'gymDetail.noSlots', 'No available slots for this date'),
    ('en', 'booking.title', 'Booking Summary'),
    ('en', 'booking.gym', 'Gym'),
    ('en', 'booking.date', 'Date'),
    ('en', 'booking.time', 'Time'),
    ('en', 'booking.price', 'Session Price'),
    ('en', 'booking.walletBalance', 'Wallet Balance'),
    ('en', 'booking.balanceAfter', 'Balance After'),
    ('en', 'booking.confirm', 'Confirm Booking'),
    ('en', 'booking.cancel', 'Cancel'),
    ('en', 'booking.success', 'Booking Confirmed!'),
    ('en', 'booking.successDesc', 'Your session has been booked successfully'),
    ('en', 'booking.viewBookings', 'View My Bookings'),
    ('en', 'booking.backToGym', 'Back to Gym'),
    ('en', 'booking.insufficientBalance', 'Insufficient Balance'),
    ('en', 'booking.insufficientDesc', 'You don''t have enough balance to book this session'),
    ('en', 'booking.topUp', 'Top Up Wallet'),
    ('en', 'booking.processing', 'Processing...'),
    ('en', 'bookings.title', 'My Bookings'),
    ('en', 'bookings.upcoming', 'Upcoming'),
    ('en', 'bookings.completed', 'Completed'),
    ('en', 'bookings.cancelled', 'Cancelled'),
    ('en', 'bookings.empty', 'No bookings yet'),
    ('en', 'bookings.emptyDesc', 'When you book a session, it will appear here'),
    ('en', 'bookings.session', 'Session'),
    ('en', 'bookings.rateReview', 'Rate & Review'),
    ('en', 'bookings.cancelBooking', 'Cancel Booking'),
    ('en', 'bookings.viewGym', 'View Gym'),
    ('en', 'bookings.reviewTitle', 'Rate Your Experience'),
    ('en', 'bookings.reviewDesc', 'How was your session at this gym?'),
    ('en', 'bookings.submitReview', 'Submit Review'),
    ('en', 'bookings.writeComment', 'Write a comment...'),
    ('en', 'bookings.cancelledLabel', 'Cancelled'),
    ('en', 'bookings.completedLabel', 'Completed'),
    ('en', 'bookings.upcomingLabel', 'Upcoming'),
    ('en', 'profile.title', 'Profile'),
    ('en', 'profile.editProfile', 'Edit Profile'),
    ('en', 'profile.wallet', 'Wallet'),
    ('en', 'profile.balance', 'Balance'),
    ('en', 'profile.transactions', 'Transactions'),
    ('en', 'profile.topUp', 'Top Up'),
    ('en', 'profile.language', 'Language'),
    ('en', 'profile.notifications', 'Notifications'),
    ('en', 'profile.favorites', 'Favorites'),
    ('en', 'profile.support', 'Support'),
    ('en', 'profile.about', 'About'),
    ('en', 'profile.logout', 'Log Out'),
    ('en', 'profile.logoutConfirm', 'Are you sure you want to log out?'),
    ('en', 'profile.sessions', 'Sessions'),
    ('en', 'profile.memberSince', 'Member since'),
    ('en', 'profile.save', 'Save'),
    ('en', 'profile.cancel', 'Cancel'),
    ('en', 'profile.editName', 'Edit Name'),
    ('en', 'profile.namePlaceholder', 'Enter your name'),
    ('en', 'profile.topUpTitle', 'Top Up Wallet'),
    ('en', 'profile.topUpAmount', 'Amount'),
    ('en', 'profile.topUpDesc', 'Select or enter an amount to add to your wallet'),
    ('en', 'profile.customAmount', 'Custom amount'),
    ('en', 'profile.recentTransactions', 'Recent Transactions'),
    ('en', 'profile.noTransactions', 'No transactions yet'),
    ('en', 'profile.deposit', 'Deposit'),
    ('en', 'profile.withdrawal', 'Withdrawal'),
    ('en', 'profile.payment', 'Payment'),
    ('en', 'onboarding.title', 'Let''s Get Started'),
    ('en', 'onboarding.subtitle', 'Tell us about yourself to personalize your experience'),
    ('en', 'onboarding.step1.title', 'Personal Info'),
    ('en', 'onboarding.step1.subtitle', 'What should we call you?'),
    ('en', 'onboarding.step1.name', 'Full Name'),
    ('en', 'onboarding.step1.namePlaceholder', 'Enter your name'),
    ('en', 'onboarding.step1.dob', 'Date of Birth'),
    ('en', 'onboarding.step1.gender', 'Gender'),
    ('en', 'onboarding.step1.male', 'Male'),
    ('en', 'onboarding.step1.female', 'Female'),
    ('en', 'onboarding.step1.other', 'Other'),
    ('en', 'onboarding.step2.title', 'Fitness Profile'),
    ('en', 'onboarding.step2.subtitle', 'Help us tailor your experience'),
    ('en', 'onboarding.step2.level', 'Fitness Level'),
    ('en', 'onboarding.step2.beginner', 'Beginner'),
    ('en', 'onboarding.step2.intermediate', 'Intermediate'),
    ('en', 'onboarding.step2.advanced', 'Advanced'),
    ('en', 'onboarding.step2.professional', 'Professional'),
    ('en', 'onboarding.step2.goals', 'What are your goals?'),
    ('en', 'onboarding.step2.weight_loss', 'Weight Loss'),
    ('en', 'onboarding.step2.muscle_gain', 'Muscle Gain'),
    ('en', 'onboarding.step2.endurance', 'Endurance'),
    ('en', 'onboarding.step2.flexibility', 'Flexibility'),
    ('en', 'onboarding.step2.general_fitness', 'General Fitness'),
    ('en', 'onboarding.step3.title', 'Choose Your Gym'),
    ('en', 'onboarding.step3.subtitle', 'Pick your home gym (optional)'),
    ('en', 'onboarding.next', 'Next'),
    ('en', 'onboarding.back', 'Back'),
    ('en', 'onboarding.complete', 'Get Started!'),
    ('en', 'onboarding.step', 'Step'),
    ('en', 'onboarding.of', 'of'),
    ('en', 'onboarding.saving', 'Saving...')
ON CONFLICT (locale, key) DO NOTHING;

-- ============================================================
-- 6. SEED TRANSLATIONS (Farsi)
-- ============================================================
INSERT INTO public.translations (locale, key, value) VALUES
    ('fa', 'global_demo.title', 'دموی موتور سراسری'),
    ('fa', 'global_demo.subtitle', 'سیستم مرکزی چندزبانه، چندارزی و پرچم ویژگی'),
    ('fa', 'global_demo.language', 'زبان'),
    ('fa', 'global_demo.english', 'English'),
    ('fa', 'global_demo.persian', 'فارسی'),
    ('fa', 'global_demo.currency_title', 'نمایش چندارزی'),
    ('fa', 'global_demo.currency_desc', 'همان مقدار (۵۰۰٬۰۰۰ واحد کوچک) قالب‌بندی شده بر اساس کشور'),
    ('fa', 'global_demo.usd_label', 'ایالات متحده (دلار)'),
    ('fa', 'global_demo.irr_label', 'ایران (تومان)'),
    ('fa', 'global_demo.feature_title', 'پرچم‌های ویژگی'),
    ('fa', 'global_demo.feature_desc', 'فعال/غیرفعال کردن ویژگی‌ها — شبیه‌سازی پیکربندی کشور'),
    ('fa', 'global_demo.wallet', 'کیف پول'),
    ('fa', 'global_demo.wallet_desc', 'موجودی و تاریخچه تراکنش‌های شما'),
    ('fa', 'global_demo.wallet_balance', 'موجودی کیف پول'),
    ('fa', 'global_demo.wallet_disabled', 'در کشور شما غیرفعال است'),
    ('fa', 'global_demo.dynamic_title', 'موتور چیدمان پویا'),
    ('fa', 'global_demo.dynamic_desc', 'کامپوننت‌ها از آرایه JSON رندر شده‌اند'),
    ('fa', 'global_demo.header_card', 'خوش آمدید'),
    ('fa', 'global_demo.header_card_desc', 'آماده‌اید امروز تمرین کنید؟'),
    ('fa', 'global_demo.stats_card', 'آمار تمرین'),
    ('fa', 'global_demo.stats_card_desc', 'پیشرفت خود را در طول زمان پیگیری کنید'),
    ('fa', 'global_demo.toggle', 'تغییر وضعیت'),
    ('fa', 'global_demo.enabled', 'فعال'),
    ('fa', 'global_demo.disabled', 'غیرفعال'),
    ('fa', 'global_demo.minor_units', 'واحدهای کوچک (خام):'),
    ('fa', 'login.title', 'خوش آمدید'),
    ('fa', 'login.subtitle', 'برای ادامه وارد شوید'),
    ('fa', 'login.phone_placeholder', 'شماره موبایل'),
    ('fa', 'login.otp_placeholder', 'کد تأیید'),
    ('fa', 'login.button_send', 'ارسال کد'),
    ('fa', 'login.button_verify', 'تأیید'),
    ('fa', 'login.button_resend', 'ارسال مجدد'),
    ('fa', 'login.select_country', 'انتخاب کشور'),
    ('fa', 'login.otp_sent', 'کد ارسال شد!'),
    ('fa', 'login.invalid_otp', 'کد نامعتبر'),
    ('fa', 'login.invalid_phone', 'شماره موبایل نامعتبر'),
    ('fa', 'login.verifying', 'در حال تأیید...'),
    ('fa', 'login.sending', 'در حال ارسال...'),
    ('fa', 'login.back', 'بازگشت'),
    ('fa', 'nav.home', 'خانه'),
    ('fa', 'nav.explore', 'جستجو'),
    ('fa', 'nav.bookings', 'رزروها'),
    ('fa', 'nav.profile', 'پروفایل'),
    ('fa', 'home.goodMorning', 'صبح بخیر'),
    ('fa', 'home.goodAfternoon', 'عصر بخیر'),
    ('fa', 'home.goodEvening', 'عصر بخیر'),
    ('fa', 'home.readyToTrain', 'آماده‌اید امروز تمرین کنید؟'),
    ('fa', 'home.walletBalance', 'موجودی کیف پول'),
    ('fa', 'home.topUp', 'شارژ'),
    ('fa', 'home.upcomingSession', 'جلسه بعدی'),
    ('fa', 'home.explore', 'جستجو'),
    ('fa', 'home.bookings', 'رزروها'),
    ('fa', 'home.favorites', 'علاقه‌مندی‌ها'),
    ('fa', 'home.support', 'پشتیبانی'),
    ('fa', 'home.popularGyms', 'باشگاه‌های محبوب'),
    ('fa', 'home.viewAll', 'مشاهده همه'),
    ('fa', 'home.session', 'جلسه'),
    ('fa', 'explore.title', 'جستجوی باشگاه'),
    ('fa', 'explore.search', 'جستجوی باشگاه...'),
    ('fa', 'explore.filters', 'فیلترها'),
    ('fa', 'explore.sort', 'مرتب‌سازی'),
    ('fa', 'explore.sportTypes', 'نوع ورزش'),
    ('fa', 'explore.distance', 'فاصله'),
    ('fa', 'explore.priceRange', 'محدوده قیمت'),
    ('fa', 'explore.rating', 'امتیاز'),
    ('fa', 'explore.amenities', 'امکانات'),
    ('fa', 'explore.sortNearest', 'نزدیک‌ترین'),
    ('fa', 'explore.sortCheapest', 'ارزان‌ترین'),
    ('fa', 'explore.sortHighestRated', 'بالاترین امتیاز'),
    ('fa', 'explore.sortMostPopular', 'محبوب‌ترین'),
    ('fa', 'explore.open', 'باز'),
    ('fa', 'explore.closed', 'بسته'),
    ('fa', 'explore.perSession', 'هر جلسه'),
    ('fa', 'explore.reviews', 'نظر'),
    ('fa', 'explore.noResults', 'باشگاهی یافت نشد'),
    ('fa', 'explore.clearFilters', 'پاک کردن همه'),
    ('fa', 'explore.applyFilters', 'اعمال فیلترها'),
    ('fa', 'explore.all', 'همه'),
    ('fa', 'explore.km', 'کیلومتر'),
    ('fa', 'explore.results', 'نتایج'),
    ('fa', 'gymDetail.back', 'بازگشت'),
    ('fa', 'gymDetail.photos', 'تصاویر'),
    ('fa', 'gymDetail.about', 'درباره باشگاه'),
    ('fa', 'gymDetail.readMore', 'بیشتر بخوانید'),
    ('fa', 'gymDetail.readLess', 'بستن'),
    ('fa', 'gymDetail.workingHours', 'ساعت کاری'),
    ('fa', 'gymDetail.open', 'باز است'),
    ('fa', 'gymDetail.closed', 'بسته'),
    ('fa', 'gymDetail.selectDate', 'انتخاب تاریخ'),
    ('fa', 'gymDetail.selectTime', 'انتخاب ساعت'),
    ('fa', 'gymDetail.available', 'آزاد'),
    ('fa', 'gymDetail.full', 'تکمیل'),
    ('fa', 'gymDetail.selected', 'انتخاب شده'),
    ('fa', 'gymDetail.trainers', 'مربی‌ها'),
    ('fa', 'gymDetail.specialty', 'تخصص'),
    ('fa', 'gymDetail.amenities', 'امکانات'),
    ('fa', 'gymDetail.location', 'موقعیت'),
    ('fa', 'gymDetail.getDirections', 'مسیریابی'),
    ('fa', 'gymDetail.contact', 'تماس'),
    ('fa', 'gymDetail.phone', 'تلفن'),
    ('fa', 'gymDetail.instagram', 'اینستاگرام'),
    ('fa', 'gymDetail.website', 'وبسایت'),
    ('fa', 'gymDetail.reviews', 'نظرات'),
    ('fa', 'gymDetail.writeReview', 'ثبت نظر'),
    ('fa', 'gymDetail.noReviews', 'هنوز نظری ثبت نشده'),
    ('fa', 'gymDetail.ratingSummary', 'خلاصه امتیازات'),
    ('fa', 'gymDetail.buySession', 'خرید جلسه'),
    ('fa', 'gymDetail.perSession', 'هر جلسه'),
    ('fa', 'gymDetail.sessionsLeft', 'جلسه باقی‌مانده'),
    ('fa', 'gymDetail.today', 'امروز'),
    ('fa', 'gymDetail.tomorrow', 'فردا'),
    ('fa', 'gymDetail.noSlots', 'ساعتی برای این تاریخ موجود نیست'),
    ('fa', 'booking.title', 'خلاصه رزرو'),
    ('fa', 'booking.gym', 'باشگاه'),
    ('fa', 'booking.date', 'تاریخ'),
    ('fa', 'booking.time', 'ساعت'),
    ('fa', 'booking.price', 'قیمت جلسه'),
    ('fa', 'booking.walletBalance', 'موجودی کیف پول'),
    ('fa', 'booking.balanceAfter', 'موجودی بعد از خرید'),
    ('fa', 'booking.confirm', 'تأیید رزرو'),
    ('fa', 'booking.cancel', 'انصراف'),
    ('fa', 'booking.success', 'رزرو تأیید شد!'),
    ('fa', 'booking.successDesc', 'جلسه شما با موفقیت رزرو شد'),
    ('fa', 'booking.viewBookings', 'مشاهده رزروها'),
    ('fa', 'booking.backToGym', 'بازگشت به باشگاه'),
    ('fa', 'booking.insufficientBalance', 'موجودی ناکافی'),
    ('fa', 'booking.insufficientDesc', 'موجودی کیف پول شما برای رزرو این جلسه کافی نیست'),
    ('fa', 'booking.topUp', 'شارژ کیف پول'),
    ('fa', 'booking.processing', 'در حال پردازش...'),
    ('fa', 'bookings.title', 'رزروهای من'),
    ('fa', 'bookings.upcoming', 'آینده'),
    ('fa', 'bookings.completed', 'تکمیل شده'),
    ('fa', 'bookings.cancelled', 'لغو شده'),
    ('fa', 'bookings.empty', 'هنوز رزروی ندارید'),
    ('fa', 'bookings.emptyDesc', 'وقتی جلسه‌ای رزرو کنید، اینجا نمایش داده می‌شود'),
    ('fa', 'bookings.session', 'جلسه'),
    ('fa', 'bookings.rateReview', 'امتیاز و نظر'),
    ('fa', 'bookings.cancelBooking', 'لغو رزرو'),
    ('fa', 'bookings.viewGym', 'مشاهده باشگاه'),
    ('fa', 'bookings.reviewTitle', 'تجربه خود را امتیاز دهید'),
    ('fa', 'bookings.reviewDesc', 'جلسه شما در این باشگاه چطور بود؟'),
    ('fa', 'bookings.submitReview', 'ثبت نظر'),
    ('fa', 'bookings.writeComment', 'نظر خود را بنویسید...'),
    ('fa', 'bookings.cancelledLabel', 'لغو شده'),
    ('fa', 'bookings.completedLabel', 'تکمیل شده'),
    ('fa', 'bookings.upcomingLabel', 'آینده'),
    ('fa', 'profile.title', 'پروفایل'),
    ('fa', 'profile.editProfile', 'ویرایش پروفایل'),
    ('fa', 'profile.wallet', 'کیف پول'),
    ('fa', 'profile.balance', 'موجودی'),
    ('fa', 'profile.transactions', 'تراکنش‌ها'),
    ('fa', 'profile.topUp', 'شارژ'),
    ('fa', 'profile.language', 'زبان'),
    ('fa', 'profile.notifications', 'اعلان‌ها'),
    ('fa', 'profile.favorites', 'علاقه‌مندی‌ها'),
    ('fa', 'profile.support', 'پشتیبانی'),
    ('fa', 'profile.about', 'درباره ما'),
    ('fa', 'profile.logout', 'خروج'),
    ('fa', 'profile.logoutConfirm', 'آیا مطمئن هستید که می‌خواهید خارج شوید؟'),
    ('fa', 'profile.sessions', 'جلسات'),
    ('fa', 'profile.memberSince', 'عضو از'),
    ('fa', 'profile.save', 'ذخیره'),
    ('fa', 'profile.cancel', 'انصراف'),
    ('fa', 'profile.editName', 'ویرایش نام'),
    ('fa', 'profile.namePlaceholder', 'نام خود را وارد کنید'),
    ('fa', 'profile.topUpTitle', 'شارژ کیف پول'),
    ('fa', 'profile.topUpAmount', 'مبلغ'),
    ('fa', 'profile.topUpDesc', 'مبلغ مورد نظر برای شارژ را انتخاب یا وارد کنید'),
    ('fa', 'profile.customAmount', 'مبلغ دلخواه'),
    ('fa', 'profile.recentTransactions', 'تراکنش‌های اخیر'),
    ('fa', 'profile.noTransactions', 'هنوز تراکنشی ندارید'),
    ('fa', 'profile.deposit', 'واریز'),
    ('fa', 'profile.withdrawal', 'برداشت'),
    ('fa', 'profile.payment', 'پرداخت'),
    ('fa', 'onboarding.title', 'شروع کنیم'),
    ('fa', 'onboarding.subtitle', 'درباره خودتان بگویید تا تجربه شما شخصی‌سازی شود'),
    ('fa', 'onboarding.step1.title', 'اطلاعات شخصی'),
    ('fa', 'onboarding.step1.subtitle', 'چطور صدا کنیم؟'),
    ('fa', 'onboarding.step1.name', 'نام کامل'),
    ('fa', 'onboarding.step1.namePlaceholder', 'نام خود را وارد کنید'),
    ('fa', 'onboarding.step1.dob', 'تاریخ تولد'),
    ('fa', 'onboarding.step1.gender', 'جنسیت'),
    ('fa', 'onboarding.step1.male', 'مرد'),
    ('fa', 'onboarding.step1.female', 'زن'),
    ('fa', 'onboarding.step1.other', 'سایر'),
    ('fa', 'onboarding.step2.title', 'پروفایل ورزشی'),
    ('fa', 'onboarding.step2.subtitle', 'به ما کمک کنید تجربه شما را تنظیم کنیم'),
    ('fa', 'onboarding.step2.level', 'سطح ورزشی'),
    ('fa', 'onboarding.step2.beginner', 'مبتدی'),
    ('fa', 'onboarding.step2.intermediate', 'متوسط'),
    ('fa', 'onboarding.step2.advanced', 'پیشرفته'),
    ('fa', 'onboarding.step2.professional', 'حرفه‌ای'),
    ('fa', 'onboarding.step2.goals', 'هدف‌های شما چیست؟'),
    ('fa', 'onboarding.step2.weight_loss', 'کاهش وزن'),
    ('fa', 'onboarding.step2.muscle_gain', 'عضله‌سازی'),
    ('fa', 'onboarding.step2.endurance', 'استقامت'),
    ('fa', 'onboarding.step2.flexibility', 'انعطاف‌پذیری'),
    ('fa', 'onboarding.step2.general_fitness', 'تناسب عمومی'),
    ('fa', 'onboarding.step3.title', 'باشگاه خود را انتخاب کنید'),
    ('fa', 'onboarding.step3.subtitle', 'انتخاب باشگاه (اختیاری)'),
    ('fa', 'onboarding.next', 'بعدی'),
    ('fa', 'onboarding.back', 'قبلی'),
    ('fa', 'onboarding.complete', 'شروع!'),
    ('fa', 'onboarding.step', 'مرحله'),
    ('fa', 'onboarding.of', 'از'),
    ('fa', 'onboarding.saving', 'در حال ذخیره...')
ON CONFLICT (locale, key) DO NOTHING;
-- ============================================================
-- MIGRATION: supabase/migrations/20240522000000_add_admin_rbac_policies.sql
-- ============================================================

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
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Policy: Users can update their own profile (except role and wallet_balance)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
  wallet_balance = (SELECT wallet_balance FROM profiles WHERE id = auth.uid())
);

-- Policy: Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (is_admin());

-- Policy: Admins can update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
USING (is_admin());

-- Policy: Admins can insert new profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
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
DROP POLICY IF EXISTS "Everyone can view gyms" ON public.gyms;
CREATE POLICY "Everyone can view gyms"
ON gyms FOR SELECT
USING (true);

-- Policy: Managers can update their own gym
DROP POLICY IF EXISTS "Managers can update own gym" ON public.gyms;
CREATE POLICY "Managers can update own gym"
ON gyms FOR UPDATE
USING (id = get_user_gym_id());

-- Policy: Admins can update any gym
DROP POLICY IF EXISTS "Admins can update any gym" ON public.gyms;
CREATE POLICY "Admins can update any gym"
ON gyms FOR UPDATE
USING (is_admin());

-- Policy: Admins can insert new gyms
DROP POLICY IF EXISTS "Admins can insert gyms" ON public.gyms;
CREATE POLICY "Admins can insert gyms"
ON gyms FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can delete gyms
DROP POLICY IF EXISTS "Admins can delete gyms" ON public.gyms;
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
DROP POLICY IF EXISTS "Athletes can view own bookings" ON public.bookings;
CREATE POLICY "Athletes can view own bookings"
ON bookings FOR SELECT
USING (athlete_id = auth.uid());

-- Policy: Managers can view bookings for their gym
DROP POLICY IF EXISTS "Managers can view gym bookings" ON public.bookings;
CREATE POLICY "Managers can view gym bookings"
ON bookings FOR SELECT
USING (gym_id = get_user_gym_id());

-- Policy: Admins can view all bookings
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
USING (is_admin());

-- Policy: Athletes can create bookings
DROP POLICY IF EXISTS "Athletes can create bookings" ON public.bookings;
CREATE POLICY "Athletes can create bookings"
ON bookings FOR INSERT
WITH CHECK (athlete_id = auth.uid());

-- Policy: Admins can create any booking
DROP POLICY IF EXISTS "Admins can create any booking" ON public.bookings;
CREATE POLICY "Admins can create any booking"
ON bookings FOR INSERT
WITH CHECK (is_admin());

-- Policy: Athletes can update their own bookings
DROP POLICY IF EXISTS "Athletes can update own bookings" ON public.bookings;
CREATE POLICY "Athletes can update own bookings"
ON bookings FOR UPDATE
USING (athlete_id = auth.uid())
WITH CHECK (athlete_id = auth.uid());

-- Policy: Admins can update any booking
DROP POLICY IF EXISTS "Admins can update any booking" ON public.bookings;
CREATE POLICY "Admins can update any booking"
ON bookings FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete bookings
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;
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
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
ON wallet_transactions FOR SELECT
USING (profile_id = auth.uid());

-- Policy: Admins can view all wallet transactions
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions"
ON wallet_transactions FOR SELECT
USING (is_admin());

-- Policy: Admins can insert wallet transactions
DROP POLICY IF EXISTS "Admins can insert wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can insert wallet transactions"
ON wallet_transactions FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update wallet transactions
DROP POLICY IF EXISTS "Admins can update wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can update wallet transactions"
ON wallet_transactions FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete wallet transactions
DROP POLICY IF EXISTS "Admins can delete wallet transactions" ON public.wallet_transactions;
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
DROP POLICY IF EXISTS "Everyone can view trainers" ON public.gym_trainers;
CREATE POLICY "Everyone can view trainers"
ON gym_trainers FOR SELECT
USING (true);

-- Policy: Managers can view their gym's trainers
DROP POLICY IF EXISTS "Managers can view gym trainers" ON public.gym_trainers;
CREATE POLICY "Managers can view gym trainers"
ON gym_trainers FOR SELECT
USING (gym_id = get_user_gym_id());

-- Policy: Managers can insert trainers for their gym
DROP POLICY IF EXISTS "Managers can insert gym trainers" ON public.gym_trainers;
CREATE POLICY "Managers can insert gym trainers"
ON gym_trainers FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's trainers
DROP POLICY IF EXISTS "Managers can update gym trainers" ON public.gym_trainers;
CREATE POLICY "Managers can update gym trainers"
ON gym_trainers FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's trainers
DROP POLICY IF EXISTS "Managers can delete gym trainers" ON public.gym_trainers;
CREATE POLICY "Managers can delete gym trainers"
ON gym_trainers FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any trainer
DROP POLICY IF EXISTS "Admins can insert any trainer" ON public.gym_trainers;
CREATE POLICY "Admins can insert any trainer"
ON gym_trainers FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any trainer
DROP POLICY IF EXISTS "Admins can update any trainer" ON public.gym_trainers;
CREATE POLICY "Admins can update any trainer"
ON gym_trainers FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any trainer
DROP POLICY IF EXISTS "Admins can delete any trainer" ON public.gym_trainers;
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
DROP POLICY IF EXISTS "Everyone can view time slots" ON public.gym_time_slots;
CREATE POLICY "Everyone can view time slots"
ON gym_time_slots FOR SELECT
USING (true);

-- Policy: Managers can view their gym's time slots
DROP POLICY IF EXISTS "Managers can view gym time slots" ON public.gym_time_slots;
CREATE POLICY "Managers can view gym time slots"
ON gym_time_slots FOR SELECT
USING (gym_id = get_user_gym_id());

-- Policy: Managers can insert time slots for their gym
DROP POLICY IF EXISTS "Managers can insert gym time slots" ON public.gym_time_slots;
CREATE POLICY "Managers can insert gym time slots"
ON gym_time_slots FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's time slots
DROP POLICY IF EXISTS "Managers can update gym time slots" ON public.gym_time_slots;
CREATE POLICY "Managers can update gym time slots"
ON gym_time_slots FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's time slots
DROP POLICY IF EXISTS "Managers can delete gym time slots" ON public.gym_time_slots;
CREATE POLICY "Managers can delete gym time slots"
ON gym_time_slots FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any time slot
DROP POLICY IF EXISTS "Admins can insert any time slot" ON public.gym_time_slots;
CREATE POLICY "Admins can insert any time slot"
ON gym_time_slots FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any time slot
DROP POLICY IF EXISTS "Admins can update any time slot" ON public.gym_time_slots;
CREATE POLICY "Admins can update any time slot"
ON gym_time_slots FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any time slot
DROP POLICY IF EXISTS "Admins can delete any time slot" ON public.gym_time_slots;
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
DROP POLICY IF EXISTS "Everyone can view gym photos" ON public.gym_photos;
CREATE POLICY "Everyone can view gym photos"
ON gym_photos FOR SELECT
USING (true);

-- Policy: Managers can insert photos for their gym
DROP POLICY IF EXISTS "Managers can insert gym photos" ON public.gym_photos;
CREATE POLICY "Managers can insert gym photos"
ON gym_photos FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's photos
DROP POLICY IF EXISTS "Managers can update gym photos" ON public.gym_photos;
CREATE POLICY "Managers can update gym photos"
ON gym_photos FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's photos
DROP POLICY IF EXISTS "Managers can delete gym photos" ON public.gym_photos;
CREATE POLICY "Managers can delete gym photos"
ON gym_photos FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any gym photo
DROP POLICY IF EXISTS "Admins can insert any gym photo" ON public.gym_photos;
CREATE POLICY "Admins can insert any gym photo"
ON gym_photos FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any gym photo
DROP POLICY IF EXISTS "Admins can update any gym photo" ON public.gym_photos;
CREATE POLICY "Admins can update any gym photo"
ON gym_photos FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any gym photo
DROP POLICY IF EXISTS "Admins can delete any gym photo" ON public.gym_photos;
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
DROP POLICY IF EXISTS "Everyone can view gym amenities" ON public.gym_amenities;
CREATE POLICY "Everyone can view gym amenities"
ON gym_amenities FOR SELECT
USING (true);

-- Policy: Managers can insert amenities for their gym
DROP POLICY IF EXISTS "Managers can insert gym amenities" ON public.gym_amenities;
CREATE POLICY "Managers can insert gym amenities"
ON gym_amenities FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's amenities
DROP POLICY IF EXISTS "Managers can update gym amenities" ON public.gym_amenities;
CREATE POLICY "Managers can update gym amenities"
ON gym_amenities FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's amenities
DROP POLICY IF EXISTS "Managers can delete gym amenities" ON public.gym_amenities;
CREATE POLICY "Managers can delete gym amenities"
ON gym_amenities FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any gym amenity
DROP POLICY IF EXISTS "Admins can insert any gym amenity" ON public.gym_amenities;
CREATE POLICY "Admins can insert any gym amenity"
ON gym_amenities FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any gym amenity
DROP POLICY IF EXISTS "Admins can update any gym amenity" ON public.gym_amenities;
CREATE POLICY "Admins can update any gym amenity"
ON gym_amenities FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any gym amenity
DROP POLICY IF EXISTS "Admins can delete any gym amenity" ON public.gym_amenities;
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
DROP POLICY IF EXISTS "Everyone can view gym sport types" ON public.gym_sport_types;
CREATE POLICY "Everyone can view gym sport types"
ON gym_sport_types FOR SELECT
USING (true);

-- Policy: Managers can insert sport types for their gym
DROP POLICY IF EXISTS "Managers can insert gym sport types" ON public.gym_sport_types;
CREATE POLICY "Managers can insert gym sport types"
ON gym_sport_types FOR INSERT
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can update their gym's sport types
DROP POLICY IF EXISTS "Managers can update gym sport types" ON public.gym_sport_types;
CREATE POLICY "Managers can update gym sport types"
ON gym_sport_types FOR UPDATE
USING (gym_id = get_user_gym_id())
WITH CHECK (gym_id = get_user_gym_id());

-- Policy: Managers can delete their gym's sport types
DROP POLICY IF EXISTS "Managers can delete gym sport types" ON public.gym_sport_types;
CREATE POLICY "Managers can delete gym sport types"
ON gym_sport_types FOR DELETE
USING (gym_id = get_user_gym_id());

-- Policy: Admins can insert any gym sport type
DROP POLICY IF EXISTS "Admins can insert any gym sport type" ON public.gym_sport_types;
CREATE POLICY "Admins can insert any gym sport type"
ON gym_sport_types FOR INSERT
WITH CHECK (is_admin());

-- Policy: Admins can update any gym sport type
DROP POLICY IF EXISTS "Admins can update any gym sport type" ON public.gym_sport_types;
CREATE POLICY "Admins can update any gym sport type"
ON gym_sport_types FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete any gym sport type
DROP POLICY IF EXISTS "Admins can delete any gym sport type" ON public.gym_sport_types;
CREATE POLICY "Admins can delete any gym sport type"
ON gym_sport_types FOR DELETE
USING (is_admin());
-- ============================================================
-- MIGRATION: supabase/migrations/20240522000001_create_audit_logs_table.sql
-- ============================================================

-- Create audit_logs table
-- This table tracks all admin actions for security and compliance

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'user_created',
      'user_updated',
      'user_deleted',
      'user_role_changed',
      'gym_created',
      'gym_updated',
      'gym_deleted',
      'booking_created',
      'booking_updated',
      'booking_cancelled',
      'wallet_transaction',
      'config_updated'
    )
  ),
  target_type TEXT NOT NULL,
  target_id UUID,
  action_details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index on admin_user_id for filtering by admin
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON audit_logs(admin_user_id);

-- Create index on action_type for filtering by action type
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- Create index on created_at for date range filtering and sorting
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_created ON audit_logs(admin_user_id, created_at DESC);

-- Create composite index for action_type and created_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action_type, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy: Only admins can read audit logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policy: Only admins can insert audit logs
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add comment to table
COMMENT ON TABLE audit_logs IS 'Audit log table tracking all admin actions for security and compliance';

-- Add comments to columns
COMMENT ON COLUMN audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN audit_logs.admin_user_id IS 'ID of the admin user who performed the action';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action performed (e.g., user_created, gym_updated)';
COMMENT ON COLUMN audit_logs.target_type IS 'Type of entity affected (e.g., user, gym, booking)';
COMMENT ON COLUMN audit_logs.target_id IS 'ID of the entity affected by the action';
COMMENT ON COLUMN audit_logs.action_details IS 'JSON object containing detailed information about the action';
COMMENT ON COLUMN audit_logs.created_at IS 'Timestamp when the action was performed';
-- ============================================================
-- MIGRATION: supabase/migrations/20240523000000_create_admin_user.sql
-- ============================================================

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
-- ============================================================
-- MIGRATION: supabase/migrations/20240524000000_create_workout_tracking_schema.sql
-- ============================================================

-- ============================================================
-- Workout Tracking Schema: exercises, workout_sessions, workout_sets, custom_exercises
-- Hevy-like workout logging feature for rokhdad FIT
-- MUST be applied AFTER base tables migration
-- ============================================================

-- ============================================================
-- 1. MUSCLE_GROUPS TABLE (Lookup)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.muscle_groups (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Muscle groups are publicly readable" ON public.muscle_groups;
CREATE POLICY "Muscle groups are publicly readable"
    ON public.muscle_groups FOR SELECT
    USING (true);

-- Seed muscle groups
INSERT INTO public.muscle_groups (id, name_en, icon, sort_order) VALUES
    ('chest', 'Chest', '🫁', 1),
    ('back', 'Back', '🔙', 2),
    ('shoulders', 'Shoulders', '💪', 3),
    ('biceps', 'Biceps', '💪', 4),
    ('triceps', 'Triceps', '🦾', 5),
    ('forearms', 'Forearms', '🦾', 6),
    ('quads', 'Quadriceps', '🦵', 7),
    ('hamstrings', 'Hamstrings', '🦵', 8),
    ('glutes', 'Glutes', '🍑', 9),
    ('calves', 'Calves', '🦶', 10),
    ('abs', 'Abs', '🎯', 11),
    ('traps', 'Traps', '🔺', 12),
    ('neck', 'Neck', '🔗', 13),
    ('full_body', 'Full Body', '🏋️', 14),
    ('cardio', 'Cardio', '❤️', 15),
    ('core', 'Core', '🎯', 16)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. EQUIPMENT_TYPES TABLE (Lookup)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.equipment_types (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipment types are publicly readable" ON public.equipment_types;
CREATE POLICY "Equipment types are publicly readable"
    ON public.equipment_types FOR SELECT
    USING (true);

-- Seed equipment types
INSERT INTO public.equipment_types (id, name_en, icon, sort_order) VALUES
    ('barbell', 'Barbell', '🏋️', 1),
    ('dumbbell', 'Dumbbell', '🏋️', 2),
    ('machine', 'Machine', '⚙️', 3),
    ('cable', 'Cable', '🔗', 4),
    ('kettlebell', 'Kettlebell', '🔔', 5),
    ('bodyweight', 'Bodyweight', '🤸', 6),
    ('band', 'Resistance Band', '🎯', 7),
    ('plate', 'Weight Plate', '💿', 8),
    ('other', 'Other', '📦', 9),
    ('none', 'No Equipment', '✋', 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. EXERCISES TABLE (Global exercise library)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    muscle_group_id TEXT NOT NULL REFERENCES public.muscle_groups(id),
    secondary_muscle_groups TEXT[] DEFAULT '{}',
    equipment_type_id TEXT REFERENCES public.equipment_types(id),
    exercise_type TEXT NOT NULL DEFAULT 'strength'
        CHECK (exercise_type IN ('strength', 'cardio', 'stretching', 'calisthenics')),
    movement_pattern TEXT CHECK (movement_pattern IN (
        'horizontal_push', 'horizontal_pull',
        'vertical_push', 'vertical_pull',
        'squat', 'hinge', 'lunge',
        'rotation', 'flexion', 'extension',
        'isolation', 'compound', 'other'
    )),
    image_url TEXT,
    video_url TEXT,
    is_compound BOOLEAN NOT NULL DEFAULT false,
    difficulty TEXT DEFAULT 'intermediate'
        CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON public.exercises(muscle_group_id);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON public.exercises(equipment_type_id);
CREATE INDEX IF NOT EXISTS idx_exercises_type ON public.exercises(exercise_type);
CREATE INDEX IF NOT EXISTS idx_exercises_slug ON public.exercises(slug);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exercises are publicly readable" ON public.exercises;
CREATE POLICY "Exercises are publicly readable"
    ON public.exercises FOR SELECT
    USING (true);

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS trg_exercises_updated_at ON public.exercises;
CREATE TRIGGER trg_exercises_updated_at
    BEFORE UPDATE ON public.exercises
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. EXERCISE_TRANSLATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exercise_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    locale TEXT NOT NULL DEFAULT 'fa',
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(exercise_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_exercise_trans_exercise ON public.exercise_translations(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_trans_locale ON public.exercise_translations(locale);

ALTER TABLE public.exercise_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exercise translations are publicly readable" ON public.exercise_translations;
CREATE POLICY "Exercise translations are publicly readable"
    ON public.exercise_translations FOR SELECT
    USING (true);

DROP TRIGGER IF EXISTS trg_exercise_translations_updated_at ON public.exercise_translations;
CREATE TRIGGER trg_exercise_translations_updated_at
    BEFORE UPDATE ON public.exercise_translations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 5. USER_CUSTOM_EXERCISES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_custom_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    muscle_group_id TEXT NOT NULL REFERENCES public.muscle_groups(id),
    secondary_muscle_groups TEXT[] DEFAULT '{}',
    equipment_type_id TEXT REFERENCES public.equipment_types(id),
    exercise_type TEXT NOT NULL DEFAULT 'strength'
        CHECK (exercise_type IN ('strength', 'cardio', 'stretching', 'calisthenics')),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_exercises_user ON public.user_custom_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_muscle ON public.user_custom_exercises(muscle_group_id);

ALTER TABLE public.user_custom_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own custom exercises" ON public.user_custom_exercises;
CREATE POLICY "Users can read own custom exercises"
    ON public.user_custom_exercises FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own custom exercises" ON public.user_custom_exercises;
CREATE POLICY "Users can create own custom exercises"
    ON public.user_custom_exercises FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own custom exercises" ON public.user_custom_exercises;
CREATE POLICY "Users can update own custom exercises"
    ON public.user_custom_exercises FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own custom exercises" ON public.user_custom_exercises;
CREATE POLICY "Users can delete own custom exercises"
    ON public.user_custom_exercises FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_custom_exercises_updated_at ON public.user_custom_exercises;
CREATE TRIGGER trg_custom_exercises_updated_at
    BEFORE UPDATE ON public.user_custom_exercises
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. WORKOUT_SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'تمرین',
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'discarded')),
    total_volume DECIMAL(10, 2) DEFAULT 0,
    total_sets INTEGER DEFAULT 0,
    estimated_calories DECIMAL(8, 2) DEFAULT 0,
    notes TEXT,
    gym_id UUID REFERENCES public.gyms(id),
    routine_id UUID, -- will be added in Phase 2
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON public.workout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_start ON public.workout_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON public.workout_sessions(user_id, start_time DESC);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can read own workout sessions"
    ON public.workout_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can create own workout sessions"
    ON public.workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can update own workout sessions"
    ON public.workout_sessions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can delete own workout sessions"
    ON public.workout_sessions FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_workout_sessions_updated_at ON public.workout_sessions;
CREATE TRIGGER trg_workout_sessions_updated_at
    BEFORE UPDATE ON public.workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 7. WORKOUT_EXERCISES TABLE (exercises within a session)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id),
    custom_exercise_id UUID REFERENCES public.user_custom_exercises(id),
    exercise_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_superset BOOLEAN NOT NULL DEFAULT false,
    superset_group_id UUID,
    notes TEXT,
    rest_seconds INTEGER DEFAULT 90,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure at least one exercise reference is set
    CONSTRAINT check_exercise_reference CHECK (
        exercise_id IS NOT NULL OR custom_exercise_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_session ON public.workout_exercises(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON public.workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_sort ON public.workout_exercises(sort_order);

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can read own workout exercises"
    ON public.workout_exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can create own workout exercises"
    ON public.workout_exercises FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can update own workout exercises"
    ON public.workout_exercises FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can delete own workout exercises"
    ON public.workout_exercises FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
        )
    );

DROP TRIGGER IF EXISTS trg_workout_exercises_updated_at ON public.workout_exercises;
CREATE TRIGGER trg_workout_exercises_updated_at
    BEFORE UPDATE ON public.workout_exercises
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 8. WORKOUT_SETS TABLE (individual sets within an exercise)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL DEFAULT 1,
    set_type TEXT NOT NULL DEFAULT 'normal'
        CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure')),
    weight_kg DECIMAL(7, 2) DEFAULT 0,
    reps INTEGER DEFAULT 0,
    duration_seconds INTEGER, -- for time-based exercises (plank, etc.)
    distance_meters DECIMAL(8, 2), -- for cardio exercises
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON public.workout_sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_number ON public.workout_sets(set_number);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own workout sets" ON public.workout_sets;
CREATE POLICY "Users can read own workout sets"
    ON public.workout_sets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_exercises we
            JOIN public.workout_sessions ws ON ws.id = we.workout_session_id
            WHERE we.id = workout_exercise_id AND ws.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create own workout sets" ON public.workout_sets;
CREATE POLICY "Users can create own workout sets"
    ON public.workout_sets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_exercises we
            JOIN public.workout_sessions ws ON ws.id = we.workout_session_id
            WHERE we.id = workout_exercise_id AND ws.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own workout sets" ON public.workout_sets;
CREATE POLICY "Users can update own workout sets"
    ON public.workout_sets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_exercises we
            JOIN public.workout_sessions ws ON ws.id = we.workout_session_id
            WHERE we.id = workout_exercise_id AND ws.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own workout sets" ON public.workout_sets;
CREATE POLICY "Users can delete own workout sets"
    ON public.workout_sets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_exercises we
            JOIN public.workout_sessions ws ON ws.id = we.workout_session_id
            WHERE we.id = workout_exercise_id AND ws.user_id = auth.uid()
        )
    );

DROP TRIGGER IF EXISTS trg_workout_sets_updated_at ON public.workout_sets;
CREATE TRIGGER trg_workout_sets_updated_at
    BEFORE UPDATE ON public.workout_sets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 9. FUNCTION: Auto-calculate workout volume on set completion
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_workout_volume()
RETURNS TRIGGER AS $$
DECLARE
    v_session_id UUID;
    v_total_volume DECIMAL(10, 2);
    v_total_sets INTEGER;
BEGIN
    -- Get the session_id for this set's exercise
    SELECT we.workout_session_id INTO v_session_id
    FROM public.workout_exercises we
    WHERE we.id = COALESCE(NEW.workout_exercise_id, OLD.workout_exercise_id);

    IF v_session_id IS NOT NULL THEN
        -- Recalculate total volume and sets for the session
        SELECT
            COALESCE(SUM(ws.weight_kg * ws.reps), 0),
            COALESCE(SUM(CASE WHEN ws.is_completed THEN 1 ELSE 0 END), 0)
        INTO v_total_volume, v_total_sets
        FROM public.workout_sets ws
        JOIN public.workout_exercises we ON we.id = ws.workout_exercise_id
        WHERE we.workout_session_id = v_session_id;

        -- Update the session
        UPDATE public.workout_sessions
        SET total_volume = v_total_volume,
            total_sets = v_total_sets
        WHERE id = v_session_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-update volume when sets change
DROP TRIGGER IF EXISTS trg_workout_sets_volume ON public.workout_sets;
CREATE TRIGGER trg_workout_sets_volume
    AFTER INSERT OR UPDATE OR DELETE ON public.workout_sets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workout_volume();
-- ============================================================
-- MIGRATION: supabase/migrations/20240525000000_seed_exercises_with_translations.sql
-- ============================================================

-- ============================================================
-- Seed Exercises with Persian (fa) translations
-- 50+ core exercises covering all muscle groups
-- ============================================================

-- ============================================================
-- SEED EXERCISES
-- ============================================================
INSERT INTO public.exercises (id, name_en, slug, description, muscle_group_id, secondary_muscle_groups, equipment_type_id, exercise_type, movement_pattern, is_compound, difficulty, sort_order) VALUES
-- CHEST
('a0000001-0001-0001-0001-000000000001', 'Bench Press', 'bench-press', 'Compound pushing exercise for chest', 'chest', '{shoulders,triceps}', 'barbell', 'strength', 'horizontal_push', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000002', 'Incline Bench Press', 'incline-bench-press', 'Upper chest focused pressing', 'chest', '{shoulders,triceps}', 'barbell', 'strength', 'horizontal_push', true, 'intermediate', 2),
('a0000001-0001-0001-0001-000000000003', 'Dumbbell Fly', 'dumbbell-fly', 'Isolation exercise for chest stretch', 'chest', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000004', 'Push Up', 'push-up', 'Bodyweight chest exercise', 'chest', '{shoulders,triceps}', 'bodyweight', 'calisthenics', 'horizontal_push', true, 'beginner', 4),
('a0000001-0001-0001-0001-000000000005', 'Cable Crossover', 'cable-crossover', 'Isolation chest fly with cables', 'chest', '{}', 'cable', 'strength', 'isolation', false, 'intermediate', 5),
('a0000001-0001-0001-0001-000000000006', 'Dumbbell Bench Press', 'dumbbell-bench-press', 'Chest pressing with dumbbells', 'chest', '{shoulders,triceps}', 'dumbbell', 'strength', 'horizontal_push', true, 'beginner', 6),

-- BACK
('a0000001-0001-0001-0001-000000000010', 'Deadlift', 'deadlift', 'King of compound lifts', 'back', '{glutes,hamstrings,traps}', 'barbell', 'strength', 'hinge', true, 'advanced', 1),
('a0000001-0001-0001-0001-000000000011', 'Barbell Row', 'barbell-row', 'Compound pulling for back thickness', 'back', '{biceps}', 'barbell', 'strength', 'horizontal_pull', true, 'intermediate', 2),
('a0000001-0001-0001-0001-000000000012', 'Pull Up', 'pull-up', 'Bodyweight back width builder', 'back', '{biceps}', 'bodyweight', 'calisthenics', 'vertical_pull', true, 'intermediate', 3),
('a0000001-0001-0001-0001-000000000013', 'Lat Pulldown', 'lat-pulldown', 'Machine-based lat width exercise', 'back', '{biceps}', 'cable', 'strength', 'vertical_pull', true, 'beginner', 4),
('a0000001-0001-0001-0001-000000000014', 'Seated Cable Row', 'seated-cable-row', 'Mid-back thickness exercise', 'back', '{biceps}', 'cable', 'strength', 'horizontal_pull', true, 'beginner', 5),
('a0000001-0001-0001-0001-000000000015', 'Dumbbell Row', 'dumbbell-row', 'Single arm back exercise', 'back', '{biceps}', 'dumbbell', 'strength', 'horizontal_pull', true, 'beginner', 6),

-- SHOULDERS
('a0000001-0001-0001-0001-000000000020', 'Overhead Press', 'overhead-press', 'Compound shoulder press with barbell', 'shoulders', '{triceps}', 'barbell', 'strength', 'vertical_push', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000021', 'Lateral Raise', 'lateral-raise', 'Side delt isolation', 'shoulders', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000022', 'Front Raise', 'front-raise', 'Front delt isolation', 'shoulders', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000023', 'Face Pull', 'face-pull', 'Rear delt and upper back exercise', 'shoulders', '{traps}', 'cable', 'strength', 'horizontal_pull', false, 'beginner', 4),
('a0000001-0001-0001-0001-000000000024', 'Arnold Press', 'arnold-press', 'Rotational shoulder press', 'shoulders', '{triceps}', 'dumbbell', 'strength', 'vertical_push', true, 'intermediate', 5),

-- BICEPS
('a0000001-0001-0001-0001-000000000030', 'Barbell Curl', 'barbell-curl', 'Classic bicep mass builder', 'biceps', '{}', 'barbell', 'strength', 'isolation', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000031', 'Dumbbell Curl', 'dumbbell-curl', 'Standard bicep curl with dumbbells', 'biceps', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000032', 'Hammer Curl', 'hammer-curl', 'Brachialis and forearm focused curl', 'biceps', '{forearms}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000033', 'Preacher Curl', 'preacher-curl', 'Strict form bicep isolation', 'biceps', '{}', 'barbell', 'strength', 'isolation', false, 'intermediate', 4),
('a0000001-0001-0001-0001-000000000034', 'Concentration Curl', 'concentration-curl', 'Peak contraction bicep exercise', 'biceps', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 5),

-- TRICEPS
('a0000001-0001-0001-0001-000000000040', 'Tricep Pushdown', 'tricep-pushdown', 'Cable tricep isolation', 'triceps', '{}', 'cable', 'strength', 'isolation', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000041', 'Skull Crusher', 'skull-crusher', 'Lying tricep extension', 'triceps', '{}', 'barbell', 'strength', 'isolation', false, 'intermediate', 2),
('a0000001-0001-0001-0001-000000000042', 'Overhead Tricep Extension', 'overhead-tricep-extension', 'Long head tricep focus', 'triceps', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000043', 'Dip', 'dip', 'Bodyweight tricep and chest compound', 'triceps', '{chest,shoulders}', 'bodyweight', 'calisthenics', 'vertical_push', true, 'intermediate', 4),
('a0000001-0001-0001-0001-000000000044', 'Close Grip Bench Press', 'close-grip-bench-press', 'Tricep focused bench press', 'triceps', '{chest,shoulders}', 'barbell', 'strength', 'horizontal_push', true, 'intermediate', 5),

-- QUADS
('a0000001-0001-0001-0001-000000000050', 'Barbell Squat', 'barbell-squat', 'King of leg exercises', 'quads', '{glutes,hamstrings,core}', 'barbell', 'strength', 'squat', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000051', 'Leg Press', 'leg-press', 'Machine-based leg pressing', 'quads', '{glutes}', 'machine', 'strength', 'squat', true, 'beginner', 2),
('a0000001-0001-0001-0001-000000000052', 'Leg Extension', 'leg-extension', 'Quad isolation machine', 'quads', '{}', 'machine', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000053', 'Bulgarian Split Squat', 'bulgarian-split-squat', 'Single leg squat variation', 'quads', '{glutes}', 'dumbbell', 'strength', 'lunge', true, 'intermediate', 4),
('a0000001-0001-0001-0001-000000000054', 'Hack Squat', 'hack-squat', 'Machine squat for quad focus', 'quads', '{glutes}', 'machine', 'strength', 'squat', true, 'intermediate', 5),

-- HAMSTRINGS
('a0000001-0001-0001-0001-000000000060', 'Romanian Deadlift', 'romanian-deadlift', 'Hamstring and glute stretch exercise', 'hamstrings', '{glutes,back}', 'barbell', 'strength', 'hinge', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000061', 'Leg Curl', 'leg-curl', 'Hamstring isolation machine', 'hamstrings', '{}', 'machine', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000062', 'Nordic Curl', 'nordic-curl', 'Advanced hamstring bodyweight exercise', 'hamstrings', '{}', 'bodyweight', 'strength', 'isolation', false, 'advanced', 3),

-- GLUTES
('a0000001-0001-0001-0001-000000000070', 'Hip Thrust', 'hip-thrust', 'Glute focus compound', 'glutes', '{hamstrings}', 'barbell', 'strength', 'extension', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000071', 'Cable Kickback', 'cable-kickback', 'Glute isolation with cable', 'glutes', '{}', 'cable', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000072', 'Glute Bridge', 'glute-bridge', 'Bodyweight glute exercise', 'glutes', '{hamstrings}', 'bodyweight', 'strength', 'extension', false, 'beginner', 3),

-- CALVES
('a0000001-0001-0001-0001-000000000080', 'Standing Calf Raise', 'standing-calf-raise', 'Calf raise standing', 'calves', '{}', 'machine', 'strength', 'isolation', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000081', 'Seated Calf Raise', 'seated-calf-raise', 'Seated calf raise for soleus', 'calves', '{}', 'machine', 'strength', 'isolation', false, 'beginner', 2),

-- ABS
('a0000001-0001-0001-0001-000000000090', 'Crunch', 'crunch', 'Basic abdominal crunch', 'abs', '{}', 'bodyweight', 'strength', 'flexion', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000091', 'Plank', 'plank', 'Core stability hold', 'abs', '{core}', 'bodyweight', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000092', 'Hanging Leg Raise', 'hanging-leg-raise', 'Advanced lower ab exercise', 'abs', '{}', 'bodyweight', 'strength', 'flexion', false, 'advanced', 3),
('a0000001-0001-0001-0001-000000000093', 'Russian Twist', 'russian-twist', 'Oblique rotation exercise', 'abs', '{}', 'bodyweight', 'strength', 'rotation', false, 'intermediate', 4),
('a0000001-0001-0001-0001-000000000094', 'Ab Wheel Rollout', 'ab-wheel-rollout', 'Advanced core anti-extension', 'abs', '{core}', 'other', 'strength', 'extension', false, 'advanced', 5),

-- TRAPS
('a0000001-0001-0001-0001-000000000100', 'Shrug', 'shrug', 'Trap isolation with barbell', 'traps', '{}', 'barbell', 'strength', 'isolation', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000101', 'Farmer Walk', 'farmer-walk', 'Trap and grip functional exercise', 'traps', '{forearms,core}', 'dumbbell', 'strength', 'compound', true, 'beginner', 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED PERSIAN TRANSLATIONS
-- ============================================================
INSERT INTO public.exercise_translations (exercise_id, locale, name, description, instructions) VALUES
-- CHEST
('a0000001-0001-0001-0001-000000000001', 'fa', 'پرس سینه هالتر', 'حرکت ترکیبی فشاری برای عضلات سینه', 'روی میز دراز بکشید، هالتر را با فاصله دست مناسب بگیرید و به سمت پایین سینه بیاورید سپس بالا ببرید'),
('a0000001-0001-0001-0001-000000000002', 'fa', 'پرس بالا سینه هالتر', 'پرس سینه با زاویه بالا برای تمرکز روی بالای سینه', 'میز را روی زاویه ۳۰ تا ۴۵ درجه تنظیم کنید و مانند پرس سینه اجرا کنید'),
('a0000001-0001-0001-0001-000000000003', 'fa', 'فور دست', 'حرکت ایزوله برای کشش عضلات سینه', 'روی میز دراز بکشید، دمبل‌ها را با آرنج کمی خم باز و بسته کنید'),
('a0000001-0001-0001-0001-000000000004', 'fa', 'شنا سوئدی', 'حرکت سینه با وزن بدن', 'دست‌ها را کمی عریض‌تر از عرض شانه روی زمین بگذارید و بدن را پایین و بالا ببرید'),
('a0000001-0001-0001-0001-000000000005', 'fa', 'کراس سیم‌کش', 'فور سینه با سیم‌کش', 'در بین دو سیم‌کش بایستید و دسته‌ها را به سمت هم بکشید'),
('a0000001-0001-0001-0001-000000000006', 'fa', 'پرس سینه دمبل', 'پرس سینه با دمبل', 'روی میز دراز بکشید، دمبل‌ها را از کنار سینه به سمت بالا ببرید'),

-- BACK
('a0000001-0001-0001-0001-000000000010', 'fa', 'ددلیفت', 'سلطان حرکات ترکیبی', 'با پشت صاف هالتر را از روی زمین بلند کنید، زانوها را صاف کنید و هیپ را جلو بیاورید'),
('a0000001-0001-0001-0001-000000000011', 'fa', 'رو خم هالتر', 'حرکت ترکیبی برای ضخامت پشت', 'خم شوید، هالتر را به سمت شکم بکشید و پایین بیاورید'),
('a0000001-0001-0001-0001-000000000012', 'fa', 'بارفیکس', 'حرکت عرض پشت با وزن بدن', 'میله را بگیرید و چانه را از آن رد کنید'),
('a0000001-0001-0001-0001-000000000013', 'fa', 'لت از جلو', 'حرکت عرض پشت با دستگاه سیم‌کش', 'میله را از بالا به سمت سینه بکشید'),
('a0000001-0001-0001-0001-000000000014', 'fa', 'قایقی نشسته', 'حرکت ضخامت پشت با سیم‌کش', 'نشسته دسته را به سمت شکم بکشید'),
('a0000001-0001-0001-0001-000000000015', 'fa', 'رو خم دمبل تک دست', 'حرکت پشت با دمبل تک دست', 'یک دست و یک زانو روی میز، دمبل را به سمت باسن بکشید'),

-- SHOULDERS
('a0000001-0001-0001-0001-000000000020', 'fa', 'پرس شانه هالتر', 'پرس سرشانه ترکیبی با هالتر', 'هالتر را از جلوی سرشانه به بالای سر ببرید'),
('a0000001-0001-0001-0001-000000000021', 'fa', 'نشر جانب', 'حرکت ایزوله سرشانه جانبی', 'دمبل‌ها را از دو طرف بدن به صورت جانبی بالا ببرید'),
('a0000001-0001-0001-0001-000000000022', 'fa', 'نشر جلو', 'حرکت ایزوله سرشانه جلویی', 'دمبل‌ها را از جلوی بدن تا سطح چشم بالا ببرید'),
('a0000001-0001-0001-0001-000000000023', 'fa', 'فیس پول', 'حرکت سرشانه خلفی و بالای پشت', 'سیم‌کش را در ارتفاع صورت به سمت صورت بکشید'),
('a0000001-0001-0001-0001-000000000024', 'fa', 'پرس آرنولدی', 'پرس شانه چرخشی با دمبل', 'مانند پرس شانه اما با چرخش مچ دست در حین بالا بردن'),

-- BICEPS
('a0000001-0001-0001-0001-000000000030', 'fa', 'جلو بازو هالتر', 'حرکت جلو بازو با هالتر', 'ایستاده هالتر را به سمت شانه ببرید'),
('a0000001-0001-0001-0001-000000000031', 'fa', 'جلو بازو دمبل', 'حرکت جلو بازو با دمبل', 'ایستاده دمبل‌ها را به سمت شانه ببرید'),
('a0000001-0001-0001-0001-000000000032', 'fa', 'جلو بازو چکشی', 'حرکت جلو بازو و ساعد', 'مانند جلو بازو دمبل اما با دست‌های رو به هم'),
('a0000001-0001-0001-0001-000000000033', 'fa', 'جلو بازو لاری', 'حرکت ایزوله جلو بازو با میز لاری', 'پشت بازو روی میز، هالتر را بالا ببرید'),
('a0000001-0001-0001-0001-000000000034', 'fa', 'جلو بازو تغلیظ', 'حرکت جلو بازو با تمرکز بالا', 'نشسته، آرنج روی ران، دمبل را بالا ببرید'),

-- TRICEPS
('a0000001-0001-0001-0001-000000000040', 'fa', 'پشت بازو سیم‌کش', 'حرکت ایزوله پشت بازو با سیم‌کش', 'هanko دسته را به سمت پایین ببرید'),
('a0000001-0001-0001-0001-000000000041', 'fa', 'پشت بازو خوابیده', 'اکستنشن پشت بازو خوابیده', 'خوابیده هالتر EZ را از بالای سر پایین و بالا ببرید'),
('a0000001-0001-0001-0001-000000000042', 'fa', 'پشت بازو پشت سر', 'اکستنشن پشت سر با دمبل', 'دمبل را از پشت سر بالا ببرید'),
('a0000001-0001-0001-0001-000000000043', 'fa', 'دیپ', 'حرکت ترکیبی پشت بازو و سینه', 'روی دو میله موازی بدن را پایین و بالا ببرید'),
('a0000001-0001-0001-0001-000000000044', 'fa', 'پرس سینه دست نزدیک', 'پرس سینه با تمرکز پشت بازو', 'مانند پرس سینه اما دست‌ها نزدیک هم'),

-- QUADS
('a0000001-0001-0001-0001-000000000050', 'fa', 'اسکوات هالتر', 'سلطان حرکات پا', 'هالتر روی شانه، زانوها را خم کنید و صاف بایستید'),
('a0000001-0001-0001-0001-000000000051', 'fa', 'پرس پا', 'حرکت پا با دستگاه', 'نشسته در دستگاه، پاها را صاف کنید'),
('a0000001-0001-0001-0001-000000000052', 'fa', 'اکستنشن پا', 'حرکت ایزوله جلو ران', 'نشسته در دستگاه، پاها را بالا ببرید'),
('a0000001-0001-0001-0001-000000000053', 'fa', 'اسکوات بلغاری', 'اسکوات تک پا', 'یک پا روی نیمکت عقب، با پا دیگر اسکوات بزنید'),
('a0000001-0001-0001-0001-000000000054', 'fa', 'هاک اسکوات', 'اسکوات با دستگاه هک', 'در دستگاه هک، بدن را پایین و بالا ببرید'),

-- HAMSTRINGS
('a0000001-0001-0001-0001-000000000060', 'fa', 'ددلیفت رومانیایی', 'حرکت پشت ران و باسن', 'با پا صاف هالتر را از روی زمین تا زیر زانو پایین بیاورید'),
('a0000001-0001-0001-0001-000000000061', 'fa', 'لگ کرل', 'حرکت ایزوله پشت ران', 'نشسته یا خوابیده در دستگاه، پاها را خم کنید'),
('a0000001-0001-0001-0001-000000000062', 'fa', 'نوردیک کرل', 'حرکت پیشرفته پشت ران با وزن بدن', 'زانو ثابت، بدن را به سمت جلو پایین ببرید'),

-- GLUTES
('a0000001-0001-0001-0001-000000000070', 'fa', 'هیپ تراست', 'حرکت ترکیبی باسن', 'پشت سر شانه روی نیمکت، باسن را بالا ببرید'),
('a0000001-0001-0001-0001-000000000071', 'fa', 'کیک بک سیم‌کش', 'حرکت ایزوله باسن', 'پا را به سمت عقب بالا ببرید'),
('a0000001-0001-0001-0001-000000000072', 'fa', 'پل باسن', 'حرکت باسن با وزن بدن', 'خوابیده باسن را بالا ببرید'),

-- CALVES
('a0000001-0001-0001-0001-000000000080', 'fa', 'ساق پا ایستاده', 'حرکت ساق پا ایستاده', 'روی پنجه پا بالا بروید و پایین بیایید'),
('a0000001-0001-0001-0001-000000000081', 'fa', 'ساق پا نشسته', 'حرکت ساق پا نشسته', 'نشسته در دستگاه، روی پنجه پا بالا بروید'),

-- ABS
('a0000001-0001-0001-0001-000000000090', 'fa', 'کرانچ', 'حرکت شکم پایه', 'خوابیده، شانه‌ها را از زمین جدا کنید'),
('a0000001-0001-0001-0001-000000000091', 'fa', 'پلانک', 'حرکت ثبات هسته', 'روی ساعد و پنجه پا، بدن صاف نگه دارید'),
('a0000001-0001-0001-0001-000000000092', 'fa', 'آویزان پایین بردن پا', 'حرکت پیشرفته شکم پایین', 'آویزان از میله، پاهای صاف را بالا ببرید'),
('a0000001-0001-0001-0001-000000000093', 'fa', 'روسیان توئیست', 'حرکت عضلات مورب', 'نشسته با بدن خم، وزنه را دو طرف بچرخانید'),
('a0000001-0001-0001-0001-000000000094', 'fa', 'اب ویل', 'حرکت پیشرفته هسته', 'روی زانو، چرخ اب ویل را به جلو ببرید'),

-- TRAPS
('a0000001-0001-0001-0001-000000000100', 'fa', 'شروگ هالتر', 'حرکت ایزوله ذوزنقه', 'شانه‌ها را بالا ببرید و نگه دارید'),
('a0000001-0001-0001-0001-000000000101', 'fa', 'راه رفتن کشاورز', 'حرکت عملکردی ذوزنقه و گریپ', 'دمبل‌های سنگین بردارید و راه بروید')
ON CONFLICT (exercise_id, locale) DO NOTHING;

-- ============================================================
-- SEED MUSCLE GROUP PERSIAN NAMES (update translations table)
-- ============================================================
-- Add a muscle_group_translations concept via a simple approach:
-- We add translations to a generic translations table if it exists,
-- or we can handle this in the app layer using fallback-config.
-- ============================================================
-- MIGRATION: supabase/migrations/20240526000000_create_routines_body_stats.sql
-- ============================================================

-- ============================================================
-- Phase 2: Routines, Body Stats, and Exercise Progress
-- Hevy-like routine builder + body measurement tracking
-- ============================================================

-- ============================================================
-- 1. ROUTINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    is_template BOOLEAN NOT NULL DEFAULT false,
    folder TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    use_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routines_user ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_public ON public.routines(is_public) WHERE is_public = true;

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own routines" ON public.routines;
CREATE POLICY "Users can read own routines"
    ON public.routines FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users can create own routines" ON public.routines;
CREATE POLICY "Users can create own routines"
    ON public.routines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own routines" ON public.routines;
CREATE POLICY "Users can update own routines"
    ON public.routines FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own routines" ON public.routines;
CREATE POLICY "Users can delete own routines"
    ON public.routines FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_routines_updated_at ON public.routines;
CREATE TRIGGER trg_routines_updated_at
    BEFORE UPDATE ON public.routines
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2. ROUTINE_DAYS TABLE (days within a routine)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Day',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routine_days_routine ON public.routine_days(routine_id);

ALTER TABLE public.routine_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read routine days" ON public.routine_days;
CREATE POLICY "Users can read routine days"
    ON public.routine_days FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND (r.user_id = auth.uid() OR r.is_public = true))
    );

DROP POLICY IF EXISTS "Users can create routine days" ON public.routine_days;
CREATE POLICY "Users can create routine days"
    ON public.routine_days FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update routine days" ON public.routine_days;
CREATE POLICY "Users can update routine days"
    ON public.routine_days FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete routine days" ON public.routine_days;
CREATE POLICY "Users can delete routine days"
    ON public.routine_days FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.user_id = auth.uid())
    );

-- ============================================================
-- 3. ROUTINE_EXERCISES TABLE (exercises within a routine day)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_day_id UUID NOT NULL REFERENCES public.routine_days(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id),
    custom_exercise_id UUID REFERENCES public.user_custom_exercises(id),
    exercise_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    rest_seconds INTEGER DEFAULT 90,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT check_routine_exercise_ref CHECK (
        exercise_id IS NOT NULL OR custom_exercise_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_routine_exercises_day ON public.routine_exercises(routine_day_id);

ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read routine exercises" ON public.routine_exercises;
CREATE POLICY "Users can read routine exercises"
    ON public.routine_exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.routine_days rd
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE rd.id = routine_day_id AND (r.user_id = auth.uid() OR r.is_public = true)
        )
    );

DROP POLICY IF EXISTS "Users can create routine exercises" ON public.routine_exercises;
CREATE POLICY "Users can create routine exercises"
    ON public.routine_exercises FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.routine_days rd
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE rd.id = routine_day_id AND r.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update routine exercises" ON public.routine_exercises;
CREATE POLICY "Users can update routine exercises"
    ON public.routine_exercises FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.routine_days rd
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE rd.id = routine_day_id AND r.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete routine exercises" ON public.routine_exercises;
CREATE POLICY "Users can delete routine exercises"
    ON public.routine_exercises FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.routine_days rd
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE rd.id = routine_day_id AND r.user_id = auth.uid()
        )
    );

-- ============================================================
-- 4. ROUTINE_SETS TABLE (planned sets within routine exercise)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_exercise_id UUID NOT NULL REFERENCES public.routine_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL DEFAULT 1,
    set_type TEXT NOT NULL DEFAULT 'normal'
        CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure')),
    weight_kg DECIMAL(7, 2) DEFAULT 0,
    reps INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    distance_meters DECIMAL(8, 2),
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routine_sets_exercise ON public.routine_sets(routine_exercise_id);

ALTER TABLE public.routine_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read routine sets" ON public.routine_sets;
CREATE POLICY "Users can read routine sets"
    ON public.routine_sets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.routine_exercises re
            JOIN public.routine_days rd ON rd.id = re.routine_day_id
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE re.id = routine_exercise_id AND (r.user_id = auth.uid() OR r.is_public = true)
        )
    );

DROP POLICY IF EXISTS "Users can create routine sets" ON public.routine_sets;
CREATE POLICY "Users can create routine sets"
    ON public.routine_sets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.routine_exercises re
            JOIN public.routine_days rd ON rd.id = re.routine_day_id
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE re.id = routine_exercise_id AND r.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update routine sets" ON public.routine_sets;
CREATE POLICY "Users can update routine sets"
    ON public.routine_sets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.routine_exercises re
            JOIN public.routine_days rd ON rd.id = re.routine_day_id
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE re.id = routine_exercise_id AND r.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete routine sets" ON public.routine_sets;
CREATE POLICY "Users can delete routine sets"
    ON public.routine_sets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.routine_exercises re
            JOIN public.routine_days rd ON rd.id = re.routine_day_id
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE re.id = routine_exercise_id AND r.user_id = auth.uid()
        )
    );

-- ============================================================
-- 5. BODY_MEASUREMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.body_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg DECIMAL(6, 2),
    body_fat_percentage DECIMAL(4, 1),
    neck_cm DECIMAL(5, 1),
    chest_cm DECIMAL(5, 1),
    waist_cm DECIMAL(5, 1),
    hip_cm DECIMAL(5, 1),
    right_bicep_cm DECIMAL(5, 1),
    left_bicep_cm DECIMAL(5, 1),
    right_thigh_cm DECIMAL(5, 1),
    left_thigh_cm DECIMAL(5, 1),
    right_calf_cm DECIMAL(5, 1),
    left_calf_cm DECIMAL(5, 1),
    right_forearm_cm DECIMAL(5, 1),
    left_forearm_cm DECIMAL(5, 1),
    shoulders_cm DECIMAL(5, 1),
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON public.body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON public.body_measurements(user_id, measured_at DESC);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own body measurements" ON public.body_measurements;
CREATE POLICY "Users can read own body measurements"
    ON public.body_measurements FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own body measurements" ON public.body_measurements;
CREATE POLICY "Users can create own body measurements"
    ON public.body_measurements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own body measurements" ON public.body_measurements;
CREATE POLICY "Users can update own body measurements"
    ON public.body_measurements FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own body measurements" ON public.body_measurements;
CREATE POLICY "Users can delete own body measurements"
    ON public.body_measurements FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_body_measurements_updated_at ON public.body_measurements;
CREATE TRIGGER trg_body_measurements_updated_at
    BEFORE UPDATE ON public.body_measurements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. EXERCISE_PROGRESS TABLE (personal records per exercise)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exercise_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    pr_weight_kg DECIMAL(7, 2) DEFAULT 0,
    pr_reps INTEGER DEFAULT 0,
    pr_volume DECIMAL(10, 2) DEFAULT 0,
    total_sets INTEGER DEFAULT 0,
    total_workouts INTEGER DEFAULT 0,
    last_performed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_progress_user ON public.exercise_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_progress_exercise ON public.exercise_progress(exercise_id);

ALTER TABLE public.exercise_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own exercise progress" ON public.exercise_progress;
CREATE POLICY "Users can read own exercise progress"
    ON public.exercise_progress FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own exercise progress" ON public.exercise_progress;
CREATE POLICY "Users can create own exercise progress"
    ON public.exercise_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own exercise progress" ON public.exercise_progress;
CREATE POLICY "Users can update own exercise progress"
    ON public.exercise_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- 7. Add FK: workout_sessions.routine_id → routines
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'workout_sessions' AND column_name = 'routine_id'
    ) THEN
        ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS fk_workout_sessions_routine;
        ALTER TABLE public.workout_sessions ADD CONSTRAINT fk_workout_sessions_routine
            FOREIGN KEY (routine_id) REFERENCES public.routines(id) ON DELETE SET NULL;
    END IF;
END $$;
-- ============================================================
-- MIGRATION: supabase/migrations/20240527000000_create_social_schema.sql
-- ============================================================

-- ============================================================
-- Phase 3: Social Network Schema
-- User follows, workout sharing, likes, comments, feed
-- ============================================================

-- ============================================================
-- 1. USER_FOLLOWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(follower_id, following_id),
    CONSTRAINT cannot_follow_self CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read follows" ON public.user_follows;
CREATE POLICY "Users can read follows"
    ON public.user_follows FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
CREATE POLICY "Users can follow others"
    ON public.user_follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
CREATE POLICY "Users can unfollow"
    ON public.user_follows FOR DELETE
    USING (auth.uid() = follower_id);

-- ============================================================
-- 2. WORKOUT_LIKES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workout_session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, workout_session_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_likes_workout ON public.workout_likes(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_workout_likes_user ON public.workout_likes(user_id);

ALTER TABLE public.workout_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workout likes are publicly readable" ON public.workout_likes;
CREATE POLICY "Workout likes are publicly readable"
    ON public.workout_likes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can like workouts" ON public.workout_likes;
CREATE POLICY "Users can like workouts"
    ON public.workout_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike" ON public.workout_likes;
CREATE POLICY "Users can unlike"
    ON public.workout_likes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 3. WORKOUT_COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workout_session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_comments_workout ON public.workout_comments(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_workout_comments_user ON public.workout_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_comments_created ON public.workout_comments(created_at DESC);

ALTER TABLE public.workout_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workout comments are publicly readable" ON public.workout_comments;
CREATE POLICY "Workout comments are publicly readable"
    ON public.workout_comments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.workout_comments;
CREATE POLICY "Users can create comments"
    ON public.workout_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.workout_comments;
CREATE POLICY "Users can update own comments"
    ON public.workout_comments FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.workout_comments;
CREATE POLICY "Users can delete own comments"
    ON public.workout_comments FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_workout_comments_updated_at ON public.workout_comments;
CREATE TRIGGER trg_workout_comments_updated_at
    BEFORE UPDATE ON public.workout_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. Add is_shared column to workout_sessions
-- ============================================================
ALTER TABLE public.workout_sessions
    ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.workout_sessions
    ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- ============================================================
-- 5. Add follower/following counts to profiles
-- ============================================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS workout_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 6. FUNCTION: Update follower counts
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
        UPDATE public.profiles SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_user_follows_count ON public.user_follows;
CREATE TRIGGER trg_user_follows_count
    AFTER INSERT OR DELETE ON public.user_follows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_follow_counts();

-- ============================================================
-- 7. FUNCTION: Update like count trigger (add like_count to workouts)
-- ============================================================
ALTER TABLE public.workout_sessions
    ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.workout_sessions
    ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_workout_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.workout_sessions SET like_count = like_count + 1 WHERE id = NEW.workout_session_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.workout_sessions SET like_count = like_count - 1 WHERE id = OLD.workout_session_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_workout_likes_count ON public.workout_likes;
CREATE TRIGGER trg_workout_likes_count
    AFTER INSERT OR DELETE ON public.workout_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workout_like_count();

-- ============================================================
-- 8. FUNCTION: Update comment count
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_workout_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.workout_sessions SET comment_count = comment_count + 1 WHERE id = NEW.workout_session_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.workout_sessions SET comment_count = comment_count - 1 WHERE id = OLD.workout_session_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_workout_comments_count ON public.workout_comments;
CREATE TRIGGER trg_workout_comments_count
    AFTER INSERT OR DELETE ON public.workout_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workout_comment_count();

-- ============================================================
-- 9. FUNCTION: Update user workout count
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_workout_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE public.profiles SET workout_count = workout_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
        UPDATE public.profiles SET workout_count = workout_count + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_workout_sessions_user_count ON public.workout_sessions;
CREATE TRIGGER trg_workout_sessions_user_count
    AFTER INSERT OR UPDATE ON public.workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_workout_count();
-- ============================================================
-- MIGRATION: supabase/migrations/20240528000000_create_admin_auth.sql
-- ============================================================

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
-- ============================================================
-- MIGRATION: supabase/migrations/20240529000000_extend_role_check_constraint.sql
-- ============================================================

-- Extend profiles.role CHECK constraint to include coach and doctor roles
-- The admin panel uses 'coach' and 'doctor' roles for specialized access,
-- and RLS helper functions (is_coach, is_doctor, has_admin_access) already reference these roles.
-- Without this change, inserting profiles with role='coach' or role='doctor' would violate the CHECK constraint.

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Add the new CHECK constraint with all roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('athlete', 'gym_manager', 'admin', 'coach', 'doctor'));
-- ============================================================
-- MIGRATION: supabase/migrations/20240530000000_create_admin_config_table.sql
-- ============================================================

-- ============================================================
-- Create admin_config table for system configuration
-- Singleton row pattern: one row with key='system_config'
-- The value column stores a JSON string with all config settings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto-update updated_at
DROP TRIGGER IF EXISTS trg_admin_config_updated_at ON public.admin_config;
CREATE TRIGGER trg_admin_config_updated_at
    BEFORE UPDATE ON public.admin_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy
DROP POLICY IF EXISTS "Admins can read admin_config" ON public.admin_config;
CREATE POLICY "Admins can read admin_config"
    ON public.admin_config FOR SELECT
    TO authenticated
    USING (is_admin());

-- Admin-only insert policy
DROP POLICY IF EXISTS "Admins can insert admin_config" ON public.admin_config;
CREATE POLICY "Admins can insert admin_config"
    ON public.admin_config FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Admin-only update policy
DROP POLICY IF EXISTS "Admins can update admin_config" ON public.admin_config;
CREATE POLICY "Admins can update admin_config"
    ON public.admin_config FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Seed default configuration row
INSERT INTO public.admin_config (key, value, description) VALUES (
    'system_config',
    '{"site_name":"rokhdad FIT","site_description":"پلتفرم باشگاه و ورزش","contact_email":"admin@rokhdad.fit","contact_phone":"","maintenance_mode":false,"enable_registration":true,"enable_booking_system":true,"enable_wallet_system":true,"enable_reviews":true,"enable_notifications":true}',
    'تنظیمات اصلی سیستم'
) ON CONFLICT DO NOTHING;
-- ============================================================
-- MIGRATION: supabase/migrations/20240531000000_create_wallet_deduct_rpc.sql
-- ============================================================

-- Migration: Create atomic wallet deduction RPC + CHECK constraint
-- Fixes race condition in deductFunds where balance check and deduction are non-atomic
-- Date: 20240531

-- 1. Add CHECK constraint to prevent negative wallet balances
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS wallet_balance_non_negative;
ALTER TABLE profiles
  ADD CONSTRAINT wallet_balance_non_negative CHECK (wallet_balance >= 0);

-- 2. Create atomic deduction RPC function
-- This function checks balance AND deducts in a single DB transaction,
-- eliminating the race condition between read-check-insert in the app layer.
CREATE OR REPLACE FUNCTION deduct_wallet_funds(
  p_profile_id UUID,
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'کسر موجودی توسط مدیر'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Lock the profile row to prevent concurrent modifications
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'کاربر یافت نشد'
    );
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'موجودی کافی نیست',
      'current_balance', v_current_balance,
      'requested_amount', p_amount
    );
  END IF;

  -- Insert transaction record
  INSERT INTO wallet_transactions (profile_id, amount, type, description)
  VALUES (p_profile_id, p_amount, 'session_purchase', p_reason)
  RETURNING id INTO v_transaction_id;

  -- The update_wallet_balance trigger will atomically update the balance
  -- based on the transaction we just inserted. But we also verify here.
  SELECT wallet_balance INTO v_new_balance
  FROM profiles
  WHERE id = p_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'amount_deducted', p_amount
  );
END;
$$;

-- 3. Grant execute to service_role and admin users only
GRANT EXECUTE ON FUNCTION deduct_wallet_funds(UUID, NUMERIC, TEXT)
  TO service_role, authenticated;

-- 4. Add comment for documentation
COMMENT ON FUNCTION deduct_wallet_funds IS
  'Atomically deducts funds from a wallet. Checks balance sufficiency and deducts in a single transaction, preventing race conditions. Returns JSONB with success status and balance details.';
-- ============================================================
-- MIGRATION: supabase/migrations/20240601000000_create_gym_equipment.sql
-- ============================================================

-- ============================================================
-- Gym Equipment Table: Links gyms to equipment_types
-- Used for gym suggestion scoring (match exercises → gyms)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gym_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    equipment_type_id TEXT NOT NULL REFERENCES public.equipment_types(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(gym_id, equipment_type_id)
);

-- Indexes for lookup performance
CREATE INDEX IF NOT EXISTS idx_gym_equipment_gym ON public.gym_equipment(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_equipment_type ON public.gym_equipment(equipment_type_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.gym_equipment ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: GYM_EQUIPMENT (public read, manager + admin write)
-- ============================================================

-- Anyone can read gym equipment (needed for athlete suggestion engine)
DROP POLICY IF EXISTS "Gym equipment is publicly readable" ON public.gym_equipment;
CREATE POLICY "Gym equipment is publicly readable"
    ON public.gym_equipment FOR SELECT
    USING (true);

-- Managers can manage equipment for own gyms, admins can manage all
DROP POLICY IF EXISTS "Managers and admins can manage gym equipment" ON public.gym_equipment;
CREATE POLICY "Managers and admins can manage gym equipment"
    ON public.gym_equipment FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = gym_equipment.gym_id
            AND gyms.manager_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================
-- MIGRATION: supabase/migrations/20240601000001_seed_gym_equipment.sql
-- ============================================================

-- ============================================================
-- Seed gym_equipment: Link existing gyms to equipment_types
-- Based on each gym's sport types and specialization
-- ============================================================
-- NOTE: equipment_types already seeded in 20240524000000
--       (barbell, dumbbell, machine, cable, kettlebell,
--        bodyweight, band, plate, other, none)
-- ============================================================

INSERT INTO public.gym_equipment (gym_id, equipment_type_id) VALUES

-- ============================================================
-- Golden Gym (bodybuilding, fitness, cardio, weightlifting)
-- Full commercial gym — all major equipment
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000001', 'barbell'),
('a1b2c3d4-0001-4000-8000-000000000001', 'dumbbell'),
('a1b2c3d4-0001-4000-8000-000000000001', 'machine'),
('a1b2c3d4-0001-4000-8000-000000000001', 'cable'),
('a1b2c3d4-0001-4000-8000-000000000001', 'plate'),
('a1b2c3d4-0001-4000-8000-000000000001', 'kettlebell'),

-- ============================================================
-- Aria Sport (bodybuilding, swimming, fitness, cardio)
-- Standard gym equipment + cardio machines
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000002', 'barbell'),
('a1b2c3d4-0001-4000-8000-000000000002', 'dumbbell'),
('a1b2c3d4-0001-4000-8000-000000000002', 'machine'),
('a1b2c3d4-0001-4000-8000-000000000002', 'cable'),

-- ============================================================
-- Parseh Sports (bodybuilding, swimming, futsal, fitness, cardio)
-- Full sports complex — broad equipment coverage
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000003', 'barbell'),
('a1b2c3d4-0001-4000-8000-000000000003', 'dumbbell'),
('a1b2c3d4-0001-4000-8000-000000000003', 'machine'),
('a1b2c3d4-0001-4000-8000-000000000003', 'cable'),
('a1b2c3d4-0001-4000-8000-000000000003', 'kettlebell'),

-- ============================================================
-- CrossFit Tehran (crossfit, fitness, weightlifting)
-- Functional fitness focused — barbells, kettlebells, bodyweight
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000004', 'barbell'),
('a1b2c3d4-0001-4000-8000-000000000004', 'dumbbell'),
('a1b2c3d4-0001-4000-8000-000000000004', 'kettlebell'),
('a1b2c3d4-0001-4000-8000-000000000004', 'plate'),
('a1b2c3d4-0001-4000-8000-000000000004', 'bodyweight'),

-- ============================================================
-- Sepahan Boxing (boxing, kickboxing, mma)
-- Combat sports — minimal iron, bodyweight + bands
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000005', 'bodyweight'),
('a1b2c3d4-0001-4000-8000-000000000005', 'band'),
('a1b2c3d4-0001-4000-8000-000000000005', 'dumbbell'),

-- ============================================================
-- Aramesh Yoga (yoga, pilates)
-- Mind-body studio — bodyweight + bands only
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000006', 'bodyweight'),
('a1b2c3d4-0001-4000-8000-000000000006', 'band')

ON CONFLICT (gym_id, equipment_type_id) DO NOTHING;

-- ============================================================
-- DONE. Seed summary:
--   Golden Gym: 6 equipment types
--   Aria Sport: 4 equipment types
--   Parseh Sports: 5 equipment types
--   CrossFit Tehran: 5 equipment types
--   Sepahan Boxing: 3 equipment types
--   Aramesh Yoga: 2 equipment types
--   Total: 25 gym_equipment rows
-- ============================================================

-- ============================================================
-- MIGRATION: supabase/migrations/20240602000000_add_p2_p3_admin_rls_policies.sql
-- ============================================================

-- ============================================================
-- P2/P3 Admin RLS Policies
-- Adds admin access policies for all tables managed by the admin panel
-- Also expands audit_logs.action_type CHECK constraint for P2/P3 action types
-- MUST be applied AFTER all prior migrations
-- ============================================================

-- ============================================================================
-- 1. Expand audit_logs.action_type CHECK constraint
-- ============================================================================
-- The original CHECK only included P0/P1 action types.
-- We need to drop it and replace with the full list including P2/P3 types.

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_type_check
  CHECK (action_type IN (
    -- P0/P1 (original)
    'user_created',
    'user_updated',
    'user_deleted',
    'user_role_changed',
    'gym_created',
    'gym_updated',
    'gym_deleted',
    'booking_created',
    'booking_updated',
    'booking_cancelled',
    'wallet_transaction',
    'config_updated',
    -- P2 (admin management of athlete features)
    'wallet_funds_added',
    'wallet_funds_deducted',
    'trainer_created',
    'trainer_updated',
    'trainer_deleted',
    'time_slot_created',
    'time_slot_updated',
    'time_slot_deleted',
    'exercise_created',
    'exercise_updated',
    'exercise_deleted',
    'exercise_translation_created',
    'exercise_translation_updated',
    'exercise_translation_deleted',
    'routine_updated',
    'routine_deleted',
    'workout_comment_deleted',
    'gym_photo_added',
    'gym_photo_deleted',
    'gym_amenity_added',
    'gym_amenity_deleted',
    'gym_sport_type_added',
    'gym_sport_type_deleted',
    'gym_review_deleted',
    'gym_favorite_deleted',
    -- P3 (config system consistency)
    'translation_created',
    'translation_updated',
    'translation_deleted',
    'country_updated',
    'feature_flag_updated'
  ));

-- ============================================================================
-- 2. exercises — admin INSERT/UPDATE/DELETE
-- ============================================================================
-- Currently: "Exercises are publicly readable" (SELECT for all)
-- Missing: admin write access

DROP POLICY IF EXISTS "Admins can insert exercises" ON public.exercises;
CREATE POLICY "Admins can insert exercises"
    ON public.exercises FOR INSERT
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update exercises" ON public.exercises;
CREATE POLICY "Admins can update exercises"
    ON public.exercises FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete exercises" ON public.exercises;
CREATE POLICY "Admins can delete exercises"
    ON public.exercises FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 3. exercise_translations — admin INSERT/UPDATE/DELETE
-- ============================================================================
-- Currently: "Exercise translations are publicly readable" (SELECT for all)
-- Missing: admin write access

DROP POLICY IF EXISTS "Admins can insert exercise translations" ON public.exercise_translations;
CREATE POLICY "Admins can insert exercise translations"
    ON public.exercise_translations FOR INSERT
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update exercise translations" ON public.exercise_translations;
CREATE POLICY "Admins can update exercise translations"
    ON public.exercise_translations FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete exercise translations" ON public.exercise_translations;
CREATE POLICY "Admins can delete exercise translations"
    ON public.exercise_translations FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 4. muscle_groups — admin INSERT/UPDATE/DELETE
-- ============================================================================
-- Currently: "Muscle groups are publicly readable" (SELECT for all)

DROP POLICY IF EXISTS "Admins can insert muscle groups" ON public.muscle_groups;
CREATE POLICY "Admins can insert muscle groups"
    ON public.muscle_groups FOR INSERT
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update muscle groups" ON public.muscle_groups;
CREATE POLICY "Admins can update muscle groups"
    ON public.muscle_groups FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete muscle groups" ON public.muscle_groups;
CREATE POLICY "Admins can delete muscle groups"
    ON public.muscle_groups FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 5. equipment_types — admin INSERT/UPDATE/DELETE
-- ============================================================================
-- Currently: "Equipment types are publicly readable" (SELECT for all)

DROP POLICY IF EXISTS "Admins can insert equipment types" ON public.equipment_types;
CREATE POLICY "Admins can insert equipment types"
    ON public.equipment_types FOR INSERT
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update equipment types" ON public.equipment_types;
CREATE POLICY "Admins can update equipment types"
    ON public.equipment_types FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete equipment types" ON public.equipment_types;
CREATE POLICY "Admins can delete equipment types"
    ON public.equipment_types FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 6. workout_sessions — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped SELECT/INSERT/UPDATE/DELETE (auth.uid() = user_id)
-- Missing: admin read-all + update/delete

DROP POLICY IF EXISTS "Admins can view all workout sessions" ON public.workout_sessions;
CREATE POLICY "Admins can view all workout sessions"
    ON public.workout_sessions FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any workout session" ON public.workout_sessions;
CREATE POLICY "Admins can update any workout session"
    ON public.workout_sessions FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any workout session" ON public.workout_sessions;
CREATE POLICY "Admins can delete any workout session"
    ON public.workout_sessions FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 7. workout_exercises — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via session ownership
-- Missing: admin read-all + update/delete

DROP POLICY IF EXISTS "Admins can view all workout exercises" ON public.workout_exercises;
CREATE POLICY "Admins can view all workout exercises"
    ON public.workout_exercises FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any workout exercise" ON public.workout_exercises;
CREATE POLICY "Admins can update any workout exercise"
    ON public.workout_exercises FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any workout exercise" ON public.workout_exercises;
CREATE POLICY "Admins can delete any workout exercise"
    ON public.workout_exercises FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 8. workout_sets — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via session ownership
-- Missing: admin read-all + update/delete

DROP POLICY IF EXISTS "Admins can view all workout sets" ON public.workout_sets;
CREATE POLICY "Admins can view all workout sets"
    ON public.workout_sets FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any workout set" ON public.workout_sets;
CREATE POLICY "Admins can update any workout set"
    ON public.workout_sets FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any workout set" ON public.workout_sets;
CREATE POLICY "Admins can delete any workout set"
    ON public.workout_sets FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 9. body_measurements — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped (auth.uid() = user_id)
-- Missing: admin read-all + update/delete

DROP POLICY IF EXISTS "Admins can view all body measurements" ON public.body_measurements;
CREATE POLICY "Admins can view all body measurements"
    ON public.body_measurements FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any body measurement" ON public.body_measurements;
CREATE POLICY "Admins can update any body measurement"
    ON public.body_measurements FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any body measurement" ON public.body_measurements;
CREATE POLICY "Admins can delete any body measurement"
    ON public.body_measurements FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 10. routines — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped SELECT (auth.uid() = user_id OR is_public) + user INSERT/UPDATE/DELETE
-- Missing: admin read-all + update/delete

DROP POLICY IF EXISTS "Admins can view all routines" ON public.routines;
CREATE POLICY "Admins can view all routines"
    ON public.routines FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any routine" ON public.routines;
CREATE POLICY "Admins can update any routine"
    ON public.routines FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any routine" ON public.routines;
CREATE POLICY "Admins can delete any routine"
    ON public.routines FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 11. routine_days — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via routine ownership
-- Missing: admin read-all + update/delete

DROP POLICY IF EXISTS "Admins can view all routine days" ON public.routine_days;
CREATE POLICY "Admins can view all routine days"
    ON public.routine_days FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any routine day" ON public.routine_days;
CREATE POLICY "Admins can update any routine day"
    ON public.routine_days FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any routine day" ON public.routine_days;
CREATE POLICY "Admins can delete any routine day"
    ON public.routine_days FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 12. routine_exercises — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via routine ownership
-- Missing: admin read-all + update/delete

DROP POLICY IF EXISTS "Admins can view all routine exercises" ON public.routine_exercises;
CREATE POLICY "Admins can view all routine exercises"
    ON public.routine_exercises FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any routine exercise" ON public.routine_exercises;
CREATE POLICY "Admins can update any routine exercise"
    ON public.routine_exercises FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any routine exercise" ON public.routine_exercises;
CREATE POLICY "Admins can delete any routine exercise"
    ON public.routine_exercises FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 13. routine_sets — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via routine ownership
-- Missing: admin read-all + update/delete

DROP POLICY IF EXISTS "Admins can view all routine sets" ON public.routine_sets;
CREATE POLICY "Admins can view all routine sets"
    ON public.routine_sets FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any routine set" ON public.routine_sets;
CREATE POLICY "Admins can update any routine set"
    ON public.routine_sets FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any routine set" ON public.routine_sets;
CREATE POLICY "Admins can delete any routine set"
    ON public.routine_sets FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 14. user_follows — admin SELECT all + DELETE
-- ============================================================================
-- Currently: public SELECT + user INSERT/DELETE (follower_id = auth.uid())
-- Admin needs: read all rows (for social page) + delete any

DROP POLICY IF EXISTS "Admins can view all follows" ON public.user_follows;
CREATE POLICY "Admins can view all follows"
    ON public.user_follows FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any follow" ON public.user_follows;
CREATE POLICY "Admins can delete any follow"
    ON public.user_follows FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 15. workout_likes — admin SELECT all + DELETE
-- ============================================================================
-- Currently: public SELECT + user INSERT/DELETE
-- Admin needs: read all rows + delete any

DROP POLICY IF EXISTS "Admins can view all workout likes" ON public.workout_likes;
CREATE POLICY "Admins can view all workout likes"
    ON public.workout_likes FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any workout like" ON public.workout_likes;
CREATE POLICY "Admins can delete any workout like"
    ON public.workout_likes FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 16. workout_comments — admin SELECT all + DELETE
-- ============================================================================
-- Currently: public SELECT + user INSERT/UPDATE/DELETE
-- Admin needs: read all rows + delete any (for moderation)

DROP POLICY IF EXISTS "Admins can view all workout comments" ON public.workout_comments;
CREATE POLICY "Admins can view all workout comments"
    ON public.workout_comments FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any workout comment" ON public.workout_comments;
CREATE POLICY "Admins can delete any workout comment"
    ON public.workout_comments FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 17. favorite_gyms — admin SELECT all + DELETE
-- ============================================================================
-- Currently: user-scoped SELECT/INSERT/DELETE (athlete_id = auth.uid())
-- Admin needs: read all rows + delete any

DROP POLICY IF EXISTS "Admins can view all favorite gyms" ON public.favorite_gyms;
CREATE POLICY "Admins can view all favorite gyms"
    ON public.favorite_gyms FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any favorite gym" ON public.favorite_gyms;
CREATE POLICY "Admins can delete any favorite gym"
    ON public.favorite_gyms FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 18. gym_reviews — admin SELECT all + DELETE
-- ============================================================================
-- Currently: public SELECT + athlete INSERT/UPDATE
-- Admin needs: read all rows + delete any (for moderation)

DROP POLICY IF EXISTS "Admins can view all gym reviews" ON public.gym_reviews;
CREATE POLICY "Admins can view all gym reviews"
    ON public.gym_reviews FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete any gym review" ON public.gym_reviews;
CREATE POLICY "Admins can delete any gym review"
    ON public.gym_reviews FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 19. translations — admin DELETE
-- ============================================================================
-- Currently: public SELECT + permissive INSERT/UPDATE (WITH CHECK true)
-- The permissive INSERT/UPDATE policies allow anyone to write, which is too broad.
-- Replace with admin-only INSERT/UPDATE + DELETE.

DROP POLICY IF EXISTS "Service role can manage translations" ON public.translations;
DROP POLICY IF EXISTS "Service role can update translations" ON public.translations;

DROP POLICY IF EXISTS "Admins can insert translations" ON public.translations;
CREATE POLICY "Admins can insert translations"
    ON public.translations FOR INSERT
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update translations" ON public.translations;
CREATE POLICY "Admins can update translations"
    ON public.translations FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete translations" ON public.translations;
CREATE POLICY "Admins can delete translations"
    ON public.translations FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 20. feature_flags — admin DELETE
-- ============================================================================
-- Currently: public SELECT + permissive INSERT/UPDATE (WITH CHECK true)
-- Replace with admin-only INSERT/UPDATE + DELETE.

DROP POLICY IF EXISTS "Service role can manage feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Service role can update feature flags" ON public.feature_flags;

DROP POLICY IF EXISTS "Admins can insert feature flags" ON public.feature_flags;
CREATE POLICY "Admins can insert feature flags"
    ON public.feature_flags FOR INSERT
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update feature flags" ON public.feature_flags;
CREATE POLICY "Admins can update feature flags"
    ON public.feature_flags FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete feature flags" ON public.feature_flags;
CREATE POLICY "Admins can delete feature flags"
    ON public.feature_flags FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 21. countries — admin UPDATE
-- ============================================================================
-- Currently: public SELECT only
-- Admin needs: UPDATE (for countries page edit functionality)

DROP POLICY IF EXISTS "Admins can update countries" ON public.countries;
CREATE POLICY "Admins can update countries"
    ON public.countries FOR UPDATE
    USING (is_admin());

-- ============================================================================
-- 22. athlete_profiles — admin SELECT/UPDATE
-- ============================================================================
-- Currently: athlete-scoped SELECT/UPDATE/INSERT (auth.uid() = id)
-- Admin needs: read all + update (for user detail view)

DROP POLICY IF EXISTS "Admins can view all athlete profiles" ON public.athlete_profiles;
CREATE POLICY "Admins can view all athlete profiles"
    ON public.athlete_profiles FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any athlete profile" ON public.athlete_profiles;
CREATE POLICY "Admins can update any athlete profile"
    ON public.athlete_profiles FOR UPDATE
    USING (is_admin());

-- ============================================================================
-- 23. exercise_progress — admin SELECT
-- ============================================================================
-- Currently: user-scoped SELECT/INSERT/UPDATE (auth.uid() = user_id)
-- Admin needs: read all (for analytics)

DROP POLICY IF EXISTS "Admins can view all exercise progress" ON public.exercise_progress;
CREATE POLICY "Admins can view all exercise progress"
    ON public.exercise_progress FOR SELECT
    USING (is_admin());

-- ============================================================================
-- 24. user_custom_exercises — admin SELECT
-- ============================================================================
-- Currently: user-scoped CRUD (auth.uid() = user_id)
-- Admin needs: read all (for exercises page visibility)

DROP POLICY IF EXISTS "Admins can view all custom exercises" ON public.user_custom_exercises;
CREATE POLICY "Admins can view all custom exercises"
    ON public.user_custom_exercises FOR SELECT
    USING (is_admin());
-- ============================================================
-- MIGRATION: supabase/migrations/20240603000000_add_check_in_code.sql
-- ============================================================

-- Step 1: Add check_in_code and checked_in_at columns to bookings table
-- Booking Ticket / Entry Pass Feature

-- Add columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_in_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_code ON public.bookings(check_in_code);

-- Function to generate unique 6-char alphanumeric code
-- Charset: uppercase + digits, excluding ambiguous chars (0/O, 1/I/L)
CREATE OR REPLACE FUNCTION public.generate_check_in_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE check_in_code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Backfill existing upcoming bookings with check_in_code
UPDATE public.bookings
SET check_in_code = public.generate_check_in_code()
WHERE status = 'upcoming' AND check_in_code IS NULL;

-- Make check_in_code NOT NULL for future integrity (nullable for old non-upcoming bookings)
-- We keep it nullable since old completed/cancelled bookings won't have codes
-- ============================================================
-- MIGRATION: supabase/migrations/20240603000000_fix_wallet_topup_rls.sql
-- ============================================================

-- Migration: Fix wallet top-up RLS policy for athletes
-- Problem: Migration 20240522 dropped "Users can create own wallet transactions" INSERT policy
-- and replaced it with admin-only INSERT policy, breaking athlete self-service top-ups.
-- Fix: Restore the user self-service INSERT policy alongside the admin one.
-- Date: 20240603

-- Restore athlete self-service INSERT policy for wallet_transactions
-- This allows athletes to top up their own wallet via the topUpWallet() server action.
-- The admin-only INSERT policy ("Admins can insert wallet transactions") remains in place
-- for admin operations like addFunds().
DROP POLICY IF EXISTS "Users can create own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can create own wallet transactions"
    ON public.wallet_transactions FOR INSERT
    WITH CHECK (profile_id = auth.uid());
-- ============================================================
-- MIGRATION: supabase/migrations/20240603000000_seed_social_data.sql
-- ============================================================

-- ============================================================
-- Seed Data: Sample users + social feed data
-- Creates 10 athlete profiles with workouts, follows, likes, comments
-- ============================================================

-- ─── Step 1: Create sample profiles (fixed UUIDs for referencing) ───
INSERT INTO public.profiles (id, mobile_number, role, full_name, bio, country_id, onboarding_completed, follower_count, following_count, workout_count, is_public)
VALUES
    ('a0000001-0000-0000-0000-000000000001', '09121000001', 'athlete', 'علی رضایی', 'بدنساز حرفه‌ای | ۵ سال تجربه 💪', 'IR', true, 234, 45, 187, true),
    ('a0000001-0000-0000-0000-000000000002', '09121000002', 'athlete', 'سارا احمدی', 'کراسفیت | عاشق فیتنس 🏋️‍♀️', 'IR', true, 189, 62, 143, true),
    ('a0000001-0000-0000-0000-000000000003', '09121000003', 'athlete', 'محمد حسینی', 'بدنسازی و بوکس 🥊', 'IR', true, 156, 38, 210, true),
    ('a0000001-0000-0000-0000-000000000004', '09121000004', 'athlete', 'فاطمه نوری', 'یوگا و پیلاتس 🧘‍♀️', 'IR', true, 312, 78, 95, true),
    ('a0000001-0000-0000-0000-000000000005', '09121000005', 'athlete', 'امیر کاظمی', 'پاورلیفتینگ | رکورد ملی 🏆', 'IR', true, 445, 22, 302, true),
    ('a0000001-0000-0000-0000-000000000006', '09121000006', 'athlete', 'نازنین محمدی', 'فیتنس و تغذیه سالم 🥗', 'IR', true, 267, 55, 128, true),
    ('a0000001-0000-0000-0000-000000000007', '09121000007', 'athlete', 'رضا کریمی', 'بدنسازی | ۳ سال تجربه', 'IR', true, 98, 41, 76, true),
    ('a0000001-0000-0000-0000-000000000008', '09121000008', 'athlete', 'زهرا صادقی', 'کارتیو و دویدن 🏃‍♀️', 'IR', true, 134, 49, 165, true),
    ('a0000001-0000-0000-0000-000000000009', '09121000009', 'athlete', 'حسین عباسی', 'کراسفیت | مربی سطح یک 🔥', 'IR', true, 523, 33, 245, true),
    ('a0000001-0000-0000-0000-000000000010', '09121000010', 'athlete', 'مینا رحیمی', 'بدنسازی تازه‌کار | روز به روز بهتر ✨', 'IR', true, 67, 58, 34, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Step 2: Create athlete_profiles for seed users ───
INSERT INTO public.athlete_profiles (id, sport_preferences, fitness_level, gender)
VALUES
    ('a0000001-0000-0000-0000-000000000001', ARRAY['bodybuilding', 'weightlifting'], 'advanced', 'male'),
    ('a0000001-0000-0000-0000-000000000002', ARRAY['crossfit', 'fitness'], 'intermediate', 'female'),
    ('a0000001-0000-0000-0000-000000000003', ARRAY['bodybuilding', 'boxing'], 'advanced', 'male'),
    ('a0000001-0000-0000-0000-000000000004', ARRAY['yoga', 'pilates'], 'intermediate', 'female'),
    ('a0000001-0000-0000-0000-000000000005', ARRAY['bodybuilding', 'weightlifting'], 'professional', 'male'),
    ('a0000001-0000-0000-0000-000000000006', ARRAY['fitness', 'cardio'], 'intermediate', 'female'),
    ('a0000001-0000-0000-0000-000000000007', ARRAY['bodybuilding'], 'intermediate', 'male'),
    ('a0000001-0000-0000-0000-000000000008', ARRAY['cardio', 'fitness'], 'advanced', 'female'),
    ('a0000001-0000-0000-0000-000000000009', ARRAY['crossfit', 'weightlifting'], 'professional', 'male'),
    ('a0000001-0000-0000-0000-000000000010', ARRAY['bodybuilding', 'fitness'], 'beginner', 'female')
ON CONFLICT (id) DO NOTHING;

-- ─── Step 3: Create follow relationships ───
-- Disable follow count trigger (counts already set in profiles insert)
ALTER TABLE public.user_follows DISABLE TRIGGER trg_user_follows_count;

INSERT INTO public.user_follows (follower_id, following_id) VALUES
    ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002'),
    ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003'),
    ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004'),
    ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000005'),
    -- Sara follows Ali, Nazanin, Hossein
    ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001'),
    ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000006'),
    ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000009'),
    -- Mohammad follows Ali, Amir, Reza, Hossein
    ('a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001'),
    ('a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005'),
    ('a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000007'),
    ('a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000009'),
    -- Fatemeh follows Sara, Nazanin, Zahra, Mina
    ('a0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002'),
    ('a0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000006'),
    ('a0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000008'),
    ('a0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000010'),
    -- Amir follows Ali, Mohammad, Hossein
    ('a0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001'),
    ('a0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003'),
    ('a0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000009'),
    -- Cross follows for richer network
    ('a0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000002'),
    ('a0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000004'),
    ('a0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001'),
    ('a0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000005'),
    ('a0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000004'),
    ('a0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000006'),
    ('a0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000005'),
    ('a0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001'),
    ('a0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000002'),
    ('a0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000006')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- ─── Step 4: Create shared workout sessions ───
-- Temporarily disable the workout_count trigger to avoid double-counting
-- (we already set workout_count in the profiles insert)
ALTER TABLE public.workout_sessions DISABLE TRIGGER trg_workout_sessions_user_count;

INSERT INTO public.workout_sessions (id, user_id, name, start_time, duration_seconds, status, total_volume, total_sets, estimated_calories, is_shared, shared_at, like_count, comment_count)
VALUES
    -- Ali's workouts
    ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'تمرین سینه و سرشانه', now() - interval '2 hours', 5400, 'completed', 8500.00, 24, 450, true, now() - interval '1 hour 30 minutes', 12, 5),
    ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'روز پا - اسکات و پرس پا', now() - interval '1 day', 7200, 'completed', 12000.00, 28, 620, true, now() - interval '23 hours', 18, 8),

    -- Sara's workouts
    ('b0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 'WOD کراسفیت - Fran', now() - interval '3 hours', 2700, 'completed', 3200.00, 18, 380, true, now() - interval '2 hours', 24, 7),
    ('b0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002', 'تمرین فول بادی', now() - interval '2 days', 5400, 'completed', 6800.00, 22, 520, true, now() - interval '1 day 20 hours', 9, 3),

    -- Mohammad's workouts
    ('b0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003', 'بوکس + بدنسازی', now() - interval '5 hours', 6300, 'completed', 5400.00, 20, 580, true, now() - interval '4 hours', 15, 6),

    -- Fatemeh's workouts
    ('b0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000004', 'جلسه یوگای صبحگاهی', now() - interval '6 hours', 3600, 'completed', 0.00, 12, 180, true, now() - interval '5 hours', 31, 12),

    -- Amir's workouts (powerlifter - heavy weights!)
    ('b0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000005', 'اسکات ۲۰۰ کیلو! 🎉', now() - interval '4 hours', 4800, 'completed', 15600.00, 16, 540, true, now() - interval '3 hours', 45, 18),
    ('b0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000005', 'ددلیفت و پرس سینه', now() - interval '3 days', 5400, 'completed', 18200.00, 20, 610, true, now() - interval '2 days 20 hours', 52, 22),

    -- Nazanin's workouts
    ('b0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000006', 'فول بادی + کاردیو', now() - interval '8 hours', 4500, 'completed', 4200.00, 18, 420, true, now() - interval '7 hours', 11, 4),

    -- Reza's workouts
    ('b0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000007', 'بایسپتریسپ و زیربغل', now() - interval '10 hours', 3600, 'completed', 3800.00, 16, 320, true, now() - interval '9 hours', 7, 2),

    -- Zahra's workouts
    ('b0000001-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000008', 'دویدن ۱۰ کیلومتر 🏃‍♀️', now() - interval '12 hours', 3600, 'completed', 0.00, 0, 650, true, now() - interval '11 hours', 19, 9),

    -- Hossein's workouts (crossfit coach)
    ('b0000001-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000009', 'تمرین تیمی کراسفیت', now() - interval '1 hour', 5400, 'completed', 9800.00, 32, 720, true, now() - interval '45 minutes', 38, 14),
    ('b0000001-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000009', 'OLift - اسنچ و کلن', now() - interval '1 day 5 hours', 4200, 'completed', 7400.00, 18, 480, true, now() - interval '1 day 4 hours', 28, 10),

    -- Mina's workouts (beginner)
    ('b0000001-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000010', 'اولین تمرین پرس سینه 💪', now() - interval '7 hours', 2700, 'completed', 1200.00, 12, 210, true, now() - interval '6 hours', 8, 6)
ON CONFLICT (id) DO NOTHING;

-- Re-enable the trigger
ALTER TABLE public.workout_sessions ENABLE TRIGGER trg_workout_sessions_user_count;

-- ─── Step 5: Create workout exercises for each session ───
-- Temporarily drop check constraint (seed data uses exercise_name only, not FK references)
ALTER TABLE public.workout_exercises DROP CONSTRAINT check_exercise_reference;

INSERT INTO public.workout_exercises (id, workout_session_id, exercise_name, sort_order) VALUES
    -- Ali's chest & shoulder workout
    ('e0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'پرس سینه با هالتر', 1),
    ('e0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'پرس بالاسرین دمبل', 2),
    ('e0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'فلای سینه با سیم‌کش', 3),
    ('e0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000001', 'پرس شانه با هالتر', 4),
    ('e0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000001', 'لترال ریز دمبل', 5),

    -- Ali's leg day
    ('e0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000002', 'اسکات با هالتر', 1),
    ('e0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000002', 'پرس پا', 2),
    ('e0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000002', 'لانج با دمبل', 3),
    ('e0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000002', 'ددلیفت رومانیایی', 4),

    -- Sara's CrossFit Fran
    ('e0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000003', 'تراستر', 1),
    ('e0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000003', 'بارفیکس', 2),

    -- Sara's full body
    ('e0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000004', 'ددلیفت', 1),
    ('e0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000004', 'اسکات گابلت', 2),
    ('e0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000004', 'پرس سینه دمبل', 3),
    ('e0000001-0000-0000-0000-000000000015', 'b0000001-0000-0000-0000-000000000004', 'روئینگ', 4),

    -- Mohammad's boxing + gym
    ('e0000001-0000-0000-0000-000000000016', 'b0000001-0000-0000-0000-000000000005', 'بادی bag ۳ راند', 1),
    ('e0000001-0000-0000-0000-000000000017', 'b0000001-0000-0000-0000-000000000005', 'پرس سینه', 2),
    ('e0000001-0000-0000-0000-000000000018', 'b0000001-0000-0000-0000-000000000005', 'جلو بازو هالتر', 3),
    ('e0000001-0000-0000-0000-000000000019', 'b0000001-0000-0000-0000-000000000005', 'پشت بازو سیم‌کش', 4),

    -- Fatemeh's yoga
    ('e0000001-0000-0000-0000-000000000020', 'b0000001-0000-0000-0000-000000000006', 'سلام به خورشید', 1),
    ('e0000001-0000-0000-0000-000000000021', 'b0000001-0000-0000-0000-000000000006', 'حالت جنگجو', 2),
    ('e0000001-0000-0000-0000-000000000022', 'b0000001-0000-0000-0000-000000000006', 'حالت درخت', 3),
    ('e0000001-0000-0000-0000-000000000023', 'b0000001-0000-0000-0000-000000000006', 'شاواسانا', 4),

    -- Amir's 200kg squat!
    ('e0000001-0000-0000-0000-000000000024', 'b0000001-0000-0000-0000-000000000007', 'اسکات ۲۰۰ کیلو 🏆', 1),
    ('e0000001-0000-0000-0000-000000000025', 'b0000001-0000-0000-0000-000000000007', 'پرس پا', 2),
    ('e0000001-0000-0000-0000-000000000026', 'b0000001-0000-0000-0000-000000000007', 'پشت پا', 3),

    -- Amir's deadlift & bench
    ('e0000001-0000-0000-0000-000000000027', 'b0000001-0000-0000-0000-000000000008', 'ددلیفت کلاسیک', 1),
    ('e0000001-0000-0000-0000-000000000028', 'b0000001-0000-0000-0000-000000000008', 'پرس سینه هالتر', 2),

    -- Nazanin's full body + cardio
    ('e0000001-0000-0000-0000-000000000029', 'b0000001-0000-0000-0000-000000000009', 'اسکات سومی', 1),
    ('e0000001-0000-0000-0000-000000000030', 'b0000001-0000-0000-0000-000000000009', 'روئینگ ۱۰ دقیقه', 2),
    ('e0000001-0000-0000-0000-000000000031', 'b0000001-0000-0000-0000-000000000009', 'پلانک', 3),

    -- Reza's arms
    ('e0000001-0000-0000-0000-000000000032', 'b0000001-0000-0000-0000-000000000010', 'جلو بازو هالتر', 1),
    ('e0000001-0000-0000-0000-000000000033', 'b0000001-0000-0000-0000-000000000010', 'جلو بازو چکشی', 2),
    ('e0000001-0000-0000-0000-000000000034', 'b0000001-0000-0000-0000-000000000010', 'پشت بازو سیم‌کش', 3),
    ('e0000001-0000-0000-0000-000000000035', 'b0000001-0000-0000-0000-000000000010', 'لات پول دان', 4),

    -- Zahra's 10k run
    ('e0000001-0000-0000-0000-000000000036', 'b0000001-0000-0000-0000-000000000011', 'دویدن ۱۰ کیلومتر', 1),

    -- Hossein's team CrossFit
    ('e0000001-0000-0000-0000-000000000037', 'b0000001-0000-0000-0000-000000000012', 'برپی', 1),
    ('e0000001-0000-0000-0000-000000000038', 'b0000001-0000-0000-0000-000000000012', 'کلین اند جریک', 2),
    ('e0000001-0000-0000-0000-000000000039', 'b0000001-0000-0000-0000-000000000012', 'طناب کشیدن', 3),
    ('e0000001-0000-0000-0000-000000000040', 'b0000001-0000-0000-0000-000000000012', 'باکس جامپ', 4),

    -- Hossein's O-Lift
    ('e0000001-0000-0000-0000-000000000041', 'b0000001-0000-0000-0000-000000000013', 'اسنچ', 1),
    ('e0000001-0000-0000-0000-000000000042', 'b0000001-0000-0000-0000-000000000013', 'کلن', 2),

    -- Mina's first bench press
    ('e0000001-0000-0000-0000-000000000043', 'b0000001-0000-0000-0000-000000000014', 'پرس سینه با دمبل', 1),
    ('e0000001-0000-0000-0000-000000000044', 'b0000001-0000-0000-0000-000000000014', 'پرس سینه دستگاه', 2),
    ('e0000001-0000-0000-0000-000000000045', 'b0000001-0000-0000-0000-000000000014', 'کراس اور سیم‌کش', 3)
ON CONFLICT (id) DO NOTHING;

-- Restore the check constraint (NOT VALID so it doesn't fail on seed rows without FK refs)
ALTER TABLE public.workout_exercises DROP CONSTRAINT IF EXISTS check_exercise_reference;
ALTER TABLE public.workout_exercises ADD CONSTRAINT check_exercise_reference
    CHECK (exercise_id IS NOT NULL OR custom_exercise_id IS NOT NULL) NOT VALID;

-- ─── Step 6: Create workout sets for exercises ───
INSERT INTO public.workout_sets (workout_exercise_id, weight_kg, reps, set_type, is_completed, set_number) VALUES
    -- Ali's bench press (5 sets)
    ('e0000001-0000-0000-0000-000000000001', 80, 8, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000001', 85, 6, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000001', 90, 4, 'normal', true, 3),
    ('e0000001-0000-0000-0000-000000000001', 85, 6, 'normal', true, 4),
    ('e0000001-0000-0000-0000-000000000001', 80, 8, 'normal', true, 5),
    -- Ali's incline dumbbell
    ('e0000001-0000-0000-0000-000000000002', 30, 10, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000002', 32, 10, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000002', 34, 8, 'normal', true, 3),
    -- Ali's cable fly
    ('e0000001-0000-0000-0000-000000000003', 15, 12, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000003', 17, 12, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000003', 15, 12, 'normal', true, 3),
    -- Ali's shoulder press
    ('e0000001-0000-0000-0000-000000000004', 50, 8, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000004', 55, 6, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000004', 60, 4, 'normal', true, 3),
    -- Ali's lateral raise
    ('e0000001-0000-0000-0000-000000000005', 12, 15, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000005', 14, 12, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000005', 12, 15, 'normal', true, 3),

    -- Ali's squat
    ('e0000001-0000-0000-0000-000000000006', 100, 8, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000006', 120, 6, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000006', 140, 4, 'normal', true, 3),
    ('e0000001-0000-0000-0000-000000000006', 130, 5, 'normal', true, 4),
    -- Ali's leg press
    ('e0000001-0000-0000-0000-000000000007', 200, 10, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000007', 250, 8, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000007', 300, 6, 'normal', true, 3),

    -- Sara's thrusters
    ('e0000001-0000-0000-0000-000000000010', 40, 15, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000010', 40, 15, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000010', 40, 15, 'normal', true, 3),
    -- Sara's pull-ups
    ('e0000001-0000-0000-0000-000000000011', 0, 15, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000011', 0, 15, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000011', 0, 15, 'normal', true, 3),

    -- Amir's 200kg SQUAT!!
    ('e0000001-0000-0000-0000-000000000024', 160, 5, 'warmup', true, 1),
    ('e0000001-0000-0000-0000-000000000024', 180, 3, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000024', 200, 1, 'normal', true, 3),
    ('e0000001-0000-0000-0000-000000000024', 200, 1, 'normal', true, 4),

    -- Amir's deadlift
    ('e0000001-0000-0000-0000-000000000027', 180, 5, 'warmup', true, 1),
    ('e0000001-0000-0000-0000-000000000027', 220, 3, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000027', 250, 2, 'normal', true, 3),
    ('e0000001-0000-0000-0000-000000000027', 260, 1, 'normal', true, 4),

    -- Hossein's burpees
    ('e0000001-0000-0000-0000-000000000037', 0, 20, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000037', 0, 20, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000037', 0, 20, 'normal', true, 3),
    -- Hossein's clean & jerk
    ('e0000001-0000-0000-0000-000000000038', 80, 3, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000038', 90, 3, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000038', 95, 2, 'normal', true, 3),

    -- Mina's first bench press (light weights - beginner)
    ('e0000001-0000-0000-0000-000000000043', 8, 12, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000043', 10, 10, 'normal', true, 2),
    ('e0000001-0000-0000-0000-000000000043', 10, 8, 'normal', true, 3),
    -- Mina's machine press
    ('e0000001-0000-0000-0000-000000000044', 20, 12, 'normal', true, 1),
    ('e0000001-0000-0000-0000-000000000044', 25, 10, 'normal', true, 2)
ON CONFLICT DO NOTHING;

-- ─── Step 7: Create likes on workouts ───
-- Disable like_count trigger (already set in workout insert)
ALTER TABLE public.workout_likes DISABLE TRIGGER trg_workout_likes_count;

INSERT INTO public.workout_likes (user_id, workout_session_id) VALUES
    -- Ali's chest workout likes
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001'),
    ('a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001'),
    ('a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000001'),
    ('a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000001'),
    ('a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000001'),
    -- Sara's CrossFit likes
    ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000003'),
    ('a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000003'),
    ('a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000003'),
    ('a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000003'),
    ('a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000003'),
    -- Amir's 200kg squat likes (popular!)
    ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000007'),
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000007'),
    ('a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000007'),
    ('a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000007'),
    ('a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000007'),
    ('a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000007'),
    ('a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000007'),
    ('a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000007'),
    ('a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000007'),
    -- Fatemeh's yoga likes
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000006'),
    ('a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000006'),
    ('a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000006'),
    ('a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000006'),
    -- Hossein's team WOD likes
    ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000012'),
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000012'),
    ('a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000012'),
    ('a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000012'),
    ('a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000012'),
    -- Mina's first workout likes (encouragement!)
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000014'),
    ('a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000014'),
    ('a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000014'),
    ('a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000014')
ON CONFLICT (user_id, workout_session_id) DO NOTHING;

ALTER TABLE public.workout_likes ENABLE TRIGGER trg_workout_likes_count;

-- ─── Step 8: Create comments on workouts ───
-- Disable comment_count trigger (already set in workout insert)
ALTER TABLE public.workout_comments DISABLE TRIGGER trg_workout_comments_count;

INSERT INTO public.workout_comments (user_id, workout_session_id, comment, created_at) VALUES
    -- Comments on Ali's chest workout
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'عالی بود علی! 💪', now() - interval '1 hour'),
    ('a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'حجمش خیلی خوبه', now() - interval '50 minutes'),
    ('a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000001', 'پرس سینه خیلی قوی داری', now() - interval '40 minutes'),
    ('a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000001', 'ادامه بده 🔥', now() - interval '30 minutes'),
    ('a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000001', 'بشکوه بود!', now() - interval '20 minutes'),

    -- Comments on Amir's 200kg squat
    ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000007', 'واقعا ۲۰۰ کیلو؟! 😱🔥', now() - interval '2 hours 30 minutes'),
    ('a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000007', 'اسطوره! 🏆', now() - interval '2 hours 15 minutes'),
    ('a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000007', 'خیلی اعتماد به نفس میخواد', now() - interval '2 hours'),
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000007', 'الهام‌بخش هستی امیر 💪', now() - interval '1 hour 45 minutes'),
    ('a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000007', 'امیدوارم یه روز منم به اون سطح برسم', now() - interval '1 hour 30 minutes'),

    -- Comments on Sara's CrossFit
    ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000003', 'زمان Fran چقدر شد؟', now() - interval '1 hour 20 minutes'),
    ('a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000003', 'عالی سارا! کراسفیت خیلی خوبه', now() - interval '1 hour 10 minutes'),
    ('a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000003', 'بارفیکست عالیه 🙌', now() - interval '1 hour'),

    -- Comments on Fatemeh's yoga
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000006', 'منم دنبال کلاس یوگا هستم 😍', now() - interval '4 hours'),
    ('a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000006', 'یوگای صبحگاهی بهترینه', now() - interval '3 hours 30 minutes'),
    ('a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000006', 'چقدر آرامش‌بخش 🧘', now() - interval '3 hours'),

    -- Comments on Hossein's team WOD
    ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000012', 'تمرین تیمی همیشه انگیزه بیشتری میده', now() - interval '30 minutes'),
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000012', 'مربی عالی! 👏', now() - interval '25 minutes'),
    ('a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000012', 'منم میخواستم شرکت کنم', now() - interval '20 minutes'),

    -- Comments on Mina's first workout (encouragement)
    ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000014', 'شروع خیلی خوبیه! ادامه بده 🌟', now() - interval '5 hours'),
    ('a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000014', 'همه از یه جایی شروع کردن 💪', now() - interval '4 hours 30 minutes'),
    ('a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000014', 'خیلی خوشحالم که شروع کردی!', now() - interval '4 hours')
ON CONFLICT DO NOTHING;

ALTER TABLE public.workout_comments ENABLE TRIGGER trg_workout_comments_count;

-- ─── Step 9: Re-enable follow count trigger ───
ALTER TABLE public.user_follows ENABLE TRIGGER trg_user_follows_count;

-- ─── Step 10: RLS policies for social feed already exist in prior migrations ───
-- Policies "Shared workouts are publicly readable", "Exercises of shared workouts are readable",
-- "Sets of shared workout exercises are readable", etc. were created in migration 20240602000000.

-- ============================================================
-- MIGRATION: supabase/migrations/20240603000001_add_auto_expire_cron.sql
-- ============================================================

-- ============================================================
-- Step 2: pg_cron job to auto-expire past bookings
-- ============================================================
-- Runs hourly. Transitions 'upcoming' bookings to 'expired'
-- when the time slot's date+end_time has passed.

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ── Function: auto-expire bookings whose time slot has passed ──
CREATE OR REPLACE FUNCTION public.auto_expire_bookings()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.bookings b
  SET status = 'expired'
  FROM public.gym_time_slots ts
  WHERE b.time_slot_id = ts.id
    AND b.status = 'upcoming'
    AND (ts.date + ts.end_time) < now();
END;
$$;

-- ── Schedule: run every hour at minute 0 ──
SELECT cron.schedule(
  'auto-expire-bookings',
  '0 * * * *',
  'SELECT public.auto_expire_bookings()'
);
-- ============================================================
-- MIGRATION: supabase/migrations/20240604000000_add_check_in_code_to_bookings.sql
-- ============================================================

-- ============================================================
-- Add check_in_code column to bookings table
-- The application code generates a 6-char alphanumeric code for
-- each booking that athletes show at gym check-in.
-- ============================================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS check_in_code TEXT;

-- Create an index for fast lookups at gym check-in
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_code
ON public.bookings(check_in_code)
WHERE check_in_code IS NOT NULL;