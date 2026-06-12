"use server"

import { createClient } from "@/lib/supabase/server"

// ── Types ────────────────────────────────────────────────────────────────────

interface CreateBookingParams {
  timeSlotId: string
  gymId: string
}

interface CreateBookingResult {
  success: boolean
  error?: string
  data?: {
    bookingId: string
    gymName: string
    date: string
    startTime: string
    endTime: string
    price: number
    status: string
    checkInCode: string
  }
}

// ── Server Action: Create Booking ────────────────────────────────────────────
// Creates a booking for an athlete and charges their wallet.
// This is a FINANCIAL operation — validation is strict and sequential.
//
// DB triggers handle automatically after INSERT:
// - update_time_slot_availability: increments booked_count, updates is_available
// - update_wallet_balance: subtracts amount for 'session_purchase' type
export async function createBooking(
  params: CreateBookingParams
): Promise<CreateBookingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const userId = user.id
  const { timeSlotId, gymId } = params

  // ── Step 1: Validate time slot exists and is available ──
  const { data: timeSlot, error: slotError } = await supabase
    .from("gym_time_slots")
    .select("id, capacity, booked_count, is_available, date, start_time, end_time")
    .eq("id", timeSlotId)
    .single()

  if (slotError || !timeSlot) {
    console.error("[BOOKINGS] Error fetching time slot:", slotError)
    return { success: false, error: "Time slot not found" }
  }

  if (!timeSlot.is_available || timeSlot.booked_count >= timeSlot.capacity) {
    return { success: false, error: "This time slot is no longer available" }
  }

  // ── Step 2: Get gym price and name ──
  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("price_per_session, name")
    .eq("id", gymId)
    .eq("is_active", true)
    .single()

  if (gymError || !gym) {
    console.error("[BOOKINGS] Error fetching gym:", gymError)
    return { success: false, error: "Gym not found" }
  }

  const pricePerSession = Number(gym.price_per_session)

  // ── Step 3: Check user wallet balance ──
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", userId)
    .is("deleted_at", null)
    .single()

  if (profileError || !profile) {
    console.error("[BOOKINGS] Error fetching wallet balance:", profileError)
    return { success: false, error: "Failed to verify wallet balance" }
  }

  const walletBalance = Number(profile.wallet_balance)

  if (walletBalance < pricePerSession) {
    return {
      success: false,
      error: "Insufficient wallet balance. Please top up your wallet first.",
    }
  }

  // ── Step 4: Generate check_in_code ──
  // 6-char alphanumeric, excluding ambiguous chars (0/O, 1/I/L)
  const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  function generateCheckInCode(): string {
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
    }
    return code
  }
  const checkInCode = generateCheckInCode()

  // ── Step 5: Create booking ──
  // Status 'upcoming' per DB CHECK constraint
  // (valid values: 'upcoming', 'active', 'completed', 'cancelled', 'expired')
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      athlete_id: userId,
      gym_id: gymId,
      time_slot_id: timeSlotId,
      status: "upcoming",
      amount: pricePerSession,
      check_in_code: checkInCode,
    })
    .select("id, check_in_code")
    .single()

  if (bookingError || !booking) {
    console.error("[BOOKINGS] Error creating booking:", bookingError)
    return { success: false, error: "Failed to create booking" }
  }

  const bookingId = booking.id
  const finalCheckInCode = booking.check_in_code || checkInCode

  // ── Step 6: Charge wallet via wallet_transaction ──
  // Type 'session_purchase' per DB CHECK constraint
  // (valid values: 'top_up', 'session_purchase', 'refund', 'bonus')
  // The DB trigger `update_wallet_balance` will auto-update profiles.wallet_balance
  const { error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      profile_id: userId,
      type: "session_purchase",
      amount: pricePerSession,
      description: `Booking at ${gym.name}`,
      booking_id: bookingId,
    })

  if (txError) {
    console.error("[BOOKINGS] Error creating wallet transaction:", txError)
    // Wallet charge failed — attempt to cancel the booking for consistency
    // The DB trigger `update_time_slot_availability` will auto-decrement booked_count
    // when status changes to 'cancelled'
    const { error: cancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)

    if (cancelError) {
      console.error(
        "[BOOKINGS] Failed to cancel booking after wallet charge failure:",
        cancelError
      )
      // Booking exists but wallet wasn't charged — needs manual reconciliation
      return {
        success: false,
        error: "Booking created but wallet charge failed. Please contact support.",
      }
    }

    return {
      success: false,
      error: "Failed to charge wallet. Booking has been cancelled.",
    }
  }

  // ── Success ──
  // DB triggers have already updated:
  // - gym_time_slots.booked_count +1, is_available recalculated
  // - profiles.wallet_balance deducted by pricePerSession
  return {
    success: true,
    data: {
      bookingId,
      gymName: gym.name,
      date: timeSlot.date,
      startTime: timeSlot.start_time,
      endTime: timeSlot.end_time,
      price: pricePerSession,
      status: "upcoming",
      checkInCode: finalCheckInCode,
    },
  }
}
// ── Server Action: Get Bookings ───────────────────────────────────────────
// Returns ALL user's bookings (client-side filtering by status).
// Also returns check_in_code for ticket display.
export async function getBookings(): Promise<{
  success: boolean
  error?: string
  bookings?: Array<{
    id: string
    gym_id: string
    gym_name: string
    gym_image_url: string | null
    sport_type: string | null
    booking_date: string
    time_slot: string
    price: number
    status: string
    address: string
    rated: boolean
    rating: number | null
    comment: string | null
    check_in_code: string | null
  }>
}> {

  let supabase
  try {
    supabase = await createClient()
  } catch (err) {
    console.error("[getBookings] ❌ Failed to create Supabase client:", err)
    return { success: false, error: "Database connection failed" }
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("[getBookings] ❌ Auth error:", authError)
    return { success: false, error: "Authentication error" }
  }

  if (!user) {
    console.warn("[getBookings] ⚠️ No authenticated user")
    return { success: false, error: "Unauthorized" }
  }


  // Fetch ALL bookings — no status filter (client-side filtering)
  const query = supabase
    .from("bookings")
    .select(`
      id,
      gym_id,
      booked_at,
      time_slot_id,
      amount,
      status,
      check_in_code,
      gyms (
        name,
        address
      )
    `)
    .eq("athlete_id", user.id)

  const { data: bookings, error: bookingsError } = await query.order("booked_at", { ascending: false })

  if (bookingsError) {
    console.error("[getBookings] ❌ Error fetching bookings:", JSON.stringify(bookingsError, null, 2))
    return { success: false, error: "Failed to fetch bookings" }
  }


  // Fetch time slot details for each booking
  const bookingList = []
  if (bookings && bookings.length > 0) {
    const timeSlotIds = bookings.map((b) => b.time_slot_id)
    const bookingIds = bookings.map((b) => b.id)

    // Time slots and reviews are independent — run in parallel
    const [
      { data: timeSlots, error: tsError },
      { data: reviews, error: revError },
    ] = await Promise.all([
      supabase
        .from("gym_time_slots")
        .select("id, date, start_time, end_time")
        .in("id", timeSlotIds),
      supabase
        .from("gym_reviews")
        .select("booking_id, rating, comment")
        .in("booking_id", bookingIds),
    ])

    if (tsError) {
      console.error("[getBookings] ❌ Error fetching time slots:", JSON.stringify(tsError, null, 2))
      return { success: false, error: "Failed to fetch time slot details" }
    }

    const timeSlotMap = new Map()
    const slotDateMap = new Map()
    if (timeSlots) {
      for (const slot of timeSlots) {
        timeSlotMap.set(slot.id, `${slot.start_time} - ${slot.end_time}`)
        slotDateMap.set(slot.id, slot.date)
      }
    }

    if (revError) {
      console.error("[getBookings] ⚠️ Error fetching reviews (non-fatal):", JSON.stringify(revError, null, 2))
    }

    const reviewMap = new Map()
    if (reviews) {
      for (const r of reviews) {
        reviewMap.set(r.booking_id, r)
      }
    }

    for (const booking of bookings) {
      const review = reviewMap.get(booking.id)
      bookingList.push({
        id: booking.id,
        gym_id: booking.gym_id,
        gym_name: (booking.gyms as any)?.name || "Unknown Gym",
        gym_image_url: null,
        sport_type: null,
        booking_date: slotDateMap.get(booking.time_slot_id) || new Date(booking.booked_at).toLocaleDateString("fa-IR"),
        time_slot: timeSlotMap.get(booking.time_slot_id) || "",
        price: Number(booking.amount),
        status: booking.status,
        address: (booking.gyms as any)?.address || "",
        rated: !!review,
        rating: review?.rating ?? null,
        comment: review?.comment ?? null,
        check_in_code: (booking as any).check_in_code ?? null,
      })
    }
  }

  return { success: true, bookings: bookingList }
}

