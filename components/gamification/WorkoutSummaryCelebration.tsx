"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LevelRing } from "./LevelRing";
import type { WorkoutCompletionResult } from "@/app/actions/gamification";

interface WorkoutSummaryCelebrationProps {
  open: boolean;
  result: WorkoutCompletionResult | null;
  onClose: () => void;
}

export function WorkoutSummaryCelebration({
  open,
  result,
  onClose,
}: WorkoutSummaryCelebrationProps) {
  if (!result?.success) return null;

  const {
    xp_gained = 0,
    new_level = 1,
    leveled_up = false,
    current_streak = 0,
    best_streak = 0,
    streak_extended = false,
  } = result;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center shadow-2xl"
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <motion.p
              className="text-sm font-medium text-emerald-400"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              ✅ تمرین ثبت شد!
            </motion.p>

            {/* XP gained — big number */}
            <motion.div
              className="mt-4 mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", damping: 12 }}
            >
              <div className="text-5xl font-black text-white">
                +{xp_gained}
                <span className="ml-1 text-lg font-semibold text-amber-400">XP</span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">تجربه کسب کردی</p>
            </motion.div>

            {/* Level ring */}
            <div className="flex flex-col items-center gap-2">
              <LevelRing level={new_level} progress={0} size={88} strokeWidth={7} />
              {leveled_up && (
                <motion.div
                  className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-400"
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.6, type: "spring", damping: 10 }}
                >
                  🎉 سطح جدید!
                </motion.div>
              )}
            </div>

            {/* Streak row */}
            {(streak_extended || current_streak > 0) && (
              <div className="mt-6 flex items-center justify-center gap-4 rounded-2xl bg-zinc-800/50 px-4 py-3">
                <div className="text-center">
                  <div className="text-2xl">🔥</div>
                  <div className="mt-0.5 text-lg font-bold text-orange-400">
                    {current_streak}
                  </div>
                  <div className="text-[10px] text-zinc-500">روز متوالی</div>
                </div>
                <div className="h-8 w-px bg-zinc-700" />
                <div className="text-center">
                  <div className="text-2xl">🏆</div>
                  <div className="mt-0.5 text-lg font-bold text-zinc-300">
                    {best_streak}
                  </div>
                  <div className="text-[10px] text-zinc-500">رکورد</div>
                </div>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 active:scale-95"
            >
              ادامه
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}