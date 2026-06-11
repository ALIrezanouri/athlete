"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { getPersonalRecords } from "@/app/actions/analytics"
import { ShareableCard } from "@/components/ui/shareable-card"
import { getFunFact } from "@/lib/gamification/engine"
import {
  Trophy,
  TrendingUp,
  Dumbbell,
  ArrowUpRight,
  Medal,
  Star,
  ChevronDown,
  Calendar,
  Share2,
  X,
  ChevronLeft,
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

export default function PersonalRecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<PRRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sharingPR, setSharingPR] = useState<PRRecord | null>(null)

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
    <div className="min-h-screen gradient-mesh text-foreground pb-32" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-2xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-black flex items-center gap-3">
            <Trophy className="w-6 h-6 text-warning" />رکوردهای شخصی
          </h1>
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-foreground/40 haptic-ready">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 pt-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-warning font-black text-2xl">{totalPRs.toLocaleString('fa-IR')}</p>
            <p className="text-foreground/30 text-[10px] font-bold uppercase tracking-wider mt-1">رکورد</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-success font-black text-xl">{Math.round(totalVolume/1000).toLocaleString('fa-IR')}k</p>
            <p className="text-foreground/30 text-[10px] font-bold uppercase tracking-wider mt-1">حجم کل</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-primary font-black text-2xl">
              {(heaviestLift?.max_weight || 0).toLocaleString('fa-IR')}
            </p>
            <p className="text-foreground/30 text-[10px] font-bold uppercase tracking-wider mt-1">سنگین‌ترین</p>
          </div>
        </div>

        {/* Best Lift Highlight */}
        {heaviestLift && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-5 relative overflow-hidden border-warning/20 bg-warning/5"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-warning to-transparent opacity-50" />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-warning/20 flex items-center justify-center border border-warning/20 shadow-lg shadow-warning/10">
                <Medal className="w-8 h-8 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-warning/60 text-[10px] font-black uppercase tracking-widest mb-0.5">سنگین‌ترین وزنه</p>
                <p className="text-foreground font-black text-base truncate">{heaviestLift.exercise_name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-warning font-black text-3xl">{heaviestLift.max_weight.toLocaleString('fa-IR')}</span>
                  <span className="text-xs font-bold text-foreground/30 uppercase">kg</span>
                </div>
              </div>
              <button
                onClick={() => setSharingPR(heaviestLift)}
                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-foreground/40 hover:text-primary transition-colors haptic-ready border border-white/5"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Records List */}
      <div className="px-4 mt-6 space-y-3">
        <h2 className="text-xs font-black text-foreground/30 uppercase tracking-widest px-1">لیست رکوردها</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-20 rounded-3xl" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="glass-card p-12 text-center border-dashed">
            <Trophy className="w-12 h-12 mb-4 opacity-10 mx-auto" />
            <p className="text-sm font-bold text-foreground/30">هنوز رکوردی ثبت نشده</p>
          </div>
        ) : (
          filteredRecords.map((record, index) => (
            <motion.div
              key={record.exercise_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card overflow-hidden"
            >
              <div className="flex items-center">
                <button
                  onClick={() => setExpandedId(expandedId === record.exercise_id ? null : record.exercise_id)}
                  className="flex-1 p-4 flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{record.exercise_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-warning text-xs font-black">
                        {record.max_weight.toLocaleString('fa-IR')} kg × {record.max_reps.toLocaleString('fa-IR')}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-foreground/30 text-[10px] font-bold uppercase">
                        {record.recent_improvement ? `+${record.recent_improvement.toLocaleString('fa-IR')}%` : 'پایدار'}
                      </span>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: expandedId === record.exercise_id ? 180 : 0 }}>
                    <ChevronDown className="w-5 h-5 text-foreground/20" />
                  </motion.div>
                </button>
                <button
                  onClick={() => setSharingPR(record)}
                  className="p-4 text-foreground/10 hover:text-primary transition-colors haptic-ready"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              <AnimatePresence>
                {expandedId === record.exercise_id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-5 pt-2 border-t border-white/5 grid grid-cols-3 gap-2.5">
                      <div className="bg-white/[0.03] rounded-2xl p-3 text-center border border-white/5">
                        <p className="text-warning font-black text-base">{record.max_weight.toLocaleString('fa-IR')}</p>
                        <p className="text-foreground/25 text-[9px] font-bold uppercase tracking-tighter mt-0.5">وزن (kg)</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-2xl p-3 text-center border border-white/5">
                        <p className="text-primary font-black text-base">{record.max_reps.toLocaleString('fa-IR')}</p>
                        <p className="text-foreground/25 text-[9px] font-bold uppercase tracking-tighter mt-0.5">تکرار</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-2xl p-3 text-center border border-white/5">
                        <p className="text-success font-black text-sm leading-tight">{record.max_volume.toLocaleString('fa-IR')}</p>
                        <p className="text-foreground/25 text-[9px] font-bold uppercase tracking-tighter mt-0.5">حجم کل</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Sharing Overlay */}
      <AnimatePresence>
        {sharingPR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            <button
              onClick={() => setSharingPR(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center haptic-ready"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-sm mb-8">
              <ShareableCard
                type="pr"
                title={sharingPR.exercise_name}
                funFact={getFunFact(sharingPR.max_volume)}
                stats={[
                  { label: 'رکورد جدید', value: `${sharingPR.max_weight.toLocaleString('fa-IR')} kg` },
                  { label: 'تکرار', value: sharingPR.max_reps.toLocaleString('fa-IR') },
                  { label: 'حجم کل', value: `${sharingPR.max_volume.toLocaleString('fa-IR')} kg` }
                ]}
              />
            </div>

            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest text-center max-w-xs">
              رکورد شما آماده اشتراک‌گذاری در استوری است
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
