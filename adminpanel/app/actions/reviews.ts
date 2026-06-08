'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult, PaginatedResult, GymReview } from '@/app/actions/types';
import { logAuditAction } from '@/app/actions/audit-log';

interface ReviewWithDetails extends GymReview {
  athlete_name: string;
  gym_name: string;
}

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Access denied');
  return supabase;
}

export async function getAllReviews(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  minRating?: number;
}): Promise<ActionResult<PaginatedResult<ReviewWithDetails>>> {
  try {
    const supabase = await verifyAdmin();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const search = params?.search || '';
    const minRating = params?.minRating;

    let query = supabase
      .from('gym_reviews')
      .select(`
        *,
        athlete:profiles!gym_reviews_athlete_id_fkey(full_name),
        gym:gyms!gym_reviews_gym_id_fkey(name)
      `, { count: 'exact' });

    if (search) {
      query = query.or(`comment.ilike.%${search}%`);
    }

    if (minRating) {
      query = query.gte('rating', minRating);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) return { success: false, error: error.message };

    const reviews: ReviewWithDetails[] = (data || []).map((review: any) => ({
      ...review,
      athlete_name: review.athlete?.full_name || 'نامشخص',
      gym_name: review.gym?.name || 'نامشخص',
    }));

    return {
      success: true,
      data: {
        data: reviews,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch reviews' };
  }
}

export async function deleteReview(reviewId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase.from('gym_reviews').delete().eq('id', reviewId);
    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'gym_review_deleted',
      target_type: 'gym_review',
      target_id: reviewId,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete review' };
  }
}