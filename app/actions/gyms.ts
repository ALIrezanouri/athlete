"use server"

import { createClient } from "@/lib/supabase/server"
import { unstable_cache } from "next/cache"
import { createClient as createPlainClient } from "@supabase/supabase-js"
import { withRetry } from "@/lib/retry"

// ── Plain Supabase client (no cookies) ────────────────────────────────────────
// Used inside unstable_cache callbacks which run outside request context.
function createPlainSupabaseClient() {
  return createPlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Module-level TTL caches ──────────────────────────────────────────────────
// Sport types, popular gyms, and gym equipment rarely change. Cache at module
// level to avoid hitting Supabase on every request. TTL = 5 minutes.
let _sportTypesCache: { data: string[]; ts: number } | null = null
let _popularGymsCache: { data: GymListItem[]; ts: number } | null = null
let _gymEquipmentCache: { data: Map<string, Set<string>>; ts: number } | null = null
let _upcomingBookingsCache: { userId: string; data: Array<{
  id: string
  gym_id: string
  gym_name: string
  sport_type: string | null
  booking_date: string
  time_slot: string
  amount: number
  status: string
}>; ts: number } | null = null
const GYM_CACHE_TTL_MS = 5 * 60 * 1000

// ── Types ────────────────────────────────────────────────────────────────────

interface GymFilters {
  sportType?: string
  search?: string
  sortBy?: "rating" | "price" | "distance"
  isOpenNow?: boolean
}

interface GymListItem {
  id: string
  name: string
  address: string
  city: string
  area: string | null
  avg_rating: number
  review_count: number
  price_per_session: number
  open_time: string
  close_time: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  instagram: string | null
  website: string | null
  primary_photo_url: string | null
  sport_types: string[]
  amenities: string[]
}

interface GymDetail {
  id: string
  name: string
  description: string | null
  address: string
  city: string
  area: string | null
  avg_rating: number
  review_count: number
  price_per_session: number
  open_time: string
  close_time: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  instagram: string | null
  website: string | null
  photos: { url: string; is_primary: boolean; sort_order: number }[]
  amenities: string[]
  sport_types: string[]
  trainers: { name: string; specialty: string | null; photo_url: string | null }[]
  reviews: { athlete_name: string | null; rating: number; comment: string | null; created_at: string }[]
}

interface TimeSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
  is_available: boolean
}

// ── unstable_cache: Sport Types ───────────────────────────────────────────────
// Sport types are public data — no auth needed. Cached for 5 min.
const cachedFetchSportTypes = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPlainSupabaseClient()
    const { data, error } = await supabase
      .from("gym_sport_types")
      .select("sport_key")
      .order("sport_key")

    if (error) {
      console.error("[GYMS] Error fetching sport types (cached):", error)
      return []
    }

    return [...new Set((data ?? []).map((row) => row.sport_key))]
  },
  ["sport-types"],
  { revalidate: 300, tags: ["gyms"] }
)

// ── Server Action: Get Sport Types ──────────────────────────────────────────
// Fetches distinct sport type keys from gym_sport_types table
export async function getSportTypes(): Promise<{
  success: boolean
  error?: string
  data?: string[]
}> {
  // Return cached data if still fresh
  if (_sportTypesCache && Date.now() - _sportTypesCache.ts < GYM_CACHE_TTL_MS) {
    return { success: true, data: _sportTypesCache.data }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const uniqueKeys = await cachedFetchSportTypes()
    _sportTypesCache = { data: uniqueKeys, ts: Date.now() }
    return { success: true, data: uniqueKeys }
  } catch (err) {
    console.error("[GYMS] Unexpected error in getSportTypes:", err)
    return { success: false, error: "Failed to fetch sport types" }
  }
}

