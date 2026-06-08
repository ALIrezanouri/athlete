"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Sparkles, Dumbbell, ChevronLeft, Loader2 } from "lucide-react"
import { getMuscleGroups, getEquipmentTypes } from "@/app/actions/workouts"
import { generateSmartWorkout, saveGeneratedRoutine, startDirectWorkout } from "@/app/actions/routines"
import { useGlobalEngine } from "@/lib/GlobalEngineContext"
import type { GeneratedExercise } from "@/app/actions/routines"

// ── Animation Variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
}

// ── Persian Translation Map (DB only has name_en; we supply name_fa here) ──
const MUSCLE_NAME_FA: Record<string, string> = {
  chest: "سینه", back: "پشت", shoulders: "سرشانه", biceps: "جلو بازو",
  triceps: "پشت بازو", forearms: "مچ", quads: "چهارسر", hamstrings: "پشت ران",
  glutes: "سرین", calves: "ساق پا", abs: "شکم", traps: "ذوزنقه",
  neck: "گردن", full_body: "کل بدن", cardio: "کاردیو", core: "مرکزی",
}
const EQUIPMENT_NAME_FA: Record<string, string> = {
  barbell: "هالتر", dumbbell: "دمبل", machine: "دستگاه", cable: "کابل",
  kettlebell: "کتل‌بل", bodyweight: "بدون وزنه", band: "بان", plate: "صفحه وزنه",
  other: "سایر", none: "بدون تجهیزات",
}

// ── Hardcoded Fallback Data (used when DB fetch fails or returns empty) ──
const FALLBACK_MUSCLE_GROUPS = [
  { id: "chest", name_en: "Chest", name_fa: "سینه", icon: "💪", sort_order: 1 },
  { id: "back", name_en: "Back", name_fa: "پشت", icon: "🔙", sort_order: 2 },
  { id: "shoulders", name_en: "Shoulders", name_fa: "سرشانه", icon: "🤷", sort_order: 3 },
  { id: "biceps", name_en: "Biceps", name_fa: "جلو بازو", icon: "💪", sort_order: 4 },
  { id: "triceps", name_en: "Triceps", name_fa: "پشت بازو", icon: "🦾", sort_order: 5 },
  { id: "forearms", name_en: "Forearms", name_fa: "مچ", icon: "🤲", sort_order: 6 },
  { id: "quads", name_en: "Quads", name_fa: "چهارسر", icon: "🦵", sort_order: 7 },
  { id: "hamstrings", name_en: "Hamstrings", name_fa: "پشت ران", icon: "🦿", sort_order: 8 },
  { id: "glutes", name_en: "Glutes", name_fa: "سرین", icon: "🍑", sort_order: 9 },
  { id: "calves", name_en: "Calves", name_fa: "ساق پا", icon: "🦶", sort_order: 10 },
  { id: "abs", name_en: "Abs", name_fa: "شکم", icon: "🎯", sort_order: 11 },
  { id: "traps", name_en: "Traps", name_fa: "ذوزنقه", icon: "🔺", sort_order: 12 },
  { id: "neck", name_en: "Neck", name_fa: "گردن", icon: "🧣", sort_order: 13 },
  { id: "full_body", name_en: "Full Body", name_fa: "کل بدن", icon: "🏋️", sort_order: 14 },
  { id: "cardio", name_en: "Cardio", name_fa: "کاردیو", icon: "🏃", sort_order: 15 },
  { id: "core", name_en: "Core", name_fa: "مرکزی", icon: "⭕", sort_order: 16 },
]

const FALLBACK_EQUIPMENT_TYPES = [
  { id: "barbell", name_en: "Barbell", name_fa: "هالتر", icon: "🏋️", sort_order: 1 },
  { id: "dumbbell", name_en: "Dumbbell", name_fa: "دمبل", icon: "🦾", sort_order: 2 },
  { id: "machine", name_en: "Machine", name_fa: "دستگاه", icon: "⚙️", sort_order: 3 },
  { id: "cable", name_en: "Cable", name_fa: "کابل", icon: "🔗", sort_order: 4 },
  { id: "kettlebell", name_en: "Kettlebell", name_fa: "کتل‌بل", icon: "🟤", sort_order: 5 },
  { id: "bodyweight", name_en: "Bodyweight", name_fa: "بدون وزنه", icon: "🤸", sort_order: 6 },
  { id: "band", name_en: "Band", name_fa: "بان", icon: "〰️", sort_order: 7 },
  { id: "plate", name_en: "Plate", name_fa: "صفحه وزنه", icon: "🔵", sort_order: 8 },
  { id: "other", name_en: "Other", name_fa: "سایر", icon: "📦", sort_order: 9 },
  { id: "none", name_en: "None", name_fa: "بدون تجهیزات", icon: "✋", sort_order: 10 },
]

