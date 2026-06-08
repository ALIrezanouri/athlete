"use client"

import { useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, Check, X } from "lucide-react"
import { useIsMobile } from "@/lib/hooks/useIsMobile"

// ── Types ────────────────────────────────────────────────────────────────────

export interface DrawerSelectOption {
  value: string
  label: string
  icon?: ReactNode
}

interface MobileDrawerSelectProps {
  value: string
  onChange: (value: string) => void
  options: DrawerSelectOption[]
  placeholder?: string
  label?: string
  drawerTitle?: string
  className?: string
  error?: boolean
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

  // ── Desktop: native <select> ──
  if (!isMobile) {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-xs font-medium text-[--hevy-text-secondary]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            dir={dir}
            className={`w-full appearance-none rounded-xl bg-[--hevy-bg] px-4 py-3 text-sm text-[--hevy-text-primary] outline-none border transition-colors focus:ring-2 focus:ring-[--primary]/50 focus:border-transparent ${
              error ? "border-[--destructive]/50" : "border-[--hevy-border]"
            } ${className}`}
          >
            {!hasValue && (
              <option value="" disabled className="bg-[--hevy-bg] text-[--hevy-text-tertiary]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[--hevy-bg] text-[--hevy-text-primary]">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--hevy-text-tertiary]" />
        </div>
      </div>
    )
  }

  // ── Mobile: trigger + drawer ──
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-[--hevy-text-secondary]">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        dir={dir}
        className={`flex w-full items-center justify-between rounded-xl bg-[--hevy-bg] px-4 py-3 text-sm border transition-colors ${
          error
            ? "border-[--destructive]/50 text-[--destructive]"
            : "border-[--hevy-border] text-[--hevy-text-primary]"
        } ${!hasValue ? "text-[--hevy-text-tertiary]" : ""} ${className}`}
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon}
          {displayLabel}
        </span>
        <ChevronDown className="h-4 w-4 text-[--hevy-text-tertiary]" />
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl border border-[--hevy-border] bg-[--hevy-bg] pb-8"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1.5 w-12 rounded-full bg-[--hevy-text-tertiary]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-4">
                <h3 className="text-base font-bold text-[--hevy-text-primary]">
                  {drawerTitle || label || placeholder}
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/10"
                >
                  <X className="h-5 w-5 text-[--hevy-text-tertiary]" />
                </button>
              </div>
              <div className="mx-5 h-px bg-[--hevy-border]" />

              {/* Options */}
              <div className="px-5 pt-3 overflow-y-auto max-h-[60vh]">
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
                            ? "bg-[--primary]/15 text-[--primary]"
                            : "text-[--hevy-text-secondary] hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          {opt.icon}
                          {opt.label}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-[--primary]" />}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}