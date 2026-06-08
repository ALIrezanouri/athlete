"use client"

import { useState, useEffect, useTransition } from "react"
import { motion } from "motion/react"
import { BarChart3, TrendingUp, Flame, Clock, Dumbbell, Trophy, Activity, Target, Zap } from "lucide-react"
import { getWorkoutStats, getCalendarDataWithIntensity } from "@/app/actions/analytics"
import { useGlobalEngine } from "@/lib/GlobalEngineContext"

// ── Animation ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
}

// ── Heatmap (GitHub-style) ──
function ActivityHeatmap({ days }: { days: number[] }) {
  const getColor = (level: number) => {
    if (level === 0) return "bg-hevy-elevated/40"
    if (level === 1) return "bg-primary/25"
    if (level === 2) return "bg-primary/50"
    if (level === 3) return "bg-primary/75"
    return "bg-primary"
  }

  return (
    <div className="flex gap-[3px] flex-wrap">
      {days.map((level, i) => (
        <div
          key={i}
          className={`heatmap-cell w-[10px] h-[10px] ${getColor(level)}`}
          title={`${level} sets`}
        />
      ))}
    </div>
  )
}

// ── Mini Bar Chart ──
function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((val, i) => (
        <div
          key={i}
          className={`rounded-sm transition-all duration-500 ${color}`}
          style={{
            width: "100%",
            height: `${Math.max((val / max) * 100, 4)}%`,
            opacity: val > 0 ? 1 : 0.2,
            transitionDelay: `${i * 30}ms`,
          }}
        />
      ))}
    </div>
  )
}

// ── Circular Progress ──
function CircularProgress({ value, max, color, size = 56, label }: {
  value: number; max: number; color: string; size?: number; label: string
}) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / max, 1)
  const offset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#3A3A3C" strokeWidth="4" />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="ring-progress"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{value}</span>
        </div>
      </div>
      <span className="text-[9px] text-foreground/35 font-medium text-center">{label}</span>
    </div>
  )
}

