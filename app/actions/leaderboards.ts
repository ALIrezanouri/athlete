"use server"

import { createClient } from "@/lib/supabase/server"

export interface LeaderboardEntry {
  rank: number
  user_id: string
  full_name: string
  avatar_url: string | null
  total_xp: number
  current_level: number
  workout_count: number
}

export interface UserRankInfo {
  rank: number
  total_xp: number
  current_level: number
  total_users: number
}

export async function getLeaderboard(params?: {
  gymId?: string
  period?: "all_time" | "monthly" | "weekly"
  limit?: number
  offset?: number
}): Promise<{
  success: boolean
  error?: string
  entries?: LeaderboardEntry[]
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: flag } = await supabase
    .from("feature_flags")
    .select("is_enabled")
    .eq("feature_key", "gamification_leaderboards")
    .single()

  if (!flag?.is_enabled) return { success: false, error: "Leaderboards not enabled" }

  const period = params?.period || "all_time"
  const limit = params?.limit || 50
  const offset = params?.offset || 0

  let rpcName = "get_global_leaderboard"
  const rpcParams: any = { p_limit: limit, p_offset: offset, p_period: period }

  if (params?.gymId) {
    rpcName = "get_gym_leaderboard"
    rpcParams.p_gym_id = params.gymId
  }

  const { data, error } = await supabase.rpc(rpcName, rpcParams)

  if (error) {
    console.error("[LEADERBOARDS] Error:", error)
    return { success: false, error: "Failed to fetch leaderboard" }
  }

  const entries: LeaderboardEntry[] = (data || []).map((r: any) => ({
    rank: r.rank,
    user_id: r.user_id,
    full_name: r.full_name || "کاربر",
    avatar_url: r.avatar_url,
    total_xp: r.total_xp,
    current_level: r.current_level,
    workout_count: r.workout_count,
  }))

  return { success: true, entries }
}

export async function getUserRank(): Promise<{
  success: boolean
  error?: string
  rank?: UserRankInfo
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data, error } = await supabase.rpc("get_user_rank", { p_user_id: user.id })

  if (error || !data || data.length === 0) {
    return { success: false, error: "Failed to fetch user rank" }
  }

  const r = data[0]
  return {
    success: true,
    rank: {
      rank: r.rank,
      total_xp: r.total_xp,
      current_level: r.current_level,
      total_users: r.total_users,
    },
  }
}