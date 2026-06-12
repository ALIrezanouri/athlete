"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Dumbbell,
  AlertCircle,
  Flame,
  Target,
  Layers,
  PlayCircle,
  Plus,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useGlobalEngine } from "@/lib/GlobalEngineContext";
import { getExerciseById, getMuscleGroups, getEquipmentTypes } from "@/app/actions/workouts";
import type { Exercise } from "@/app/actions/workouts";
import { getExerciseHighlightData, MUSCLE_GROUPS, HIDDEN_SLUGS } from "@/lib/body-map/muscle-mapping";
import type { BodyPartSlug, BodyPartData } from "simple-body-highlighter-react";

// ── Dynamic import for body highlighter (SSR-safe) ──────────────────────────
const Body = dynamic(
  () => import("simple-body-highlighter-react").then((mod) => mod.Body),
  { ssr: false }
);

// ── Persian label maps ──────────────────────────────────────────────────────
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: "هالتر",
  dumbbell: "دمبل",
  kettlebell: "کتبل",
  machine: "دستگاه",
  cable: "کابل",
  band: "بان مقاومتی",
  plate: "صفحه وزنه",
  bodyweight: "بدن‌سنگین",
  other: "سایر",
  none: "بدون تجهیزات",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "مبتدی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: "bg-success/10", text: "text-success" },
  intermediate: { bg: "bg-warning/10", text: "text-warning" },
  advanced: { bg: "bg-destructive/10", text: "text-destructive" },
};

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  compound: "چندعضلی",
  isolation: "تک‌عضلی",
  cardio: "کاردیو",
  flexibility: "انعطاف‌پذیری",
};