// ── unstable_cache: Gyms list ─────────────────────────────────────────────────
// Gyms are public data. Filters are serialized into the cache key automatically
// by unstable_cache based on the function arguments.
const cachedFetchGyms = unstable_cache(
  async (filtersJson: string): Promise<GymListItem[]> => {
    const filters: GymFilters = JSON.parse(filtersJson)
    const supabase = createPlainSupabaseClient()

    // ── Step 1: If sportType filter is active, find matching gym IDs first ──
    let gymIdsForSportFilter: string[] | null = null

    if (filters.sportType) {
      const { data: sportMatches, error: sportError } = await supabase
        .from("gym_sport_types")
        .select("gym_id")
        .eq("sport_key", filters.sportType)

      if (sportError) {
        console.error("[GYMS] Error filtering by sport type:", sportError)
        return []
      }

      gymIdsForSportFilter = (sportMatches ?? []).map((row) => row.gym_id)

      if (gymIdsForSportFilter.length === 0) {
        return []
      }
    }

    // ── Step 2: Build main gyms query ──
    let query = supabase
      .from("gyms")
      .select(
        `
        id,
        name,
        address,
        city,
        area,
        avg_rating,
        review_count,
        price_per_session,
        open_time,
        close_time,
        latitude,
        longitude,
        phone,
        instagram,
        website
      `
      )
      .eq("is_active", true)

    if (gymIdsForSportFilter) {
      query = query.in("id", gymIdsForSportFilter)
    }

    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim()
      query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
    }

    switch (filters.sortBy) {
      case "price":
        query = query.order("price_per_session", { ascending: true })
        break
      case "rating":
        query = query.order("avg_rating", { ascending: false })
        break
      default:
        query = query.order("avg_rating", { ascending: false })
        break
    }

    const { data: gyms, error: gymsError } = await query

    if (gymsError) {
      console.error("[GYMS] Error fetching gyms:", gymsError)
      return []
    }

    if (!gyms || gyms.length === 0) {
      return []
    }

    // ── Step 3: Fetch related data for all gyms in parallel ──
    const gymIds = gyms.map((g) => g.id)

    const [photosResult, amenitiesResult, sportTypesResult] = await Promise.all([
      supabase
        .from("gym_photos")
        .select("gym_id, url")
        .in("gym_id", gymIds)
        .eq("is_primary", true),
      supabase
        .from("gym_amenities")
        .select("gym_id, amenity_key")
        .in("gym_id", gymIds),
      supabase
        .from("gym_sport_types")
        .select("gym_id, sport_key")
        .in("gym_id", gymIds),
    ])

    const photoMap = new Map<string, string>()
    if (photosResult.data) {
      for (const photo of photosResult.data) {
        photoMap.set(photo.gym_id, photo.url)
      }
    }

    const amenitiesMap = new Map<string, string[]>()
    if (amenitiesResult.data) {
      for (const amenity of amenitiesResult.data) {
        const existing = amenitiesMap.get(amenity.gym_id) ?? []
        existing.push(amenity.amenity_key)
        amenitiesMap.set(amenity.gym_id, existing)
      }
    }

    const sportTypesMap = new Map<string, string[]>()
    if (sportTypesResult.data) {
      for (const st of sportTypesResult.data) {
        const existing = sportTypesMap.get(st.gym_id) ?? []
        existing.push(st.sport_key)
        sportTypesMap.set(st.gym_id, existing)
      }
    }

    // ── Step 4: Assemble final gym list ──
    return gyms.map((gym) => ({
      id: gym.id,
      name: gym.name,
      address: gym.address,
      city: gym.city,
      area: gym.area,
      avg_rating: Number(gym.avg_rating),
      review_count: gym.review_count,
      price_per_session: Number(gym.price_per_session),
      open_time: gym.open_time,
      close_time: gym.close_time,
      latitude: gym.latitude ? Number(gym.latitude) : null,
      longitude: gym.longitude ? Number(gym.longitude) : null,
      phone: gym.phone,
      instagram: gym.instagram,
      website: gym.website,
      primary_photo_url: photoMap.get(gym.id) ?? null,
      sport_types: sportTypesMap.get(gym.id) ?? [],
      amenities: amenitiesMap.get(gym.id) ?? [],
    }))
  },
  ["gyms-list"],
  { revalidate: 300, tags: ["gyms"] }
)

