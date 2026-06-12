"use server"

import { createClient } from "@/lib/supabase/server"
import { withRetry } from "@/lib/retry"

// ── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string
  full_name: string | null
  mobile_number: string
  avatar_url: string | null
  fitness_level: string | null
  total_sessions: number
  created_at: string
}

interface ProfileResult {
  success: boolean
  error?: string
  profile?: ProfileData
}

interface UpdateProfileData {
  full_name?: string
  avatar_url?: string
  fitness_level?: string
}

interface FavoriteGym {
  id: string
  gym_id: string
  gym_name: string
  gym_city: string
  gym_area: string | null
  gym_avg_rating: number
  gym_price_per_session: number
  gym_image: string | null
  created_at: string
}

// ── TTL Cache for getProfile ─────────────────────────────────────────────────
let _profileCache: { data: ProfileResult; ts: number } | null = null
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000

// ── Server Action: Get Profile ───────────────────────────────────────────────
// Fetches current user's profile + athlete_profile data
export async function getProfile(): Promise<ProfileResult> {
  // Return cached data if still fresh
  if (_profileCache && Date.now() - _profileCache.ts < PROFILE_CACHE_TTL_MS) {
    return _profileCache.data
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // Parallelize profile fetch and bookings count
  const [profileResult, sessionsResult] = await Promise.all([
    withRetry(
      () => supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          mobile_number,
          avatar_url,
          created_at,
          athlete_profiles (
            fitness_level
          )
        `
        )
        .eq("id", user.id)
        .is("deleted_at", null)
        .single(),
      { label: "getProfile.profile" }
    ),
    withRetry(
      () => supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("athlete_id", user.id)
        .in("status", ["completed", "active"]),
      { label: "getProfile.sessions" }
    ),
  ])

  const { data: profile, error: profileError } = profileResult
  const { count: totalSessions } = sessionsResult

  if (profileError) {
    console.error("[PROFILE] Error fetching profile:", profileError)
    return { success: false, error: "Failed to fetch profile" }
  }

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  const athleteProfile = profile.athlete_profiles as unknown as {
    fitness_level: string | null
  } | null

  const result: ProfileResult = {
    success: true,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      mobile_number: profile.mobile_number,
      avatar_url: profile.avatar_url,
      fitness_level: athleteProfile?.fitness_level ?? null,
      total_sessions: totalSessions ?? 0,
      created_at: profile.created_at,
    },
  }

  // Cache the successful result
  _profileCache = { data: result, ts: Date.now() }

  return result
}

// ── Server Action: Update Profile ────────────────────────────────────────────
// Updates user profile and optionally athlete_profiles
export async function updateProfile(
  data: UpdateProfileData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // Update profiles table (only provided fields)
  const profileUpdates: Record<string, string> = {}
  if (data.full_name !== undefined) {
    profileUpdates.full_name = data.full_name
  }
  if (data.avatar_url !== undefined) {
    profileUpdates.avatar_url = data.avatar_url
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user.id)

    if (profileError) {
      console.error("[PROFILE] Error updating profile:", profileError)
      return { success: false, error: "Failed to update profile" }
    }

    // Invalidate profile cache on update
    _profileCache = null
  }

  // Update athlete_profiles if fitness_level provided
  if (data.fitness_level !== undefined) {
    const { error: athleteError } = await supabase
      .from("athlete_profiles")
      .update({ fitness_level: data.fitness_level })
      .eq("id", user.id)

    if (athleteError) {
      console.error("[PROFILE] Error updating athlete profile:", athleteError)
      return { success: false, error: "Failed to update fitness level" }
    }
  }

  return { success: true }
}

// ── Server Action: Get Favorite Gyms ─────────────────────────────────────────
// Gets user's favorite gyms with gym details and primary image
export async function getFavoriteGyms(): Promise<{
  success: boolean
  error?: string
  gyms?: FavoriteGym[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const { data: favorites, error: favError } = await supabase
    .from("favorite_gyms")
    .select(
      `
      id,
      gym_id,
      created_at,
      gyms (
        id,
        name,
        city,
        area,
        avg_rating,
        price_per_session
      )
    `
    )
    .eq("athlete_id", user.id)
    .order("created_at", { ascending: false })

  if (favError) {
    console.error("[PROFILE] Error fetching favorite gyms:", favError)
    return { success: false, error: "Failed to fetch favorite gyms" }
  }

  if (!favorites || favorites.length === 0) {
    return { success: true, gyms: [] }
  }

  // Get primary images for all favorited gyms
  const gymIds = favorites.map((f: { gym_id: string }) => f.gym_id)
  const { data: photos } = await supabase
    .from("gym_photos")
    .select("gym_id, url")
    .in("gym_id", gymIds)
    .eq("is_primary", true)

  const photoMap = new Map(
    (photos ?? []).map((p: { gym_id: string; url: string }) => [p.gym_id, p.url])
  )

  const gyms: FavoriteGym[] = favorites.map((f) => {
    const gymData = (f as any).gyms?.[0] as {
      id: string
      name: string
      city: string
      area: string | null
      avg_rating: number
      price_per_session: number
    } | null

    return {
      id: f.id,
      gym_id: f.gym_id,
      gym_name: gymData?.name ?? "",
      gym_city: gymData?.city ?? "",
      gym_area: gymData?.area ?? null,
      gym_avg_rating: gymData?.avg_rating ?? 0,
      gym_price_per_session: gymData?.price_per_session ?? 0,
      gym_image: photoMap.get(f.gym_id) ?? null,
      created_at: f.created_at,
    }
  })

  return { success: true, gyms }
}