// ── Server Action: Cancel Booking ───────────────────────────────────────
// Cancels a booking and refunds the wallet
export async function cancelBooking(bookingId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // ── Step 1: Fetch booking details ──
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, gym_id, time_slot_id, amount, status")
    .eq("id", bookingId)
    .eq("athlete_id", user.id)
    .single()

  if (bookingError || !booking) {
    console.error("[BOOKINGS] Error fetching booking:", bookingError)
    return { success: false, error: "Booking not found" }
  }

  // Only allow cancellation of upcoming or active bookings
  if (booking.status !== "upcoming" && booking.status !== "active") {
    return { success: false, error: "Cannot cancel this booking" }
  }

  // ── Step 2: Update booking status to cancelled ──
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)

  if (updateError) {
    console.error("[BOOKINGS] Error cancelling booking:", updateError)
    return { success: false, error: "Failed to cancel booking" }
  }

  // ── Step 3: Refund wallet via wallet_transaction ──
  // Type 'refund' per DB CHECK constraint
  // The DB trigger `update_wallet_balance` will auto-update profiles.wallet_balance
  const { error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      profile_id: user.id,
      type: "refund",
      amount: booking.amount,
      description: `Refund for cancelled booking`,
      booking_id: bookingId,
    })

  if (txError) {
    console.error("[BOOKINGS] Error creating refund transaction:", txError)
    // Refund failed but booking is cancelled - needs manual reconciliation
    return {
      success: false,
      error: "Booking cancelled but refund failed. Please contact support.",
    }
  }

  return { success: true }
}

