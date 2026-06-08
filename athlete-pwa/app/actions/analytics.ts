"use server"

import { createClient } from "@/lib/supabase/server"
import { withRetry } from "@/lib/retry"

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase }
  return { user, supabase }
}

// ── Workout Stats ──────────────────────────────────────────────────────────
export async function getWorkoutStats(params?: {
  period?: "week" | "month" | "year" | "all"
}): Promise<{
  success: boolean
  error?: string
  stats?: {
    totalWorkouts: number
    totalVolume: number
    totalSets: number
    totalDuration: number
    avgDuration: number
    estimatedCalories: number
    streak: number
    muscleDistribution: Array<{ group: string; count: number }>
    weeklyVolume: Array<{ week: string; volume: number }>
    recentPRs: Array<{ exercise: string; weight: number; reps: number; date: string }>
  }
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const period = params?.period || "month"
  let dateFilter: Date | null = null

  if (period === "week") dateFilter = new Date(Date.now() - 7 * 86400000)
  else if (period === "month") dateFilter = new Date(Date.now() - 30 * 86400000)
  else if (period === "year") dateFilter = new Date(Date.now() - 365 * 86400000)

  const { data: sessions } = await withRetry(() => {
    let q = supabase
      .from("workout_sessions")
      .select("id, start_time, duration_seconds, total_volume, total_sets, estimated_calories")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("start_time", { ascending: false })
    if (dateFilter) {
      q = q.gte("start_time", dateFilter.toISOString())
    }
    return q
  }, { label: "getWorkoutStats.sessions" })

  const totalWorkouts = sessions?.length || 0
  const totalVolume = sessions?.reduce((sum, s) => sum + Number(s.total_volume || 0), 0) || 0
  const totalSets = sessions?.reduce((sum, s) => sum + (s.total_sets || 0), 0) || 0
  const totalDuration = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0
  const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0
  const estimatedCalories = sessions?.reduce((sum, s) => sum + Number(s.estimated_calories || 0), 0) || 0

  // Calculate streak
  let streak = 0
  if (sessions && sessions.length > 0) {
    const workoutDates = [...new Set(
      sessions.map(s => new Date(s.start_time).toISOString().split("T")[0])
    )].sort().reverse()

    const today = new Date().toISOString().split("T")[0]
    let checkDate = new Date(today)

    for (const date of workoutDates) {
      const dateStr = checkDate.toISOString().split("T")[0]
      if (date === dateStr || date === new Date(checkDate.getTime() - 86400000).toISOString().split("T")[0]) {
        streak++
        checkDate = new Date(checkDate.getTime() - 86400000)
      } else {
        break
      }
    }
  }

  // Muscle distribution
  const { data: muscleData } = await withRetry(
    () => supabase
      .from("workout_exercises")
      .select("exercise_id, exercises(muscle_group_id)")
      .in("workout_session_id", sessions?.map(s => s.id) || []),
    { label: "getWorkoutStats.muscle" }
  )

  const muscleMap: Record<string, number> = {}
  if (muscleData) {
    for (const m of muscleData as any[]) {
      const mg = m.exercises?.muscle_group_id
      if (mg) muscleMap[mg] = (muscleMap[mg] || 0) + 1
    }
  }

  const muscleDistribution = Object.entries(muscleMap)
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count)

  return {
    success: true,
    stats: {
      totalWorkouts,
      totalVolume,
      totalSets,
      totalDuration,
      avgDuration,
      estimatedCalories,
      streak,
      muscleDistribution,
      weeklyVolume: [],
      recentPRs: [],
    },
  }
}

// ── Body Stats ─────────────────────────────────────────────────────────────
export async function getBodyMeasurements(params?: {
  limit?: number
}): Promise<{
  success: boolean
  error?: string
  measurements?: Array<{
    id: string
    measured_at: string
    weight_kg: number | null
    body_fat_percentage: number | null
    chest_cm: number | null
    waist_cm: number | null
    right_bicep_cm: number | null
    right_thigh_cm: number | null
    shoulders_cm: number | null
    notes: string | null
  }>
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const limit = params?.limit || 30

  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: "Failed to fetch measurements" }
  }

  return { success: true, measurements: data || [] }
}

