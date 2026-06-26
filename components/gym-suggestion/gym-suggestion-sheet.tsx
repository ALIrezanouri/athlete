"use client"

import { motion, AnimatePresence } from "motion/react"
import { useRouter } from "next/navigation"
import {
  X,
  MapPin,
  Star,
  Navigation,
  Dumbbell,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { useGlobalEngine } from "@/lib/GlobalEngineContext"

// ── Types ────────────────────────────────────────────────────────────────────
// GymSuggestion is defined in app/actions/gyms.ts — we mirror it here for
// the component props to avoid importing server-side code in a client component.

interface GymListItem {
  id: string
  name: string
  address: string
  city: string
  area: string | null
  avg_rating: number
  review_count: number
  price_per_session: number
  open_time: string
  close_time: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  instagram: string | null
  website: string | null
  primary_photo_url: string | null
  sport_types: string[]
  amenities: string[]
}

interface GymSuggestion {
  gym: GymListItem
  matchScore: number
  matchedEquipment: string[]
  missingEquipment: string[]
  distance?: number
}

// ── Props ────────────────────────────────────────────────────────────────────
interface GymSuggestionSheetProps {
  suggestions: GymSuggestion[]
  onClose: () => void
}

// ── Persian label maps ──────────────────────────────────────────────────────
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: "هالتر",
  dumbbell: "دمبل",
  machine: " دستگاه",
  cable: "سیم‌کش",
  kettlebell: "کتل‌بل",
  bodyweight: "بدون وزنه",
  band: "بان مقاومتی",
  plate: "صفحه وزنه",
  other: "سایر",
  none: "بدون تجهیزات",
}

// ── Helper: format distance in Persian ──────────────────────────────────────
function formatDistance(km: number): string {
  // Use Persian digits for distance display
  if (km < 1) {
    const meters = Math.round(km * 1000)
    return `${meters.toLocaleString("fa-IR")} متر`
  }
  return `${km.toFixed(1).replace(/\./g, "٫").replace(/[0-9]/g, (d) => String.fromCharCode(1776 + parseInt(d)))} کیلومتر`
}

// ── Helper: match score color ───────────────────────────────────────────────
function getMatchScoreColor(score: number): {
  bg: string
  text: string
  border: string
} {
  if (score >= 80) {
    return { bg: "bg-success/10", text: "text-success", border: "border-success/20" }
  }
  if (score >= 50) {
    return { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" }
  }
  return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function GymSuggestionSheet({
  suggestions,
  onClose,
}: GymSuggestionSheetProps) {
  const router = useRouter()
  const { formatPrice } = useGlobalEngine()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-background pb-8"
        >
          {/* ── Drag handle ── */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1.5 w-12 rounded-full bg-white/20" />
          </div>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 pb-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">
                باشگاه‌های مناسب
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 transition-colors hover:bg-white/10"
            >
              <X className="h-5 w-5 text-foreground/60" />
            </button>
          </div>

          {/* ── Divider ── */}
          <div className="mx-5 h-px bg-white/5" />

          {/* ── Content ── */}
          <div className="px-5 pt-4 overflow-y-auto max-h-[60vh]">
            {suggestions.length === 0 ? (
              /* ── Empty state ── */
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <AlertTriangle className="h-8 w-8 text-foreground/30" />
                </div>
                <p className="text-sm text-foreground/50">
                  باشگاه مناسب یافت نشد
                </p>
                <p className="text-xs text-foreground/30">
                  باشگاهی که تجهیزات مورد نیاز برنامه شما را داشته باشد پیدا نشد
                </p>
              </div>
            ) : (
              /* ── Suggestion cards ── */
              <div className="flex flex-col gap-3">
                {suggestions.map((suggestion, index) => {
                  const scoreColor = getMatchScoreColor(suggestion.matchScore)
                  const gym = suggestion.gym

                  return (
                    <motion.div
                      key={gym.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, ease: "easeOut" as const }}
                      className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                    >
                      {/* ── Top row: name + match score badge ── */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-foreground truncate">
                            {gym.name}
                          </h4>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-foreground/40">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{gym.address}</span>
                          </div>
                        </div>

                        {/* Match score badge */}
                        <div
                          className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 border ${scoreColor.border} ${scoreColor.bg}`}
                        >
                          {suggestion.matchScore >= 80 ? (
                            <CheckCircle2 className={`h-3.5 w-3.5 ${scoreColor.text}`} />
                          ) : (
                            <Star className={`h-3.5 w-3.5 ${scoreColor.text}`} />
                          )}
                          <span className={`text-xs font-bold ${scoreColor.text}`}>
                            {suggestion.matchScore.toLocaleString("fa-IR")}٪ تطابق
                          </span>
                        </div>
                      </div>

                      {/* ── Second row: rating + distance ── */}
                      <div className="mt-2.5 flex items-center gap-3">
                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          <span className="text-xs font-semibold text-warning">
                            {gym.avg_rating}
                          </span>
                          <span className="text-[10px] text-foreground/30">
                            ({gym.review_count.toLocaleString("fa-IR")})
                          </span>
                        </div>

                        {/* Distance (if available) */}
                        {suggestion.distance !== undefined && (
                          <div className="flex items-center gap-1 text-xs text-foreground/40">
                            <Navigation className="h-3 w-3" />
                            <span>{formatDistance(suggestion.distance)}</span>
                          </div>
                        )}

                        {/* Price */}
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-bold text-primary">
                            {formatPrice(BigInt(gym.price_per_session))}
                          </span>
                          <span className="text-foreground/30">/ جلسه</span>
                        </div>
                      </div>

                      {/* ── Matched equipment tags ── */}
                      {suggestion.matchedEquipment.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {suggestion.matchedEquipment.map((eqId) => (
                            <span
                              key={eqId}
                              className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success"
                            >
                              {EQUIPMENT_LABELS[eqId] || eqId}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* ── Missing equipment tags (red) ── */}
                      {suggestion.missingEquipment.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {suggestion.missingEquipment.map((eqId) => (
                            <span
                              key={eqId}
                              className="flex items-center gap-0.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400"
                            >
                              {EQUIPMENT_LABELS[eqId] || eqId}
                              <X className="inline h-2.5 w-2.5" />
                            </span>
                          ))}
                        </div>
                      )}

                      {/* ── Action: Book link ── */}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => router.push(`/explore/${gym.id}`)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/90"
                      >
                        <Navigation className="h-4 w-4" />
                        رزرو
                      </motion.button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}