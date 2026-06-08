'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult, PaginatedResult, Exercise, ExerciseTranslation, MuscleGroup, EquipmentType } from './types';

// ============================================================
// CSV Exercise Import Mapping Constants
// ============================================================

/** Maps CSV equipment values → DB equipment_types.id (TEXT PK) */
const EQUIPMENT_MAP: Record<string, string> = {
  'Barbell': 'barbell',
  'Dumbbell': 'dumbbell',
  'Kettlebell': 'kettlebell',
  'Machine': 'machine',
  'None': 'none',
  'Other': 'other',
  'Plate': 'plate',
  'Resistance Band': 'band',
  'Suspension': 'other', // no exact DB match → 'other'
};

/** Maps CSV primary_muscle values → DB muscle_groups.id (TEXT PK) */
const MUSCLE_MAP: Record<string, string> = {
  'Abdominals': 'abs',
  'Abductors': 'quads',     // closest match
  'Adductors': 'quads',     // closest match
  'Biceps': 'biceps',
  'Calves': 'calves',
  'Cardio': 'cardio',
  'Chest': 'chest',
  'Forearms': 'forearms',
  'Full Body': 'full_body',
  'Glutes': 'glutes',
  'Hamstrings': 'hamstrings',
  'Lats': 'back',
  'Lower Back': 'back',
  'Neck': 'neck',
  'Other': 'full_body',     // closest match
  'Quadriceps': 'quads',
  'Shoulders': 'shoulders',
  'Traps': 'traps',
  'Triceps': 'triceps',
  'Upper Back': 'back',
};

// ============================================================
// Persian (fa) Translation Dictionary
// Maps English exercise name → Persian translation
// For exercises NOT in this dictionary, the English name is used as fallback
// ============================================================

