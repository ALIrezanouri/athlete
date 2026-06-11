"use server"

import { createClient } from "@/lib/supabase/server"
import { withRetry } from "@/lib/retry"

export async function getAthleteCoins(): Promise<{
  success: boolean
  error?: string
  balance?: number
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const { data, error } = await withRetry(
    () => supabase
      .from("athlete_coins")
      .select("balance")
      .eq("user_id", user.id)
      .single(),
    { label: "getAthleteCoins" }
  )

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return { success: true, balance: 0 }
    }
    console.error("[GAMIFICATION] Error fetching coins:", error)
    return { success: false, error: "Failed to fetch coins" }
  }

  return { success: true, balance: data.balance }
}

export async function getCoinTransactions(limit: number = 10): Promise<{
  success: boolean
  error?: string
  transactions?: any[]
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const { data, error } = await withRetry(
    () => supabase
      .from("coin_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    { label: "getCoinTransactions" }
  )

  if (error) {
    console.error("[GAMIFICATION] Error fetching coin transactions:", error)
    return { success: false, error: "Failed to fetch transactions" }
  }

  return { success: true, transactions: data }
}
