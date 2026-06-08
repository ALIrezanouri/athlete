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
CREATE POLICY "Gyms are publicly readable when active"
    ON public.gyms FOR SELECT
    USING (is_active = true);

-- Managers can insert their own gyms
CREATE POLICY "Managers can create gyms"
    ON public.gyms FOR INSERT
    WITH CHECK (manager_id = auth.uid());

-- Managers can update their own gyms
CREATE POLICY "Managers can update own gyms"
    ON public.gyms FOR UPDATE
    USING (manager_id = auth.uid())
    WITH CHECK (manager_id = auth.uid());

-- ============================================================
-- RLS POLICIES: GYM_PHOTOS (public read, manager write)
-- ============================================================

CREATE POLICY "Gym photos are publicly readable"
    ON public.gym_photos FOR SELECT
    USING (true);

CREATE POLICY "Managers can add photos to own gyms"
    ON public.gym_photos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = gym_photos.gym_id
            AND gyms.manager_id = auth.uid()
        )
    );

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

CREATE POLICY "Gym amenities are publicly readable"
    ON public.gym_amenities FOR SELECT
    USING (true);

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

CREATE POLICY "Gym sport types are publicly readable"
    ON public.gym_sport_types FOR SELECT
    USING (true);

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

CREATE POLICY "Gym trainers are publicly readable"
    ON public.gym_trainers FOR SELECT
    USING (true);

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

CREATE POLICY "Gym time slots are publicly readable"
    ON public.gym_time_slots FOR SELECT
    USING (true);

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
CREATE POLICY "Athletes can read own bookings"
    ON public.bookings FOR SELECT
    USING (athlete_id = auth.uid());

-- Athletes can create bookings for themselves
CREATE POLICY "Athletes can create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (athlete_id = auth.uid());

-- Athletes can update their own bookings (for cancellation)
CREATE POLICY "Athletes can update own bookings"
    ON public.bookings FOR UPDATE
    USING (athlete_id = auth.uid());

-- Gym managers can read bookings for their gyms
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
CREATE POLICY "Gym reviews are publicly readable"
    ON public.gym_reviews FOR SELECT
    USING (true);

-- Athletes can create reviews for their own bookings
CREATE POLICY "Athletes can create reviews"
    ON public.gym_reviews FOR INSERT
    WITH CHECK (athlete_id = auth.uid());

-- Athletes can update their own reviews
CREATE POLICY "Athletes can update own reviews"
    ON public.gym_reviews FOR UPDATE
    USING (athlete_id = auth.uid());

-- ============================================================
-- RLS POLICIES: WALLET_TRANSACTIONS (user read own only)
-- ============================================================

-- Users can only read their own transactions
CREATE POLICY "Users can read own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (profile_id = auth.uid());

-- Users can create transactions for their own wallet (top-up via service role in practice)
CREATE POLICY "Users can create own wallet transactions"
    ON public.wallet_transactions FOR INSERT
    WITH CHECK (profile_id = auth.uid());

-- ============================================================
-- RLS POLICIES: FAVORITE_GYMS (user read/write own only)
-- ============================================================

-- Users can read their own favorites
CREATE POLICY "Users can read own favorite gyms"
    ON public.favorite_gyms FOR SELECT
    USING (athlete_id = auth.uid());

-- Users can add favorites for themselves
CREATE POLICY "Users can add own favorite gyms"
    ON public.favorite_gyms FOR INSERT
    WITH CHECK (athlete_id = auth.uid());

-- Users can remove their own favorites
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

CREATE TRIGGER trg_gyms_updated_at
    BEFORE UPDATE ON public.gyms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