const PERSIAN_TRANSLATIONS: Record<string, string> = {
  // === BICEPS ===
  '21s Bicep Curl': 'جلوبازو ۲۱',
  'Bicep Curl (Barbell)': 'جلوبازو هالتر',
  'Bicep Curl (Cable)': 'جلوبازو سیم‌کش',
  'Bicep Curl (Dumbbell)': 'جلوبازو دمبل',
  'Bicep Curl (Machine)': 'جلوبازو دستگاه',
  'Bicep Curl (Suspension)': 'جلوبازو طناب',
  'Hammer Curl': 'چکشی دمبل',
  'Preacher Curl (Barbell)': 'جلوبازو کشیشی هالتر',
  'Preacher Curl (Dumbbell)': 'جلوبازو کشیشی دمبل',
  'Concentration Curl': 'جلوبازو متمرکز',
  'Incline Bicep Curl': 'جلوبازو شیب‌دار',
  'Reverse Curl (Barbell)': 'جلوبازو معکوس هالتر',
  'Reverse Curl (Dumbbell)': 'جلوبازو معکوس دمبل',
  'Spider Curl': 'جلوبازو عنکبوتی',

  // === TRICEPS ===
  'Tricep Pushdown': 'پشت بازو سیم‌کش',
  'Tricep Extension (Barbell)': 'پشت بازو هالتر',
  'Tricep Extension (Cable)': 'پشت بازو سیم‌کش',
  'Tricep Extension (Dumbbell)': 'پشت بازو دمبل',
  'Tricep Kickback': 'پشت بازو ضربه‌ای',
  'Bench Dip': 'دیپ نیمکت',
  'Chest Dip': 'دیپ سینه',
  'Skull Crusher': 'پشت بازو خوابیده هالتر',
  'Overhead Tricep Extension': 'پشت بازو بالای سر',
  'Close Grip Bench Press': 'پرس سینه دست جمع',

  // === CHEST ===
  'Bench Press (Barbell)': 'پرس سینه هالتر',
  'Bench Press (Cable)': 'پرس سینه سیم‌کش',
  'Bench Press (Dumbbell)': 'پرس سینه دمبل',
  'Bench Press (Smith Machine)': 'پرس سینه اسمیت',
  'Bench Press - Close Grip (Barbell)': 'پرس سینه دست جمع هالتر',
  'Bench Press - Wide Grip (Barbell)': 'پرس سینه دست باز هالتر',
  'Incline Bench Press (Barbell)': 'پرس بالا سینه هالتر',
  'Incline Bench Press (Dumbbell)': 'پرس بالا سینه دمبل',
  'Decline Bench Press (Barbell)': 'پرس زیر سینه هالتر',
  'Decline Bench Press (Dumbbell)': 'پرس زیر سینه دمبل',
  'Chest Fly (Cable)': 'فلای سینه سیم‌کش',
  'Chest Fly (Dumbbell)': 'فلای سینه دمبل',
  'Cable Fly Crossovers': 'کراس اور سیم‌کش',
  'Butterfly (Pec Deck)': 'پروانه دستگاه',
  'Push Up': 'شنا سوئدی',
  'Diamond Push Up': 'شنا الماسی',
  'Around The World': 'دور دنیا',

  // === BACK ===
  'Bent Over Row (Barbell)': 'رو خم هالتر',
  'Bent Over Row (Dumbbell)': 'رو خم دمبل',
  'Bent Over Row (Band)': 'رو خم باند',
  'Lat Pulldown': 'لت از جلو',
  'Pull Up': 'بارفیکس',
  'Chin Up': 'بارفیکس دست برعکس',
  'Seated Row (Cable)': 'رو سیم‌کش نشسته',
  'T Bar Row': 'رو تی‌بار',
  'Deadlift': 'ددلیفت',
  'Back Extension (Hyperextension)': 'هیپر اکستنشن',
  'Back Extension (Machine)': 'بک اکستنشن دستگاه',
  'Single Arm Row': 'رو تک دست دمبل',
  'Meadows Row': 'رو میدوز',

  // === SHOULDERS ===
  'Shoulder Press (Barbell)': 'پرس سرشانه هالتر',
  'Shoulder Press (Dumbbell)': 'پرس سرشانه دمبل',
  'Shoulder Press (Machine)': 'پرس سرشانه دستگاه',
  'Arnold Press (Dumbbell)': 'پرس آرنولد',
  'Lateral Raise': 'نشر از جانب',
  'Front Raise': 'جلو بازو',
  'Reverse Fly (Dumbbell)': 'فلای معکوس دمبل',
  'Face Pull': 'فیس پول',
  'Band Pullaparts': 'باند پول اپارت',
  'Upright Row': 'رو ایستاده',

  // === LEGS ===
  'Squat': 'اسکات',
  'Squat (Barbell)': 'اسکات هالتر',
  'Squat (Bodyweight)': 'اسکات وزن بدن',
  'Front Squat': 'اسکات جلو',
  'Goblet Squat': 'اسکات جام',
  'Hack Squat': 'هاک اسکات',
  'Leg Press': 'پرس پا',
  'Leg Extension': 'اکستنشن پا',
  'Leg Curl': 'لگ کرل',
  'Romanian Deadlift': 'ددلیفت رومانیایی',
  'Bulgarian Split Squat': 'اسکات بلغاری',
  'Lunges': 'لانج',
  'Calf Raise': 'ساق پا',
  'Calf Extension (Machine)': 'اکستنشن ساق دستگاه',
  'Calf Press (Machine)': 'پرس ساق دستگاه',
  'Box Squat (Barbell)': 'اسکات جعبه‌ای هالتر',
  'Assisted Pistol Squats': 'اسکات تک پا با کمک',

  // === ABS / CORE ===
  'Crunch': 'کرانچ',
  'Cable Crunch': 'کرانچ سیم‌کش',
  'Plank': 'پلانک',
  'Side Plank': 'پلانک پهلو',
  'Russian Twist': 'روسیان توئیست',
  'Hanging Leg Raise': 'بالابر پا آویزان',
  'Ab Scissors': 'قیچی شکم',
  'Ab Wheel': 'چرخ شکم',
  'Bicycle Crunch': 'کرانچ دوچرخه',
  'Mountain Climber': 'کوهنورد',
  'Dead Bug': 'حشره مرده',
  'Bird Dog': 'پرنده سگ',
  'Cable Core Palloff Press': 'پرس پالوف',

  // === CARDIO / FULL BODY ===
  'Burpee': 'برپی',
  'Aerobics': 'ایروبیک',
  'Air Bike': 'ایربایک',
  'Battle Ropes': 'طناب کوبی',
  'Box Jump': 'باکس جامپ',
  'Boxing': 'بوکس',
  'Jump Rope': 'طناب زدن',
  'Running': 'دویدن',
  'Ball Slams': 'توپ کوبی',

  // === FOREARMS ===
  'Wrist Curl (Barbell)': 'مچ‌بند هالتر',
  'Wrist Curl (Dumbbell)': 'مچ‌بند دمبل',
  'Behind the Back Bicep Wrist Curl (Barbell)': 'مچ‌بند پشت هالتر',
  'Farmer Walk': 'پیاده‌روی کشاورز',

  // === TRAPS ===
  'Shrug (Barbell)': 'شروگ هالتر',
  'Shrug (Dumbbell)': 'شروگ دمبل',
  'Shrug (Machine)': 'شروگ دستگاه',

  // === GLUTES / HAMSTRINGS ===
  'Hip Thrust': 'هیپ تراست',
  'Glute Bridge': 'گلوت بریج',
  'Cable Pull Through': 'کابل پول ترو',
  'Good Morning': 'گود مورنینگ',
  'Kettlebell Swing': 'کتل‌بل سوئینگ',
};

