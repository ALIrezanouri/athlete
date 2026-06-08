// Wallet Management Server Actions
'use server';

import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from './audit-log';
import type {
  WalletTransaction, 
  ActionResult, 
  PaginatedResult, 
  PaginationOptions, 
  SortOptions 
} from './types';

/**
 * Get the current user's wallet balance
 * @returns ActionResult with the wallet balance
 */
export async function getOwnWalletBalance(): Promise<ActionResult<number>> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: profile?.wallet_balance || 0 };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get wallet balance' 
    };
  }
}

/**
 * Get the current user's wallet transaction history
 * @param options - Pagination and sort options
 * @returns PaginatedResult with wallet transactions
 */
export async function getOwnWalletHistory(
  options: PaginationOptions & SortOptions = {}
): Promise<ActionResult<PaginatedResult<WalletTransaction>>> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('profile_id', user.id);

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
      error: error instanceof Error ? error.message : 'Failed to get wallet history' 
    };
  }
}

/**
 * Get all wallet transactions (admin only)
 * @param options - Pagination and sort options
 * @returns PaginatedResult with all wallet transactions
 */
export async function getAllWalletTransactions(
  options: PaginationOptions & SortOptions = {}
): Promise<ActionResult<PaginatedResult<WalletTransaction>>> {
  
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
      .from('wallet_transactions')
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
      error: error instanceof Error ? error.message : 'Failed to get wallet transactions' 
    };
  }
}

/**
 * Get all wallets with user information (admin only)
 * @param options - Pagination and search options
 * @returns PaginatedResult with wallets and user info
 */
export async function getAllWallets(
  options: PaginationOptions & { search?: string } = {}
): Promise<ActionResult<PaginatedResult<any>>> {
  
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
      .select('id, full_name, mobile_number, wallet_balance, created_at', { count: 'exact' })
      .is('deleted_at', null);

    // Apply search filter
    if (options.search) {
      query = query.or(`full_name.ilike.%${options.search}%,mobile_number.ilike.%${options.search}%`);
    }

    // Apply sorting
    query = query.order('created_at', { ascending: false });

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
      error: error instanceof Error ? error.message : 'Failed to get wallets' 
    };
  }
}

/**
 * Add funds to a user's wallet (admin only)
 * Uses DB trigger for atomic balance update — only inserts transaction, trigger updates balance
 * @param profileId - The profile ID to add funds to
 * @param amount - The amount to add (must be positive)
 * @param reason - Optional reason for the transaction
 * @returns ActionResult with success status
 */
export async function addFunds(
  profileId: string,
  amount: number,
  reason?: string
): Promise<ActionResult<void>> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return { success: false, error: 'مبلغ باید مثبت باشد' };
    }

    // Verify user exists
    const { data: userProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single();

    if (fetchError || !userProfile) {
      return { success: false, error: 'کاربر یافت نشد' };
    }

    // Create transaction record — DB trigger update_wallet_balance() will atomically update the balance
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        profile_id: profileId,
        amount: amount,
        type: 'bonus',
        description: reason || 'افزایش موجودی توسط مدیر',
      });

    if (transactionError) {
      return { success: false, error: transactionError.message };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'wallet_funds_added',
      target_type: 'wallet',
      target_id: profileId,
      action_details: { amount, type: 'bonus', reason },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add funds'
    };
  }
}

/**
 * Deduct funds from a user's wallet (admin only)
 * Uses DB trigger for atomic balance update — only inserts transaction, trigger updates balance
 * @param profileId - The profile ID to deduct funds from
 * @param amount - The amount to deduct (must be positive)
 * @param reason - Optional reason for the transaction
 * @returns ActionResult with success status
 */
export async function deductFunds(
  profileId: string,
  amount: number,
  reason?: string
): Promise<ActionResult<void>> {
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return { success: false, error: 'مبلغ باید مثبت باشد' };
    }

    // Use atomic RPC to check balance AND deduct in a single transaction
    // This eliminates the race condition between read-check-insert
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('deduct_wallet_funds', {
        p_profile_id: profileId,
        p_amount: amount,
        p_reason: reason || 'کسر موجودی توسط مدیر',
      });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    // RPC returns JSONB with success field
    if (!rpcResult?.success) {
      return { success: false, error: rpcResult?.error || 'خطا در کسر موجودی' };
    }

    // Log audit action
    await logAuditAction({
      action_type: 'wallet_funds_deducted',
      target_type: 'wallet',
      target_id: profileId,
      action_details: { amount, type: 'session_purchase', reason },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deduct funds'
    };
  }
}