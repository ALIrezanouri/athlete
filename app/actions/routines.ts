"use server"

import { createClient } from "@/lib/supabase/server"
import { withRetry } from "@/lib/retry"

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase }
  return { user, supabase }
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface Routine {
  id: string
  name: string
  description: string | null
  is_public: boolean
  is_template: boolean
  folder: string | null
  sort_order: number
  use_count: number
  last_used_at: string | null
  created_at: string
  days?: RoutineDay[]
}

export interface RoutineDay {
  id: string
  routine_id: string
  name: string
  sort_order: number
  exercises?: RoutineExercise[]
}

export interface RoutineExercise {
  id: string
  routine_day_id: string
  exercise_id: string | null
  exercise_name: string
  sort_order: number
  rest_seconds: number
  notes: string | null
  sets?: RoutineSet[]
}

export interface RoutineSet {
  id: string
  routine_exercise_id: string
  set_number: number
  set_type: string
  weight_kg: number
  reps: number
  rpe: number | null
}

// ── Helper: Build nested routine tree from flat batch query results ──────────
// Replaces Supabase nested selects (which generate slow multi-JOIN Cartesian
// products) with 4 flat queries + JS map-assembly.
function buildRoutineTree(routines: any[], days: any[], exercises: any[], sets: any[]): any[] {
  // Map sets → exercise
  const setsByExercise = new Map<string, any[]>()
  for (const set of sets) {
    const list = setsByExercise.get(set.routine_exercise_id) || []
    list.push(set)
    setsByExercise.set(set.routine_exercise_id, list)
  }

  // Map exercises → day
  const exercisesByDay = new Map<string, any[]>()
  for (const ex of exercises) {
    const list = exercisesByDay.get(ex.routine_day_id) || []
    list.push({ ...ex, routine_sets: setsByExercise.get(ex.id) || [] })
    exercisesByDay.set(ex.routine_day_id, list)
  }

  // Map days → routine
  const daysByRoutine = new Map<string, any[]>()
  for (const day of days) {
    const list = daysByRoutine.get(day.routine_id) || []
    list.push({ ...day, routine_exercises: exercisesByDay.get(day.id) || [] })
    daysByRoutine.set(day.routine_id, list)
  }

  return routines.map(r => ({
    ...r,
    routine_days: daysByRoutine.get(r.id) || [],
  }))
}

// ── Get User Routines ──────────────────────────────────────────────────────
// FIXED: Replaced single nested select (O(n³) Cartesian product) with 4 flat
// batch queries + JS assembly. From 1 slow multi-JOIN → 4 simple indexed queries.
export async function getRoutines(): Promise<{
  success: boolean
  error?: string
  routines?: Routine[]
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Query 1: Fetch all routines
  const { data: routines, error } = await withRetry(
    () => supabase
      .from("routines")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
    { label: "getRoutines.routines" }
  )

  if (error) {
    console.error("[ROUTINES] Error:", error)
    return { success: false, error: "Failed to fetch routines" }
  }

  if (!routines || routines.length === 0) {
    return { success: true, routines: [] }
  }

  // Query 2: Fetch all routine_days for these routines
  const routineIds = routines.map(r => r.id)
  const { data: days } = await withRetry(
    () => supabase
      .from("routine_days")
      .select("*")
      .in("routine_id", routineIds)
      .order("sort_order"),
    { label: "getRoutines.days" }
  )

  if (!days || days.length === 0) {
    return { success: true, routines: routines.map(r => ({ ...r, routine_days: [] })) }
  }

  // Query 3: Fetch all routine_exercises for these days
  const dayIds = days.map(d => d.id)
  const { data: exercises } = await withRetry(
    () => supabase
      .from("routine_exercises")
      .select("*")
      .in("routine_day_id", dayIds)
      .order("sort_order"),
    { label: "getRoutines.exercises" }
  )

  // Query 4: Fetch all routine_sets for these exercises
  let sets: any[] = []
  if (exercises && exercises.length > 0) {
    const exerciseIds = exercises.map(e => e.id)
    const { data: setData } = await withRetry(
      () => supabase
        .from("routine_sets")
        .select("*")
        .in("routine_exercise_id", exerciseIds)
        .order("set_number"),
      { label: "getRoutines.sets" }
    )
    sets = setData || []
  }

  // Assemble nested structure in JS
  const result = buildRoutineTree(routines, days, exercises || [], sets)

  return { success: true, routines: result }
}

