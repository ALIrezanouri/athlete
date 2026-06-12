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
      {/* Fade gradient above nav for seamless content blend */}
      <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="h-20 bg-gradient-to-t from-background to-transparent" />
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-50">
        <div className="max-w-lg mx-auto px-2 pb-1">
          <div
            className="
              glass-nav
              flex items-center justify-around
              h-[68px] rounded-2xl
            "
          >
            {tabs.map((tab) => {
              const isActive =
                tab.href === "/workout"
                  ? pathname?.startsWith("/workout")
                  : pathname === tab.href || pathname?.startsWith(tab.href + "/")
              const Icon = tab.icon

              // ── Center CTA: Floating workout button ──
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
                          : "bg-primary animate-pulse-glow"
                        }
                      `}
                    >
                      <Icon className="w-6 h-6 text-foreground" strokeWidth={2.5} />
                    </motion.div>
                    <span
                      className={`text-xs font-semibold leading-none mt-1 transition-colors duration-200 ${
                        isActive ? "text-primary" : "text-hevy-text-tertiary"
                      }`}
                    >
                      {t(tab.labelKey)}
                    </span>
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
                    relative transition-colors duration-200
                    ${isActive ? "text-primary" : "text-hevy-text-tertiary active:text-muted-foreground"}
                  `}
                >
                  {/* Active indicator dot */}
                  <div
                    className={`
                      absolute top-1 w-1 h-1 rounded-full
                      bg-primary transition-all duration-300
                      ${isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"}
                    `}
                  />

                  <motion.div whileTap={{ scale: 0.85 }} className="relative">
                    <Icon
                      className={`w-[22px] h-[22px] transition-all duration-200 ${
                        isActive ? "scale-105" : ""
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.5}
                    />
                    {/* Notification badge */}
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full text-[8px] font-bold text-foreground flex items-center justify-center">
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </span>
                    )}
                  </motion.div>

                  <span
                    className={`text-[10px] leading-none mt-1.5 transition-all duration-200 ${
                      isActive ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {t(tab.labelKey)}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Safe area spacer for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  )
})