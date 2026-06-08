// Country Management Server Actions (Admin Only)
'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-log';
import type { ActionResult, Country } from './types';

/**
 * Get all countries (admin only)
 */
export async function getAllCountries(): Promise<ActionResult<Country[]>> {
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
      .from('countries')
      .select('*')
      .order('name_en');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get countries',
    };
  }
}

/**
 * Update a country (admin only)
 */
export async function updateCountry(
  id: string,
  data: Partial<Pick<Country, 'name_en' | 'name_local' | 'is_rtl' | 'is_active' | 'currency_code' | 'currency_symbol' | 'phone_prefix' | 'currency_decimals' | 'currency_display_unit' | 'currency_unit_divisor' | 'currency_locale'>>
): Promise<ActionResult<Country>> {
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

    const { data: updated, error } = await supabase
      .from('countries')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditAction({
      action_type: 'country_updated',
      target_type: 'country',
      target_id: id,
      action_details: { updated_fields: Object.keys(data) },
    });

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update country',
    };
  }
}