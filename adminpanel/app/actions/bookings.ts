// Booking Management Server Actions
'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-log';
import type {
  Booking, 
  ActionResult, 
  PaginatedResult, 
  PaginationOptions, 
  SortOptions, 
  FilterOptions 
} from './types';

/**
 * Get the current user's bookings
 * @param options - Pagination, sort, and filter options
 * @returns PaginatedResult with user's bookings
 */
export async function getOwnBookings(
  options: PaginationOptions & SortOptions & FilterOptions = {}
): Promise<ActionResult<PaginatedResult<Booking>>> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('athlete_id', user.id);

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status);
    }

    // Apply sorting
    if (options.field) {
      query = query.order(options.field, { ascending: options.direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return {
      success: true,
      data: {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get bookings' 
    };
  }
}

/**
 * Get bookings for the current manager's gym
 * @param options - Pagination, sort, and filter options
 * @returns PaginatedResult with gym's bookings
 */
export async function getGymBookings(
  options: PaginationOptions & SortOptions & FilterOptions = {}
): Promise<ActionResult<PaginatedResult<Booking>>> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the gym managed by this user (gyms.manager_id → profiles.id)
    const { data: gym } = await supabase
      .from('gyms')
      .select('id')
      .eq('manager_id', user.id)
      .single();

    if (!gym) {
      return { success: false, error: 'No gym associated with this account' };
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('gym_id', gym.id);

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status);
    }

    // Apply sorting
    if (options.field) {
      query = query.order(options.field, { ascending: options.direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return {
      success: true,
      data: {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get bookings' 
    };
  }
}

/**
 * Get all bookings (admin only)
 * @param options - Pagination, sort, and filter options
 * @returns PaginatedResult with all bookings including related data
 */
export async function getAllBookings(
  options: PaginationOptions & SortOptions & FilterOptions = {}
): Promise<ActionResult<PaginatedResult<Booking>>> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build query with related data
    let query = supabase
      .from('bookings')
      .select(`
        *,
        profiles!bookings_athlete_id_fkey (
          full_name,
          mobile_number
        ),
        gyms!bookings_gym_id_fkey (
          name,
          address
        ),
        gym_time_slots!bookings_time_slot_id_fkey (
          date,
          start_time,
          end_time
        )
      `, { count: 'exact' });

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status);
    }

    // Apply sorting
    if (options.field) {
      query = query.order(options.field, { ascending: options.direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Transform data to include user_name, user_phone, gym_name, gym_address, time_slot_date, time_slot_start, time_slot_end
    const transformedData = (data || []).map((booking: any) => ({
      ...booking,
      user_name: booking.profiles?.full_name,
      user_phone: booking.profiles?.mobile_number,
      gym_name: booking.gyms?.name,
      gym_address: booking.gyms?.address,
      time_slot_date: booking.gym_time_slots?.date,
      time_slot_start: booking.gym_time_slots?.start_time,
      time_slot_end: booking.gym_time_slots?.end_time,
    }));

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return {
      success: true,
      data: {
        data: transformedData,
        total: count || 0,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get bookings' 
    };
  }
}

/**
 * Update booking status (admin only)
 * @param bookingId - The booking ID to update
 * @param status - The new status ('upcoming' | 'active' | 'cancelled' | 'completed' | 'expired')
 * @returns ActionResult with success status
 */
export async function updateBookingStatus(
  bookingId: string,
  status: 'upcoming' | 'active' | 'cancelled' | 'completed' | 'expired'
): Promise<ActionResult<void>> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    // Validate status
    const validStatuses = ['upcoming', 'active', 'cancelled', 'completed', 'expired'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: 'Invalid status' };
    }

    // Update booking status
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    const auditType = status === 'cancelled' ? 'booking_cancelled' : 'booking_updated';
    await logAuditAction({
      action_type: auditType,
      target_type: 'booking',
      target_id: bookingId,
      action_details: { new_status: status },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update booking status'
    };
  }
}