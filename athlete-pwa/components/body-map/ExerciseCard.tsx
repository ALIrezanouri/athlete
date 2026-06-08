"use client"

import { ArrowRight, Dumbbell } from "lucide-react"
import { motion } from "motion/react"

// ── Types ──────────────────────────────────────────────────────────────────
export interface ExerciseCardData {
  id: string
  name: string
  nameEn: string
  difficulty?: string
  exerciseType?: string
  equipmentTypeId?: string
  isCompound?: boolean
  secondaryMuscleGroups?: string[]
}

export interface ExerciseCardProps {
  exercise: ExerciseCardData
}

// ── Difficulty Badge ───────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  if (!difficulty) return null

  const config: Record<string, { bg: string; text: string; label: string }> = {
    beginner: { bg: "bg-success/15", text: "text-success", label: "مبتدی" },
    intermediate: { bg: "bg-warning/15", text: "text-warning", label: "متوسط" },
    advanced: { bg: "bg-destructive/15", text: "text-destructive", label: "پیشرفته" },
  }

  const c = config[difficulty] || config.beginner

  return (
    <span className={`${c.bg} ${c.text} px-2 py-0.5 rounded-md text-[10px] font-semibold`}>
      {c.label}
    </span>
  )
}

// ── Equipment Tag ──────────────────────────────────────────────────────────
function EquipmentTag({ equipmentTypeId }: { equipmentTypeId?: string }) {
  if (!equipmentTypeId) return null

  const labels: Record<string, string> = {
    barbell: "بارفیکس",
    dumbbell: "دمبل",
    kettlebell: "کتل‌بل",
    machine: "دستگاه",
    cable: "کابل",
    bodyweight: "بدن",
    band: "بان",
    plate: "صفحه",
    other: "سایر",
  }

  return (
    <span className="bg-white/[0.06] text-foreground/40 px-2 py-0.5 rounded-md text-[10px]">
      {labels[equipmentTypeId] || equipmentTypeId}
    </span>
  )
}

// ── Exercise Type Indicator ────────────────────────────────────────────────
function ExerciseTypeIndicator({ exerciseType, isCompound }: { exerciseType?: string; isCompound?: boolean }) {
  if (isCompound === undefined && !exerciseType) return null

  return (
    <span className="bg-chart-purple/10 text-chart-purple/70 px-2 py-0.5 rounded-md text-[10px]">
      {isCompound ? "چند عضله" : "تک عضله"}
    </span>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
export function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="
        flex items-center justify-between
        p-3.5 bg-hevy-elevated rounded-2xl
        border border-muted/50
        hover:border-primary/20
        transition-colors duration-200
        min-h-[56px]
      "
    >
      <div className="flex-1 min-w-0">
        {/* Exercise name */}
        <p className="text-sm font-semibold text-foreground truncate">
          {exercise.name || exercise.nameEn}
        </p>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <DifficultyBadge difficulty={exercise.difficulty} />
          <EquipmentTag equipmentTypeId={exercise.equipmentTypeId} />
          <ExerciseTypeIndicator
            exerciseType={exercise.exerciseType}
            isCompound={exercise.isCompound}
          />
        </div>
      </div>

      {/* Arrow icon */}
      <ArrowRight className="w-4 h-4 text-foreground/15 ml-2 shrink-0" />
    </motion.div>
  )
}