// ── Page Component ──────────────────────────────────────────────────────────
export default function ExerciseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, dir } = useGlobalEngine();

  const id = params.id as string;

  // State
  const [exercise, setExercise] = useState<Exercise & { localName?: string; localDescription?: string; localInstructions?: string } | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [bodyView, setBodyView] = useState<"front" | "back">("front");

  // Fetch exercise data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const exerciseResult = await getExerciseById(id, "fa");
        if (exerciseResult.success && exerciseResult.exercise) {
          setExercise(exerciseResult.exercise);
        } else {
          setError(exerciseResult.error || "Exercise not found");
        }

        // Fetch muscle groups + equipment types for label lookups
        const mgResult = await getMuscleGroups();
        if (mgResult.success && mgResult.muscleGroups) {
          setMuscleGroups(mgResult.muscleGroups);
        }

        const eqResult = await getEquipmentTypes();
        if (eqResult.success && eqResult.equipmentTypes) {
          setEquipmentTypes(eqResult.equipmentTypes);
        }
      } catch (err) {
        console.error("[EXERCISE_DETAIL] Error fetching data:", err);
        setError("Failed to load exercise");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  // Helper: get muscle group label
  function getMuscleLabel(muscleId: string): string {
    // First check MUSCLE_GROUPS from body-map mapping
    const bodyMapGroup = MUSCLE_GROUPS.find((g) => g.id === muscleId);
    if (bodyMapGroup) return bodyMapGroup.label;

    // Then check DB muscle groups
    const dbGroup = muscleGroups.find((g: any) => g.id === muscleId);
    if (dbGroup) return dbGroup.name_fa || dbGroup.name_en || muscleId;

    return muscleId;
  }

  // Helper: get equipment label
  function getEquipmentLabel(equipmentId: string | null): string {
    if (!equipmentId) return "بدون تجهیزات";
    return EQUIPMENT_LABELS[equipmentId] || equipmentId;
  }

  // Build body highlight data for this exercise
  const highlightData: BodyPartData[] = exercise
    ? getExerciseHighlightData(bodyView, exercise.muscle_group_id, exercise.secondary_muscle_groups)
    : [];

  // Determine which body view to show based on primary muscle
  function getPreferredView(muscleId: string): "front" | "back" {
    const group = MUSCLE_GROUPS.find((g) => g.id === muscleId);
    if (!group) return "front";
    // If muscle has front slugs, show front view; otherwise back
    if (group.frontSlugs.length > 0) return "front";
    return "back";
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-foreground/60">{error}</p>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.back()}
              className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-foreground"
            >
              بازگشت
            </motion.button>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && exercise && (
        <>
          {/* ─── Top Bar ──────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 border-b border-white/5 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5"
              >
                <ArrowRight className="h-5 w-5 text-foreground rotate-180" />
              </motion.button>

              <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                {exercise.localName || exercise.name_en}
              </h1>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={async () => {
                  const shareData = {
                    title: exercise.localName || exercise.name_en,
                    url: window.location.href,
                  };
                  if (navigator.share) {
                    try { await navigator.share(shareData); } catch {}
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5"
              >
                <Share2 className="h-5 w-5 text-foreground/60" />
              </motion.button>
            </div>
          </div>

          {/* ─── Demo Media Section ────────────────────────────────────── */}
          <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl bg-hevy-elevated">
            {exercise.video_url ? (
              <video
                src={exercise.video_url}
                controls
                className="w-full aspect-video object-cover"
                poster={exercise.image_url || undefined}
              />
            ) : exercise.image_url ? (
              <img
                src={exercise.image_url}
                alt={exercise.localName || exercise.name_en}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center">
                <Dumbbell className="h-20 w-20 text-foreground/10" />
              </div>
            )}

            {/* Video indicator overlay */}
            {exercise.video_url && !exercise.image_url && (
              <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-background/50 px-2 py-1 backdrop-blur-md">
                <PlayCircle className="h-3.5 w-3.5 text-foreground/80" />
                <span className="text-[10px] text-foreground/80">ویدیو</span>
              </div>
            )}
          </div>

          {/* ─── Exercise Name + Badges ────────────────────────────────── */}
          <div className="px-4 mt-4">
            <h2 className="text-xl font-bold text-foreground">
              {exercise.localName || exercise.name_en}
            </h2>
            {exercise.localName && exercise.localName !== exercise.name_en && (
              <p className="text-sm text-foreground/40 mt-0.5" dir="ltr">
                {exercise.name_en}
              </p>
            )}

            {/* Badges row */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Difficulty badge */}
              {exercise.difficulty && (
                <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${DIFFICULTY_COLORS[exercise.difficulty]?.bg || "bg-white/5"} ${DIFFICULTY_COLORS[exercise.difficulty]?.text || "text-foreground/60"}`}>
                  <Flame className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                  </span>
                </span>
              )}

              {/* Compound/Isolation badge */}
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${exercise.is_compound ? "bg-primary/10 text-primary" : "bg-white/5 text-foreground/60"}`}>
                <Layers className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {exercise.is_compound ? "چندعضلی" : "تک‌عضلی"}
                </span>
              </span>

              {/* Equipment badge */}
              <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-foreground/60">
                <Dumbbell className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {getEquipmentLabel(exercise.equipment_type_id)}
                </span>
              </span>
            </div>
          </div>

          {/* ─── Divider ───────────────────────────────────────────── */}
          <div className="mx-4 my-5 h-px bg-white/5" />

          {/* ─── Muscle Groups Section ─────────────────────────────────── */}
          <div className="px-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              عضلات هدف
            </h3>

            {/* Primary muscle */}
            <div className="mt-3">
              <span className="text-[10px] text-foreground/40">عضله اصلی</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                  <Target className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary">
                  {getMuscleLabel(exercise.muscle_group_id)}
                </span>
              </div>
            </div>

            {/* Secondary muscles */}
            {exercise.secondary_muscle_groups && exercise.secondary_muscle_groups.length > 0 && (
              <div className="mt-3">
                <span className="text-[10px] text-foreground/40">عضلات فرعی</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {exercise.secondary_muscle_groups.map((muscleId) => (
                    <span
                      key={muscleId}
                      className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-foreground/60"
                    >
                      {getMuscleLabel(muscleId)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Divider ───────────────────────────────────────────── */}
          <div className="mx-4 my-5 h-px bg-white/5" />

          {/* ─── Body Map Section ──────────────────────────────────────── */}
          <div className="px-4">
            <h3 className="text-base font-semibold text-foreground">
              نقشه عضلات
            </h3>

            {/* View toggle */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setBodyView("front")}
                className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
                  bodyView === "front"
                    ? "bg-primary text-foreground"
                    : "bg-white/5 text-foreground/60"
                }`}
              >
                نمای جلو
              </button>
              <button
                onClick={() => setBodyView("back")}
                className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
                  bodyView === "back"
                    ? "bg-primary text-foreground"
                    : "bg-white/5 text-foreground/60"
                }`}
              >
                نمای پشت
              </button>
            </div>

            {/* Body highlighter */}
            <div className="mt-3 flex justify-center">
              <div className="w-full max-w-[280px]">
                <Body
                  data={highlightData}
                  gender="male"
                  side={bodyView}
                  border="#3A3A3C"
                  defaultFill="#2C2C2E"
                  hiddenParts={HIDDEN_SLUGS as BodyPartSlug[]}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-[10px] text-foreground/40">عضله اصلی</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-primary/30" />
                <span className="text-[10px] text-foreground/40">عضله فرعی</span>
              </div>
            </div>
          </div>

          {/* ─── Divider ───────────────────────────────────────────── */}
          <div className="mx-4 my-5 h-px bg-white/5" />

          {/* ─── Description Section ───────────────────────────────────── */}
          {(exercise.localDescription || exercise.description) && (
            <>
              <div className="px-4">
                <h3 className="text-base font-semibold text-foreground">
                  توضیحات
                </h3>
                <div className="mt-2">
                  <p className={`text-sm leading-relaxed text-foreground/60 ${!expanded ? "line-clamp-3" : ""}`}>
                    {exercise.localDescription || exercise.description}
                  </p>
                  {(exercise.localDescription || exercise.description || "").length > 120 && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="mt-1 flex items-center gap-1 text-xs font-medium text-primary"
                    >
                      {expanded ? "بستن" : "بیشتر"}
                      {expanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="mx-4 my-5 h-px bg-white/5" />
            </>
          )}

          {/* ─── Instructions Section ──────────────────────────────────── */}
          {exercise.localInstructions && (
            <>
              <div className="px-4">
                <h3 className="text-base font-semibold text-foreground">
                  نحوه اجرا
                </h3>
                <div className="mt-2 glass-card p-4">
                  <p className="text-sm leading-relaxed text-foreground/60">
                    {exercise.localInstructions}
                  </p>
                </div>
              </div>

              <div className="mx-4 my-5 h-px bg-white/5" />
            </>
          )}

          {/* ─── Exercise Info Card ────────────────────────────────────── */}
          <div className="px-4">
            <h3 className="text-base font-semibold text-foreground">
              مشخصات تمرین
            </h3>
            <div className="mt-2 glass-card p-4 space-y-3">
              {/* Exercise type */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/50">نوع تمرین</span>
                <span className="text-sm font-medium text-foreground">
                  {EXERCISE_TYPE_LABELS[exercise.exercise_type] || exercise.exercise_type}
                </span>
              </div>

              {/* Movement pattern */}
              {exercise.movement_pattern && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/50">الگوی حرکت</span>
                  <span className="text-sm font-medium text-foreground" dir="ltr">
                    {exercise.movement_pattern}
                  </span>
                </div>
              )}

              {/* Difficulty */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/50">سطح دشواری</span>
                <span className={`text-sm font-medium ${DIFFICULTY_COLORS[exercise.difficulty]?.text || "text-foreground"}`}>
                  {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                </span>
              </div>

              {/* Equipment */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/50">تجهیزات</span>
                <span className="text-sm font-medium text-foreground">
                  {getEquipmentLabel(exercise.equipment_type_id)}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Sticky CTA: Add to Routine ────────────────────────────── */}
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-background/90 px-4 pb-6 pt-3 backdrop-blur-xl">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`/routines?addExercise=${exercise.id}`)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-semibold text-foreground"
            >
              <Plus className="h-4 w-4" />
              افزودن به برنامه تمرینی
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}