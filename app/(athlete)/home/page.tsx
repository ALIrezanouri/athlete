"use client"

import { useGlobalEngine } from "@/lib/GlobalEngineContext"
import { motion, AnimatePresence } from "motion/react"
import {
  Search,
  CalendarDays,
  Star,
  MapPin,
  Flame,
  TrendingUp,
  Dumbbell,
  Trophy,
  Zap,
  Target,
  Play,
  Clock,
  Sparkles,
  Users,
  PersonStanding,
  Award,
  BarChart3,
  Navigation,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useTransition, memo } from "react"
import { getUpcomingBookings, getPopularGyms, getGymSuggestionsForRoutine } from "@/app/actions/gyms"
import type { GymSuggestion } from "@/app/actions/gyms"
import { getWorkoutStats } from "@/app/actions/analytics"
import { getPersonalRecords } from "@/app/actions/analytics"
import { getActiveWorkout } from "@/app/actions/workouts"
import { getRoutines } from "@/app/actions/routines"
import GymSuggestionSheet from "@/components/gym-suggestion/gym-suggestion-sheet"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { MagicCard } from "@/components/ui/magic-card"

// ── Animation variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
}

// ── Streak Ring SVG Component ──
const STREAK_MILESTONES = [7, 14, 30, 60, 100]
function getStreakMilestone(days: number) {
  let prev = 0
  for (const m of STREAK_MILESTONES) {
    if (days < m) return { current: days, target: m, complete: false }
    prev = m
  }
  return { current: days, target: STREAK_MILESTONES[STREAK_MILESTONES.length - 1], complete: days >= STREAK_MILESTONES[STREAK_MILESTONES.length - 1] }
}

