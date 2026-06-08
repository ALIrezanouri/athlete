// Audit Log Server Actions
'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult, PaginatedResult } from './types';

export type AuditActionType =
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_role_changed'
  | 'gym_created'
  | 'gym_updated'
  | 'gym_deleted'
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'wallet_transaction'
  | 'wallet_funds_added'
  | 'wallet_funds_deducted'
  | 'config_updated'
  | 'trainer_created'
  | 'trainer_updated'
  | 'trainer_deleted'
  | 'time_slot_created'
  | 'time_slot_updated'
  | 'time_slot_deleted'
  | 'exercise_created'
  | 'exercise_updated'
  | 'exercise_deleted'
  | 'exercise_translation_created'
  | 'exercise_translation_updated'
  | 'exercise_translation_deleted'
  | 'routine_updated'
  | 'routine_deleted'
  | 'workout_comment_deleted'
  | 'gym_photo_added'
  | 'gym_photo_deleted'
  | 'gym_amenity_added'
  | 'gym_amenity_deleted'
  | 'gym_sport_type_added'
  | 'gym_sport_type_deleted'
  | 'gym_equipment_updated'
  | 'gym_review_deleted'
  | 'gym_favorite_deleted'
  | 'translation_created'
  | 'translation_updated'
  | 'translation_deleted'
  | 'country_updated'
  | 'feature_flag_updated';

export interface AuditLog {
  id: string;
  admin_user_id: string;
  admin_name: string;
  action_type: AuditActionType;
  target_type: string;
  target_id: string | null;
  action_details: Record<string, any>;
  created_at: string;
}

export interface AuditLogFilters {
  admin_user_id?: string;
  action_type?: AuditActionType;
  start_date?: string;
  end_date?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Get audit logs with filters and pagination (admin only)
 * @param filters - Filter options for audit logs
 * @returns ActionResult with paginated audit logs
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<ActionResult<PaginatedResult<AuditLog>>> {
  
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

    // Build query
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        admin_user_id,
        action_type,
        target_type,
        target_id,
        action_details,
        created_at,
        profiles!audit_logs_admin_user_id_fkey (
          full_name
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters.admin_user_id) {
      query = query.eq('admin_user_id', filters.admin_user_id);
    }

    if (filters.action_type) {
      query = query.eq('action_type', filters.action_type);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: logs, count, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Transform data to match AuditLog interface
    const auditLogs: AuditLog[] = (logs || []).map((log: any) => ({
      id: log.id,
      admin_user_id: log.admin_user_id,
      admin_name: log.profiles?.full_name || 'Unknown',
      action_type: log.action_type,
      target_type: log.target_type,
      target_id: log.target_id,
      action_details: log.action_details,
      created_at: log.created_at,
    }));

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      success: true,
      data: {
        data: auditLogs,
        total: count || 0,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get audit logs',
    };
  }
}

/**
 * Get all admin users for filter dropdown (admin only)
 * @returns ActionResult with list of admin users
 */
export async function getAdminUsers(): Promise<ActionResult<Array<{ id: string; name: string }>>> {
  
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

    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'admin')
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    const adminList = (admins || []).map(admin => ({
      id: admin.id,
      name: admin.full_name || 'Unknown',
    }));

    return {
      success: true,
      data: adminList,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get admin users',
    };
  }
}

/**
 * Log a new audit action (admin only)
 * This function should be called from other admin actions to track changes
 * @param action - Audit action details
 * @returns ActionResult indicating success or failure
 */
export async function logAuditAction(action: {
  action_type: AuditActionType;
  target_type: string;
  target_id?: string | null;
  action_details?: Record<string, any>;
}): Promise<ActionResult> {
  
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

    const { error } = await supabase.from('audit_logs').insert({
      admin_user_id: user.id,
      action_type: action.action_type,
      target_type: action.target_type,
      target_id: action.target_id || null,
      action_details: action.action_details || {},
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to log audit action',
    };
  }
}

/**
 * Get action type labels in Persian
 * @param actionType - The action type
 * @returns Persian label for the action type
 */
