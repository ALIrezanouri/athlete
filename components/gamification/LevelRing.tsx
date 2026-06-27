"use client";

import { motion } from "framer-motion";

interface LevelRingProps {
  level: number;
  progress: number; // 0..1
  size?: number;
  strokeWidth?: number;
  title?: string;
  compact?: boolean;
}

const TIER_COLORS: Record<string, string> = {
  beginner: "#10b981", // emerald
  amateur: "#3b82f6", // blue
  pro: "#8b5cf6", // violet
  master: "#f59e0b", // amber
  legend: "#ef4444", // red
};

function getTierColor(level: number): string {
  if (level >= 30) return TIER_COLORS.legend;
  if (level >= 20) return TIER_COLORS.master;
  if (level >= 10) return TIER_COLORS.pro;
  if (level >= 5) return TIER_COLORS.amateur;
  return TIER_COLORS.beginner;
}

export function LevelRing({
  level,
  progress,
  size = 64,
  strokeWidth = 5,
  title,
  compact = false,
}: LevelRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  const color = getTierColor(level);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-bold leading-none ${
            compact ? "text-base" : "text-lg"
          }`}
          style={{ color }}
        >
          {level}
        </span>
        {!compact && (
          <span className="text-[9px] text-muted-foreground mt-0.5">
            {title ?? "Level"}
          </span>
        )}
      </div>
    </div>
  );
}