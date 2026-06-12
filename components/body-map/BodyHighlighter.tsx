"use client"

import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "motion/react"
import type { BodyPartSlug } from "simple-body-highlighter-react"
import { getHighlightData, slugToMuscleGroup, HIDDEN_SLUGS } from "@/lib/body-map/muscle-mapping"

// ── Types ──────────────────────────────────────────────────────────────────
export interface BodyHighlighterProps {
  view: "front" | "back"
  selectedMuscle: string | null
  onSelectMuscle: (id: string) => void
}

// ── Dynamic import to avoid SSR issues with inline SVG ──────────────────────
const Body = dynamic(
  () => import("simple-body-highlighter-react").then((mod) => mod.Body),
  { ssr: false }
)

// ── Component ──────────────────────────────────────────────────────────────
export function BodyHighlighter({
  view,
  selectedMuscle,
  onSelectMuscle,
}: BodyHighlighterProps) {
  const highlightData = getHighlightData(view, selectedMuscle, null)

  const handleClick = (slug: BodyPartSlug) => {
    const groupId = slugToMuscleGroup(slug)
    if (groupId) {
      onSelectMuscle(groupId)
    }
  }

  return (
    <div className="body-highlighter w-full max-w-[320px] mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Body
            data={highlightData}
            onClick={handleClick}
            gender="male"
            side={view}
            border="#3A3A3C"
            defaultFill="#2C2C2E"
            hiddenParts={HIDDEN_SLUGS}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}