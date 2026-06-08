-- ============================================================
-- Seed Exercises with Persian (fa) translations
-- 50+ core exercises covering all muscle groups
-- ============================================================

-- ============================================================
-- SEED EXERCISES
-- ============================================================
INSERT INTO public.exercises (id, name_en, slug, description, muscle_group_id, secondary_muscle_groups, equipment_type_id, exercise_type, movement_pattern, is_compound, difficulty, sort_order) VALUES
-- CHEST
('a0000001-0001-0001-0001-000000000001', 'Bench Press', 'bench-press', 'Compound pushing exercise for chest', 'chest', '{shoulders,triceps}', 'barbell', 'strength', 'horizontal_push', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000002', 'Incline Bench Press', 'incline-bench-press', 'Upper chest focused pressing', 'chest', '{shoulders,triceps}', 'barbell', 'strength', 'horizontal_push', true, 'intermediate', 2),
('a0000001-0001-0001-0001-000000000003', 'Dumbbell Fly', 'dumbbell-fly', 'Isolation exercise for chest stretch', 'chest', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000004', 'Push Up', 'push-up', 'Bodyweight chest exercise', 'chest', '{shoulders,triceps}', 'bodyweight', 'calisthenics', 'horizontal_push', true, 'beginner', 4),
('a0000001-0001-0001-0001-000000000005', 'Cable Crossover', 'cable-crossover', 'Isolation chest fly with cables', 'chest', '{}', 'cable', 'strength', 'isolation', false, 'intermediate', 5),
('a0000001-0001-0001-0001-000000000006', 'Dumbbell Bench Press', 'dumbbell-bench-press', 'Chest pressing with dumbbells', 'chest', '{shoulders,triceps}', 'dumbbell', 'strength', 'horizontal_push', true, 'beginner', 6),

-- BACK
('a0000001-0001-0001-0001-000000000010', 'Deadlift', 'deadlift', 'King of compound lifts', 'back', '{glutes,hamstrings,traps}', 'barbell', 'strength', 'hinge', true, 'advanced', 1),
('a0000001-0001-0001-0001-000000000011', 'Barbell Row', 'barbell-row', 'Compound pulling for back thickness', 'back', '{biceps}', 'barbell', 'strength', 'horizontal_pull', true, 'intermediate', 2),
('a0000001-0001-0001-0001-000000000012', 'Pull Up', 'pull-up', 'Bodyweight back width builder', 'back', '{biceps}', 'bodyweight', 'calisthenics', 'vertical_pull', true, 'intermediate', 3),
('a0000001-0001-0001-0001-000000000013', 'Lat Pulldown', 'lat-pulldown', 'Machine-based lat width exercise', 'back', '{biceps}', 'cable', 'strength', 'vertical_pull', true, 'beginner', 4),
('a0000001-0001-0001-0001-000000000014', 'Seated Cable Row', 'seated-cable-row', 'Mid-back thickness exercise', 'back', '{biceps}', 'cable', 'strength', 'horizontal_pull', true, 'beginner', 5),
('a0000001-0001-0001-0001-000000000015', 'Dumbbell Row', 'dumbbell-row', 'Single arm back exercise', 'back', '{biceps}', 'dumbbell', 'strength', 'horizontal_pull', true, 'beginner', 6),

-- SHOULDERS
('a0000001-0001-0001-0001-000000000020', 'Overhead Press', 'overhead-press', 'Compound shoulder press with barbell', 'shoulders', '{triceps}', 'barbell', 'strength', 'vertical_push', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000021', 'Lateral Raise', 'lateral-raise', 'Side delt isolation', 'shoulders', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000022', 'Front Raise', 'front-raise', 'Front delt isolation', 'shoulders', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000023', 'Face Pull', 'face-pull', 'Rear delt and upper back exercise', 'shoulders', '{traps}', 'cable', 'strength', 'horizontal_pull', false, 'beginner', 4),
('a0000001-0001-0001-0001-000000000024', 'Arnold Press', 'arnold-press', 'Rotational shoulder press', 'shoulders', '{triceps}', 'dumbbell', 'strength', 'vertical_push', true, 'intermediate', 5),

-- BICEPS
('a0000001-0001-0001-0001-000000000030', 'Barbell Curl', 'barbell-curl', 'Classic bicep mass builder', 'biceps', '{}', 'barbell', 'strength', 'isolation', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000031', 'Dumbbell Curl', 'dumbbell-curl', 'Standard bicep curl with dumbbells', 'biceps', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000032', 'Hammer Curl', 'hammer-curl', 'Brachialis and forearm focused curl', 'biceps', '{forearms}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000033', 'Preacher Curl', 'preacher-curl', 'Strict form bicep isolation', 'biceps', '{}', 'barbell', 'strength', 'isolation', false, 'intermediate', 4),
('a0000001-0001-0001-0001-000000000034', 'Concentration Curl', 'concentration-curl', 'Peak contraction bicep exercise', 'biceps', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 5),

-- TRICEPS
('a0000001-0001-0001-0001-000000000040', 'Tricep Pushdown', 'tricep-pushdown', 'Cable tricep isolation', 'triceps', '{}', 'cable', 'strength', 'isolation', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000041', 'Skull Crusher', 'skull-crusher', 'Lying tricep extension', 'triceps', '{}', 'barbell', 'strength', 'isolation', false, 'intermediate', 2),
('a0000001-0001-0001-0001-000000000042', 'Overhead Tricep Extension', 'overhead-tricep-extension', 'Long head tricep focus', 'triceps', '{}', 'dumbbell', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000043', 'Dip', 'dip', 'Bodyweight tricep and chest compound', 'triceps', '{chest,shoulders}', 'bodyweight', 'calisthenics', 'vertical_push', true, 'intermediate', 4),
('a0000001-0001-0001-0001-000000000044', 'Close Grip Bench Press', 'close-grip-bench-press', 'Tricep focused bench press', 'triceps', '{chest,shoulders}', 'barbell', 'strength', 'horizontal_push', true, 'intermediate', 5),

-- QUADS
('a0000001-0001-0001-0001-000000000050', 'Barbell Squat', 'barbell-squat', 'King of leg exercises', 'quads', '{glutes,hamstrings,core}', 'barbell', 'strength', 'squat', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000051', 'Leg Press', 'leg-press', 'Machine-based leg pressing', 'quads', '{glutes}', 'machine', 'strength', 'squat', true, 'beginner', 2),
('a0000001-0001-0001-0001-000000000052', 'Leg Extension', 'leg-extension', 'Quad isolation machine', 'quads', '{}', 'machine', 'strength', 'isolation', false, 'beginner', 3),
('a0000001-0001-0001-0001-000000000053', 'Bulgarian Split Squat', 'bulgarian-split-squat', 'Single leg squat variation', 'quads', '{glutes}', 'dumbbell', 'strength', 'lunge', true, 'intermediate', 4),
('a0000001-0001-0001-0001-000000000054', 'Hack Squat', 'hack-squat', 'Machine squat for quad focus', 'quads', '{glutes}', 'machine', 'strength', 'squat', true, 'intermediate', 5),

-- HAMSTRINGS
('a0000001-0001-0001-0001-000000000060', 'Romanian Deadlift', 'romanian-deadlift', 'Hamstring and glute stretch exercise', 'hamstrings', '{glutes,back}', 'barbell', 'strength', 'hinge', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000061', 'Leg Curl', 'leg-curl', 'Hamstring isolation machine', 'hamstrings', '{}', 'machine', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000062', 'Nordic Curl', 'nordic-curl', 'Advanced hamstring bodyweight exercise', 'hamstrings', '{}', 'bodyweight', 'strength', 'isolation', false, 'advanced', 3),

-- GLUTES
('a0000001-0001-0001-0001-000000000070', 'Hip Thrust', 'hip-thrust', 'Glute focus compound', 'glutes', '{hamstrings}', 'barbell', 'strength', 'extension', true, 'intermediate', 1),
('a0000001-0001-0001-0001-000000000071', 'Cable Kickback', 'cable-kickback', 'Glute isolation with cable', 'glutes', '{}', 'cable', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000072', 'Glute Bridge', 'glute-bridge', 'Bodyweight glute exercise', 'glutes', '{hamstrings}', 'bodyweight', 'strength', 'extension', false, 'beginner', 3),

-- CALVES
('a0000001-0001-0001-0001-000000000080', 'Standing Calf Raise', 'standing-calf-raise', 'Calf raise standing', 'calves', '{}', 'machine', 'strength', 'isolation', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000081', 'Seated Calf Raise', 'seated-calf-raise', 'Seated calf raise for soleus', 'calves', '{}', 'machine', 'strength', 'isolation', false, 'beginner', 2),

-- ABS
('a0000001-0001-0001-0001-000000000090', 'Crunch', 'crunch', 'Basic abdominal crunch', 'abs', '{}', 'bodyweight', 'strength', 'flexion', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000091', 'Plank', 'plank', 'Core stability hold', 'abs', '{core}', 'bodyweight', 'strength', 'isolation', false, 'beginner', 2),
('a0000001-0001-0001-0001-000000000092', 'Hanging Leg Raise', 'hanging-leg-raise', 'Advanced lower ab exercise', 'abs', '{}', 'bodyweight', 'strength', 'flexion', false, 'advanced', 3),
('a0000001-0001-0001-0001-000000000093', 'Russian Twist', 'russian-twist', 'Oblique rotation exercise', 'abs', '{}', 'bodyweight', 'strength', 'rotation', false, 'intermediate', 4),
('a0000001-0001-0001-0001-000000000094', 'Ab Wheel Rollout', 'ab-wheel-rollout', 'Advanced core anti-extension', 'abs', '{core}', 'other', 'strength', 'extension', false, 'advanced', 5),

-- TRAPS
('a0000001-0001-0001-0001-000000000100', 'Shrug', 'shrug', 'Trap isolation with barbell', 'traps', '{}', 'barbell', 'strength', 'isolation', false, 'beginner', 1),
('a0000001-0001-0001-0001-000000000101', 'Farmer Walk', 'farmer-walk', 'Trap and grip functional exercise', 'traps', '{forearms,core}', 'dumbbell', 'strength', 'compound', true, 'beginner', 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED PERSIAN TRANSLATIONS
-- ============================================================
INSERT INTO public.exercise_translations (exercise_id, locale, name, description, instructions) VALUES
-- CHEST
('a0000001-0001-0001-0001-000000000001', 'fa', 'پرس سینه هالتر', 'حرکت ترکیبی فشاری برای عضلات سینه', 'روی میز دراز بکشید، هالتر را با فاصله دست مناسب بگیرید و به سمت پایین سینه بیاورید سپس بالا ببرید'),
('a0000001-0001-0001-0001-000000000002', 'fa', 'پرس بالا سینه هالتر', 'پرس سینه با زاویه بالا برای تمرکز روی بالای سینه', 'میز را روی زاویه ۳۰ تا ۴۵ درجه تنظیم کنید و مانند پرس سینه اجرا کنید'),
('a0000001-0001-0001-0001-000000000003', 'fa', 'فور دست', 'حرکت ایزوله برای کشش عضلات سینه', 'روی میز دراز بکشید، دمبل‌ها را با آرنج کمی خم باز و بسته کنید'),
('a0000001-0001-0001-0001-000000000004', 'fa', 'شنا سوئدی', 'حرکت سینه با وزن بدن', 'دست‌ها را کمی عریض‌تر از عرض شانه روی زمین بگذارید و بدن را پایین و بالا ببرید'),
('a0000001-0001-0001-0001-000000000005', 'fa', 'کراس سیم‌کش', 'فور سینه با سیم‌کش', 'در بین دو سیم‌کش بایستید و دسته‌ها را به سمت هم بکشید'),
('a0000001-0001-0001-0001-000000000006', 'fa', 'پرس سینه دمبل', 'پرس سینه با دمبل', 'روی میز دراز بکشید، دمبل‌ها را از کنار سینه به سمت بالا ببرید'),

-- BACK
('a0000001-0001-0001-0001-000000000010', 'fa', 'ددلیفت', 'سلطان حرکات ترکیبی', 'با پشت صاف هالتر را از روی زمین بلند کنید، زانوها را صاف کنید و هیپ را جلو بیاورید'),
('a0000001-0001-0001-0001-000000000011', 'fa', 'رو خم هالتر', 'حرکت ترکیبی برای ضخامت پشت', 'خم شوید، هالتر را به سمت شکم بکشید و پایین بیاورید'),
('a0000001-0001-0001-0001-000000000012', 'fa', 'بارفیکس', 'حرکت عرض پشت با وزن بدن', 'میله را بگیرید و چانه را از آن رد کنید'),
('a0000001-0001-0001-0001-000000000013', 'fa', 'لت از جلو', 'حرکت عرض پشت با دستگاه سیم‌کش', 'میله را از بالا به سمت سینه بکشید'),
('a0000001-0001-0001-0001-000000000014', 'fa', 'قایقی نشسته', 'حرکت ضخامت پشت با سیم‌کش', 'نشسته دسته را به سمت شکم بکشید'),
('a0000001-0001-0001-0001-000000000015', 'fa', 'رو خم دمبل تک دست', 'حرکت پشت با دمبل تک دست', 'یک دست و یک زانو روی میز، دمبل را به سمت باسن بکشید'),

-- SHOULDERS
('a0000001-0001-0001-0001-000000000020', 'fa', 'پرس شانه هالتر', 'پرس سرشانه ترکیبی با هالتر', 'هالتر را از جلوی سرشانه به بالای سر ببرید'),
('a0000001-0001-0001-0001-000000000021', 'fa', 'نشر جانب', 'حرکت ایزوله سرشانه جانبی', 'دمبل‌ها را از دو طرف بدن به صورت جانبی بالا ببرید'),
('a0000001-0001-0001-0001-000000000022', 'fa', 'نشر جلو', 'حرکت ایزوله سرشانه جلویی', 'دمبل‌ها را از جلوی بدن تا سطح چشم بالا ببرید'),
('a0000001-0001-0001-0001-000000000023', 'fa', 'فیس پول', 'حرکت سرشانه خلفی و بالای پشت', 'سیم‌کش را در ارتفاع صورت به سمت صورت بکشید'),
('a0000001-0001-0001-0001-000000000024', 'fa', 'پرس آرنولدی', 'پرس شانه چرخشی با دمبل', 'مانند پرس شانه اما با چرخش مچ دست در حین بالا بردن'),

-- BICEPS
('a0000001-0001-0001-0001-000000000030', 'fa', 'جلو بازو هالتر', 'حرکت جلو بازو با هالتر', 'ایستاده هالتر را به سمت شانه ببرید'),
('a0000001-0001-0001-0001-000000000031', 'fa', 'جلو بازو دمبل', 'حرکت جلو بازو با دمبل', 'ایستاده دمبل‌ها را به سمت شانه ببرید'),
('a0000001-0001-0001-0001-000000000032', 'fa', 'جلو بازو چکشی', 'حرکت جلو بازو و ساعد', 'مانند جلو بازو دمبل اما با دست‌های رو به هم'),
('a0000001-0001-0001-0001-000000000033', 'fa', 'جلو بازو لاری', 'حرکت ایزوله جلو بازو با میز لاری', 'پشت بازو روی میز، هالتر را بالا ببرید'),
('a0000001-0001-0001-0001-000000000034', 'fa', 'جلو بازو تغلیظ', 'حرکت جلو بازو با تمرکز بالا', 'نشسته، آرنج روی ران، دمبل را بالا ببرید'),

-- TRICEPS
('a0000001-0001-0001-0001-000000000040', 'fa', 'پشت بازو سیم‌کش', 'حرکت ایزوله پشت بازو با سیم‌کش', 'هanko دسته را به سمت پایین ببرید'),
('a0000001-0001-0001-0001-000000000041', 'fa', 'پشت بازو خوابیده', 'اکستنشن پشت بازو خوابیده', 'خوابیده هالتر EZ را از بالای سر پایین و بالا ببرید'),
('a0000001-0001-0001-0001-000000000042', 'fa', 'پشت بازو پشت سر', 'اکستنشن پشت سر با دمبل', 'دمبل را از پشت سر بالا ببرید'),
('a0000001-0001-0001-0001-000000000043', 'fa', 'دیپ', 'حرکت ترکیبی پشت بازو و سینه', 'روی دو میله موازی بدن را پایین و بالا ببرید'),
('a0000001-0001-0001-0001-000000000044', 'fa', 'پرس سینه دست نزدیک', 'پرس سینه با تمرکز پشت بازو', 'مانند پرس سینه اما دست‌ها نزدیک هم'),

-- QUADS
('a0000001-0001-0001-0001-000000000050', 'fa', 'اسکوات هالتر', 'سلطان حرکات پا', 'هالتر روی شانه، زانوها را خم کنید و صاف بایستید'),
('a0000001-0001-0001-0001-000000000051', 'fa', 'پرس پا', 'حرکت پا با دستگاه', 'نشسته در دستگاه، پاها را صاف کنید'),
('a0000001-0001-0001-0001-000000000052', 'fa', 'اکستنشن پا', 'حرکت ایزوله جلو ران', 'نشسته در دستگاه، پاها را بالا ببرید'),
('a0000001-0001-0001-0001-000000000053', 'fa', 'اسکوات بلغاری', 'اسکوات تک پا', 'یک پا روی نیمکت عقب، با پا دیگر اسکوات بزنید'),
('a0000001-0001-0001-0001-000000000054', 'fa', 'هاک اسکوات', 'اسکوات با دستگاه هک', 'در دستگاه هک، بدن را پایین و بالا ببرید'),

-- HAMSTRINGS
('a0000001-0001-0001-0001-000000000060', 'fa', 'ددلیفت رومانیایی', 'حرکت پشت ران و باسن', 'با پا صاف هالتر را از روی زمین تا زیر زانو پایین بیاورید'),
('a0000001-0001-0001-0001-000000000061', 'fa', 'لگ کرل', 'حرکت ایزوله پشت ران', 'نشسته یا خوابیده در دستگاه، پاها را خم کنید'),
('a0000001-0001-0001-0001-000000000062', 'fa', 'نوردیک کرل', 'حرکت پیشرفته پشت ران با وزن بدن', 'زانو ثابت، بدن را به سمت جلو پایین ببرید'),

-- GLUTES
('a0000001-0001-0001-0001-000000000070', 'fa', 'هیپ تراست', 'حرکت ترکیبی باسن', 'پشت سر شانه روی نیمکت، باسن را بالا ببرید'),
('a0000001-0001-0001-0001-000000000071', 'fa', 'کیک بک سیم‌کش', 'حرکت ایزوله باسن', 'پا را به سمت عقب بالا ببرید'),
('a0000001-0001-0001-0001-000000000072', 'fa', 'پل باسن', 'حرکت باسن با وزن بدن', 'خوابیده باسن را بالا ببرید'),

-- CALVES
('a0000001-0001-0001-0001-000000000080', 'fa', 'ساق پا ایستاده', 'حرکت ساق پا ایستاده', 'روی پنجه پا بالا بروید و پایین بیایید'),
('a0000001-0001-0001-0001-000000000081', 'fa', 'ساق پا نشسته', 'حرکت ساق پا نشسته', 'نشسته در دستگاه، روی پنجه پا بالا بروید'),

-- ABS
('a0000001-0001-0001-0001-000000000090', 'fa', 'کرانچ', 'حرکت شکم پایه', 'خوابیده، شانه‌ها را از زمین جدا کنید'),
('a0000001-0001-0001-0001-000000000091', 'fa', 'پلانک', 'حرکت ثبات هسته', 'روی ساعد و پنجه پا، بدن صاف نگه دارید'),
('a0000001-0001-0001-0001-000000000092', 'fa', 'آویزان پایین بردن پا', 'حرکت پیشرفته شکم پایین', 'آویزان از میله، پاهای صاف را بالا ببرید'),
('a0000001-0001-0001-0001-000000000093', 'fa', 'روسیان توئیست', 'حرکت عضلات مورب', 'نشسته با بدن خم، وزنه را دو طرف بچرخانید'),
('a0000001-0001-0001-0001-000000000094', 'fa', 'اب ویل', 'حرکت پیشرفته هسته', 'روی زانو، چرخ اب ویل را به جلو ببرید'),

-- TRAPS
('a0000001-0001-0001-0001-000000000100', 'fa', 'شروگ هالتر', 'حرکت ایزوله ذوزنقه', 'شانه‌ها را بالا ببرید و نگه دارید'),
('a0000001-0001-0001-0001-000000000101', 'fa', 'راه رفتن کشاورز', 'حرکت عملکردی ذوزنقه و گریپ', 'دمبل‌های سنگین بردارید و راه بروید')
ON CONFLICT (exercise_id, locale) DO NOTHING;

-- ============================================================
-- SEED MUSCLE GROUP PERSIAN NAMES (update translations table)
-- ============================================================
-- Add a muscle_group_translations concept via a simple approach:
-- We add translations to a generic translations table if it exists,
-- or we can handle this in the app layer using fallback-config.