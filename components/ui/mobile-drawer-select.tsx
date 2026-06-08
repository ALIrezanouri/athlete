"use client"

import { useState, type ReactNode } from "react"
import { motion } from "motion/react"
import { ChevronDown, Check } from "lucide-react"
import { useIsMobile } from "@/lib/hooks/useIsMobile"

// ── Types ────────────────────────────────────────────────────────────────────

export interface DrawerSelectOption {
  value: string
  label: string
  /** Optional icon or element rendered before the label */
  icon?: ReactNode
}

interface MobileDrawerSelectProps {
  /** Current selected value */
  value: string
  /** Called when a new value is selected */
  onChange: (value: string) => void
  /** Array of options to display */
  options: DrawerSelectOption[]
  /** Placeholder text when no value is selected */
  placeholder?: string
  /** Optional label displayed above the trigger */
  label?: string
  /** Optional drawer title (defaults to label or placeholder) */
  drawerTitle?: string
  /** Additional CSS classes for the trigger button */
  className?: string
  /** Error state — adds red border */
  error?: boolean
  /** Text direction */
  dir?: "rtl" | "ltr"
}

// ── Component ────────────────────────────────────────────────────────────────
export function MobileDrawerSelect({
  value,
  onChange,
  options,
  placeholder = "انتخاب کنید",
  label,
  drawerTitle,
  className = "",
  error = false,
  dir,
}: MobileDrawerSelectProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  const selectedOption = options.find((o) => o.value === value)
  const displayLabel = selectedOption?.label || placeholder
  const hasValue = !!selectedOption

  // ── Desktop: render native <select> ──
  if (!isMobile) {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-xs font-medium text-foreground/60">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            dir={dir}
            className={`w-full appearance-none rounded-xl bg-white/5 px-4 py-3 text-sm text-foreground outline-none border transition-colors focus:ring-2 focus:ring-primary/50 focus:border-transparent ${
              error ? "border-red-500/50" : "border-white/10"
            } ${className}`}
          >
            {!hasValue && (
              <option value="" disabled className="bg-background text-foreground/40">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-background text-foreground">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
        </div>
      </div>
    )
  }

  // ── Mobile: render trigger + drawer ──
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-foreground/60">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        dir={dir}
        className={`flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm border transition-colors ${
          error
            ? "border-red-500/50 text-red-400"
            : "border-white/10 text-foreground"
        } ${!hasValue ? "text-foreground/40" : ""} ${className}`}
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon}
          {displayLabel}
        </span>
        <ChevronDown className="h-4 w-4 text-foreground/40" />
      </button>

      {/* ── Drawer ── */}
      <DrawerOverlay open={open} onClose={() => setOpen(false)} title={drawerTitle || label || placeholder}>
        <div className="flex flex-col gap-1 pb-4">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <motion.button
                key={opt.value}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm transition-colors ${
                  isSelected
                    ? "bg-primary/15 text-primary"
                    : "text-foreground/70 hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {opt.icon}
                  {opt.label}
                </span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </motion.button>
            )
          })}
        </div>
      </DrawerOverlay>
    </div>
  )
}

// ── Internal: Drawer overlay (inline to avoid circular deps) ─────────────────
import { AnimatePresence } from "motion/react"
import { X } from "lucide-react"

function DrawerOverlay({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
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
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <h3 className="text-base font-bold text-foreground">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5 text-foreground/60" />
              </button>
            </div>
            <div className="mx-5 h-px bg-white/5" />

            {/* Content */}
            <div className="px-5 pt-3 overflow-y-auto max-h-[60vh]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}