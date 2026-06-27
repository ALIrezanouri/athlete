-- ═══════════════════════════════════════════════════════════════════
-- Gamification Phase 2: Achievements & Badges
-- ═══════════════════════════════════════════════════════════════════

-- ─── Achievement Catalog ──────────────────────────────────────────
-- Admin-defined achievements. Each has a category, tier, and goal metric.

CREATE TABLE IF NOT EXISTS public.achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT UNIQUE NOT NULL,          -- e.g. 'first_workout', 'streak_7', 'bench_100'
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    icon            TEXT NOT NULL DEFAULT '🏅',    -- emoji icon
    category        TEXT NOT NULL CHECK (category IN ('workout','streak','strength','social','booking','special')),
    tier            TEXT NOT NULL CHECK (tier IN ('bronze','silver','gold','platinum')),
    goal_type       TEXT NOT NULL CHECK (goal_type IN (
                        'total_workouts','current_streak','best_streak','total_volume',
                        'pr_count','booking_count','follower_count','shared_count',
                        'weekly_workouts','level_reached','exercise_pr','total_xp'
                    )),
    goal_value      INTEGER NOT NULL DEFAULT 1,
    xp_reward       INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── User Achievement Progress ────────────────────────────────────
-- Tracks each user's progress toward each achievement. Set to unlocked when goal met.

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id  UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    progress        INTEGER NOT NULL DEFAULT 0,
    is_unlocked     BOOLEAN NOT NULL DEFAULT false,
    unlocked_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements(user_id, is_unlocked);

-- ─── RLS Policies ─────────────────────────────────────────────────

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements catalog: public read (active ones)
CREATE POLICY "achievements_public_read"
    ON public.achievements FOR SELECT
    USING (is_active = true);

-- Admin full access via service role (RLS bypassed automatically)

-- User achievements: owner can read/update own; service role full
CREATE POLICY "user_achievements_owner_read"
    ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_owner_update"
    ON public.user_achievements FOR UPDATE
    USING (auth.uid() = user_id);

-- ─── Seed: 20 Default Achievements ────────────────────────────────

