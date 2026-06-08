"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  Dumbbell, Plus, Trash2, ChevronDown, X, Search, Loader2, ArrowRight,
} from "lucide-react"
import {
  getRoutineById, updateRoutine,
} from "@/app/actions/routines"
import { getExercises } from "@/app/actions/workouts"
import { useGlobalEngine } from "@/lib/GlobalEngineContext"
import type { Routine, RoutineDay } from "@/app/actions/routines"

// ── Animation Variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
}

interface DayForm {
  name: string
  exercises: Array<{
    exerciseId: string
    exerciseName: string
    sets: Array<{ weight_kg: number; reps: number; set_type?: string }>
  }>
}

export default function EditRoutinePage() {
  const { t } = useGlobalEngine()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [isPending, startTransition] = useTransition()

  const [routineName, setRoutineName] = useState("")
  const [routineDescription, setRoutineDescription] = useState("")
  const [days, setDays] = useState<DayForm[]>([])
  const [activeDayIdx, setActiveDayIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Exercise search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([])
  const [showExerciseSearch, setShowExerciseSearch] = useState(false)

  // ── Load routine data ──
  useEffect(() => {
    startTransition(async () => {
      const res = await getRoutineById(params.id)
      if (!res.success || !res.routine) {
        setError(res.error || "برنامه یافت نشد")
        setLoading(false)
        return
      }

      const routine = res.routine
      setRoutineName(routine.name)
      setRoutineDescription(routine.description || "")

      // Map routine_days → DayForm
      const routineDays = (routine as any).routine_days || []
      const mappedDays: DayForm[] = routineDays.map((day: any) => ({
        name: day.name,
        exercises: (day.routine_exercises || []).map((ex: any) => ({
          exerciseId: ex.exercise_id || "",
          exerciseName: ex.exercise_name,
          sets: (ex.routine_sets || []).map((s: any) => ({
            weight_kg: s.weight_kg,
            reps: s.reps,
            set_type: s.set_type || "normal",
          })),
        })),
      }))

      if (mappedDays.length === 0) {
        mappedDays.push({ name: "روز ۱", exercises: [] })
      }

      setDays(mappedDays)
      setLoading(false)
    })
  }, [params.id])

  // ── Search exercises ──
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await getExercises({ search: searchQuery, limit: 10 })
        if (res.success && res.exercises) {
          setSearchResults(
            res.exercises.map(e => ({
              id: e.id,
              name: e.translations?.find(t => t.locale === "fa")?.name || e.name_en,
            }))
          )
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // ── Handlers ──
  const addExerciseToDay = (exerciseId: string, exerciseName: string) => {
    setDays(prev => prev.map((d, i) =>
      i === activeDayIdx
        ? { ...d, exercises: [...d.exercises, { exerciseId, exerciseName, sets: [{ weight_kg: 0, reps: 0 }] }] }
        : d
    ))
    setShowExerciseSearch(false)
    setSearchQuery("")
  }

  const removeExerciseFromDay = (exIdx: number) => {
    setDays(prev => prev.map((d, i) =>
      i === activeDayIdx
        ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) }
        : d
    ))
  }

  const handleSave = () => {
    if (!routineName.trim()) return
    setSaving(true)
    startTransition(async () => {
      const res = await updateRoutine({
        routineId: params.id,
        name: routineName,
        description: routineDescription,
        days: days.map(d => ({
          name: d.name,
          exercises: d.exercises.map(e => ({
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            sets: e.sets,
          })),
        })),
      })
      if (res.success) {
        router.push("/routines")
      } else {
        setError(res.error || "خطا در ذخیره تغییرات")
      }
      setSaving(false)
    })
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // ── Error state ──
  if (error && days.length === 0) {
    return (
      <div className="min-h-screen gradient-mesh flex flex-col items-center justify-center px-4" dir="rtl">
        <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-4">
          <Dumbbell className="w-10 h-10 text-destructive/50" />
        </div>
        <p className="text-lg font-bold text-foreground mb-2">خطا</p>
        <p className="text-sm text-foreground/40 mb-6">{error}</p>
        <button
          onClick={() => router.push("/routines")}
          className="hevy-btn-primary px-6 py-3 text-sm flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          بازگشت به برنامه‌ها
        </button>
      </div>
    )
  }

  return (
    <motion.div
      className="min-h-screen gradient-mesh pb-28" dir="rtl"
      variants={containerVariants} initial="hidden" animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/routines")}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-foreground/50 hover:text-foreground/80 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">ویرایش برنامه</h1>
              <p className="text-[11px] text-foreground/30 mt-0.5">{days.length} روز · {days.reduce((acc, d) => acc + d.exercises.length, 0)} حرکت</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !routineName.trim()}
            className="hevy-btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "ذخیره..." : "ذخیره تغییرات"}
          </button>
        </div>
      </motion.div>

      {/* Error banner (non-blocking) */}
      {error && days.length > 0 && (
        <motion.div variants={itemVariants} className="px-4 mt-3">
          <div className="glass-card p-3 border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        </motion.div>
      )}

      <div className="px-4 py-4 space-y-5">
        {/* Routine Name */}
        <motion.div variants={itemVariants}>
          <label className="text-xs text-foreground/40 font-medium mb-1.5 block">نام برنامه</label>
          <input
            value={routineName}
            onChange={e => setRoutineName(e.target.value)}
            placeholder="مثلاً Push/Pull/Legs"
            className="w-full hevy-input text-sm"
          />
        </motion.div>

        {/* Routine Description */}
        <motion.div variants={itemVariants}>
          <label className="text-xs text-foreground/40 font-medium mb-1.5 block">توضیحات (اختیاری)</label>
          <input
            value={routineDescription}
            onChange={e => setRoutineDescription(e.target.value)}
            placeholder="توضیح مختصر درباره برنامه..."
            className="w-full hevy-input text-sm"
          />
        </motion.div>

        {/* Day Tabs */}
        <motion.div variants={itemVariants}>
          <label className="text-xs text-foreground/40 font-medium mb-2 block">روزهای تمرینی</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => { setActiveDayIdx(i); setShowExerciseSearch(false) }}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  i === activeDayIdx
                    ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                    : "bg-white/5 text-foreground/40"
                }`}
              >
                {d.name}
              </button>
            ))}
            <button
              onClick={() => {
                setDays(prev => [...prev, { name: `روز ${prev.length + 1}`, exercises: [] }])
                setActiveDayIdx(days.length)
                setShowExerciseSearch(false)
              }}
              className="shrink-0 w-9 h-9 rounded-xl bg-white/5 text-primary flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Day Name */}
        <motion.div variants={itemVariants}>
          <input
            value={days[activeDayIdx]?.name || ""}
            onChange={e => setDays(prev => prev.map((d, i) => i === activeDayIdx ? { ...d, name: e.target.value } : d))}
            placeholder="نام روز (مثلاً سینه و سرشانه)"
            className="w-full hevy-input text-sm"
          />
        </motion.div>

        {/* Delete Day Button */}
        {days.length > 1 && (
          <motion.div variants={itemVariants}>
            <button
              onClick={() => {
                const newDays = days.filter((_, i) => i !== activeDayIdx)
                setDays(newDays)
                setActiveDayIdx(Math.min(activeDayIdx, newDays.length - 1))
                setShowExerciseSearch(false)
              }}
              className="text-destructive text-xs flex items-center gap-1.5 hover:text-destructive/80 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> حذف این روز
            </button>
          </motion.div>
        )}

        {/* Exercises */}
        <div className="space-y-2">
          {days[activeDayIdx]?.exercises.map((ex, ei) => (
            <motion.div key={ei} variants={itemVariants} className="glass-card p-3">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  <span className="text-sm font-medium text-foreground">{ex.exerciseName}</span>
                </div>
                <button onClick={() => removeExerciseFromDay(ei)} className="text-foreground/20 hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5 pr-4">
                {ex.sets.map((s, si) => (
                  <div key={si} className="flex items-center gap-2 text-xs">
                    <span className="text-foreground/20 w-6">{si + 1}.</span>
                    <input
                      type="number"
                      value={s.weight_kg || ""}
                      onChange={e => {
                        setDays(prev => prev.map((d, i) => i === activeDayIdx ? {
                          ...d,
                          exercises: d.exercises.map((ex2, j) => j === ei ? {
                            ...ex2,
                            sets: ex2.sets.map((s2, k) => k === si ? { ...s2, weight_kg: Number(e.target.value) } : s2)
                          } : ex2)
                        } : d))
                      }}
                      placeholder="وزن (kg)"
                      className="w-24 hevy-input py-1.5 text-xs"
                    />
                    <span className="text-foreground/15">×</span>
                    <input
                      type="number"
                      value={s.reps || ""}
                      onChange={e => {
                        setDays(prev => prev.map((d, i) => i === activeDayIdx ? {
                          ...d,
                          exercises: d.exercises.map((ex2, j) => j === ei ? {
                            ...ex2,
                            sets: ex2.sets.map((s2, k) => k === si ? { ...s2, reps: Number(e.target.value) } : s2)
                          } : ex2)
                        } : d))
                      }}
                      placeholder="تکرار"
                      className="w-20 hevy-input py-1.5 text-xs"
                    />
                  </div>
                ))}
                <button
                  onClick={() => setDays(prev => prev.map((d, i) => i === activeDayIdx ? {
                    ...d,
                    exercises: d.exercises.map((ex2, j) => j === ei ? {
                      ...ex2, sets: [...ex2.sets, { weight_kg: 0, reps: 0 }]
                    } : ex2)
                  } : d))}
                  className="text-primary text-xs mt-1 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> افزودن ست
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add Exercise Button */}
        <motion.div variants={itemVariants}>
          <button
            onClick={() => setShowExerciseSearch(!showExerciseSearch)}
            className="w-full glass-card p-3.5 flex items-center justify-center gap-2 text-primary text-sm font-medium border-dashed border-white/10 hover:border-primary/30 transition-all haptic-ready"
          >
            <Plus className="w-4 h-4" /> افزودن حرکت
          </button>
        </motion.div>

        {/* Inline Exercise Search */}
        <AnimatePresence>
          {showExerciseSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="جستجوی حرکت..."
                    className="w-full hevy-input pr-10 py-2.5 text-sm"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {searchResults.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => addExerciseToDay(ex.id, ex.name)}
                      className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-white/5 text-sm text-foreground/70 transition-colors"
                    >
                      {ex.name}
                    </button>
                  ))}
                  {searchQuery && searchResults.length === 0 && (
                    <p className="text-center text-foreground/20 text-xs py-4">حرکتی یافت نشد</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom safe area */}
        <div className="h-8" />
      </div>
    </motion.div>
  )
}