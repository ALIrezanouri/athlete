'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ============================================================
// Plate Calculator
// ============================================================
function PlateCalculator() {
  const [targetWeight, setTargetWeight] = useState(0);
  const [barWeight, setBarWeight] = useState(20);

  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];

  function calculatePlates(target: number, bar: number) {
    if (target <= bar) return [];
    let remaining = (target - bar) / 2; // per side
    const result: { plate: number; count: number }[] = [];

    for (const p of plates) {
      const count = Math.floor(remaining / p);
      if (count > 0) {
        result.push({ plate: p, count });
        remaining -= count * p;
      }
      remaining = Math.round(remaining * 100) / 100;
    }
    return result;
  }

  const result = calculatePlates(targetWeight, barWeight);
  const perSide = (targetWeight - barWeight) / 2;

  return (
    <motion.div variants={itemVariants} className="glass-card p-4">
      <h3 className="text-base font-bold mb-3">🔧 محاسبه‌گر دیسک</h3>
      <p className="text-xs text-foreground/50 mb-4">تعداد دیسک‌های مورد نیاز روی هالتر را محاسبه کنید</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-foreground/50 mb-1 block">وزن هدف (kg)</label>
          <input
            type="number"
            value={targetWeight || ''}
            onChange={e => setTargetWeight(Number(e.target.value))}
            className="hevy-input w-full"
            placeholder="مثلاً 100"
          />
        </div>
        <div>
          <MobileDrawerSelect
            value={String(barWeight)}
            onChange={(v) => setBarWeight(Number(v))}
            options={[
              { value: '20', label: 'اولمپیک - 20 kg' },
              { value: '15', label: 'EZ - 15 kg' },
              { value: '10', label: 'استاندارد - 10 kg' },
            ]}
            drawerTitle="وزن هالتر"
            className="!py-2.5 !text-xs"
          />
        </div>
      </div>

      {targetWeight > barWeight && (
        <div className="bg-primary/10 rounded-xl p-3 border border-primary/20">
          <div className="flex justify-between text-xs text-foreground/70 mb-2">
            <span>وزن هدف:</span>
            <span className="font-bold text-primary">{targetWeight} kg</span>
          </div>
          <div className="flex justify-between text-xs text-foreground/70 mb-3">
            <span>هر طرف:</span>
            <span className="font-bold text-foreground">{perSide} kg</span>
          </div>

          {/* Visual plate representation */}
          <div className="flex items-center justify-center gap-0.5 mb-3 py-2">
            {/* Bar left */}
            <div className="w-8 h-1 bg-white/20 rounded-l" />
            {result.map((r, i) => (
              Array.from({ length: r.count }).map((_, j) => (
                <div
                  key={`${i}-${j}`}
                  className="rounded-sm bg-primary/80"
                  style={{
                    width: `${Math.max(4, r.plate * 0.8)}px`,
                    height: `${Math.max(16, r.plate * 2.4)}px`,
                  }}
                />
              ))
            ))}
            {/* Center bar */}
            <div className="w-3 h-3 bg-white/30 rounded-sm" />
            {result.map((r, i) => (
              Array.from({ length: r.count }).map((_, j) => (
                <div
                  key={`r-${i}-${j}`}
                  className="rounded-sm bg-primary/80"
                  style={{
                    width: `${Math.max(4, r.plate * 0.8)}px`,
                    height: `${Math.max(16, r.plate * 2.4)}px`,
                  }}
                />
              ))
            ))}
            {/* Bar right */}
            <div className="w-8 h-1 bg-white/20 rounded-r" />
          </div>

          {/* Plate list */}
          <div className="flex flex-wrap gap-2 justify-center">
            {result.map((r, i) => (
              <span key={i} className="text-xs bg-white/5 rounded-lg px-2 py-1 text-foreground/70">
                {r.plate}kg × {r.count} (هر طرف)
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// One Rep Max Calculator
// ============================================================
function OneRMCalculator() {
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(1);

  // Epley formula: 1RM = weight × (1 + reps/30)
  const oneRM = reps === 1 ? weight : weight * (1 + reps / 30);

  const percentages = [
    { label: '100% (1RM)', pct: 1 },
    { label: '95%', pct: 0.95 },
    { label: '90%', pct: 0.90 },
    { label: '85%', pct: 0.85 },
    { label: '80%', pct: 0.80 },
    { label: '75%', pct: 0.75 },
    { label: '70%', pct: 0.70 },
    { label: '65%', pct: 0.65 },
    { label: '60%', pct: 0.60 },
  ];

  return (
    <motion.div variants={itemVariants} className="glass-card p-4">
      <h3 className="text-base font-bold mb-3">💪 محاسبه‌گر یک تکرار بیشینه (1RM)</h3>
      <p className="text-xs text-foreground/50 mb-4">حداکثر وزنه‌ای که می‌توانید یک بار بلند کنید</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-foreground/50 mb-1 block">وزنه (kg)</label>
          <input
            type="number"
            value={weight || ''}
            onChange={e => setWeight(Number(e.target.value))}
            className="hevy-input w-full"
            placeholder="مثلاً 80"
          />
        </div>
        <div>
          <label className="text-xs text-foreground/50 mb-1 block">تعداد تکرار</label>
          <input
            type="number"
            value={reps}
            onChange={e => setReps(Math.max(1, Math.min(30, Number(e.target.value))))}
            min={1}
            max={30}
            className="hevy-input w-full"
          />
        </div>
      </div>

      {weight > 0 && (
        <div className="bg-success/10 rounded-xl p-3 border border-success/20">
          <div className="text-center mb-3">
            <p className="text-xs text-foreground/50">یک تکرار بیشینه تخمینی</p>
            <p className="text-2xl font-black text-success">{Math.round(oneRM * 10) / 10} kg</p>
            <p className="text-xs text-foreground/30 mt-1">فرمول Epley</p>
          </div>

          {/* Percentage table */}
          <div className="space-y-1.5">
            {percentages.map(p => (
              <div key={p.pct} className="flex justify-between text-xs">
                <span className="text-foreground/70">{p.label}</span>
                <span className={`font-medium ${p.pct === 1 ? 'text-success font-bold' : 'text-foreground'}`}>
                  {Math.round(oneRM * p.pct * 10) / 10} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// Warm-up Calculator
// ============================================================
function WarmupCalculator() {
  const [workWeight, setWorkWeight] = useState(0);
  const [totalReps, setTotalReps] = useState(5);

  function generateWarmup(work: number, reps: number) {
    if (work <= 0) return [];
    const barPct = 0.2;
    const sets = [
      { pct: barPct, reps: reps * 2, label: 'ست ۱ - هالتر خالی' },
      { pct: 0.4, reps: Math.ceil(reps * 1.5), label: 'ست ۲' },
      { pct: 0.55, reps: reps, label: 'ست ۳' },
      { pct: 0.7, reps: Math.max(2, reps - 1), label: 'ست ۴' },
      { pct: 0.85, reps: Math.max(1, reps - 2), label: 'ست ۵' },
      { pct: 0.95, reps: 1, label: 'ست ۶' },
    ];

    return sets.map(s => ({
      ...s,
      weight: Math.round(work * s.pct / 2.5) * 2.5, // round to 2.5
    }));
  }

  const warmupSets = generateWarmup(workWeight, totalReps);

  return (
    <motion.div variants={itemVariants} className="glass-card p-4">
      <h3 className="text-base font-bold mb-3">🔥 محاسبه‌گر وارم‌آپ</h3>
      <p className="text-xs text-foreground/50 mb-4">ست‌های وارم‌آپ پیشنهادی قبل از وزنه کاری</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-foreground/50 mb-1 block">وزنه کاری (kg)</label>
          <input
            type="number"
            value={workWeight || ''}
            onChange={e => setWorkWeight(Number(e.target.value))}
            className="hevy-input w-full"
            placeholder="مثلاً 100"
          />
        </div>
        <div>
          <label className="text-xs text-foreground/50 mb-1 block">تکرار ست کاری</label>
          <input
            type="number"
            value={totalReps}
            onChange={e => setTotalReps(Math.max(1, Number(e.target.value)))}
            min={1}
            max={20}
            className="hevy-input w-full"
          />
        </div>
      </div>

      {workWeight > 0 && (
        <div className="space-y-2">
          {warmupSets.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
            >
              <div>
                <span className="text-xs text-foreground/70">{s.label}</span>
                <span className="text-xs text-foreground/30 mr-2">({Math.round(s.pct * 100)}%)</span>
              </div>
              <span className="text-sm font-bold text-warning">{s.weight} kg × {s.reps}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-success/10 rounded-lg px-3 py-2 border border-success/20">
            <span className="text-xs text-success font-medium">⚡ ست کاری</span>
            <span className="text-sm font-bold text-success">{workWeight} kg × {totalReps}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// Unit Converter
// ============================================================
function UnitConverter() {
  const [kg, setKg] = useState(0);

  return (
    <motion.div variants={itemVariants} className="glass-card p-4">
      <h3 className="text-base font-bold mb-3">⚖️ تبدیل واحد</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-foreground/50 mb-1 block">کیلوگرم (kg)</label>
          <input
            type="number"
            value={kg || ''}
            onChange={e => setKg(Number(e.target.value))}
            className="hevy-input w-full"
            placeholder="kg"
          />
        </div>
        <div>
          <label className="text-xs text-foreground/50 mb-1 block">پوند (lb)</label>
          <input
            type="number"
            value={kg ? Math.round(kg * 2.20462 * 100) / 100 : ''}
            onChange={e => setKg(Math.round(Number(e.target.value) / 2.20462 * 100) / 100)}
            className="hevy-input w-full"
            placeholder="lb"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Main Tools Page
// ============================================================
export default function ToolsPage() {
  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-white/5 px-4 py-3">
        <h1 className="text-lg font-bold">🛠 ابزارها</h1>
        <p className="text-xs text-foreground/50 mt-0.5">ابزارهای کمکی تمرین</p>
      </div>

      {/* Tools */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-lg mx-auto px-4 py-4 space-y-4"
      >
        <PlateCalculator />
        <OneRMCalculator />
        <WarmupCalculator />
        <UnitConverter />
      </motion.div>
    </div>
  );
}
