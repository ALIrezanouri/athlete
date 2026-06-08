// Routine Viewing & Moderation Server Actions (Admin Only)
'use server';

import { requireAdmin } from '@/lib/auth/admin-guard';
import type {
  ActionResult,
  PaginatedResult,
  Routine,
  RoutineDay,
  RoutineExercise,
  RoutineSet,
} from './types';
import { logAuditAction } from './audit-log';

// ── Routines (Read-Only + Delete for Moderation) ────────────────────────────

export async function getAllRoutines(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  isPublic?: boolean;
  isTemplate?: boolean;
}): Promise<ActionResult<PaginatedResult<Routine>>> {
  try {
    const adminResult = await requireAdmin();
    if (!adminResult.success) return { success: false, error: adminResult.error };
    const { supabase } = adminResult;

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('routines')
      .select('*, profiles!routines_user_id_fkey(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params?.isPublic !== undefined) query = query.eq('is_public', params.isPublic);
    if (params?.isTemplate !== undefined) query = query.eq('is_template', params.isTemplate);

    const { data, error, count } = await query.range(from, to);
    if (error) return { success: false, error: error.message };

    let filtered = data || [];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((r: any) =>
        r.name?.toLowerCase().includes(s) ||
        r.profiles?.full_name?.toLowerCase().includes(s)
      );
    }

    return {
      success: true,
      data: {
        data: filtered as Routine[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch routines' };
  }
}

export async function getRoutineDetail(id: string): Promise<ActionResult<{
  routine: Routine;
  user_name: string;
  days: Array<RoutineDay & { exercises: Array<RoutineExercise & { sets: RoutineSet[] }> }>;
}>> {
  try {
    const adminResult = await requireAdmin();
    if (!adminResult.success) return { success: false, error: adminResult.error };
    const { supabase } = adminResult;

    // Single nested join query — replaces N+1 (was 1 + D + D×E queries, now just 1)
    const { data: routineData, error: routineError } = await supabase
      .from('routines')
      .select(`
        *,
        profiles!routines_user_id_fkey(full_name),
        routine_days(
          *,
          routine_exercises(
            *,
            routine_sets(*)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (routineError || !routineData) return { success: false, error: 'Routine not found' };

    // Map nested join results to expected shape, applying sort order
    const days = (routineData.routine_days || [])
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.sort_order as number) - (b.sort_order as number));

    const daysWithExercises: Array<RoutineDay & { exercises: Array<RoutineExercise & { sets: RoutineSet[] }> }> = days.map(
      (day: Record<string, unknown>) => ({
        ...day,
        exercises: ((day.routine_exercises as Record<string, unknown>[]) || [])
          .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
          .map((ex: Record<string, unknown>) => ({
            ...ex,
            sets: ((ex.routine_sets as RoutineSet[]) || []).sort(
              (a, b) => a.set_number - b.set_number
            ),
          })) as Array<RoutineExercise & { sets: RoutineSet[] }>,
      })
    );

    return {
      success: true,
      data: {
        routine: routineData as unknown as Routine,
        user_name: (routineData.profiles as Record<string, unknown>)?.full_name as string || '—',
        days: daysWithExercises,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch routine detail' };
  }
}

export async function deleteRoutine(routineId: string): Promise<ActionResult<void>> {
  try {
    const adminResult = await requireAdmin();
    if (!adminResult.success) return { success: false, error: adminResult.error };
    const { supabase } = adminResult;

    // Get routine name for audit log
    const { data: routine } = await supabase
      .from('routines')
      .select('name')
      .eq('id', routineId)
      .single();

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId);

    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'routine_deleted',
      target_type: 'routine',
      target_id: routineId,
      action_details: { name: routine?.name || routineId },
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete routine' };
  }
}