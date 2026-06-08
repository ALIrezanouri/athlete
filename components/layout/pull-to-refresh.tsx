"use client"

import { useCallback, useRef, useState, useEffect, type ReactNode } from "react"
import { motion, AnimatePresence } from "motion/react"
import { RefreshCw } from "lucide-react"

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  /** Distance in px required to trigger refresh (default 80) */
  threshold?: number
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
}: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false
    return containerRef.current.scrollTop <= 0
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return
      if (isAtTop()) {
        startY.current = e.touches[0].clientY
      }
    },
    [refreshing, isAtTop]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return
      const diff = e.touches[0].clientY - startY.current
      if (diff > 0 && isAtTop()) {
        // Apply rubber-band resistance
        const resisted = Math.min(diff * 0.4, threshold * 1.5)
        setPullDistance(resisted)
        setPulling(resisted > 10)
      } else {
        setPullDistance(0)
        setPulling(false)
      }
    },
    [refreshing, threshold, isAtTop]
  )

  const handleTouchEnd = useCallback(async () => {
    if (refreshing) return

    if (pullDistance >= threshold) {
      setRefreshing(true)
      setPullDistance(threshold)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
        setPulling(false)
      }
    } else {
      setPullDistance(0)
      setPulling(false)
    }
  }, [pullDistance, threshold, refreshing, onRefresh])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setPulling(false)
      setRefreshing(false)
      setPullDistance(0)
    }
  }, [])

  const progress = Math.min(pullDistance / threshold, 1)
  const showIndicator = pulling || refreshing

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1"
            style={{ height: pullDistance }}
          >
            <div
              className="flex items-center justify-center w-10 h-10 rounded-full glass-card"
              style={{
                transform: `rotate(${progress * 360}deg)`,
                transition: refreshing ? "none" : "transform 0.1s ease-out",
              }}
            >
              <RefreshCw
                className={`w-5 h-5 text-primary ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
            </div>
            <span className="text-[10px] text-foreground/40">
              {refreshing
                ? "در حال بارگذاری..."
                : progress >= 1
                  ? "رها کنید"
                  : "بکشید برای بروزرسانی"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${showIndicator ? pullDistance * 0.5 : 0}px)`,
          transition: refreshing ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  )
}
