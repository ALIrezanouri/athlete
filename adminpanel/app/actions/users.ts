'use server';

// User Management Server Actions

import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-log';
import type {
  Profile, 
  ActionResult, 
  PaginatedResult, 
  PaginationOptions, 
  SortOptions, 
  FilterOptions,
  AthleteProfile
} from './types';

/**
 * Get the current authenticated user's profile
 * @returns ActionResult with the user's profile
 */
export async function getCurrentUserProfile(): Promise<ActionResult<Profile>> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: profile };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get profile' 
    };
  }
}

/**
 * Update the current user's own profile
 * @param updates - Profile fields to update
 * @returns ActionResult indicating success or failure
 */
export async function updateOwnProfile(
  updates: Partial<Pick<Profile, 'full_name' | 'country_id'>>
): Promise<ActionResult> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update profile' 
    };
  }
}

/**
 * Get all users (admin only)
 * @param options - Pagination, sort, and filter options
 * @returns PaginatedResult with users
 */
export async function getAllUsers(
  options: PaginationOptions & SortOptions & FilterOptions = {}
): Promise<ActionResult<PaginatedResult<Profile>>> {
  
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
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (options.role) {
      query = query.eq('role', options.role);
    }
    if (options.search) {
      query = query.ilike('full_name', `%${options.search}%`);
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
      error: error instanceof Error ? error.message : 'Failed to get users' 
    };
  }
}

/**
 * Update a user's role (admin only)
 * @param userId - The user ID to update
 * @param newRole - The new role to assign
 * @returns ActionResult indicating success or failure
 */
export async function updateUserRole(
  userId: string,
  newRole: Profile['role']
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
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action (non-blocking — failure won't affect main operation)
    await logAuditAction({
      action_type: 'user_role_changed',
      target_type: 'user',
      target_id: userId,
      action_details: { new_role: newRole },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role'
    };
  }
}

/**
 * Get athlete profile for a specific user (admin only)
 * @param userId - The user ID to fetch athlete profile for
 * @returns ActionResult with AthleteProfile data
 */
export async function getAthleteProfile(userId: string): Promise<ActionResult<AthleteProfile | null>> {
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

    const { data: athleteProfile, error } = await supabase
      .from('athlete_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // No athlete profile exists for this user — not an error
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: athleteProfile };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get athlete profile'
    };
  }
}