// ── Main Component ──
export default function AnalyticsPage() {
  const { t } = useGlobalEngine()
  const [isPending, startTransition] = useTransition()
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">("month")
  const [stats, setStats] = useState<{
    totalWorkouts: number
    totalVolume: number
    totalSets: number
    totalDuration: number
    avgDuration: number
    estimatedCalories: number
    streak: number
    muscleDistribution: Array<{ group: string; count: number }>
  } | null>(null)
  const [heatmapDays, setHeatmapDays] = useState<number[]>(Array(84).fill(0))
  const [volumeChart, setVolumeChart] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [bestStreak, setBestStreak] = useState(0)
  const [volumeTrend, setVolumeTrend] = useState<string>("")

  useEffect(() => {
    startTransition(async () => {
      const res = await getWorkoutStats({ period })
      if (res.success && res.stats) setStats(res.stats)

      // Fetch heatmap data (last 3 months = ~84 days)
      const now = new Date()
      const monthPromises = [0, 1, 2].map(offset => {
        const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
        return getCalendarDataWithIntensity({ year: d.getFullYear(), month: d.getMonth() + 1 })
      })
      const monthResults = await Promise.all(monthPromises)

      // Build 84-day heatmap from calendar data
      const dayMap = new Map<string, number>()
      for (const mr of monthResults) {
        if (mr.success && mr.days) {
          for (const d of mr.days) {
            const level = d.intensity === "heavy" ? 4 : d.intensity === "moderate" ? 3 : d.intensity === "light" ? 1 : 0
            dayMap.set(d.date, level)
          }
        }
      }
      const heatArr: number[] = []
      for (let i = 83; i >= 0; i--) {
        const dt = new Date(Date.now() - i * 86400000)
        const key = dt.toISOString().split("T")[0]
        heatArr.push(dayMap.get(key) || 0)
      }
      setHeatmapDays(heatArr)

      // Compute volume chart from calendar data
      const allDays = monthResults.flatMap(mr => mr.success && mr.days ? mr.days : [])
      if (period === "week") {
        const daily: number[] = []
        for (let i = 6; i >= 0; i--) {
          const dt = new Date(Date.now() - i * 86400000)
          const key = dt.toISOString().split("T")[0]
          const found = allDays.find(d => d.date === key)
          daily.push(found?.volume || 0)
        }
        setVolumeChart(daily)
        // Compute trend: compare first half vs second half
        const firstHalf = daily.slice(0, 3).reduce((a, b) => a + b, 0)
        const secondHalf = daily.slice(4).reduce((a, b) => a + b, 0)
        if (firstHalf > 0) {
          const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
          setVolumeTrend(pct >= 0 ? `↑ ${pct.toLocaleString("fa-IR")}٪` : `↓ ${Math.abs(pct).toLocaleString("fa-IR")}٪`)
        } else {
          setVolumeTrend("")
        }
      } else {
        // Monthly: group by week
        const weekVolumes = [0, 0, 0, 0]
        for (const d of allDays) {
          const dt = new Date(d.date)
          const weekIdx = Math.min(Math.floor((dt.getDate() - 1) / 7), 3)
          weekVolumes[weekIdx] += d.volume || 0
        }
        setVolumeChart(weekVolumes)
        const firstHalf = weekVolumes[0] + weekVolumes[1]
        const secondHalf = weekVolumes[2] + weekVolumes[3]
        if (firstHalf > 0) {
          const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
          setVolumeTrend(pct >= 0 ? `↑ ${pct.toLocaleString("fa-IR")}٪` : `↓ ${Math.abs(pct).toLocaleString("fa-IR")}٪`)
        } else {
          setVolumeTrend("")
        }
      }

      // Compute best streak from all-time stats
      const allRes = await getWorkoutStats({ period: "all" })
      if (allRes.success && allRes.stats) {
        setBestStreak(allRes.stats.streak)
      }
    })
  }, [period])

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m} دقیقه`
  }

  const muscleGroupLabels: Record<string, string> = {
    chest: "سینه", back: "پشت", shoulders: "سرشانه", biceps: "جلو بازو",
    triceps: "پشت بازو", quads: "جلو ران", hamstrings: "پشت ران", glutes: "باسن",
    abs: "شکم", calves: "ساق پا", traps: "ذوزنقه", full_body: "کل بدن",
  }

  const totalMuscleCount = stats?.muscleDistribution.reduce((s, m) => s + m.count, 0) || 1

  const periodLabels: Record<string, string> = { week: "هفته", month: "ماه", year: "سال", all: "همه" }

  return (
    <motion.div
      className="min-h-screen gradient-mesh pb-28"
      dir="rtl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5">
        <div className="px-4 pt-12 pb-3">
          <h1 className="text-xl font-bold text-foreground">📊 آمار و تحلیل</h1>
        </div>
        {/* Period Tabs */}
        <div className="flex gap-1.5 px-4 pb-3">
          {(["week", "month", "year", "all"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all haptic-ready ${
                period === p
                  ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                  : "bg-white/5 text-foreground/35 active:bg-white/10"
              }`}
            >{periodLabels[p]}</button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* ── Streak Hero ── */}
        <motion.div variants={itemVariants}>
          <div className="glass-card overflow-hidden">
            <div className="p-5 bg-gradient-to-l from-primary/15 via-chart-purple/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warning to-warning flex items-center justify-center shadow-lg shadow-warning/20">
                    <Trophy className="w-7 h-7 text-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground/40 text-xs">استریک تمرین</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-foreground">{stats?.streak || 0}</span>
                      <span className="text-xs text-foreground/30">روز متوالی</span>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-foreground/25">بهترین</p>
                  <p className="text-lg font-bold text-warning">{bestStreak.toLocaleString("fa-IR")}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Circular Progress Row ── */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-5">
            <div className="flex items-center justify-around">
              <CircularProgress value={stats?.totalWorkouts || 0} max={20} color="#4F8EF7" label="تمرین" />
              <CircularProgress value={Math.round((stats?.totalVolume || 0) / 1000)} max={100} color="#30D158" label="حجم(T)" size={64} />
              <CircularProgress value={stats?.totalSets || 0} max={200} color="#FF9F0A" label="ست" />
              <CircularProgress value={stats?.estimatedCalories || 0} max={5000} color="#FF453A" label="کالری" size={48} />
            </div>
          </div>
        </motion.div>

        {/* ── Stats Bento Grid ── */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Dumbbell, label: "تعداد تمرین", value: stats?.totalWorkouts || 0, color: "text-primary", bg: "bg-primary/15" },
              { icon: TrendingUp, label: "حجم کل (kg)", value: (stats?.totalVolume || 0).toLocaleString("fa"), color: "text-success", bg: "bg-success/15" },
              { icon: Activity, label: "تعداد ست", value: (stats?.totalSets || 0).toLocaleString("fa"), color: "text-warning", bg: "bg-warning/15" },
              { icon: Flame, label: "کالری تخمینی", value: (stats?.estimatedCalories || 0).toLocaleString("fa"), color: "text-destructive", bg: "bg-destructive/15" },
              { icon: Clock, label: "مدت کل", value: formatDuration(stats?.totalDuration || 0), color: "text-chart-purple", bg: "bg-chart-purple/15" },
              { icon: Target, label: "میانگین مدت", value: formatDuration(stats?.avgDuration || 0), color: "text-info", bg: "bg-info/15" },
            ].map((stat) => (
              <div key={stat.label} className="bento-cell p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                  <span className="text-[10px] text-foreground/35 font-medium">{stat.label}</span>
                </div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Volume Trend ── */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground/70">روند حجم</h3>
              <span className="text-[10px] text-success font-semibold">{volumeTrend || "—"}</span>
            </div>
            <MiniBarChart
              data={volumeChart}
              color="bg-primary"
            />
            <div className="flex justify-between mt-2 text-[8px] text-foreground/20">
              {period === "week"
                ? ["ش", "ی", "د", "س", "چ", "پ", "ج"].map(d => <span key={d}>{d}</span>)
                : ["هفته ۱", "هفته ۲", "هفته ۳", "هفته ۴"].map(d => <span key={d}>{d}</span>)
              }
            </div>
          </div>
        </motion.div>

        {/* ── Activity Heatmap ── */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground/70">نقشه فعالیت</h3>
              <div className="flex items-center gap-1.5 text-[8px] text-foreground/25">
                <span>کم</span>
                <div className="flex gap-[2px]">
                  <div className="w-[8px] h-[8px] rounded-[2px] bg-hevy-elevated/40" />
                  <div className="w-[8px] h-[8px] rounded-[2px] bg-primary/25" />
                  <div className="w-[8px] h-[8px] rounded-[2px] bg-primary/50" />
                  <div className="w-[8px] h-[8px] rounded-[2px] bg-primary/75" />
                  <div className="w-[8px] h-[8px] rounded-[2px] bg-primary" />
                </div>
                <span>زیاد</span>
              </div>
            </div>
            <ActivityHeatmap days={heatmapDays} />
          </div>
        </motion.div>

        {/* ── Muscle Distribution ── */}
        {stats?.muscleDistribution && stats.muscleDistribution.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-foreground/70 mb-4">توزیع عضلانی</h3>
              <div className="space-y-3">
                {stats.muscleDistribution.slice(0, 8).map((m, idx) => {
                  const pct = Math.round((m.count / totalMuscleCount) * 100)
                  const colors = ["#4F8EF7", "#30D158", "#FF9F0A", "#BF5AF2", "#FF453A", "#64D2FF", "#FF6B35", "#30D158"]
                  return (
                    <div key={m.group}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-foreground/60 font-medium">{muscleGroupLabels[m.group] || m.group}</span>
                        <span className="text-foreground/25">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${colors[idx % colors.length]}88, ${colors[idx % colors.length]})` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Empty State ── */}
        {stats?.totalWorkouts === 0 && (
          <motion.div variants={itemVariants} className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-10 h-10 text-foreground/15" />
            </div>
            <p className="text-foreground/30 text-lg font-medium">هنوز داده‌ای نیست</p>
            <p className="text-foreground/15 text-sm mt-2">با ثبت اولین تمرین، آمار شما نمایش داده می‌شود</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}