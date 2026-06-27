"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UnlockedAchievement } from "@/app/actions/achievements";
import { TIER_COLORS } from "@/app/actions/achievements";

// ─── Achievement Unlock Toast ───────────────────────────────────
// Floating toast that appears when achievements are unlocked.
// Shows one at a time, auto-dismisses after 4s.

export function AchievementToast({
  achievements,
  onDismiss,
}: {
  achievements: UnlockedAchievement[];
  onDismiss: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const current = achievements[index];

  useEffect(() => {
    if (!current) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        if (index < achievements.length - 1) {
          setIndex(index + 1);
        } else {
          onDismiss();
        }
      }, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [index, current, achievements.length, onDismiss]);

  if (!current) return null;

  const tierStyle = TIER_COLORS[current.tier] || TIER_COLORS.bronze;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto`}
        >
          <div className={`bg-gradient-to-br ${tierStyle.bg} border ${tierStyle.border} backdrop-blur-xl rounded-2xl px-5 py-4 shadow-2xl ${tierStyle.glow} flex items-center gap-3 min-w-[280px]`}>
            <div className="text-4xl shrink-0">
              {current.icon}
            </div>
            <div className="flex-1 text-right" dir="rtl">
              <div className="text-[10px] text-white/50 mb-0.5">دستاورد جدید باز شد!</div>
              <div className={`font-bold ${tierStyle.text}`}>{current.title}</div>
              {current.xp_reward > 0 && (
                <div className="text-xs text-white/60 mt-0.5">+{current.xp_reward} XP</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}