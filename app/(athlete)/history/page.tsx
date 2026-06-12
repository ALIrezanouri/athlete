"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { getWorkoutHistory } from "@/app/actions/workouts"
import type { WorkoutSession } from "@/app/actions/workouts"
import {
  Dumbbell,
  Clock,
  Flame,
  Zap,
  ChevronDown,
  Calendar,
  Trophy,
  TrendingUp,
  ArrowRight,
  RotateCcw,
} from "lucide-react"

// ── Workout Detail Card ──
function WorkoutCard({ workout, onRepeat }: {
  workout: WorkoutSession & { exercises?: any[] }
  onRepeat: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(workout.start_time)
  const persianDate = date.toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" })
  const timeStr = date.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
  const duration = workout.duration_seconds ? `${Math.floor(workout.duration_seconds / 60)} دقیقه` : "—"
  const volume = workout.total_volume?.toLocaleString() || "0"
  const calories = workout.estimated_calories || 0

  return (
    <motion.div layout className="glass-card overflow-hidden">
      {/* Main Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-right"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
          <Dumbbell className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-foreground font-bold text-sm truncate">{workout.name || "تمرین"}</h3>
          <p className="text-foreground/30 text-xs mt-0.5">{persianDate} · {timeStr}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-warning text-[10px]">
              <Clock className="w-3 h-3" />{duration}
            </span>
            <span className="flex items-center gap-1 text-primary text-[10px]">
              <Zap className="w-3 h-3" />{volume} kg
            </span>
            <span className="flex items-center gap-1 text-destructive text-[10px]">
              <Flame className="w-3 h-3" />{calories} kcal
            </span>
          </div>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-foreground/20" />
        </motion.div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                  <p className="text-primary font-bold text-sm">{workout.total_sets || 0}</p>
                  <p className="text-foreground/25 text-[10px]">ست</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                  <p className="text-success font-bold text-sm">{volume}</p>
                  <p className="text-foreground/25 text-[10px]">حجم (kg)</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                  <p className="text-warning font-bold text-sm">{calories}</p>
                  <p className="text-foreground/25 text-[10px]">کالری</p>
                </div>
              </div>

              {/* Exercises */}
              {workout.exercises && workout.exercises.length > 0 && (
                <div className="space-y-2">
                  {workout.exercises.map((ex: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1.5">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-foreground/60 text-xs flex-1">{ex.exercise_name || `حرکت ${i + 1}`}</span>
                      <span className="text-foreground/30 text-[10px]">{ex.sets?.length || 0} ست</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                <button
                  onClick={(e) => { e.stopPropagation(); onRepeat(workout.id) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold transition-all active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />تکرار تمرین
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main History Page ──
export default function HistoryPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "week" | "month">("all")

  useEffect(() => {
    loadHistory()
  }, [filter])

  const loadHistory = async () => {
    setLoading(true)
    const daysMap = { all: 365, week: 7, month: 30 }
    const result = await getWorkoutHistory({ limit: 50 })
    if (result.success && result.sessions) {
      setWorkouts(result.sessions)
    }
    setLoading(false)
  }

  const handleRepeat = (sessionId: string) => {
    router.push(`/workout?repeat=${sessionId}`)
  }

  // Group workouts by date
  const grouped = workouts.reduce((acc: any, w: any) => {
    const date = new Date(w.start_time).toLocaleDateString("fa-IR", { day: "numeric", month: "long", year: "numeric" })
    if (!acc[date]) acc[date] = []
    acc[date].push(w)
    return acc
  }, {})

  const totalVolume = workouts.reduce((sum, w) => sum + (w.total_volume || 0), 0)
  const totalSets = workouts.reduce((sum, w) => sum + (w.total_sets || 0), 0)
  const totalDuration = workouts.reduce((sum, w) => sum + (w.duration_seconds || 0), 0)

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">📋 تاریخچه تمرین</h1>
          <button onClick={() => router.back()} className="text-primary text-sm font-medium">
            بازگشت
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="glass-card p-3 text-center">
            <p className="text-primary font-bold text-lg">{workouts.length}</p>
            <p className="text-foreground/30 text-[10px]">تمرین</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-success font-bold text-lg">{totalVolume.toLocaleString()}</p>
            <p className="text-foreground/30 text-[10px]">حجم کل (kg)</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-warning font-bold text-lg">{Math.floor(totalDuration / 60)}</p>
            <p className="text-foreground/30 text-[10px]">دقیقه</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: "all", label: "همه" },
            { key: "week", label: "این هفته" },
            { key: "month", label: "این ماه" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === f.key
                  ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                  : "bg-white/5 text-foreground/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workout List */}
      <div className="px-4 space-y-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/30">
            <Calendar className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm mb-1">هنوز تمرینی ثبت نشده</p>
            <p className="text-xs text-foreground/20">اولین تمرین خود را شروع کنید!</p>
            <button
              onClick={() => router.push("/workout")}
              className="mt-4 hevy-btn-primary px-6 py-2.5 text-sm"
            >
              شروع تمرین
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]: [string, any]) => (
            <div key={date} className="mb-4">
              <p className="text-foreground/25 text-xs font-medium mb-2 px-1">{date}</p>
              <div className="space-y-2">
                {items.map((w: any) => (
                  <WorkoutCard key={w.id} workout={w} onRepeat={handleRepeat} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}