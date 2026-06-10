-- Gamification & Referral System Extension

-- 1. ATHLETE_COINS TABLE (Gamification Currency)
CREATE TABLE IF NOT EXISTS public.athlete_coins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_athlete_coins_user ON public.athlete_coins(user_id);

-- 2. COIN_TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('workout_reward', 'referral_bonus', 'insurance_redeem', 'manual_adjustment')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. REFERRALS TABLE
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    referral_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_referral_code ON public.referrals(referral_code);

-- 4. RLS POLICIES

-- Athlete Coins
ALTER TABLE public.athlete_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coins"
    ON public.athlete_coins FOR SELECT
    USING (auth.uid() = user_id);

-- Coin Transactions
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
    ON public.coin_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrers can view their referrals"
    ON public.referrals FOR SELECT
    USING (auth.uid() = referrer_id);

-- 5. TRIGGER FOR UPDATED_AT
CREATE TRIGGER trg_athlete_coins_updated_at
    BEFORE UPDATE ON public.athlete_coins
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. INITIAL SEED FOR FEATURES (Optional translation/config can be handled via admin panel)
