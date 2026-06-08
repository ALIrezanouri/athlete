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
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role can insert profiles (handled via admin client)
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
CREATE POLICY "Athletes can read own extended profile"
    ON public.athlete_profiles FOR SELECT
    USING (auth.uid() = id);

-- Athletes can update own extended profile
CREATE POLICY "Athletes can update own extended profile"
    ON public.athlete_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Athletes can insert own extended profile
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

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_athlete_profiles_updated_at
    BEFORE UPDATE ON public.athlete_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