INSERT INTO public.achievements (code, title, description, icon, category, tier, goal_type, goal_value, xp_reward, sort_order) VALUES
-- Workout (5)
('first_workout',      'اولین قدم',           'اولین تمرین خود را ثبت کن',                 '🎯', 'workout',   'bronze',   'total_workouts', 1,    50,  1),
('workouts_10',        'گرم‌شدن',              '۱۰ تمرین کامل کن',                          '💪', 'workout',   'bronze',   'total_workouts', 10,   100, 2),
('workouts_50',        'جدی',                 '۵۰ تمرین کامل کن',                          '🔥', 'workout',   'silver',   'total_workouts', 50,   250, 3),
('workouts_100',       'صدمین',               '۱۰۰ تمرین کامل کن',                         '💯', 'workout',   'gold',     'total_workouts', 100,  500, 4),
('workouts_365',       'یک‌سال کامل',         '۳۶۵ تمرین ثبت کن',                          '🏆', 'workout',   'platinum', 'total_workouts', 365,  2000, 5),
-- Streak (4)
('streak_3',           'شروع استمرار',        '۳ روز پشت سر هم تمرین کن',                   '⚡', 'streak',    'bronze',   'current_streak', 3,    100, 10),
('streak_7',           'یک هفته',             '۷ روز پشت سر هم تمرین کن',                   '📅', 'streak',    'silver',   'current_streak', 7,    200, 11),
('streak_30',          'یک ماه',              '۳۰ روز پشت سر هم تمرین کن',                  '🏔️', 'streak',    'gold',     'current_streak', 30,   500, 12),
('streak_100',         'صد روز',              '۱۰۰ روز پشت سر هم تمرین کن',                 '👑', 'streak',    'platinum', 'best_streak',    100,  2000, 13),
-- Strength (3)
('pr_first',           'رکوردشکن',            'اولین رکورد شخصی خود را ثبت کن',            '🏋️', 'strength',  'bronze',   'pr_count',       1,    100, 20),
('pr_10',              'قوی‌تر',              '۱۰ رکورد شخصی ثبت کن',                       '⚡', 'strength',  'silver',   'pr_count',       10,   300, 21),
('pr_50',              'استاد قدرت',          '۵۰ رکورد شخصی ثبت کن',                       '💪', 'strength',  'platinum', 'pr_count',       50,   1500, 22),
-- Social (3)
('share_first',        'اشتراک‌گذار',         'اولین تمرین خود را به اشتراک بگذار',         '📤', 'social',    'bronze',   'shared_count',   1,    50,  30),
('followers_10',       'محبوب',               '۱۰ دنبال‌کننده جذب کن',                       '👥', 'social',    'silver',   'follower_count', 10,   200, 31),
('share_10',           'الهام‌بخش',           '۱۰ تمرین به اشتراک بگذار',                   '✨', 'social',    'gold',     'shared_count',   10,   400, 32),
-- Booking (2)
('booking_first',      'اولین رزرو',          'اولین جلسه باشگاه خود را رزرو کن',           '🏟️', 'booking',   'bronze',   'booking_count',  1,    50,  40),
('booking_10',         'حضوری',               '۱۰ جلسه باشگاه رزرو کن',                     '🎫', 'booking',   'silver',   'booking_count',  10,   200, 41),
-- Special (3)
('level_5',            'آماتور',              'به سطح ۵ برس',                              '⭐', 'special',   'silver',   'level_reached',  5,    200, 50),
('level_10',           'حرفه‌ای',             'به سطح ۱۰ برس',                             '🌟', 'special',   'gold',     'level_reached',  10,   500, 51),
('level_20',           'استاد',               'به سطح ۲۰ برس',                             '👑', 'special',   'platinum', 'level_reached',  20,   1500, 52)
ON CONFLICT (code) DO NOTHING;

-- ─── RPC: Evaluate User Achievements ──────────────────────────────
-- Checks all active achievements against current user stats. Unlocks new ones.
-- Returns array of newly unlocked achievements for toast display.