// ── Server Action: Rate Booking ────────────────────────────────────────
// Rates a completed booking
export async function rateBooking(
  bookingId: string,
  rating: number,
  comment?: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5" }
  }

  // ── Step 1: Fetch booking details ──
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, gym_id, athlete_id, status")
    .eq("id", bookingId)
    .eq("athlete_id", user.id)
    .single()

  if (bookingError || !booking) {
    console.error("[BOOKINGS] Error fetching booking:", bookingError)
    return { success: false, error: "Booking not found" }
  }

  // Only allow rating of completed bookings
  if (booking.status !== "completed") {
    return { success: false, error: "Can only rate completed bookings" }
  }

  // Check if already rated (review exists for this booking)
  const { data: existingReview } = await supabase
    .from("gym_reviews")
    .select("id, rating")
    .eq("booking_id", bookingId)
    .single()

  if (existingReview) {
    return { success: false, error: "Booking already rated" }
  }

  // ── Step 2: Create gym review ──
  const { error: reviewCreateError } = await supabase
    .from("gym_reviews")
    .insert({
      gym_id: booking.gym_id,
      athlete_id: user.id,
      booking_id: bookingId,
      rating,
      comment,
    })

  if (reviewCreateError) {
    console.error("[BOOKINGS] Error creating gym review:", reviewCreateError)
    return { success: false, error: "Failed to submit review" }
  }

  return { success: true }
}
