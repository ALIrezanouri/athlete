"use client"

import { useEffect, useState, useTransition } from "react"
import { Trophy, Crown, Medal, RefreshCw } from "lucide-react"
import { getLeaderboard, getUserRank, type LeaderboardEntry, type UserRankInfo } from "@/app/actions/leaderboards"

const PERIODS = [
  { key: "all_time" as const, label: "کلی" },
  { key: "monthly" as const, label: "ماهانه" },
  { key: "weekly" as const, label: "هفتگی" },
]

export default function LeaderboardsPage() {
  const [isPending, startTransition] = useTransition()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [rank, setRank] = useState<UserRankInfo | null>(null)
  const [period, setPeriod] = useState<"all_time" | "monthly" | "weekly">("all_time")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [period])

  const load = () => startTransition(async () => {
    setLoading(true); setError(null)
    const [lbRes, rankRes] = await Promise.all([getLeaderboard({ period }), getUserRank()])
    if (lbRes.success && lbRes.entries) setEntries(lbRes.entries)
    else setError(lbRes.error || "خطا")
    if (rankRes.success && rankRes.rank) setRank(rankRes.rank)
    setLoading(false)
  })

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24" dir="rtl">
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold">جدول رده‌بندی</h1>
          </div>
          <button onClick={load} className="p-2 hover:bg-white/10 rounded-lg">
            <RefreshCw className={`w-5 h-5 text-slate-400 ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                period === p.key ? "bg-blue-600 text-white" : "bg-white/10 text-slate-400"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* User's Rank Card */}
      {rank && (
        <div className="m-4 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">رتبه شما</p>
            <p className="text-2xl font-bold">#{rank.rank.toLocaleString("fa-IR")}</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-400">امتیاز کل</p>
            <p className="text-lg font-bold text-blue-400">{rank.total_xp.toLocaleString("fa-IR")} XP</p>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm text-center m-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4">
          {/* Top 3 Podium */}
          {top3.length >= 3 && (
            <div className="flex items-end justify-center gap-2 mb-6">
              <PodiumCard entry={top3[1]} place={2} />
              <PodiumCard entry={top3[0]} place={1} />
              <PodiumCard entry={top3[2]} place={3} />
            </div>
          )}

          {/* Rest of leaderboard */}
          <div className="space-y-2">
            {(top3.length >= 3 ? rest : entries).map((entry) => (
              <LeaderboardRow key={entry.user_id} entry={entry} />
            ))}
          </div>

          {entries.length === 0 && !loading && (
            <p className="text-center text-slate-500 py-20">هنوز داده‌ای موجود نیست</p>
          )}
        </div>
      )}
    </div>
  )
}

function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const config = {
    1: { icon: Crown, color: "text-yellow-400", bg: "from-yellow-500/20", height: "h-32", border: "border-yellow-500/30" },
    2: { icon: Medal, color: "text-slate-300", bg: "from-slate-400/20", height: "h-24", border: "border-slate-400/30" },
    3: { icon: Medal, color: "text-orange-400", bg: "from-orange-500/20", height: "h-20", border: "border-orange-500/30" },
  }[place]

  const Icon = config.icon

  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-1">
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-lg font-bold">{entry.full_name?.charAt(0) || "؟"}</span>
        )}
      </div>
      <p className="text-xs font-medium mb-1 max-w-[80px] truncate">{entry.full_name}</p>
      <div className={`w-20 ${config.height} bg-gradient-to-b ${config.bg} to-transparent border-t-2 ${config.border} rounded-t-xl flex flex-col items-center pt-2`}>
        <Icon className={`w-5 h-5 ${config.color} mb-1`} />
        <span className="text-xs font-bold">{place.toLocaleString("fa-IR")}</span>
        <span className="text-[10px] text-slate-400">{entry.total_xp.toLocaleString("fa-IR")} XP</span>
      </div>
    </div>
  )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
      <span className="w-8 text-center text-sm font-bold text-slate-400">{entry.rank.toLocaleString("fa-IR")}</span>
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-sm font-bold">{entry.full_name?.charAt(0) || "؟"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.full_name}</p>
        <p className="text-xs text-slate-500">سطح {entry.current_level.toLocaleString("fa-IR")} • {entry.workout_count.toLocaleString("fa-IR")} تمرین</p>
      </div>
      <span className="text-sm font-bold text-blue-400">{entry.total_xp.toLocaleString("fa-IR")} XP</span>
    </div>
  )
}