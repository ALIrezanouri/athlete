"use server"

import { createClient } from "@/lib/supabase/server"
import { withRetry } from "@/lib/retry"

// ── Types ────────────────────────────────────────────────────────────────────

interface WalletData {
  balance: number
  currency: string
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  booking_id: string | null
  created_at: string
}

// ── Server Action: Get Wallet ────────────────────────────────────────────────
// Gets current user's wallet balance from profiles table
export async function getWallet(): Promise<{
  success: boolean
  error?: string
  wallet?: WalletData
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const { data: profile, error: profileError } = await withRetry(
    () => supabase
      .from("profiles")
      .select("wallet_balance, country_id, countries ( currency_code )")
      .eq("id", user.id)
      .is("deleted_at", null)
      .single(),
    { label: "getWallet" }
  )

  if (profileError) {
    console.error("[WALLET] Error fetching wallet:", profileError)
    return { success: false, error: "Failed to fetch wallet" }
  }

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  const country = profile.countries as unknown as {
    currency_code: string
  } | null

  return {
    success: true,
    wallet: {
      balance: Number(profile.wallet_balance),
      currency: country?.currency_code ?? "IRR",
    },
  }
}

// ── Server Action: Get Transactions ──────────────────────────────────────────
// Gets wallet transaction history with optional booking context
export async function getTransactions(
  limit: number = 20
): Promise<{
  success: boolean
  error?: string
  transactions?: Transaction[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const { data: transactions, error: txError } = await withRetry(
    () => supabase
      .from("wallet_transactions")
      .select("id, amount, type, description, booking_id, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    { label: "getTransactions" }
  )

  if (txError) {
    console.error("[WALLET] Error fetching transactions:", txError)
    return { success: false, error: "Failed to fetch transactions" }
  }

  return {
    success: true,
    transactions: (transactions ?? []).map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount),
      type: tx.type,
      description: tx.description,
      booking_id: tx.booking_id,
      created_at: tx.created_at,
    })),
  }
}

// ── Server Action: Top Up Wallet ─────────────────────────────────────────────
// Adds funds to wallet by inserting a wallet_transaction with type 'top_up'
// The DB trigger `update_wallet_balance` will auto-update profiles.wallet_balance
export async function topUpWallet(
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  if (!amount || amount <= 0) {
    return { success: false, error: "Amount must be positive" }
  }

  // Insert wallet_transaction — the DB trigger will update the balance
  const { error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      profile_id: user.id,
      type: "top_up",
      amount: amount,
      description: `Wallet top-up: ${amount.toLocaleString()}`,
    })

  if (txError) {
    console.error("[WALLET] Error topping up wallet:", txError)
    return { success: false, error: "Failed to top up wallet" }
  }

  return { success: true }
}
