"use client"

import { useState, useEffect, useTransition } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronLeft, ChevronRight, Dumbbell, Zap, Clock } from "lucide-react"
import { getCalendarDataWithIntensity } from "@/app/actions/analytics"
import * as jalaali from "jalaali-js"

const persianMonths = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"]
const weekDays = ["ش","ی","د","س","چ","پ","ج"]

const PERSIAN_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"]
function toPersianNumeral(n: number): string {
  return String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d)])
}

const intensityColors = {
  none: "transparent",
  light: "rgba(48, 209, 88, 0.15)",
  moderate: "rgba(79, 142, 247, 0.3)",
  heavy: "rgba(255, 159, 10, 0.45)",
}

const intensityLabels: Record<string, string> = {
  none: "—",
  light: "سبک",
  moderate: "متوسط",
  heavy: "سنگین",
}

interface DayInfo {
  date: string
  intensity: "none" | "light" | "moderate" | "heavy"
  workoutName?: string
  duration?: number
  volume?: number
}

export default function CalendarPage() {
  const [isPending, startTransition] = useTransition()

  // Convert today to Jalali for initial state
  const now = new Date()
  const todayJalali = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const [jy, setJy] = useState(todayJalali.jy)
  const [jm, setJm] = useState(todayJalali.jm)
  const [dayMap, setDayMap] = useState<Map<string, DayInfo>>(new Map())
  const [selectedJalali, setSelectedJalali] = useState<string | null>(null) // "jy-jm-jd"

  // Fetch data for Gregorian months that overlap with this Jalali month
  useEffect(() => {
    startTransition(async () => {
      const daysInJalaliMonth = jalaali.jalaaliMonthLength(jy, jm)
      const firstG = jalaali.toGregorian(jy, jm, 1)
      const lastG = jalaali.toGregorian(jy, jm, daysInJalaliMonth)

      // Determine which Gregorian months to fetch
      const gMonthsToFetch = new Set<string>()
      gMonthsToFetch.add(`${firstG.gy}-${firstG.gm}`)
      gMonthsToFetch.add(`${lastG.gy}-${lastG.gm}`)

      const map = new Map<string, DayInfo>()
      for (const key of gMonthsToFetch) {
        const [gy, gm] = key.split("-").map(Number)
        const res = await getCalendarDataWithIntensity({ year: gy, month: gm })
        if (res.success && res.days) {
          for (const d of res.days) {
            map.set(d.date, d)
          }
        }
      }
      setDayMap(map)
    })
  }, [jy, jm])

  // Jalali calendar grid calculations
  const daysInMonth = jalaali.jalaaliMonthLength(jy, jm)

  // Get day of week for the 1st of this Jalali month (in Shamsi week: Sat=0 ... Fri=6)
  const firstG = jalaali.toGregorian(jy, jm, 1)
  const firstDayJs = new Date(firstG.gy, firstG.gm - 1, firstG.gd).getDay()
  const firstDay = (firstDayJs + 1) % 7 // Convert JS day (Sun=0) to Shamsi (Sat=0)

  // Today's Gregorian date string
  const todayGregorianStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const prevMonth = () => {
    if (jm === 1) { setJm(12); setJy(jy - 1) }
    else setJm(jm - 1)
  }
  const nextMonth = () => {
    if (jm === 12) { setJm(1); setJy(jy + 1) }
    else setJm(jm + 1)
  }

  const formatDuration = (s: number) => `${toPersianNumeral(Math.floor(s / 60))} دقیقه`

  // Convert Jalali day to Gregorian date string for data lookup
  const jalaliToGregorianStr = (jd: number) => {
    const g = jalaali.toGregorian(jy, jm, jd)
    return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`
  }

  // Month summary stats
  const monthDays = Array.from(dayMap.values())
  const totalWorkouts = monthDays.length
  const totalVolume = monthDays.reduce((sum, d) => sum + (d.volume || 0), 0)
  const totalDuration = monthDays.reduce((sum, d) => sum + (d.duration || 0), 0)

  // Format selected Jalali date for display
  const formatSelectedDate = (jalaliKey: string) => {
    const [, , jdStr] = jalaliKey.split("-")
    const jd = parseInt(jdStr)
    return `${toPersianNumeral(jd)} ${persianMonths[jm - 1]} ${toPersianNumeral(jy)}`
  }

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">🗓️ تقویم تمرین</h1>

          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 rounded-xl bg-white/10 active:scale-95 transition-transform">
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold">{persianMonths[jm - 1]} {toPersianNumeral(jy)}</span>
            <button onClick={nextMonth} className="p-2 rounded-xl bg-white/10 active:scale-95 transition-transform">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Month Summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="glass-card p-2.5 text-center">
            <p className="text-primary font-bold text-sm">{toPersianNumeral(totalWorkouts)}</p>
            <p className="text-foreground/25 text-[10px]">تمرین</p>
          </div>
          <div className="glass-card p-2.5 text-center">
            <p className="text-success font-bold text-sm">{toPersianNumeral(totalVolume)}</p>
            <p className="text-foreground/25 text-[10px]">حجم (kg)</p>
          </div>
          <div className="glass-card p-2.5 text-center">
            <p className="text-warning font-bold text-sm">{toPersianNumeral(Math.floor(totalDuration / 60))}</p>
            <p className="text-foreground/25 text-[10px]">دقیقه</p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="glass-card p-4 mb-4">
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs text-foreground/40 py-1">{d}</div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const jd = i + 1
              const gDateStr = jalaliToGregorianStr(jd)
              const dayInfo = dayMap.get(gDateStr)
              const hasWorkout = !!dayInfo
              const isToday = gDateStr === todayGregorianStr
              const jalaliKey = `${jy}-${jm}-${jd}`
              const isSelected = selectedJalali === jalaliKey
              const intensity = dayInfo?.intensity || "none"

              return (
                <motion.button
                  key={jd}
                  onClick={() => setSelectedJalali(isSelected ? null : jalaliKey)}
                  whileTap={{ scale: 0.9 }}
                  className={`
                    aspect-square rounded-xl flex items-center justify-center text-sm relative transition-all
                    ${isToday ? "ring-2 ring-primary" : ""}
                    ${isSelected ? "ring-2 ring-white scale-110 z-10" : ""}
                    ${hasWorkout ? "font-bold" : "text-foreground/60"}
                  `}
                  style={{
                    backgroundColor: hasWorkout ? intensityColors[intensity] : "transparent",
                    color: hasWorkout
                      ? intensity === "heavy" ? "#FF9F0A"
                        : intensity === "moderate" ? "#4F8EF7"
                        : "#30D158"
                      : undefined,
                  }}
                >
                  {toPersianNumeral(jd)}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Intensity Legend */}
        <div className="flex items-center gap-3 mb-4 text-xs text-foreground/40">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: intensityColors.light }} />
            <span>سبک</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: intensityColors.moderate }} />
            <span>متوسط</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: intensityColors.heavy }} />
            <span>سنگین</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded ring-2 ring-primary" />
            <span>امروز</span>
          </div>
        </div>

        {/* Selected Day Details */}
        <AnimatePresence mode="wait">
          {selectedJalali && (() => {
            const parts = selectedJalali.split("-").map(Number)
            const jd = parts[2]
            const gDateStr = jalaliToGregorianStr(jd)

            return (
              <motion.div
                key={selectedJalali}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">{formatSelectedDate(selectedJalali)}</p>
                  {dayMap.has(gDateStr) && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      dayMap.get(gDateStr)?.intensity === "heavy" ? "bg-warning/15 text-warning" :
                      dayMap.get(gDateStr)?.intensity === "moderate" ? "bg-primary/15 text-primary" :
                      "bg-success/15 text-success"
                    }`}>
                      {intensityLabels[dayMap.get(gDateStr)?.intensity || "light"]}
                    </span>
                  )}
                </div>

                {dayMap.has(gDateStr) ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{dayMap.get(gDateStr)?.workoutName || "تمرین"}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-foreground/30 text-[10px]">
                            <Clock className="w-3 h-3" />{formatDuration(dayMap.get(gDateStr)?.duration || 0)}
                          </span>
                          <span className="flex items-center gap-1 text-foreground/30 text-[10px]">
                            <Zap className="w-3 h-3" />{toPersianNumeral(dayMap.get(gDateStr)?.volume || 0)} kg
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/30 text-center py-2">تمرینی در این روز ثبت نشده</p>
                )}
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>
    </div>
  )
}
