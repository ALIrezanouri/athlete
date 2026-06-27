"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────

export interface GamificationProfile {
  total_xp: number;
  current_level: number;
  level_start_xp: number;
  next_level_xp: number;
  xp_into_level: number;
  xp_for_next_level: number;
  level_progress: number; // 0..1
  current_streak: number;
  best_streak: number;
}

export interface WorkoutCompletionResult {
  success: boolean;
  xp_gained?: number;
  new_total_xp?: number;
  new_level?: number;
  leveled_up?: boolean;
  current_streak?: number;
  best_streak?: number;
  streak_extended?: boolean;
  error?: string;
}

// Persian tier titles for levels
export function getLevelTitle(level: number): string {
  if (level >= 30) return "افسانه‌ای";
  if (level >= 20) return "استاد";
  if (level >= 10) return "حرفه‌ای";
  if (level >= 5) return "آماتور";
  return "تازه‌کار";
}

// ─── Get Gamification Profile ───────────────────────────────────
// Calls the get_user_gamification_profile RPC. Returns a flat profile object.

export async function getGamificationProfile(): Promise<{
  success: boolean;
  error?: string;
  data?: GamificationProfile;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase.rpc("get_user_gamification_profile", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("[GAMIFICATION] Profile fetch error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as GamificationProfile };
  } catch (err) {
    console.error("[GAMIFICATION] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Process Workout Completion ─────────────────────────────────
// Called after a workout is marked 'completed'. Triggers XP award + streak update.
// Returns the celebration payload (xp gained, level up, streak).

export async function processWorkoutCompletion(
  sessionId: string
): Promise<WorkoutCompletionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase.rpc("process_workout_completion", {
      p_session_id: sessionId,
    });

    if (error) {
      console.error("[GAMIFICATION] Workout completion error:", error.message);
      return { success: false, error: error.message };
    }

    const result = data as WorkoutCompletionResult;
    return result;
  } catch (err) {
    console.error("[GAMIFICATION] Unexpected error in processWorkoutCompletion:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Check Feature Flag ─────────────────────────────────────────
// Lightweight check used by pages to gate gamification UI.

export async function isGamificationEnabled(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("is_enabled")
      .eq("feature_key", "gamification_xp_levels")
      .single();

    return data?.is_enabled ?? false;
  } catch {
    return false;
  }
}