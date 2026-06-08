-- ============================================================
-- Phase 9: Seed Data for rokhdad FIT Athlete PWA
-- Creates: 6 gyms in Tehran with photos, amenities, sport types,
--          trainers, and time slots for the next 7 days
-- ============================================================
-- NOTE: Run this via Supabase Dashboard SQL Editor (superuser)
--       RLS policies won't block inserts from SQL Editor.
--       manager_id is NULL for all gyms (no manager accounts yet).
-- ============================================================

-- ============================================================
-- 1. GYMS — 6 mock gyms in Tehran
-- ============================================================
INSERT INTO public.gyms (id, name, description, address, city, area, latitude, longitude, price_per_session, phone, instagram, website, avg_rating, review_count, open_time, close_time, country_id, is_active) VALUES
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    'آکادمی بدنسازی طلایی',
    'یکی از مجهزترین باشگاه‌های تهران با دستگاه‌های حرفه‌ای و مربیان باتجربه. فضایی مدرن با نورپردازی حرفه‌ای برای تمرین بهینه.',
    'خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۱۲۵',
    'تهران', 'ونک',
    35.75750000, 51.41000000,
    350000.00,
    '021-88123456',
    '@golden_gym_tehran',
    'https://goldengym.ir',
    4.80, 24,
    '06:00:00', '23:00:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000002',
    'باشگاه ورزشی آریا',
    'باشگاه آریا با سالن‌های مجزا برای بدنسازی، استخر و کلاس‌های گروهی. محیطی دوستانه برای تمام سطوح ورزشی.',
    'خیابان شریعتی، بالاتر از پل سیدخندان، کوچه بهروز',
    'تهران', 'سیدخندان',
    35.74400000, 51.44500000,
    250000.00,
    '021-77554433',
    '@aria_sport_club',
    NULL,
    4.50, 18,
    '07:00:00', '22:00:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000003',
    'مجموعه ورزشی پارسه',
    'مجموعه‌ای کامل با سالن فوتسال، استخر سرپوشیده، سونا و بدنسازی. مناسب برای خانواده‌ها.',
    'بلوار کشاورز، نبش خیابان وصال',
    'تهران', 'عباس‌آباد',
    35.71500000, 51.43000000,
    400000.00,
    '021-66998877',
    '@parseh_sports',
    'https://parseh-sport.com',
    4.60, 32,
    '06:30:00', '23:30:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000004',
    'باشگاه کراس‌فیت تهران',
    'اولین و بزرگترین مرکز کراس‌فیت در ایران با مربیان بین‌المللی. تمرینات گروهی و شخصی.',
    'خیابان ایرانشهر، بالاتر از تقاطع ولیعصر',
    'تهران', 'میرداماد',
    35.76200000, 51.41800000,
    500000.00,
    '021-22223344',
    '@crossfit_tehran',
    'https://crossfittehran.com',
    4.90, 45,
    '05:30:00', '22:30:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000005',
    'باشگاه بوکس و هنرهای رزمی سپاهان',
    'باشگاهی تخصصی برای بوکس، کیک‌بوکسینگ و MMA. مربیان ملی با سابقه قهرمانی.',
    'خیابان انقلاب، نرسیده به چهارراه ولیعصر',
    'تهران', 'انقلاب',
    35.70000000, 51.40000000,
    300000.00,
    '021-33445566',
    '@sepahan_boxing',
    NULL,
    4.30, 15,
    '08:00:00', '22:00:00',
    'IR', true
),
(
    'a1b2c3d4-0001-4000-8000-000000000006',
    'استودیو یوگا و پیلاتس آرامش',
    'فضایی آرام و دلنشین برای یوگا، پیلاتس و مدیتیشن. مناسب برای تمام سطوح از مبتدی تا پیشرفته.',
    'خیابان فرشته، بالاتر از دروس، پلاک ۸۰',
    'تهران', 'دروس',
    35.77000000, 51.42000000,
    280000.00,
    '021-99887766',
    '@aramesh_yoga',
    'https://aramesh-yoga.ir',
    4.70, 28,
    '07:00:00', '21:00:00',
    'IR', true
);

