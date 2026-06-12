"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { getExercises } from "@/app/actions/workouts"
import { BodyHighlighter } from "@/components/body-map/BodyHighlighter"
import { MuscleSelectorChips, MuscleChip } from "@/components/body-map/MuscleSelectorChips"
import { ExerciseResultsPanel } from "@/components/body-map/ExerciseResultsPanel"
import { ExerciseCardData } from "@/components/body-map/ExerciseCard"
import { MUSCLE_GROUPS, FRONT_VIEW_GROUPS, BACK_VIEW_GROUPS } from "@/lib/body-map/muscle-mapping"

// ── Chip data derived from mapping module ────────────────────────────────────
const ALL_MUSCLE_CHIPS: MuscleChip[] = MUSCLE_GROUPS.map((g) => ({
  id: g.id,
  label: g.label,
  icon: g.icon,
}))

const FRONT_CHIP_IDS = FRONT_VIEW_GROUPS.map((g) => g.id)
const BACK_CHIP_IDS = BACK_VIEW_GROUPS.map((g) => g.id)

// ── Page Component ───────────────────────────────────────────────────────────
export default function BodyMapPage() {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [exercises, setExercises] = useState<ExerciseCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<"front" | "back">("front")

  const handleMuscleSelect = async (muscleId: string) => {
    if (selectedMuscle === muscleId) {
      setSelectedMuscle(null)
      setExercises([])
      return
    }

    setSelectedMuscle(muscleId)
    setLoading(true)
    const result = await getExercises({ muscleGroupId: muscleId, locale: "fa", limit: 20 })
    if (result.success && result.exercises) {
      setExercises(
        result.exercises.map((ex: any) => ({
          id: ex.id,
          name: ex.translations?.find((t: any) => t.locale === "fa")?.name || ex.name_en,
          nameEn: ex.name_en,
          difficulty: ex.difficulty,
          exerciseType: ex.exercise_type,
          equipmentTypeId: ex.equipment_type_id,
          isCompound: ex.is_compound,
          secondaryMuscleGroups: ex.secondary_muscle_groups || [],
        }))
      )
    } else {
      setExercises([])
    }
    setLoading(false)
  }

  const handleViewChange = (newView: "front" | "back") => {
    setView(newView)
    setSelectedMuscle(null)
    setExercises([])
  }

  const currentChips = ALL_MUSCLE_CHIPS.filter((m) =>
    view === "front" ? FRONT_CHIP_IDS.includes(m.id) : BACK_CHIP_IDS.includes(m.id)
  )

  const selectedLabel = MUSCLE_GROUPS.find((g) => g.id === selectedMuscle)?.label

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-muted">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">🦴 نقشه بدن</h1>

          {/* Front/Back toggle */}
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleViewChange("front")}
              className={`
                px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                ${view === "front"
                  ? "bg-primary text-foreground shadow-lg shadow-primary/25"
                  : "bg-hevy-elevated text-foreground/40 border border-muted/60"
                }
              `}
            >
              نمای جلو
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleViewChange("back")}
              className={`
                px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                ${view === "back"
                  ? "bg-primary text-foreground shadow-lg shadow-primary/25"
                  : "bg-hevy-elevated text-foreground/40 border border-muted/60"
                }
              `}
            >
              نمای پشت
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Body Content ── */}
      <div className="px-4 py-6">
        {/* Body Highlighter */}
        <div className="flex justify-center mb-6">
          <BodyHighlighter
            view={view}
            selectedMuscle={selectedMuscle}
            onSelectMuscle={handleMuscleSelect}
          />
        </div>

        {/* Muscle Selector Chips */}
        <MuscleSelectorChips
          muscles={currentChips}
          selectedMuscle={selectedMuscle}
          onSelectMuscle={handleMuscleSelect}
        />

        {/* Exercise Results Panel */}
        <ExerciseResultsPanel
          muscleLabel={selectedLabel ?? null}
          exercises={exercises}
          loading={loading}
        />
      </div>
    </div>
  )
}