// ── Server Action: Get Gyms ─────────────────────────────────────────────────
// Fetches gym list with optional filters and related data
export async function getGyms(filters?: GymFilters): Promise<{
  success: boolean
  error?: string
  data?: GymListItem[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const filtersJson = JSON.stringify(filters ?? {})
    const gymList = await cachedFetchGyms(filtersJson)
    return { success: true, data: gymList }
  } catch (err) {
    console.error("[GYMS] Unexpected error in getGyms:", err)
    return { success: false, error: "Failed to fetch gyms" }
  }
}

// ── unstable_cache: Gym Detail ────────────────────────────────────────────────
// Gym detail is public data. Cached for 5 min per gymId.
const cachedFetchGymDetail = unstable_cache(
  async (gymId: string): Promise<GymDetail | null> => {
    const supabase = createPlainSupabaseClient()

    // ── Step 1: Fetch the gym itself ──
    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .select(
        `
        id,
        name,
        description,
        address,
        city,
        area,
        avg_rating,
        review_count,
        price_per_session,
        open_time,
        close_time,
        latitude,
        longitude,
        phone,
        instagram,
        website
      `
      )
      .eq("id", gymId)
      .eq("is_active", true)
      .single()

    if (gymError || !gym) {
      console.error("[GYMS] Error fetching gym detail:", gymError)
      return null
    }

    // ── Step 2: Fetch all related data in parallel ──
    const [photosResult, amenitiesResult, sportTypesResult, trainersResult, reviewsResult] =
      await Promise.all([
        supabase
          .from("gym_photos")
          .select("url, is_primary, sort_order")
          .eq("gym_id", gymId)
          .order("sort_order"),
        supabase
          .from("gym_amenities")
          .select("amenity_key")
          .eq("gym_id", gymId),
        supabase
          .from("gym_sport_types")
          .select("sport_key")
          .eq("gym_id", gymId),
        supabase
          .from("gym_trainers")
          .select("name, specialty, photo_url")
          .eq("gym_id", gymId),
        supabase
          .from("gym_reviews")
          .select("athlete_id, rating, comment, created_at")
          .eq("gym_id", gymId)
          .order("created_at", { ascending: false }),
      ])

    // ── Step 3: For reviews, fetch athlete names ──
    // Using plain client — profiles RLS may restrict names for other users.
    let reviews: { athlete_name: string | null; rating: number; comment: string | null; created_at: string }[] = []

    if (reviewsResult.data && reviewsResult.data.length > 0) {
      const reviewerIds = reviewsResult.data.map((r) => r.athlete_id)

      const { data: reviewerProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reviewerIds)

      const nameMap = new Map<string, string>()
      if (reviewerProfiles) {
        for (const p of reviewerProfiles) {
          nameMap.set(p.id, p.full_name ?? "Athlete")
        }
      }

      reviews = reviewsResult.data.map((r) => ({
        athlete_name: nameMap.get(r.athlete_id) ?? "Athlete",
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      }))
    }

    // ── Step 4: Assemble final gym detail ──
    return {
      id: gym.id,
      name: gym.name,
      description: gym.description,
      address: gym.address,
      city: gym.city,
      area: gym.area,
      avg_rating: Number(gym.avg_rating),
      review_count: gym.review_count,
      price_per_session: Number(gym.price_per_session),
      open_time: gym.open_time,
      close_time: gym.close_time,
      latitude: gym.latitude ? Number(gym.latitude) : null,
      longitude: gym.longitude ? Number(gym.longitude) : null,
      phone: gym.phone,
      instagram: gym.instagram,
      website: gym.website,
      photos: (photosResult.data ?? []).map((p) => ({
        url: p.url,
        is_primary: p.is_primary,
        sort_order: p.sort_order,
      })),
      amenities: (amenitiesResult.data ?? []).map((a) => a.amenity_key),
      sport_types: (sportTypesResult.data ?? []).map((s) => s.sport_key),
      trainers: (trainersResult.data ?? []).map((t) => ({
        name: t.name,
        specialty: t.specialty,
        photo_url: t.photo_url,
      })),
      reviews,
    }
  },
  ["gym-detail"],
  { revalidate: 300, tags: ["gyms"] }
)

