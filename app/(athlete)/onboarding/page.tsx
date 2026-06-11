"use client"

import React, { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { useGlobalEngine } from "@/lib/GlobalEngineContext"
import { ShinyButton } from "@/components/ui/shiny-button"
import { GlassInput } from "@/components/auth/glass-input"
import { completeOnboarding, getGymsForOnboarding } from "@/app/actions/auth"
import { User, Activity, Dumbbell, ChevronLeft, ChevronRight, Star, MapPin, Scale, Ruler, ShieldCheck } from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────
type OnboardingStep = 1 | 2 | 3

interface GymOption {
  id: string
  name: string
  city: string
  area: string | null
  avg_rating: number
  review_count: number
}

// ── Slide Variants ───────────────────────────────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
}

// ── Step Icons ───────────────────────────────────────────────────────────────
const STEP_ICONS = [User, Activity, Dumbbell] as const
const STEP_COLORS = ["#3A86FF", "#00E676", "#FF6B6B"] as const

// ── Fitness Levels ───────────────────────────────────────────────────────────
const FITNESS_LEVELS = ["beginner", "intermediate", "advanced", "professional"] as const

// ── Sport Preferences ────────────────────────────────────────────────────────
const SPORT_OPTIONS = [
  { key: "weight_loss", icon: "🔥" },
  { key: "muscle_gain", icon: "💪" },
  { key: "endurance", icon: "🏃" },
  { key: "flexibility", icon: "🧘" },
  { key: "general_fitness", icon: "⚡" },
] as const

// ── Gender Options ───────────────────────────────────────────────────────────
const GENDER_OPTIONS = ["male", "female", "other"] as const

// ── Persian Numerals ─────────────────────────────────────────────────────────
const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
function toPersianNumeral(n: number): string {
  return String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d)])
}

