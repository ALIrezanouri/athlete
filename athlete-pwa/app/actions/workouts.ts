"use server"

import { createClient } from "@/lib/supabase/server"

// ── Previous Performance Cache ──
const previousPerformanceCache = new Map<string, Array<{ weight_kg: number; reps: number }>>()

// ── Types ────────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string
  name_en: string
  slug: string
  description: string | null
  muscle_group_id: string
  secondary_muscle_groups: string[]
  equipment_type_id: string | null
  exercise_type: string
  movement_pattern: string | null
  image_url: string | null
  video_url: string | null
  is_compound: boolean
  difficulty: string
  translations?: Array<{
    locale: string
    name: string
    description: string | null
    instructions: string | null
  }>
}

export interface WorkoutSession {
  id: string
  name: string
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  status: "in_progress" | "completed" | "discarded"
  total_volume: number
  total_sets: number
  estimated_calories: number
  notes: string | null
}

export interface WorkoutExercise {
  id: string
  workout_session_id: string
  exercise_id: string | null
  custom_exercise_id: string | null
  exercise_name: string
  sort_order: number
  is_superset: boolean
  superset_group_id: string | null
  notes: string | null
  rest_seconds: number
  sets?: WorkoutSet[]
}

export interface WorkoutSet {
  id: string
  workout_exercise_id: string
  set_number: number
  set_type: "normal" | "warmup" | "dropset" | "failure"
  weight_kg: number
  reps: number
  duration_seconds: number | null
  distance_meters: number | null
  rpe: number | null
  is_completed: boolean
  completed_at: string | null
  notes: string | null
}

// ── Helper: Get Authenticated User ──────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase }
  return { user, supabase }
}

// ── Server Action: Get Exercises ────────────────────────────────────────────
// Fetches exercises with optional filters and locale translations
export async function getExercises(params?: {
  muscleGroupId?: string
  equipmentTypeId?: string
  exerciseType?: string
  search?: string
  locale?: string
  limit?: number
  offset?: number
}): Promise<{
  success: boolean
  error?: string
  exercises?: Exercise[]
  total?: number
}> {
  const supabase = await createClient()
  const locale = params?.locale || "fa"

  let query = supabase
    .from("exercises")
    .select("*, exercise_translations!exercise_translations_exercise_id_fkey(locale, name, description, instructions)", { count: "exact" })
    .eq("is_active", true)

  if (params?.muscleGroupId) {
    query = query.eq("muscle_group_id", params.muscleGroupId)
  }
  if (params?.equipmentTypeId) {
    query = query.eq("equipment_type_id", params.equipmentTypeId)
  }
  if (params?.exerciseType) {
    query = query.eq("exercise_type", params.exerciseType)
  }
  if (params?.search) {
    query = query.ilike("name_en", `%${params.search}%`)
  }

  const limit = params?.limit || 50
  const offset = params?.offset || 0
  query = query.range(offset, offset + limit - 1).order("sort_order")

  const { data: exercises, error, count } = await query

  if (error) {
    console.error("[WORKOUTS] Error fetching exercises:", error)
    return { success: false, error: "Failed to fetch exercises" }
  }

  // Transform: attach translations
  const transformed: Exercise[] = (exercises || []).map((ex: any) => ({
    id: ex.id,
    name_en: ex.name_en,
    slug: ex.slug,
    description: ex.description,
    muscle_group_id: ex.muscle_group_id,
    secondary_muscle_groups: ex.secondary_muscle_groups || [],
    equipment_type_id: ex.equipment_type_id,
    exercise_type: ex.exercise_type,
    movement_pattern: ex.movement_pattern,
    image_url: ex.image_url,
    video_url: ex.video_url,
    is_compound: ex.is_compound,
    difficulty: ex.difficulty,
    translations: ex.exercise_translations || [],
  }))

  return { success: true, exercises: transformed, total: count || 0 }
}

