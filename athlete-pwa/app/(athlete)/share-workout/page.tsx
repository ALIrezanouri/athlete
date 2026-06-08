"use client"

import { useState, useRef, useCallback } from "react"
import { motion } from "motion/react"
import { Share2, Download, Trophy, Flame, Clock, Zap, Dumbbell } from "lucide-react"

// Mock workout data for share card
const mockWorkout = {
  name: "سینه و سرشانه",
  date: "۱۴۰۵/۰۳/۰۱",
  duration: "۱:۱۲:۳۰",
  volume: "۴,۸۵۰ kg",
  sets: 24,
  calories: 120,
  exercises: [
    { name: "پرس سینه", sets: [{ weight: 80, reps: 10 }, { weight: 85, reps: 8 }, { weight: 90, reps: 6 }] },
    { name: "قفسه سینه", sets: [{ weight: 60, reps: 12 }, { weight: 65, reps: 10 }] },
    { name: "سرشانه جان", sets: [{ weight: 20, reps: 12 }, { weight: 22, reps: 10 }, { weight: 25, reps: 8 }] },
    { name: "پرس سرشانه", sets: [{ weight: 40, reps: 10 }, { weight: 45, reps: 8 }] },
  ],
  pr: true,
  prExercise: "پرس سینه",
  prValue: "90kg × 6",
}

const bgStyles = [
  { id: "dark", name: "تاریک", bg: "bg-gradient-to-br from-background to-background", text: "text-foreground" },
  { id: "blue", name: "آبی", bg: "bg-gradient-to-br from-[#0A1628] to-[#0D47A1]", text: "text-foreground" },
  { id: "green", name: "سبز", bg: "bg-gradient-to-br from-[#0A1A0A] to-[#1B5E20]", text: "text-foreground" },
  { id: "purple", name: "بنفش", bg: "bg-gradient-to-br from-[#1A0A2E] to-[#4A148C]", text: "text-foreground" },
  { id: "orange", name: "نارنجی", bg: "bg-gradient-to-br from-[#1A0A00] to-[#E65100]", text: "text-foreground" },
]

export default function ShareWorkoutPage() {
  const [selectedStyle, setSelectedStyle] = useState("dark")
  const cardRef = useRef<HTMLDivElement>(null)
  const style = bgStyles.find(s => s.id === selectedStyle)!

  const [downloading, setDownloading] = useState(false)

  const handleShare = async () => {
    if (!cardRef.current) return
    try {
      // Use Web Share API
      const canvas = document.createElement("canvas")
      canvas.width = 1080
      canvas.height = 1920
      // For now, just use native share
      if (navigator.share) {
        await navigator.share({
          title: mockWorkout.name,
          text: `${mockWorkout.name} — ${mockWorkout.volume} حجم | ${mockWorkout.sets} ست | ${mockWorkout.duration}`,
        })
      }
    } catch (e) {
      // Fallback: copy to clipboard
      const text = `${mockWorkout.name}\n⏱ ${mockWorkout.duration}\n🏋️ ${mockWorkout.volume}\n🔥 ${mockWorkout.calories} کالری\n${mockWorkout.exercises.map(e => `\n💪 ${e.name}: ${e.sets.map(s => `${s.weight}×${s.reps}`).join(" | ")}`).join("")}`
      await navigator.clipboard.writeText(text)
      alert("کپی شد!")
    }
  }

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || downloading) return
    setDownloading(true)
    try {
      const { toPng } = await import("html-to-image")
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#1C1C1E",
      })
      const link = document.createElement("a")
      link.download = `workout-${mockWorkout.date}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Download failed:", err)
    } finally {
      setDownloading(false)
    }
  }, [downloading])

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5 px-4 py-4">
        <h1 className="text-xl font-bold">📤 اشتراک‌گذاری تمرین</h1>
      </div>

      <div className="px-4 py-4">
        {/* Preview Card */}
        <div className="flex justify-center mb-6">
          <div ref={cardRef} className={`${style.bg} rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl`}>
            {/* Top Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-foreground" />
                </div>
                <span className="text-xs text-foreground/50 font-medium">rokhdad FIT</span>
              </div>
              {mockWorkout.pr && (
                <div className="flex items-center gap-1 bg-warning/20 px-2.5 py-1 rounded-full">
                  <Trophy className="w-3 h-3 text-warning" />
                  <span className="text-[10px] font-bold text-warning">PR!</span>
                </div>
              )}
            </div>

            {/* Workout Name */}
            <h2 className="text-2xl font-black mb-1">{mockWorkout.name}</h2>
            <p className="text-foreground/30 text-xs mb-4">{mockWorkout.date}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white/[0.06] rounded-2xl p-3 text-center">
                <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-sm font-bold">{mockWorkout.duration}</p>
                <p className="text-[9px] text-foreground/30">مدت</p>
              </div>
              <div className="bg-white/[0.06] rounded-2xl p-3 text-center">
                <Zap className="w-4 h-4 text-success mx-auto mb-1" />
                <p className="text-sm font-bold">{mockWorkout.volume}</p>
                <p className="text-[9px] text-foreground/30">حجم</p>
              </div>
              <div className="bg-white/[0.06] rounded-2xl p-3 text-center">
                <Flame className="w-4 h-4 text-warning mx-auto mb-1" />
                <p className="text-sm font-bold">{mockWorkout.calories}</p>
                <p className="text-[9px] text-foreground/30">کالری</p>
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-2.5">
              {mockWorkout.exercises.map((ex, i) => (
                <div key={i} className="bg-white/[0.04] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold">{ex.name}</p>
                    <span className="text-[10px] text-foreground/30">{ex.sets.length} ست</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {ex.sets.map((s, j) => (
                      <span key={j} className="text-[10px] bg-white/[0.08] px-2 py-0.5 rounded-md text-foreground/60">
                        {s.weight}×{s.reps}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* PR Highlight */}
            {mockWorkout.pr && (
              <div className="mt-4 bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-xs font-bold text-warning">رکورد جدید!</p>
                  <p className="text-[10px] text-foreground/50">{mockWorkout.prExercise}: {mockWorkout.prValue}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Style Selector */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground/60 mb-3">🎨 استایل کارت</h3>
          <div className="flex gap-3 justify-center">
            {bgStyles.map((s) => (
              <button key={s.id} onClick={() => setSelectedStyle(s.id)}
                className={`w-12 h-12 rounded-xl ${s.bg} border-2 transition-all ${
                  selectedStyle === s.id ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <button onClick={handleShare}
            className="w-full hevy-btn-primary py-4 flex items-center justify-center gap-2 text-sm"
          >
            <Share2 className="w-5 h-5" />
            اشتراک‌گذاری
          </button>
          <button onClick={handleDownload} disabled={downloading}
            className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-foreground/60 text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? "در حال ذخیره..." : "دانلود تصویر"}
          </button>
        </div>
      </div>
    </div>
  )
}