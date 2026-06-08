// Social Feature Viewing & Moderation Server Actions (Admin Only)
'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  ActionResult,
  PaginatedResult,
  UserFollow,
  WorkoutLike,
  WorkoutComment,
  GymFavorite,
} from './types';
import { logAuditAction } from './audit-log';

// ── User Follows (Read-Only) ────────────────────────────────────────────────

export async function getAllFollows(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<ActionResult<PaginatedResult<UserFollow>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') return { success: false, error: 'Access denied' };

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('user_follows')
      .select('*, follower:profiles!user_follows_follower_id_fkey(full_name), following:profiles!user_follows_following_id_fkey(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };

    let filtered = data || [];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((f: any) =>
        f.follower?.full_name?.toLowerCase().includes(s) ||
        f.following?.full_name?.toLowerCase().includes(s)
      );
    }

    return {
      success: true,
      data: {
        data: filtered as UserFollow[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch follows' };
  }
}

// ── Workout Likes (Read-Only) ───────────────────────────────────────────────

export async function getAllLikes(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<ActionResult<PaginatedResult<WorkoutLike>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') return { success: false, error: 'Access denied' };

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('workout_likes')
      .select('*, profiles!workout_likes_user_id_fkey(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };

    let filtered = data || [];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((l: any) =>
        l.profiles?.full_name?.toLowerCase().includes(s)
      );
    }

    return {
      success: true,
      data: {
        data: filtered as WorkoutLike[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch likes' };
  }
}

// ── Workout Comments (Read-Only + Delete for Moderation) ────────────────────

export async function getAllComments(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<ActionResult<PaginatedResult<WorkoutComment>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') return { success: false, error: 'Access denied' };

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('workout_comments')
      .select('*, profiles!workout_comments_user_id_fkey(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };

    let filtered = data || [];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((c: any) =>
        c.comment?.toLowerCase().includes(s) ||
        c.profiles?.full_name?.toLowerCase().includes(s)
      );
    }

    return {
      success: true,
      data: {
        data: filtered as WorkoutComment[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch comments' };
  }
}

export async function deleteComment(commentId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') return { success: false, error: 'Access denied' };

    const { error } = await supabase
      .from('workout_comments')
      .delete()
      .eq('id', commentId);

    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'workout_comment_deleted',
      target_type: 'workout_comment',
      target_id: commentId,
      action_details: { reason: 'admin moderation' },
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete comment' };
  }
}

// ── Gym Favorites (Read-Only + Delete for Moderation) ──────────────────────

export async function getAllFavorites(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<ActionResult<PaginatedResult<GymFavorite>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') return { success: false, error: 'Access denied' };

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('favorite_gyms')
      .select('*, athlete:profiles!favorite_gyms_athlete_id_fkey(full_name), gym:gyms!favorite_gyms_gym_id_fkey(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };

    let filtered = data || [];
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((f: any) =>
        f.athlete?.full_name?.toLowerCase().includes(s) ||
        f.gym?.name?.toLowerCase().includes(s)
      );
    }

    return {
      success: true,
      data: {
        data: filtered as GymFavorite[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch favorites' };
  }
}

export async function deleteFavorite(favoriteId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') return { success: false, error: 'Access denied' };

    const { error } = await supabase
      .from('favorite_gyms')
      .delete()
      .eq('id', favoriteId);

    if (error) return { success: false, error: error.message };

    await logAuditAction({
      action_type: 'gym_favorite_deleted',
      target_type: 'favorite_gym',
      target_id: favoriteId,
      action_details: { reason: 'admin moderation' },
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete favorite' };
  }
}