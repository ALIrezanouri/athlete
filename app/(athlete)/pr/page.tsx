"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { getPersonalRecords } from "@/app/actions/analytics"
import {
  Trophy,
  TrendingUp,
  Dumbbell,
  ArrowUpRight,
  Medal,
  Star,
  ChevronDown,
  Calendar,
} from "lucide-react"

interface PRRecord {
  exercise_id: string
  exercise_name: string
  max_weight: number
  max_reps: number
  max_volume: number
  best_set_date: string
  recent_improvement?: number
}

const muscleGroupColors: Record<string, string> = {
  chest: "#FF453A",
  back: "#30D158",
  shoulders: "#FF9F0A",
  biceps: "#4F8EF7",
  triceps: "#BF5AF2",
  quads: "#FF375F",
  hamstrings: "#64D2FF",
  glutes: "#FFD60A",
  abs: "#30D158",
}

export default function PersonalRecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<PRRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadPRs()
  }, [])

  const loadPRs = async () => {
    setLoading(true)
    const result = await getPersonalRecords()
    if (result.success && result.records) {
      setRecords(result.records)
    }
    setLoading(false)
  }

  const filteredRecords = selectedMuscle
    ? records.filter((r) => r.exercise_name.includes(selectedMuscle))
    : records

  const totalPRs = records.length
  const totalVolume = records.reduce((sum, r) => sum + r.max_volume, 0)
  const heaviestLift = records.length > 0
    ? records.reduce((max, r) => r.max_weight > max.max_weight ? r : max, records[0])
    : null

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />رکوردهای شخصی
          </h1>
          <button onClick={() => router.back()} className="text-primary text-sm font-medium">
            بازگشت
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="glass-card p-3 text-center">
            <p className="text-warning font-bold text-lg">{totalPRs}</p>
            <p className="text-foreground/30 text-[10px]">رکورد</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-success font-bold text-lg">{totalVolume.toLocaleString()}</p>
            <p className="text-foreground/30 text-[10px]">حجم کل (kg)</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-primary font-bold text-lg">
              {heaviestLift?.max_weight || 0}
            </p>
            <p className="text-foreground/30 text-[10px]">سنگین‌ترین (kg)</p>
          </div>
        </div>

        {/* Best Lift Highlight */}
        {heaviestLift && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 mb-4 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-warning to-destructive" />
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center">
                <Medal className="w-7 h-7 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-foreground/40 text-[10px] mb-0.5">سنگین‌ترین وزنه</p>
                <p className="text-foreground font-bold text-sm">{heaviestLift.exercise_name}</p>
                <p className="text-warning font-bold text-xl mt-0.5">
                  {heaviestLift.max_weight} <span className="text-xs text-foreground/30">kg</span>
                </p>
              </div>
              <Star className="w-8 h-8 text-warning/20" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Records List */}
      <div className="px-4 space-y-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/30">
            <Trophy className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm mb-1">هنوز رکوردی ثبت نشده</p>
            <p className="text-xs text-foreground/20">با ثبت تمرین رکوردهای شما ذخیره می‌شود</p>
          </div>
        ) : (
          filteredRecords.map((record, index) => (
            <motion.div
              key={record.exercise_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === record.exercise_id ? null : record.exercise_id)}
                className="w-full p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-foreground font-semibold text-sm">{record.exercise_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-warning text-xs font-bold">
                      {record.max_weight} kg × {record.max_reps}
                    </span>
                    <span className="text-foreground/20 text-[10px]">
                      حجم: {record.max_volume.toLocaleString()} kg
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  {record.recent_improvement && record.recent_improvement > 0 ? (
                    <div className="flex items-center gap-0.5 text-success">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">+{record.recent_improvement}%</span>
                    </div>
                  ) : (
                    <TrendingUp className="w-4 h-4 text-foreground/15" />
                  )}
                </div>
                <motion.div animate={{ rotate: expandedId === record.exercise_id ? 180 : 0 }}>
                  <ChevronDown className="w-4 h-4 text-foreground/20" />
                </motion.div>
              </button>

              <AnimatePresence>
                {expandedId === record.exercise_id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-white/5">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                          <p className="text-warning font-bold text-sm">{record.max_weight}</p>
                          <p className="text-foreground/25 text-[10px]">بیشترین وزن</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                          <p className="text-primary font-bold text-sm">{record.max_reps}</p>
                          <p className="text-foreground/25 text-[10px]">بیشترین تکرار</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                          <p className="text-success font-bold text-sm">{record.max_volume.toLocaleString()}</p>
                          <p className="text-foreground/25 text-[10px]">بیشترین حجم</p>
                        </div>
                      </div>
                      {record.best_set_date && (
                        <p className="text-foreground/20 text-[10px] mt-2 text-center">
                          <Calendar className="w-3 h-3 inline ml-1" />
                          {new Date(record.best_set_date).toLocaleDateString("fa-IR")}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}