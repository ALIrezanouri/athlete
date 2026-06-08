// Translation Management Server Actions (Admin Only)
'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-log';
import type { ActionResult, Translation, PaginatedResult, PaginationOptions } from './types';

/**
 * Get all translations (admin only) — paginated
 */
export async function getAllTranslations(params?: PaginationOptions & {
  locale?: string;
  search?: string;
}): Promise<ActionResult<PaginatedResult<Translation>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('translations')
      .select('*', { count: 'exact' })
      .order('key')
      .range(from, to);

    if (params?.locale) {
      query = query.eq('locale', params.locale);
    }

    if (params?.search) {
      query = query.or(`key.ilike.%${params.search}%,value.ilike.%${params.search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get translations',
    };
  }
}

/**
 * Create a translation (admin only)
 */
export async function createTranslation(
  locale: string,
  key: string,
  value: string
): Promise<ActionResult<Translation>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const { data, error } = await supabase
      .from('translations')
      .insert({ locale, key, value })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditAction({
      action_type: 'translation_created',
      target_type: 'translation',
      target_id: data?.id,
      action_details: { locale, key, value },
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create translation',
    };
  }
}

/**
 * Update a translation (admin only)
 */
export async function updateTranslation(
  id: string,
  value: string
): Promise<ActionResult<Translation>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const { data, error } = await supabase
      .from('translations')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditAction({
      action_type: 'translation_updated',
      target_type: 'translation',
      target_id: id,
      action_details: { key: data?.key, locale: data?.locale, new_value: value },
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update translation',
    };
  }
}

/**
 * Delete a translation (admin only)
 */
export async function deleteTranslation(
  id: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    // Get translation details for audit log before deleting
    const { data: translation } = await supabase
      .from('translations')
      .select('key, locale')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('translations')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditAction({
      action_type: 'translation_deleted',
      target_type: 'translation',
      target_id: id,
      action_details: { key: translation?.key, locale: translation?.locale },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete translation',
    };
  }
}