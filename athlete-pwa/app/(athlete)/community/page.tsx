'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { getFeed, likeWorkout, unlikeWorkout, addComment, getComments } from '@/app/actions/social';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function formatDuration(seconds: number | null) {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}س ${m}د` : `${m} دقیقه`;
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} روز پیش`;
  return new Date(dateStr).toLocaleDateString('fa-IR');
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n);
}

interface FeedItem {
  id: string;
  user_id: string;
  name: string;
  start_time: string;
  duration_seconds: number | null;
  total_volume: number;
  total_sets: number;
  estimated_calories: number;
  like_count: number;
  comment_count: number;
  shared_at: string | null;
  profiles: { full_name: string | null; avatar_url: string | null };
  workout_exercises: Array<{
    id: string;
    exercise_name: string;
    workout_sets: Array<{ weight_kg: number; reps: number; set_type: string }>;
  }>;
  user_liked?: boolean;
}

export default function CommunityPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});

  const FEED_PAGE_SIZE = 15;

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    setLoading(true);
    const res = await getFeed(0, FEED_PAGE_SIZE);
    if (res.data) {
      setFeed(res.data as FeedItem[]);
      setHasMore(res.data.length >= FEED_PAGE_SIZE);
    }
    setPage(0);
    setLoading(false);
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getFeed(nextPage, FEED_PAGE_SIZE);
    if (res.data && res.data.length > 0) {
      setFeed(prev => [...prev, ...(res.data as FeedItem[])]);
      setPage(nextPage);
      setHasMore(res.data.length >= FEED_PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [page, loadingMore, hasMore]);

  const { sentinelRef } = useInfiniteScroll({
    loading: loadingMore,
    hasMore,
    onLoadMore: loadMore,
  });

  async function toggleLike(workoutId: string, isLiked: boolean) {
    if (isLiked) {
      await unlikeWorkout(workoutId);
    } else {
      await likeWorkout(workoutId);
    }
    setFeed(prev => prev.map(w =>
      w.id === workoutId
        ? { ...w, like_count: isLiked ? w.like_count - 1 : w.like_count + 1, user_liked: !isLiked }
        : w
    ));
  }

  async function toggleComments(workoutId: string) {
    const isOpen = expandedComments[workoutId];
    setExpandedComments(prev => ({ ...prev, [workoutId]: !isOpen }));
    if (!isOpen && !commentsData[workoutId]) {
      const res = await getComments(workoutId);
      if (res.data) {
        setCommentsData(prev => ({ ...prev, [workoutId]: res.data }));
      }
    }
  }

  async function submitComment(workoutId: string) {
    const text = commentText[workoutId]?.trim();
    if (!text) return;
    await addComment(workoutId, text);
    setCommentText(prev => ({ ...prev, [workoutId]: '' }));
    // Refresh comments
    const res = await getComments(workoutId);
    if (res.data) {
      setCommentsData(prev => ({ ...prev, [workoutId]: res.data }));
    }
    setFeed(prev => prev.map(w =>
      w.id === workoutId ? { ...w, comment_count: w.comment_count + 1 } : w
    ));
  }

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-card rounded-none border-b border-white/5 px-4 py-3">
        <h1 className="text-lg font-bold">🏠 انجمن</h1>
        <p className="text-xs text-foreground/40 mt-0.5">تمرینات دوستان و جامعه</p>
      </div>

      {/* Feed */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🏋️</div>
            <p className="text-foreground/40 text-sm">هنوز تمرینی به اشتراک گذاشته نشده</p>
            <p className="text-foreground/25 text-xs mt-1">بعد از تکمیل تمرین، آن را به اشتراک بگذارید!</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {feed.map(workout => (
              <motion.div
                key={workout.id}
                variants={itemVariants}
                className="glass-card overflow-hidden"
              >
                {/* User header — clickable to public profile */}
                <Link href={`/profile/${workout.user_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {workout.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{workout.profiles?.full_name || 'کاربر'}</p>
                    <p className="text-xs text-foreground/40">{formatTimeAgo(workout.shared_at || workout.start_time)}</p>
                  </div>
                </Link>

                {/* Workout info */}
                <div className="px-4 pb-3">
                  <h3 className="font-bold text-base mb-2">{workout.name}</h3>
                  <div className="flex gap-4 text-xs text-foreground/50 mb-3">
                    <span>⏱ {formatDuration(workout.duration_seconds)}</span>
                    <span>🏋️ {formatNumber(workout.total_volume)} kg حجم</span>
                    <span>🔢 {workout.total_sets} ست</span>
                  </div>

                  {/* Exercises summary */}
                  <div className="space-y-1.5">
                    {workout.workout_exercises?.slice(0, 5).map(ex => (
                      <div key={ex.id} className="flex items-center justify-between text-xs bg-white/[0.03] rounded-lg px-3 py-2">
                        <span className="text-foreground/70">{ex.exercise_name}</span>
                        <span className="text-foreground/35">
                          {ex.workout_sets?.length} ست • بیشترین{' '}
                          {Math.max(...(ex.workout_sets?.map(s => s.weight_kg) || [0]))} kg
                        </span>
                      </div>
                    ))}
                    {workout.workout_exercises?.length > 5 && (
                      <p className="text-xs text-foreground/30 text-center">
                        + {workout.workout_exercises.length - 5} حرکت دیگر
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 px-4 py-2.5 border-t border-white/5">
                  <button
                    onClick={() => toggleLike(workout.id, !!workout.user_liked)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
                    style={{
                      background: workout.user_liked ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.05)',
                      color: workout.user_liked ? '#FF6B6B' : 'rgba(255,255,255,0.4)'
                    }}
                  >
                    {workout.user_liked ? '❤️' : '🤍'} {workout.like_count}
                  </button>
                  <button
                    onClick={() => toggleComments(workout.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 text-foreground/40 transition-colors hover:bg-white/10"
                  >
                    💬 {workout.comment_count}
                  </button>
                </div>

                {/* Comments section */}
                {expandedComments[workout.id] && (
                  <div className="border-t border-white/5 px-4 py-3 space-y-2">
                    {commentsData[workout.id]?.map((c: any) => (
                      <div key={c.id} className="text-xs">
                        <span className="font-medium text-success">{c.profiles?.full_name}: </span>
                        <span className="text-foreground/60">{c.comment}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={commentText[workout.id] || ''}
                        onChange={e => setCommentText(prev => ({ ...prev, [workout.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && submitComment(workout.id)}
                        placeholder="نظرتان را بنویسید..."
                        className="flex-1 bg-white/[0.05] rounded-full px-3 py-1.5 text-xs text-foreground placeholder-white/25 outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => submitComment(workout.id)}
                        className="text-primary text-xs font-medium px-2"
                      >
                        ارسال
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Infinite scroll sentinel */}
        {!loading && feed.length > 0 && (
          <div ref={sentinelRef} className="flex items-center justify-center py-6">
            {loadingMore && (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {!hasMore && feed.length > 0 && (
              <p className="text-xs text-foreground/25">پایان فید</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
