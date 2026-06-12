"use client"

import { motion, AnimatePresence } from "motion/react"
import { Dumbbell } from "lucide-react"
import { ExerciseCard, ExerciseCardData } from "./ExerciseCard"

// ── Types ──────────────────────────────────────────────────────────────────
export interface ExerciseResultsPanelProps {
  muscleLabel: string | null
  exercises: ExerciseCardData[]
  loading: boolean
}

// ── Skeleton Card ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex items-center p-3.5 bg-hevy-elevated rounded-2xl border border-muted/50">
      <div className="flex-1">
        <div className="skeleton h-4 w-3/4 rounded mb-2" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
export function ExerciseResultsPanel({
  muscleLabel,
  exercises,
  loading,
}: ExerciseResultsPanelProps) {
  if (!muscleLabel) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={muscleLabel}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card p-4 mt-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            حرکات {muscleLabel}
          </h3>
          {!loading && exercises.length > 0 && (
            <span className="text-[10px] text-foreground/30 bg-white/[0.06] px-2 py-1 rounded-lg">
              {exercises.length} حرکت
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          /* Empty state */
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-hevy-elevated flex items-center justify-center mx-auto mb-3">
              <Dumbbell className="w-5 h-5 text-foreground/20" />
            </div>
            <p className="text-foreground/30 text-sm">حرکتی یافت نشد</p>
            <p className="text-foreground/20 text-xs mt-1">عضله دیگری را انتخاب کنید</p>
          </div>
        ) : (
          /* Exercise list */
          <div className="space-y-2">
            {exercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}