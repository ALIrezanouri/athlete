"use server"

import { createClient as createServiceClient, type User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

// ── Types ────────────────────────────────────────────────────────────────────
interface AuthResult {
  success: boolean
  error?: string
  profile?: {
    id: string
    mobile_number: string
    role: string
    full_name: string | null
    onboarding_completed: boolean
  }
}

interface OnboardingData {
  full_name: string
  date_of_birth: string | null
  gender: string | null
  fitness_level: string
  sport_preferences: string[]
  home_gym_id: string | null
}

interface OnboardingResult {
  success: boolean
  error?: string
}

// ── Service Role Client (bypasses RLS) ───────────────────────────────────────
function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// ── Phone Prefix Map (country code → E.164 prefix) ──────────────────────────
const COUNTRY_PREFIX: Record<string, string> = {
  IR: "+98",
  AE: "+971",
  US: "+1",
  TR: "+90",
}

// ── Convert local phone to E.164 ────────────────────────────────────────────
function toE164(localPhone: string, countryCode: string): string {
  const prefix = COUNTRY_PREFIX[countryCode] ?? "+98"
  // Strip leading zeros from local number, then prepend country prefix
  const stripped = localPhone.replace(/^0+/, "")
  return `${prefix}${stripped}`
}

// ── Find user by phone with pagination ──────────────────────────────────────
// listUsers() is paginated (default limit ~50), so we must paginate to
// reliably find a user by phone number across all pages.
const LIST_USERS_TIMEOUT = 10_000 // 10 seconds

async function findUserByPhone(
  admin: ReturnType<typeof createAdminClient>,
  phone: string
): Promise<User | null> {
  // Normalize: strip leading "+" so "+989127332842" matches "989127332842"
  const normalize = (p: string) => p.replace(/^\+/, "")
  const needle = normalize(phone)
  const perPage = 100
  let page = 1
  while (true) {
    const listUsersPromise = admin.auth.admin.listUsers({ page, perPage })
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("listUsers timed out")), LIST_USERS_TIMEOUT)
    )
    const {
      data: { users },
    } = await Promise.race([listUsersPromise, timeoutPromise])
    const found = users.find((u) => u.phone && normalize(u.phone) === needle)
    if (found) {
      return found
    }
    if (users.length < perPage) break // last page
    page++
  }
  return null
}

