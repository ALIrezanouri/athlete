'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight, UserCheck, UserPlus, Dumbbell, Users, Flame } from 'lucide-react';
import {
  getUserProfile,
  getUserSharedWorkouts,
  isFollowing,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from '@/app/actions/social';

function formatNumber(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}س ${m}د` : `${m} دقیقه`;
}

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  following_count: number;
  workout_count: number;
  is_public: boolean;
}

interface SharedWorkout {
  id: string;
  name: string;
  start_time: string;
  duration_seconds: number | null;
  total_volume: number;
  total_sets: number;
  like_count: number;
  comment_count: number;
  shared_at: string | null;
  workout_exercises: Array<{
    id: string;
    exercise_name: string;
    workout_sets: Array<{ weight_kg: number; reps: number; set_type: string }>;
  }>;
}

interface UserItem {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  workout_count: number;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [workouts, setWorkouts] = useState<SharedWorkout[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<UserItem[]>([]);
  const [followingList, setFollowingList] = useState<UserItem[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [profileRes, workoutsRes, followRes] = await Promise.all([
        getUserProfile(userId),
        getUserSharedWorkouts(userId),
        isFollowing(userId),
      ]);

      if (profileRes.data) setProfile(profileRes.data as ProfileData);
      if (workoutsRes.data) setWorkouts(workoutsRes.data as SharedWorkout[]);
      if ('isFollowing' in followRes) setFollowing(followRes.isFollowing);
      setLoading(false);
    }
    load();
  }, [userId]);

  async function toggleFollow() {
    setFollowLoading(true);
    if (following) {
      const res = await unfollowUser(userId);
      if (res.success) {
        setFollowing(false);
        setProfile(prev => prev ? { ...prev, follower_count: prev.follower_count - 1 } : prev);
      }
    } else {
      const res = await followUser(userId);
      if (res.success) {
        setFollowing(true);
        setProfile(prev => prev ? { ...prev, follower_count: prev.follower_count + 1 } : prev);
      }
    }
    setFollowLoading(false);
  }

  async function openFollowers() {
    setShowFollowers(true);
    const res = await getFollowers(userId);
    if (res.data) setFollowersList(res.data as UserItem[]);
  }

  async function openFollowing() {
    setShowFollowing(true);
    const res = await getFollowing(userId);
    if (res.data) setFollowingList(res.data as UserItem[]);
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen gradient-mesh flex flex-col items-center justify-center text-foreground" dir="rtl">
        <div className="text-4xl mb-3">😔</div>
        <p className="text-foreground/40 text-sm">کاربر یافت نشد</p>
        <button onClick={() => router.back()} className="mt-4 text-primary text-sm">
          بازگشت
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-card rounded-none border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-foreground/60 hover:text-foreground">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">پروفایل</h1>
      </div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-6 pb-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
            {profile.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{profile.full_name || 'کاربر'}</h2>
            {profile.bio && <p className="text-sm text-foreground/50 mt-1 line-clamp-2">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-around mt-6 py-4 glass-card rounded-2xl">
          <button onClick={openFollowers} className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold">{formatNumber(profile.follower_count)}</span>
            <span className="text-xs text-foreground/40">دنبال‌کننده</span>
          </button>
          <div className="w-px h-10 bg-white/10" />
          <button onClick={openFollowing} className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold">{formatNumber(profile.following_count)}</span>
            <span className="text-xs text-foreground/40">دنبال‌شده</span>
          </button>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold">{formatNumber(profile.workout_count)}</span>
            <span className="text-xs text-foreground/40">تمرین</span>
          </div>
        </div>

        {/* Follow Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleFollow}
          disabled={followLoading}
          className={`w-full mt-4 py-3 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            following
              ? 'bg-white/10 text-foreground/70 hover:bg-red-500/20 hover:text-red-400'
              : 'bg-primary text-foreground hover:bg-primary/80'
          }`}
        >
          {followLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : following ? (
            <>
              <UserCheck className="w-4 h-4" />
              دنبال می‌کنید
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              دنبال کردن
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Shared Workouts */}
      <div className="px-4">
        <h3 className="text-base font-bold mb-3 flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          تمرینات اشتراکی
        </h3>

        {workouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🏋️</div>
            <p className="text-foreground/30 text-sm">هنوز تمرینی به اشتراک نگذاشته</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((w) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 space-y-2"
              >
                <h4 className="font-medium text-sm">{w.name}</h4>
                <div className="flex gap-3 text-xs text-foreground/40">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    {formatNumber(w.total_volume)} kg
                  </span>
                  <span>🔢 {w.total_sets} ست</span>
                  <span>❤️ {w.like_count}</span>
                  <span>💬 {w.comment_count}</span>
                </div>
                <div className="space-y-1">
                  {w.workout_exercises?.slice(0, 3).map(ex => (
                    <div key={ex.id} className="flex items-center justify-between text-xs bg-white/[0.03] rounded-lg px-3 py-1.5">
                      <span className="text-foreground/60">{ex.exercise_name}</span>
                      <span className="text-foreground/30">{ex.workout_sets?.length} ست</span>
                    </div>
                  ))}
                  {w.workout_exercises?.length > 3 && (
                    <p className="text-xs text-foreground/25 text-center">+ {w.workout_exercises.length - 3} حرکت دیگر</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Followers Modal */}
      {showFollowers && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowFollowers(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-lg bg-background rounded-t-3xl max-h-[70vh] overflow-hidden"
          >
            <div className="sticky top-0 px-4 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold">دنبال‌کنندگان</h3>
              <button onClick={() => setShowFollowers(false)} className="text-foreground/40">✕</button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {followersList.length === 0 ? (
                <p className="text-center text-foreground/30 text-sm py-8">هنوز کسی دنبال نکرده</p>
              ) : (
                followersList.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setShowFollowers(false); router.push(`/profile/${u.id}`); }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                      {u.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="text-right flex-1">
                      <p className="text-sm font-medium">{u.full_name || 'کاربر'}</p>
                      {u.bio && <p className="text-xs text-foreground/30 truncate">{u.bio}</p>}
                    </div>
                    <Users className="w-4 h-4 text-foreground/20" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowFollowing(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-lg bg-background rounded-t-3xl max-h-[70vh] overflow-hidden"
          >
            <div className="sticky top-0 px-4 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold">دنبال‌شونده</h3>
              <button onClick={() => setShowFollowing(false)} className="text-foreground/40">✕</button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {followingList.length === 0 ? (
                <p className="text-center text-foreground/30 text-sm py-8">هنوز کسی را دنبال نکرده</p>
              ) : (
                followingList.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setShowFollowing(false); router.push(`/profile/${u.id}`); }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                      {u.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="text-right flex-1">
                      <p className="text-sm font-medium">{u.full_name || 'کاربر'}</p>
                      {u.bio && <p className="text-xs text-foreground/30 truncate">{u.bio}</p>}
                    </div>
                    <Users className="w-4 h-4 text-foreground/20" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}