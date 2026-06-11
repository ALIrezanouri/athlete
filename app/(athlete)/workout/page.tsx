"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { toPng } from "html-to-image"
import {
  startWorkout,
  getActiveWorkout,
  addExerciseToWorkout,
  addSet,
  updateSet,
  deleteSet,
  completeWorkout,
  discardWorkout,
  getExercises,
  getLastPerformance,
  getWorkoutHistory,
} from "@/app/actions/workouts"
import { getRoutines, startWorkoutFromRoutine } from "@/app/actions/routines"
import type { WorkoutExercise, WorkoutSet } from "@/app/actions/workouts"
import {
  Plus, X, Check, Trash2, Search, Dumbbell, Flame, Clock, Trophy,
  Zap, Play, ChevronLeft, BarChart3, FolderOpen, Sparkles,
  Share2, Download,
} from "lucide-react"
import Link from "next/link"
import { WorkoutShareCard } from "@/components/ui/workout-share-card"

// ── Animation Variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
}

// ══════════════════════════════════════════════════════════════
// SECTION 1: WORKOUT START HUB (no active workout)
// ══════════════════════════════════════════════════════════════

function WorkoutStartHub({ onStartWorkout }: { onStartWorkout: () => void }) {
  const router = useRouter()
  const [routines, setRoutines] = useState<any[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [routinesRes, historyRes] = await Promise.all([
          getRoutines(),
          getWorkoutHistory({ limit: 3 }),
        ])
        if (routinesRes.success && routinesRes.routines) setRoutines(routinesRes.routines)
        if (historyRes.success && historyRes.sessions) setRecentWorkouts(historyRes.sessions)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleStartRoutine = async (routineId: string) => {
    const res = await startWorkoutFromRoutine(routineId)
    if (res.success && res.sessionId) router.refresh()
  }

  return (
    <motion.div
      className="min-h-screen gradient-mesh pb-28" dir="rtl"
      variants={containerVariants} initial="hidden" animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="px-4 pt-14 pb-2">
        <h1 className="text-2xl font-bold text-foreground">شروع تمرین</h1>
        <p className="text-sm text-foreground/35 mt-1">یک تمرین جدید شروع کنید یا از برنامه‌هایتان استفاده کنید</p>
      </motion.div>

      {/* Primary CTA: Empty Workout */}
      <motion.div variants={itemVariants} className="px-4 mt-4">
        <button
          onClick={onStartWorkout}
          className="w-full hevy-btn-primary py-4 text-base flex items-center justify-center gap-2 animate-pulse-glow"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          شروع تمرین خالی
        </button>
      </motion.div>

      {/* ── My Routines ── */}
      <motion.div variants={itemVariants} className="mt-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-primary" />
            برنامه‌های من
          </h2>
          <Link href="/routines" className="text-xs font-medium text-primary flex items-center gap-1">
            همه
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {routines.length > 0 ? (
          <div className="px-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {routines.map((routine) => {
              const dayCount = (routine as any).routine_days?.length || 0
              return (
                <button
                  key={routine.id}
                  onClick={() => handleStartRoutine(routine.id)}
                  className="shrink-0 w-[160px] glass-card p-3.5 text-right haptic-ready"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center mb-2.5">
                    <Dumbbell className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{routine.name}</p>
                  <p className="text-[10px] text-foreground/30 mt-1">{dayCount} روز · {routine.use_count || 0} استفاده</p>
                  <div className="mt-3 flex items-center gap-1 text-primary text-[11px] font-semibold">
                    <Play className="w-3 h-3" /> شروع
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="px-4">
            <Link href="/routines">
              <div className="glass-card p-4 flex items-center gap-3 haptic-ready border-dashed border-white/10">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-foreground/30" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/60">هنوز برنامه‌ای نساخته‌اید</p>
                  <p className="text-[10px] text-foreground/25 mt-0.5">ساخت برنامه تمرینی</p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </motion.div>

      {/* ── Template Suggestions ── */}
      <motion.div variants={itemVariants} className="mt-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warning" />
            برنامه‌های آماده
          </h2>
          <Link href="/routines/templates" className="text-xs font-medium text-primary flex items-center gap-1">
            بیشتر
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="px-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {[
            { name: "Push/Pull/Legs", days: 6, icon: "🏋️", color: "from-primary/20 to-primary/5" },
            { name: "Upper/Lower", days: 4, icon: "💪", color: "from-success/20 to-success/5" },
            { name: "Full Body", days: 3, icon: "⚡", color: "from-warning/20 to-warning/5" },
            { name: "Bro Split", days: 5, icon: "🔥", color: "from-chart-purple/20 to-chart-purple/5" },
          ].map((tpl) => (
            <Link key={tpl.name} href="/routines/templates">
              <div className={`shrink-0 w-[140px] rounded-2xl bg-gradient-to-br ${tpl.color} border border-white/5 p-3.5 haptic-ready`}>
                <span className="text-2xl">{tpl.icon}</span>
                <p className="text-sm font-semibold text-foreground mt-2">{tpl.name}</p>
                <p className="text-[10px] text-foreground/30 mt-0.5">{tpl.days} روز</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Recent Workouts ── */}
      <motion.div variants={itemVariants} className="mt-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-success" />
            تمرین‌های اخیر
          </h2>
          <Link href="/history" className="text-xs font-medium text-primary flex items-center gap-1">
            تاریخچه
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentWorkouts.length > 0 ? (
          <div className="px-4 space-y-2.5">
            {recentWorkouts.map((w) => (
              <div key={w.id} className="glass-card p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{w.name || "تمرین"}</p>
                  <p className="text-[10px] text-foreground/30 mt-0.5">
                    {new Date(w.completed_at || w.start_time).toLocaleDateString("fa-IR")} · {w.exercise_count || 0} حرکت
                  </p>
                </div>
                <span className="text-[10px] text-foreground/20">
                  {w.duration_minutes ? `${w.duration_minutes} دقیقه` : "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4">
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-foreground/25">هنوز تمرینی ثبت نشده</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Quick Links ── */}
      <motion.div variants={itemVariants} className="px-4 mt-6">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/body-map" className="bento-cell p-3 flex items-center gap-3 haptic-ready">
            <div className="w-9 h-9 rounded-xl bg-chart-purple/15 flex items-center justify-center shrink-0">
              <span className="text-lg">🦴</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">نقشه بدن</p>
              <p className="text-[9px] text-foreground/25 mt-0.5">عضله‌های هدف</p>
            </div>
          </Link>
          <Link href="/history" className="bento-cell p-3 flex items-center gap-3 haptic-ready">
            <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">تاریخچه</p>
              <p className="text-[9px] text-foreground/25 mt-0.5">تمرین‌های قبلی</p>
            </div>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════
// SECTION 2: CIRCULAR REST TIMER
// ══════════════════════════════════════════════════════════════

function CircularRestTimer({ defaultSeconds = 90, onEnd }: { defaultSeconds?: number; onEnd?: () => void }) {
  const [seconds, setSeconds] = useState(defaultSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [totalTime, setTotalTime] = useState(defaultSeconds)

  useEffect(() => {
    if (!isRunning || seconds <= 0) return
    const id = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) { setIsRunning(false); onEnd?.(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, seconds, onEnd])

  const start = (s?: number) => { const v = s || defaultSeconds; setSeconds(v); setTotalTime(v); setIsRunning(true) }
  const toggle = () => { if (seconds <= 0) start(); else setIsRunning(!isRunning) }
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  const r = 16, c = 2 * Math.PI * r
  const progress = seconds > 0 ? ((totalTime - seconds) / totalTime) * c : 0

  return (
    <div className="flex items-center gap-2">
      <button onClick={toggle} className="relative w-9 h-9 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r={r} fill="none" stroke="#3A3A3C" strokeWidth="2.5" />
          {isRunning && (
            <circle cx="18" cy="18" r={r} fill="none" stroke="#4F8EF7" strokeWidth="2.5"
              strokeLinecap="round" strokeDasharray={c} strokeDashoffset={progress} className="ring-progress" />
          )}
        </svg>
        <span className={`absolute text-[10px] font-bold ${seconds <= 0 ? "text-success" : isRunning ? "text-primary" : "text-warning"}`}>
          {seconds <= 0 ? "✓" : fmt(seconds)}
        </span>
      </button>
      <div className="flex gap-1">
        {[60, 90, 120, 180].map((s) => (
          <button key={s} onClick={() => start(s)}
            className={`text-[10px] px-1.5 py-0.5 rounded-md transition-all ${
              totalTime === s && isRunning ? "bg-primary text-foreground" : "bg-muted/60 text-foreground/40"
            }`}
          >{s >= 60 ? `${s / 60}m` : `${s}s`}</button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SECTION 3: EXERCISE PICKER MODAL
// ══════════════════════════════════════════════════════════════

function ExercisePicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (id: string, name: string) => void }) {
  const [search, setSearch] = useState("")
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)

  const muscleGroups = [
    { id: "chest", label: "سینه" }, { id: "back", label: "پشت" }, { id: "shoulders", label: "سرشانه" },
    { id: "biceps", label: "جلو بازو" }, { id: "triceps", label: "پشت بازو" }, { id: "quads", label: "جلو ران" },
    { id: "hamstrings", label: "پشت ران" }, { id: "glutes", label: "باسن" }, { id: "abs", label: "شکم" },
  ]

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getExercises({ search: search || undefined, muscleGroupId: selectedMuscle || undefined, locale: "fa", limit: 30 })
      .then((result) => { if (result.success && result.exercises) setExercises(result.exercises) })
      .finally(() => setLoading(false))
  }, [open, search, selectedMuscle])

  if (!open) return null

  const getName = (ex: any) => ex.translations?.find((t: any) => t.locale === "fa")?.name || ex.name_en

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-foreground">افزودن حرکت</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <X className="w-5 h-5 text-foreground/60" />
          </button>
        </div>

        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی حرکت..."
              className="w-full bg-hevy-elevated border border-white/5 rounded-xl pr-10 pl-4 py-3 text-foreground text-sm placeholder:text-foreground/25 focus:border-primary focus:outline-none transition-colors"
              autoFocus
            />
          </div>
        </div>

        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <button onClick={() => setSelectedMuscle(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !selectedMuscle ? "bg-primary text-foreground shadow-lg shadow-primary/20" : "bg-white/5 text-foreground/40"
            }`}
          >همه</button>
          {muscleGroups.map((mg) => (
            <button key={mg.id} onClick={() => setSelectedMuscle(mg.id === selectedMuscle ? null : mg.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedMuscle === mg.id ? "bg-primary text-foreground" : "bg-white/5 text-foreground/40"
              }`}
            >{mg.label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20">
          {loading ? (
            <div className="space-y-3 pt-4">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-foreground/30">
              <Dumbbell className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">حرکتی یافت نشد</p>
            </div>
          ) : (
            <div className="space-y-2 stagger-children">
              {exercises.map((ex) => (
                <button key={ex.id} onClick={() => { onSelect(ex.id, getName(ex)); onClose() }}
                  className="w-full glass-card p-3.5 flex items-center justify-between haptic-ready"
                >
                  <div className="text-right">
                    <p className="text-foreground text-sm font-medium">{getName(ex)}</p>
                    <p className="text-foreground/30 text-xs mt-0.5">{ex.name_en}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ══════════════════════════════════════════════════════════════
// SECTION 4: SET ROW
// ══════════════════════════════════════════════════════════════

function SetRow({ set, previousSet, isPR, onUpdate, onDelete, onCheck }: {
  set: WorkoutSet & { localId?: string }
  previousSet?: { weight_kg: number; reps: number } | null
  isPR?: boolean
  onUpdate: (id: string, data: any) => void
  onDelete: (id: string) => void
  onCheck: (id: string, weight: number, reps: number) => void
}) {
  const [weight, setWeight] = useState(set.weight_kg.toString())
  const [reps, setReps] = useState(set.reps.toString())
  const prevWeight = previousSet?.weight_kg || 0
  const prevReps = previousSet?.reps || 0

  return (
    <div className="relative">
      <motion.div layout
        className={`flex items-center gap-2 py-2 px-2 rounded-xl transition-all ${
          isPR && set.is_completed
            ? "bg-warning/10 border border-warning/25"
            : set.is_completed
              ? "bg-success/8 border border-success/15"
              : "bg-white/[0.02]"
        }`}
      >
        <span className={`text-xs font-bold w-5 text-center ${set.is_completed ? (isPR ? "text-warning" : "text-success") : "text-foreground/30"}`}>
          {set.set_number}
        </span>
        <span className="text-[10px] w-14 text-center truncate">
          {previousSet ? <span className="text-foreground/25">{prevWeight > 0 ? `${prevWeight}×${prevReps}` : "—"}</span> : <span className="text-foreground/10">—</span>}
        </span>
        <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
          onBlur={() => onUpdate(set.id, { weightKg: parseFloat(weight) || 0 })}
          className={`w-[72px] hevy-input px-2 py-2 text-center text-sm ${
            isPR && set.is_completed ? "animate-num-pop text-warning font-bold border-warning/50" : ""
          }`}
          placeholder="kg" disabled={set.is_completed}
        />
        <input type="number" value={reps} onChange={(e) => setReps(e.target.value)}
          onBlur={() => onUpdate(set.id, { reps: parseInt(reps) || 0 })}
          className="w-14 hevy-input px-2 py-2 text-center text-sm"
          placeholder="تکرار" disabled={set.is_completed}
        />
        <button onClick={() => onCheck(set.id, parseFloat(weight) || 0, parseInt(reps) || 0)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all haptic-ready ${
            isPR && set.is_completed
              ? "bg-warning shadow-md shadow-warning/30 text-black"
              : set.is_completed
                ? "bg-success shadow-md shadow-success/30 text-black"
                : "bg-white/5 text-foreground/30"
          }`}
        >
          {isPR && set.is_completed ? <Trophy className="w-4 h-4" /> : <Check className="w-4 h-4" />}
        </button>
        {!set.is_completed && (
          <button onClick={() => onDelete(set.id)} className="text-foreground/15 hover:text-destructive transition-colors mr-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
      {/* PR Celebration Badge */}
      <AnimatePresence>
        {isPR && set.is_completed && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            transition={{ type: "spring", damping: 14, stiffness: 300 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-warning to-destructive text-foreground text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-warning/30 whitespace-nowrap"
          >
            🏆 رکورد جدید!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SECTION 5: ACTIVE WORKOUT
// ══════════════════════════════════════════════════════════════

function ActiveWorkout({
  sessionId, sessionName, startTime, exercises, prevPerformance,
  totalVolume, totalSets, elapsed,
  onAddExercise, onAddSet, onUpdateSet, onCheckSet, onDeleteSet, onComplete, onDiscard, onSetName,
}: {
  sessionId: string
  sessionName: string
  startTime: string
  exercises: WorkoutExercise[]
  prevPerformance: Map<string, Array<{ weight_kg: number; reps: number }>>
  totalVolume: number
  totalSets: number
  elapsed: number
  onAddExercise: (id: string, name: string) => void
  onAddSet: (weId: string) => void
  onUpdateSet: (id: string, data: any) => void
  onCheckSet: (id: string, w: number, r: number) => void
  onDeleteSet: (id: string) => void
  onComplete: () => void
  onDiscard: () => void
  onSetName: (name: string) => void
}) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}` : `${m}:${sec.toString().padStart(2, "0")}`
  }

  const handleShare = async () => {
    if (!shareCardRef.current) return
    setIsCapturing(true)
    try {
      // Small delay to ensure render
      await new Promise(r => setTimeout(r, 100))
      const dataUrl = await toPng(shareCardRef.current, { cacheBust: true })
      const link = document.createElement("a")
      link.download = `workout-${new Date().getTime()}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Oops, something went wrong!", err)
    } finally {
      setIsCapturing(false)
    }
  }

  const prCount = exercises.reduce((count, ex) => {
    const prevSets = ex.exercise_id ? prevPerformance.get(ex.exercise_id) : undefined
    const maxPrevWeight = prevSets ? Math.max(...prevSets.map((s) => s.weight_kg), 0) : 0
    return count + (ex.sets?.filter(s => s.is_completed && s.weight_kg > maxPrevWeight && maxPrevWeight > 0).length || 0)
  }, 0)

  return (
    <div className="min-h-screen bg-background pb-32" dir="rtl">
      {/* ── Hidden Share Card Component ── */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        <div ref={shareCardRef}>
          <WorkoutShareCard
            workoutName={sessionName}
            duration={formatElapsed(elapsed)}
            totalVolume={totalVolume}
            totalSets={totalSets}
            prCount={prCount}
            date={new Date().toLocaleDateString("fa-IR")}
          />
        </div>
      </div>

      {/* ── Floating Header: Glass Pill Layout ── */}
      <div className="sticky top-4 z-40 px-4">
        <div className="glass-vibrant rounded-[24px] border-white/10 px-5 py-4 shadow-2xl flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <input type="text" value={sessionName} onChange={(e) => onSetName(e.target.value)}
              className="bg-transparent text-foreground text-lg font-black focus:outline-none w-full tracking-tight" />
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5 text-foreground/50 text-[11px] font-bold">
                <Clock className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                <span>{formatElapsed(elapsed)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground/50 text-[11px] font-bold">
                <Zap className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} fill="currentColor" />
                <span>{totalVolume.toLocaleString()} KG</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onDiscard} className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center transition-all active:scale-90">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={() => { onComplete(); setShowComplete(true) }}
              className="px-5 py-2.5 rounded-2xl bg-success text-black text-sm font-black shadow-lg shadow-success/20 transition-all active:scale-95"
            >اتمام</button>
          </div>
        </div>
      </div>

      {/* Exercise List */}
      <div className="px-4 py-8 space-y-6 stagger-children">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="glass-card overflow-hidden border-white/5 shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-white/[0.01]">
              <div>
                <h3 className="text-foreground font-bold text-sm tracking-tight">{exercise.exercise_name}</h3>
                <p className="text-foreground/30 text-[10px] font-bold mt-0.5 uppercase tracking-wider">
                  {exercise.sets?.filter((s) => s.is_completed).length || 0} / {exercise.sets?.length || 0} ست تکمیل شده
                </p>
              </div>
              <button className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-foreground/20 hover:text-destructive transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 text-foreground/20 text-[10px] font-black uppercase tracking-widest">
              <span className="w-5 text-center">ست</span>
              <span className="w-14 text-center">قبلی</span>
              <span className="w-[72px] text-center">وزن</span>
              <span className="w-14 text-center">تکرار</span>
              <span className="w-8" />
            </div>

            <div className="px-2 pb-2 space-y-1.5">
              {exercise.sets?.map((set) => {
                const prevSets = exercise.exercise_id ? prevPerformance.get(exercise.exercise_id) : undefined
                const maxPrevWeight = prevSets ? Math.max(...prevSets.map((s) => s.weight_kg), 0) : 0
                const isPR = set.is_completed && set.weight_kg > maxPrevWeight && maxPrevWeight > 0
                return (
                  <SetRow key={set.id} set={set}
                    previousSet={prevSets ? prevSets[set.set_number - 1] : undefined}
                    isPR={isPR}
                    onUpdate={onUpdateSet} onDelete={onDeleteSet} onCheck={onCheckSet}
                  />
                )
              })}
            </div>

            <div className="px-4 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
              <button onClick={() => onAddSet(exercise.id)}
                className="flex items-center gap-2 text-primary text-xs font-black tracking-tight"
              >
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                   <Plus className="w-3.5 h-3.5" />
                </div>
                افزودن ست
              </button>
              <CircularRestTimer defaultSeconds={exercise.rest_seconds || 90} />
            </div>
          </div>
        ))}

        <button onClick={() => setShowPicker(true)}
          className="w-full glass-card p-5 flex items-center justify-center gap-3 text-primary font-black text-sm haptic-ready border-dashed border-primary/20 hover:border-primary/40 transition-all bg-primary/[0.02]"
        >
          <Plus className="w-5 h-5" />افزودن حرکت جدید
        </button>
      </div>

      <ExercisePicker open={showPicker} onClose={() => setShowPicker(false)} onSelect={onAddExercise} />

      {/* Completion Modal */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 hevy-overlay flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="glass-card p-8 w-full max-w-sm text-center shadow-[0_32px_64px_rgba(0,0,0,0.6)]"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2, damping: 12 }}
                className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/10"
              >
                <Trophy className="w-12 h-12 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-black text-white mb-1 leading-tight">خسته نباشی قهرمان! 🎉</h2>
              <p className="text-white/40 text-sm font-bold mb-8">تمرین شما با موفقیت ثبت شد</p>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { value: formatElapsed(elapsed), label: "زمان", color: "text-primary" },
                  { value: totalSets.toString(), label: "ست", color: "text-success" },
                  { value: totalVolume.toLocaleString(), label: "حجم", color: "text-warning" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/[0.04] rounded-2xl p-4 border border-white/5">
                    <p className={`font-black text-lg ${stat.color}`}>{stat.value}</p>
                    <p className="text-white/20 text-[10px] font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleShare}
                  disabled={isCapturing}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 py-4 text-sm font-black text-white transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50"
                >
                  {isCapturing ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Share2 className="w-4 h-4" />}
                  اشتراک‌گذاری کارت شیشه‌ای
                </button>
                <button
                  onClick={() => { setShowComplete(false); router.push("/home") }}
                  className="w-full hevy-btn-primary py-4 text-sm font-black tracking-tight"
                >بازگشت به خانه</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE: Orchestrates Start Hub vs Active Workout
// ══════════════════════════════════════════════════════════════

export default function WorkoutPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState("تمرین")
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [startTime, setStartTime] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const [totalVolume, setTotalVolume] = useState(0)
  const [totalSets, setTotalSets] = useState(0)
  const [loading, setLoading] = useState(true)
  const [prevPerformance, setPrevPerformance] = useState<Map<string, Array<{ weight_kg: number; reps: number }>>>(new Map())

  useEffect(() => { loadActiveWorkout() }, [])

  const loadActiveWorkout = async () => {
    const result = await getActiveWorkout()
    if (result.success && result.session) {
      setSessionId(result.session.id)
      setSessionName(result.session.name)
      setStartTime(result.session.start_time)
      setExercises(result.exercises || [])
      recalcStats(result.exercises || [])
      const prevMap = new Map<string, Array<{ weight_kg: number; reps: number }>>()
      for (const ex of result.exercises || []) {
        if (ex.exercise_id && !prevMap.has(ex.exercise_id)) {
          const prev = await getLastPerformance(ex.exercise_id)
          if (prev.success && prev.lastSets) prevMap.set(ex.exercise_id, prev.lastSets)
        }
      }
      setPrevPerformance(prevMap)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => { setElapsed(Math.round((Date.now() - new Date(startTime).getTime()) / 1000)) }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const recalcStats = (exs: WorkoutExercise[]) => {
    let vol = 0, sets = 0
    for (const ex of exs) for (const s of ex.sets || []) { if (s.is_completed) { vol += s.weight_kg * s.reps; sets++ } }
    setTotalVolume(vol); setTotalSets(sets)
  }

  const handleStartWorkout = async () => {
    const result = await startWorkout({ name: "تمرین" })
    if (result.success && result.sessionId) {
      setSessionId(result.sessionId)
      setStartTime(new Date().toISOString())
    }
  }

  const handleAddExercise = async (exerciseId: string, name: string) => {
    if (!sessionId) return
    const result = await addExerciseToWorkout({ sessionId, exerciseId, exerciseName: name })
    if (result.success) await loadActiveWorkout()
  }

  const handleAddSet = async (workoutExerciseId: string) => { await addSet({ workoutExerciseId }); await loadActiveWorkout() }
  const handleUpdateSet = async (setId: string, data: any) => { await updateSet({ setId, ...data }) }
  const handleCheckSet = async (setId: string, weight: number, reps: number) => {
    await updateSet({ setId, weightKg: weight, reps, isCompleted: true }); await loadActiveWorkout()
  }
  const handleDeleteSet = async (setId: string) => { await deleteSet(setId); await loadActiveWorkout() }

  const handleComplete = async () => {
    if (!sessionId) return
    const result = await completeWorkout({ sessionId, name: sessionName })
    if (result.success) { setSessionId(null); setExercises([]); setElapsed(0) }
  }

  const handleDiscard = async () => {
    if (!sessionId) return
    if (confirm("آیا مطمئن هستید؟ تمرین حذف خواهد شد.")) {
      await discardWorkout(sessionId)
      setSessionId(null); setExercises([]); setElapsed(0)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  // If no active workout → show Start Hub
  if (!sessionId) {
    return <WorkoutStartHub onStartWorkout={handleStartWorkout} />
  }

  // Active workout → show workout tracker
  return (
    <ActiveWorkout
      sessionId={sessionId} sessionName={sessionName} startTime={startTime}
      exercises={exercises} prevPerformance={prevPerformance}
      totalVolume={totalVolume} totalSets={totalSets} elapsed={elapsed}
      onAddExercise={handleAddExercise} onAddSet={handleAddSet}
      onUpdateSet={handleUpdateSet} onCheckSet={handleCheckSet}
      onDeleteSet={handleDeleteSet} onComplete={handleComplete}
      onDiscard={handleDiscard} onSetName={setSessionName}
    />
  )
}