CREATE OR REPLACE FUNCTION public.evaluate_user_achievements(p_user_id UUID)
RETURNS TABLE (
    achievement_id UUID,
    code TEXT,
    title TEXT,
    icon TEXT,
    xp_reward INTEGER,
    tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_workouts  INTEGER;
    v_current_streak  INTEGER;
    v_best_streak     INTEGER;
    v_pr_count        INTEGER;
    v_booking_count   INTEGER;
    v_follower_count  INTEGER;
    v_shared_count    INTEGER;
    v_total_xp        INTEGER;
    v_current_level   INTEGER;
    v_row             RECORD;
    v_new_progress    INTEGER;
BEGIN
    -- Gather user stats in single pass
    SELECT COUNT(*) INTO v_total_workouts
    FROM workout_sessions WHERE user_id = p_user_id AND status = 'completed';

    SELECT current_streak, best_streak, total_xp, current_level
    INTO v_current_streak, v_best_streak, v_total_xp, v_current_level
    FROM user_xp_profiles WHERE user_id = p_user_id;

    v_current_streak := COALESCE(v_current_streak, 0);
    v_best_streak := COALESCE(v_best_streak, 0);
    v_total_xp := COALESCE(v_total_xp, 0);
    v_current_level := COALESCE(v_current_level, 1);

    SELECT COUNT(*) INTO v_pr_count
    FROM personal_records WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_booking_count
    FROM bookings WHERE user_id = p_user_id AND status IN ('confirmed','completed');

    SELECT COUNT(*) INTO v_follower_count
    FROM user_follows WHERE followed_id = p_user_id;

    SELECT COUNT(*) INTO v_shared_count
    FROM workout_sessions WHERE user_id = p_user_id AND is_shared = true;

    -- Evaluate each active, not-yet-unlocked achievement
    FOR v_row IN
        SELECT a.id, a.code, a.goal_type, a.goal_value, a.xp_reward
        FROM achievements a
        WHERE a.is_active = true
          AND NOT EXISTS (
              SELECT 1 FROM user_achievements ua
              WHERE ua.achievement_id = a.id AND ua.user_id = p_user_id AND ua.is_unlocked = true
          )
    LOOP
        CASE v_row.goal_type
            WHEN 'total_workouts'  THEN v_new_progress := v_total_workouts;
            WHEN 'current_streak'  THEN v_new_progress := v_current_streak;
            WHEN 'best_streak'     THEN v_new_progress := v_best_streak;
            WHEN 'pr_count'        THEN v_new_progress := v_pr_count;
            WHEN 'booking_count'   THEN v_new_progress := v_booking_count;
            WHEN 'follower_count'  THEN v_new_progress := v_follower_count;
            WHEN 'shared_count'    THEN v_new_progress := v_shared_count;
            WHEN 'total_xp'        THEN v_new_progress := v_total_xp;
            WHEN 'level_reached'   THEN v_new_progress := v_current_level;
            ELSE v_new_progress := 0;
        END CASE;

        -- Upsert progress
        INSERT INTO user_achievements (user_id, achievement_id, progress, is_unlocked, updated_at)
        VALUES (p_user_id, v_row.id, LEAST(v_new_progress, v_row.goal_value),
                v_new_progress >= v_row.goal_value, CASE WHEN v_new_progress >= v_row.goal_value THEN now() ELSE NULL END, now())
        ON CONFLICT (user_id, achievement_id) DO UPDATE
        SET progress = LEAST(v_new_progress, v_row.goal_value),
            is_unlocked = (user_achievements.progress >= v_row.goal_value),
            unlocked_at = CASE WHEN user_achievements.progress >= v_row.goal_value AND user_achievements.unlocked_at IS NULL THEN now() ELSE user_achievements.unlocked_at END,
            updated_at = now()
        WHERE user_achievements.is_unlocked = false;

        -- If newly unlocked, return for toast + award XP
        IF v_new_progress >= v_row.goal_value THEN
            -- Award XP to ledger
            INSERT INTO user_xp_ledger (user_id, xp_amount, reason, source_id, created_at)
            VALUES (p_user_id, v_row.xp_reward, 'achievement_' || v_row.code, v_row.id, now())
            ON CONFLICT DO NOTHING;

            RETURN QUERY
            SELECT v_row.id, v_row.code,
                   a.title, a.icon, a.xp_reward, a.tier
            FROM achievements a WHERE a.id = v_row.id;
        END IF;
    END LOOP;
END;
$$;

-- ─── RPC: Get User Achievements with Progress ─────────────────────

CREATE OR REPLACE FUNCTION public.get_user_achievements(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    code TEXT,
    title TEXT,
    description TEXT,
    icon TEXT,
    category TEXT,
    tier TEXT,
    goal_type TEXT,
    goal_value INTEGER,
    xp_reward INTEGER,
    progress INTEGER DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMPTZ,
    sort_order INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT a.id, a.code, a.title, a.description, a.icon, a.category, a.tier,
           a.goal_type, a.goal_value, a.xp_reward,
           COALESCE(ua.progress, 0) AS progress,
           COALESCE(ua.is_unlocked, false) AS is_unlocked,
           ua.unlocked_at,
           a.sort_order
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.is_active = true
    ORDER BY a.category, a.sort_order;
$$;

-- ─── Feature Flag ─────────────────────────────────────────────────
INSERT INTO public.feature_flags (feature_key, is_enabled, description)
VALUES ('gamification_achievements', true, 'Achievements & Badges system')
ON CONFLICT (feature_key) DO NOTHING;