// ── Get Routine by ID ──────────────────────────────────────────────────────
// FIXED: Same batch pattern as getRoutines for consistency.
export async function getRoutineById(routineId: string): Promise<{
  success: boolean
  error?: string
  routine?: Routine
}> {
  const supabase = await createClient()

  // Query 1: Fetch routine
  const { data: routine, error } = await withRetry(
    () => supabase
      .from("routines")
      .select("*")
      .eq("id", routineId)
      .single(),
    { label: "getRoutineById.routine" }
  )

  if (error || !routine) {
    return { success: false, error: "Routine not found" }
  }

  // Query 2: Fetch days
  const { data: days } = await withRetry(
    () => supabase
      .from("routine_days")
      .select("*")
      .eq("routine_id", routineId)
      .order("sort_order"),
    { label: "getRoutineById.days" }
  )

  if (!days || days.length === 0) {
    return { success: true, routine: { ...routine, routine_days: [] } }
  }

  // Query 3: Fetch exercises
  const dayIds = days.map(d => d.id)
  const { data: exercises } = await withRetry(
    () => supabase
      .from("routine_exercises")
      .select("*")
      .in("routine_day_id", dayIds)
      .order("sort_order"),
    { label: "getRoutineById.exercises" }
  )

  // Query 4: Fetch sets
  let sets: any[] = []
  if (exercises && exercises.length > 0) {
    const exerciseIds = exercises.map(e => e.id)
    const { data: setData } = await withRetry(
      () => supabase
        .from("routine_sets")
        .select("*")
        .in("routine_exercise_id", exerciseIds)
        .order("set_number"),
      { label: "getRoutineById.sets" }
    )
    sets = setData || []
  }

  const [result] = buildRoutineTree([routine], days, exercises || [], sets)

  return { success: true, routine: result }
}

// ── Create Routine ─────────────────────────────────────────────────────────
// FIXED: Replaced N+1 inserts (1 + D + 2E queries) with 4 batch queries
// (1 routine + 1 days batch + 1 exercises batch + 1 sets batch).
export async function createRoutine(params: {
  name: string
  description?: string
  folder?: string
  days?: Array<{
    name: string
    exercises?: Array<{
      exerciseId: string
      exerciseName: string
      sets?: Array<{ weight_kg: number; reps: number }>
    }>
  }>
}): Promise<{
  success: boolean
  error?: string
  routineId?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Step 1: Create routine
  const { data: routine, error } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      name: params.name,
      description: params.description || null,
      folder: params.folder || null,
    })
    .select("id")
    .single()

  if (error || !routine) {
    console.error("[ROUTINES] Create error:", error)
    return { success: false, error: "Failed to create routine" }
  }

  // Step 2: Batch insert days (if any)
  if (!params.days || params.days.length === 0) {
    return { success: true, routineId: routine.id }
  }

  const dayInserts = params.days.map((day, i) => ({
    routine_id: routine.id,
    name: day.name,
    sort_order: i,
  }))

  const { data: insertedDays } = await supabase
    .from("routine_days")
    .insert(dayInserts)
    .select("id, sort_order")

  if (!insertedDays || insertedDays.length === 0) {
    return { success: true, routineId: routine.id }
  }

  // Map sort_order → day id for exercise association
  const dayIdBySortOrder = new Map(insertedDays.map(d => [d.sort_order, d.id]))

  // Step 3: Collect all exercise inserts across all days
  const exerciseInserts: any[] = []
  const exerciseMeta: { daySortOrder: number; exSortOrder: number; sets?: Array<{ weight_kg: number; reps: number }> }[] = []

  for (let i = 0; i < params.days.length; i++) {
    const day = params.days[i]
    const dayId = dayIdBySortOrder.get(i)
    if (!dayId || !day.exercises) continue

    for (let j = 0; j < day.exercises.length; j++) {
      const ex = day.exercises[j]
      exerciseInserts.push({
        routine_day_id: dayId,
        exercise_id: ex.exerciseId,
        exercise_name: ex.exerciseName,
        sort_order: j,
      })
      exerciseMeta.push({ daySortOrder: i, exSortOrder: j, sets: ex.sets })
    }
  }

  if (exerciseInserts.length === 0) {
    return { success: true, routineId: routine.id }
  }

  const { data: insertedExercises } = await supabase
    .from("routine_exercises")
    .insert(exerciseInserts)
    .select("id, routine_day_id, sort_order")

  // Step 4: Batch insert all sets
  if (insertedExercises && insertedExercises.length > 0) {
    // Map (routine_day_id, sort_order) → exercise id
    const exIdByKey = new Map(
      insertedExercises.map(e => [`${e.routine_day_id}:${e.sort_order}`, e.id])
    )

    const setInserts: any[] = []
    for (const meta of exerciseMeta) {
      const dayId = dayIdBySortOrder.get(meta.daySortOrder)
      if (!dayId || !meta.sets) continue
      const exId = exIdByKey.get(`${dayId}:${meta.exSortOrder}`)
      if (!exId) continue

      for (let k = 0; k < meta.sets.length; k++) {
        setInserts.push({
          routine_exercise_id: exId,
          set_number: k + 1,
          weight_kg: meta.sets[k].weight_kg,
          reps: meta.sets[k].reps,
        })
      }
    }

    if (setInserts.length > 0) {
      await supabase.from("routine_sets").insert(setInserts)
    }
  }

  return { success: true, routineId: routine.id }
}

