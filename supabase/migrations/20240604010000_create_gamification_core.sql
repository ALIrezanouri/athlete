-- ============================================================
-- Gamification Phase 1: XP, Levels & Persistent Streaks
-- Tables: xp_transactions, user_levels, streak_records, user_streaks
-- RPCs: award_xp(), process_workout_completion(), get_user_gamification_profile()
-- Feature flag: gamification_xp_levels
-- MUST be applied AFTER all prior migrations
-- ============================================================

-- ============================================================================
-- 0. Feature Flag
-- ============================================================================
INSERT INTO public.feature_flags (feature_key, description, is_enabled)
VALUES (
  'gamification_xp_levels',
  'Gamification: XP earning, level progression, and persistent streaks',
  false
) ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================================
-- 1. xp_transactions — immutable append-only ledger
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_tx_user ON public.xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_tx_ref ON public.xp_transactions(ref_type, ref_id) WHERE ref_type IS NOT NULL;

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own XP transactions"
  ON public.xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all XP transactions"
  ON public.xp_transactions FOR SELECT
  USING (is_admin());

-- ============================================================================
-- 2. user_levels — cached level state (updated atomically by award_xp RPC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_level SMALLINT NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own level"
  ON public.user_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all levels"
  ON public.user_levels FOR SELECT
  USING (is_admin());

-- ============================================================================
-- 3. streak_records — one row per (user, date) with activity flags
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.streak_records (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  workout_done BOOLEAN DEFAULT false,
  gym_visited BOOLEAN DEFAULT false,
  pr_set BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, record_date)
);

ALTER TABLE public.streak_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak records"
  ON public.streak_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all streak records"
  ON public.streak_records FOR SELECT
  USING (is_admin());

