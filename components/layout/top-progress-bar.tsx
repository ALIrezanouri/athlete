"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"

/**
 * Thin progress bar that appears at the top of the viewport
 * whenever the pathname changes (route navigation).
 * Auto-dismisses after a short delay to simulate load completion.
 */
export function TopProgressBar() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // When pathname changes, show the bar
    setLoading(true)

    const timer = setTimeout(() => {
      setLoading(false)
    }, 600)

    return () => {
      clearTimeout(timer)
    }
  }, [pathname])

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.7, transition: { duration: 0.3, ease: "easeOut" } }}
          exit={{ scaleX: 1, transition: { duration: 0.3, ease: "easeIn" } }}
          className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-success to-primary origin-left z-[100]"
          style={{ willChange: "transform" }}
        />
      )}
    </AnimatePresence>
  )
}
