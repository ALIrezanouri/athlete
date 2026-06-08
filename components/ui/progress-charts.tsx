"use client"

import { motion } from "motion/react"

// ── Area / Line Chart (SVG) ──
// Pure SVG — no dependencies. Mobile-first, touch-friendly.
export function ProgressLineChart({
  data,
  width = 340,
  height = 180,
  color = "#4F8EF7",
  label,
  unit = "",
  showDots = true,
}: {
  data: { label: string; value: number }[]
  width?: number
  height?: number
  color?: string
  label?: string
  unit?: string
  showDots?: boolean
}) {
  if (!data || data.length === 0) return null

  const padding = { top: 20, right: 16, bottom: 30, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const minVal = Math.min(...data.map(d => d.value))
  const maxVal = Math.max(...data.map(d => d.value))
  const range = maxVal - minVal || 1

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartW
  const getY = (v: number) => padding.top + chartH - ((v - minVal) / range) * chartH

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${getX(i)},${getY(d.value)}`).join(" ")
  const areaPath = `${linePath} L${getX(data.length - 1)},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`

  const gradientId = `grad-${color.replace("#", "")}`

  return (
    <div className="w-full">
      {label && <p className="text-xs text-foreground/30 mb-2 font-medium">{label}</p>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ maxHeight: height }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line key={pct}
            x1={padding.left} y1={padding.top + chartH * (1 - pct)}
            x2={width - padding.right} y2={padding.top + chartH * (1 - pct)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
          />
        ))}

        {/* Y axis labels */}
        {[minVal, Math.round((minVal + maxVal) / 2), maxVal].map((v, i) => (
          <text key={i} x={padding.left - 6} y={getY(v) + 3} textAnchor="end"
            fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="system-ui"
          >{Math.round(v)}{unit}</text>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Dots */}
        {showDots && data.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.value)} r="4" fill={color} opacity={0.3} />
            <circle cx={getX(i)} cy={getY(d.value)} r="2.5" fill={color} />
          </g>
        ))}

        {/* X axis labels (first, middle, last) */}
        {data.length > 2 && [0, Math.floor(data.length / 2), data.length - 1].map((idx) => (
          <text key={idx} x={getX(idx)} y={height - 6} textAnchor="middle"
            fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="system-ui"
          >{data[idx].label}</text>
        ))}
      </svg>
    </div>
  )
}

// ── Bar Chart (SVG) ──
export function ProgressBarChart({
  data,
  width = 340,
  height = 160,
  color = "#30D158",
  label,
  unit = "",
}: {
  data: { label: string; value: number }[]
  width?: number
  height?: number
  color?: string
  label?: string
  unit?: string
}) {
  if (!data || data.length === 0) return null

  const padding = { top: 16, right: 12, bottom: 28, left: 12 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const maxVal = Math.max(...data.map(d => d.value))
  const barWidth = Math.min(chartW / data.length * 0.6, 32)
  const gap = (chartW - barWidth * data.length) / (data.length + 1)

  return (
    <div className="w-full">
      {label && <p className="text-xs text-foreground/30 mb-2 font-medium">{label}</p>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {data.map((d, i) => {
          const barH = maxVal ? (d.value / maxVal) * chartH : 0
          const x = padding.left + gap + i * (barWidth + gap)
          const y = padding.top + chartH - barH
          return (
            <g key={i}>
              <motion.rect
                x={x} y={y}
                width={barWidth} height={barH}
                rx={4}
                fill={color}
                initial={{ height: 0, y: padding.top + chartH }}
                animate={{ height: barH, y }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                opacity={0.85}
              />
              <text x={x + barWidth / 2} y={height - 6} textAnchor="middle"
                fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="system-ui"
              >{d.label}</text>
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle"
                fill="rgba(255,255,255,0.4)" fontSize="8" fontWeight="600" fontFamily="system-ui"
              >{d.value}{unit}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Muscle Distribution Radar Chart (SVG) ──
export function MuscleRadarChart({
  muscles,
  size = 200,
}: {
  muscles: { name: string; volume: number; max: number }[]
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const n = muscles.length

  const getAngle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const getPoint = (i: number, pct: number) => ({
    x: cx + Math.cos(getAngle(i)) * r * pct,
    y: cy + Math.sin(getAngle(i)) * r * pct,
  })

  const webLevels = [0.25, 0.5, 0.75, 1]

  const dataPoints = muscles.map((m, i) => {
    const pct = m.max ? Math.min(m.volume / m.max, 1) : 0
    return getPoint(i, pct)
  })
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z"

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" style={{ maxWidth: size }}>
      {/* Web */}
      {webLevels.map((level) => (
        <polygon key={level}
          points={Array.from({ length: n }).map((_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"
        />
      ))}

      {/* Spokes */}
      {muscles.map((_, i) => {
        const outer = getPoint(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.04)" />
      })}

      {/* Data area */}
      <motion.path
        d={dataPath}
        fill="rgba(79, 142, 247, 0.2)"
        stroke="#4F8EF7"
        strokeWidth="2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* Data dots + Labels */}
      {muscles.map((m, i) => {
        const pct = m.max ? Math.min(m.volume / m.max, 1) : 0
        const p = getPoint(i, pct)
        const labelP = getPoint(i, 1.25)
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="#4F8EF7" />
            <text x={labelP.x} y={labelP.y} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="system-ui"
            >{m.name}</text>
          </g>
        )
      })}
    </svg>
  )
}