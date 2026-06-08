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

CREATE POLICY "Admins can insert exercises"
    ON public.exercises FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update exercises"
    ON public.exercises FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete exercises"
    ON public.exercises FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 3. exercise_translations — admin INSERT/UPDATE/DELETE
-- ============================================================================
-- Currently: "Exercise translations are publicly readable" (SELECT for all)
-- Missing: admin write access

CREATE POLICY "Admins can insert exercise translations"
    ON public.exercise_translations FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update exercise translations"
    ON public.exercise_translations FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete exercise translations"
    ON public.exercise_translations FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 4. muscle_groups — admin INSERT/UPDATE/DELETE
-- ============================================================================
-- Currently: "Muscle groups are publicly readable" (SELECT for all)

CREATE POLICY "Admins can insert muscle groups"
    ON public.muscle_groups FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update muscle groups"
    ON public.muscle_groups FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete muscle groups"
    ON public.muscle_groups FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 5. equipment_types — admin INSERT/UPDATE/DELETE
-- ============================================================================
-- Currently: "Equipment types are publicly readable" (SELECT for all)

CREATE POLICY "Admins can insert equipment types"
    ON public.equipment_types FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update equipment types"
    ON public.equipment_types FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete equipment types"
    ON public.equipment_types FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 6. workout_sessions — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped SELECT/INSERT/UPDATE/DELETE (auth.uid() = user_id)
-- Missing: admin read-all + update/delete

CREATE POLICY "Admins can view all workout sessions"
    ON public.workout_sessions FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any workout session"
    ON public.workout_sessions FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete any workout session"
    ON public.workout_sessions FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 7. workout_exercises — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via session ownership
-- Missing: admin read-all + update/delete

CREATE POLICY "Admins can view all workout exercises"
    ON public.workout_exercises FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any workout exercise"
    ON public.workout_exercises FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete any workout exercise"
    ON public.workout_exercises FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 8. workout_sets — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via session ownership
-- Missing: admin read-all + update/delete

CREATE POLICY "Admins can view all workout sets"
    ON public.workout_sets FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any workout set"
    ON public.workout_sets FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete any workout set"
    ON public.workout_sets FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 9. body_measurements — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped (auth.uid() = user_id)
-- Missing: admin read-all + update/delete

CREATE POLICY "Admins can view all body measurements"
    ON public.body_measurements FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any body measurement"
    ON public.body_measurements FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete any body measurement"
    ON public.body_measurements FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 10. routines — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped SELECT (auth.uid() = user_id OR is_public) + user INSERT/UPDATE/DELETE
-- Missing: admin read-all + update/delete

CREATE POLICY "Admins can view all routines"
    ON public.routines FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any routine"
    ON public.routines FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete any routine"
    ON public.routines FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 11. routine_days — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via routine ownership
-- Missing: admin read-all + update/delete

CREATE POLICY "Admins can view all routine days"
    ON public.routine_days FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any routine day"
    ON public.routine_days FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete any routine day"
    ON public.routine_days FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 12. routine_exercises — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via routine ownership
-- Missing: admin read-all + update/delete

CREATE POLICY "Admins can view all routine exercises"
    ON public.routine_exercises FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any routine exercise"
    ON public.routine_exercises FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete any routine exercise"
    ON public.routine_exercises FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 13. routine_sets — admin SELECT/UPDATE/DELETE
-- ============================================================================
-- Currently: user-scoped via routine ownership
-- Missing: admin read-all + update/delete

CREATE POLICY "Admins can view all routine sets"
    ON public.routine_sets FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any routine set"
    ON public.routine_sets FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete any routine set"
    ON public.routine_sets FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 14. user_follows — admin SELECT all + DELETE
-- ============================================================================
-- Currently: public SELECT + user INSERT/DELETE (follower_id = auth.uid())
-- Admin needs: read all rows (for social page) + delete any

CREATE POLICY "Admins can view all follows"
    ON public.user_follows FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can delete any follow"
    ON public.user_follows FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 15. workout_likes — admin SELECT all + DELETE
-- ============================================================================
-- Currently: public SELECT + user INSERT/DELETE
-- Admin needs: read all rows + delete any

CREATE POLICY "Admins can view all workout likes"
    ON public.workout_likes FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can delete any workout like"
    ON public.workout_likes FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 16. workout_comments — admin SELECT all + DELETE
-- ============================================================================
-- Currently: public SELECT + user INSERT/UPDATE/DELETE
-- Admin needs: read all rows + delete any (for moderation)

CREATE POLICY "Admins can view all workout comments"
    ON public.workout_comments FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can delete any workout comment"
    ON public.workout_comments FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 17. favorite_gyms — admin SELECT all + DELETE
-- ============================================================================
-- Currently: user-scoped SELECT/INSERT/DELETE (athlete_id = auth.uid())
-- Admin needs: read all rows + delete any

CREATE POLICY "Admins can view all favorite gyms"
    ON public.favorite_gyms FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can delete any favorite gym"
    ON public.favorite_gyms FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 18. gym_reviews — admin SELECT all + DELETE
-- ============================================================================
-- Currently: public SELECT + athlete INSERT/UPDATE
-- Admin needs: read all rows + delete any (for moderation)

CREATE POLICY "Admins can view all gym reviews"
    ON public.gym_reviews FOR SELECT
    USING (is_admin());

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

CREATE POLICY "Admins can insert translations"
    ON public.translations FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update translations"
    ON public.translations FOR UPDATE
    USING (is_admin());

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

CREATE POLICY "Admins can insert feature flags"
    ON public.feature_flags FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update feature flags"
    ON public.feature_flags FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete feature flags"
    ON public.feature_flags FOR DELETE
    USING (is_admin());

-- ============================================================================
-- 21. countries — admin UPDATE
-- ============================================================================
-- Currently: public SELECT only
-- Admin needs: UPDATE (for countries page edit functionality)

CREATE POLICY "Admins can update countries"
    ON public.countries FOR UPDATE
    USING (is_admin());

-- ============================================================================
-- 22. athlete_profiles — admin SELECT/UPDATE
-- ============================================================================
-- Currently: athlete-scoped SELECT/UPDATE/INSERT (auth.uid() = id)
-- Admin needs: read all + update (for user detail view)

CREATE POLICY "Admins can view all athlete profiles"
    ON public.athlete_profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any athlete profile"
    ON public.athlete_profiles FOR UPDATE
    USING (is_admin());

-- ============================================================================
-- 23. exercise_progress — admin SELECT
-- ============================================================================
-- Currently: user-scoped SELECT/INSERT/UPDATE (auth.uid() = user_id)
-- Admin needs: read all (for analytics)

CREATE POLICY "Admins can view all exercise progress"
    ON public.exercise_progress FOR SELECT
    USING (is_admin());

-- ============================================================================
-- 24. user_custom_exercises — admin SELECT
-- ============================================================================
-- Currently: user-scoped CRUD (auth.uid() = user_id)
-- Admin needs: read all (for exercises page visibility)

CREATE POLICY "Admins can view all custom exercises"
    ON public.user_custom_exercises FOR SELECT
    USING (is_admin());