// ── Server Action: Get Gym Detail ───────────────────────────────────────────
// Fetches full gym detail with all related data joins
export async function getGymDetail(gymId: string): Promise<{
  success: boolean
  error?: string
  data?: GymDetail
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const gymDetail = await cachedFetchGymDetail(gymId)

    if (!gymDetail) {
      return { success: false, error: "Gym not found" }
    }

    return { success: true, data: gymDetail }
  } catch (err) {
    console.error("[GYMS] Unexpected error in getGymDetail:", err)
    return { success: false, error: "Failed to fetch gym detail" }
  }
}

// ── unstable_cache: Gym Time Slots (single date) ─────────────────────────────
// Time slots are public data. Cached for 5 min.
const cachedFetchGymTimeSlots = unstable_cache(
  async (gymId: string, date: string): Promise<TimeSlot[]> => {
    const supabase = createPlainSupabaseClient()
    const { data, error } = await supabase
      .from("gym_time_slots")
      .select("id, date, start_time, end_time, capacity, booked_count, is_available")
      .eq("gym_id", gymId)
      .eq("date", date)
      .order("start_time")

    if (error) {
      console.error("[GYMS] Error fetching time slots (cached):", error)
      return []
    }

    return (data ?? []).map((slot) => ({
      id: slot.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      capacity: slot.capacity,
      booked_count: slot.booked_count,
      is_available: slot.is_available,
    }))
  },
  ["gym-time-slots"],
  { revalidate: 300, tags: ["gyms"] }
)

// ── Server Action: Get Gym Time Slots (single date) ─────────────────────────
export async function getGymTimeSlots(
  gymId: string,
  date: string
): Promise<{
  success: boolean
  error?: string
  data?: TimeSlot[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const timeSlots = await cachedFetchGymTimeSlots(gymId, date)
    return { success: true, data: timeSlots }
  } catch (err) {
    console.error("[GYMS] Unexpected error in getGymTimeSlots:", err)
    return { success: false, error: "Failed to fetch time slots" }
  }
}

