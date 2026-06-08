-- ============================================================
-- Gym Equipment Table: Links gyms to equipment_types
-- Used for gym suggestion scoring (match exercises → gyms)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gym_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    equipment_type_id TEXT NOT NULL REFERENCES public.equipment_types(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(gym_id, equipment_type_id)
);

-- Indexes for lookup performance
CREATE INDEX IF NOT EXISTS idx_gym_equipment_gym ON public.gym_equipment(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_equipment_type ON public.gym_equipment(equipment_type_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.gym_equipment ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: GYM_EQUIPMENT (public read, manager + admin write)
-- ============================================================

-- Anyone can read gym equipment (needed for athlete suggestion engine)
CREATE POLICY "Gym equipment is publicly readable"
    ON public.gym_equipment FOR SELECT
    USING (true);

-- Managers can manage equipment for own gyms, admins can manage all
CREATE POLICY "Managers and admins can manage gym equipment"
    ON public.gym_equipment FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE gyms.id = gym_equipment.gym_id
            AND gyms.manager_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
