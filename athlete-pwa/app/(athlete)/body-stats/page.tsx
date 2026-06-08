"use client"

import { useState, useEffect, useTransition } from "react"
import { Ruler, Save, TrendingUp } from "lucide-react"
import { getBodyMeasurements, saveBodyMeasurement } from "@/app/actions/analytics"

const fields = [
  { key: "weightKg", label: "وزن (kg)", icon: "⚖️" },
  { key: "bodyFatPercentage", label: "چربی بدن (%)", icon: "📊" },
  { key: "chestCm", label: "سینه (cm)", icon: "📏" },
  { key: "waistCm", label: "کمر (cm)", icon: "📏" },
  { key: "hipCm", label: "باسن (cm)", icon: "📏" },
  { key: "rightBicepCm", label: "بازو راست (cm)", icon: "💪" },
  { key: "leftBicepCm", label: "بازو چپ (cm)", icon: "💪" },
  { key: "rightThighCm", label: "ران راست (cm)", icon: "🦵" },
  { key: "leftThighCm", label: "ران چپ (cm)", icon: "🦵" },
  { key: "shouldersCm", label: "سرشانه (cm)", icon: "🏋️" },
  { key: "neckCm", label: "گردن (cm)", icon: "📏" },
] as const

export default function BodyStatsPage() {
  const [isPending, startTransition] = useTransition()
  const [history, setHistory] = useState<Array<any>>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    startTransition(async () => {
      const res = await getBodyMeasurements({ limit: 10 })
      if (res.success && res.measurements) setHistory(res.measurements)
    })
  }, [])

  const handleSave = () => {
    const params: any = {}
    for (const f of fields) {
      const val = form[f.key]
      if (val && !isNaN(Number(val))) params[f.key] = Number(val)
    }
    startTransition(async () => {
      const res = await saveBodyMeasurement(params)
      if (res.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        const updated = await getBodyMeasurements({ limit: 10 })
        if (updated.success && updated.measurements) setHistory(updated.measurements)
        setForm({})
      }
    })
  }

  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">📏 بدن‌سنجی</h1>
          {saved && <span className="text-success text-sm">✓ ذخیره شد</span>}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Input Form */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            ثبت اندازه‌ها
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key}>
                <label className="text-xs text-foreground/50 mb-1 block">{f.icon} {f.label}</label>
                <input
                  type="number"
                  step="0.1"
                  value={form[f.key] || ""}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder="—"
                  className="w-full hevy-input"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full mt-4 hevy-btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isPending ? "در حال ذخیره..." : "ذخیره"}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              تاریخچه
            </h3>
            <div className="space-y-2">
              {history.slice(0, 5).map((m: any, i: number) => (
                <div key={m.id || i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-foreground/40">{m.measured_at}</span>
                  <div className="flex gap-4 text-sm">
                    {m.weight_kg && <span>⚖️ {m.weight_kg} kg</span>}
                    {m.chest_cm && <span>📏 {m.chest_cm}</span>}
                    {m.waist_cm && <span>📏 {m.waist_cm}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}