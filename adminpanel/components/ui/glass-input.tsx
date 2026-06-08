"use client"

import React, { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { BorderBeam } from "@/components/ui/border-beam"

interface GlassInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  dir?: "ltr" | "rtl"
  maxLength?: number
  disabled?: boolean
  className?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function GlassInput({
  value,
  onChange,
  placeholder,
  type = "text",
  dir = "ltr",
  maxLength,
  disabled = false,
  className,
  autoFocus = false,
  onKeyDown,
}: GlassInputProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={cn("relative rounded-xl", className)}
      onClick={() => inputRef.current?.focus()}
    >
      <div
        className={cn(
          "relative flex items-center rounded-xl border px-4 py-3 transition-all duration-300",
          "bg-white/[0.05] backdrop-blur-[10px]",
          focused
            ? "border-white/20 shadow-[0_0_20px_rgba(58,134,255,0.1)]"
            : "border-white/10"
        )}
      >
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          dir={dir}
          maxLength={maxLength}
          disabled={disabled}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "w-full bg-transparent text-base text-white outline-none",
            "placeholder:text-white/30",
            "disabled:opacity-50"
          )}
        />
      </div>

      {/* Border Beam highlights active input */}
      {focused && (
        <BorderBeam
          size={80}
          duration={3}
          colorFrom="#3A86FF"
          colorTo="#00E676"
          borderWidth={1}
        />
      )}
    </div>
  )
}