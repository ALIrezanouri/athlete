-- ════════════════════════════════════════════════════════════════════════════
-- Phase 3: Challenges & Quests
-- Daily/Weekly/Monthly time-limited goals with progress tracking
-- ════════════════════════════════════════════════════════════════════════════

-- ── Challenge Definitions (managed by admin) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    icon            TEXT NOT NULL DEFAULT '🎯',
    banner_color    TEXT NOT NULL DEFAULT '#3B82F6',

    -- Challenge type: daily, weekly, monthly, special
    challenge_type  TEXT NOT NULL DEFAULT 'weekly'
                    CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'special')),

    -- Goal definition (same pattern as achievements)
    goal_type       TEXT NOT NULL DEFAULT 'workout_count'
                    CHECK (goal_type IN (
                        'workout_count', 'streak_days', 'total_volume',
                        'booking_count', 'pr_count', 'share_count',
                        'social_likes', 'total_sets', 'total_calories'
                    )),
    goal_value      INTEGER NOT NULL DEFAULT 1 CHECK (goal_value > 0),

    -- Reward
    xp_reward       INTEGER NOT NULL DEFAULT 50 CHECK (xp_reward >= 0),
    coin_reward     INTEGER NOT NULL DEFAULT 0 CHECK (coin_reward >= 0),

    -- Timing
    starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at         TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),

    -- Repeat: for daily/weekly/monthly auto-generation
    is_recurring    BOOLEAN NOT NULL DEFAULT false,

    -- State
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_active_type
    ON public.challenges (is_active, challenge_type)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_challenges_dates
    ON public.challenges (starts_at, ends_at);