// ── unstable_cache: Gym Time Slots (date range) ──────────────────────────────
const cachedFetchGymTimeSlotsForDateRange = unstable_cache(
  async (gymId: string, startDate: string, endDate: string): Promise<TimeSlot[]> => {
    const supabase = createPlainSupabaseClient()
    const { data, error } = await supabase
      .from("gym_time_slots")
      .select("id, date, start_time, end_time, capacity, booked_count, is_available")
      .eq("gym_id", gymId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date")
      .order("start_time")

    if (error) {
      console.error("[GYMS] Error fetching time slots for date range (cached):", error)
      return []
    }

    return (data ?? []).map((slot) => ({
      id: slot.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      capacity: slot.capacity,
      booked_count: slot.booked_count,
      is_available: slot.is_available,
    }))
  },
  ["gym-time-slots-range"],
  { revalidate: 300, tags: ["gyms"] }
)

// ── Server Action: Get Gym Time Slots (date range) ──────────────────────────
export async function getGymTimeSlotsForDateRange(
  gymId: string,
  startDate: string,
  endDate: string
): Promise<{
  success: boolean
  error?: string
  data?: TimeSlot[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const timeSlots = await cachedFetchGymTimeSlotsForDateRange(gymId, startDate, endDate)
    return { success: true, data: timeSlots }
  } catch (err) {
    console.error("[GYMS] Unexpected error in getGymTimeSlotsForDateRange:", err)
    return { success: false, error: "Failed to fetch time slots" }
  }
}

// ── Server Action: Get Gym By ID ─────────────────────────────────────────────
// Wrapper around getGymDetail for consistency with naming conventions
export async function getGymById(gymId: string): Promise<{
  success: boolean
  error?: string
  data?: GymDetail
}> {
  return getGymDetail(gymId)
}

// ── unstable_cache: Popular Gyms ──────────────────────────────────────────────
// Popular gyms are public data. Cached for 5 min.
const cachedFetchPopularGyms = unstable_cache(
  async (limit: number): Promise<GymListItem[]> => {
    const supabase = createPlainSupabaseClient()

    const { data: gyms, error: gymsError } = await supabase
      .from("gyms")
      .select(
        `
        id,
        name,
        address,
        city,
        area,
        avg_rating,
        review_count,
        price_per_session,
        open_time,
        close_time,
        latitude,
        longitude,
        phone,
        instagram,
        website
      `
      )
      .eq("is_active", true)
      .order("avg_rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(limit)

    if (gymsError) {
      console.error("[GYMS] Error fetching popular gyms (cached):", gymsError)
      return []
    }

    if (!gyms || gyms.length === 0) {
      return []
    }

    const gymIds = gyms.map((g) => g.id)

    const [photosResult, amenitiesResult, sportTypesResult] = await Promise.all([
      supabase
        .from("gym_photos")
        .select("gym_id, url")
        .in("gym_id", gymIds)
        .eq("is_primary", true),
      supabase
        .from("gym_amenities")
        .select("gym_id, amenity_key")
        .in("gym_id", gymIds),
      supabase
        .from("gym_sport_types")
        .select("gym_id, sport_key")
        .in("gym_id", gymIds),
    ])

    const photoMap = new Map<string, string>()
    if (photosResult.data) {
      for (const photo of photosResult.data) {
        photoMap.set(photo.gym_id, photo.url)
      }
    }

    const amenitiesMap = new Map<string, string[]>()
    if (amenitiesResult.data) {
      for (const amenity of amenitiesResult.data) {
        const existing = amenitiesMap.get(amenity.gym_id) ?? []
        existing.push(amenity.amenity_key)
        amenitiesMap.set(amenity.gym_id, existing)
      }
    }

    const sportTypesMap = new Map<string, string[]>()
    if (sportTypesResult.data) {
      for (const st of sportTypesResult.data) {
        const existing = sportTypesMap.get(st.gym_id) ?? []
        existing.push(st.sport_key)
        sportTypesMap.set(st.gym_id, existing)
      }
    }

    return gyms.map((gym) => ({
      id: gym.id,
      name: gym.name,
      address: gym.address,
      city: gym.city,
      area: gym.area,
      avg_rating: Number(gym.avg_rating),
      review_count: gym.review_count,
      price_per_session: Number(gym.price_per_session),
      open_time: gym.open_time,
      close_time: gym.close_time,
      latitude: gym.latitude ? Number(gym.latitude) : null,
      longitude: gym.longitude ? Number(gym.longitude) : null,
      phone: gym.phone,
      instagram: gym.instagram,
      website: gym.website,
      primary_photo_url: photoMap.get(gym.id) ?? null,
      sport_types: sportTypesMap.get(gym.id) ?? [],
      amenities: amenitiesMap.get(gym.id) ?? [],
    }))
  },
  ["popular-gyms"],
  { revalidate: 300, tags: ["gyms"] }
)

// ── Server Action: Get Popular Gyms ─────────────────────────────────────────
// Returns gyms sorted by rating and review count
export async function getPopularGyms(limit: number = 10): Promise<{
  success: boolean
  error?: string
  data?: GymListItem[]
}> {
  // Return module-level cached data if still fresh
  if (
    _popularGymsCache &&
    Date.now() - _popularGymsCache.ts < GYM_CACHE_TTL_MS &&
    _popularGymsCache.data.length <= limit
  ) {
    return { success: true, data: _popularGymsCache.data.slice(0, limit) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const gymList = await cachedFetchPopularGyms(limit)

    // Update module-level cache as secondary layer
    _popularGymsCache = { data: gymList, ts: Date.now() }
    return { success: true, data: gymList }
  } catch (err) {
    console.error("[GYMS] Unexpected error in getPopularGyms:", err)
    return { success: false, error: "Failed to fetch popular gyms" }
  }
}

// ── Server Action: Get Upcoming Bookings ─────────────────────────────────────
// Returns the user's upcoming bookings with gym details.
// USER-SPECIFIC: Cannot use unstable_cache (no cookies). Uses module-level TTL
// cache keyed by userId as a lighter-weight alternative.
export async function getUpcomingBookings(limit: number = 5): Promise<{
  success: boolean
  error?: string
  data?: Array<{
    id: string
    gym_id: string
    gym_name: string
    sport_type: string | null
    booking_date: string
    time_slot: string
    amount: number
    status: string
  }>
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // Return module-level cached data if still fresh and same user
  if (
    _upcomingBookingsCache &&
    _upcomingBookingsCache.userId === user.id &&
    Date.now() - _upcomingBookingsCache.ts < GYM_CACHE_TTL_MS
  ) {
    return { success: true, data: _upcomingBookingsCache.data.slice(0, limit) }
  }

  // Fetch upcoming bookings (status: 'upcoming' or 'active')
  // NOTE: bookings table has no booking_date column — the session date lives in
  // gym_time_slots.date.  We filter by status only and will enrich with slot date.
  const { data: bookings, error: bookingsError } = await withRetry(
    () => supabase
      .from("bookings")
      .select(`
        id,
        gym_id,
        time_slot_id,
        amount,
        status,
        gyms (
          name
        )
      `)
      .in("status", ["upcoming", "active"])
      .order("booked_at", { ascending: true })
      .limit(limit),
    { label: "getUpcomingBookings" }
  )

  if (bookingsError) {
    console.error("[GYMS] Error fetching upcoming bookings:", bookingsError)
    return { success: false, error: "Failed to fetch upcoming bookings" }
  }

  // Fetch time slot details for each booking (includes the session date)
  const bookingList = []
  if (bookings && bookings.length > 0) {
    const timeSlotIds = bookings.map((b) => b.time_slot_id)
    
    const { data: timeSlots } = await supabase
      .from("gym_time_slots")
      .select("id, date, start_time, end_time")
      .in("id", timeSlotIds)

    const timeSlotMap = new Map<string, { date: string; label: string }>()
    if (timeSlots) {
      for (const slot of timeSlots) {
        timeSlotMap.set(slot.id, { date: slot.date, label: `${slot.start_time} - ${slot.end_time}` })
      }
    }

    for (const booking of bookings) {
      const slotInfo = timeSlotMap.get(booking.time_slot_id)
      bookingList.push({
        id: booking.id,
        gym_id: booking.gym_id,
        gym_name: (booking.gyms as any)?.name || "Unknown Gym",
        sport_type: null,
        booking_date: slotInfo?.date ?? "",
        time_slot: slotInfo?.label ?? "",
        amount: Number(booking.amount),
        status: booking.status,
      })
    }
  }

  // Update module-level cache
  _upcomingBookingsCache = { userId: user.id, data: bookingList, ts: Date.now() }

  return { success: true, data: bookingList }
}

// ── Types: Gym Suggestion ────────────────────────────────────────────────────

export interface GymSuggestion {
  gym: GymListItem
  matchScore: number
  matchedEquipment: string[]
  missingEquipment: string[]
  distance?: number
}

// ── Helper: Haversine Distance ───────────────────────────────────────────────
// Returns distance in kilometers between two lat/lng points
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ── Server Action: Get Gym Suggestions For Workout ───────────────────────────
// Finds gyms that have the equipment required by a set of exercises.
// NOTE: Cannot use unstable_cache — dynamic params (exerciseIds, userLocation)
// vary per request and the function needs auth context.
export async function getGymSuggestionsForWorkout(params: {
  exerciseIds: string[]
  userLocation?: { lat: number; lng: number }
}): Promise<{
  success: boolean
  error?: string
  data?: GymSuggestion[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  if (!params.exerciseIds || params.exerciseIds.length === 0) {
    return { success: true, data: [] }
  }

  // ── Step 1: Get distinct equipment_type_ids required by these exercises ──
  // Exclude NULL (bodyweight exercises — no gym needed for those)
  const { data: exerciseEquipment, error: exEquipError } = await withRetry(
    () => supabase
      .from("exercises")
      .select("equipment_type_id")
      .in("id", params.exerciseIds)
      .not("equipment_type_id", "is", null),
    { label: "getGymSuggestionsForWorkout.equipment" }
  )

  if (exEquipError) {
    console.error("[GYM_SUGGEST] Error fetching exercise equipment:", exEquipError)
    return { success: false, error: "Failed to fetch exercise equipment" }
  }

  // Deduplicate required equipment types
  const requiredEquipmentIds = [...new Set((exerciseEquipment ?? []).map((e) => e.equipment_type_id as string))]

  // If all exercises are bodyweight (no equipment required), no gym needed
  if (requiredEquipmentIds.length === 0) {
    return { success: true, data: [] }
  }

  // ── Step 2: Get all active gyms ──
  const { data: gyms, error: gymsError } = await withRetry(
    () => supabase
      .from("gyms")
      .select(`
        id,
        name,
        address,
        city,
        area,
        avg_rating,
        review_count,
        price_per_session,
        open_time,
        close_time,
        latitude,
        longitude,
        phone,
        instagram,
        website
      `)
      .eq("is_active", true),
    { label: "getGymSuggestionsForWorkout.gyms" }
  )

  if (gymsError) {
    console.error("[GYM_SUGGEST] Error fetching gyms:", gymsError)
    return { success: false, error: "Failed to fetch gyms" }
  }

  if (!gyms || gyms.length === 0) {
    return { success: true, data: [] }
  }

  // ── Step 3: Fetch gym equipment + photos + amenities + sport types ──
  const gymIds = gyms.map((g) => g.id)

  // Check equipment cache — skip equipment query when warm
  const equipCacheHit =
    _gymEquipmentCache !== null && Date.now() - _gymEquipmentCache.ts < GYM_CACHE_TTL_MS

  const [gymEquipResult, photosResult, amenitiesResult, sportTypesResult] = await Promise.all([
    equipCacheHit
      ? Promise.resolve({ data: null as null, error: null } as const)
      : supabase
          .from("gym_equipment")
          .select("gym_id, equipment_type_id")
          .in("gym_id", gymIds),
    supabase
      .from("gym_photos")
      .select("gym_id, url")
      .in("gym_id", gymIds)
      .eq("is_primary", true),
    supabase
      .from("gym_amenities")
      .select("gym_id, amenity_key")
      .in("gym_id", gymIds),
    supabase
      .from("gym_sport_types")
      .select("gym_id, sport_key")
      .in("gym_id", gymIds),
  ])

  // Build gym equipment map: gym_id → Set of equipment_type_ids
  let gymEquipMap: Map<string, Set<string>>
  if (equipCacheHit && _gymEquipmentCache) {
    gymEquipMap = _gymEquipmentCache.data
  } else {
    gymEquipMap = new Map<string, Set<string>>()
    if (gymEquipResult.data) {
      for (const row of gymEquipResult.data) {
        const existing = gymEquipMap.get(row.gym_id) ?? new Set<string>()
        existing.add(row.equipment_type_id)
        gymEquipMap.set(row.gym_id, existing)
      }
    }
    _gymEquipmentCache = { data: gymEquipMap, ts: Date.now() }
  }

  // Build photo map
  const photoMap = new Map<string, string>()
  if (photosResult.data) {
    for (const photo of photosResult.data) {
      photoMap.set(photo.gym_id, photo.url)
    }
  }

  // Build amenities map
  const amenitiesMap = new Map<string, string[]>()
  if (amenitiesResult.data) {
    for (const amenity of amenitiesResult.data) {
      const existing = amenitiesMap.get(amenity.gym_id) ?? []
      existing.push(amenity.amenity_key)
      amenitiesMap.set(amenity.gym_id, existing)
    }
  }

  // Build sport types map
  const sportTypesMap = new Map<string, string[]>()
  if (sportTypesResult.data) {
    for (const st of sportTypesResult.data) {
      const existing = sportTypesMap.get(st.gym_id) ?? []
      existing.push(st.sport_key)
      sportTypesMap.set(st.gym_id, existing)
    }
  }

  // ── Step 4: Score each gym ──
  const suggestions: GymSuggestion[] = []

  for (const gym of gyms) {
    const gymEquipment = gymEquipMap.get(gym.id) ?? new Set<string>()
    const matched: string[] = []
    const missing: string[] = []

    for (const reqId of requiredEquipmentIds) {
      if (gymEquipment.has(reqId)) {
        matched.push(reqId)
      } else {
        missing.push(reqId)
      }
    }

    // matchScore = percentage of required equipment this gym has
    const matchScore = (matched.length / requiredEquipmentIds.length) * 100

    // Only include gyms with at least some match
    if (matchScore > 0) {
      const gymItem: GymListItem = {
        id: gym.id,
        name: gym.name,
        address: gym.address,
        city: gym.city,
        area: gym.area,
        avg_rating: Number(gym.avg_rating),
        review_count: gym.review_count,
        price_per_session: Number(gym.price_per_session),
        open_time: gym.open_time,
        close_time: gym.close_time,
        latitude: gym.latitude ? Number(gym.latitude) : null,
        longitude: gym.longitude ? Number(gym.longitude) : null,
        phone: gym.phone,
        instagram: gym.instagram,
        website: gym.website,
        primary_photo_url: photoMap.get(gym.id) ?? null,
        sport_types: sportTypesMap.get(gym.id) ?? [],
        amenities: amenitiesMap.get(gym.id) ?? [],
      }

      let distance: number | undefined
      if (
        params.userLocation &&
        gym.latitude !== null &&
        gym.longitude !== null
      ) {
        distance = haversineDistance(
          params.userLocation.lat,
          params.userLocation.lng,
          gym.latitude,
          gym.longitude
        )
      }

      suggestions.push({
        gym: gymItem,
        matchScore: Math.round(matchScore),
        matchedEquipment: matched,
        missingEquipment: missing,
        distance,
      })
    }
  }

  // ── Step 5: Sort — matchScore DESC, then distance ASC (if available) ──
  suggestions.sort((a, b) => {
    // Higher match score first
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore
    }
    // If same score, closer distance first (only when both have distance)
    if (a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance
    }
    // If one has distance and other doesn't, prefer the one with distance
    if (a.distance !== undefined) return -1
    if (b.distance !== undefined) return 1
    return 0
  })

  // ── Step 6: Return top 10 ──
  return { success: true, data: suggestions.slice(0, 10) }
}

// ── Server Action: Get Gym Suggestions For Routine ───────────────────────────
// Extracts exercise IDs from a routine's workout blocks and delegates to
// getGymSuggestionsForWorkout(). Needs auth context to fetch routine.
export async function getGymSuggestionsForRoutine(params: {
  routineId: string
  userLocation?: { lat: number; lng: number }
}): Promise<{
  success: boolean
  error?: string
  data?: GymSuggestion[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // Fetch routine with nested days → exercises
  const { data: routine, error: routineError } = await withRetry(
    () => supabase
      .from("routines")
      .select("id, routine_days(id, routine_exercises(exercise_id))")
      .eq("id", params.routineId)
      .single(),
    { label: "getGymSuggestionsForRoutine" }
  )

  if (routineError || !routine) {
    console.error("[GYM_SUGGEST_ROUTINE] Error fetching routine:", routineError)
    return { success: false, error: "Routine not found" }
  }

  // Extract all non-null exercise_id values from routine_exercises
  const exerciseIds: string[] = []
  const days = (routine as any).routine_days || []
  for (const day of days) {
    const exercises = day.routine_exercises || []
    for (const ex of exercises) {
      if (ex.exercise_id) {
        exerciseIds.push(ex.exercise_id)
      }
    }
  }

  // Deduplicate
  const uniqueExerciseIds = [...new Set(exerciseIds)]

  if (uniqueExerciseIds.length === 0) {
    return { success: true, data: [] }
  }

  // Delegate to getGymSuggestionsForWorkout
  return getGymSuggestionsForWorkout({
    exerciseIds: uniqueExerciseIds,
    userLocation: params.userLocation,
  })
}