// ============================================================
// Types
// ============================================================

interface CsvRow {
  name: string;
  equipment: string;
  primary_muscle: string;
  secondary_muscle: string;
  source: string;
  sourceType: string;
}

export interface ImportResult {
  total: number;
  inserted: number;
  skipped: number;
  translationsCreated: number;
  errors: string[];
}

// ============================================================
// Helper: Generate URL-safe slug from exercise name
// ============================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================
// Helper: Parse CSV text into rows
// ============================================================

function parseCsv(csvText: string): CsvRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return []; // header only or empty

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    // Simple CSV parse — handles basic cases
    // Our CSV has no quoted fields with commas, so split(',') is safe
    const cols = line.split(',').map(c => c.trim());

    return {
      name: cols[0] || '',
      equipment: cols[1] || 'None',
      primary_muscle: cols[2] || 'Other',
      secondary_muscle: cols[3] || 'None',
      source: cols[4] || 'None',
      sourceType: cols[5] || 'None',
    };
  }).filter(row => row.name.length > 0);
}

// ============================================================
// Helper: Determine exercise_type from muscle/equipment
// ============================================================

function inferExerciseType(muscleGroupId: string, equipmentTypeId: string): string {
  if (muscleGroupId === 'cardio') return 'cardio';
  if (equipmentTypeId === 'none' || equipmentTypeId === 'bodyweight') return 'calisthenics';
  return 'strength';
}

// ============================================================
// Helper: Determine difficulty heuristically
// ============================================================

function inferDifficulty(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('beginner') || lower.includes('easy') || lower.includes('basic')) return 'beginner';
  if (lower.includes('advanced') || lower.includes('expert') || lower.includes('pro')) return 'advanced';
  return 'intermediate';
}

// ============================================================
// Helper: Determine if exercise is compound
// ============================================================

function inferIsCompound(secondaryMuscle: string): boolean {
  return secondaryMuscle !== 'None' && secondaryMuscle.length > 0;
}

// ============================================================
// Main Server Action: importExercisesFromCsv
// ============================================================

/**
 * Imports exercises from CSV text into the database.
 * 
 * CSV format: name,equipment,primary_muscle,secondary_muscle,source,sourceType
 * 
 * - Maps CSV equipment/muscle names to DB TEXT IDs
 * - Generates URL-safe slugs
 * - Infers exercise_type, difficulty, is_compound
 * - Handles media URLs (image/video from source column)
 * - Skips duplicates by slug
 * - Returns detailed import statistics
 */
