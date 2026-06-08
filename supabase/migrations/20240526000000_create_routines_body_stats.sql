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

CREATE POLICY "Users can read own routines"
    ON public.routines FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own routines"
    ON public.routines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
    ON public.routines FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines"
    ON public.routines FOR DELETE
    USING (auth.uid() = user_id);

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

CREATE POLICY "Users can read routine days"
    ON public.routine_days FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND (r.user_id = auth.uid() OR r.is_public = true))
    );

CREATE POLICY "Users can create routine days"
    ON public.routine_days FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.user_id = auth.uid())
    );

CREATE POLICY "Users can update routine days"
    ON public.routine_days FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.user_id = auth.uid())
    );

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

CREATE POLICY "Users can read routine exercises"
    ON public.routine_exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.routine_days rd
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE rd.id = routine_day_id AND (r.user_id = auth.uid() OR r.is_public = true)
        )
    );

CREATE POLICY "Users can create routine exercises"
    ON public.routine_exercises FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.routine_days rd
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE rd.id = routine_day_id AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update routine exercises"
    ON public.routine_exercises FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.routine_days rd
            JOIN public.routines r ON r.id = rd.routine_id
            WHERE rd.id = routine_day_id AND r.user_id = auth.uid()
        )
    );

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

CREATE POLICY "Users can read own body measurements"
    ON public.body_measurements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own body measurements"
    ON public.body_measurements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body measurements"
    ON public.body_measurements FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own body measurements"
    ON public.body_measurements FOR DELETE
    USING (auth.uid() = user_id);

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

CREATE POLICY "Users can read own exercise progress"
    ON public.exercise_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exercise progress"
    ON public.exercise_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

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
        ALTER TABLE public.workout_sessions
            ADD CONSTRAINT fk_workout_sessions_routine
            FOREIGN KEY (routine_id) REFERENCES public.routines(id) ON DELETE SET NULL;
    END IF;
END $$;