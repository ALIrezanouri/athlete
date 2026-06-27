"use client"

import { useEffect, useState, useTransition } from "react"
import { Target, Clock, Gift, CheckCircle2, Zap, Coins, RefreshCw } from "lucide-react"
import { getActiveChallenges, claimChallengeReward, getChallengeStats, type UserChallenge } from "@/app/actions/challenges"
import { useRouter } from "next/navigation"

const TYPE_LABELS: Record<string, string> = {
  daily: "روزانه",
  weekly: "هفتگی",
  monthly: "ماهانه",
  special: "ویژه",
}

const GOAL_LABELS: Record<string, string> = {
  workout_count: "جلسه تمرین",
  streak_days: "روز پیاپی",
  total_volume: "کیلوگرم",
  booking_count: "رزرو",
  pr_count: "رکورد شخصی",
  share_count: "اشتراک‌گذاری",
  social_likes: "لایک",
  total_sets: "ست",
  total_calories: "کالری",
}

export default function ChallengesPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [challenges, setChallenges] = useState<UserChallenge[]>([])
  const [stats, setStats] = useState<{ active_count: number; completed_count: number; total_xp_earned: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [toast, setToast] = useState<{ xp: number; coins: number } | null>(null)

  useEffect(() => {
    loadChallenges()
  }, [])

  const loadChallenges = () => {
    startTransition(async () => {
      setLoading(true)
      setError(null)
      const [chRes, statsRes] = await Promise.all([getActiveChallenges(), getChallengeStats()])
      if (chRes.success && chRes.challenges) setChallenges(chRes.challenges)
      else setError(chRes.error || "خطا در بارگذاری چالش‌ها")
      if (statsRes.success && statsRes.stats) setStats(statsRes.stats)
      setLoading(false)
    })
  }

  const handleClaim = async (userChallengeId: string) => {
    setClaiming(userChallengeId)
    startTransition(async () => {
      const res = await claimChallengeReward(userChallengeId)
      if (res.success) {
        setToast({ xp: res.xpAwarded || 0, coins: res.coinsAwarded || 0 })
        setTimeout(() => setToast(null), 3000)
        loadChallenges()
      } else {
        setError(res.error || "خطا در دریافت پاداش")
      }
      setClaiming(null)
    })
  }

  const active = challenges.filter((c) => !c.is_completed)
  const completed = challenges.filter((c) => c.is_completed)

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold">چالش‌ها</h1>
          </div>
          <button onClick={loadChallenges} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <RefreshCw className={`w-5 h-5 text-slate-400 ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
        {stats && (
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">{stats.active_count} فعال</span>
            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full">{stats.completed_count} کامل شده</span>
            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full">{stats.total_xp_earned.toLocaleString("fa-IR")} XP کسب شده</span>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-300">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
            <span className="text-lg font-bold">🎉 پاداش دریافت شد!</span>
            <span className="text-sm">+{toast.xp.toLocaleString("fa-IR")} XP</span>
            {toast.coins > 0 && <span className="text-sm">+{toast.coins.toLocaleString("fa-IR")} سکه</span>}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-6">
          {/* Active Challenges */}
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3">چالش‌های فعال</h2>
              <div className="space-y-3">
                {active.map((ch) => (
                  <ChallengeCard key={ch.id} challenge={ch} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Challenges */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3">چالش‌های کامل شده</h2>
              <div className="space-y-3">
                {completed.map((ch) => (
                  <ChallengeCard
                    key={ch.id}
                    challenge={ch}
                    onClaim={handleClaim}
                    claiming={claiming === ch.user_challenge_id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {challenges.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400 mb-1">چالش فعالی وجود ندارد</p>
              <p className="text-xs text-slate-600">به زودی چالش‌های جدیدی اضافه خواهد شد</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Challenge Card Component ─────────────────────────────────────────────────
function ChallengeCard({
  challenge: ch,
  onClaim,
  claiming,
}: {
  challenge: UserChallenge
  onClaim?: (id: string) => void
  claiming?: boolean
}) {
  const progressPercent = Math.min(100, Math.round((ch.progress_value / ch.goal_value) * 100))
  const daysLeft = Math.ceil((new Date(ch.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const canClaim = ch.is_completed && !ch.reward_claimed

  const typeColors: Record<string, string> = {
    daily: "from-orange-500 to-red-500",
    weekly: "from-blue-500 to-indigo-600",
    monthly: "from-purple-500 to-pink-600",
    special: "from-yellow-500 to-amber-600",
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      {/* Banner gradient top */}
      <div className={`h-1 bg-gradient-to-r ${typeColors[ch.challenge_type] || typeColors.weekly}`} />

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
            {ch.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold truncate">{ch.title}</h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-slate-300">
                {TYPE_LABELS[ch.challenge_type]}
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">{ch.description}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400">پیشرفت</span>
            <span className="font-medium">
              {ch.progress_value.toLocaleString("fa-IR")} / {ch.goal_value.toLocaleString("fa-IR")} {GOAL_LABELS[ch.goal_type] || ""}
            </span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                ch.is_completed
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : "bg-gradient-to-r from-blue-500 to-indigo-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Footer: Rewards + Time + Claim */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-blue-400">
              <Zap className="w-3.5 h-3.5" />
              +{ch.xp_reward.toLocaleString("fa-IR")}
            </span>
            {ch.coin_reward > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Coins className="w-3.5 h-3.5" />
                +{ch.coin_reward.toLocaleString("fa-IR")}
              </span>
            )}
            {!ch.is_completed && (
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {daysLeft > 0 ? `${daysLeft.toLocaleString("fa-IR")} روز` : "کمتر از یک روز"}
              </span>
            )}
          </div>

          {canClaim ? (
            <button
              onClick={() => onClaim?.(ch.user_challenge_id)}
              disabled={claiming}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 disabled:opacity-50 rounded-lg text-xs font-bold transition-opacity"
            >
              <Gift className="w-4 h-4" />
              {claiming ? "در حال دریافت..." : "دریافت پاداش"}
            </button>
          ) : ch.reward_claimed ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              دریافت شد
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}