// ── Muscle group color mapping ──
const muscleColors: Record<string, { bg: string; text: string; ring: string }> = {
  chest: { bg: "bg-primary/15", text: "text-primary", ring: "ring-primary/40" },
  back: { bg: "bg-success/15", text: "text-success", ring: "ring-success/40" },
  shoulders: { bg: "bg-warning/15", text: "text-warning", ring: "ring-warning/40" },
  biceps: { bg: "bg-chart-purple/15", text: "text-chart-purple", ring: "ring-chart-purple/40" },
  triceps: { bg: "bg-destructive/15", text: "text-destructive", ring: "ring-destructive/40" },
  forearms: { bg: "bg-destructive/15", text: "text-destructive", ring: "ring-destructive/40" },
  quads: { bg: "bg-[#5E5CE6]/15", text: "text-[#5E5CE6]", ring: "ring-[#5E5CE6]/40" },
  hamstrings: { bg: "bg-info/15", text: "text-info", ring: "ring-info/40" },
  glutes: { bg: "bg-destructive/15", text: "text-destructive", ring: "ring-destructive/40" },
  calves: { bg: "bg-[#AC8E68]/15", text: "text-[#AC8E68]", ring: "ring-[#AC8E68]/40" },
  abs: { bg: "bg-warning/15", text: "text-warning", ring: "ring-warning/40" },
  traps: { bg: "bg-success/15", text: "text-success", ring: "ring-success/40" },
  neck: { bg: "bg-muted-foreground/15", text: "text-muted-foreground", ring: "ring-muted-foreground/40" },
  full_body: { bg: "bg-primary/15", text: "text-primary", ring: "ring-primary/40" },
  cardio: { bg: "bg-destructive/15", text: "text-destructive", ring: "ring-destructive/40" },
  core: { bg: "bg-warning/15", text: "text-warning", ring: "ring-warning/40" },
}

// ── Wizard Steps ──
type WizardStep = "muscles" | "equipment" | "preview"