export async function importExercisesFromCsv(
  csvText: string
): Promise<ActionResult<ImportResult>> {
  const supabase = await createClient();

  // 1. Parse CSV
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { success: false, error: 'No valid rows found in CSV' };
  }

  // 2. Fetch existing slugs to detect duplicates
  const { data: existing } = await supabase
    .from('exercises')
    .select('slug');
  const existingSlugs = new Set((existing || []).map(e => e.slug));

  // 3. Build exercise records
  const errors: string[] = [];
  let skipped = 0;
  const exerciseRecords: Array<{
    name_en: string;
    slug: string;
    muscle_group_id: string;
    secondary_muscle_groups: string[];
    equipment_type_id: string;
    exercise_type: string;
    movement_pattern: string | null;
    image_url: string | null;
    video_url: string | null;
    is_compound: boolean;
    difficulty: string;
    is_active: boolean;
    sort_order: number;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Map equipment
    const equipmentTypeId = EQUIPMENT_MAP[row.equipment] || 'other';
    // Map primary muscle
    const muscleGroupId = MUSCLE_MAP[row.primary_muscle];
    if (!muscleGroupId) {
      errors.push(`Row ${i + 2}: Unknown muscle "${row.primary_muscle}" for "${row.name}"`);
      continue;
    }

    // Generate unique slug
    let slug = generateSlug(row.name);
    if (existingSlugs.has(slug)) {
      skipped++;
      continue;
    }
    // Handle slug collisions within this batch
    let suffix = 1;
    let uniqueSlug = slug;
    while (existingSlugs.has(uniqueSlug)) {
      uniqueSlug = `${slug}-${suffix}`;
      suffix++;
    }
    slug = uniqueSlug;
    existingSlugs.add(slug);

    // Map secondary muscles
    const secondaryMuscleGroups = row.secondary_muscle && row.secondary_muscle !== 'None'
      ? row.secondary_muscle
          .split('/')
          .map(m => MUSCLE_MAP[m.trim()])
          .filter(Boolean) as string[]
      : [];

    // Map media URLs
    let image_url: string | null = null;
    let video_url: string | null = null;
    if (row.source && row.source !== 'None') {
      if (row.sourceType === 'image') {
        image_url = row.source;
      } else if (row.sourceType === 'video') {
        video_url = row.source;
      }
    }

    exerciseRecords.push({
      name_en: row.name,
      slug,
      muscle_group_id: muscleGroupId,
      secondary_muscle_groups: secondaryMuscleGroups,
      equipment_type_id: equipmentTypeId,
      exercise_type: inferExerciseType(muscleGroupId, equipmentTypeId),
      movement_pattern: null, // not available from CSV
      image_url,
      video_url,
      is_compound: inferIsCompound(row.secondary_muscle),
      difficulty: inferDifficulty(row.name),
      is_active: true,
      sort_order: i + 1,
    });
  }

  if (exerciseRecords.length === 0) {
    return {
      success: false,
      error: `No new exercises to import. Skipped ${skipped} duplicates. Errors: ${errors.length}`,
      data: { total: rows.length, inserted: 0, skipped, translationsCreated: 0, errors },
    };
  }

  // 4. Batch insert — return inserted rows to get IDs for translations
  const { data: insertedExercises, error: insertError } = await supabase
    .from('exercises')
    .insert(exerciseRecords)
    .select('id, name_en');

  if (insertError) {
    console.error('[importExercisesFromCsv] Insert error:', insertError);
    return {
      success: false,
      error: `Database insert failed: ${insertError.message}`,
      data: { total: rows.length, inserted: 0, skipped, translationsCreated: 0, errors: [...errors, insertError.message] },
    };
  }

  // 5. Auto-generate Persian (fa) translations for inserted exercises
  let translationsCreated = 0;
  if (insertedExercises && insertedExercises.length > 0) {
    const translationRecords = insertedExercises.map((exercise) => ({
      exercise_id: exercise.id,
      locale: 'fa',
      name: PERSIAN_TRANSLATIONS[exercise.name_en] || exercise.name_en, // fallback to English
      description: null,
      instructions: null,
    }));

    const { error: translationError } = await supabase
      .from('exercise_translations')
      .insert(translationRecords);

    if (translationError) {
      // Non-fatal — log but don't fail the import
      console.error('[importExercisesFromCsv] Translation insert error:', translationError);
      errors.push(`Translations: ${translationError.message}`);
    } else {
      translationsCreated = translationRecords.length;
    }
  }

  return {
    success: true,
    data: {
      total: rows.length,
      inserted: exerciseRecords.length,
      skipped,
      translationsCreated,
      errors,
    },
  };
}

// ============================================================
// Read: Get all exercises (for admin listing)
// ============================================================

