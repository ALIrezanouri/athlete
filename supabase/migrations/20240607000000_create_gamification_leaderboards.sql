-- ════════════════════════════════════════════════════════════════════════════
-- Phase 4: Leaderboards
-- Weekly/monthly/all-time XP rankings with gym and global scope
-- ════════════════════════════════════════════════════════════════════════════

-- ── RPC: Get Global Leaderboard ─────────────────────────────────────────────
-- Returns top N users by total XP with their profile info
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_period TEXT DEFAULT 'all_time'  -- 'all_time', 'monthly', 'weekly'
)
RETURNS TABLE(
    rank BIGINT,
    user_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    total_xp INTEGER,
    current_level INTEGER,
    workout_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        ROW_NUMBER() OVER (ORDER BY COALESCE(ux.total_xp, 0) DESC) AS rank,
        p.id AS user_id,
        p.full_name,
        p.avatar_url,
        COALESCE(ux.total_xp, 0) AS total_xp,
        COALESCE(ux.current_level, 1) AS current_level,
        workout_count
    FROM public.profiles p
    LEFT JOIN public.user_xp ux ON ux.user_id = p.id
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS workout_count
        FROM public.workout_sessions ws
        WHERE ws.user_id = p.id
          AND ws.status = 'completed'
          AND (
            p_period = 'all_time'
            OR (p_period = 'monthly' AND ws.start_time >= date_trunc('month', now()))
            OR (p_period = 'weekly' AND ws.start_time >= date_trunc('week', now()))
          )
    ) wc ON true
    WHERE COALESCE(ux.total_xp, 0) > 0
    ORDER BY total_xp DESC
    LIMIT p_limit OFFSET p_offset;
$$;

-- ── RPC: Get Gym Leaderboard ────────────────────────────────────────────────
-- Returns top N users within a specific gym by XP
CREATE OR REPLACE FUNCTION public.get_gym_leaderboard(
    p_gym_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_period TEXT DEFAULT 'all_time'
)
RETURNS TABLE(
    rank BIGINT,
    user_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    total_xp INTEGER,
    current_level INTEGER,
    workout_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        ROW_NUMBER() OVER (ORDER BY COALESCE(ux.total_xp, 0) DESC) AS rank,
        p.id AS user_id,
        p.full_name,
        p.avatar_url,
        COALESCE(ux.total_xp, 0) AS total_xp,
        COALESCE(ux.current_level, 1) AS current_level,
        wc.workout_count
    FROM public.profiles p
    INNER JOIN public.gym_memberships gm ON gm.user_id = p.id AND gm.gym_id = p_gym_id
    LEFT JOIN public.user_xp ux ON ux.user_id = p.id
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS workout_count
        FROM public.workout_sessions ws
        WHERE ws.user_id = p.id
          AND ws.gym_id = p_gym_id
          AND ws.status = 'completed'
          AND (
            p_period = 'all_time'
            OR (p_period = 'monthly' AND ws.start_time >= date_trunc('month', now()))
            OR (p_period = 'weekly' AND ws.start_time >= date_trunc('week', now()))
          )
    ) wc ON true
    WHERE COALESCE(ux.total_xp, 0) > 0
    ORDER BY total_xp DESC
    LIMIT p_limit OFFSET p_offset;
$$;

-- ── RPC: Get User's Rank ────────────────────────────────────────────────────
-- Returns the current user's rank in the global leaderboard
CREATE OR REPLACE FUNCTION public.get_user_rank(
    p_user_id UUID
)
RETURNS TABLE(
    rank BIGINT,
    total_xp INTEGER,
    current_level INTEGER,
    total_users INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH ranked AS (
        SELECT
            p.id AS user_id,
            COALESCE(ux.total_xp, 0) AS total_xp,
            ROW_NUMBER() OVER (ORDER BY COALESCE(ux.total_xp, 0) DESC) AS rank
        FROM public.profiles p
        LEFT JOIN public.user_xp ux ON ux.user_id = p.id
        WHERE COALESCE(ux.total_xp, 0) > 0
    )
    SELECT
        r.rank,
        r.total_xp,
        COALESCE(ux.current_level, 1) AS current_level,
        COUNT(*) OVER () AS total_users
    FROM ranked r
    LEFT JOIN public.user_xp ux ON ux.user_id = r.user_id
    WHERE r.user_id = p_user_id;
$$;

-- ── Feature Flag ─────────────────────────────────────────────────────────────
INSERT INTO public.feature_flags (feature_key, description, is_enabled)
VALUES ('gamification_leaderboards', 'Enable leaderboards system', true)
ON CONFLICT (feature_key) DO UPDATE SET is_enabled = true;

-- ════════════════════════════════════════════════════════════════════════════
-- End of Phase 4 Migration
-- ════════════════════════════════════════════════════════════════════════════