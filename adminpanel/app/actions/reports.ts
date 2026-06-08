// Reports Server Actions
'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './types';

export interface UserGrowthReport {
  totalUsers: number;
  newUsersThisMonth: number;
  newUsersThisWeek: number;
  usersByRole: Array<{
    role: string;
    count: number;
  }>;
}

export interface BookingTrendsReport {
  totalBookings: number;
  bookingsThisMonth: number;
  bookingsThisWeek: number;
  bookingsByStatus: Array<{
    status: string;
    count: number;
  }>;
  topGymsByBookings: Array<{
    gymId: string;
    gymName: string;
    bookingCount: number;
  }>;
}

export interface RevenueReport {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueThisWeek: number;
  averageBookingValue: number;
  revenueByGym: Array<{
    gymId: string;
    gymName: string;
    bookingCount: number;
    revenue: number;
  }>;
}

/**
 * Get user growth report (admin only)
 * @param startDate - Optional start date for filtering
 * @param endDate - Optional end date for filtering
 * @returns ActionResult with user growth data
 */
export async function getUserGrowthReport(
  startDate?: string,
  endDate?: string
): Promise<ActionResult<UserGrowthReport>> {
  
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

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    // Get users created this month
    const { count: newUsersThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', startOfMonth.toISOString());

    // Get users created this week
    const { count: newUsersThisWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', startOfWeek.toISOString());

    // Get users by role
    let roleQuery = supabase
      .from('profiles')
      .select('role')
      .is('deleted_at', null);

    if (startDate) {
      roleQuery = roleQuery.gte('created_at', startDate);
    }
    if (endDate) {
      roleQuery = roleQuery.lte('created_at', endDate);
    }

    const { data: profiles } = await roleQuery;

    // Count by role
    const roleCounts: Record<string, number> = {
      athlete: 0,
      gym_manager: 0,
      coach: 0,
      doctor: 0,
      admin: 0,
    };

    profiles?.forEach((p) => {
      if (roleCounts[p.role] !== undefined) {
        roleCounts[p.role]++;
      }
    });

    const usersByRole = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
    }));

    return {
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        usersByRole,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user growth report',
    };
  }
}

/**
 * Get booking trends report (admin only)
 * @param startDate - Optional start date for filtering
 * @param endDate - Optional end date for filtering
 * @returns ActionResult with booking trends data
 */
export async function getBookingTrendsReport(
  startDate?: string,
  endDate?: string
): Promise<ActionResult<BookingTrendsReport>> {
  
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

    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    // Get total bookings
    let totalBookingsQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    const { count: totalBookings } = await totalBookingsQuery;

    // Get bookings this month
    const { count: bookingsThisMonth } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    // Get bookings this week
    const { count: bookingsThisWeek } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfWeek.toISOString());

    // Get bookings with date filters
    let bookingsQuery = supabase
      .from('bookings')
      .select('status, gym_id');

    if (startDate) {
      bookingsQuery = bookingsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      bookingsQuery = bookingsQuery.lte('created_at', endDate);
    }

    const { data: bookings } = await bookingsQuery;

    // Count by status
    const statusCounts: Record<string, number> = {
      upcoming: 0,
      active: 0,
      cancelled: 0,
      completed: 0,
      expired: 0,
    };

    bookings?.forEach((b) => {
      if (statusCounts[b.status] !== undefined) {
        statusCounts[b.status]++;
      }
    });

    const bookingsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Get top 5 gyms by booking count
    const gymBookingCounts: Record<string, number> = {};
    bookings?.forEach((b) => {
      if (b.gym_id) {
        gymBookingCounts[b.gym_id] = (gymBookingCounts[b.gym_id] || 0) + 1;
      }
    });

    const gymIds = Object.entries(gymBookingCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([gymId]) => gymId);

    let topGymsQuery = supabase
      .from('gyms')
      .select('id, name');

    if (gymIds.length > 0) {
      topGymsQuery = topGymsQuery.in('id', gymIds);
    }

    const { data: gyms } = await topGymsQuery;

    const topGymsByBookings = gyms
      ?.map((gym) => ({
        gymId: gym.id,
        gymName: gym.name,
        bookingCount: gymBookingCounts[gym.id] || 0,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount) || [];

    return {
      success: true,
      data: {
        totalBookings: totalBookings || 0,
        bookingsThisMonth: bookingsThisMonth || 0,
        bookingsThisWeek: bookingsThisWeek || 0,
        bookingsByStatus,
        topGymsByBookings,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get booking trends report',
    };
  }
}

/**
 * Get revenue report (admin only)
 * @param startDate - Optional start date for filtering
 * @param endDate - Optional end date for filtering
 * @returns ActionResult with revenue data
 */
export async function getRevenueReport(
  startDate?: string,
  endDate?: string
): Promise<ActionResult<RevenueReport>> {
  
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

    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    // Get total revenue
    let totalRevenueQuery = supabase
      .from('bookings')
      .select('amount')
      .not('amount', 'is', null);

    const { data: allBookings } = await totalRevenueQuery;
    const totalRevenue = allBookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

    // Get revenue this month
    const { data: monthBookings } = await supabase
      .from('bookings')
      .select('amount')
      .not('amount', 'is', null)
      .gte('booked_at', startOfMonth.toISOString());

    const revenueThisMonth = monthBookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

    // Get revenue this week
    const { data: weekBookings } = await supabase
      .from('bookings')
      .select('amount')
      .not('amount', 'is', null)
      .gte('booked_at', startOfWeek.toISOString());

    const revenueThisWeek = weekBookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

    // Get average booking value
    const averageBookingValue = allBookings && allBookings.length > 0
      ? totalRevenue / allBookings.length
      : 0;

    // Get revenue by gym with date filters
    let gymRevenueQuery = supabase
      .from('bookings')
      .select('gym_id, amount');

    if (startDate) {
      gymRevenueQuery = gymRevenueQuery.gte('created_at', startDate);
    }
    if (endDate) {
      gymRevenueQuery = gymRevenueQuery.lte('created_at', endDate);
    }

    const { data: gymBookings } = await gymRevenueQuery;

    const gymRevenueData: Record<string, { count: number; revenue: number }> = {};
    gymBookings?.forEach((b) => {
      if (b.gym_id) {
        if (!gymRevenueData[b.gym_id]) {
          gymRevenueData[b.gym_id] = { count: 0, revenue: 0 };
        }
        gymRevenueData[b.gym_id].count++;
        gymRevenueData[b.gym_id].revenue += b.amount || 0;
      }
    });

    const gymIds = Object.keys(gymRevenueData);
    let gymsQuery = supabase
      .from('gyms')
      .select('id, name');

    if (gymIds.length > 0) {
      gymsQuery = gymsQuery.in('id', gymIds);
    }

    const { data: gyms } = await gymsQuery;

    const revenueByGym = gyms
      ?.map((gym) => ({
        gymId: gym.id,
        gymName: gym.name,
        bookingCount: gymRevenueData[gym.id]?.count || 0,
        revenue: gymRevenueData[gym.id]?.revenue || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue) || [];

    return {
      success: true,
      data: {
        totalRevenue,
        revenueThisMonth,
        revenueThisWeek,
        averageBookingValue,
        revenueByGym,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get revenue report',
    };
  }
}