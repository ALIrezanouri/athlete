"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { getExercises, getMuscleGroups } from "@/app/actions/workouts"
import { Search, Dumbbell, Filter, ChevronRight, X } from "lucide-react"
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll"

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

export default function ExercisesPage() {
  const router = useRouter()
  const [exercises, setExercises] = useState<any[]>([])
  const [muscleGroups, setMuscleGroups] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const EXERCISE_PAGE_SIZE = 20

  useEffect(() => {
    loadMuscleGroups()
  }, [])

  useEffect(() => {
    loadExercises()
  }, [search, selectedMuscle])

  const loadMuscleGroups = async () => {
    const result = await getMuscleGroups()
    if (result.success && result.muscleGroups) {
      setMuscleGroups(result.muscleGroups)
    }
  }

  const loadExercises = async () => {
    setLoading(true)
    const result = await getExercises({
      search: search || undefined,
      muscleGroupId: selectedMuscle || undefined,
      locale: "fa",
      limit: EXERCISE_PAGE_SIZE,
      offset: 0,
    })
    if (result.success && result.exercises) {
      setExercises(result.exercises)
      setTotalCount(result.total || 0)
      setHasMore(result.exercises.length >= EXERCISE_PAGE_SIZE)
    }
    setLoading(false)
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextOffset = exercises.length
    const result = await getExercises({
      search: search || undefined,
      muscleGroupId: selectedMuscle || undefined,
      locale: "fa",
      limit: EXERCISE_PAGE_SIZE,
      offset: nextOffset,
    })
    if (result.success && result.exercises && result.exercises.length > 0) {
      setExercises(prev => [...prev, ...result.exercises!])
      setTotalCount(result.total || 0)
      setHasMore(nextOffset + result.exercises!.length < (result.total || 0))
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }, [loadingMore, hasMore, exercises.length, search, selectedMuscle])

  const { sentinelRef } = useInfiniteScroll({
    loading: loadingMore,
    hasMore,
    onLoadMore: loadMore,
  })

  const getLocalName = (ex: any) => {
    const trans = ex.translations?.find((t: any) => t.locale === "fa")
    return trans?.name || ex.name_en
  }

  const getMuscleLabel = (id: string) => {
    const faLabels: Record<string, string> = {
      chest: "سینه", back: "پشت", shoulders: "سرشانه",
      biceps: "جلو بازو", triceps: "پشت بازو", forearms: "ساعد",
      quads: "جلو ران", hamstrings: "پشت ران", glutes: "باسن",
      calves: "ساق پا", abs: "شکم", traps: "ذوزنقه",
      neck: "گردن", full_body: "بدن کامل", cardio: "کاردیو", core: "هسته",
    }
    return faLabels[id] || id
  }

  // Group exercises by muscle group
  const grouped = exercises.reduce((acc: any, ex: any) => {
    const mg = ex.muscle_group_id
    if (!acc[mg]) acc[mg] = []
    acc[mg].push(ex)
    return acc
  }, {})

  const muscleOrder = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "abs", "calves", "traps", "forearms"]

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-muted px-4 py-3">
        <h1 className="text-xl font-bold text-foreground mb-3">کتابخانه حرکات</h1>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی حرکت..."
            className="w-full bg-hevy-elevated border border-muted rounded-xl pr-10 pl-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Muscle Group Filter Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setSelectedMuscle(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedMuscle ? "bg-primary text-foreground" : "bg-hevy-elevated text-muted-foreground border border-muted"
            }`}
          >
            همه ({exercises.length})
          </button>
          {muscleOrder.map((id) => {
            const count = grouped[id]?.length || 0
            if (count === 0 && selectedMuscle !== id) return null
            return (
              <button
                key={id}
                onClick={() => setSelectedMuscle(id === selectedMuscle ? null : id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedMuscle === id ? "bg-primary text-foreground" : "bg-hevy-elevated text-muted-foreground border border-muted"
                }`}
              >
                {getMuscleLabel(id)} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Exercise List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2" />
            در حال بارگذاری...
          </div>
        ) : exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Dumbbell className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">حرکتی یافت نشد</p>
            <p className="text-sm mt-1">فیلتر یا عبارت جستجو را تغییر دهید</p>
          </div>
        ) : (
          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {muscleOrder.map((mgId) => {
              const group = grouped[mgId]
              if (!group || group.length === 0) return null
              return (
                <motion.div key={mgId} variants={itemVariants}>
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {getMuscleLabel(mgId)} — {group.length} حرکت
                  </h2>
                  <div className="space-y-2">
                    {group.map((ex: any) => (
                      <motion.div
                        key={ex.id}
                        variants={itemVariants}
                        onClick={() => router.push(`/exercises/${ex.id}`)}
                        className="hevy-card p-4 flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {/* Muscle Icon */}
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Dumbbell className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-foreground font-medium">
                              {getLocalName(ex)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-muted-foreground text-xs">{ex.name_en}</span>
                              {ex.equipment_type_id && (
                                <>
                                  <span className="text-muted text-xs">•</span>
                                  <span className="text-muted-foreground text-xs">
                                    {ex.equipment_type_id}
                                  </span>
                                </>
                              )}
                              {ex.is_compound && (
                                <>
                                  <span className="text-muted text-xs">•</span>
                                  <span className="text-warning text-xs font-medium">ترکیبی</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Infinite scroll sentinel */}
        {!loading && exercises.length > 0 && (
          <div ref={sentinelRef} className="flex items-center justify-center py-6">
            {loadingMore ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm">در حال بارگذاری...</span>
              </div>
            ) : !hasMore ? (
              <span className="text-sm text-muted-foreground">پایان لیست حرکات</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}