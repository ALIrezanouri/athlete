"use client";

import { motion } from "motion/react";
import { Achievement, TIER_COLORS } from "@/app/actions/achievements";

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const tierStyle = TIER_COLORS[achievement.tier] || TIER_COLORS.bronze;
  const progressPct = Math.min(100, (achievement.progress / achievement.goal_value) * 100);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className={`relative overflow-hidden rounded-2xl border ${tierStyle.border} ${
        achievement.is_unlocked
          ? `bg-gradient-to-br ${tierStyle.bg}`
          : "bg-white/[0.02] border-white/5"
      } p-3`}
    >
      {/* Glow for unlocked */}
      {achievement.is_unlocked && (
        <div className={`absolute inset-0 ${tierStyle.glow} blur-2xl opacity-30 pointer-events-none`} />
      )}

      <div className="relative flex flex-col items-center text-center" dir="rtl">
        {/* Icon */}
        <div className={`text-3xl mb-2 ${achievement.is_unlocked ? "" : "grayscale opacity-40"}`}>
          {achievement.icon}
        </div>

        {/* Title */}
        <div className={`text-xs font-bold mb-1 ${achievement.is_unlocked ? tierStyle.text : "text-white/40"}`}>
          {achievement.title}
        </div>

        {/* Description */}
        <div className="text-[10px] text-white/40 leading-tight mb-2 line-clamp-2">
          {achievement.description}
        </div>

        {/* Progress bar (only if not unlocked) */}
        {!achievement.is_unlocked && (
          <div className="w-full">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${tierStyle.bg} rounded-full`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-[9px] text-white/30 mt-1">
              {achievement.progress}/{achievement.goal_value}
            </div>
          </div>
        )}

        {/* XP reward badge */}
        {achievement.is_unlocked && achievement.xp_reward > 0 && (
          <div className={`text-[9px] ${tierStyle.text} font-bold mt-1`}>
            +{achievement.xp_reward} XP
          </div>
        )}
      </div>
    </motion.div>
  );
}