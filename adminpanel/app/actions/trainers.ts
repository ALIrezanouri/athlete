// Trainer Management Server Actions
'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-log';
import type {
  GymTrainer, 
  ActionResult, 
  PaginatedResult, 
  PaginationOptions, 
  SortOptions 
} from './types';

/**
 * Get trainers for the current manager's gym
 * @param options - Pagination and sort options
 * @returns PaginatedResult with gym's trainers
 */
export async function getGymTrainers(
  options: PaginationOptions & SortOptions = {}
): Promise<ActionResult<PaginatedResult<GymTrainer>>> {
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

    if (!gym) {
      return { success: false, error: 'No gym associated with this account' };
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('gym_trainers')
      .select('*', { count: 'exact' })
      .eq('gym_id', gym.id);

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
      error: error instanceof Error ? error.message : 'Failed to get trainers' 
    };
  }
}

/**
 * Get all trainers (admin only)
 * @param options - Pagination and sort options
 * @returns PaginatedResult with all trainers
 */
export async function getAllTrainers(
  options: PaginationOptions & SortOptions = {}
): Promise<ActionResult<PaginatedResult<GymTrainer>>> {
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
      .from('gym_trainers')
      .select('*', { count: 'exact' });

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
      error: error instanceof Error ? error.message : 'Failed to get trainers' 
    };
  }
}

/**
 * Create a new trainer (admin only)
 * @param trainerData - The trainer data to create
 * @returns ActionResult with the created trainer
 */
export async function createTrainer(
  trainerData: { gym_id: string; name: string; specialty?: string | null; photo_url?: string | null }
): Promise<ActionResult<GymTrainer>> {
  
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
      .from('gym_trainers')
      .insert(trainerData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'trainer_created',
      target_type: 'trainer',
      target_id: data?.id,
      action_details: { name: trainerData.name, gym_id: trainerData.gym_id },
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create trainer'
    };
  }
}

/**
 * Update a trainer (admin only)
 * @param trainerId - The trainer ID to update
 * @param updates - Trainer fields to update
 * @returns ActionResult indicating success or failure
 */
export async function updateTrainer(
  trainerId: string,
  updates: Partial<Pick<GymTrainer, 'name' | 'specialty' | 'photo_url' | 'gym_id'>>
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
      .from('gym_trainers')
      .update(updates)
      .eq('id', trainerId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'trainer_updated',
      target_type: 'trainer',
      target_id: trainerId,
      action_details: { updates },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update trainer'
    };
  }
}

/**
 * Delete a trainer (admin only)
 * @param trainerId - The trainer ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteTrainer(
  trainerId: string
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
      .from('gym_trainers')
      .delete()
      .eq('id', trainerId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'trainer_deleted',
      target_type: 'trainer',
      target_id: trainerId,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete trainer'
    };
  }
}