// ── Onboarding Page ──────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const { t, dir, locale } = useGlobalEngine()

  // Step state
  const [step, setStep] = useState<OnboardingStep>(1)
  const [direction, setDirection] = useState(1)

  // Step 1: Personal Info
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [gender, setGender] = useState<string | null>(null)
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")

  // Step 2: Fitness Profile
  const [fitnessLevel, setFitnessLevel] = useState<string>("beginner")
  const [sportPreferences, setSportPreferences] = useState<string[]>([])

  // Step 3: Gym Selection
  const [gyms, setGyms] = useState<GymOption[]>([])
  const [selectedGym, setSelectedGym] = useState<string | null>(null)

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaveTransition] = useTransition()

  // Load gyms on mount
  useEffect(() => {
    getGymsForOnboarding().then(setGyms).catch(console.error)
  }, [])

  // ── Step Validation ────────────────────────────────────────────────────
  const canProceedFromStep1 = fullName.trim().length >= 2 && weight && height
  const canProceedFromStep2 = fitnessLevel && sportPreferences.length > 0

  // ── Handle Next ────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    setError(null)

    if (step === 1 && !canProceedFromStep1) {
      setError(locale === "fa" ? "لطفاً تمام موارد را تکمیل کنید" : "Please complete all fields")
      return
    }
    if (step === 2 && !canProceedFromStep2) {
      setError(t("onboarding.step2.goals"))
      return
    }

    if (step < 3) {
      setDirection(1)
      setStep((step + 1) as OnboardingStep)
    }
  }, [step, canProceedFromStep1, canProceedFromStep2, t, locale])

  // ── Handle Back ────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    setError(null)
    if (step > 1) {
      setDirection(-1)
      setStep((step - 1) as OnboardingStep)
    }
  }, [step])

  // ── Handle Complete ────────────────────────────────────────────────────
  const handleComplete = useCallback(() => {
    setError(null)

    startSaveTransition(async () => {
      const result = await completeOnboarding({
        full_name: fullName.trim(),
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        fitness_level: fitnessLevel,
        sport_preferences: sportPreferences,
        home_gym_id: selectedGym,
        weight: parseFloat(weight),
        height: parseFloat(height)
      })

      if (result.success) {
        router.push("/home")
      } else {
        setError(result.error ?? "Something went wrong")
      }
    })
  }, [fullName, dateOfBirth, gender, fitnessLevel, sportPreferences, selectedGym, weight, height, router])

  // ── Handle Skip ────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    startSaveTransition(async () => {
      const result = await completeOnboarding({
        full_name: fullName.trim() || "کاربر",
        date_of_birth: null,
        gender: null,
        fitness_level: "beginner",
        sport_preferences: [],
        home_gym_id: null,
      })
      if (result.success) {
        router.push("/home")
      } else {
        setError(result.error ?? "Something went wrong")
      }
    })
  }, [fullName, router])

  // ── Toggle Sport Preference ────────────────────────────────────────────
  const toggleSport = useCallback((key: string) => {
    setSportPreferences((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }, [])

  // ── Progress Bar ───────────────────────────────────────────────────────
  const progress = (step / 3) * 100

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-black px-4"
      dir={dir}
    >
      <div className="w-full max-w-sm">
        <div className="glass-card p-6 overflow-hidden">
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="mb-6 text-center">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
            >
              {React.createElement(STEP_ICONS[step - 1], {
                className: "h-6 w-6 text-primary"
              })}
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {t("onboarding.title")}
            </h1>
            <p className="mt-1 text-sm text-foreground/40 leading-relaxed">
              {t("onboarding.subtitle")}
            </p>
          </div>

          {/* ── Progress ─────────────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-[10px] font-bold text-foreground/30 mb-2 uppercase tracking-widest">
              <span>
                {locale === "fa" ? `${toPersianNumeral(step)} از ۳` : `${t("onboarding.step")} ${step} of 3`}
              </span>
              <span>
                {step === 1
                  ? t("onboarding.step1.title")
                  : step === 2
                    ? t("onboarding.step2.title")
                    : t("onboarding.step3.title")}
              </span>
            </div>

            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: `${((step - 1) / 3) * 100}%` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>

          {/* ── Animated Steps ──────────────────────────────────────── */}
          <div className="relative overflow-hidden" style={{ minHeight: "360px" }}>
            <AnimatePresence mode="wait" custom={direction}>
              {/* ── Step 1: Personal Info ──────────────────────────────── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-5"
                  suppressHydrationWarning
                >
                  {/* Full Name */}
                  <div>
                    <label className="text-[10px] font-bold text-foreground/40 mb-1.5 block uppercase tracking-wider">
                      {t("onboarding.step1.name")}
                    </label>
                    <GlassInput
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("onboarding.step1.namePlaceholder")}
                      dir={dir}
                      autoFocus
                    />
                  </div>

                  {/* Weight & Height */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-foreground/40 mb-1.5 block flex items-center gap-1 uppercase tracking-wider">
                        <Scale className="w-3 h-3" />
                        {locale === "fa" ? "وزن (kg)" : "Weight (kg)"}
                      </label>
                      <GlassInput
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="70"
                        type="number"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-foreground/40 mb-1.5 block flex items-center gap-1 uppercase tracking-wider">
                        <Ruler className="w-3 h-3" />
                        {locale === "fa" ? "قد (cm)" : "Height (cm)"}
                      </label>
                      <GlassInput
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="180"
                        type="number"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-[10px] font-bold text-foreground/40 mb-1.5 block uppercase tracking-wider">
                      {t("onboarding.step1.gender")}
                    </label>
                    <div className="flex gap-2">
                      {GENDER_OPTIONS.map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={`
                            flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all duration-200
                            ${
                              gender === g
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-white/5 bg-white/5 text-foreground/40 hover:bg-white/10"
                            }
                          `}
                        >
                          {t(`onboarding.step1.${g}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Saman Insurance Promo */}
                  <div className="rounded-2xl border border-success/20 bg-success/5 p-3.5 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-success uppercase tracking-wide">
                        {locale === "fa" ? "تخفیف ویژه بیمه" : "Insurance Reward"}
                      </p>
                      <p className="text-[10px] text-success/70 leading-relaxed mt-0.5">
                        {locale === "fa"
                          ? "با تکمیل اطلاعات، کوین‌های شما به تخفیف بیمه سامان تبدیل می‌شود."
                          : "Your accurate data unlocks premium insurance discounts via Athlete Coins."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Fitness Profile ────────────────────────────── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-5"
                  suppressHydrationWarning
                >
                  <p className="text-sm text-foreground/40 text-center italic">
                    {t("onboarding.step2.subtitle")}
                  </p>

                  {/* Fitness Level */}
                  <div>
                    <label className="text-[10px] font-bold text-foreground/40 mb-2 block uppercase tracking-wider">
                      {t("onboarding.step2.level")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {FITNESS_LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => setFitnessLevel(level)}
                          className={`
                            rounded-xl border py-3 text-[11px] font-bold transition-all duration-200
                            ${
                              fitnessLevel === level
                                ? "border-success bg-success/10 text-success"
                                : "border-white/5 bg-white/5 text-foreground/40 hover:bg-white/10"
                            }
                          `}
                        >
                          {t(`onboarding.step2.${level}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sport Preferences / Goals */}
                  <div>
                    <label className="text-[10px] font-bold text-foreground/40 mb-2 block uppercase tracking-wider">
                      {t("onboarding.step2.goals")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SPORT_OPTIONS.map((sport) => (
                        <button
                          key={sport.key}
                          onClick={() => toggleSport(sport.key)}
                          className={`
                            rounded-full border px-4 py-2 text-[10px] font-bold transition-all duration-200 flex items-center gap-2
                            ${
                              sportPreferences.includes(sport.key)
                                ? "border-success bg-success/10 text-success"
                                : "border-white/5 bg-white/5 text-foreground/40 hover:bg-white/10"
                            }
                          `}
                        >
                          <span>{sport.icon}</span>
                          {t(`onboarding.step2.${sport.key}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Gym Selection ───────────────────────────────── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-4"
                  suppressHydrationWarning
                >
                  <p className="text-sm text-foreground/40 text-center">
                    {t("onboarding.step3.subtitle")}
                  </p>

                  {/* Gym List */}
                  {gyms.length === 0 ? (
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center text-xs text-foreground/20 italic">
                      در حال جستجوی باشگاه...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-none">
                      {gyms.map((gym) => (
                        <button
                          key={gym.id}
                          onClick={() => setSelectedGym(gym.id)}
                          className={`
                            rounded-2xl border p-4 text-left transition-all duration-200 haptic-ready
                            ${
                              selectedGym === gym.id
                                ? "border-primary bg-primary/10"
                                : "border-white/5 bg-white/5 hover:bg-white/10"
                            }
                          `}
                          dir={dir}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-bold ${
                                selectedGym === gym.id ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {gym.name}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-warning">
                              <Star className="w-3 h-3 fill-current" />
                              {gym.avg_rating}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-foreground/30 font-medium">
                            <MapPin className="w-3 h-3" />
                            {gym.area ? `${gym.area}, ${gym.city}` : gym.city}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Error Message ────────────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs font-bold text-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Navigation Buttons ────────────────────────────────────── */}
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 text-foreground/40 border border-white/5 haptic-ready"
              >
                {dir === "rtl" ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={
                  (step === 1 && !canProceedFromStep1) ||
                  (step === 2 && !canProceedFromStep2)
                }
                className="hevy-btn-primary flex-1 py-3 text-sm haptic-ready disabled:opacity-30 disabled:grayscale"
              >
                {t("onboarding.next")}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isSaving}
                className="hevy-btn-primary flex-1 py-3 text-sm haptic-ready bg-success shadow-success/20 disabled:opacity-30"
              >
                {isSaving ? t("onboarding.saving") : t("onboarding.complete")}
              </button>
            )}
          </div>

          {/* ── Skip Button ─────────────────────────────────────────── */}
          <div className="mt-4 text-center">
            <button
              onClick={handleSkip}
              disabled={isSaving}
              className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest hover:text-foreground/40 disabled:opacity-50 transition-colors"
            >
              {locale === "fa" ? "رد شدن برای بعد" : "Skip for now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