export async function getActionTypeLabel(actionType: AuditActionType): Promise<string> {
  const labels: Record<AuditActionType, string> = {
    user_created: 'ایجاد کاربر',
    user_updated: 'ویرایش کاربر',
    user_deleted: 'حذف کاربر',
    user_role_changed: 'تغییر نقش کاربر',
    gym_created: 'ایجاد باشگاه',
    gym_updated: 'ویرایش باشگاه',
    gym_deleted: 'حذف باشگاه',
    booking_created: 'ایجاد رزرو',
    booking_updated: 'ویرایش رزرو',
    booking_cancelled: 'لغو رزرو',
    wallet_transaction: 'تراکنش کیف پول',
    wallet_funds_added: 'افزایش موجودی',
    wallet_funds_deducted: 'کسر موجودی',
    config_updated: 'ویرایش تنظیمات',
    trainer_created: 'ایجاد مربی',
    trainer_updated: 'ویرایش مربی',
    trainer_deleted: 'حذف مربی',
    time_slot_created: 'ایجاد زمان‌بندی',
    time_slot_updated: 'ویرایش زمان‌بندی',
    time_slot_deleted: 'حذف زمان‌بندی',
    exercise_created: 'ایجاد تمرین',
    exercise_updated: 'ویرایش تمرین',
    exercise_deleted: 'حذف تمرین',
    exercise_translation_created: 'ایجاد ترجمه تمرین',
    exercise_translation_updated: 'ویرایش ترجمه تمرین',
    exercise_translation_deleted: 'حذف ترجمه تمرین',
    routine_updated: 'ویرایش برنامه تمرین',
    routine_deleted: 'حذف برنامه تمرین',
    workout_comment_deleted: 'حذف نظر تمرین',
    gym_photo_added: 'افزودن تصویر باشگاه',
    gym_photo_deleted: 'حذف تصویر باشگاه',
    gym_amenity_added: 'افزودن امکان باشگاه',
    gym_amenity_deleted: 'حذف امکان باشگاه',
    gym_sport_type_added: 'افزودن نوع ورزش باشگاه',
    gym_sport_type_deleted: 'حذف نوع ورزش باشگاه',
    gym_equipment_updated: 'ویرایش تجهیزات باشگاه',
    gym_review_deleted: 'حذف نظر باشگاه',
    gym_favorite_deleted: 'حذف باشگاه مورد علاقه',
    translation_created: 'ایجاد ترجمه',
    translation_updated: 'ویرایش ترجمه',
    translation_deleted: 'حذف ترجمه',
    country_updated: 'ویرایش کشور',
    feature_flag_updated: 'ویرایش ویژگی',
  };

  return labels[actionType] || actionType;
}

/**
 * Get all action types for filter dropdown
 * @returns Array of action types with labels
 */
export async function getAllActionTypes(): Promise<Array<{ value: AuditActionType; label: string }>> {
  const actionTypes: AuditActionType[] = [
    'user_created',
    'user_updated',
    'user_deleted',
    'user_role_changed',
    'gym_created',
    'gym_updated',
    'gym_deleted',
    'booking_created',
    'booking_updated',
    'booking_cancelled',
    'wallet_transaction',
    'wallet_funds_added',
    'wallet_funds_deducted',
    'config_updated',
    'trainer_created',
    'trainer_updated',
    'trainer_deleted',
    'time_slot_created',
    'time_slot_updated',
    'time_slot_deleted',
    'exercise_created',
    'exercise_updated',
    'exercise_deleted',
    'exercise_translation_created',
    'exercise_translation_updated',
    'exercise_translation_deleted',
    'routine_updated',
    'routine_deleted',
    'workout_comment_deleted',
    'gym_photo_added',
    'gym_photo_deleted',
    'gym_amenity_added',
    'gym_amenity_deleted',
    'gym_sport_type_added',
    'gym_sport_type_deleted',
    'gym_equipment_updated',
    'gym_review_deleted',
    'gym_favorite_deleted',
    'translation_created',
    'translation_updated',
    'translation_deleted',
    'country_updated',
    'feature_flag_updated',
  ];

  const results = await Promise.all(
    actionTypes.map(async (type) => ({
      value: type,
      label: await getActionTypeLabel(type),
    }))
  );
  return results;
}