// ── Server Action: Get Exercise by ID ──────────────────────────────────────
export async function getExerciseById(
  exerciseId: string,
  locale?: string
): Promise<{
  success: boolean
  error?: string
  exercise?: Exercise & { localName?: string; localDescription?: string; localInstructions?: string }
}> {
  const supabase = await createClient()

  const { data: exercise, error } = await supabase
    .from("exercises")
    .select("*, exercise_translations!exercise_translations_exercise_id_fkey(locale, name, description, instructions)")
    .eq("id", exerciseId)
    .single()

  if (error || !exercise) {
    return { success: false, error: "Exercise not found" }
  }

  const translations = exercise.exercise_translations || []
  const localTrans = locale
    ? translations.find((t: any) => t.locale === locale)
    : translations.find((t: any) => t.locale === "fa")

  return {
    success: true,
    exercise: {
      id: exercise.id,
      name_en: exercise.name_en,
      slug: exercise.slug,
      description: exercise.description,
      muscle_group_id: exercise.muscle_group_id,
      secondary_muscle_groups: exercise.secondary_muscle_groups || [],
      equipment_type_id: exercise.equipment_type_id,
      exercise_type: exercise.exercise_type,
      movement_pattern: exercise.movement_pattern,
      image_url: exercise.image_url,
      video_url: exercise.video_url,
      is_compound: exercise.is_compound,
      difficulty: exercise.difficulty,
      translations,
      localName: localTrans?.name,
      localDescription: localTrans?.description,
      localInstructions: localTrans?.instructions,
    },
  }
}

// ── Server Action: Start Workout ────────────────────────────────────────────
export async function startWorkout(params?: {
  name?: string
  gymId?: string
}): Promise<{
  success: boolean
  error?: string
  sessionId?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      name: params?.name || "تمرین",
      status: "in_progress",
      gym_id: params?.gymId,
    })
    .select("id")
    .single()

  if (error || !session) {
    console.error("[WORKOUTS] Error starting workout:", error)
    return { success: false, error: "Failed to start workout" }
  }

  return { success: true, sessionId: session.id }
}

// ── Server Action: Add Exercise to Workout ──────────────────────────────────
export async function addExerciseToWorkout(params: {
  sessionId: string
  exerciseId: string
  exerciseName: string
  isCustom?: boolean
}): Promise<{
  success: boolean
  error?: string
  workoutExerciseId?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Get current max sort_order
  const { data: existing } = await supabase
    .from("workout_exercises")
    .select("sort_order")
    .eq("workout_session_id", params.sessionId)
    .order("sort_order", { ascending: false })
    .limit(1)

  const nextSort = (existing?.[0]?.sort_order || 0) + 1

  const insertData: any = {
    workout_session_id: params.sessionId,
    exercise_name: params.exerciseName,
    sort_order: nextSort,
  }

  if (params.isCustom) {
    insertData.custom_exercise_id = params.exerciseId
  } else {
    insertData.exercise_id = params.exerciseId
  }

  const { data: we, error } = await supabase
    .from("workout_exercises")
    .insert(insertData)
    .select("id")
    .single()

  if (error || !we) {
    console.error("[WORKOUTS] Error adding exercise:", error)
    return { success: false, error: "Failed to add exercise" }
  }

  // Auto-add first set with previous workout data
  await supabase.from("workout_sets").insert({
    workout_exercise_id: we.id,
    set_number: 1,
    set_type: "normal",
    weight_kg: 0,
    reps: 0,
    is_completed: false,
  })

  return { success: true, workoutExerciseId: we.id }
}

// ── Server Action: Add Set to Exercise ──────────────────────────────────────
export async function addSet(params: {
  workoutExerciseId: string
  weightKg?: number
  reps?: number
  setType?: "normal" | "warmup" | "dropset" | "failure"
}): Promise<{
  success: boolean
  error?: string
  setId?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Get current max set_number
  const { data: existing } = await supabase
    .from("workout_sets")
    .select("set_number")
    .eq("workout_exercise_id", params.workoutExerciseId)
    .order("set_number", { ascending: false })
    .limit(1)

  const nextSet = (existing?.[0]?.set_number || 0) + 1

  const { data: set, error } = await supabase
    .from("workout_sets")
    .insert({
      workout_exercise_id: params.workoutExerciseId,
      set_number: nextSet,
      set_type: params.setType || "normal",
      weight_kg: params.weightKg || 0,
      reps: params.reps || 0,
      is_completed: false,
    })
    .select("id")
    .single()

  if (error || !set) {
    console.error("[WORKOUTS] Error adding set:", error)
    return { success: false, error: "Failed to add set" }
  }

  return { success: true, setId: set.id }
}

