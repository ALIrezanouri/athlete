"use client"

import React, { useRef } from "react"
import { motion } from "motion/react"
import { Share2, Download, Trophy, Zap, Flame, Sparkles } from "lucide-react"
import { toPng } from "html-to-image"

interface ShareableCardProps {
  type: "pr" | "streak" | "workout"
  title: string
  subtitle?: string
  value?: string
  unit?: string
  date?: string
  stats?: Array<{ label: string; value: string }>
  userName?: string
  funFact?: string
}

export function ShareableCard({
  type,
  title,
  subtitle,
  value,
  unit,
  date = new Date().toLocaleDateString("fa-IR"),
  stats,
  userName,
  funFact,
}: ShareableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleShare = async () => {
    if (!cardRef.current) return

    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true })

      if (typeof navigator !== 'undefined' && navigator.share) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], "achievement.png", { type: "image/png" })
        await navigator.share({
          files: [file],
          title: "دستاورد من در رخداد فیت",
          text: `ببین چه رکوردی زدم! ${title}${funFact ? ' - ' + funFact : ''}`,
        })
      } else {
        const link = document.createElement("a")
        link.download = "rokhdad-achievement.png"
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error("Error sharing card:", err)
    }
  }

  const getIcon = () => {
    switch (type) {
      case "pr": return <Trophy className="h-8 w-8 text-yellow-400" />
      case "streak": return <Flame className="h-8 w-8 text-orange-500" />
      default: return <Zap className="h-8 w-8 text-blue-400" />
    }
  }

  const getGradient = () => {
    switch (type) {
      case "pr": return "from-yellow-500/20 via-black to-black"
      case "streak": return "from-orange-500/20 via-black to-black"
      default: return "from-blue-500/20 via-black to-black"
    }
  }

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      <div
        ref={cardRef}
        className={`relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b ${getGradient()} p-8`}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative flex h-full flex-col items-center justify-between text-center">
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="rounded-full bg-white/5 p-4 backdrop-blur-xl">
              {getIcon()}
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">{title}</h2>
            {subtitle && <p className="text-base text-white/60">{subtitle}</p>}
            {userName && <p className="text-primary font-bold text-xs">توسط {userName}</p>}
          </div>

          {funFact && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3"
            >
              <Sparkles className="w-5 h-5 text-warning shrink-0" />
              <p className="text-xs font-medium text-white/90 leading-relaxed">{funFact}</p>
            </motion.div>
          )}

          {value ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl font-black text-white">{value}</span>
              {unit && <span className="text-lg font-medium text-white/40">{unit}</span>}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-4 w-full">
              {stats.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-base font-black text-white">{s.value}</span>
                  <span className="text-[9px] font-medium text-white/40">{s.label}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mb-4 flex w-full items-center justify-between border-t border-white/10 pt-6 text-xs text-white/40">
            <span>{date}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">ROKHDAD FIT</span>
              <div className="h-4 w-px bg-white/10" />
              <span>رخداد فیت</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-white shadow-lg shadow-primary/20 active:scale-95 transition-transform"
        >
          <Share2 className="h-5 w-5" />
          اشتراک‌گذاری
        </button>
        <button
          onClick={handleShare}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white active:scale-95 transition-transform"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
