// System Configuration Server Actions (Admin Only)
'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-log';
import type { ActionResult, SystemConfig, FeatureFlag } from './types';

/**
 * Get system configuration (admin only)
 * @returns System configuration
 */
export async function getSystemConfig(): Promise<ActionResult<SystemConfig>> {
  
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

    // Get system configuration from admin_config table
    const { data, error } = await supabase
      .from('admin_config')
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get system configuration' 
    };
  }
}

/**
 * Update system configuration (admin only)
 * @param config - System configuration to update
 * @returns Updated system configuration
 */
export async function updateSystemConfig(
  config: Partial<SystemConfig>
): Promise<ActionResult<SystemConfig>> {
  
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

    // Update system configuration
    const { data, error } = await supabase
      .from('admin_config')
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'config_updated',
      target_type: 'system_config',
      target_id: data?.id,
      action_details: { updated_fields: Object.keys(config) },
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update system configuration'
    };
  }
}

export interface Country {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

/**
 * Get all active countries
 * @returns ActionResult with countries list
 */
export async function getCountries(): Promise<ActionResult<Country[]>> {
  
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('countries')
      .select('id, name, code, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get countries'
    };
  }
}

/**
 * Get all feature flags (admin only)
 * Reads from the feature_flags table — the same table the athlete PWA reads from
 * @returns ActionResult with feature flags list
 */
export async function getAllFeatureFlags(): Promise<ActionResult<FeatureFlag[]>> {
  
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
      .from('feature_flags')
      .select('*')
      .order('feature_key');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get feature flags'
    };
  }
}

/**
 * Update a feature flag (admin only)
 * Writes to the feature_flags table — changes propagate to athlete PWA
 * @param featureKey - The feature key to update
 * @param isEnabled - Whether the feature should be enabled
 * @returns ActionResult with updated feature flag
 */
export async function updateFeatureFlag(
  featureKey: string,
  isEnabled: boolean
): Promise<ActionResult<FeatureFlag>> {
  
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
      .from('feature_flags')
      .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
      .eq('feature_key', featureKey)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'feature_flag_updated',
      target_type: 'feature_flag',
      target_id: data?.id,
      action_details: { feature_key: featureKey, is_enabled: isEnabled },
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update feature flag'
    };
  }
}