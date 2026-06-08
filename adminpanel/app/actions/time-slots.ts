// Time Slot Management Server Actions
'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-log';
import type {
  GymTimeSlot,
  ActionResult,
  PaginatedResult,
  PaginationOptions,
  SortOptions
} from './types';

// Re-export GymTimeSlot for convenience
export type { GymTimeSlot } from './types';

/**
 * Get time slots for the current manager's gym
 * @param options - Pagination and sort options
 * @returns PaginatedResult with gym's time slots
 */
export async function getGymTimeSlots(
  options: PaginationOptions & SortOptions = {}
): Promise<ActionResult<PaginatedResult<GymTimeSlot>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the gym managed by this user
    const { data: gym } = await supabase
      .from('gyms')
      .select('id')
      .eq('manager_id', user.id)
      .single();

    if (!gym || !gym.id) {
      return { success: false, error: 'No gym associated with this account' };
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('gym_time_slots')
      .select('*', { count: 'exact' })
      .eq('gym_id', gym.id);

    // Apply sorting
    if (options.field) {
      query = query.order(options.field, { ascending: options.direction === 'asc' });
    } else {
      query = query.order('date', { ascending: true }).order('start_time', { ascending: true });
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
      error: error instanceof Error ? error.message : 'Failed to get time slots' 
    };
  }
}

/**
 * Get all time slots (admin only)
 * @param options - Pagination and sort options
 * @returns PaginatedResult with all time slots
 */
export async function getAllTimeSlots(
  options: PaginationOptions & SortOptions = {}
): Promise<ActionResult<PaginatedResult<GymTimeSlot>>> {
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

    // Build query
    let query = supabase
      .from('gym_time_slots')
      .select('*', { count: 'exact' });

    // Apply sorting
    if (options.field) {
      query = query.order(options.field, { ascending: options.direction === 'asc' });
    } else {
      query = query.order('gym_id', { ascending: true }).order('date', { ascending: true }).order('start_time', { ascending: true });
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
      error: error instanceof Error ? error.message : 'Failed to get time slots'
    };
  }
}

/**
 * Create a new time slot (admin only)
 * @param slotData - Time slot creation data
 * @returns ActionResult with the created time slot
 */
export async function createTimeSlot(
  slotData: { gym_id: string; date: string; start_time: string; end_time: string; capacity: number }
): Promise<ActionResult<GymTimeSlot>> {
  
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

    const { data, error } = await supabase
      .from('gym_time_slots')
      .insert({
        ...slotData,
        booked_count: 0,
        is_available: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'time_slot_created',
      target_type: 'time_slot',
      target_id: data?.id,
      action_details: { gym_id: slotData.gym_id, date: slotData.date, start_time: slotData.start_time, end_time: slotData.end_time, capacity: slotData.capacity },
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create time slot'
    };
  }
}

/**
 * Update a time slot (admin only)
 * @param slotId - The time slot ID to update
 * @param updates - Time slot fields to update
 * @returns ActionResult indicating success or failure
 */
export async function updateTimeSlot(
  slotId: string,
  updates: Partial<Pick<GymTimeSlot, 'date' | 'start_time' | 'end_time' | 'capacity' | 'is_available' | 'gym_id'>>
): Promise<ActionResult> {
  
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

    const { error } = await supabase
      .from('gym_time_slots')
      .update(updates)
      .eq('id', slotId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'time_slot_updated',
      target_type: 'time_slot',
      target_id: slotId,
      action_details: { updates },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update time slot'
    };
  }
}

/**
 * Delete a time slot (admin only)
 * @param slotId - The time slot ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteTimeSlot(
  slotId: string
): Promise<ActionResult> {
  
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

    const { error } = await supabase
      .from('gym_time_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'time_slot_deleted',
      target_type: 'time_slot',
      target_id: slotId,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete time slot'
    };
  }
}