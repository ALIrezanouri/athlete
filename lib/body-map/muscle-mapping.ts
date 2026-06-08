import type { BodyPartSlug, BodyPartData } from "simple-body-highlighter-react"

// ── Muscle Group Definition ──────────────────────────────────────────────────
// Maps DB muscle_groups.id → library BodyPartSlug arrays + Persian metadata

export interface MuscleGroupDef {
  id: string
  label: string
  icon: string
  frontSlugs: BodyPartSlug[]
  backSlugs: BodyPartSlug[]
}

export const MUSCLE_GROUPS: MuscleGroupDef[] = [
  {
    id: "neck",
    label: "گردن",
    icon: "🔗",
    frontSlugs: ["neck"],
    backSlugs: ["left-neck", "right-neck"],
  },
  {
    id: "shoulders",
    label: "سرشانه",
    icon: "💪",
    frontSlugs: ["left-deltoids", "right-deltoids"],
    backSlugs: ["left-deltoids", "right-deltoids"],
  },
  {
    id: "chest",
    label: "سینه",
    icon: "🫁",
    frontSlugs: ["left-chest", "right-chest"],
    backSlugs: [],
  },
  {
    id: "biceps",
    label: "جلو بازو",
    icon: "💪",
    frontSlugs: ["left-biceps", "right-biceps"],
    backSlugs: [],
  },
  {
    id: "forearms",
    label: "ساعد",
    icon: "🦾",
    frontSlugs: ["left-forearm", "right-forearm"],
    backSlugs: ["left-forearm", "right-forearm"],
  },
  {
    id: "abs",
    label: "شکم",
    icon: "🎯",
    frontSlugs: ["abs"],
    backSlugs: [],
  },
  {
    id: "obliques",
    label: "پهلو",
    icon: "↔️",
    frontSlugs: ["left-obliques", "right-obliques"],
    backSlugs: [],
  },
  {
    id: "quads",
    label: "جلو ران",
    icon: "🦵",
    frontSlugs: ["left-quadriceps", "right-quadriceps"],
    backSlugs: [],
  },
  {
    id: "calves",
    label: "ساق پا",
    icon: "🦶",
    frontSlugs: ["left-calves", "right-calves"],
    backSlugs: ["left-calves", "right-calves"],
  },
  {
    id: "traps",
    label: "ذوزنقه",
    icon: "🔺",
    frontSlugs: [],
    backSlugs: ["left-trapezius", "right-trapezius"],
  },
  {
    id: "back",
    label: "پشت",
    icon: "🔙",
    frontSlugs: [],
    backSlugs: ["left-upper-back", "right-upper-back"],
  },
  {
    id: "triceps",
    label: "پشت بازو",
    icon: "🦾",
    frontSlugs: [],
    backSlugs: ["left-triceps", "right-triceps"],
  },
  {
    id: "glutes",
    label: "باسن",
    icon: "🍑",
    frontSlugs: [],
    backSlugs: ["left-gluteal", "right-gluteal"],
  },
  {
    id: "hamstrings",
    label: "پشت ران",
    icon: "🦵",
    frontSlugs: [],
    backSlugs: ["left-hamstring", "right-hamstring"],
  },
  {
    id: "lower-back",
    label: "کمر پایین",
    icon: "⬇️",
    frontSlugs: [],
    backSlugs: ["left-lower-back", "right-lower-back"],
  },
  {
    id: "adductors",
    label: "داخل ران",
    icon: "🦵",
    frontSlugs: ["left-adductors", "right-adductors"],
    backSlugs: [],
  },
]

// ── Reverse Lookup: slug → muscle group ID ───────────────────────────────────
const slugToGroupMap = new Map<BodyPartSlug, string>()

for (const group of MUSCLE_GROUPS) {
  for (const slug of group.frontSlugs) {
    slugToGroupMap.set(slug, group.id)
  }
  for (const slug of group.backSlugs) {
    slugToGroupMap.set(slug, group.id)
  }
}

export function slugToMuscleGroup(slug: BodyPartSlug): string | null {
  return slugToGroupMap.get(slug) ?? null
}

// ── View-specific group lists ────────────────────────────────────────────────
export const FRONT_VIEW_GROUPS = MUSCLE_GROUPS.filter((g) => g.frontSlugs.length > 0)
export const BACK_VIEW_GROUPS = MUSCLE_GROUPS.filter((g) => g.backSlugs.length > 0)

// ── Highlight data builder ───────────────────────────────────────────────────
const SELECTED_COLOR = "#4F8EF7"
const HOVER_COLOR = "rgba(79,142,247,0.4)"
const SECONDARY_COLOR = "rgba(79,142,247,0.3)"

export function getHighlightData(
  view: "front" | "back",
  selectedMuscle: string | null,
  hoveredMuscle: string | null
): BodyPartData[] {
  const data: BodyPartData[] = []

  for (const group of MUSCLE_GROUPS) {
    const slugs = view === "front" ? group.frontSlugs : group.backSlugs
    if (slugs.length === 0) continue

    if (group.id === selectedMuscle) {
      for (const slug of slugs) {
        data.push({ slug, color: SELECTED_COLOR })
      }
    } else if (group.id === hoveredMuscle) {
      for (const slug of slugs) {
        data.push({ slug, color: HOVER_COLOR })
      }
    }
  }

  return data
}

// ── Exercise highlight data builder (primary + secondary muscles) ────────────
export function getExerciseHighlightData(
  view: "front" | "back",
  primaryMuscle: string | null,
  secondaryMuscles: string[] | null
): BodyPartData[] {
  const data: BodyPartData[] = []

  for (const group of MUSCLE_GROUPS) {
    const slugs = view === "front" ? group.frontSlugs : group.backSlugs
    if (slugs.length === 0) continue

    if (group.id === primaryMuscle) {
      for (const slug of slugs) {
        data.push({ slug, color: SELECTED_COLOR })
      }
    } else if (secondaryMuscles && secondaryMuscles.includes(group.id)) {
      for (const slug of slugs) {
        data.push({ slug, color: SECONDARY_COLOR })
      }
    }
  }

  return data
}

// ── Slugs to hide (irrelevant for muscle selection) ──────────────────────────
export const HIDDEN_SLUGS: BodyPartSlug[] = [
  "head",
  "hair",
  "left-feet",
  "right-feet",
  "left-hands",
  "right-hands",
  "left-knees",
  "right-knees",
  "left-ankles",
  "right-ankles",
  "left-tibialis",
  "right-tibialis",
]