'use server';

import { createClient } from '@/lib/supabase/server';

// ============================================================
// Types
// ============================================================
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  following_count: number;
  workout_count: number;
  is_public: boolean;
}

export interface FeedWorkout {
  id: string;
  user_id: string;
  name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  total_volume: number;
  total_sets: number;
  estimated_calories: number;
  like_count: number;
  comment_count: number;
  is_shared: boolean;
  shared_at: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
  workout_exercises: Array<{
    id: string;
    exercise_name: string;
    workout_sets: Array<{
      weight_kg: number;
      reps: number;
      set_type: string;
    }>;
  }>;
  user_liked?: boolean;
}

// ============================================================
// Follow / Unfollow
// ============================================================
export async function followUser(followingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: user.id, following_id: followingId });

  if (error) return { error: error.message };
  return { success: true };
}

export async function unfollowUser(followingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function isFollowing(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isFollowing: false };

  const { data } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', userId)
    .maybeSingle();

  return { isFollowing: !!data };
}

// ============================================================
// Share / Unshare Workout
// ============================================================
export async function shareWorkout(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('workout_sessions')
    .update({ is_shared: true, shared_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function unshareWorkout(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('workout_sessions')
    .update({ is_shared: false, shared_at: null })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ============================================================
// Likes
// ============================================================
export async function likeWorkout(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('workout_likes')
    .insert({ user_id: user.id, workout_session_id: sessionId });

  if ( error ) {
    if (error.code === '23505') return { error: 'Already liked' };
    return { error: error.message };
  }
  return { success: true };
}

export async function unlikeWorkout(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('workout_likes')
    .delete()
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId);

  if (error) return { error: error.message };
  return { success: true };
}

// ============================================================
// Comments
// ============================================================
export async function addComment(sessionId: string, comment: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  if (!comment.trim()) return { error: 'Comment cannot be empty' };

  const { error } = await supabase
    .from('workout_comments')
    .insert({ user_id: user.id, workout_session_id: sessionId, comment: comment.trim() });

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('workout_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getComments(sessionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workout_comments')
    .select('id, comment, created_at, profiles:user_id(full_name, avatar_url)')
    .eq('workout_session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };
  return { data };
}

// ============================================================
// Feed
// ============================================================
export async function getFeed(page = 0, limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get workouts from followed users + own shared workouts
  let query = supabase
    .from('workout_sessions')
    .select(`
      id, user_id, name, start_time, end_time, duration_seconds,
      total_volume, total_sets, estimated_calories,
      like_count, comment_count, is_shared, shared_at,
      profiles:user_id(full_name, avatar_url),
      workout_exercises(
        id, exercise_name,
        workout_sets(weight_kg, reps, set_type)
      )
    `)
    .eq('is_shared', true)
    .eq('status', 'completed')
    .order('shared_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  const { data, error } = await query;

  if (error) return { error: error.message, data: [] };

  // Check which workouts current user liked
  let likedIds: string[] = [];
  if (user && data && data.length > 0) {
    const workoutIds = data.map((w: any) => w.id);
    const { data: likes } = await supabase
      .from('workout_likes')
      .select('workout_session_id')
      .eq('user_id', user.id)
      .in('workout_session_id', workoutIds);
    likedIds = (likes || []).map((l: any) => l.workout_session_id);
  }

  const feedData = (data || []).map((w: any) => ({
    ...w,
    user_liked: likedIds.includes(w.id),
  }));

  return { data: feedData };
}

// ============================================================
// User Profile (public)
// ============================================================
export async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, bio, follower_count, following_count, workout_count, is_public')
    .eq('id', userId)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getUserSharedWorkouts(userId: string, page = 0, limit = 10) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workout_sessions')
    .select(`
      id, name, start_time, duration_seconds, total_volume, total_sets,
      like_count, comment_count, shared_at,
      workout_exercises(id, exercise_name, workout_sets(weight_kg, reps, set_type))
    `)
    .eq('user_id', userId)
    .eq('is_shared', true)
    .eq('status', 'completed')
    .order('shared_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) return { error: error.message };
  return { data };
}

// ============================================================
// Search Users
// ============================================================
export async function searchUsers(query: string, limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!query.trim()) return { data: [] };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, bio, follower_count, workout_count, is_public')
    .ilike('full_name', `%${query.trim()}%`)
    .neq('id', user?.id || '')
    .eq('is_public', true)
    .limit(limit);

  if (error) return { error: error.message, data: [] };
  return { data };
}

// ============================================================
// Suggested Users (users not followed by current user)
// ============================================================
export async function getSuggestedUsers(limit = 10) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  // Get IDs of users already followed
  const { data: follows } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const followedIds = (follows || []).map((f: any) => f.following_id);
  const excludeIds = [...followedIds, user.id];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, bio, follower_count, workout_count')
    .eq('is_public', true)
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .order('follower_count', { ascending: false })
    .limit(limit);

  if (error) return { error: error.message, data: [] };
  return { data };
}

// ============================================================
// Get Followers / Following Lists
// ============================================================
export async function getFollowers(userId: string, limit = 50) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_follows')
    .select('follower_id, created_at, profiles!user_follows_follower_id_fkey(id, full_name, avatar_url, bio, follower_count, workout_count)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { error: error.message, data: [] };

  const followers = (data || []).map((f: any) => ({
    ...f.profiles,
    followed_at: f.created_at,
  }));

  return { data: followers };
}

export async function getFollowing(userId: string, limit = 50) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_follows')
    .select('following_id, created_at, profiles!user_follows_following_id_fkey(id, full_name, avatar_url, bio, follower_count, workout_count)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { error: error.message, data: [] };

  const following = (data || []).map((f: any) => ({
    ...f.profiles,
    followed_at: f.created_at,
  }));

  return { data: following };
}

// ============================================================
// Update Profile
// ============================================================
export async function updateProfile(updates: { bio?: string; is_public?: boolean; full_name?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}