// ── Save Body Measurement ──────────────────────────────────────────────────
export async function saveBodyMeasurement(params: {
  measuredAt?: string
  weightKg?: number
  bodyFatPercentage?: number
  chestCm?: number
  waistCm?: number
  hipCm?: number
  rightBicepCm?: number
  leftBicepCm?: number
  rightThighCm?: number
  leftThighCm?: number
  rightCalfCm?: number
  leftCalfCm?: number
  shouldersCm?: number
  neckCm?: number
  notes?: string
}): Promise<{
  success: boolean
  error?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const insertData: any = {
    user_id: user.id,
    measured_at: params.measuredAt || new Date().toISOString().split("T")[0],
  }
  if (params.weightKg !== undefined) insertData.weight_kg = params.weightKg
  if (params.bodyFatPercentage !== undefined) insertData.body_fat_percentage = params.bodyFatPercentage
  if (params.chestCm !== undefined) insertData.chest_cm = params.chestCm
  if (params.waistCm !== undefined) insertData.waist_cm = params.waistCm
  if (params.hipCm !== undefined) insertData.hip_cm = params.hipCm
  if (params.rightBicepCm !== undefined) insertData.right_bicep_cm = params.rightBicepCm
  if (params.leftBicepCm !== undefined) insertData.left_bicep_cm = params.leftBicepCm
  if (params.rightThighCm !== undefined) insertData.right_thigh_cm = params.rightThighCm
  if (params.leftThighCm !== undefined) insertData.left_thigh_cm = params.leftThighCm
  if (params.rightCalfCm !== undefined) insertData.right_calf_cm = params.rightCalfCm
  if (params.leftCalfCm !== undefined) insertData.left_calf_cm = params.leftCalfCm
  if (params.shouldersCm !== undefined) insertData.shoulders_cm = params.shouldersCm
  if (params.neckCm !== undefined) insertData.neck_cm = params.neckCm
  if (params.notes !== undefined) insertData.notes = params.notes

  const { error } = await supabase
    .from("body_measurements")
    .upsert(insertData, { onConflict: "user_id,measured_at" })

  if (error) {
    console.error("[ANALYTICS] Save body error:", error)
    return { success: false, error: "Failed to save measurement" }
  }
  return { success: true }
}

// ── Calendar Data ──────────────────────────────────────────────────────────
export async function getCalendarData(params: {
  year: number
  month: number
}): Promise<{
  success: boolean
  error?: string
  days?: Array<{
    date: string
    hasWorkout: boolean
    workoutName?: string
    duration?: number
  }>
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const startDate = new Date(params.year, params.month - 1, 1).toISOString()
  const endDate = new Date(params.year, params.month, 0, 23, 59, 59).toISOString()

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("start_time, name, duration_seconds")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("start_time", startDate)
    .lte("start_time", endDate)
    .order("start_time")

  const days = (sessions || []).map(s => ({
    date: new Date(s.start_time).toISOString().split("T")[0],
    hasWorkout: true,
    workoutName: s.name,
    duration: s.duration_seconds || 0,
  }))

  return { success: true, days }
}