-- ── User Challenge Progress (one row per user per challenge) ────────────────
CREATE TABLE IF NOT EXISTS public.user_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id    UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,

    -- Progress
    progress_value  INTEGER NOT NULL DEFAULT 0 CHECK (progress_value >= 0),
    is_completed    BOOLEAN NOT NULL DEFAULT false,
    completed_at    TIMESTAMPTZ,
    reward_claimed  BOOLEAN NOT NULL DEFAULT false,
    claimed_at      TIMESTAMPTZ,

    -- Metadata
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user
    ON public.user_challenges (user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge
    ON public.user_challenges (challenge_id);

-- ── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

-- Challenges: visible to all authenticated users when active
DROP POLICY IF EXISTS "challenges_select_active" ON public.challenges;
CREATE POLICY "challenges_select_active" ON public.challenges
    FOR SELECT TO authenticated USING (is_active = true);

-- User Challenges: users see only their own
DROP POLICY IF EXISTS "user_challenges_select_own" ON public.user_challenges;
CREATE POLICY "user_challenges_select_own" ON public.user_challenges
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_challenges_insert_own" ON public.user_challenges;
CREATE POLICY "user_challenges_insert_own" ON public.user_challenges
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_challenges_update_own" ON public.user_challenges;
CREATE POLICY "user_challenges_update_own" ON public.user_challenges
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Admin full access via service_role (no policy needed for service_role)

-- ── Updated trigger for challenges ──────────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS set_updated_at_user_challenges
    BEFORE UPDATE ON public.user_challenges
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER IF NOT EXISTS set_updated_at_challenges
    BEFORE UPDATE ON public.challenges
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RPC: Update challenge progress when events occur ────────────────────────
-- Called after workout completion, PR creation, booking, etc.
CREATE OR REPLACE FUNCTION public.update_challenge_progress(
    p_user_id   UUID,
    p_goal_type TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update all active, incomplete challenges matching this goal type
    UPDATE public.user_challenges uc
    SET
        progress_value = LEAST(uc.progress_value + p_increment, c.goal_value),
        is_completed = CASE
            WHEN uc.progress_value + p_increment >= c.goal_value THEN true
            ELSE uc.is_completed
        END,
        completed_at = CASE
            WHEN uc.progress_value + p_increment >= c.goal_value AND uc.completed_at IS NULL
            THEN now()
            ELSE uc.completed_at
        END,
        updated_at = now()
    FROM public.challenges c
    WHERE uc.challenge_id = c.id
      AND c.goal_type = p_goal_type
      AND c.is_active = true
      AND c.starts_at <= now()
      AND c.ends_at >= now()
      AND uc.user_id = p_user_id
      AND uc.is_completed = false;
END;
$$;

-- ── RPC: Auto-join active challenges for a user ────────────────────────────
-- Ensures user is enrolled in all currently active challenges
CREATE OR REPLACE FUNCTION public.auto_join_active_challenges(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    INSERT INTO public.user_challenges (user_id, challenge_id)
    SELECT p_user_id, c.id
    FROM public.challenges c
    WHERE c.is_active = true
      AND c.starts_at <= now()
      AND c.ends_at >= now()
      AND NOT EXISTS (
          SELECT 1 FROM public.user_challenges uc
          WHERE uc.challenge_id = c.id AND uc.user_id = p_user_id
      )
    RETURNING 1 INTO v_count;

    RETURN v_count;
END;
$$;

-- ── RPC: Claim challenge reward ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_challenge_reward(
    p_user_challenge_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    xp_awarded INTEGER,
    coins_awarded INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row RECORD;
BEGIN
    SELECT uc.*, c.xp_reward, c.coin_reward, c.title
    INTO v_row
    FROM public.user_challenges uc
    JOIN public.challenges c ON c.id = uc.challenge_id
    WHERE uc.id = p_user_challenge_id
      AND uc.user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0;
        RETURN;
    END IF;

    IF v_row.is_completed = false OR v_row.reward_claimed = true THEN
        RETURN QUERY SELECT false, 0, 0;
        RETURN;
    END IF;

    -- Mark as claimed
    UPDATE public.user_challenges
    SET reward_claimed = true, claimed_at = now()
    WHERE id = p_user_challenge_id;

    -- Award XP and coins
    UPDATE public.user_xp
    SET total_xp = total_xp + v_row.xp_reward
    WHERE user_id = v_row.user_id;

    -- Award coins if reward > 0
    IF v_row.coin_reward > 0 THEN
        UPDATE public.user_wallets
        SET balance = balance + v_row.coin_reward
        WHERE user_id = v_row.user_id;
    END IF;

    -- Record in XP ledger
    INSERT INTO public.xp_transactions (user_id, xp_amount, reason, reference_type, reference_id)
    VALUES (v_row.user_id, v_row.xp_reward, 'چالش: ' || v_row.title, 'challenge', p_user_challenge_id);

    RETURN QUERY SELECT true, v_row.xp_reward, v_row.coin_reward;
END;
$$;

-- ── Seed Data: 4 sample challenges ──────────────────────────────────────────
INSERT INTO public.challenges (code, title, description, icon, challenge_type, goal_type, goal_value, xp_reward, starts_at, ends_at, is_active) VALUES
    ('weekly_workout_3',     'هفته فعال',         'این هفته ۳ جلسه تمرین انجام بده',       '🔥', 'weekly',  'workout_count',  3,  100, now(), now() + INTERVAL '7 days', true),
    ('daily_volume_5k',      'حجم روزانه ۵ تن',   'امروز بیش از ۵۰۰۰ کیلوگرم وزنه بزن',    '💪', 'daily',   'total_volume',  5000, 50, now(), now() + INTERVAL '1 day',  true),
    ('weekly_streak_5',      '۵ روز پیاپی',       '۵ روز متوالی تمرین کن',                 '⚡', 'weekly',  'streak_days',  5,  150, now(), now() + INTERVAL '7 days', true),
    ('monthly_workout_12',   '۱۲ جلسه در ماه',    'این ماه ۱۲ جلسه تمرین کامل کن',         '🏆', 'monthly', 'workout_count', 12, 500, now(), now() + INTERVAL '30 days', true)
ON CONFLICT (code) DO NOTHING;

-- ── Feature Flag ─────────────────────────────────────────────────────────────
INSERT INTO public.feature_flags (feature_key, description, is_enabled)
VALUES ('gamification_challenges', 'Enable challenges & quests system', true)
ON CONFLICT (feature_key) DO UPDATE SET is_enabled = true;

-- ════════════════════════════════════════════════════════════════════════════
-- End of Phase 3 Migration
-- ════════════════════════════════════════════════════════════════════════════