export async function getAllExercises(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  muscleGroupId?: string;
  equipmentTypeId?: string;
  exerciseType?: string;
}): Promise<ActionResult<PaginatedResult<Exercise>>> {
  const supabase = await createClient();
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('exercises')
    .select('*, exercise_translations(*)', { count: 'exact' })
    .order('sort_order', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (options?.search) {
    query = query.ilike('name_en', `%${options.search}%`);
  }
  if (options?.muscleGroupId) {
    query = query.eq('muscle_group_id', options.muscleGroupId);
  }
  if (options?.equipmentTypeId) {
    query = query.eq('equipment_type_id', options.equipmentTypeId);
  }
  if (options?.exerciseType) {
    query = query.eq('exercise_type', options.exerciseType);
  }

  const { data, count, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      data: (data || []) as Exercise[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

// ============================================================
// Read: Get exercise by ID
// ============================================================

export async function getExerciseById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('exercises')
    .select('*, muscle_group:muscle_groups(id, name_en), equipment_type:equipment_types(id, name_en), exercise_translations(*)')
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

// ============================================================
// Update: Toggle exercise active status
// ============================================================

export async function toggleExerciseActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('exercises')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================
// Delete: Remove exercise
// ============================================================

export async function deleteExercise(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================
// Read: Get all muscle groups
// ============================================================

export async function getMuscleGroups(): Promise<ActionResult<MuscleGroup[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('muscle_groups')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []) as MuscleGroup[] };
}

// ============================================================
// Read: Get all equipment types
// ============================================================

export async function getEquipmentTypes(): Promise<ActionResult<EquipmentType[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('equipment_types')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []) as EquipmentType[] };
}

// ============================================================
// Create: New exercise
// ============================================================

export async function createExercise(data: {
  name_en: string;
  slug: string;
  description?: string;
  muscle_group_id: string;
  secondary_muscle_groups?: string[];
  equipment_type_id?: string;
  exercise_type: string;
  movement_pattern?: string;
  is_compound: boolean;
  difficulty: string;
  image_url?: string;
  video_url?: string;
  is_active: boolean;
  sort_order: number;
}): Promise<ActionResult<Exercise>> {
  const supabase = await createClient();

  const { data: exercise, error } = await supabase
    .from('exercises')
    .insert({
      name_en: data.name_en,
      slug: data.slug,
      description: data.description || null,
      muscle_group_id: data.muscle_group_id,
      secondary_muscle_groups: data.secondary_muscle_groups || [],
      equipment_type_id: data.equipment_type_id || null,
      exercise_type: data.exercise_type,
      movement_pattern: data.movement_pattern || null,
      is_compound: data.is_compound,
      difficulty: data.difficulty,
      image_url: data.image_url || null,
      video_url: data.video_url || null,
      is_active: data.is_active,
      sort_order: data.sort_order,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: exercise as Exercise };
}

// ============================================================
// Create: Exercise translation
// ============================================================

export async function createExerciseTranslation(data: {
  exercise_id: string;
  locale: string;
  name: string;
  description?: string;
  instructions?: string;
}): Promise<ActionResult<ExerciseTranslation>> {
  const supabase = await createClient();

  const { data: translation, error } = await supabase
    .from('exercise_translations')
    .insert({
      exercise_id: data.exercise_id,
      locale: data.locale,
      name: data.name,
      description: data.description || null,
      instructions: data.instructions || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: translation as ExerciseTranslation };
}

// ============================================================
// Update: Exercise
// ============================================================

export async function updateExercise(
  id: string,
  data: {
    name_en: string;
    slug: string;
    description?: string | null;
    muscle_group_id: string;
    secondary_muscle_groups?: string[];
    equipment_type_id?: string | null;
    exercise_type: string;
    movement_pattern?: string | null;
    is_compound: boolean;
    difficulty: string;
    image_url?: string | null;
    video_url?: string | null;
    is_active: boolean;
    sort_order: number;
  }
): Promise<ActionResult<Exercise>> {
  const supabase = await createClient();

  const { data: exercise, error } = await supabase
    .from('exercises')
    .update({
      name_en: data.name_en,
      slug: data.slug,
      description: data.description || null,
      muscle_group_id: data.muscle_group_id,
      secondary_muscle_groups: data.secondary_muscle_groups || [],
      equipment_type_id: data.equipment_type_id || null,
      exercise_type: data.exercise_type,
      movement_pattern: data.movement_pattern || null,
      is_compound: data.is_compound,
      difficulty: data.difficulty,
      image_url: data.image_url || null,
      video_url: data.video_url || null,
      is_active: data.is_active,
      sort_order: data.sort_order,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: exercise as Exercise };
}

// ============================================================
// Update: Exercise translation
// ============================================================

export async function updateExerciseTranslation(
  id: string,
  data: {
    name: string;
    description?: string | null;
    instructions?: string | null;
  }
): Promise<ActionResult<ExerciseTranslation>> {
  const supabase = await createClient();

  const { data: translation, error } = await supabase
    .from('exercise_translations')
    .update({
      name: data.name,
      description: data.description || null,
      instructions: data.instructions || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: translation as ExerciseTranslation };
}