const StreakRing = memo(function StreakRing({ days }: { days: number }) {
  const { current, target, complete } = getStreakMilestone(days)
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(current / target, 1)
  const offset = circumference * (1 - progress)
  const atMilestone = STREAK_MILESTONES.includes(days) && days > 0
  const ringColor = atMilestone ? "#FF9F0A" : "#4F8EF7"

  return (
    <div className="relative w-16 h-16">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius}
          fill="none" stroke={ringColor} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="ring-progress"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-base font-bold leading-none ${atMilestone ? "text-warning" : "text-foreground"}`}>
          {days.toLocaleString("fa-IR")}
        </span>
        <span className="text-[7px] text-foreground/40 mt-0.5 font-medium">
          {atMilestone ? "🎉" : `${current.toLocaleString("fa-IR")} از ${target.toLocaleString("fa-IR")}`}
        </span>
      </div>
    </div>
  )
})

// ── Weekly Activity Bars ──
const WeeklyBars = memo(function WeeklyBars({ activeDays }: { activeDays: boolean[] }) {
  const labels = ["ش", "ی", "د", "س", "چ", "پ", "ج"]
  return (
    <div className="flex items-end justify-between gap-2 h-14 px-1">
      {activeDays.map((active, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: active ? "2.5rem" : "0.6rem" }}
            className={`w-full rounded-full transition-all duration-500 ${
              active ? "bg-primary shadow-sm shadow-primary/20" : "bg-white/5"
            }`}
            style={{ transitionDelay: `${i * 80}ms` }}
          />
          <span className={`text-[9px] font-bold ${active ? "text-primary" : "text-foreground/20"}`}>
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  )
})

// ── Skeleton Loader ──
function HomeSkeleton() {
  return (
    <div className="px-4 pt-14 pb-28 space-y-6" dir="rtl">
      <div className="space-y-2">
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-4 w-56" />
      </div>
      <div className="flex gap-4 items-center">
        <div className="skeleton w-16 h-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-14 rounded-2xl" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
      <div className="skeleton h-20 rounded-2xl" />
      <div className="skeleton h-20 rounded-2xl" />
    </div>
  )
}

// ── Main Page ──
export default function HomePage() {
  const { t, formatPrice } = useGlobalEngine()
  const [upcomingBooking, setUpcomingBooking] = useState<any>(null)
  const [popularGyms, setPopularGyms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Real data from server
  const [streak, setStreak] = useState(0)
  const [weekActive, setWeekActive] = useState([false, false, false, false, false, false, false])
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [prCount, setPrCount] = useState(0)
  const [totalVolume, setTotalVolume] = useState(0)
  // Active (in-progress) workout for "Continue" card
  const [activeWorkout, setActiveWorkout] = useState<{ name: string; exerciseCount: number; elapsed: number } | null>(null)
  // Today's routine suggestion + gym suggestions
  const [todayRoutine, setTodayRoutine] = useState<{ id: string; name: string } | null>(null)
  const [gymSuggestions, setGymSuggestions] = useState<GymSuggestion[]>([])
  const [showGymSheet, setShowGymSheet] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // ── Phase 1: Fire all independent requests in parallel ──
        const [upcomingResult, gymsResult, statsResult, prResult, activeResult, routinesResult] =
          await Promise.all([
            getUpcomingBookings(),
            getPopularGyms(),
            getWorkoutStats({ period: "week" }),
            getPersonalRecords(),
            getActiveWorkout(),
            getRoutines(),
          ])

        // Process upcoming bookings
        if (upcomingResult.success && upcomingResult.data && upcomingResult.data.length > 0) {
          const b = upcomingResult.data[0]
          setUpcomingBooking({
            gymName: b.gym_name || "Unknown Gym",
            time: new Date(b.booking_date).toLocaleDateString("fa-IR", {
              weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            }),
            sport: b.sport_type || "Training",
          })
        }

        // Process popular gyms
        if (gymsResult.success && gymsResult.data) {
          setPopularGyms(gymsResult.data)
        }

        // Process workout stats
        if (statsResult.success && statsResult.stats) {
          const s = statsResult.stats
          setStreak(s.streak)
          setTotalWorkouts(s.totalWorkouts)
          setTotalVolume(s.totalVolume)
          if (s.weeklyVolume && s.weeklyVolume.length > 0) {
            const week: boolean[] = s.weeklyVolume.map(
              (entry: { week: string; volume: number }) => entry.volume > 0
            )
            setWeekActive(week)
          } else if (s.totalWorkouts > 0) {
            setWeekActive([false, false, false, false, false, false, true])
          }
        }

        // Process personal records
        if (prResult.success && prResult.records) {
          setPrCount(prResult.records.length)
        }

        // Process active workout
        if (activeResult.success && activeResult.session) {
          const startedAt = new Date(activeResult.session.start_time).getTime()
          const elapsedMin = Math.round((Date.now() - startedAt) / 60000)
          setActiveWorkout({
            name: activeResult.session.name || "تمرین",
            exerciseCount: activeResult.exercises?.length || 0,
            elapsed: elapsedMin,
          })
        }

        // ── Phase 2: Gym suggestions depend on routines result ──
        if (routinesResult.success && routinesResult.routines && routinesResult.routines.length > 0) {
          const sorted = [...routinesResult.routines].sort((a, b) => {
            if (a.last_used_at && b.last_used_at) return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime()
            if (a.last_used_at) return -1
            if (b.last_used_at) return 1
            return b.use_count - a.use_count
          })
          const topRoutine = sorted[0]
          setTodayRoutine({ id: topRoutine.id, name: topRoutine.name })
          // Fetch gym suggestions for this routine (with geolocation)
          const fetchGymSuggestions = async (lat?: number, lng?: number) => {
            startTransition(async () => {
              const res = await getGymSuggestionsForRoutine({
                routineId: topRoutine.id,
                userLocation: lat && lng ? { lat, lng } : undefined,
              })
              if (res.success && res.data) {
                setGymSuggestions(res.data.slice(0, 3))
              }
            })
          }
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => fetchGymSuggestions(pos.coords.latitude, pos.coords.longitude),
              () => fetchGymSuggestions()
            )
          } else {
            fetchGymSuggestions()
          }
        }
      } catch (err) {
        console.error("Error fetching home data:", err)
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t("home.goodMorning")
    if (hour < 17) return t("home.goodAfternoon")
    return t("home.goodEvening")
  }

  // Time-aware motivational sub-text
  const getMotivation = () => {
    if (activeWorkout) return "یه تمرین ناتمام داری، ادامه بده! 💪"
    const hour = new Date().getHours()
    const workedOutToday = weekActive[6]
    if (workedOutToday) {
      if (hour < 12) return "عالیه! امروز رو با انرژی شروع کردی 🔥"
      return "امروز تمرین کردی، عالی بود! ✨"
    }
    if (hour < 12) return "وقتشه قدرت رو حس کنی 💪"
    if (hour < 17) return "هنوز وقت داری امروز تمرین کنی 🏋️"
    if (hour < 21) return "یه تمرین سریع می‌تونه روزت رو بسازه 🔥"
    return "استراحت هم مهمه. فردا قدرتمندتر برمی‌گردی 🌙"
  }

  const handleFindGym = () => setShowGymSheet(true)

  if (loading) return <HomeSkeleton />
  if (error) {
    return (
      <div className="px-4 pt-14 pb-28 text-center" dir="rtl">
        <p className="text-foreground/50 mt-12">{error}</p>
      </div>
    )
  }

  return (
    <motion.div
      className="px-4 pt-12 pb-28 space-y-6 gradient-mesh min-h-screen"
      dir="rtl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Hero: Greeting + Streak ── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()} 👋
          </h1>
          <p className="text-sm text-foreground/40 mt-1 font-medium">{getMotivation()}</p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <StreakRing days={streak} />
          <span className="text-[10px] text-primary font-bold tracking-tight">استریک</span>
        </div>
      </motion.div>

      {/* ── Continue Workout Card ── */}
      <AnimatePresence>
        {activeWorkout && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/workout" className="block">
              <div className="relative overflow-hidden rounded-2xl p-4 glass-vibrant border-primary/20 haptic-ready">
                <span className="absolute top-4 left-4 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
                </span>
                <div className="flex items-center gap-3 pr-6">
                  <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Play className="w-5 h-5 text-primary fill-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{activeWorkout.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-foreground/50 font-medium">
                        {activeWorkout.exerciseCount.toLocaleString("fa-IR")} حرکت
                      </span>
                      <span className="text-[10px] text-foreground/20">•</span>
                      <span className="text-[10px] text-foreground/50 flex items-center gap-1 font-medium">
                        <Clock className="w-2.5 h-2.5" />
                        {activeWorkout.elapsed.toLocaleString("fa-IR")} دقیقه
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">ادامه ←</span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Today's Workout Suggestion ── */}
      {todayRoutine && (
        <motion.div variants={itemVariants}>
          <MagicCard mode="gradient" gradientFrom="#4F8EF7" gradientTo="#30D158" className="haptic-ready">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">تمرین پیشنهادی</p>
                  <p className="text-sm font-bold text-foreground truncate">{todayRoutine.name}</p>
                </div>
                {gymSuggestions.length > 0 && (
                  <button
                    onClick={handleFindGym}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 border border-primary/20 text-xs font-bold text-primary shrink-0 haptic-ready"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    باشگاه مناسب
                  </button>
                )}
              </div>
              {gymSuggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {gymSuggestions.map((suggestion) => (
                    <Link key={suggestion.gym.id} href={`/explore/${suggestion.gym.id}`}>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] haptic-ready">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{suggestion.gym.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-success font-bold">
                              {suggestion.matchScore}% تطابق
                            </span>
                            {suggestion.distance && (
                              <span className="text-[9px] text-foreground/30 font-medium">
                                {suggestion.distance.toFixed(1).toLocaleString()} km
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-primary shrink-0">رزرو ←</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </MagicCard>
        </motion.div>
      )}

      {/* ── Weekly Activity ── */}
      <motion.div variants={itemVariants}>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-foreground/40 tracking-tight">فعالیت هفتگی</span>
            <span className="text-[10px] text-primary font-bold">
              {weekActive.filter(Boolean).length} از ۷ روز فعال
            </span>
          </div>
          <WeeklyBars activeDays={weekActive} />
        </div>
      </motion.div>

      {/* ── Quick Stats — Bento Grid ── */}
      <motion.div variants={itemVariants}>
        <BentoGrid className="grid-cols-3 auto-rows-auto">
          <BentoCard
            name="تمرینات"
            description="کل جلسات"
            Icon={Dumbbell}
            metric={totalWorkouts.toLocaleString("fa-IR")}
            className="col-span-1"
          >
            <div className="mb-4" />
          </BentoCard>
          <BentoCard
            name="رکوردها"
            description="مدال‌های کسب شده"
            Icon={Trophy}
            metric={prCount.toLocaleString("fa-IR")}
            className="col-span-1"
          >
             <div className="mb-4" />
          </BentoCard>
          <BentoCard
            name="حجم"
            description="مجموع وزنه"
            Icon={Target}
            metric={totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1).toLocaleString()}K` : totalVolume.toLocaleString("fa-IR")}
            metricLabel="کیلو"
            className="col-span-1"
          >
             <div className="mb-4" />
          </BentoCard>
        </BentoGrid>
      </motion.div>

      {/* ── Upcoming Session / My Reservations ── */}
      <motion.div variants={itemVariants}>
        <Link href="/bookings" className="block">
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-white/10 haptic-ready">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">{t("home.upcomingSession")}</p>
                <p className="text-sm font-bold text-foreground truncate">
                  {upcomingBooking?.gymName || "مشاهده رزروها"}
                </p>
              </div>
              {upcomingBooking ? (
                <div className="text-left shrink-0">
                  <p className="text-[10px] text-primary font-bold">{upcomingBooking.time}</p>
                  <p className="text-[10px] text-foreground/30 font-medium">{upcomingBooking.sport}</p>
                </div>
              ) : (
                <span className="text-xs font-bold text-primary shrink-0">رزروها ←</span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Quick Actions — 8 Feature Hub ── */}
      <motion.div variants={itemVariants}>
        <MagicCard mode="orb" glowFrom="#4F8EF7" glowTo="#BF5AF2" glowSize={300} className="rounded-3xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-bold text-foreground/40 uppercase tracking-widest">دسترسی سریع</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Search, label: "اکسپلور", href: "/explore", color: "bg-primary/15", iconColor: "text-primary" },
                { icon: CalendarDays, label: "رزروها", href: "/bookings", color: "bg-success/15", iconColor: "text-success" },
                { icon: BarChart3, label: "آمار", href: "/analytics", color: "bg-chart-purple/15", iconColor: "text-chart-purple" },
                { icon: Zap, label: "ابزارها", href: "/tools", color: "bg-warning/15", iconColor: "text-warning" },
                { icon: Award, label: "رکوردها", href: "/pr", color: "bg-warning/15", iconColor: "text-warning" },
                { icon: PersonStanding, label: "نقشه بدن", href: "/body-map", color: "bg-info/15", iconColor: "text-info" },
                { icon: Users, label: "فید", href: "/community", color: "bg-destructive/15", iconColor: "text-destructive" },
                { icon: Dumbbell, label: "حرکات", href: "/exercises", color: "bg-success/15", iconColor: "text-success" },
              ].map((action) => (
                <Link key={action.label} href={action.href}>
                  <div className="flex flex-col items-center gap-2 haptic-ready group">
                    <div className={`w-11 h-11 rounded-2xl ${action.color} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-90 border border-white/5`}>
                      <action.icon className={`w-5 h-5 ${action.iconColor}`} strokeWidth={2} />
                    </div>
                    <span className="text-[10px] font-bold text-foreground/50 text-center leading-tight">
                      {action.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </MagicCard>
      </motion.div>

      {/* ── Smart Workout Builder ── */}
      <motion.div variants={itemVariants}>
        <Link href="/workout-builder" className="block">
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-l from-chart-purple/15 via-chart-purple/5 to-transparent border border-chart-purple/20 haptic-ready">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-chart-purple/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-chart-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">ساخت تمرین هوشمند</p>
                <p className="text-[10px] text-foreground/40 mt-0.5 font-medium">عضلات + تجهیزات → تمرین سفارشی</p>
              </div>
              <span className="text-xs font-bold text-chart-purple shrink-0">ساخت ←</span>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Popular Gyms ── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground tracking-tight">{t("home.popularGyms")}</h2>
          <Link href="/gyms" className="text-xs font-bold text-primary">
            مشاهده همه ←
          </Link>
        </div>

        <div className="space-y-4 stagger-children">
          {popularGyms.map((gym) => (
            <Link key={gym.id} href={`/explore/${gym.id}`}>
              <div className="glass-card p-3.5 haptic-ready flex items-center gap-3 border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/8 to-white/3 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-foreground/20" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground truncate">{gym.name}</h3>
                    <div className="flex items-center gap-1 shrink-0 mr-2">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span className="text-[10px] font-bold text-foreground/50">
                        {gym.rating?.toFixed(1) || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-foreground/25" />
                      <span className="text-[10px] text-foreground/35 font-medium">{gym.distance || "—"}</span>
                    </div>
                    <span className="text-[10px] text-foreground/15">•</span>
                    <span className="text-[10px] font-bold text-primary">
                      {formatPrice(BigInt(gym.price_per_hour || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {popularGyms.length === 0 && (
            <div className="glass-card p-10 text-center border border-dashed border-white/10">
              <p className="text-sm text-foreground/30 font-medium">باشگاهی در محدوده شما یافت نشد</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Gym Suggestion Sheet ── */}
      {showGymSheet && (
        <GymSuggestionSheet
          suggestions={gymSuggestions}
          onClose={() => setShowGymSheet(false)}
        />
      )}
    </motion.div>
  )
}