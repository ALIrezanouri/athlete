"use client"

import { useState, useEffect, useTransition, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Dumbbell, Plus, Trash2, Play, ChevronDown, ChevronUp, FolderOpen, MoreHorizontal, Edit3, Copy, Share2, GripVertical, X, Search, Clock, BarChart3, MapPin, Loader2, Sparkles } from "lucide-react"
import { getRoutines, createRoutine, deleteRoutine, startWorkoutFromRoutine } from "@/app/actions/routines"
import { getExercises, getExerciseById } from "@/app/actions/workouts"
import { getGymSuggestionsForRoutine } from "@/app/actions/gyms"
import { useGlobalEngine } from "@/lib/GlobalEngineContext"
import GymSuggestionSheet from "@/components/gym-suggestion/gym-suggestion-sheet"
import type { Routine, RoutineDay } from "@/app/actions/routines"
import type { GymSuggestion } from "@/app/actions/gyms"
import Link from "next/link"

// ── Animation Variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
}

// ── Routine Card Colors ──
const cardColors = [
  "from-primary/15 to-primary/5",
  "from-success/15 to-success/5",
  "from-warning/15 to-warning/5",
  "from-chart-purple/15 to-chart-purple/5",
  "from-destructive/15 to-destructive/5",
]
const iconColors = ["text-primary", "text-success", "text-warning", "text-chart-purple", "text-destructive"]
const iconBgs = ["bg-primary/15", "bg-success/15", "bg-warning/15", "bg-chart-purple/15", "bg-destructive/15"]

