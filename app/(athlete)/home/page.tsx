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
  Wallet,
  UserPlus,
  ChevronRight,
  Navigation,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useTransition, memo, useCallback } from "react"
import { getUpcomingBookings, getPopularGyms, getGymSuggestionsForRoutine } from "@/app/actions/gyms"
import type { GymSuggestion } from "@/app/actions/gyms"
import { getWorkoutStats } from "@/app/actions/analytics"
import { getPersonalRecords } from "@/app/actions/analytics"
import { getActiveWorkout } from "@/app/actions/workouts"
import { getRoutines } from "@/app/actions/routines"
import GymSuggestionSheet from "@/components/gym-suggestion/gym-suggestion-sheet"
import { getAthleteLevel } from "@/lib/gamification/engine"
import { getAthleteCoins } from "@/app/actions/gamification"

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
        <span className="text-[7px] text-foreground/40 mt-0.5">
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
    <div className="flex items-end justify-between gap-1.5 h-14">
      {activeDays.map((active, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
          <div
            className={`w-full rounded-md transition-all duration-500 ${
              active ? "bg-primary h-10" : "bg-white/5 h-2.5"
            }`}
            style={{ transitionDelay: `${i * 80}ms` }}
          />
          <span className={`text-[9px] font-medium ${active ? "text-primary" : "text-foreground/30"}`}>
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
  const { t, formatPrice, locale } = useGlobalEngine()
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
  const [coins, setCoins] = useState(0)
  // Active (in-progress) workout for "Continue" card
  const [activeWorkout, setActiveWorkout] = useState<{ name: string; exerciseCount: number; elapsed: number } | null>(null)
  // Today's routine suggestion + gym suggestions
  const [todayRoutine, setTodayRoutine] = useState<{ id: string; name: string } | null>(null)
  const [gymSuggestions, setGymSuggestions] = useState<GymSuggestion[]>([])
  const [gymLoading, setGymLoading] = useState(false)
  const [showGymSheet, setShowGymSheet] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // ── Phase 1: Fire all independent requests in parallel ──
        const [upcomingResult, gymsResult, statsResult, prResult, activeResult, routinesResult, coinsResult] =
          await Promise.all([
            getUpcomingBookings(),
            getPopularGyms(),
            getWorkoutStats({ period: "all" }),
            getPersonalRecords(),
            getActiveWorkout(),
            getRoutines(),
            getAthleteCoins(),
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

        // Process coins
        if (coinsResult.success) {
          setCoins(coinsResult.balance ?? 0)
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

  const athleteLevel = getAthleteLevel(totalVolume)

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
      className="px-4 pt-12 pb-32 space-y-5 gradient-mesh min-h-screen"
      dir="rtl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Hero: Greeting + Streak ── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()} 👋
          </h1>
          <div className="flex items-center gap-2 mt-1">
             <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1">
               <Trophy className="w-3 h-3 text-primary" />
               <span className="text-[10px] font-bold text-primary">{athleteLevel.title}</span>
             </div>
             <p className="text-xs text-foreground/40">{getMotivation()}</p>
          </div>

          {/* Athlete Coins Preview */}
          <Link href="/wallet" className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20">
            <div className="w-4 h-4 rounded-full bg-warning flex items-center justify-center">
              <span className="text-[10px] font-black text-black">R</span>
            </div>
            <span className="text-xs font-bold text-warning">
              {coins.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')} {locale === 'fa' ? 'کوین' : 'Coins'}
            </span>
            <ChevronRight className="w-3 h-3 text-warning/40" />
          </Link>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <StreakRing days={streak} />
          <span className="text-[9px] text-primary font-semibold">استریک</span>
        </div>
      </motion.div>

      {/* ── Level Progress Card ── */}
      <motion.div variants={itemVariants}>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-foreground/60">سطح پهلوانی</span>
            <span className="text-[10px] text-foreground/30">
              {athleteLevel.remainingToNext && athleteLevel.remainingToNext > 0
                ? `${athleteLevel.remainingToNext.toLocaleString('fa-IR')} kg تا ${athleteLevel.nextLevel}`
                : 'بالاترین سطح! 👑'}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-chart-purple"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalVolume / (totalVolume + (athleteLevel.remainingToNext || 0))) * 100, 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
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
              <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-l from-primary/20 via-primary/10 to-transparent border border-primary/20 haptic-ready">
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
                      <span className="text-[10px] text-foreground/50">
                        {activeWorkout.exerciseCount.toLocaleString("fa-IR")} حرکت
                      </span>
                      <span className="text-[10px] text-foreground/20">•</span>
                      <span className="text-[10px] text-foreground/50 flex items-center gap-1">
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
          <div className="glass-card p-4 haptic-ready">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-foreground/40 font-medium">تمرین امروز</p>
                <p className="text-sm font-semibold text-foreground truncate">{todayRoutine.name}</p>
              </div>
              {gymSuggestions.length > 0 && (
                <button
                  onClick={handleFindGym}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/20 text-xs font-medium text-primary shrink-0 haptic-ready"
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
                        <p className="text-xs font-medium text-foreground truncate">{suggestion.gym.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-success font-semibold">
                            {suggestion.matchScore}% تطابق
                          </span>
                          {suggestion.distance && (
                            <span className="text-[9px] text-foreground/30">
                              {suggestion.distance.toFixed(1)} km
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
        </motion.div>
      )}

      {/* ── Weekly Activity ── */}
      <motion.div variants={itemVariants}>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-foreground/60">فعالیت هفتگی</span>
            <span className="text-[10px] text-primary font-medium">
              {weekActive.filter(Boolean).length} از ۷ روز
            </span>
          </div>
          <WeeklyBars activeDays={weekActive} />
        </div>
      </motion.div>

      {/* ── Quick Stats — Bento Grid ── */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/workout" className="glass-card p-3 flex flex-col items-center justify-center text-center haptic-ready">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">{totalWorkouts.toLocaleString("fa-IR")}</span>
            <span className="text-[9px] text-foreground/40 mt-0.5">تمرین</span>
          </Link>

          <Link href="/analytics" className="glass-card p-3 flex flex-col items-center justify-center text-center haptic-ready">
            <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center mb-2">
              <Trophy className="w-5 h-5 text-success" />
            </div>
            <span className="text-lg font-bold text-foreground">{prCount.toLocaleString("fa-IR")}</span>
            <span className="text-[9px] text-foreground/40 mt-0.5">رکورد جدید</span>
          </Link>

          <Link href="/calendar" className="glass-card p-3 flex flex-col items-center justify-center text-center haptic-ready">
            <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-warning" />
            </div>
            <span className="text-lg font-bold text-foreground">{totalVolume >= 1000 ? `${Math.round(totalVolume / 1000).toLocaleString("fa-IR")}K` : totalVolume.toLocaleString("fa-IR")}</span>
            <span className="text-[9px] text-foreground/40 mt-0.5">حجم (kg)</span>
          </Link>
        </div>
      </motion.div>

      {/* ── Upcoming Session / My Reservations ── */}
      <motion.div variants={itemVariants}>
        <Link href="/bookings" className="block">
          <div className="glass-card p-4 haptic-ready">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-foreground/40 font-medium">{t("home.upcomingSession")}</p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {upcomingBooking?.gymName || "مشاهده رزروها"}
                </p>
              </div>
              {upcomingBooking ? (
                <div className="text-left shrink-0">
                  <p className="text-[10px] text-primary font-medium">{upcomingBooking.time}</p>
                  <p className="text-[10px] text-foreground/30">{upcomingBooking.sport}</p>
                </div>
              ) : (
                <span className="text-xs font-bold text-primary shrink-0">رزروها ←</span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Quick Actions — Feature Hub ── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-foreground/60">دسترسی سریع</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { icon: Search, label: "اکسپلور", href: "/explore", color: "bg-primary/10", iconColor: "text-primary" },
            { icon: CalendarDays, label: "رزروها", href: "/bookings", color: "bg-success/10", iconColor: "text-success" },
            { icon: BarChart3, label: "آمار", href: "/analytics", color: "bg-chart-purple/10", iconColor: "text-chart-purple" },
            { icon: Wallet, label: "کیف پول", href: "/wallet", color: "bg-warning/10", iconColor: "text-warning" },
            { icon: UserPlus, label: "دعوت", href: "/referral", color: "bg-info/10", iconColor: "text-info" },
            { icon: Award, label: "رکوردها", href: "/pr", color: "bg-warning/10", iconColor: "text-warning" },
            { icon: Users, label: "فید", href: "/community", color: "bg-destructive/10", iconColor: "text-destructive" },
            { icon: Dumbbell, label: "حرکات", href: "/exercises", color: "bg-success/10", iconColor: "text-success" },
          ].map((action) => (
            <Link key={action.label} href={action.href}>
              <div className="glass-card p-3 flex flex-col items-center gap-2 haptic-ready">
                <div className={`w-9 h-9 rounded-xl ${action.color} flex items-center justify-center`}>
                  <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <span className="text-[11px] font-bold text-foreground/50 text-center leading-tight">
                  {action.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Smart Workout Builder ── */}
      <motion.div variants={itemVariants}>
        <Link href="/workout-builder" className="block">
          <div className="glass-card p-4 haptic-ready border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-chart-purple/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-chart-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">ساخت تمرین هوشمند</p>
                <p className="text-[10px] text-foreground/40 mt-0.5">عضلات + تجهیزات → تمرین سفارشی</p>
              </div>
              <span className="text-xs font-bold text-chart-purple shrink-0">ساخت ←</span>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Popular Gyms ── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">{t("home.popularGyms")}</h2>
          <Link href="/gyms" className="text-xs font-medium text-primary">
            مشاهده همه ←
          </Link>
        </div>

        <div className="space-y-4 stagger-children">
          {popularGyms.map((gym) => (
            <Link key={gym.id} href={`/explore/${gym.id}`}>
              <div className="glass-card p-3.5 haptic-ready flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                  <TrendingUp className="w-5 h-5 text-foreground/20" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground truncate">{gym.name}</h3>
                    <div className="flex items-center gap-1 shrink-0 mr-2">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span className="text-[10px] font-medium text-foreground/50">
                        {gym.rating?.toFixed(1) || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-foreground/25" />
                      <span className="text-[10px] text-foreground/35">{gym.distance || "—"}</span>
                    </div>
                    <span className="text-[10px] text-foreground/15">•</span>
                    <span className="text-[10px] font-semibold text-primary">
                      {formatPrice(BigInt(gym.price_per_hour || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {popularGyms.length === 0 && (
            <div className="glass-card p-8 text-center border-dashed">
              <p className="text-sm text-foreground/30">باشگاهی یافت نشد</p>
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
