"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Wallet,
  Gift,
  ShieldCheck,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trophy,
  Star,
  Sparkles
} from "lucide-react"
import { getWorkoutStats } from "@/app/actions/analytics"
import { getAthleteLevel } from "@/lib/gamification/engine"
import { getAthleteCoins, getCoinTransactions } from "@/app/actions/gamification"

interface Transaction {
  id: string
  title: string
  amount: number
  type: 'gain' | 'spend'
  date: string
  icon: 'workout' | 'referral' | 'insurance'
}

export default function WalletPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [totalVolume, setTotalVolume] = useState(0)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    async function loadData() {
      const [statsRes, coinsRes, txRes] = await Promise.all([
        getWorkoutStats({ period: "all" }),
        getAthleteCoins(),
        getCoinTransactions(10)
      ])

      if (statsRes.success && statsRes.stats) {
        setTotalVolume(statsRes.stats.totalVolume)
      }
      if (coinsRes.success) {
        setBalance(coinsRes.balance ?? 0)
      }
      if (txRes.success && txRes.transactions) {
        setTransactions(txRes.transactions.map((tx: any) => ({
          id: tx.id,
          title: tx.description || (tx.transaction_type === 'workout_reward' ? 'پاداش تمرین' : 'تراکنش'),
          amount: Math.abs(tx.amount),
          type: tx.amount >= 0 ? 'gain' : 'spend',
          date: new Date(tx.created_at).toLocaleDateString('fa-IR'),
          icon: tx.transaction_type === 'workout_reward' ? 'workout' :
                tx.transaction_type === 'referral_bonus' ? 'referral' : 'insurance'
        })))
      } else {
        // Fallback to mocks if no transactions yet
        setTransactions([
          { id: '1', title: 'تمرین سینه و سرشانه', amount: 50, type: 'gain', date: 'امروز', icon: 'workout' },
          { id: '2', title: 'دعوت از علی محمدی', amount: 200, type: 'gain', date: 'دیروز', icon: 'referral' },
          { id: '3', title: 'تخفیف بیمه سامان', amount: 300, type: 'spend', date: '۳ روز پیش', icon: 'insurance' },
        ])
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const athleteLevel = getAthleteLevel(totalVolume)

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-foreground/60"
        >
          <ArrowLeft className="w-5 h-5 rotate-180" />
        </button>
        <h1 className="text-xl font-bold">کیف پول</h1>
        <div className="w-10" />
      </div>

      <div className="px-4 space-y-6">
        {/* Athlete Coin Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-warning to-orange-600 p-8 text-black shadow-2xl shadow-warning/20"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-xs font-bold uppercase tracking-wider">موجودی کوین</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">{balance.toLocaleString('fa-IR')}</span>
              <span className="text-sm font-bold opacity-60">Athlete Coins</span>
            </div>

            <div className="mt-8 flex gap-3">
              <button className="flex-1 bg-black text-white py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> شارژ سریع
              </button>
              <button className="flex-1 bg-white/20 backdrop-blur-md text-black py-3 rounded-2xl text-xs font-bold">
                انتقال
              </button>
            </div>
          </div>
          {/* Decorative background element */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </motion.div>

        {/* Level Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-foreground/40">سطح پهلوانی شما</p>
                <p className="text-lg font-bold text-foreground">{athleteLevel.title}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-foreground/40">مجموع حجم</p>
              <p className="text-sm font-bold text-success">{totalVolume.toLocaleString('fa-IR')} kg</p>
            </div>
          </div>

          <div className="space-y-2">
             <div className="flex justify-between text-[10px] font-bold text-foreground/40">
               <span>{athleteLevel.title}</span>
               <span>{athleteLevel.nextLevel}</span>
             </div>
             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
               <motion.div
                 className="h-full bg-primary"
                 initial={{ width: 0 }}
                 animate={{ width: `${Math.min((totalVolume / (totalVolume + (athleteLevel.remainingToNext || 0))) * 100, 100)}%` }}
               />
             </div>
             <p className="text-[10px] text-center text-primary font-medium">
               {athleteLevel.remainingToNext && athleteLevel.remainingToNext > 0
                 ? `${athleteLevel.remainingToNext.toLocaleString('fa-IR')} kg دیگر تا رسیدن به سطح ${athleteLevel.nextLevel}`
                 : 'شما به بالاترین سطح رسیده‌اید!'}
             </p>
          </div>
        </motion.div>

        {/* Reward Tabs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Gift className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">جوایز رخداد</span>
          </div>
          <div className="glass-card p-4 flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">تخفیف بیمه</span>
          </div>
        </div>

        {/* Saman Insurance Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-blue-950/40 border border-blue-500/20 p-5">
           <div className="flex items-center justify-between relative z-10">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                 <ShieldCheck className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-sm font-bold text-white">بیمه سامان</p>
                 <p className="text-[10px] text-blue-300">تا ۲۰٪ تخفیف بیمه عمر و حوادث</p>
               </div>
             </div>
             <ChevronLeft className="w-5 h-5 text-blue-400" />
           </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">تراکنش‌های اخیر</h2>
            <button className="text-primary text-xs font-medium">مشاهده همه</button>
          </div>

          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === 'gain' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>
                    {tx.type === 'gain' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.title}</p>
                    <p className="text-[10px] text-foreground/30">{tx.date}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-sm font-bold ${tx.type === 'gain' ? 'text-success' : 'text-warning'}`}>
                    {tx.type === 'gain' ? '+' : '-'}{tx.amount}
                  </p>
                  <p className="text-[8px] text-foreground/20 font-bold uppercase tracking-tighter">COINS</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
