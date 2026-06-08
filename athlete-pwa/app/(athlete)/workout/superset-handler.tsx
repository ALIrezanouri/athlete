"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Link2, Unlink, Plus, Check, Trash2 } from "lucide-react"

// ── Superset Exercise Card ──
// Wraps multiple exercises that belong to the same superset group

interface SetData {
  id: string
  set_number: number
  weight_kg: number
  reps: number
  is_completed: boolean
  set_type: string
}

interface ExerciseData {
  id: string
  exercise_id: string | null
  exercise_name: string
  superset_group_id: string | null
  sets: SetData[]
}

interface SupersetHandlerProps {
  exercises: ExerciseData[]
  onUpdateSet: (setId: string, data: any) => void
  onCheckSet: (setId: string, weight: number, reps: number) => void
  onDeleteSet: (setId: string) => void
  onAddSet: (workoutExerciseId: string) => void
  onLinkSuperset: (exerciseIdA: string, exerciseIdB: string) => void
  onUnlinkSuperset: (exerciseId: string) => void
}

export function SupersetGroupCard({
  exercises,
  onUpdateSet,
  onCheckSet,
  onDeleteSet,
  onAddSet,
  onUnlinkSuperset,
}: {
  exercises: ExerciseData[]
  onUpdateSet: (setId: string, data: any) => void
  onCheckSet: (setId: string, weight: number, reps: number) => void
  onDeleteSet: (setId: string) => void
  onAddSet: (workoutExerciseId: string) => void
  onUnlinkSuperset: (exerciseId: string) => void
}) {
  const [currentRound, setCurrentRound] = useState(1)
  const maxSets = Math.max(...exercises.map(e => e.sets?.length || 0), 1)

  return (
    <motion.div
      layout
      className="glass-card overflow-hidden border-r-4 border-r-destructive/60"
    >
      {/* Superset Header */}
      <div className="px-4 py-2.5 bg-destructive/10 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-destructive" />
          <span className="text-xs font-bold text-destructive">سوپرست</span>
          <span className="text-[10px] text-foreground/25">({exercises.length} حرکت)</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Round indicator */}
          <div className="flex gap-1">
            {Array.from({ length: maxSets }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentRound(i + 1)}
                className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-all ${
                  currentRound === i + 1
                    ? "bg-destructive text-foreground"
                    : "bg-white/5 text-foreground/30"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => exercises.forEach(e => onUnlinkSuperset(e.id))}
            className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-foreground/20 hover:text-foreground/60 transition-colors"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Exercises Side by Side for current round */}
      <div className="p-3">
        <div className="space-y-3">
          {exercises.map((exercise, exIdx) => {
            const targetSet = exercise.sets?.[currentRound - 1]
            return (
              <div key={exercise.id} className="bg-white/[0.02] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">
                    {exIdx + 1}. {exercise.exercise_name}
                  </p>
                  {targetSet?.is_completed && (
                    <span className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full font-semibold">✓</span>
                  )}
                </div>

                {targetSet ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-hevy-elevated rounded-lg p-2 text-center">
                      <p className="text-[10px] text-foreground/25 mb-0.5">وزن</p>
                      <p className="text-sm font-bold">{targetSet.weight_kg}</p>
                    </div>
                    <span className="text-foreground/15 text-xs">×</span>
                    <div className="flex-1 bg-hevy-elevated rounded-lg p-2 text-center">
                      <p className="text-[10px] text-foreground/25 mb-0.5">تکرار</p>
                      <p className="text-sm font-bold">{targetSet.reps}</p>
                    </div>
                    <button
                      onClick={() => targetSet.is_completed
                        ? onUpdateSet(targetSet.id, { isCompleted: false })
                        : onCheckSet(targetSet.id, targetSet.weight_kg, targetSet.reps)
                      }
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                        targetSet.is_completed
                          ? "bg-success shadow-md shadow-success/30"
                          : "bg-white/5 text-foreground/30"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAddSet(exercise.id)}
                    className="w-full py-2 rounded-lg bg-white/[0.03] text-foreground/20 text-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> افزودن ست
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add Set to All */}
        <button
          onClick={() => exercises.forEach(e => onAddSet(e.id))}
          className="w-full mt-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          افزودن ست به همه حرکات
        </button>
      </div>
    </motion.div>
  )
}

// ── Superset Linker Modal ──
// Used to link two exercises into a superset
export function SupersetLinker({
  open,
  exercises,
  onClose,
  onLink,
}: {
  open: boolean
  exercises: ExerciseData[]
  onClose: () => void
  onLink: (exA: string, exB: string) => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  if (!open) return null

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  const handleLink = () => {
    if (selected.length >= 2) {
      onLink(selected[0], selected[1])
      setSelected([])
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Link2 className="w-5 h-5 text-destructive" />
            ساخت سوپرست
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <span className="text-foreground/60 text-lg">✕</span>
          </button>
        </div>

        <div className="p-4">
          <p className="text-foreground/40 text-sm mb-4">
            ۲ تا ۴ حرکت را برای ساخت سوپرست انتخاب کنید
          </p>

          <div className="space-y-2">
            {exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => toggleSelect(ex.id)}
                className={`w-full p-3.5 rounded-xl flex items-center justify-between transition-all ${
                  selected.includes(ex.id)
                    ? "bg-destructive/15 border border-destructive/30"
                    : "bg-white/[0.03] border border-white/5"
                }`}
              >
                <span className="text-sm font-medium">{ex.exercise_name}</span>
                {selected.includes(ex.id) && (
                  <span className="text-destructive text-xs font-bold">
                    #{selected.indexOf(ex.id) + 1}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-white/5">
          <button
            onClick={handleLink}
            disabled={selected.length < 2}
            className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              selected.length >= 2
                ? "bg-destructive text-foreground shadow-lg shadow-destructive/25"
                : "bg-white/5 text-foreground/20"
            }`}
          >
            <Link2 className="w-5 h-5" />
            ساخت سوپرست ({selected.length} حرکت)
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}