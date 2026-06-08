// Workout Session & Body Measurement Viewing Server Actions (Admin Only, Read-Only)
'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  ActionResult,
  PaginatedResult,
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  BodyMeasurement,
} from './types';

// ── Workout Sessions (Read-Only) ───────────────────────────────────────────

export async function getAllWorkoutSessions(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  userId?: string;
}): Promise<ActionResult<PaginatedResult<WorkoutSession>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') return { success: false, error: 'Access denied' };

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('workout_sessions')
      .select('*, profiles!workout_sessions_user_id_fkey(full_name)', { count: 'exact' })
      .order('start_time', { ascending: false });

    if (params?.status) query = query.eq('status', params.status);
    if (params?.userId) query = query.eq('user_id', params.userId);

    const { data, error, count } = await query.range(from, to);
    if (error) return { success: false, error: error.message };

    // Client-side search on user name
    let filtered = data || [];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((ws: any) =>
        ws.name?.toLowerCase().includes(s) ||
        ws.profiles?.full_name?.toLowerCase().includes(s)
      );
    }

    return {
      success: true,
      data: {
        data: filtered as WorkoutSession[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch workout sessions' };
  }
}

export async function getWorkoutSessionDetail(id: string): Promise<ActionResult<WorkoutSession>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') return { success: false, error: 'Access denied' };

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*, profiles!workout_sessions_user_id_fkey(full_name), workout_exercises(*, workout_sets(*))')
      .eq('id', id)
      .single();

    if (error || !data) return { success: false, error: 'Workout session not found' };
    return { success: true, data: data as WorkoutSession };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch workout session detail' };
  }
}

// ── Body Measurements (Read-Only) ──────────────────────────────────────────

export async function getAllBodyMeasurements(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  userId?: string;
}): Promise<ActionResult<PaginatedResult<BodyMeasurement>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') return { success: false, error: 'Access denied' };

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('body_measurements')
      .select('*, profiles!body_measurements_user_id_fkey(full_name)', { count: 'exact' })
      .order('measured_at', { ascending: false });

    if (params?.userId) query = query.eq('user_id', params.userId);

    const { data, error, count } = await query.range(from, to);
    if (error) return { success: false, error: error.message };

    let filtered = data || [];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((bm: any) =>
        bm.profiles?.full_name?.toLowerCase().includes(s)
      );
    }

    return {
      success: true,
      data: {
        data: filtered as BodyMeasurement[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch body measurements' };
  }
}