function RoutinesContent() {
  const { t } = useGlobalEngine()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [routines, setRoutines] = useState<Routine[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Create form state
  const [newName, setNewName] = useState("")
  const [newDays, setNewDays] = useState<Array<{
    name: string
    exercises: Array<{ exerciseId: string; exerciseName: string; sets: Array<{ weight_kg: number; reps: number }> }>
  }>>([{ name: "روز ۱", exercises: [] }])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([])
  const [activeDayIdx, setActiveDayIdx] = useState(0)
  const [showExerciseSearch, setShowExerciseSearch] = useState(false)

  // Gym suggestion state
  const [gymSuggestions, setGymSuggestions] = useState<GymSuggestion[]>([])
  const [showGymSheet, setShowGymSheet] = useState(false)
  const [gymLoading, setGymLoading] = useState(false)

  // Load routines
  useEffect(() => {
    startTransition(async () => {
      const res = await getRoutines()
      if (res.success && res.routines) setRoutines(res.routines)
    })
  }, [])

  // Handle addExercise query param — pre-add exercise from detail page
  useEffect(() => {
    const addExerciseId = searchParams.get("addExercise")
    if (!addExerciseId) return
    startTransition(async () => {
      const res = await getExerciseById(addExerciseId, "fa")
      if (res.success && res.exercise) {
        const exName = res.exercise.localName || res.exercise.name_en
        setShowCreate(true)
        setNewDays(prev => prev.map((d, i) =>
          i === 0
            ? { ...d, exercises: [...d.exercises, { exerciseId: addExerciseId, exerciseName: exName, sets: [{ weight_kg: 0, reps: 0 }] }] }
            : d
        ))
      }
    })
    // Clear the query param from URL without triggering navigation
    router.replace("/routines", { scroll: false })
  }, [searchParams])

  // Search exercises
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await getExercises({ search: searchQuery, limit: 10 })
        if (res.success && res.exercises) {
          setSearchResults(res.exercises.map(e => ({
            id: e.id,
            name: e.translations?.find(t => t.locale === "fa")?.name || e.name_en,
          })))
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleCreate = () => {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createRoutine({
        name: newName,
        days: newDays.map(d => ({
          name: d.name,
          exercises: d.exercises.map(e => ({
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            sets: e.sets,
          })),
        })),
      })
      if (res.success) {
        setShowCreate(false)
        setNewName("")
        setNewDays([{ name: "روز ۱", exercises: [] }])
        const updated = await getRoutines()
        if (updated.success && updated.routines) setRoutines(updated.routines)
      }
    })
  }

  const handleDelete = (id: string) => {
    setMenuOpenId(null)
    startTransition(async () => {
      await deleteRoutine(id)
      setRoutines(prev => prev.filter(r => r.id !== id))
    })
  }

  const handleStartWorkout = (routineId: string) => {
    startTransition(async () => {
      const res = await startWorkoutFromRoutine(routineId)
      if (res.success && res.sessionId) router.push("/workout")
    })
  }

  const addExerciseToDay = (exerciseId: string, exerciseName: string) => {
    setNewDays(prev => prev.map((d, i) =>
      i === activeDayIdx
        ? { ...d, exercises: [...d.exercises, { exerciseId, exerciseName, sets: [{ weight_kg: 0, reps: 0 }] }] }
        : d
    ))
    setShowExerciseSearch(false)
    setSearchQuery("")
  }

  const removeExerciseFromDay = (exIdx: number) => {
    setNewDays(prev => prev.map((d, i) =>
      i === activeDayIdx
        ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) }
        : d
    ))
  }

  // Find suitable gym for a routine
  const handleFindGym = (routineId: string) => {
    setGymLoading(true)
    setShowGymSheet(true)

    const fetchSuggestions = async (lat?: number, lng?: number) => {
      startTransition(async () => {
        const res = await getGymSuggestionsForRoutine({
          routineId,
          userLocation: lat && lng ? { lat, lng } : undefined,
        })
        if (res.success && res.data) {
          setGymSuggestions(res.data)
        } else {
          setGymSuggestions([])
        }
        setGymLoading(false)
      })
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchSuggestions(pos.coords.latitude, pos.coords.longitude),
        () => fetchSuggestions() // fallback without location
      )
    } else {
      fetchSuggestions()
    }
  }

  return (
    <motion.div
      className="min-h-screen gradient-mesh pb-28" dir="rtl"
      variants={containerVariants} initial="hidden" animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">🏋️ برنامه‌های تمرینی</h1>
            <p className="text-[11px] text-foreground/30 mt-0.5">{routines.length} برنامه</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="hevy-btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            برنامه جدید
          </button>
        </div>
      </motion.div>

      {/* ── Smart Workout Builder Card ── */}
      <motion.div variants={itemVariants} className="px-4 mt-3">
        <Link href="/workout-builder" className="block">
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-l from-chart-purple/20 via-chart-purple/10 to-transparent border border-chart-purple/20 haptic-ready">
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

      {/* ── Empty State ── */}
      {routines.length === 0 && !showCreate && (
        <motion.div variants={itemVariants} className="px-4 mt-12">
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="w-12 h-12 text-primary/50" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">هنوز برنامه‌ای نساخته‌اید</h2>
            <p className="text-sm text-foreground/30 max-w-xs mx-auto mb-6">
              برنامه‌های تمرینی به شما کمک می‌کنند تمرینات منظم‌تری داشته باشید و پیشرفت کنید
            </p>
            <button onClick={() => setShowCreate(true)}
              className="hevy-btn-primary px-8 py-3.5 text-sm"
            >ساخت اولین برنامه</button>

            <div className="mt-8">
              <p className="text-xs text-foreground/20 mb-3">یا از قالب‌های آماده استفاده کنید:</p>
              <Link href="/routines/templates" className="text-primary text-sm font-medium">
                مشاهده قالب‌های آماده ←
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Routine Cards ── */}
      <div className="px-4 py-4 space-y-3">
        {routines.map((routine, idx) => {
          const days = (routine as any).routine_days || []
          const colorIdx = idx % cardColors.length
          const isExpanded = expandedId === routine.id
          const totalExercises = days.reduce((acc: number, d: any) => acc + (d.routine_exercises?.length || 0), 0)

          return (
            <motion.div key={routine.id} variants={itemVariants}
              className={`glass-card overflow-hidden transition-all duration-300 ${isExpanded ? "ring-1 ring-primary/20" : ""}`}
            >
              {/* Card Header */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { setExpandedId(isExpanded ? null : routine.id); setMenuOpenId(null) }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId(isExpanded ? null : routine.id); setMenuOpenId(null) } }}
                className="w-full p-4 flex items-center gap-3"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cardColors[colorIdx]} flex items-center justify-center shrink-0`}>
                  <Dumbbell className={`w-5 h-5 ${iconColors[colorIdx]}`} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-bold text-foreground text-[15px] truncate">{routine.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-foreground/30">{days.length} روز</span>
                    <span className="text-[11px] text-foreground/15">·</span>
                    <span className="text-[11px] text-foreground/30">{totalExercises} حرکت</span>
                    <span className="text-[11px] text-foreground/15">·</span>
                    <span className="text-[11px] text-primary/60">{routine.use_count || 0} استفاده</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === routine.id ? null : routine.id) }}
                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-foreground/30 hover:text-foreground/60 transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  <div className={`text-foreground/20 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Context Menu */}
              <AnimatePresence>
                {menuOpenId === routine.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="flex items-center gap-1 p-2">
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 text-foreground/50 text-xs font-medium hover:bg-white/10 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" /> ویرایش
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 text-foreground/50 text-xs font-medium hover:bg-white/10 transition-colors">
                        <Copy className="w-3.5 h-3.5" /> کپی
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 text-foreground/50 text-xs font-medium hover:bg-white/10 transition-colors">
                        <Share2 className="w-3.5 h-3.5" /> اشتراک
                      </button>
                      <button onClick={() => handleDelete(routine.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> حذف
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expanded Days Preview */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/5">
                      {days.map((day: any, di: number) => {
                        const exercises = day.routine_exercises || []
                        return (
                          <div key={day.id} className={`px-4 py-3 ${di > 0 ? "border-t border-white/[0.03]" : ""}`}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-primary">{day.name}</p>
                              <span className="text-[10px] text-foreground/20">{exercises.length} حرکت</span>
                            </div>
                            {exercises.length > 0 ? (
                              <div className="space-y-1.5">
                                {exercises.map((ex: any) => (
                                  <div key={ex.id} className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1 h-1 rounded-full bg-white/20" />
                                      <span className="text-[13px] text-foreground/60">{ex.exercise_name}</span>
                                    </div>
                                    <span className="text-[10px] text-foreground/20">
                                      {ex.routine_sets?.length || 0} ست
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-foreground/15 py-1">بدون حرکت</p>
                            )}
                          </div>
                        )
                      })}

                      {/* Action Buttons */}
                      <div className="p-4 border-t border-white/5 flex gap-2.5">
                        <button
                          onClick={() => handleStartWorkout(routine.id)}
                          className="flex-1 hevy-btn-primary py-3 text-sm flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          شروع تمرین
                        </button>
                        <button
                          onClick={() => handleFindGym(routine.id)}
                          disabled={gymLoading}
                          className="px-4 py-3 rounded-xl bg-primary/10 text-primary text-sm font-medium flex items-center gap-1.5 hover:bg-primary/20 transition-colors disabled:opacity-40"
                        >
                          {gymLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                          باشگاه مناسب
                        </button>
                        <Link href={`/routines/${routine.id}/edit`}
                          className="px-4 py-3 rounded-xl bg-white/5 text-foreground/50 text-sm font-medium flex items-center gap-1.5 hover:bg-white/10 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* ── Bottom CTA ── */}
      {routines.length > 0 && (
        <motion.div variants={itemVariants} className="px-4 mt-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground/60">قالب‌های آماده نیاز دارید؟</p>
              <p className="text-[10px] text-foreground/25 mt-0.5">Push/Pull/Legs, Upper/Lower و...</p>
            </div>
            <Link href="/routines/templates"
              className="px-4 py-2 rounded-xl bg-warning/15 text-warning text-xs font-semibold"
            >
              مشاهده
            </Link>
          </div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════
          CREATE ROUTINE MODAL
          ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center"
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-background rounded-t-3xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-background p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">ساخت برنامه جدید</h2>
                  <button onClick={() => setShowCreate(false)}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-foreground/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Routine Name */}
                <div>
                  <label className="text-xs text-foreground/40 font-medium mb-1.5 block">نام برنامه</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="مثلاً Push/Pull/Legs"
                    className="w-full hevy-input text-sm"
                  />
                </div>

                {/* Day Tabs */}
                <div>
                  <label className="text-xs text-foreground/40 font-medium mb-2 block">روزهای تمرینی</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {newDays.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveDayIdx(i)}
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
                        setNewDays(prev => [...prev, { name: `روز ${prev.length + 1}`, exercises: [] }])
                        setActiveDayIdx(newDays.length)
                      }}
                      className="shrink-0 w-9 h-9 rounded-xl bg-white/5 text-primary flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day Name */}
                <input
                  value={newDays[activeDayIdx]?.name || ""}
                  onChange={e => setNewDays(prev => prev.map((d, i) => i === activeDayIdx ? { ...d, name: e.target.value } : d))}
                  placeholder="نام روز (مثلاً سینه و سرشانه)"
                  className="w-full hevy-input text-sm"
                />

                {/* Exercises */}
                <div className="space-y-2">
                  {newDays[activeDayIdx]?.exercises.map((ex, ei) => (
                    <div key={ei} className="glass-card p-3">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-foreground/15" />
                          <span className="text-sm font-medium text-foreground">{ex.exerciseName}</span>
                        </div>
                        <button onClick={() => removeExerciseFromDay(ei)} className="text-foreground/20 hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1.5 pr-6">
                        {ex.sets.map((s, si) => (
                          <div key={si} className="flex items-center gap-2 text-xs">
                            <span className="text-foreground/20 w-6">{si + 1}.</span>
                            <input
                              type="number" value={s.weight_kg || ""}
                              onChange={e => {
                                setNewDays(prev => prev.map((d, i) => i === activeDayIdx ? {
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
                              type="number" value={s.reps || ""}
                              onChange={e => {
                                setNewDays(prev => prev.map((d, i) => i === activeDayIdx ? {
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
                          onClick={() => setNewDays(prev => prev.map((d, i) => i === activeDayIdx ? {
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
                    </div>
                  ))}
                </div>

                {/* Add Exercise Button */}
                <button
                  onClick={() => setShowExerciseSearch(!showExerciseSearch)}
                  className="w-full glass-card p-3.5 flex items-center justify-center gap-2 text-primary text-sm font-medium border-dashed border-white/10 hover:border-primary/30 transition-all haptic-ready"
                >
                  <Plus className="w-4 h-4" /> افزودن حرکت
                </button>

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

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={isPending || !newName.trim()}
                  className="w-full hevy-btn-primary py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPending ? "در حال ذخیره..." : "ذخیره برنامه"}
                </button>

                {/* Bottom safe area */}
                <div className="h-8" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
export default function RoutinesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <RoutinesContent />
    </Suspense>
  )
}