// ── Server Action: Update Set ──────────────────────────────────────────────
export async function updateSet(params: {
  setId: string
  weightKg?: number
  reps?: number
  rpe?: number
  isCompleted?: boolean
  setType?: "normal" | "warmup" | "dropset" | "failure"
  notes?: string
}): Promise<{
  success: boolean
  error?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const updateData: any = {}
  if (params.weightKg !== undefined) updateData.weight_kg = params.weightKg
  if (params.reps !== undefined) updateData.reps = params.reps
  if (params.rpe !== undefined) updateData.rpe = params.rpe
  if (params.setType !== undefined) updateData.set_type = params.setType
  if (params.notes !== undefined) updateData.notes = params.notes

  if (params.isCompleted !== undefined) {
    updateData.is_completed = params.isCompleted
    updateData.completed_at = params.isCompleted ? new Date().toISOString() : null
  }

  const { error } = await supabase
    .from("workout_sets")
    .update(updateData)
    .eq("id", params.setId)

  if (error) {
    console.error("[WORKOUTS] Error updating set:", error)
    return { success: false, error: "Failed to update set" }
  }

  return { success: true }
}

// ── Server Action: Delete Set ──────────────────────────────────────────────
export async function deleteSet(setId: string): Promise<{
  success: boolean
  error?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("id", setId)

  if (error) {
    console.error("[WORKOUTS] Error deleting set:", error)
    return { success: false, error: "Failed to delete set" }
  }

  return { success: true }
}

// ── Server Action: Complete Workout ─────────────────────────────────────────
export async function completeWorkout(params: {
  sessionId: string
  name?: string
  notes?: string
}): Promise<{
  success: boolean
  error?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const now = new Date()

  // Get session start time to calculate duration
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("start_time")
    .eq("id", params.sessionId)
    .single()

  const durationSeconds = session
    ? Math.round((now.getTime() - new Date(session.start_time).getTime()) / 1000)
    : 0

  // Estimate calories (rough: ~5 cal per set for strength training)
  const { data: setsData } = await supabase
    .from("workout_exercises")
    .select("workout_sets(is_completed)")
    .eq("workout_session_id", params.sessionId)

  let completedSets = 0
  if (setsData) {
    for (const we of setsData) {
      const sets = (we as any).workout_sets || []
      completedSets += sets.filter((s: any) => s.is_completed).length
    }
  }

  const estimatedCalories = completedSets * 5

  const updateData: any = {
    status: "completed",
    end_time: now.toISOString(),
    duration_seconds: durationSeconds,
    estimated_calories: estimatedCalories,
  }
  if (params.name) updateData.name = params.name
  if (params.notes) updateData.notes = params.notes

  const { error } = await supabase
    .from("workout_sessions")
    .update(updateData)
    .eq("id", params.sessionId)

  if (error) {
    console.error("[WORKOUTS] Error completing workout:", error)
    return { success: false, error: "Failed to complete workout" }
  }

  return { success: true }
}

// ── Server Action: Discard Workout ─────────────────────────────────────────
export async function discardWorkout(sessionId: string): Promise<{
  success: boolean
  error?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from("workout_sessions")
    .update({ status: "discarded", end_time: new Date().toISOString() })
    .eq("id", sessionId)

  if (error) {
    console.error("[WORKOUTS] Error discarding workout:", error)
    return { success: false, error: "Failed to discard workout" }
  }

  return { success: true }
}

