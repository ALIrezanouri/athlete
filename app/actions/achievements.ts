"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: 'workout' | 'streak' | 'strength' | 'social' | 'booking' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  goal_type: string;
  goal_value: number;
  xp_reward: number;
  progress: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  sort_order: number;
}

export interface UnlockedAchievement {
  achievement_id: string;
  code: string;
  title: string;
  icon: string;
  xp_reward: number;
  tier: string;
}

// ─── Get User Achievements ──────────────────────────────────────

export async function getUserAchievements(): Promise<{
  success: boolean;
  error?: string;
  data?: Achievement[];
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data, error } = await supabase.rpc("get_user_achievements", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("[ACHIEVEMENTS] Fetch error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Achievement[] };
  } catch (err) {
    console.error("[ACHIEVEMENTS] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Evaluate & Unlock Achievements ─────────────────────────────
// Called after workout completion, PR, booking, share, etc.
// Returns newly unlocked achievements for toast display.

export async function evaluateAchievements(): Promise<{
  success: boolean;
  error?: string;
  data?: UnlockedAchievement[];
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data, error } = await supabase.rpc("evaluate_user_achievements", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("[ACHIEVEMENTS] Evaluate error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as UnlockedAchievement[] };
  } catch (err) {
    console.error("[ACHIEVEMENTS] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Check Feature Flag ─────────────────────────────────────────

export async function isAchievementsEnabled(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("is_enabled")
      .eq("feature_key", "gamification_achievements")
      .single();

    return data?.is_enabled ?? false;
  } catch {
    return false;
  }
}

// ─── Tier styling helpers (shared) ──────────────────────────────

export const TIER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  bronze:   { bg: 'from-orange-950/40 to-amber-950/20',  border: 'border-amber-700/40',  text: 'text-amber-400',   glow: 'shadow-amber-900/20' },
  silver:   { bg: 'from-slate-800/40 to-slate-900/20',    border: 'border-slate-500/40',  text: 'text-slate-300',   glow: 'shadow-slate-700/20' },
  gold:     { bg: 'from-yellow-950/40 to-amber-950/20',   border: 'border-yellow-600/40', text: 'text-yellow-400',  glow: 'shadow-yellow-800/20' },
  platinum: { bg: 'from-cyan-950/40 to-blue-950/20',      border: 'border-cyan-500/40',   text: 'text-cyan-300',    glow: 'shadow-cyan-800/20' },
};

export const CATEGORY_LABELS: Record<string, string> = {
  workout:  'تمرین',
  streak:   'استمرار',
  strength: 'قدرت',
  social:   'اجتماعی',
  booking:  'رزرو',
  special:  'ویژه',
};