// ── Personal Records ────────────────────────────────────────────────────
export async function getPersonalRecords(): Promise<{
  success: boolean
  error?: string
  records?: Array<{
    exercise_id: string
    exercise_name: string
    max_weight: number
    max_reps: number
    max_volume: number
    best_set_date: string
    recent_improvement?: number
  }>
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // ── Optimized: 2-query strategy with SQL aggregation ──────────────
  // OLD: Fetched ALL workout_sets rows (thousands) → JS aggregation (3-21s)
  // NEW: Query 1 = workout_exercises (hundreds of rows)
  //      Query 2 = SQL MAX() + GROUP BY per workout_exercise_id (hundreds of rows)
  //      JS combines them by exercise_id — total data transfer reduced ~90%

  // Query 1: Get workout_exercises for this user's completed sessions
  // Returns one row per exercise-per-session (much smaller than workout_sets)
  const { data: weData } = await withRetry(
    () => supabase
      .from("workout_exercises")
      .select("id, exercise_id, exercise_name, workout_sessions!inner(user_id, status, start_time)")
      .eq("workout_sessions.user_id", user.id)
      .eq("workout_sessions.status", "completed")
      .order("workout_sessions.start_time", { ascending: false }),
    { label: "getPersonalRecords.workoutExercises" }
  )

  if (!weData || weData.length === 0) {
    return { success: true, records: [] }
  }

  const weIds = (weData as any[]).map((we) => we.id)

  // Query 2: SQL-side aggregation — MAX(weight), MAX(reps), MAX(volume)
  // grouped by workout_exercise_id (PostgREST v12 implicit GROUP BY)
  // Returns ONE row per workout_exercise_id instead of ALL individual sets
  const aggMap = new Map<string, { maxWeight: number; maxReps: number; maxVolume: number }>()
  const BATCH_SIZE = 200
  for (let i = 0; i < weIds.length; i += BATCH_SIZE) {
    const batch = weIds.slice(i, i + BATCH_SIZE)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggQuery = supabase
      .from("workout_sets")
      .select("workout_exercise_id, max_weight:max(weight_kg), max_reps:max(reps), max_volume:max(volume)")
      .eq("is_completed", true)
      .in("workout_exercise_id", batch)
    // .group() supported by PostgREST v12 but not in Supabase JS types yet
    const { data: setAggs } = await withRetry<any>(
      () => (aggQuery as any).group("workout_exercise_id"),
      { label: "getPersonalRecords.setAggs" }
    )

    for (const agg of (setAggs || []) as any[]) {
      aggMap.set(agg.workout_exercise_id, {
        maxWeight: Number(agg.max_weight || 0),
        maxReps: Number(agg.max_reps || 0),
        maxVolume: Number(agg.max_volume || 0),
      })
    }
  }

  // Combine: group by exercise_id across workout_exercises entries
  const exerciseMap = new Map<string, {
    name: string
    maxWeight: number
    maxReps: number
    maxVolume: number
    bestDate: string
    recentWeight: number
    prevWeight: number
  }>()

  for (const we of weData as any[]) {
    const exId = we.exercise_id
    const exName = we.exercise_name || "نامشخص"
    if (!exId) continue

    const agg = aggMap.get(we.id)
    if (!agg) continue

    const sessionDate = we.workout_sessions?.start_time || ""

    if (!exerciseMap.has(exId)) {
      exerciseMap.set(exId, {
        name: exName,
        maxWeight: agg.maxWeight,
        maxReps: agg.maxReps,
        maxVolume: agg.maxVolume,
        bestDate: sessionDate,
        recentWeight: agg.maxWeight,
        prevWeight: 0,
      })
    } else {
      const existing = exerciseMap.get(exId)!
      if (agg.maxWeight > existing.maxWeight) {
        existing.maxWeight = agg.maxWeight
        existing.bestDate = sessionDate
      }
      if (agg.maxReps > existing.maxReps) existing.maxReps = agg.maxReps
      if (agg.maxVolume > existing.maxVolume) existing.maxVolume = agg.maxVolume
      // Track previous best for improvement calc
      if (existing.prevWeight === 0 && agg.maxWeight < existing.recentWeight) {
        existing.prevWeight = agg.maxWeight
      }
    }
  }

  const records = Array.from(exerciseMap.entries()).map(([id, data]) => {
    const improvement = data.prevWeight > 0
      ? Math.round(((data.recentWeight - data.prevWeight) / data.prevWeight) * 100)
      : 0

    return {
      exercise_id: id,
      exercise_name: data.name,
      max_weight: data.maxWeight,
      max_reps: data.maxReps,
      max_volume: data.maxVolume,
      best_set_date: data.bestDate,
      recent_improvement: improvement > 0 ? improvement : undefined,
    }
  }).sort((a, b) => b.max_weight - a.max_weight)

  return { success: true, records }
}

// ── Calendar Data with Intensity ────────────────────────────────────────
export async function getCalendarDataWithIntensity(params: {
  year: number
  month: number
}): Promise<{
  success: boolean
  error?: string
  days?: Array<{
    date: string
    hasWorkout: boolean
    intensity: "none" | "light" | "moderate" | "heavy"
    workoutName?: string
    duration?: number
    volume?: number
  }>
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const startDate = new Date(params.year, params.month - 1, 1).toISOString()
  const endDate = new Date(params.year, params.month, 0, 23, 59, 59).toISOString()

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("start_time, name, duration_seconds, total_volume, total_sets")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("start_time", startDate)
    .lte("start_time", endDate)
    .order("start_time")

  const days = (sessions || []).map(s => {
    const volume = Number(s.total_volume || 0)
    const sets = s.total_sets || 0
    const duration = s.duration_seconds || 0

    // Calculate intensity based on volume
    let intensity: "none" | "light" | "moderate" | "heavy" = "light"
    if (volume > 5000 || sets > 20 || duration > 3600) intensity = "heavy"
    else if (volume > 2000 || sets > 10 || duration > 1800) intensity = "moderate"

    return {
      date: new Date(s.start_time).toISOString().split("T")[0],
      hasWorkout: true,
      intensity,
      workoutName: s.name,
      duration,
      volume,
    }
  })

  return { success: true, days }
}
