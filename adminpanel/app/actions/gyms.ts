// Gym Management Server Actions
'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-log';
import type {
  Gym,
  CreateGymInput,
  ActionResult,
  PaginatedResult,
  PaginationOptions,
  SortOptions,
  FilterOptions,
  GymPhoto,
  GymAmenity,
  GymSportType,
  GymEquipment,
  EquipmentType,
} from './types';

/**
 * Get the current manager's gyms
 * @returns ActionResult with the manager's gyms
 */
export async function getOwnGyms(): Promise<ActionResult<Gym[]>> {
  
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
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', gym.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get gyms' 
    };
  }
}

/**
 * Update the current manager's gym
 * @param gymId - The gym ID to update
 * @param updates - Gym fields to update
 * @returns ActionResult indicating success or failure
 */
export async function updateOwnGym(
  gymId: string,
  updates: Partial<Pick<Gym, 'name' | 'description' | 'address' | 'city' | 'area' | 'latitude' | 'longitude' | 'price_per_session' | 'phone' | 'instagram' | 'website' | 'open_time' | 'close_time' | 'is_active'>>
): Promise<ActionResult> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify the user owns this gym
    const { data: gym } = await supabase
      .from('gyms')
      .select('id')
      .eq('manager_id', user.id)
      .single();

    if (!gym || gym.id !== gymId) {
      return { success: false, error: 'Access denied' };
    }

    const { error } = await supabase
      .from('gyms')
      .update(updates)
      .eq('id', gymId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update gym' 
    };
  }
}

/**
 * Get all gyms (admin only)
 * @param options - Pagination, sort, and filter options
 * @returns PaginatedResult with gyms
 */
export async function getAllGyms(
  options: PaginationOptions & SortOptions & FilterOptions = {}
): Promise<ActionResult<PaginatedResult<Gym>>> {
  
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
      .from('gyms')
      .select('*', { count: 'exact' });

    // Apply filters
    if (options.search) {
      query = query.ilike('name', `%${options.search}%`);
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
      error: error instanceof Error ? error.message : 'Failed to get gyms' 
    };
  }
}

/**
 * Create a new gym (admin only)
 * @param gymData - The gym data to create
 * @returns ActionResult with the created gym
 */
export async function createGym(
  gymData: CreateGymInput
): Promise<ActionResult<Gym>> {
  
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
      .from('gyms')
      .insert(gymData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'gym_created',
      target_type: 'gym',
      target_id: data?.id,
      action_details: { name: gymData.name, city: gymData.city },
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create gym'
    };
  }
}

/**
 * Update any gym (admin only)
 * @param gymId - The gym ID to update
 * @param updates - Gym fields to update
 * @returns ActionResult indicating success or failure
 */
export async function updateGym(
  gymId: string,
  updates: Partial<Pick<Gym, 'name' | 'description' | 'address' | 'city' | 'area' | 'latitude' | 'longitude' | 'price_per_session' | 'phone' | 'instagram' | 'website' | 'open_time' | 'close_time' | 'is_active' | 'manager_id' | 'country_id'>>
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
      .from('gyms')
      .update(updates)
      .eq('id', gymId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'gym_updated',
      target_type: 'gym',
      target_id: gymId,
      action_details: { updates },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update gym'
    };
  }
}

