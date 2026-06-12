"use client"

import { motion } from "motion/react"

// ── Types ──────────────────────────────────────────────────────────────────
export interface MuscleChip {
  id: string
  label: string
  icon: string
}

export interface MuscleSelectorChipsProps {
  muscles: MuscleChip[]
  selectedMuscle: string | null
  onSelectMuscle: (id: string) => void
}

// ── Component ──────────────────────────────────────────────────────────────
export function MuscleSelectorChips({
  muscles,
  selectedMuscle,
  onSelectMuscle,
}: MuscleSelectorChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center px-2">
      {muscles.map((muscle) => {
        const isSelected = muscle.id === selectedMuscle

        return (
          <motion.button
            key={muscle.id}
            onClick={() => onSelectMuscle(muscle.id)}
            whileTap={{ scale: 0.95 }}
            className={`
              flex items-center gap-1.5
              px-4 py-2.5 rounded-xl
              text-sm font-medium
              transition-colors duration-200
              min-h-[44px] min-w-[44px]
              ${isSelected
                ? "bg-primary text-foreground shadow-lg shadow-primary/25"
                : "bg-hevy-elevated text-foreground/50 border border-muted/60 hover:border-primary/30 hover:text-foreground/70"
              }
            `}
          >
            <span className="text-base leading-none">{muscle.icon}</span>
            <span>{muscle.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}