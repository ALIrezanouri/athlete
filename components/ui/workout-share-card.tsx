"use client"

import { Trophy, Clock, Zap, Dumbbell, Calendar } from "lucide-react"
import { motion } from "motion/react"

interface WorkoutShareCardProps {
  workoutName: string
  duration: string
  totalVolume: number
  totalSets: number
  prCount: number
  date: string
}

export function WorkoutShareCard({
  workoutName,
  duration,
  totalVolume,
  totalSets,
  prCount,
  date,
}: WorkoutShareCardProps) {
  return (
    <div className="w-[360px] aspect-[4/5] bg-[#0A0A0F] p-8 flex flex-col relative overflow-hidden" dir="rtl">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-chart-purple/10 rounded-full blur-[80px]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white/90">ROKHDAD FIT</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <Calendar className="w-3 h-3 text-white/40" />
            <span className="text-[10px] text-white/60 font-bold">{date}</span>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-2 leading-tight">
          {workoutName}
        </h1>
        <p className="text-sm text-white/40 font-bold mb-10">خلاصه تمرین امروز</p>

        <div className="grid grid-cols-2 gap-4 flex-1">
          <div className="glass-vibrant p-5 rounded-3xl flex flex-col justify-center gap-1 border-white/10">
            <Clock className="w-5 h-5 text-primary mb-1" />
            <span className="text-2xl font-black text-white">{duration}</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">زمان تمرین</span>
          </div>
          <div className="glass-vibrant p-5 rounded-3xl flex flex-col justify-center gap-1 border-white/10">
            <Zap className="w-5 h-5 text-success mb-1" />
            <span className="text-2xl font-black text-white">{totalVolume.toLocaleString()}</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">حجم (kg)</span>
          </div>
          <div className="glass-vibrant p-5 rounded-3xl flex flex-col justify-center gap-1 border-white/10">
            <Dumbbell className="w-5 h-5 text-warning mb-1" />
            <span className="text-2xl font-black text-white">{totalSets}</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">مجموع ست‌ها</span>
          </div>
          <div className="glass-vibrant p-5 rounded-3xl flex flex-col justify-center gap-1 border-white/10">
            <Trophy className="w-5 h-5 text-chart-purple mb-1" />
            <span className="text-2xl font-black text-white">{prCount}</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">رکورد جدید</span>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/30 font-bold">دانلود از</span>
            <span className="text-sm font-black text-white/60">ROKHDAD.APP</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" fill="currentColor" />
          </div>
        </div>
      </div>
    </div>
  )
}
