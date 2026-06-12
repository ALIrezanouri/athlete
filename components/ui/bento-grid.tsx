"use client"

import { type ComponentPropsWithoutRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className?: string
  children: ReactNode
  Icon: React.ElementType
  description: string
  metric?: string
  metricLabel?: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  children,
  Icon,
  description,
  metric,
  metricLabel,
  ...props
}: BentoCardProps) => (
  <div
    className={cn(
      "group relative flex flex-col justify-between overflow-hidden rounded-xl p-6",
      "bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)]",
      "transition-all duration-300 hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]",
      className
    )}
    {...props}
  >
    {children}
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{name}</h3>
          <p className="text-xs text-foreground/50">{description}</p>
        </div>
      </div>
      {metric && (
        <div className="mt-2">
          <span className="text-3xl font-bold text-success">{metric}</span>
          {metricLabel && (
            <span className="ml-1 text-xs text-foreground/40">{metricLabel}</span>
          )}
        </div>
      )}
    </div>
  </div>
)

export { BentoCard, BentoGrid }