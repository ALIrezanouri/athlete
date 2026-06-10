"use client"

import React from "react"
import { motion } from "motion/react"
import {
  Wallet,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  Gift,
  ArrowUpRight
} from "lucide-react"
import Link from "next/link"

const TRANSACTIONS = [
  { id: 1, title: "جایزه تداوم (۳ روز)", amount: 50, type: "earn", date: "امروز" },
  { id: 2, title: "تکمیل مشخصات بدنی", amount: 500, type: "earn", date: "دیروز" },
  { id: 3, title: "خرید اشتراک باشگاه", amount: 200, type: "spend", date: "۲ روز پیش" },
]

export default function WalletPage() {
  const coins = 1250
  const cash = 0

  return (
    <div className="flex min-h-screen flex-col bg-black text-white rtl" dir="rtl">
      {/* Header */}
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/home" className="rounded-full bg-white/5 p-2 text-white/60">
            <ArrowRight className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-bold">کیف پول</h1>
          <div className="w-10" />
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-primary/80 to-blue-600 p-8 shadow-2xl shadow-primary/20"
        >
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur-md">
                <Zap className="h-4 w-4 text-yellow-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Athlete Coins</span>
              </div>
              <Wallet className="h-6 w-6 text-white/60" />
            </div>

            <div>
              <div className="text-5xl font-black tracking-tighter text-white">{coins.toLocaleString()}</div>
              <div className="mt-1 text-sm font-medium text-white/60">امتیاز ورزشی شما</div>
            </div>

            <div className="h-px bg-white/10" />

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-white">{cash.toLocaleString()} تومان</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">موجودی نقدی</div>
              </div>
              <button className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-primary">
                شارژ حساب
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-2 gap-4 px-6">
        <button className="flex flex-col items-center gap-3 rounded-3xl bg-white/5 p-6 border border-white/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/10">
            <ShieldCheck className="h-6 w-6 text-yellow-400" />
          </div>
          <span className="text-sm font-bold">تخفیف بیمه</span>
        </button>
        <button className="flex flex-col items-center gap-3 rounded-3xl bg-white/5 p-6 border border-white/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <span className="text-sm font-bold">جوایز رخداد</span>
        </button>
      </div>

      {/* Saman Insurance Banner */}
      <div className="px-6 mb-8">
        <div className="rounded-3xl bg-gradient-to-r from-blue-900/40 to-blue-900/10 p-6 border border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <h4 className="font-bold text-blue-100">بیمه سامان</h4>
              <p className="text-xs text-blue-300/60">تا ۲۰٪ تخفیف بیمه عمر و حوادث</p>
            </div>
          </div>
          <ArrowLeft className="h-5 w-5 text-blue-400" />
        </div>
      </div>

      {/* Transactions */}
      <div className="flex-1 rounded-t-[3rem] bg-white/[0.03] p-8 border-t border-white/5">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold">تراکنش‌های اخیر</h3>
          <button className="text-xs text-primary font-bold">مشاهده همه</button>
        </div>

        <div className="space-y-6">
          {TRANSACTIONS.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tx.type === 'earn' ? 'bg-success/10' : 'bg-red-500/10'}`}>
                  {tx.type === 'earn' ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
                </div>
                <div>
                  <div className="font-bold text-sm">{tx.title}</div>
                  <div className="text-xs text-white/20">{tx.date}</div>
                </div>
              </div>
              <div className={`font-black ${tx.type === 'earn' ? 'text-success' : 'text-white'}`}>
                {tx.type === 'earn' ? '+' : '-'}{tx.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
