'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { getFeed, likeWorkout, unlikeWorkout, addComment, getComments } from '@/app/actions/social';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { ShareableCard } from '@/components/ui/shareable-card';
import { Share2, X, MessageCircle, Heart, Sparkles, Clock, Dumbbell } from 'lucide-react';
import { getVolumeComparison } from '@/lib/gamification/engine';

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
  const [sharingWorkout, setSharingWorkout] = useState<FeedItem | null>(null);

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
    <div className="min-h-screen gradient-mesh text-foreground pb-32" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-4 py-4">
        <h1 className="text-xl font-black tracking-tight">انجمن</h1>
        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mt-0.5">تمرینات دوستان و جامعه</p>
      </div>

      {/* Feed */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-64 rounded-3xl" />)}
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-24 glass-card border-dashed">
            <div className="text-4xl mb-4">🏋️</div>
            <p className="text-foreground/40 text-sm font-bold">هنوز تمرینی به اشتراک گذاشته نشده</p>
            <p className="text-foreground/20 text-xs mt-1 italic">بعد از تکمیل تمرین، آن را به اشتراک بگذارید!</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            {feed.map(workout => {
              const comp = getVolumeComparison(workout.total_volume);
              const isHeavy = workout.total_volume >= 1000;

              return (
                <motion.div
                  key={workout.id}
                  variants={itemVariants}
                  className="glass-card overflow-hidden"
                >
                  {/* User header */}
                  <div className="flex items-center justify-between px-4 py-4">
                    <Link href={`/profile/${workout.user_id}`} className="flex items-center gap-3 haptic-ready">
                      <div className="w-11 h-11 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-base font-black shrink-0 border border-primary/10">
                        {workout.profiles?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{workout.profiles?.full_name || 'کاربر'}</p>
                        <p className="text-[10px] font-bold text-foreground/30 uppercase">{formatTimeAgo(workout.shared_at || workout.start_time)}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => setSharingWorkout(workout)}
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-foreground/40 hover:text-primary transition-colors haptic-ready"
                    >
                      <Share2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Gamification Badge (Achievement) */}
                  {isHeavy && (
                    <div className="mx-4 mb-4 px-3 py-2.5 rounded-2xl bg-warning/10 border border-warning/20 flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-warning shrink-0" />
                      <span className="text-[10px] font-black text-warning uppercase tracking-wider leading-none">
                        دستاورد حجیم: معادل {comp.count.toLocaleString('fa-IR')} {comp.object} {comp.emoji}
                      </span>
                    </div>
                  )}

                  {/* Workout info */}
                  <div className="px-4 pb-4">
                    <h3 className="font-black text-lg mb-3 leading-tight text-foreground">{workout.name}</h3>
                    <div className="flex gap-5 text-[11px] font-bold text-foreground/40 uppercase mb-4">
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {formatDuration(workout.duration_seconds)}</span>
                      <span className={`flex items-center gap-1.5 ${isHeavy ? "text-warning" : ""}`}><Dumbbell className="w-3 h-3" /> {formatNumber(workout.total_volume)} kg</span>
                      <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> {workout.total_sets} ست</span>
                    </div>

                    {/* Exercises summary */}
                    <div className="space-y-2">
                      {workout.workout_exercises?.slice(0, 5).map(ex => (
                        <div key={ex.id} className="flex items-center justify-between text-xs bg-white/[0.03] border border-white/[0.05] rounded-xl px-3.5 py-2.5">
                          <span className="text-foreground/80 font-medium">{ex.exercise_name}</span>
                          <span className="text-foreground/30 font-bold text-[10px]">
                            {ex.workout_sets?.length} ست • {Math.max(...(ex.workout_sets?.map(s => s.weight_kg) || [0]))} kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 bg-white/[0.01]">
                    <button
                      onClick={() => toggleLike(workout.id, !!workout.user_liked)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all haptic-ready"
                      style={{
                        background: workout.user_liked ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.04)',
                        color: workout.user_liked ? '#FF453A' : 'rgba(255,255,255,0.4)'
                      }}
                    >
                      <Heart className={`w-4 h-4 ${workout.user_liked ? 'fill-current' : ''}`} /> {workout.like_count.toLocaleString('fa-IR')}
                    </button>
                    <button
                      onClick={() => toggleComments(workout.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black bg-white/[0.04] text-foreground/40 haptic-ready"
                    >
                      <MessageCircle className="w-4 h-4" /> {workout.comment_count.toLocaleString('fa-IR')}
                    </button>
                  </div>

                  {/* Comments section */}
                  {expandedComments[workout.id] && (
                    <div className="border-t border-white/5 px-4 py-4 space-y-3 bg-black/20">
                      {commentsData[workout.id]?.map((c: any) => (
                        <div key={c.id} className="text-xs leading-relaxed">
                          <span className="font-black text-primary ml-1">{c.profiles?.full_name}: </span>
                          <span className="text-foreground/70">{c.comment}</span>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={commentText[workout.id] || ''}
                          onChange={e => setCommentText(prev => ({ ...prev, [workout.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && submitComment(workout.id)}
                          placeholder="نظرتان را بنویسید..."
                          className="flex-1 bg-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-white/20 outline-none focus:ring-1 focus:ring-primary border border-white/5"
                        />
                        <button
                          onClick={() => submitComment(workout.id)}
                          className="bg-primary/10 text-primary text-xs font-black px-4 rounded-xl border border-primary/10 haptic-ready"
                        >
                          ارسال
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Infinite scroll sentinel */}
        {!loading && feed.length > 0 && (
          <div ref={sentinelRef} className="flex items-center justify-center py-8">
            {loadingMore ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              !hasMore && <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest">پایان فید انجمن</p>
            )}
          </div>
        )}
      </div>

      {/* Sharing Overlay */}
      <AnimatePresence>
        {sharingWorkout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            <button
              onClick={() => setSharingWorkout(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-sm">
              <ShareableCard
                type="workout"
                title={sharingWorkout.name}
                funFact={`معادل ${getVolumeComparison(sharingWorkout.total_volume).count} ${getVolumeComparison(sharingWorkout.total_volume).object}`}
                stats={[
                  { label: 'حجم کل', value: `${formatNumber(sharingWorkout.total_volume)} kg` },
                  { label: 'مدت زمان', value: formatDuration(sharingWorkout.duration_seconds) },
                  { label: 'ست‌ها', value: sharingWorkout.total_sets.toString() }
                ]}
                userName={sharingWorkout.profiles?.full_name || 'کاربر'}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
