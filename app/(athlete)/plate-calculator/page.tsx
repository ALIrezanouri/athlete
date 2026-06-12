"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Calculator, Minus, Plus } from "lucide-react"

const plateTypes = [25, 20, 15, 10, 5, 2.5, 1.25] as const

export default function PlateCalculatorPage() {
  const [barWeight, setBarWeight] = useState(20)
  const [targetWeight, setTargetWeight] = useState(60)

  const calculate = () => {
    const remaining = Math.max(0, (targetWeight - barWeight) / 2)
    const plates: { weight: number; count: number }[] = []
    let left = remaining
    for (const p of plateTypes) {
      const count = Math.floor(left / p)
      if (count > 0) {
        plates.push({ weight: p, count })
        left -= count * p
      }
    }
    const loaded = barWeight + plates.reduce((s, p) => s + p.weight * p.count * 2, 0)
    return { plates, loaded, remaining: left, perSide: remaining }
  }

  const result = calculate()

  const adjustWeight = (delta: number) => setTargetWeight(Math.max(barWeight, Math.round((targetWeight + delta) * 4) / 4))

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold">🏋️ ماشین‌حساب وزنه</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Target Weight */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="glass-card p-4"
        >
          <label className="text-sm text-foreground/50 mb-2 block">وزن هدف (kg)</label>
          <div className="flex items-center gap-3">
            <button onClick={() => adjustWeight(-2.5)} className="p-3 rounded-xl bg-white/10 active:scale-95 transition-transform"><Minus className="w-5 h-5" /></button>
            <input
              type="number"
              step="2.5"
              value={targetWeight}
              onChange={e => setTargetWeight(Math.max(barWeight, Number(e.target.value)))}
              className="hevy-input text-center text-2xl font-bold"
            />
            <button onClick={() => adjustWeight(2.5)} className="p-3 rounded-xl bg-white/10 active:scale-95 transition-transform"><Plus className="w-5 h-5" /></button>
          </div>
        </motion.div>

        {/* Bar Weight */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4"
        >
          <label className="text-sm text-foreground/50 mb-2 block">وزن هالتر (kg)</label>
          <div className="flex gap-2">
            {[15, 20, 25].map(w => (
              <button
                key={w}
                onClick={() => { setBarWeight(w); setTargetWeight(Math.max(w, targetWeight)) }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${barWeight === w ? "bg-primary text-foreground" : "bg-white/10 text-foreground/50"}`}
              >
                {w} kg
              </button>
            ))}
          </div>
        </motion.div>

        {/* Visual Barbell */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="text-center text-sm text-foreground/40 mb-3">نمای بصری هالتر</div>
          <div className="flex items-center justify-center gap-0 py-4">
            {/* Left plates */}
            <div className="flex flex-col-reverse items-center gap-0.5">
              {result.plates.flatMap((p, _) => Array(p.count).fill(null).map((_, i) => (
                <div key={`l-${p.weight}-${i}`} className="rounded-sm bg-primary" style={{ width: `${Math.max(12, p.weight * 1.2)}px`, height: '6px' }} />
              )))}
            </div>
            {/* Bar */}
            <div className="w-24 h-1.5 bg-white/30 rounded-full" />
            {/* Right plates */}
            <div className="flex flex-col-reverse items-center gap-0.5">
              {result.plates.flatMap((p, _) => Array(p.count).fill(null).map((_, i) => (
                <div key={`r-${p.weight}-${i}`} className="rounded-sm bg-primary" style={{ width: `${Math.max(12, p.weight * 1.2)}px`, height: '6px' }} />
              )))}
            </div>
          </div>
        </motion.div>

        {/* Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold">توزیع وزنه‌ها (هر سمت)</span>
          </div>
          {result.plates.length === 0 ? (
            <p className="text-sm text-foreground/40">فقط هالتر ({barWeight} kg)</p>
          ) : (
            <div className="space-y-2">
              {result.plates.map((p, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm">{p.count}× {p.weight} kg</span>
                  <span className="text-sm text-primary">{p.count * p.weight} kg</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-sm">
            <span className="text-foreground/40">وزن واقعی</span>
            <span className="font-bold text-success">{result.loaded} kg</span>
          </div>
          {result.remaining > 0 && (
            <p className="text-xs text-warning mt-1">⚠️ {result.remaining * 2} kg با وزنه‌های موجود قابل بارگذاری نیست</p>
          )}
        </motion.div>

        {/* Quick Presets */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <label className="text-sm text-foreground/50 mb-2 block">وزن‌های رایج</label>
          <div className="flex flex-wrap gap-2">
            {[40, 50, 60, 70, 80, 100, 120, 140].map(w => (
              <button
                key={w}
                onClick={() => setTargetWeight(w)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${targetWeight === w ? "bg-primary text-foreground" : "bg-white/10 text-foreground/60"}`}
              >
                {w}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
