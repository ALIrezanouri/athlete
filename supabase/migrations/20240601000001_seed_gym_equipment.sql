-- ============================================================
-- Seed gym_equipment: Link existing gyms to equipment_types
-- Based on each gym's sport types and specialization
-- ============================================================
-- NOTE: equipment_types already seeded in 20240524000000
--       (barbell, dumbbell, machine, cable, kettlebell,
--        bodyweight, band, plate, other, none)
-- ============================================================

INSERT INTO public.gym_equipment (gym_id, equipment_type_id) VALUES

-- ============================================================
-- Golden Gym (bodybuilding, fitness, cardio, weightlifting)
-- Full commercial gym — all major equipment
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000001', 'barbell'),
('a1b2c3d4-0001-4000-8000-000000000001', 'dumbbell'),
('a1b2c3d4-0001-4000-8000-000000000001', 'machine'),
('a1b2c3d4-0001-4000-8000-000000000001', 'cable'),
('a1b2c3d4-0001-4000-8000-000000000001', 'plate'),
('a1b2c3d4-0001-4000-8000-000000000001', 'kettlebell'),

-- ============================================================
-- Aria Sport (bodybuilding, swimming, fitness, cardio)
-- Standard gym equipment + cardio machines
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000002', 'barbell'),
('a1b2c3d4-0001-4000-8000-000000000002', 'dumbbell'),
('a1b2c3d4-0001-4000-8000-000000000002', 'machine'),
('a1b2c3d4-0001-4000-8000-000000000002', 'cable'),

-- ============================================================
-- Parseh Sports (bodybuilding, swimming, futsal, fitness, cardio)
-- Full sports complex — broad equipment coverage
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000003', 'barbell'),
('a1b2c3d4-0001-4000-8000-000000000003', 'dumbbell'),
('a1b2c3d4-0001-4000-8000-000000000003', 'machine'),
('a1b2c3d4-0001-4000-8000-000000000003', 'cable'),
('a1b2c3d4-0001-4000-8000-000000000003', 'kettlebell'),

-- ============================================================
-- CrossFit Tehran (crossfit, fitness, weightlifting)
-- Functional fitness focused — barbells, kettlebells, bodyweight
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000004', 'barbell'),
('a1b2c3d4-0001-4000-8000-000000000004', 'dumbbell'),
('a1b2c3d4-0001-4000-8000-000000000004', 'kettlebell'),
('a1b2c3d4-0001-4000-8000-000000000004', 'plate'),
('a1b2c3d4-0001-4000-8000-000000000004', 'bodyweight'),

-- ============================================================
-- Sepahan Boxing (boxing, kickboxing, mma)
-- Combat sports — minimal iron, bodyweight + bands
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000005', 'bodyweight'),
('a1b2c3d4-0001-4000-8000-000000000005', 'band'),
('a1b2c3d4-0001-4000-8000-000000000005', 'dumbbell'),

-- ============================================================
-- Aramesh Yoga (yoga, pilates)
-- Mind-body studio — bodyweight + bands only
-- ============================================================
('a1b2c3d4-0001-4000-8000-000000000006', 'bodyweight'),
('a1b2c3d4-0001-4000-8000-000000000006', 'band')

ON CONFLICT (gym_id, equipment_type_id) DO NOTHING;

-- ============================================================
-- DONE. Seed summary:
--   Golden Gym: 6 equipment types
--   Aria Sport: 4 equipment types
--   Parseh Sports: 5 equipment types
--   CrossFit Tehran: 5 equipment types
--   Sepahan Boxing: 3 equipment types
--   Aramesh Yoga: 2 equipment types
--   Total: 25 gym_equipment rows
-- ============================================================
