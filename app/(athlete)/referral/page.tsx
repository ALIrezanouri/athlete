"use client"

import React, { useState } from "react"
import { motion } from "motion/react"
import {
  Users,
  Share2,
  Copy,
  Check,
  Award,
  Gift,
  ArrowLeft,
  MessageCircle,
  QrCode
} from "lucide-react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const referralCode = "FIT-JULES-2024"
  const referralLink = `https://rokhdad.fit/join?ref=${referralCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareViaWhatsApp = () => {
    const text = `سلام! بیا با هم در رخداد فیت تمرین کنیم و با هم امتیاز بگیریم. کد معرف من: ${referralCode} \n ${referralLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  return (
    <div className="flex min-h-screen flex-col bg-black p-4 pb-24 text-white rtl" dir="rtl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/home" className="rounded-full bg-white/5 p-2 text-white/60">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold">دعوت از دوستان</h1>
        <div className="w-10" />
      </div>

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-8 text-center border border-primary/20"
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
          <Gift className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-black">جایزه برای تو و دوستت!</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          با دعوت از هر دوست، ۱۰۰۰ امتیاز ورزشی به تو و ۵۰۰ امتیاز به دوستت هدیه داده می‌شود.
        </p>
      </motion.div>

      {/* Referral Code Box */}
      <div className="mb-8 space-y-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
          <span className="mb-2 block text-center text-xs font-medium uppercase tracking-wider text-white/40">
            کد معرف شما
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black tracking-widest text-primary">{referralCode}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-primary"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              <span className="text-sm font-bold">{copied ? "کپی شد" : "کپی کد"}</span>
            </button>
          </div>
        </div>

        <button
          onClick={shareViaWhatsApp}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] py-4 font-bold text-white shadow-lg shadow-green-500/10"
        >
          <MessageCircle className="h-6 w-6" />
          ارسال در واتس‌اپ
        </button>

        <button
          onClick={() => setShowQR(!showQR)}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 py-4 font-bold text-white"
        >
          <QrCode className="h-6 w-6 text-white/60" />
          {showQR ? "پنهان کردن کد QR" : "نمایش کد QR برای اسکن"}
        </button>

        {showQR && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white p-8"
          >
            <QRCodeSVG value={referralLink} size={200} />
            <p className="text-black text-xs font-bold">از دوستت بخواه این کد را اسکن کند</p>
          </motion.div>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">وضعیت دعوت‌ها</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
            <Users className="mb-2 h-5 w-5 text-blue-400" />
            <div className="text-2xl font-black">۰</div>
            <div className="text-xs text-white/40">دوستان دعوت شده</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
            <Award className="mb-2 h-5 w-5 text-yellow-400" />
            <div className="text-2xl font-black">۰</div>
            <div className="text-xs text-white/40">امتیاز کسب شده</div>
          </div>
        </div>
      </div>
    </div>
  )
}
