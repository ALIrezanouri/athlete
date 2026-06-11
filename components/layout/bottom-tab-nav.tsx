"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, User, Plus, ClipboardList, History, type LucideIcon } from "lucide-react"
import { useGlobalEngine } from "@/lib/GlobalEngineContext"
import { memo, useCallback } from "react"
import { motion } from "motion/react"

/** Trigger a light haptic tap on supported devices */
function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.(5)
  }
}

interface TabItem {
  href: string
  icon: LucideIcon
  labelKey: string
  isCenter?: boolean
  badge?: number
}

const tabs: TabItem[] = [
  { href: "/home", icon: Home, labelKey: "nav.home" },
  { href: "/routines", icon: ClipboardList, labelKey: "nav.routines" },
  { href: "/workout", icon: Plus, labelKey: "nav.workout", isCenter: true },
  { href: "/history", icon: History, labelKey: "nav.history" },
  { href: "/profile", icon: User, labelKey: "nav.profile" },
]

export const BottomTabNav = memo(function BottomTabNav() {
  const pathname = usePathname()
  const { t } = useGlobalEngine()

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-50">
        <div className="max-w-lg mx-auto px-4 pb-4">
          <div
            className="
              flex items-center justify-around
              h-[72px] rounded-3xl
              bg-[rgba(28,28,30,0.7)]
              backdrop-blur-2xl saturate-150
              border border-white/10
              shadow-2xl shadow-black/50
            "
          >
            {tabs.map((tab) => {
              const isActive =
                tab.href === "/workout"
                  ? pathname?.startsWith("/workout")
                  : pathname === tab.href || pathname?.startsWith(tab.href + "/")
              const Icon = tab.icon

              // ── Center CTA: Apple-style FAB ──
              if (tab.isCenter) {
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onTouchStart={haptic}
                    className="flex flex-col items-center justify-center flex-1 h-full relative"
                  >
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center
                        transition-all duration-300 ease-out
                        shadow-lg shadow-primary/30
                        ${isActive
                          ? "bg-primary scale-110 shadow-xl shadow-primary/40"
                          : "bg-primary shadow-lg"
                        }
                      `}
                    >
                      <Icon className="w-6 h-6 text-white" strokeWidth={3} />
                    </motion.div>
                  </Link>
                )
              }

              // ── Regular tab ──
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onTouchStart={haptic}
                  className={`
                    flex flex-col items-center justify-center flex-1 h-full
                    relative transition-all duration-200
                    ${isActive ? "text-primary" : "text-white/40 active:text-white/20"}
                  `}
                >
                  <motion.div whileTap={{ scale: 0.85 }} className="relative">
                    <Icon
                      className={`w-[24px] h-[24px] transition-all duration-200`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-[rgba(28,28,30,0.7)]">
                        {tab.badge}
                      </span>
                    )}
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  )
})