/**
 * Delete a gym (admin only)
 * @param gymId - The gym ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteGym(
  gymId: string
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
      .from('gyms')
      .delete()
      .eq('id', gymId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'gym_deleted',
      target_type: 'gym',
      target_id: gymId,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete gym'
    };
  }
}

// ── Gym Sub-Entities (Photos, Amenities, Sport Types) ───────────────────────

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Access denied');
  return supabase;
}

// ── Gym Photos ──────────────────────────────────────────────────────────────

export async function getGymPhotos(gymId: string): Promise<ActionResult<GymPhoto[]>> {
  try {
    const supabase = await verifyAdmin();

    const { data, error } = await supabase
      .from('gym_photos')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at');

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as GymPhoto[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch gym photos' };
  }
}

export async function addGymPhoto(gymId: string, url: string, caption?: string, isPrimary?: boolean): Promise<ActionResult<GymPhoto>> {
  try {
    const supabase = await verifyAdmin();

    const { data, error } = await supabase
      .from('gym_photos')
      .insert({ gym_id: gymId, url, caption: caption || null, is_primary: isPrimary || false })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'gym_photo_added',
      target_type: 'gym_photo',
      target_id: data.id,
      action_details: { gym_id: gymId },
    });

    return { success: true, data: data as GymPhoto };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add gym photo' };
  }
}

export async function deleteGymPhoto(photoId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase.from('gym_photos').delete().eq('id', photoId);
    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'gym_photo_deleted',
      target_type: 'gym_photo',
      target_id: photoId,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete gym photo' };
  }
}

// ── Gym Amenities ───────────────────────────────────────────────────────────

export async function getGymAmenities(gymId: string): Promise<ActionResult<GymAmenity[]>> {
  try {
    const supabase = await verifyAdmin();

    const { data, error } = await supabase
      .from('gym_amenities')
      .select('*')
      .eq('gym_id', gymId)
      .order('amenity_key');

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as GymAmenity[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch gym amenities' };
  }
}

export async function addGymAmenity(gymId: string, amenityKey: string, value?: string): Promise<ActionResult<GymAmenity>> {
  try {
    const supabase = await verifyAdmin();

    const { data, error } = await supabase
      .from('gym_amenities')
      .insert({ gym_id: gymId, amenity_key: amenityKey, value: value || null })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'gym_amenity_added',
      target_type: 'gym_amenity',
      target_id: data.id,
      action_details: { gym_id: gymId, amenity_key: amenityKey },
    });

    return { success: true, data: data as GymAmenity };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add gym amenity' };
  }
}

export async function deleteGymAmenity(amenityId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase.from('gym_amenities').delete().eq('id', amenityId);
    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'gym_amenity_deleted',
      target_type: 'gym_amenity',
      target_id: amenityId,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete gym amenity' };
  }
}

// ── Gym Sport Types ─────────────────────────────────────────────────────────

export async function getGymSportTypes(gymId: string): Promise<ActionResult<GymSportType[]>> {
  try {
    const supabase = await verifyAdmin();

    const { data, error } = await supabase
      .from('gym_sport_types')
      .select('*')
      .eq('gym_id', gymId)
      .order('sport_type');

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as GymSportType[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch gym sport types' };
  }
}

export async function addGymSportType(gymId: string, sportType: string): Promise<ActionResult<GymSportType>> {
  try {
    const supabase = await verifyAdmin();

    const { data, error } = await supabase
      .from('gym_sport_types')
      .insert({ gym_id: gymId, sport_type: sportType })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'gym_sport_type_added',
      target_type: 'gym_sport_type',
      target_id: data.id,
      action_details: { gym_id: gymId, sport_type: sportType },
    });

    return { success: true, data: data as GymSportType };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add gym sport type' };
  }
}

export async function deleteGymSportType(sportTypeId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase.from('gym_sport_types').delete().eq('id', sportTypeId);
    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'gym_sport_type_deleted',
      target_type: 'gym_sport_type',
      target_id: sportTypeId,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete gym sport type' };
  }
}

// ── Gym Equipment ────────────────────────────────────────────────────────────

/**
 * Get all equipment types for a gym (with full equipment_type details)
 * @param gymId - The gym ID
 * @returns ActionResult with equipment types for the gym
 */
export async function getGymEquipment(gymId: string): Promise<ActionResult<EquipmentType[]>> {
  try {
    const supabase = await verifyAdmin();

    const { data, error } = await supabase
      .from('gym_equipment')
      .select('equipment_type_id, equipment_types(*)')
      .eq('gym_id', gymId);

    if (error) return { success: false, error: error.message };

    // Extract the joined equipment_type objects from the result
    const equipmentTypes = (data || [])
      .map((row: any) => row.equipment_types)
      .filter(Boolean) as EquipmentType[];

    return { success: true, data: equipmentTypes };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch gym equipment' };
  }
}

/**
 * Update (replace) all equipment types for a gym
 * Uses delete-all + insert pattern for full replacement
 * @param gymId - The gym ID
 * @param equipmentTypeIds - Array of equipment_type IDs (TEXT) to set for this gym
 * @returns ActionResult indicating success or failure
 */
export async function updateGymEquipment(
  gymId: string,
  equipmentTypeIds: string[]
): Promise<ActionResult<void>> {
  try {
    const supabase = await verifyAdmin();

    // 1. Delete all existing equipment for this gym
    const { error: deleteError } = await supabase
      .from('gym_equipment')
      .delete()
      .eq('gym_id', gymId);

    if (deleteError) return { success: false, error: deleteError.message };

    // 2. Insert new equipment rows (if any)
    if (equipmentTypeIds.length > 0) {
      const rows = equipmentTypeIds.map((equipmentTypeId) => ({
        gym_id: gymId,
        equipment_type_id: equipmentTypeId,
      }));

      const { error: insertError } = await supabase
        .from('gym_equipment')
        .insert(rows);

      if (insertError) return { success: false, error: insertError.message };
    }

    // 3. Log audit action
    await logAuditAction({
      action_type: 'gym_equipment_updated',
      target_type: 'gym',
      target_id: gymId,
      action_details: { equipment_type_ids: equipmentTypeIds },
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update gym equipment' };
  }
}