// ── Dev-mode helper: create session via magic link ──────────────────────────
// Used only in DEV mode when SMS provider is not configured.
// Generates a magic link, fetches the verification URL, extracts tokens,
// and sets session cookies via the SSR client.
async function createSessionViaMagicLink(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  const supabase = await createClient()

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    })

  // SDK may return action_link at data.properties.action_link OR data.action_link
  const actionLink = linkData?.properties?.action_link || (linkData as any)?.action_link
  if (linkError || !actionLink) {
    console.error("[AUTH] Error generating link:", linkError, "linkData keys:", linkData ? Object.keys(linkData) : 'null')
    return { success: false, error: "Failed to create session" }
  }
    let accessToken: string | null = null
    let refreshToken: string | null = null

  try {
    // Reconstruct the verify URL robustly: extract query params from the
    // generated action link and build a proper URL using NEXT_PUBLIC_SUPABASE_URL.
    // GoTrue may generate links with inconsistent host/port, so we can't rely
    // on fragile string replacement.
    const actionUrl = new URL(actionLink)
    const verifyParams = new URLSearchParams({
      token: actionUrl.searchParams.get("token") || "",
      type: actionUrl.searchParams.get("type") || "magiclink",
      redirect_to: actionUrl.searchParams.get("redirect_to") || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const fetchUrl = `${supabaseUrl}/auth/v1/verify?${verifyParams.toString()}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)
    let verifyResponse: Response
    try {
      verifyResponse = await fetch(fetchUrl, {
        redirect: "manual",
        headers: { Accept: "text/html" },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const location = verifyResponse.headers.get("location")
    if (location) {
      const hashPart = location.split("#")[1] || ""
      const params = new URLSearchParams(hashPart)
      accessToken = params.get("access_token")
      refreshToken = params.get("refresh_token")
    }

    // Fallback: try extracting from response body
    if (!accessToken && verifyResponse.status === 200) {
      const body = await verifyResponse.text()
      const tokenMatch = body.match(/access_token=([^&"']+)/)
      const refreshMatch = body.match(/refresh_token=([^&"']+)/)
      if (tokenMatch) accessToken = tokenMatch[1]
      if (refreshMatch) refreshToken = refreshMatch[1]
    }

    // Fallback 2: If verify returned 3xx with location containing tokens in query params
    if (!accessToken && location) {
      try {
        const urlObj = new URL(location)
        accessToken = urlObj.searchParams.get("access_token")
        refreshToken = urlObj.searchParams.get("refresh_token")
      } catch {}
    }
  } catch (fetchErr) {
    console.error("[AUTH] Error fetching verification URL:", fetchErr)
    return { success: false, error: "Failed to create session" }
  }

  if (!accessToken || !refreshToken) {
    console.error("[AUTH] Could not extract tokens after verification fetch. accessToken:", !!accessToken, "refreshToken:", !!refreshToken)
    return { success: false, error: "Failed to create session" }
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (sessionError) {
    console.error("[AUTH] Error setting session:", sessionError)
    return { success: false, error: sessionError.message }
  }

  return { success: true }
}

// ── Server Action: Send OTP ─────────────────────────────────────────────────
// In DEMO mode (no SMS provider), bypasses Supabase and returns devMode flag.
// In production (SMS provider configured), calls Supabase signInWithOtp.
// DEMO mode is auto-detected: if DEV_OTP env var is set OR if SMS provider
// is not configured (signInWithOtp returns "Unsupported phone provider").
export async function sendOtp(
  phone: string,
  countryCode: string
): Promise<{ success: boolean; error?: string; devMode?: boolean }> {
  if (!phone || phone.length < 8) {
    return { success: false, error: "Invalid phone number" }
  }

  const phoneE164 = toE164(phone, countryCode)
  const devOtp = process.env.DEV_OTP

  // DEV_OTP env var set → always use demo mode
  if (devOtp) {
    return { success: true, devMode: true }
  }

  // Try real Supabase OTP — if SMS provider is not configured, fall back to demo mode
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 })

  if (error) {
    // "Unsupported phone provider" means no SMS provider is configured → demo mode
    if (error.message.includes("Unsupported phone provider") || error.message.includes("phone provider")) {
      console.warn("[AUTH] No SMS provider configured, using demo mode")
      return { success: true, devMode: true }
    }
    return { success: false, error: error.message }
  }
  return { success: true, devMode: false }
}

// ── Server Action: Verify OTP & Login/Register ─────────────────────────────
// DEV mode: accepts the DEV_OTP (or any 6-digit OTP if no SMS provider),
// creates/finds user via admin, sets session.
// PRODUCTION: uses Supabase native verifyOtp({ phone, token, type: 'sms' }).
// The DB trigger auto-creates profile + athlete_profiles for new users.
export async function verifyOtp(
  phone: string,
  otp: string,
  countryCode: string = "IR"
): Promise<AuthResult> {
  const phoneE164 = toE164(phone, countryCode)
  const devOtp = process.env.DEV_OTP
  const supabase = await createClient()

  // === DEV MODE: bypass Supabase OTP ===
  // Triggered by: (1) DEV_OTP env var set and OTP matches, OR
  // (2) any 6-digit OTP when no SMS provider is configured (demo mode)
  const isDevMode = devOtp ? otp === devOtp : false

  if (isDevMode) {
    const admin = createAdminClient()

    // Try to find existing user by phone (with pagination for reliability)
    let existingUser = await findUserByPhone(admin, phoneE164)

    if (existingUser) {
      // ── Existing user: create session via magic link ──
      const email = existingUser.email!
      const sessionResult = await createSessionViaMagicLink(email)
      if (!sessionResult.success) {
        return { success: false, error: sessionResult.error }
      }

      // Fetch profile for routing decision
      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", existingUser.id)
        .is("deleted_at", null)
        .single()

      if (!profile) {
        return { success: false, error: "Profile not found" }
      }

      // Update app_metadata to include onboarding_completed in JWT claims
      await admin.auth.admin.updateUserById(existingUser.id, {
        app_metadata: { onboarding_completed: profile.onboarding_completed },
      })

      return {
        success: true,
        profile: {
          id: profile.id,
          mobile_number: profile.mobile_number,
          role: profile.role,
          full_name: profile.full_name,
          onboarding_completed: profile.onboarding_completed,
        },
      }
    } else {
      // ── New user: create via admin (DB trigger auto-creates profile) ──

      // Clean up any orphaned profiles left from previous test users.
      // A profile row can become orphaned if the auth.users row was deleted
      // (e.g., via Supabase Dashboard) but the public.profiles row remained.
      // The DB trigger will create a fresh profile for the new user.
      const { error: orphanError } = await admin
        .from("profiles")
        .delete()
        .eq("mobile_number", phoneE164)

      if (orphanError) {
        console.warn("[AUTH] Could not clean up orphaned profile:", orphanError.message)
        // Non-fatal — continue with user creation
      } else {
      }

      const email = `${phoneE164}@auth.rokhdad.internal`
      const { data: userData, error: createError } =
        await admin.auth.admin.createUser({
          email,
          phone: phoneE164,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { phone: phoneE164 },
        })

      if (createError) {
        // If phone already exists (race condition / pagination miss),
        // fall back to the existing user login flow.
        if (createError.code === "phone_exists") {
          console.warn(`[AUTH] phone_exists fallback for ${phoneE164}, resolving existing user`)
          existingUser = await findUserByPhone(admin, phoneE164)

          if (existingUser) {
            const fallbackEmail = existingUser.email!
            const sessionResult = await createSessionViaMagicLink(fallbackEmail)
            if (!sessionResult.success) {
              return { success: false, error: sessionResult.error }
            }

            const { data: fallbackProfile } = await admin
              .from("profiles")
              .select("*")
              .eq("id", existingUser.id)
              .is("deleted_at", null)
              .single()

            if (fallbackProfile) {
              await admin.auth.admin.updateUserById(existingUser.id, {
                app_metadata: { onboarding_completed: fallbackProfile.onboarding_completed },
              })
            }

            return {
              success: true,
              profile: fallbackProfile
                ? {
                    id: fallbackProfile.id,
                    mobile_number: fallbackProfile.mobile_number,
                    role: fallbackProfile.role,
                    full_name: fallbackProfile.full_name,
                    onboarding_completed: fallbackProfile.onboarding_completed,
                  }
                : undefined,
            }
          }
        }

        console.error("[AUTH] Error creating user:", {
          message: createError.message,
          status: createError.status,
          code: createError.code,
          name: createError.name,
        })
        return { success: false, error: "Failed to create account" }
      }

      // Create session via magic link
      const sessionResult = await createSessionViaMagicLink(email)
      if (!sessionResult.success) {
        return { success: false, error: sessionResult.error }
      }

      // Fetch the auto-created profile (trigger created it)
      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .is("deleted_at", null)
        .single()

      return {
        success: true,
        profile: profile
          ? {
              id: profile.id,
              mobile_number: profile.mobile_number,
              role: profile.role,
              full_name: profile.full_name,
              onboarding_completed: profile.onboarding_completed,
            }
          : undefined,
      }
    }
  }

  // === PRODUCTION MODE: use Supabase native verifyOtp ===
  // If SMS provider is not configured, auto-fallback to demo mode
  const { error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token: otp,
    type: "sms",
  })

  if (error) {
    // Auto-fallback to demo mode if no SMS provider is configured
    if (error.message.includes("Unsupported phone provider") || error.message.includes("phone provider")) {
      console.warn("[AUTH] No SMS provider configured, falling back to demo mode for verifyOtp")
      // Accept any 6-digit OTP in demo mode — create/find user via admin
      const admin = createAdminClient()
      let existingUser = await findUserByPhone(admin, phoneE164)

      if (existingUser) {
        const email = existingUser.email!
        const sessionResult = await createSessionViaMagicLink(email)
        if (!sessionResult.success) {
          return { success: false, error: sessionResult.error }
        }

        const { data: profile } = await admin
          .from("profiles")
          .select("*")
          .eq("id", existingUser.id)
          .is("deleted_at", null)
          .single()

        if (!profile) {
          return { success: false, error: "Profile not found" }
        }

        await admin.auth.admin.updateUserById(existingUser.id, {
          app_metadata: { onboarding_completed: profile.onboarding_completed },
        })

        return {
          success: true,
          profile: {
            id: profile.id,
            mobile_number: profile.mobile_number,
            role: profile.role,
            full_name: profile.full_name,
            onboarding_completed: profile.onboarding_completed,
          },
        }
      } else {
        // New user: create via admin
        const { error: orphanError } = await admin
          .from("profiles")
          .delete()
          .eq("mobile_number", phoneE164)

        if (orphanError) {
          console.warn("[AUTH] Could not clean up orphaned profile:", orphanError.message)
        }

        const email = `${phoneE164}@auth.rokhdad.internal`
        const { data: userData, error: createError } =
          await admin.auth.admin.createUser({
            email,
            phone: phoneE164,
            email_confirm: true,
            phone_confirm: true,
            user_metadata: { phone: phoneE164 },
          })

        if (createError) {
          if (createError.code === "phone_exists") {
            existingUser = await findUserByPhone(admin, phoneE164)
            if (existingUser) {
              const fallbackEmail = existingUser.email!
              const sessionResult = await createSessionViaMagicLink(fallbackEmail)
              if (!sessionResult.success) {
                return { success: false, error: sessionResult.error }
              }
              const { data: fallbackProfile } = await admin
                .from("profiles")
                .select("*")
                .eq("id", existingUser.id)
                .is("deleted_at", null)
                .single()

              if (fallbackProfile) {
                await admin.auth.admin.updateUserById(existingUser.id, {
                  app_metadata: { onboarding_completed: fallbackProfile.onboarding_completed },
                })
              }

              return {
                success: true,
                profile: fallbackProfile
                  ? {
                      id: fallbackProfile.id,
                      mobile_number: fallbackProfile.mobile_number,
                      role: fallbackProfile.role,
                      full_name: fallbackProfile.full_name,
                      onboarding_completed: fallbackProfile.onboarding_completed,
                    }
                  : undefined,
              }
            }
          }
          console.error("[AUTH] Error creating user:", createError.message)
          return { success: false, error: "Failed to create account" }
        }

        const sessionResult = await createSessionViaMagicLink(email)
        if (!sessionResult.success) {
          return { success: false, error: sessionResult.error }
        }

        const { data: profile } = await admin
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .is("deleted_at", null)
          .single()

        return {
          success: true,
          profile: profile
            ? {
                id: profile.id,
                mobile_number: profile.mobile_number,
                role: profile.role,
                full_name: profile.full_name,
                onboarding_completed: profile.onboarding_completed,
              }
            : undefined,
        }
      }
    }

    return { success: false, error: error.message }
  }

  // Fetch profile for routing decision
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Failed to get user" }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single()

  // The DB trigger auto-creates profile + athlete_profiles for new users
  return {
    success: true,
    profile: profile
      ? {
          id: profile.id,
          mobile_number: profile.mobile_number,
          role: profile.role,
          full_name: profile.full_name,
          onboarding_completed: profile.onboarding_completed,
        }
      : undefined,
  }
}

// ── Server Action: Sign Out ─────────────────────────────────────────────────
export async function signOut(): Promise<{ success: boolean }> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { success: true }
}

// ── Server Action: Get Countries (cached) ────────────────────────────────────
// Countries rarely change, so we cache them in-memory for 5 minutes.
// Uses the regular anon-key client (not admin) since this is public read data.
let countriesCache: {
  data: { id: string; name_en: string; name_local: string; is_rtl: boolean }[]
  expiresAt: number
} | null = null

const COUNTRIES_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getCountries(): Promise<
  { id: string; name_en: string; name_local: string; is_rtl: boolean }[]
> {
  // Return cached data if still fresh
  if (countriesCache && Date.now() < countriesCache.expiresAt) {
    return countriesCache.data
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("countries")
      .select("id, name_en, name_local, is_rtl")
      .eq("is_active", true)

    if (error) {
      console.error("[AUTH] getCountries error:", error.message)
      return countriesCache?.data ?? []
    }

    const result = data || []
    countriesCache = { data: result, expiresAt: Date.now() + COUNTRIES_CACHE_TTL }
    return result
  } catch (err) {
    console.error("[AUTH] getCountries unexpected error:", err)
    return countriesCache?.data ?? []
  }
}

// ── Server Action: Complete Onboarding ──────────────────────────────────────
export async function completeOnboarding(data: OnboardingData): Promise<OnboardingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const admin = createAdminClient()
  const authUserId = user.id

  try {
    // Step 2: Resolve profile by user ID (profiles.id IS auth.users.id)
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", authUserId)
      .is("deleted_at", null)
      .single()

    if (!profile) {
      console.error("[ONBOARDING] No profile found for user:", authUserId)
      return { success: false, error: "Profile not found" }
    }

    const profileId = profile.id

    // Step 3: Update profiles table — set name and mark onboarding complete
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: data.full_name,
        onboarding_completed: true,
      })
      .eq("id", profileId)

    if (profileError) {
      console.error("[ONBOARDING] Error updating profile:", profileError)
      return { success: false, error: "Failed to update profile" }
    }

    // Step 4: Insert or update athlete_profiles with fitness data
    const { data: existingAthlete } = await admin
      .from("athlete_profiles")
      .select("id")
      .eq("id", profileId)
      .single()

    const athletePayload = {
      id: profileId,
      fitness_level: data.fitness_level,
      sport_preferences: data.sport_preferences,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
    }

    let athleteError: string | null = null

    if (existingAthlete) {
      const { error } = await admin
        .from("athlete_profiles")
        .update({
          fitness_level: data.fitness_level,
          sport_preferences: data.sport_preferences,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
        })
        .eq("id", profileId)
      athleteError = error?.message ?? null
    } else {
      const { error } = await admin
        .from("athlete_profiles")
        .insert(athletePayload)
      athleteError = error?.message ?? null
    }

    if (athleteError) {
      console.error("[ONBOARDING] Error with athlete profile:", athleteError)
      return { success: false, error: "Failed to update athlete profile" }
    }

    // Step 5: Optionally add favorite gym
    if (data.home_gym_id) {
      const { error: favError } = await admin
        .from("favorite_gyms")
        .insert({
          athlete_id: profileId,
          gym_id: data.home_gym_id,
        })

      if (favError) {
        // Ignore duplicate favorite errors — not critical
        console.warn("[ONBOARDING] Error adding favorite gym:", favError)
      }
    }

    // Step 6: Update auth app_metadata so JWT reflects onboarding completion
    await admin.auth.admin.updateUserById(authUserId, {
      app_metadata: { onboarding_completed: true },
    })

    // Step 7: Refresh session so middleware sees updated claims immediately
    const { error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      console.error("[ONBOARDING] Failed to refresh session after onboarding:", refreshError)
      // Don't fail the whole operation — DB updates are done.
      // The client-side router.push("/home") will handle navigation,
      // and the session will eventually refresh on next token renewal.
    }

    return { success: true }
  } catch (err) {
    console.error("[ONBOARDING] Unexpected error:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// ── Server Action: Get Gyms for Onboarding ──────────────────────────────────
// Uses regular anon-key client since this is public read data.
export async function getGymsForOnboarding(): Promise<{
  id: string
  name: string
  city: string
  area: string | null
  avg_rating: number
  review_count: number
}[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("gyms")
      .select("id, name, city, area, avg_rating, review_count")
      .eq("is_active", true)
      .order("avg_rating", { ascending: false })
      .limit(10)

    if (error) {
      console.error("[AUTH] getGymsForOnboarding error:", error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.error("[AUTH] getGymsForOnboarding unexpected error:", err)
    return []
  }
}
