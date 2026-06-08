/**
 * Admin Authorization Guard
 *
 * Shared utility to verify the current user is an admin.
 * Replaces the repeated select('*') → single() pattern in every server action
 * with a minimal select('role') query.
 *
 * Usage:
 *   const result = await requireAdmin();
 *   if (!result.success) return { success: false, error: result.error };
 *   const supabase = result.supabase;
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminContext {
  success: true;
  supabase: SupabaseClient;
  userId: string;
}

export interface AdminDenied {
  success: false;
  error: string;
}

export type AdminResult = AdminContext | AdminDenied;

/**
 * Verifies the current session user has admin role.
 * Returns the Supabase client and user ID on success.
 * Uses select('role') instead of select('*') — only 1 column transferred.
 */
export async function requireAdmin(): Promise<AdminResult> {
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

    return { success: true, supabase, userId: user.id };
  } catch {
    return { success: false, error: 'Authentication check failed' };
  }
}