"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Dumbbell, Play, ChevronDown, ChevronUp, Zap, Target, Clock } from "lucide-react"

// Pre-built routine templates (Hevy-style)
const routineTemplates = [
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    nameFa: "پوش / پول / پا",
    description: "۶ روز در هفته — محبوب‌ترین برنامه بدنسازی",
    difficulty: "متوسط",
    frequency: "۶ روز/هفته",
    duration: "۶۰-۹۰ دقیقه",
    days: [
      {
        name: "Push — سینه، سرشانه، پشت بازو",
        exercises: [
          { name: "پرس سینه با هالتر", sets: 4, reps: "8-10", rest: 120 },
          { name: "پرس بالا سینه دمبل", sets: 3, reps: "10-12", rest: 90 },
          { name: "قفسه سینه", sets: 3, reps: "12-15", rest: 60 },
          { name: "نشر از جانب دمبل", sets: 4, reps: "12-15", rest: 60 },
          { name: "نشر خم دمبل", sets: 3, reps: "12-15", rest: 60 },
          { name: "پشت بازو سیم‌کش", sets: 3, reps: "12-15", rest: 60 },
          { name: "دیپ پشت بازو", sets: 3, reps: "10-12", rest: 90 },
        ],
      },
      {
        name: "Pull — پشت، جلو بازو",
        exercises: [
          { name: "بارفیکس", sets: 4, reps: "8-10", rest: 120 },
          { name: "زیربغل سیم‌کش", sets: 3, reps: "10-12", rest: 90 },
          { name: "رویینگ دمبل", sets: 3, reps: "10-12", rest: 90 },
          { name: "پول‌اور سیم‌کش", sets: 3, reps: "12-15", rest: 60 },
          { name: "جلو بازو هالتر", sets: 3, reps: "10-12", rest: 60 },
          { name: "جلو بازو چکشی", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
      {
        name: "Legs — پا",
        exercises: [
          { name: "اسکوات با هالتر", sets: 4, reps: "8-10", rest: 150 },
          { name: "پرس پا", sets: 3, reps: "10-12", rest: 120 },
          { name: "لانژ دمبل", sets: 3, reps: "10-12 هر پا", rest: 90 },
          { name: "پشت ران سیم‌کش", sets: 3, reps: "12-15", rest: 60 },
          { name: "ساق پا ایستاده", sets: 4, reps: "15-20", rest: 45 },
          { name: "شکم (کرانچ)", sets: 3, reps: "20", rest: 45 },
        ],
      },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower Split",
    nameFa: "بالاتنه / پایین‌تنه",
    description: "۴ روز در هفته — مناسب مبتدی تا متوسط",
    difficulty: "مبتدی",
    frequency: "۴ روز/هفته",
    duration: "۵۰-۷۰ دقیقه",
    days: [
      {
        name: "بالاتنه A",
        exercises: [
          { name: "پرس سینه هالتر", sets: 4, reps: "8-10", rest: 120 },
          { name: "زیربغل سیم‌کش", sets: 3, reps: "10-12", rest: 90 },
          { name: "پرس سرشانه دمبل", sets: 3, reps: "10-12", rest: 90 },
          { name: "جلو بازو دمبل", sets: 3, reps: "12-15", rest: 60 },
          { name: "پشت بازو سیم‌کش", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
      {
        name: "پایین‌تنه A",
        exercises: [
          { name: "اسکوات", sets: 4, reps: "8-10", rest: 150 },
          { name: "پشت ران سیم‌کش", sets: 3, reps: "10-12", rest: 90 },
          { name: "ساق پا", sets: 4, reps: "15-20", rest: 45 },
          { name: "شکم", sets: 3, reps: "20", rest: 45 },
        ],
      },
    ],
  },
  {
    id: "bro-split",
    name: "Bro Split",
    nameFa: "برو اسپلیت",
    description: "۵ روز در هفته — یک عضله در هر جلسه",
    difficulty: "متوسط",
    frequency: "۵ روز/هفته",
    duration: "۴۵-۶۰ دقیقه",
    days: [
      { name: "سینه", exercises: [
        { name: "پرس سینه", sets: 4, reps: "8-10", rest: 120 },
        { name: "پرس بالا سینه", sets: 3, reps: "10-12", rest: 90 },
        { name: "قفسه سینه", sets: 3, reps: "12-15", rest: 60 },
        { name: "کراس اور", sets: 3, reps: "12-15", rest: 60 },
      ]},
      { name: "پشت", exercises: [
        { name: "بارفیکس", sets: 4, reps: "8-10", rest: 120 },
        { name: "زیربغل سیم‌کش", sets: 3, reps: "10-12", rest: 90 },
        { name: "رویینگ", sets: 3, reps: "10-12", rest: 90 },
      ]},
      { name: "پا", exercises: [
        { name: "اسکوات", sets: 4, reps: "8-10", rest: 150 },
        { name: "پرس پا", sets: 3, reps: "10-12", rest: 120 },
        { name: "پشت ران", sets: 3, reps: "12-15", rest: 90 },
        { name: "ساق پا", sets: 4, reps: "15-20", rest: 45 },
      ]},
      { name: "سرشانه", exercises: [
        { name: "پرس سرشانه", sets: 4, reps: "8-10", rest: 120 },
        { name: "نشر از جانب", sets: 4, reps: "12-15", rest: 60 },
        { name: "نشر خم", sets: 3, reps: "12-15", rest: 60 },
      ]},
      { name: "بازو", exercises: [
        { name: "جلو بازو هالتر", sets: 3, reps: "10-12", rest: 60 },
        { name: "جلو بازو چکشی", sets: 3, reps: "12-15", rest: 60 },
        { name: "پشت بازو سیم‌کش", sets: 3, reps: "12-15", rest: 60 },
        { name: "دیپ پشت بازو", sets: 3, reps: "10-12", rest: 90 },
      ]},
    ],
  },
  {
    id: "full-body",
    name: "Full Body",
    nameFa: "فول‌بادی",
    description: "۳ روز در هفته — بهترین برای مبتدی",
    difficulty: "مبتدی",
    frequency: "۳ روز/هفته",
    duration: "۴۵-۶۰ دقیقه",
    days: [
      {
        name: "فول‌بادی",
        exercises: [
          { name: "اسکوات", sets: 3, reps: "8-10", rest: 120 },
          { name: "پرس سینه", sets: 3, reps: "8-10", rest: 120 },
          { name: "بارفیکس یا زیربغل", sets: 3, reps: "8-10", rest: 120 },
          { name: "پرس سرشانه", sets: 3, reps: "10-12", rest: 90 },
          { name: "جلو بازو", sets: 2, reps: "12-15", rest: 60 },
          { name: "پشت بازو", sets: 2, reps: "12-15", rest: 60 },
        ],
      },
    ],
  },
]

export default function RoutineTemplatesPage() {
  const router = useRouter()
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5 px-4 py-4">
        <h1 className="text-xl font-bold">📋 تمپلیت‌های آماده</h1>
        <p className="text-foreground/30 text-xs mt-1">برنامه‌های تمرینی معتبر — یک کلیک شروع کنید</p>
      </div>

      <div className="px-4 py-4 space-y-3 stagger-children">
        {routineTemplates.map((template) => {
          const isExpanded = expandedTemplate === template.id
          const diffColor = template.difficulty === "مبتدی" ? "text-success" : "text-warning"

          return (
            <motion.div key={template.id} layout className="glass-card overflow-hidden">
              {/* Template Header */}
              <button
                onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                className="w-full p-4 flex items-start justify-between text-right"
              >
                <div className="flex-1">
                  <h3 className="text-base font-bold">{template.nameFa}</h3>
                  <p className="text-foreground/30 text-xs mt-0.5">{template.name}</p>
                  <p className="text-foreground/20 text-[10px] mt-1">{template.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[10px] font-semibold ${diffColor}`}>
                      <Target className="w-3 h-3 inline ml-1" />{template.difficulty}
                    </span>
                    <span className="text-[10px] text-foreground/30">
                      <Zap className="w-3 h-3 inline ml-1" />{template.frequency}
                    </span>
                    <span className="text-[10px] text-foreground/30">
                      <Clock className="w-3 h-3 inline ml-1" />{template.duration}
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-foreground/20 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-foreground/20 shrink-0" />
                )}
              </button>

              {/* Expanded Days */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {template.days.map((day, dayIdx) => {
                        const dayKey = `${template.id}-${dayIdx}`
                        const isDayExpanded = expandedDay === dayKey

                        return (
                          <div key={dayIdx} className="bg-white/[0.02] rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedDay(isDayExpanded ? null : dayKey)}
                              className="w-full px-3 py-2.5 flex items-center justify-between"
                            >
                              <span className="text-xs font-semibold">{day.name}</span>
                              <span className="text-[10px] text-foreground/20">{day.exercises.length} حرکت</span>
                            </button>

                            {isDayExpanded && (
                              <div className="px-3 pb-3 space-y-1.5">
                                {day.exercises.map((ex, exIdx) => (
                                  <div key={exIdx} className="flex items-center justify-between py-1.5 px-2 bg-white/[0.02] rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-foreground/15 w-4">{exIdx + 1}</span>
                                      <span className="text-xs">{ex.name}</span>
                                    </div>
                                    <span className="text-[10px] text-foreground/30">{ex.sets}×{ex.reps}</span>
                                  </div>
                                ))}
                                <button onClick={() => router.push("/workout")} className="w-full mt-2 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                                  <Play className="w-3.5 h-3.5" />
                                  شروع {day.name}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Start Full Routine */}
                      <button onClick={() => router.push("/workout")} className="w-full py-3 rounded-xl bg-success text-foreground text-sm font-bold shadow-lg shadow-success/20 flex items-center justify-center gap-2 mt-2 active:scale-95 transition-transform">
                        <Dumbbell className="w-4 h-4" />
                        شروع برنامه {template.nameFa}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}