export default function WorkoutBuilderPage() {
  const { t } = useGlobalEngine()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Wizard state
  const [step, setStep] = useState<WizardStep>("muscles")
  const [selectedMuscleIds, setSelectedMuscleIds] = useState<string[]>([])
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([])
  const [generatedExercises, setGeneratedExercises] = useState<GeneratedExercise[]>([])
  const [actionError, setActionError] = useState<string | null>(null)

  // Data state
  const [muscleGroups, setMuscleGroups] = useState(FALLBACK_MUSCLE_GROUPS)
  const [equipmentTypes, setEquipmentTypes] = useState(FALLBACK_EQUIPMENT_TYPES)

  // Load muscle groups and equipment types from DB
  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [mgRes, eqRes] = await Promise.all([
          getMuscleGroups(),
          getEquipmentTypes(),
        ])
        if (cancelled) return
        if (mgRes.success && mgRes.muscleGroups && mgRes.muscleGroups.length > 0) {
          setMuscleGroups(mgRes.muscleGroups.map((mg: any) => ({
            id: mg.id,
            name_en: mg.name_en || mg.id,
            name_fa: mg.name_fa || MUSCLE_NAME_FA[mg.id] || mg.name_en || mg.id,
            icon: mg.icon || "💪",
            sort_order: mg.sort_order || 0,
          })))
        }
        if (eqRes.success && eqRes.equipmentTypes && eqRes.equipmentTypes.length > 0) {
          setEquipmentTypes(eqRes.equipmentTypes.map((eq: any) => ({
            id: eq.id,
            name_en: eq.name_en || eq.id,
            name_fa: eq.name_fa || EQUIPMENT_NAME_FA[eq.id] || eq.name_en || eq.id,
            icon: eq.icon || "🏋️",
            sort_order: eq.sort_order || 0,
          })))
        }
      } catch (err) {
        console.error("[WORKOUT_BUILDER] Data load error:", err)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  // Toggle muscle selection
  const toggleMuscle = (id: string) => {
    setSelectedMuscleIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  // Toggle equipment selection
  const toggleEquipment = (id: string) => {
    setSelectedEquipmentIds(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  // Generate workout
  const handleGenerate = () => {
    startTransition(async () => {
      const res = await generateSmartWorkout({
        muscleGroupIds: selectedMuscleIds,
        equipmentTypeIds: selectedEquipmentIds,
      })
      if (res.success && res.data) {
        setGeneratedExercises(res.data)
        setStep("preview")
      }
    })
  }

  // Step indicators
  const steps: { key: WizardStep; label: string; num: number }[] = [
    { key: "muscles", label: "عضلات", num: 1 },
    { key: "equipment", label: "تجهیزات", num: 2 },
    { key: "preview", label: "نتایج", num: 3 },
  ]

  const currentStepIdx = steps.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen gradient-mesh pb-28" dir="rtl">
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => step === "muscles" ? router.back() : setStep(step === "preview" ? "equipment" : "muscles")}
            className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-foreground/50 hover:text-foreground/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              ساخت تمرین هوشمند
            </h1>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="px-4 pb-3 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex-1 flex items-center gap-2">
              <div className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                i <= currentStepIdx ? "bg-primary" : "bg-white/10"
              }`} />
              {i < steps.length - 1 && (
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i < currentStepIdx ? "bg-primary" : "bg-white/10"
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="px-4 pb-2 flex items-center justify-between">
          {steps.map((s) => (
            <span key={s.key} className={`text-[10px] font-medium transition-colors ${
              s.key === step ? "text-primary" : currentStepIdx > steps.findIndex(x => x.key === s.key) ? "text-foreground/30" : "text-foreground/15"
            }`}>
              {s.num}. {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Step 1: Muscles ── */}
      {step === "muscles" && (
        <div className="px-4 py-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground mb-1">عضلات هدف را انتخاب کنید</h2>
            <p className="text-xs text-foreground/30">حداقل ۱ عضله انتخاب کنید. هر عضله یک حرکت ترکیبی + حرکت ایزوله دریافت خواهد کرد.</p>
          </div>

          <div className="mb-4">
            <div className="glass-card px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-foreground/40">عضلات انتخاب شده</span>
              <span className={`text-sm font-bold ${selectedMuscleIds.length > 0 ? "text-primary" : "text-foreground/20"}`}>
                {selectedMuscleIds.length} عضله
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {muscleGroups.map((mg) => {
              const isSelected = selectedMuscleIds.includes(mg.id)
              const colors = muscleColors[mg.id] || { bg: "bg-white/5", text: "text-foreground/50", ring: "ring-white/20" }
              return (
                <button
                  key={mg.id}
                  onClick={() => toggleMuscle(mg.id)}
                  className={`glass-card p-3.5 flex items-center gap-3 transition-all duration-200 ${
                    isSelected ? `ring-2 ${colors.ring} ${colors.bg}` : "hover:bg-white/[0.08]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all ${
                    isSelected ? colors.bg : "bg-white/5"
                  }`}>
                    {mg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate transition-colors ${
                      isSelected ? colors.text : "text-foreground/60"
                    }`}>
                      {mg.name_fa}
                    </p>
                    <p className="text-[10px] text-foreground/20 truncate">{mg.name_en}</p>
                  </div>
                  {isSelected && (
                    <div className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center shrink-0`}>
                      <Check className={`w-3 h-3 ${colors.text}`} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-6">
            <button
              onClick={() => setStep("equipment")}
              disabled={selectedMuscleIds.length === 0}
              className="w-full hevy-btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ادامه
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Equipment ── */}
      {step === "equipment" && (
        <div className="px-4 py-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground mb-1">تجهیزات در دسترس</h2>
            <p className="text-xs text-foreground/30">تجهیزات که در باشگاه یا خانه دارید را انتخاب کنید. بدون انتخاب، همه تجهیزات در نظر گرفته می‌شود.</p>
          </div>

          <div className="mb-4">
            <div className="glass-card px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-foreground/40">تجهیزات انتخاب شده</span>
              <span className={`text-sm font-bold ${selectedEquipmentIds.length > 0 ? "text-primary" : "text-foreground/20"}`}>
                {selectedEquipmentIds.length > 0 ? `${selectedEquipmentIds.length} تجهیز` : "همه"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {equipmentTypes.map((eq) => {
              const isSelected = selectedEquipmentIds.includes(eq.id)
              return (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id)}
                  className={`glass-card p-3.5 flex items-center gap-3 transition-all duration-200 ${
                    isSelected ? "ring-2 ring-primary/40 bg-primary/15" : "hover:bg-white/[0.08]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all ${
                    isSelected ? "bg-primary/15" : "bg-white/5"
                  }`}>
                    {eq.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate transition-colors ${
                      isSelected ? "text-primary" : "text-foreground/60"
                    }`}>
                      {eq.name_fa}
                    </p>
                    <p className="text-[10px] text-foreground/20 truncate">{eq.name_en}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-6">
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="w-full hevy-btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isPending ? "در حال ساخت..." : "ساخت تمرین هوشمند"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview ── */}
      {step === "preview" && (
        <div className="px-4 py-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground mb-1">تمرین پیشنهادی 🎯</h2>
            <p className="text-xs text-foreground/30">
              {generatedExercises.length} حرکت برای {selectedMuscleIds.length} عضله هدف
            </p>
          </div>

          {generatedExercises.length > 0 ? (
            <div className="space-y-2.5">
              {generatedExercises.map((ex, idx) => {
                const colors = muscleColors[ex.exercise.muscle_group_id] || { bg: "bg-white/5", text: "text-foreground/50" }
                return (
                  <div key={ex.exercise.id} className="glass-card p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                        <Dumbbell className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {ex.translation?.name || ex.exercise.name_en}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] ${colors.text}`}>{ex.exercise.muscle_group_id}</span>
                          {ex.isCompound && (
                            <span className="text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-md font-medium">ترکیبی</span>
                          )}
                          {ex.exercise.equipment_type_id && (
                            <span className="text-[10px] bg-white/5 text-foreground/30 px-1.5 py-0.5 rounded-md">{ex.exercise.equipment_type_id}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-foreground/15 shrink-0">#{idx + 1}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-foreground/40">
                      <span>{ex.sets} ست</span>
                      <span className="text-foreground/10">×</span>
                      <span>{ex.reps} تکرار</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-foreground/30">تمرینی یافت نشد</p>
            </div>
          )}

          {actionError && (
            <div className="mb-4 glass-card p-3 border border-destructive/20">
              <p className="text-xs text-destructive">{actionError}</p>
            </div>
          )}

          <div className="mt-6 space-y-2.5">
            <button
              className="w-full hevy-btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              disabled={isPending}
              onClick={() => {
                setActionError(null)
                startTransition(async () => {
                  const res = await saveGeneratedRoutine({
                    name: "تمرین هوشمند",
                    exercises: generatedExercises,
                  })
                  if (res.success && res.routineId) {
                    router.push("/routines")
                  } else {
                    setActionError(res.error || "خطا در ذخیره برنامه")
                  }
                })
              }}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              ذخیره به عنوان برنامه
            </button>
            <button
              className="w-full glass-card py-3.5 text-sm text-primary font-medium flex items-center justify-center gap-2 disabled:opacity-40"
              disabled={isPending}
              onClick={() => {
                setActionError(null)
                startTransition(async () => {
                  const res = await startDirectWorkout({
                    exercises: generatedExercises,
                  })
                  if (res.success && res.sessionId) {
                    router.push("/workout")
                  } else {
                    setActionError(res.error || "خطا در شروع تمرین")
                  }
                })
              }}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dumbbell className="w-4 h-4" />}
              شروع تمرین مستقیم
            </button>
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="w-full py-3 text-xs text-foreground/30 flex items-center justify-center gap-1.5 hover:text-foreground/50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              ساخت مجدد
            </button>
          </div>
        </div>
      )}
    </div>
  )
}