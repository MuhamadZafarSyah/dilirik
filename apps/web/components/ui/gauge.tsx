"use client"

import React from "react"
import { motion } from "framer-motion"
import { scoreTone } from "@dilirik/shared"
import { cn } from "@/lib/utils"

const toneClass = { red: "text-red", yellow: "text-yellow", green: "text-green" } as const
const toneStroke = { red: "#df513b", yellow: "#f5c84b", green: "#5d8a4e" } as const
const toneLabels = {
  red: "Perlu Perbaikan Banyak",
  yellow: "Cukup Cocok",
  green: "Sangat Matang & Match",
} as const

/**
 * Gauge skor 0–100 bergaya stempel scrapbook dengan animasi Framer Motion.
 */
export function ScoreGauge({
  score,
  size = 180,
  showLabel = true,
  className = "",
}: {
  score: number
  size?: number
  showLabel?: boolean
  className?: string
}) {
  const tone = scoreTone(score)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100)

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <motion.div
        whileHover={{ scale: 1.05, rotate: 0 }}
        initial={{ scale: 0.9, rotate: -2 }}
        animate={{ scale: 1, rotate: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative inline-flex items-center justify-center p-2 rounded-full bg-panel shadow-paper border-2 border-line"
        style={{ width: size, height: size }}
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Skor kecocokan"
      >
        <svg viewBox="0 0 100 100" width={size - 16} height={size - 16} className="-rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            className="stroke-line/60"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke={toneStroke[tone]}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </svg>

        <div className="absolute text-center flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className={cn("hand leading-none font-bold text-5xl sm:text-6xl drop-shadow-xs", toneClass[tone])}
          >
            {score}
          </motion.span>
          <span className="scrawl text-muted text-xs font-bold uppercase tracking-wider">/ 100</span>
        </div>
      </motion.div>

      {showLabel && (
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={cn("label text-xs font-bold px-3 py-1 rounded-full border border-line bg-panel shadow-paper", toneClass[tone])}
        >
          {toneLabels[tone]}
        </motion.span>
      )}
    </div>
  )
}