// ── Delete Routine ─────────────────────────────────────────────────────────
export async function deleteRoutine(routineId: string): Promise<{
  success: boolean
  error?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: "Failed to delete routine" }
  }
  return { success: true }
}

// ── Update Routine ──────────────────────────────────────────────────────────
// Full replace strategy: deletes existing days/exercises/sets and recreates them.
// FIXED: Delete cascade from D+E individual deletes → 3 batch deletes.
// FIXED: Insert cascade from D+E individual inserts → 3 batch inserts.
export async function updateRoutine(params: {
  routineId: string
  name: string
  description?: string
  folder?: string
  days?: Array<{
    id?: string          // existing day id (optional — new days won't have one)
    name: string
    exercises?: Array<{
      exerciseId: string
      exerciseName: string
      sets?: Array<{ weight_kg: number; reps: number; set_type?: string }>
    }>
  }>
}): Promise<{
  success: boolean
  error?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // ── Step 1: Update routine metadata ──
  const { error: routineErr } = await supabase
    .from("routines")
    .update({
      name: params.name,
      description: params.description || null,
      folder: params.folder || null,
    })
    .eq("id", params.routineId)
    .eq("user_id", user.id)

  if (routineErr) {
    console.error("[ROUTINES] Update error:", routineErr)
    return { success: false, error: "Failed to update routine" }
  }

  // ── Step 2: Batch delete existing children ──
  // FIXED: Collect all IDs with flat queries, then delete in 3 batch queries
  // instead of looping D days × E exercises with individual deletes.
  const { data: existingDays } = await supabase
    .from("routine_days")
    .select("id")
    .eq("routine_id", params.routineId)

  if (existingDays && existingDays.length > 0) {
    const dayIds = existingDays.map(d => d.id)

    // Get all exercise IDs for these days
    const { data: existingExercises } = await supabase
      .from("routine_exercises")
      .select("id")
      .in("routine_day_id", dayIds)

    // Delete in order: sets → exercises → days
    if (existingExercises && existingExercises.length > 0) {
      const exIds = existingExercises.map(e => e.id)
      await supabase.from("routine_sets").delete().in("routine_exercise_id", exIds)
      await supabase.from("routine_exercises").delete().in("id", exIds)
    }
    await supabase.from("routine_days").delete().in("id", dayIds)
  }

  // ── Step 3: Batch recreate days, exercises, sets ──
  // FIXED: Same batch insert pattern as createRoutine.
  if (!params.days || params.days.length === 0) {
    return { success: true }
  }

  // Batch insert all days
  const dayInserts = params.days.map((day, i) => ({
    routine_id: params.routineId,
    name: day.name,
    sort_order: i,
  }))

  const { data: insertedDays } = await supabase
    .from("routine_days")
    .insert(dayInserts)
    .select("id, sort_order")

  if (!insertedDays || insertedDays.length === 0) {
    return { success: true }
  }

  const dayIdBySortOrder = new Map(insertedDays.map(d => [d.sort_order, d.id]))

  // Collect all exercise inserts across all days
  const exerciseInserts: any[] = []
  const exerciseMeta: { daySortOrder: number; exSortOrder: number; sets?: Array<{ weight_kg: number; reps: number; set_type?: string }> }[] = []

  for (let i = 0; i < params.days.length; i++) {
    const day = params.days[i]
    const dayId = dayIdBySortOrder.get(i)
    if (!dayId || !day.exercises) continue

    for (let j = 0; j < day.exercises.length; j++) {
      const ex = day.exercises[j]
      exerciseInserts.push({
        routine_day_id: dayId,
        exercise_id: ex.exerciseId,
        exercise_name: ex.exerciseName,
        sort_order: j,
      })
      exerciseMeta.push({ daySortOrder: i, exSortOrder: j, sets: ex.sets })
    }
  }

  if (exerciseInserts.length === 0) {
    return { success: true }
  }

  const { data: insertedExercises } = await supabase
    .from("routine_exercises")
    .insert(exerciseInserts)
    .select("id, routine_day_id, sort_order")

  // Batch insert all sets
  if (insertedExercises && insertedExercises.length > 0) {
    const exIdByKey = new Map(
      insertedExercises.map(e => [`${e.routine_day_id}:${e.sort_order}`, e.id])
    )

    const setInserts: any[] = []
    for (const meta of exerciseMeta) {
      const dayId = dayIdBySortOrder.get(meta.daySortOrder)
      if (!dayId || !meta.sets) continue
      const exId = exIdByKey.get(`${dayId}:${meta.exSortOrder}`)
      if (!exId) continue

      for (let k = 0; k < meta.sets.length; k++) {
        setInserts.push({
          routine_exercise_id: exId,
          set_number: k + 1,
          set_type: meta.sets[k].set_type || "normal",
          weight_kg: meta.sets[k].weight_kg,
          reps: meta.sets[k].reps,
        })
      }
    }

    if (setInserts.length > 0) {
      await supabase.from("routine_sets").insert(setInserts)
    }
  }

  return { success: true }
}

