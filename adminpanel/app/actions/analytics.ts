// Analytics Server Actions
'use server';

import { requireAdmin } from '@/lib/auth/admin-guard';
import type { ActionResult } from './types';

export interface AnalyticsMetrics {
  totalUsers: number;
  totalGyms: number;
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  upcomingBookings: number;
  completedBookings: number;
}

export interface UsersByRole {
  athletes: number;
  gym_managers: number;
  coaches: number;
  doctors: number;
  admins: number;
}

/**
 * Get analytics metrics (admin only)
 * @param startDate - Optional start date for filtering
 * @param endDate - Optional end date for filtering
 * @returns ActionResult with analytics metrics
 */
export async function getAnalyticsMetrics(
  startDate?: string,
  endDate?: string
): Promise<ActionResult<AnalyticsMetrics>> {
  
  try {
    const adminResult = await requireAdmin();
    if (!adminResult.success) return { success: false, error: adminResult.error };
    const { supabase } = adminResult;

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Get total gyms
    const { count: totalGyms } = await supabase
      .from('gyms')
      .select('*', { count: 'exact', head: true });

    // Count bookings by status using separate head queries (no data transfer)
    // Replaces full-table fetch + JS filtering — was O(n) transfer, now O(1)
    const buildBookingCountQuery = (status?: string) => {
      let q = supabase.from('bookings').select('*', { count: 'exact', head: true });
      if (status) q = q.eq('status', status);
      if (startDate) q = q.gte('created_at', startDate);
      if (endDate) q = q.lte('created_at', endDate);
      return q;
    };

    const [totalResult, activeResult, upcomingResult, completedResult, revenueResult] = await Promise.all([
      buildBookingCountQuery(),
      buildBookingCountQuery('active'),
      buildBookingCountQuery('upcoming'),
      buildBookingCountQuery('completed'),
      // Revenue: only fetch 'amount' column, not entire rows
      (async () => {
        let q = supabase.from('bookings').select('amount').not('amount', 'is', null);
        if (startDate) q = q.gte('created_at', startDate);
        if (endDate) q = q.lte('created_at', endDate);
        return q;
      })(),
    ]);

    const totalRevenue = revenueResult.data?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

    return {
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalGyms: totalGyms || 0,
        totalBookings: totalResult.count || 0,
        totalRevenue,
        activeBookings: activeResult.count || 0,
        upcomingBookings: upcomingResult.count || 0,
        completedBookings: completedResult.count || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analytics metrics',
    };
  }
}

/**
 * Get users count by role (admin only)
 * @returns ActionResult with users by role
 */
export async function getUsersByRole(): Promise<ActionResult<UsersByRole>> {
  
  try {
    const adminResult = await requireAdmin();
    if (!adminResult.success) return { success: false, error: adminResult.error };
    const { supabase } = adminResult;

    // Count by role using parallel head queries (no data transfer)
    // Replaces full-table fetch + JS forEach — was O(n) transfer, now O(1)
    const [athletes, gymManagers, coaches, doctors, admins] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'athlete').is('deleted_at', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'gym_manager').is('deleted_at', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'coach').is('deleted_at', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'doctor').is('deleted_at', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin').is('deleted_at', null),
    ]);

    return {
      success: true,
      data: {
        athletes: athletes.count || 0,
        gym_managers: gymManagers.count || 0,
        coaches: coaches.count || 0,
        doctors: doctors.count || 0,
        admins: admins.count || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get users by role',
    };
  }
}