// ── Server Action: Get Active Workout ───────────────────────────────────────
export async function getActiveWorkout(): Promise<{
  success: boolean
  error?: string
  session?: WorkoutSession
  exercises?: WorkoutExercise[]
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Get in-progress session
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("start_time", { ascending: false })
    .limit(1)
    .single()

  if (sessionError || !session) {
    return { success: true, session: undefined, exercises: [] }
  }

  // Get exercises with sets
  const { data: exercises, error: exError } = await supabase
    .from("workout_exercises")
    .select("*, workout_sets(*)")
    .eq("workout_session_id", session.id)
    .order("sort_order")

  if (exError) {
    console.error("[WORKOUTS] Error fetching exercises:", exError)
    return { success: false, error: "Failed to fetch workout exercises" }
  }

  return {
    success: true,
    session: {
      id: session.id,
      name: session.name,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_seconds: session.duration_seconds,
      status: session.status,
      total_volume: Number(session.total_volume),
      total_sets: session.total_sets,
      estimated_calories: Number(session.estimated_calories),
      notes: session.notes,
    },
    exercises: (exercises || []).map((ex: any) => ({
      id: ex.id,
      workout_session_id: ex.workout_session_id,
      exercise_id: ex.exercise_id,
      custom_exercise_id: ex.custom_exercise_id,
      exercise_name: ex.exercise_name,
      sort_order: ex.sort_order,
      is_superset: ex.is_superset,
      superset_group_id: ex.superset_group_id,
      notes: ex.notes,
      rest_seconds: ex.rest_seconds,
      sets: (ex.workout_sets || []).map((s: any) => ({
        id: s.id,
        workout_exercise_id: s.workout_exercise_id,
        set_number: s.set_number,
        set_type: s.set_type,
        weight_kg: Number(s.weight_kg),
        reps: s.reps,
        duration_seconds: s.duration_seconds,
        distance_meters: s.distance_meters ? Number(s.distance_meters) : null,
        rpe: s.rpe,
        is_completed: s.is_completed,
        completed_at: s.completed_at,
        notes: s.notes,
      })),
    })),
  }
}

// ── Server Action: Get Workout History ──────────────────────────────────────
export async function getWorkoutHistory(params?: {
  limit?: number
  offset?: number
}): Promise<{
  success: boolean
  error?: string
  sessions?: WorkoutSession[]
  total?: number
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const limit = params?.limit || 20
  const offset = params?.offset || 0

  const { data: sessions, error, count } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .in("status", ["completed"])
    .order("start_time", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("[WORKOUTS] Error fetching history:", error)
    return { success: false, error: "Failed to fetch workout history" }
  }

  return {
    success: true,
    sessions: (sessions || []).map((s) => ({
      id: s.id,
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      duration_seconds: s.duration_seconds,
      status: s.status,
      total_volume: Number(s.total_volume),
      total_sets: s.total_sets,
      estimated_calories: Number(s.estimated_calories),
      notes: s.notes,
    })),
    total: count || 0,
  }
}

// ── Server Action: Get Muscle Groups ────────────────────────────────────────
export async function getMuscleGroups() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("muscle_groups")
    .select("*")
    .order("sort_order")

  if (error) {
    console.error("[WORKOUTS] Error fetching muscle groups:", error)
    return { success: false, error: "Failed to fetch muscle groups" }
  }

  return { success: true, muscleGroups: data }
}

// ── Server Action: Get Equipment Types ─────────────────────────────────────
export async function getEquipmentTypes() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("equipment_types")
    .select("*")
    .order("sort_order")

  if (error) {
    console.error("[WORKOUTS] Error fetching equipment types:", error)
    return { success: false, error: "Failed to fetch equipment types" }
  }

  return { success: true, equipmentTypes: data }
}

// ── Server Action: Get Last Performance ─────────────────────────────────────
// Gets the user's last set of data for a specific exercise (for auto-fill suggestions)
export async function getLastPerformance(exerciseId: string): Promise<{
  success: boolean
  error?: string
  lastSets?: Array<{ weight_kg: number; reps: number; set_type: string }>
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Find the most recent workout_exercise for this exercise
  const { data: we } = await supabase
    .from("workout_exercises")
    .select("id, workout_sessions!inner(status, user_id)")
    .eq("exercise_id", exerciseId)
    .eq("workout_sessions.user_id", user.id)
    .eq("workout_sessions.status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)

  if (!we || we.length === 0) {
    return { success: true, lastSets: [] }
  }

  const workoutExerciseId = (we[0] as any).id

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("weight_kg, reps, set_type")
    .eq("workout_exercise_id", workoutExerciseId)
    .eq("is_completed", true)
    .order("set_number")

  return {
    success: true,
    lastSets: (sets || []).map((s) => ({
      weight_kg: Number(s.weight_kg),
      reps: s.reps,
      set_type: s.set_type,
    })),
  }
}