// ── Start Workout from Routine ─────────────────────────────────────────────
// FIXED: Read — replaced nested select with 4 flat batch queries.
// FIXED: Write — replaced N+1 exercise/set inserts with 2 batch inserts.
export async function startWorkoutFromRoutine(routineId: string): Promise<{
  success: boolean
  error?: string
  sessionId?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Batch read: routine metadata
  const { data: routine } = await supabase
    .from("routines")
    .select("name, use_count")
    .eq("id", routineId)
    .single()

  if (!routine) return { success: false, error: "Routine not found" }

  // Batch read: days
  const { data: days } = await supabase
    .from("routine_days")
    .select("*")
    .eq("routine_id", routineId)
    .order("sort_order")

  // Batch read: exercises
  const dayIds = (days || []).map(d => d.id)
  let allExercises: any[] = []
  let allSets: any[] = []

  if (dayIds.length > 0) {
    const { data: exData } = await supabase
      .from("routine_exercises")
      .select("*")
      .in("routine_day_id", dayIds)
      .order("sort_order")
    allExercises = exData || []

    if (allExercises.length > 0) {
      const exIds = allExercises.map(e => e.id)
      const { data: setData } = await supabase
        .from("routine_sets")
        .select("*")
        .in("routine_exercise_id", exIds)
        .order("set_number")
      allSets = setData || []
    }
  }

  // Build sets by exercise map
  const setsByExercise = new Map<string, any[]>()
  for (const set of allSets) {
    const list = setsByExercise.get(set.routine_exercise_id) || []
    list.push(set)
    setsByExercise.set(set.routine_exercise_id, list)
  }

  // Enrich exercises with their sets
  const exercisesWithSets = allExercises.map(ex => ({
    ...ex,
    routine_sets: setsByExercise.get(ex.id) || [],
  }))

  // Build exercises by day map (preserving day order)
  const exercisesByDay = new Map<string, any[]>()
  for (const ex of exercisesWithSets) {
    const list = exercisesByDay.get(ex.routine_day_id) || []
    list.push(ex)
    exercisesByDay.set(ex.routine_day_id, list)
  }

  // Create workout session
  const { data: session, error: sessionErr } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      name: routine.name,
      routine_id: routineId,
      status: "in_progress",
    })
    .select("id")
    .single()

  if (sessionErr || !session) {
    return { success: false, error: "Failed to start workout" }
  }

  // Batch insert: Collect all workout_exercises and their sets
  const sortedDays = (days || []).sort((a, b) => a.sort_order - b.sort_order)
  let sortOrder = 0
  const weInserts: any[] = []
  const weSets: any[][] = [] // parallel array: sets for each exercise

  for (const day of sortedDays) {
    const dayExercises = exercisesByDay.get(day.id) || []
    for (const ex of dayExercises) {
      weInserts.push({
        workout_session_id: session.id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        sort_order: sortOrder++,
        rest_seconds: ex.rest_seconds,
      })
      weSets.push(ex.routine_sets || [])
    }
  }

  // Batch insert all workout_exercises
  if (weInserts.length > 0) {
    const { data: insertedWE } = await supabase
      .from("workout_exercises")
      .insert(weInserts)
      .select("id, sort_order")

    // Batch insert all workout_sets
    if (insertedWE && insertedWE.length > 0) {
      const weIdBySortOrder = new Map(insertedWE.map(we => [we.sort_order, we.id]))

      const setInserts: any[] = []
      for (let i = 0; i < weInserts.length; i++) {
        const weId = weIdBySortOrder.get(weInserts[i].sort_order)
        if (!weId) continue

        for (const s of weSets[i]) {
          setInserts.push({
            workout_exercise_id: weId,
            set_number: s.set_number,
            set_type: s.set_type,
            weight_kg: s.weight_kg,
            reps: s.reps,
            is_completed: false,
          })
        }
      }

      if (setInserts.length > 0) {
        await supabase.from("workout_sets").insert(setInserts)
      }
    }
  }

  // Update routine use_count
  await supabase
    .from("routines")
    .update({
      use_count: routine.use_count + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", routineId)

  return { success: true, sessionId: session.id }
}

// ── Types: Smart Workout Builder ────────────────────────────────────────────

export interface GeneratedExercise {
  exercise: {
    id: string
    name_en: string
    slug: string
    muscle_group_id: string
    equipment_type_id: string | null
    is_compound: boolean
    is_active: boolean
    difficulty: string | null
    image_url: string | null
    video_url: string | null
    secondary_muscle_groups: string[] | null
  }
  translation?: {
    name: string
    description: string | null
    instructions: string | null
  } | null
  sets: number
  reps: number
  isCompound: boolean
}

// ── Server Action: Generate Smart Workout ────────────────────────────────────
// Already uses batch queries — no N+1 fix needed.
export async function generateSmartWorkout(params: {
  muscleGroupIds: string[]
  equipmentTypeIds: string[]
}): Promise<{
  success: boolean
  error?: string
  data?: GeneratedExercise[]
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!params.muscleGroupIds || params.muscleGroupIds.length === 0) {
    return { success: false, error: "At least one muscle group is required" }
  }

  // ── Step 1: Query exercises matching muscle + equipment ──
  const hasEquipmentFilter = params.equipmentTypeIds && params.equipmentTypeIds.length > 0
  const hasNoneEquipment = hasEquipmentFilter && (params.equipmentTypeIds.includes("none") || params.equipmentTypeIds.includes("bodyweight"))
  const nonNullEquipmentIds = hasEquipmentFilter ? params.equipmentTypeIds.filter(id => id !== "none" && id !== "bodyweight") : []

  let query = supabase
    .from("exercises")
    .select("id, name_en, slug, muscle_group_id, equipment_type_id, is_compound, is_active, difficulty, image_url, video_url, secondary_muscle_groups")
    .eq("is_active", true)
    .in("muscle_group_id", params.muscleGroupIds)

  // Build equipment filter: if user selected specific equipment, filter by it
  // If no equipment selected, allow all exercises (no equipment filter)
  if (hasEquipmentFilter) {
    if (hasNoneEquipment && nonNullEquipmentIds.length > 0) {
      // Both bodyweight AND equipment exercises
      query = query.or(`equipment_type_id.in.(${nonNullEquipmentIds.join(",")}),equipment_type_id.is.null`)
    } else if (hasNoneEquipment && nonNullEquipmentIds.length === 0) {
      // Only bodyweight exercises
      query = query.is("equipment_type_id", null)
    } else {
      // Only equipment exercises (no bodyweight)
      query = query.in("equipment_type_id", nonNullEquipmentIds)
    }
  }
  // else: no equipment filter → all exercises matching muscle groups are returned

  const { data: exercises, error: exError } = await query

  if (exError) {
    console.error("[SMART_WORKOUT] Error fetching exercises:", exError)
    return { success: false, error: "Failed to fetch exercises" }
  }

  if (!exercises || exercises.length === 0) {
    return { success: true, data: [] }
  }

  // ── Step 2: Fetch Persian translations for these exercises ──
  const exerciseIds = exercises.map((e) => e.id)

  const { data: translations } = await supabase
    .from("exercise_translations")
    .select("exercise_id, name, description, instructions")
    .in("exercise_id", exerciseIds)
    .eq("locale", "fa")

  const translationMap = new Map<string, { name: string; description: string | null; instructions: string | null }>()
  if (translations) {
    for (const t of translations) {
      translationMap.set(t.exercise_id, { name: t.name, description: t.description, instructions: t.instructions })
    }
  }

  // ── Step 3: Smart selection algorithm ──
  // Sort: compound exercises first
  const sorted = [...exercises].sort((a, b) => {
    // Compound first
    if (a.is_compound !== b.is_compound) return a.is_compound ? -1 : 1
    // Then by primary muscle match priority
    return 0
  })

  // Ensure each selected muscle group has ≥1 compound exercise (if available)
  const MAX_EXERCISES = 7
  const selected: GeneratedExercise[] = []
  const coveredMuscles = new Set<string>()
  const selectedIds = new Set<string>()

  // Phase A: Pick one compound exercise per muscle group
  for (const muscleId of params.muscleGroupIds) {
    const compoundForMuscle = sorted.find(
      (e) => e.is_compound && e.muscle_group_id === muscleId && !selectedIds.has(e.id)
    )
    if (compoundForMuscle) {
      selectedIds.add(compoundForMuscle.id)
      coveredMuscles.add(muscleId)
      selected.push({
        exercise: compoundForMuscle,
        translation: translationMap.get(compoundForMuscle.id) ?? null,
        sets: 4,
        reps: 8,
        isCompound: true,
      })
    }
  }

  // Phase B: Fill remaining slots with isolation exercises, prioritizing uncovered muscles
  for (const muscleId of params.muscleGroupIds) {
    if (coveredMuscles.has(muscleId)) continue
    const isolationForMuscle = sorted.find(
      (e) => !e.is_compound && e.muscle_group_id === muscleId && !selectedIds.has(e.id)
    )
    if (isolationForMuscle && selected.length < MAX_EXERCISES) {
      selectedIds.add(isolationForMuscle.id)
      coveredMuscles.add(muscleId)
      selected.push({
        exercise: isolationForMuscle,
        translation: translationMap.get(isolationForMuscle.id) ?? null,
        sets: 3,
        reps: 12,
        isCompound: false,
      })
    }
  }

  // Phase C: Fill remaining slots with any matching exercises (compound or isolation)
  for (const ex of sorted) {
    if (selectedIds.has(ex.id)) continue
    if (selected.length >= MAX_EXERCISES) break
    selectedIds.add(ex.id)
    selected.push({
      exercise: ex,
      translation: translationMap.get(ex.id) ?? null,
      sets: ex.is_compound ? 4 : 3,
      reps: ex.is_compound ? 8 : 12,
      isCompound: ex.is_compound,
    })
  }

  return { success: true, data: selected }
}