-- ============================================================================
-- 4. user_streaks — cached streak state (current/best)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  last_workout_date DATE,
  weekly_active_streak INTEGER NOT NULL DEFAULT 0 CHECK (weekly_active_streak >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all streaks"
  ON public.user_streaks FOR SELECT
  USING (is_admin());

-- ============================================================================
-- 5. RPC: award_xp(p_user_id, p_amount, p_reason, ...)
--    Atomically inserts a transaction + updates level cache.
--    Returns: (new_total_xp, new_level, leveled_up)
--    SECURITY DEFINER so it can write to both tables regardless of RLS.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_total_xp INTEGER, new_level SMALLINT, leveled_up BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_level SMALLINT := 1;
  v_new_level SMALLINT;
  v_total INTEGER;
  v_cumulative NUMERIC;
  v_n INTEGER;
  v_req NUMERIC;
BEGIN
  IF p_amount = 0 THEN
    SELECT total_xp, current_level INTO v_total, v_new_level FROM public.user_levels WHERE user_id = p_user_id;
    IF NOT FOUND THEN v_total := 0; v_new_level := 1; END IF;
    RETURN QUERY SELECT v_total, v_new_level, false;
    RETURN;
  END IF;

  -- Insert the transaction (immutable ledger)
  INSERT INTO public.xp_transactions(user_id, amount, reason, ref_type, ref_id, metadata)
  VALUES (p_user_id, p_amount, p_reason, p_ref_type, p_ref_id, p_metadata);

  -- Ensure user_levels row exists
  INSERT INTO public.user_levels(user_id, total_xp, current_level)
  VALUES (p_user_id, GREATEST(p_amount, 0), 1)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT current_level INTO v_old_level FROM public.user_levels WHERE user_id = p_user_id;

  -- Compute new total
  SELECT total_xp + p_amount INTO v_total FROM public.user_levels WHERE user_id = p_user_id;
  v_total := GREATEST(v_total, 0);

  -- Compute level from cumulative XP: level n requires sum_{i=1..n} (100 * i^1.5)
  -- Find the highest n such that cumulative_req(n) <= total_xp
  v_new_level := 1;
  v_cumulative := 0;
  v_n := 1;
  LOOP
    v_req := 100.0 * power(v_n, 1.5);
    EXIT WHEN v_cumulative + v_req > v_total;
    v_cumulative := v_cumulative + v_req;
    v_new_level := v_n;
    v_n := v_n + 1;
    EXIT WHEN v_n > 500; -- safety bound
  END LOOP;

  -- Update cache
  UPDATE public.user_levels
  SET total_xp = v_total,
      current_level = v_new_level,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_total, v_new_level, (v_new_level > v_old_level);
END;
$$;

-- ============================================================================
-- 6. RPC: update_streak_on_workout(p_user_id, p_workout_date)
--    Updates streak_records + user_streaks cache after a completed workout.
--    Returns: (current_streak, best_streak, streak_extended)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_streak_on_workout(
  p_user_id UUID,
  p_workout_date DATE DEFAULT NULL
)
RETURNS TABLE(current_streak INTEGER, best_streak INTEGER, streak_extended BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := COALESCE(p_workout_date, (now() AT TIME ZONE 'Asia/Tehran')::DATE);
  v_prev_streak INTEGER := 0;
  v_new_streak INTEGER;
  v_best INTEGER;
  v_last_date DATE;
  v_yesterday DATE;
  v_extended BOOLEAN := false;
BEGIN
  -- Mark today's streak record
  INSERT INTO public.streak_records(user_id, record_date, workout_done)
  VALUES (p_user_id, v_date, true)
  ON CONFLICT (user_id, record_date) DO UPDATE SET workout_done = true;

  -- Load current cache
  SELECT current_streak, best_streak, last_workout_date
  INTO v_prev_streak, v_best, v_last_date
  FROM public.user_streaks WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_streaks(user_id, current_streak, best_streak, last_workout_date)
    VALUES (p_user_id, 1, 1, v_date);
    RETURN QUERY SELECT 1, 1, true;
    RETURN;
  END IF;

  -- Already counted today? Return current.
  IF v_last_date = v_date THEN
    RETURN QUERY SELECT v_prev_streak, v_best, false;
    RETURN;
  END IF;

  -- Did they work out yesterday? If so, extend streak.
  v_yesterday := v_date - 1;
  IF v_last_date = v_yesterday THEN
    v_new_streak := v_prev_streak + 1;
    v_extended := true;
  ELSIF v_last_date = v_date - 0 THEN
    -- Same-day edge (shouldn't hit due to above, defensive)
    v_new_streak := v_prev_streak;
  ELSE
    -- Gap → reset streak to 1
    v_new_streak := 1;
    v_extended := true;
  END IF;

  v_best := GREATEST(v_best, v_new_streak);

  UPDATE public.user_streaks
  SET current_streak = v_new_streak,
      best_streak = v_best,
      last_workout_date = v_date,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_new_streak, v_best, v_extended;
END;
$$;

-- ============================================================================
-- 7. RPC: process_workout_completion(p_session_id)
--    Called after a workout is marked 'completed'. Computes XP from volume +
--    duration, awards XP, updates streak. Returns a JSONB summary.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_workout_completion(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_volume NUMERIC;
  v_duration INTEGER;
  v_xp INTEGER;
  v_level_result RECORD;
  v_streak_result RECORD;
BEGIN
  SELECT user_id, total_volume, duration_seconds
  INTO v_user_id, v_volume, v_duration
  FROM public.workout_sessions
  WHERE id = p_session_id AND status = 'completed';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_found');
  END IF;

  -- XP formula: 50 base + 1 per 1000kg volume + 1 per 10 min duration
  v_xp := 50
    + (COALESCE(v_volume, 0) / 1000)::INTEGER
    + (COALESCE(v_duration, 0) / 600)::INTEGER;

  -- Update streak
  SELECT * INTO v_streak_result FROM public.update_streak_on_workout(v_user_id);

  -- Streak milestone bonus
  IF v_streak_result.current_streak IN (7, 14, 30, 60, 100) AND v_streak_result.streak_extended THEN
    v_xp := v_xp + CASE v_streak_result.current_streak
      WHEN 7 THEN 200 WHEN 14 THEN 400 WHEN 30 THEN 800 WHEN 60 THEN 1200 WHEN 100 THEN 2000 END;
  END IF;

  -- Award XP
  SELECT * INTO v_level_result FROM public.award_xp(
    v_user_id, v_xp, 'workout_complete',
    'workout_session', p_session_id,
    jsonb_build_object('volume', v_volume, 'duration', v_duration)
  );

  RETURN jsonb_build_object(
    'success', true,
    'xp_gained', v_xp,
    'new_total_xp', v_level_result.new_total_xp,
    'new_level', v_level_result.new_level,
    'leveled_up', v_level_result.leveled_up,
    'current_streak', v_streak_result.current_streak,
    'best_streak', v_streak_result.best_streak,
    'streak_extended', v_streak_result.streak_extended
  );
END;
$$;

-- ============================================================================
-- 8. RPC: get_user_gamification_profile(p_user_id)
--    Returns a denormalized profile for the client (level, xp, streak, next-level info)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_gamification_profile(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER := 0;
  v_level SMALLINT := 1;
  v_streak INTEGER := 0;
  v_best INTEGER := 0;
  v_level_floor NUMERIC;
  v_next_floor NUMERIC;
  v_into_level NUMERIC;
  v_level_span NUMERIC;
BEGIN
  SELECT total_xp, current_level INTO v_total, v_level
  FROM public.user_levels WHERE user_id = p_user_id;
  IF NOT FOUND THEN v_total := 0; v_level := 1; END IF;

  SELECT current_streak, best_streak INTO v_streak, v_best
  FROM public.user_streaks WHERE user_id = p_user_id;
  IF NOT FOUND THEN v_streak := 0; v_best := 0; END IF;

  -- Compute XP boundaries for current and next level
  -- cumulative_req(n) = sum_{i=1..n} 100 * i^1.5
  SELECT COALESCE(SUM(100.0 * power(g, 1.5)), 0) INTO v_level_floor
  FROM generate_series(1, v_level - 1) AS g;

  SELECT COALESCE(SUM(100.0 * power(g, 1.5)), 0) INTO v_next_floor
  FROM generate_series(1, v_level) AS g;

  v_into_level := v_total - v_level_floor;
  v_level_span := v_next_floor - v_level_floor;

  RETURN jsonb_build_object(
    'total_xp', v_total,
    'current_level', v_level,
    'level_start_xp', v_level_floor::int,
    'next_level_xp', v_next_floor::int,
    'xp_into_level', GREATEST(v_into_level, 0)::int,
    'xp_for_next_level', GREATEST(v_level_span, 1)::int,
    'level_progress', CASE WHEN v_level_span > 0 THEN (v_into_level / v_level_span) ELSE 1 END,
    'current_streak', v_streak,
    'best_streak', v_best
  );
END;
$$;

-- ============================================================================
-- 9. Audit log: add gamification action types
-- ============================================================================
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_type_check
  CHECK (action_type IN (
    -- prior types (preserved from 20240602000000 migration)
    'user_created','user_updated','user_deleted','user_role_changed',
    'gym_created','gym_updated','gym_deleted',
    'booking_created','booking_updated','booking_cancelled',
    'wallet_transaction','config_updated',
    'wallet_funds_added','wallet_funds_deducted',
    'trainer_created','trainer_updated','trainer_deleted',
    'time_slot_created','time_slot_updated','time_slot_deleted',
    'exercise_created','exercise_updated','exercise_deleted',
    'exercise_translation_created','exercise_translation_updated','exercise_translation_deleted',
    'routine_updated','routine_deleted',
    'workout_comment_deleted',
    'gym_photo_added','gym_photo_deleted',
    'gym_amenity_added','gym_amenity_deleted',
    'gym_sport_type_added','gym_sport_type_deleted',
    'gym_review_deleted','gym_favorite_deleted',
    'translation_created','translation_updated','translation_deleted',
    'country_updated','feature_flag_updated',
    -- P4 gamification types
    'xp_granted','xp_adjusted','achievement_created','achievement_updated',
    'achievement_deleted','challenge_created','challenge_updated','challenge_deleted',
    'daily_quest_created','daily_quest_updated','daily_quest_deleted',
    'user_reward_granted','leaderboard_opt_in_changed'
  ));

-- ============================================================================
-- 10. Seed default XP rules into admin_config
-- ============================================================================
INSERT INTO public.admin_config (key, value, description)
VALUES (
  'gamification_xp_rules',
  '{"workout_base":50,"workout_per_1000kg_volume":1,"workout_per_10min_duration":1,"pr_set":100,"gym_booking_attended":30,"routine_completed":20,"community_post":10,"community_daily_cap":3,"daily_quest":25,"challenge_min":100,"challenge_max":500,"streak_milestone_7":200,"streak_milestone_14":400,"streak_milestone_30":800,"streak_milestone_60":1200,"streak_milestone_100":2000,"level_curve_coefficient":100,"level_curve_exponent":1.5}',
  'Configurable XP reward amounts and level curve parameters for the gamification system'
) ON CONFLICT (key) DO NOTHING;
