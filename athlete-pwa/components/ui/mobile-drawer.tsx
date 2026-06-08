"use client"

import { type ReactNode } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"

// ── Props ────────────────────────────────────────────────────────────────────
interface MobileDrawerProps {
  /** Whether the drawer is open */
  open: boolean
  /** Called when the drawer should close */
  onClose: () => void
  /** Optional title displayed in the header */
  title?: string
  /** Optional icon displayed next to the title */
  icon?: ReactNode
  /** Content inside the drawer */
  children: ReactNode
  /** Max height of the content area (default: "60vh") */
  maxHeight?: string
}

// ── Component ────────────────────────────────────────────────────────────────
export function MobileDrawer({
  open,
  onClose,
  title,
  icon,
  children,
  maxHeight = "60vh",
}: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-background pb-8"
          >
            {/* ── Drag handle ── */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            {/* ── Header (optional) ── */}
            {title && (
              <>
                <div className="flex items-center justify-between px-5 pb-4">
                  <div className="flex items-center gap-2">
                    {icon && <span className="text-primary">{icon}</span>}
                    <h3 className="text-lg font-bold text-foreground">{title}</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1.5 transition-colors hover:bg-white/10"
                  >
                    <X className="h-5 w-5 text-foreground/60" />
                  </button>
                </div>
                <div className="mx-5 h-px bg-white/5" />
              </>
            )}

            {/* ── Content ── */}
            <div className="px-5 pt-4 overflow-y-auto" style={{ maxHeight }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}