// ── Server Action: Get Alternative Exercises ─────────────────────────────────
// Already uses batch queries — no N+1 fix needed.
export async function getAlternativeExercises(params: {
  exerciseId: string
  excludeIds?: string[]
  limit?: number
}): Promise<{
  success: boolean
  error?: string
  data?: GeneratedExercise[]
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // ── Step 1: Get the current exercise's muscle group and equipment ──
  const { data: currentEx, error: currErr } = await supabase
    .from("exercises")
    .select("id, muscle_group_id, equipment_type_id, is_compound")
    .eq("id", params.exerciseId)
    .single()

  if (currErr || !currentEx) {
    return { success: false, error: "Exercise not found" }
  }

  // ── Step 2: Query alternatives ──
  // Same muscle group, same equipment type (or both null for bodyweight)
  const limit = params.limit || 5
  const excludeIds = params.excludeIds || []

  let query = supabase
    .from("exercises")
    .select("id, name_en, slug, muscle_group_id, equipment_type_id, is_compound, is_active, difficulty, image_url, video_url, secondary_muscle_groups")
    .eq("is_active", true)
    .eq("muscle_group_id", currentEx.muscle_group_id)
    .neq("id", params.exerciseId) // Exclude the current exercise
    .limit(limit)

  // Match same equipment type
  if (currentEx.equipment_type_id === null) {
    query = query.is("equipment_type_id", null)
  } else {
    query = query.eq("equipment_type_id", currentEx.equipment_type_id)
  }

  // Exclude already-selected exercises
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`)
  }

  const { data: alternatives, error: altErr } = await query

  if (altErr) {
    console.error("[ALTERNATIVES] Error fetching alternatives:", altErr)
    return { success: false, error: "Failed to fetch alternatives" }
  }

  if (!alternatives || alternatives.length === 0) {
    return { success: true, data: [] }
  }

  // ── Step 3: Fetch Persian translations ──
  const altIds = alternatives.map((e) => e.id)

  const { data: translations } = await supabase
    .from("exercise_translations")
    .select("exercise_id, name, description, instructions")
    .in("exercise_id", altIds)
    .eq("locale", "fa")

  const translationMap = new Map<string, { name: string; description: string | null; instructions: string | null }>()
  if (translations) {
    for (const t of translations) {
      translationMap.set(t.exercise_id, { name: t.name, description: t.description, instructions: t.instructions })
    }
  }

  // ── Step 4: Build result ──
  const result: GeneratedExercise[] = alternatives.map((ex) => ({
    exercise: ex,
    translation: translationMap.get(ex.id) ?? null,
    sets: ex.is_compound ? 4 : 3,
    reps: ex.is_compound ? 8 : 12,
    isCompound: ex.is_compound,
  }))

  return { success: true, data: result }
}

// ── Server Action: Save Generated Routine ─────────────────────────────────────
// FIXED: Replaced N+1 exercise/set inserts (1 + 2E queries) with 3 batch queries
// (1 day + 1 exercises batch + 1 sets batch).
export async function saveGeneratedRoutine(params: {
  name: string
  description?: string
  exercises: GeneratedExercise[]
}): Promise<{
  success: boolean
  error?: string
  routineId?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!params.exercises || params.exercises.length === 0) {
    return { success: false, error: "No exercises to save" }
  }

  // ── Step 1: Create routine ──
  const { data: routine, error: routineErr } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      name: params.name,
      description: params.description || null,
      is_template: true,
      folder: "smart_builder",
    })
    .select("id")
    .single()

  if (routineErr || !routine) {
    console.error("[SAVE_ROUTINE] Create error:", routineErr)
    return { success: false, error: "Failed to create routine" }
  }

  // ── Step 2: Create one routine day ──
  const { data: dayData, error: dayErr } = await supabase
    .from("routine_days")
    .insert({
      routine_id: routine.id,
      name: "روز ۱",
      sort_order: 0,
    })
    .select("id")
    .single()

  if (dayErr || !dayData) {
    console.error("[SAVE_ROUTINE] Day create error:", dayErr)
    return { success: false, error: "Failed to create routine day" }
  }

  // ── Step 3: Batch insert exercises + sets ──
  const exerciseInserts = params.exercises.map((ex, i) => ({
    routine_day_id: dayData.id,
    exercise_id: ex.exercise.id,
    exercise_name: ex.translation?.name || ex.exercise.name_en,
    sort_order: i,
    rest_seconds: ex.isCompound ? 90 : 60,
  }))

  const { data: insertedExercises } = await supabase
    .from("routine_exercises")
    .insert(exerciseInserts)
    .select("id, sort_order")

  if (insertedExercises && insertedExercises.length > 0) {
    // Map sort_order → exercise id
    const exIdBySortOrder = new Map(insertedExercises.map(e => [e.sort_order, e.id]))

    // Batch insert all sets
    const setInserts: any[] = []
    for (let i = 0; i < params.exercises.length; i++) {
      const exId = exIdBySortOrder.get(i)
      if (!exId) continue

      const ex = params.exercises[i]
      for (let s = 0; s < ex.sets; s++) {
        setInserts.push({
          routine_exercise_id: exId,
          set_number: s + 1,
          set_type: "normal",
          weight_kg: 0, // User will fill in during workout
          reps: ex.reps,
          rpe: null,
        })
      }
    }

    if (setInserts.length > 0) {
      await supabase.from("routine_sets").insert(setInserts)
    }
  }

  return { success: true, routineId: routine.id }
}

// ── Server Action: Start Direct Workout ───────────────────────────────────────
// FIXED: Replaced N+1 exercise/set inserts (2E queries) with 2 batch inserts.
export async function startDirectWorkout(params: {
  name?: string
  exercises: GeneratedExercise[]
}): Promise<{
  success: boolean
  error?: string
  sessionId?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!params.exercises || params.exercises.length === 0) {
    return { success: false, error: "No exercises to start" }
  }

  // ── Step 1: Create workout session ──
  const sessionName = params.name || "تمرین هوشمند"
  const { data: session, error: sessionErr } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      name: sessionName,
      status: "in_progress",
    })
    .select("id")
    .single()

  if (sessionErr || !session) {
    console.error("[DIRECT_WORKOUT] Session create error:", sessionErr)
    return { success: false, error: "Failed to start workout" }
  }

  // ── Step 2: Batch insert exercises + sets ──
  const weInserts = params.exercises.map((ex, i) => ({
    workout_session_id: session.id,
    exercise_id: ex.exercise.id,
    exercise_name: ex.translation?.name || ex.exercise.name_en,
    sort_order: i,
    rest_seconds: ex.isCompound ? 90 : 60,
  }))

  const { data: insertedWE } = await supabase
    .from("workout_exercises")
    .insert(weInserts)
    .select("id, sort_order")

  if (insertedWE && insertedWE.length > 0) {
    // Map sort_order → workout_exercise id
    const weIdBySortOrder = new Map(insertedWE.map(we => [we.sort_order, we.id]))

    // Batch insert all sets
    const setInserts: any[] = []
    for (let i = 0; i < params.exercises.length; i++) {
      const weId = weIdBySortOrder.get(i)
      if (!weId) continue

      const ex = params.exercises[i]
      for (let s = 0; s < ex.sets; s++) {
        setInserts.push({
          workout_exercise_id: weId,
          set_number: s + 1,
          set_type: "normal",
          weight_kg: 0,
          reps: ex.reps,
          is_completed: false,
        })
      }
    }

    if (setInserts.length > 0) {
      await supabase.from("workout_sets").insert(setInserts)
    }
  }

  return { success: true, sessionId: session.id }
}