-- ============================================================
-- 2. GYM_PHOTOS — 3-4 photos per gym (placeholder URLs)
-- ============================================================
INSERT INTO public.gym_photos (gym_id, url, sort_order, is_primary) VALUES
-- Golden Gym (4 photos)
('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&h=500&fit=crop', 2, false),
('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=500&fit=crop', 3, false),

-- Aria Sport (3 photos)
('a1b2c3d4-0001-4000-8000-000000000002', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000002', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000002', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop', 2, false),

-- Parseh Sports (4 photos)
('a1b2c3d4-0001-4000-8000-000000000003', 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000003', 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000003', 'https://images.unsplash.com/photo-1571244656531-4e0ce9b7e9eb?w=800&h=500&fit=crop', 2, false),
('a1b2c3d4-0001-4000-8000-000000000003', 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=800&h=500&fit=crop', 3, false),

-- CrossFit Tehran (3 photos)
('a1b2c3d4-0001-4000-8000-000000000004', 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000004', 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000004', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=500&fit=crop', 2, false),

-- Sepahan Boxing (3 photos)
('a1b2c3d4-0001-4000-8000-000000000005', 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000005', 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000005', 'https://images.unsplash.com/photo-1569567082830-4e4657a29736?w=800&h=500&fit=crop', 2, false),

-- Aramesh Yoga (3 photos)
('a1b2c3d4-0001-4000-8000-000000000006', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop', 0, true),
('a1b2c3d4-0001-4000-8000-000000000006', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop', 1, false),
('a1b2c3d4-0001-4000-8000-000000000006', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&h=500&fit=crop', 2, false);

-- ============================================================
-- 3. GYM_AMENITIES — amenity keys per gym
-- ============================================================
-- Amenity keys: parking, shower, locker, wifi, sauna, pool, ac, cafe, personal_trainer, group_classes

INSERT INTO public.gym_amenities (gym_id, amenity_key) VALUES
-- Golden Gym
('a1b2c3d4-0001-4000-8000-000000000001', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000001', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000001', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000001', 'wifi'),
('a1b2c3d4-0001-4000-8000-000000000001', 'sauna'),
('a1b2c3d4-0001-4000-8000-000000000001', 'ac'),
('a1b2c3d4-0001-4000-8000-000000000001', 'personal_trainer'),
('a1b2c3d4-0001-4000-8000-000000000001', 'cafe'),

-- Aria Sport
('a1b2c3d4-0001-4000-8000-000000000002', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000002', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000002', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000002', 'pool'),
('a1b2c3d4-0001-4000-8000-000000000002', 'group_classes'),
('a1b2c3d4-0001-4000-8000-000000000002', 'ac'),

-- Parseh Sports
('a1b2c3d4-0001-4000-8000-000000000003', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000003', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000003', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000003', 'wifi'),
('a1b2c3d4-0001-4000-8000-000000000003', 'sauna'),
('a1b2c3d4-0001-4000-8000-000000000003', 'pool'),
('a1b2c3d4-0001-4000-8000-000000000003', 'ac'),
('a1b2c3d4-0001-4000-8000-000000000003', 'cafe'),
('a1b2c3d4-0001-4000-8000-000000000003', 'personal_trainer'),
('a1b2c3d4-0001-4000-8000-000000000003', 'group_classes'),

-- CrossFit Tehran
('a1b2c3d4-0001-4000-8000-000000000004', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000004', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000004', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000004', 'group_classes'),
('a1b2c3d4-0001-4000-8000-000000000004', 'personal_trainer'),

-- Sepahan Boxing
('a1b2c3d4-0001-4000-8000-000000000005', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000005', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000005', 'personal_trainer'),
('a1b2c3d4-0001-4000-8000-000000000005', 'group_classes'),

-- Aramesh Yoga
('a1b2c3d4-0001-4000-8000-000000000006', 'parking'),
('a1b2c3d4-0001-4000-8000-000000000006', 'shower'),
('a1b2c3d4-0001-4000-8000-000000000006', 'locker'),
('a1b2c3d4-0001-4000-8000-000000000006', 'wifi'),
('a1b2c3d4-0001-4000-8000-000000000006', 'ac'),
('a1b2c3d4-0001-4000-8000-000000000006', 'group_classes');

-- ============================================================
-- 4. GYM_SPORT_TYPES — sport keys per gym
-- ============================================================
-- Sport keys: bodybuilding, swimming, boxing, kickboxing, mma, yoga, pilates, crossfit, fitness, cardio, futsal, weightlifting

INSERT INTO public.gym_sport_types (gym_id, sport_key) VALUES
-- Golden Gym
('a1b2c3d4-0001-4000-8000-000000000001', 'bodybuilding'),
('a1b2c3d4-0001-4000-8000-000000000001', 'fitness'),
('a1b2c3d4-0001-4000-8000-000000000001', 'cardio'),
('a1b2c3d4-0001-4000-8000-000000000001', 'weightlifting'),

-- Aria Sport
('a1b2c3d4-0001-4000-8000-000000000002', 'bodybuilding'),
('a1b2c3d4-0001-4000-8000-000000000002', 'swimming'),
('a1b2c3d4-0001-4000-8000-000000000002', 'fitness'),
('a1b2c3d4-0001-4000-8000-000000000002', 'cardio'),

-- Parseh Sports
('a1b2c3d4-0001-4000-8000-000000000003', 'bodybuilding'),
('a1b2c3d4-0001-4000-8000-000000000003', 'swimming'),
('a1b2c3d4-0001-4000-8000-000000000003', 'futsal'),
('a1b2c3d4-0001-4000-8000-000000000003', 'fitness'),
('a1b2c3d4-0001-4000-8000-000000000003', 'cardio'),

-- CrossFit Tehran
('a1b2c3d4-0001-4000-8000-000000000004', 'crossfit'),
('a1b2c3d4-0001-4000-8000-000000000004', 'fitness'),
('a1b2c3d4-0001-4000-8000-000000000004', 'weightlifting'),

-- Sepahan Boxing
('a1b2c3d4-0001-4000-8000-000000000005', 'boxing'),
('a1b2c3d4-0001-4000-8000-000000000005', 'kickboxing'),
('a1b2c3d4-0001-4000-8000-000000000005', 'mma'),

-- Aramesh Yoga
('a1b2c3d4-0001-4000-8000-000000000006', 'yoga'),
('a1b2c3d4-0001-4000-8000-000000000006', 'pilates');

-- ============================================================
-- 5. GYM_TRAINERS — 2-3 trainers per gym
-- ============================================================
INSERT INTO public.gym_trainers (gym_id, name, specialty, photo_url) VALUES
-- Golden Gym
('a1b2c3d4-0001-4000-8000-000000000001', 'علی محمدی', 'بدنسازی حرفه‌ای', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000001', 'سارا احمدی', 'فیتنس و کاردیو', 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000001', 'رضا کریمی', 'وزنه‌برداری', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200&h=200&fit=crop'),

-- Aria Sport
('a1b2c3d4-0001-4000-8000-000000000002', 'مریم حسینی', 'شنا و آبروبیکس', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000002', 'امیر نوری', 'بدنسازی', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'),

-- Parseh Sports
('a1b2c3d4-0001-4000-8000-000000000003', 'حسن رضایی', 'فوتسال و آمادگی جسمانی', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000003', 'نازنین کاظمی', 'یوگا و پیلاتس', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000003', 'محمد جعفری', 'بدنسازی حرفه‌ای', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop'),

-- CrossFit Tehran
('a1b2c3d4-0001-4000-8000-000000000004', 'داریوش صالحی', 'کراس‌فیت سطح ۳', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000004', 'شیما رحمانی', 'کراس‌فیت و وزنه‌برداری', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'),

-- Sepahan Boxing
('a1b2c3d4-0001-4000-8000-000000000005', 'کامران فرهادی', 'بوکس حرفه‌ای - قهرمان آسیا', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000005', 'زهرا تقوی', 'کیک‌بوکسینگ و MMA', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop'),

-- Aramesh Yoga
('a1b2c3d4-0001-4000-8000-000000000006', 'آناهیتا شریفی', 'یوگا - مدرک RYT-500', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop'),
('a1b2c3d4-0001-4000-8000-000000000006', 'لیلا صادقی', 'پیلاتس و مدیتیشن', 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=200&h=200&fit=crop');

-- ============================================================
-- 6. GYM_TIME_SLOTS — next 7 days, 3-4 slots per gym per day
-- ============================================================
-- Using CURRENT_DATE for dynamic date generation

-- Golden Gym time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000001'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('08:00:00'::time, '10:00:00'::time, 20, 5, true),
        ('14:00:00'::time, '16:00:00'::time, 15, 12, true),
        ('18:00:00'::time, '20:00:00'::time, 25, 20, true),
        ('20:00:00'::time, '22:00:00'::time, 20, 8, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available);

-- Aria Sport time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000002'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('09:00:00'::time, '11:00:00'::time, 18, 10, true),
        ('15:00:00'::time, '17:00:00'::time, 18, 6, true),
        ('19:00:00'::time, '21:00:00'::time, 22, 18, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available);

-- Parseh Sports time slots (4 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000003'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('07:00:00'::time, '09:00:00'::time, 30, 15, true),
        ('10:00:00'::time, '12:00:00'::time, 25, 20, true),
        ('16:00:00'::time, '18:00:00'::time, 30, 22, true),
        ('20:00:00'::time, '22:00:00'::time, 25, 10, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available);

-- CrossFit Tehran time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000004'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('06:00:00'::time, '07:30:00'::time, 12, 10, true),
        ('10:00:00'::time, '11:30:00'::time, 12, 8, true),
        ('17:00:00'::time, '18:30:00'::time, 15, 14, true),
        ('19:00:00'::time, '20:30:00'::time, 12, 5, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available);

-- Sepahan Boxing time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000005'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('09:00:00'::time, '11:00:00'::time, 15, 8, true),
        ('15:00:00'::time, '17:00:00'::time, 15, 12, true),
        ('18:00:00'::time, '20:00:00'::time, 20, 16, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available);

-- Aramesh Yoga time slots (3 slots per day for 7 days)
INSERT INTO public.gym_time_slots (gym_id, date, start_time, end_time, capacity, booked_count, is_available)
SELECT
    'a1b2c3d4-0001-4000-8000-000000000006'::uuid,
    d.dt::date,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.booked_count,
    ts.is_available
FROM (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day') AS dt
) d
CROSS JOIN (
    VALUES
        ('08:00:00'::time, '09:30:00'::time, 10, 6, true),
        ('12:00:00'::time, '13:30:00'::time, 10, 4, true),
        ('17:00:00'::time, '18:30:00'::time, 12, 10, true),
        ('19:00:00'::time, '20:30:00'::time, 10, 3, true)
) AS ts(start_time, end_time, capacity, booked_count, is_available);

-- ============================================================
-- DONE. Seed data summary:
--   6 gyms (Tehran, IR)
--   20 gym photos (Unsplash placeholder URLs)
--   40 gym amenities (10 unique amenity keys)
--   21 gym sport types (12 unique sport keys)
--   15 trainers
--   ~147 time slots (next 7 days, 3-4 per gym per day)
-- ============================================================
