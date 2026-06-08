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

CREATE POLICY "Exercises are publicly readable"
    ON public.exercises FOR SELECT
    USING (true);

-- Trigger: auto-update updated_at
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

CREATE POLICY "Exercise translations are publicly readable"
    ON public.exercise_translations FOR SELECT
    USING (true);

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

CREATE POLICY "Users can read own custom exercises"
    ON public.user_custom_exercises FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own custom exercises"
    ON public.user_custom_exercises FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom exercises"
    ON public.user_custom_exercises FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom exercises"
    ON public.user_custom_exercises FOR DELETE
    USING (auth.uid() = user_id);

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

CREATE POLICY "Users can read own workout sessions"
    ON public.workout_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workout sessions"
    ON public.workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sessions"
    ON public.workout_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sessions"
    ON public.workout_sessions FOR DELETE
    USING (auth.uid() = user_id);

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

CREATE POLICY "Users can read own workout exercises"
    ON public.workout_exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own workout exercises"
    ON public.workout_exercises FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own workout exercises"
    ON public.workout_exercises FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own workout exercises"
    ON public.workout_exercises FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
        )
    );

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

CREATE POLICY "Users can read own workout sets"
    ON public.workout_sets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_exercises we
            JOIN public.workout_sessions ws ON ws.id = we.workout_session_id
            WHERE we.id = workout_exercise_id AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own workout sets"
    ON public.workout_sets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_exercises we
            JOIN public.workout_sessions ws ON ws.id = we.workout_session_id
            WHERE we.id = workout_exercise_id AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own workout sets"
    ON public.workout_sets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_exercises we
            JOIN public.workout_sessions ws ON ws.id = we.workout_session_id
            WHERE we.id = workout_exercise_id AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own workout sets"
    ON public.workout_sets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_exercises we
            JOIN public.workout_sessions ws ON ws.id = we.workout_session_id
            WHERE we.id = workout_exercise_id AND ws.user_id = auth.uid()
        )
    );

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
CREATE TRIGGER trg_workout_sets_volume
    AFTER INSERT OR UPDATE OR DELETE ON public.workout_sets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workout_volume();