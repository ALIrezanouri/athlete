"use client"

import { motion } from "motion/react"
import Link from "next/link"
import { Dumbbell, Calendar, BarChart3, MapPin } from "lucide-react"
import { ShinyButton } from "@/components/ui/shiny-button"

const features = [
  {
    icon: Dumbbell,
    title: "تمرین هوشمند",
    desc: "ثبت ست و تکرار با یک لمس",
  },
  {
    icon: Calendar,
    title: "رزرو باشگاه",
    desc: "زمان خود را آنلاین رزرو کنید",
  },
  {
    icon: BarChart3,
    title: "آنالیز پیشرفت",
    desc: "نمودار رشد و رکوردهای شما",
  },
  {
    icon: MapPin,
    title: "نقشه بدن",
    desc: "هدف‌گذی عضلانی دقیق",
  },
]

export function LandingHero() {
  return (
    <main
      dir="rtl"
      className="gradient-mesh relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* Ambient glow orbs — using brand tokens */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-primary/15 blur-[120px]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
          className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-chart-purple/10 blur-[120px]"
        />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 flex flex-col items-center gap-3"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 backdrop-blur-xl">
            <Dumbbell className="h-8 w-8 text-primary" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-bold text-foreground">رخداد</span>
        </motion.div>

        {/* Headline — max 2 lines */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-3xl font-bold leading-tight text-foreground"
        >
          تناسب اندام،
          <br />
          <span className="bg-gradient-to-l from-primary to-chart-purple bg-clip-text text-transparent">
            هوشمندتر از همیشه
          </span>
        </motion.h1>

        {/* Subtext — max 20 words */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 text-center text-base text-foreground/50"
        >
          تمرین، رزرو باشگاه، روتین هوشمند و آنالیز پیشرفت. همه در یک اپ.
        </motion.p>

        {/* CTA — single primary action */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 w-full"
        >
          <Link href="/login" className="block">
            <ShinyButton className="w-full animate-pulse-glow border-primary/30 py-4 text-base">
              شروع کنید
            </ShinyButton>
          </Link>
        </motion.div>

        {/* Feature grid — bento cells */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 grid w-full grid-cols-2 gap-3"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.7 + i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="bento-cell flex flex-col items-center gap-2 p-4 text-center"
            >
              <feature.icon
                className="h-6 w-6 text-primary"
                strokeWidth={2}
              />
              <span className="text-sm font-semibold text-foreground">
                {feature.title}
              </span>
              <span className="text-xs text-foreground/40">
                {feature.desc}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  )
}