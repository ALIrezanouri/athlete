"use server"

import { createClient } from "@/lib/supabase/server"

// ── Types ────────────────────────────────────────────────────────────────────

export interface Challenge {
  id: string
  code: string
  title: string
  description: string
  icon: string
  banner_color: string
  challenge_type: "daily" | "weekly" | "monthly" | "special"
  goal_type: string
  goal_value: number
  xp_reward: number
  coin_reward: number
  starts_at: string
  ends_at: string
  sort_order: number
}

export interface UserChallenge extends Challenge {
  user_challenge_id: string
  progress_value: number
  is_completed: boolean
  completed_at: string | null
  reward_claimed: boolean
  claimed_at: string | null
  joined_at: string
}

// ── Server Action: Get Active Challenges for Current User ────────────────────
export async function getActiveChallenges(): Promise<{
  success: boolean
  error?: string
  challenges?: UserChallenge[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Auto-join all active challenges first
  try {
    await supabase.rpc("auto_join_active_challenges", { p_user_id: user.id })
  } catch {
    // Non-critical
  }

  // Fetch challenges joined with user progress
  const { data, error } = await supabase
    .from("user_challenges")
    .select(
      `
      id as user_challenge_id,
      progress_value,
      is_completed,
      completed_at,
      reward_claimed,
      claimed_at,
      joined_at,
      challenges!inner(*)
    `
    )
    .eq("user_id", user.id)
    .eq("challenges.is_active", true)
    .order("challenges(sort_order)", { ascending: true })

  if (error) {
    console.error("[CHALLENGES] Error fetching:", error)
    return { success: false, error: "Failed to fetch challenges" }
  }

  // Flatten the nested challenges object
  const challenges: UserChallenge[] = (data || []).map((row: any) => ({
    ...(row.challenges as Challenge),
    user_challenge_id: row.user_challenge_id,
    progress_value: row.progress_value,
    is_completed: row.is_completed,
    completed_at: row.completed_at,
    reward_claimed: row.reward_claimed,
    claimed_at: row.claimed_at,
    joined_at: row.joined_at,
  }))

  return { success: true, challenges }
}

// ── Server Action: Claim Challenge Reward ────────────────────────────────────
export async function claimChallengeReward(userChallengeId: string): Promise<{
  success: boolean
  error?: string
  xpAwarded?: number
  coinsAwarded?: number
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Check feature flag
  const { data: flag } = await supabase
    .from("feature_flags")
    .select("is_enabled")
    .eq("feature_key", "gamification_challenges")
    .single()

  if (!flag?.is_enabled) {
    return { success: false, error: "Challenges are not enabled" }
  }

  const { data, error } = await supabase.rpc("claim_challenge_reward", {
    p_user_challenge_id: userChallengeId,
  })

  if (error || !data || data.length === 0) {
    console.error("[CHALLENGES] Error claiming reward:", error)
    return { success: false, error: "Failed to claim reward" }
  }

  const result = data[0]
  if (!result.success) {
    return { success: false, error: "Reward not claimable yet" }
  }

  return {
    success: true,
    xpAwarded: result.xp_awarded,
    coinsAwarded: result.coins_awarded,
  }
}

// ── Server Action: Get Challenge Stats ───────────────────────────────────────
export async function getChallengeStats(): Promise<{
  success: boolean
  error?: string
  stats?: {
    active_count: number
    completed_count: number
    total_xp_earned: number
    total_coins_earned: number
  }
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data, error } = await supabase
    .from("user_challenges")
    .select("is_completed, reward_claimed, challenges(xp_reward, coin_reward)")
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: "Failed to fetch stats" }
  }

  const rows = data || []
  const completed = rows.filter((r: any) => r.is_completed)
  const claimed = completed.filter((r: any) => r.reward_claimed)

  const totalXp = claimed.reduce((sum, r: any) => {
    const ch = Array.isArray(r.challenges) ? r.challenges[0] : r.challenges
    return sum + (ch?.xp_reward || 0)
  }, 0)
  const totalCoins = claimed.reduce((sum, r: any) => {
    const ch = Array.isArray(r.challenges) ? r.challenges[0] : r.challenges
    return sum + (ch?.coin_reward || 0)
  }, 0)

  return {
    success: true,
    stats: {
      active_count: rows.length - completed.length,
      completed_count: completed.length,
      total_xp_earned: totalXp,
      total_coins_earned: totalCoins,
    },
  }
}