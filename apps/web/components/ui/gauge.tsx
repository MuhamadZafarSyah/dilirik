"use client"

import { scoreTone } from "@dilirik/shared"

const toneClass = { red: "text-red", yellow: "text-yellow", green: "text-green" } as const
const toneStroke = { red: "stroke-red", yellow: "stroke-yellow", green: "stroke-green" } as const

/**
 * Gauge skor 0–100 bergaya "stempel" scrapbook.
 * Semantik warna: 0–49 merah · 50–74 kuning · 75–100 hijau (Design System).
 */
export function ScoreGauge({ score, size = 160 }: { score: number; size?: number }) {
  const tone = scoreTone(score)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  return (
    <div className="relative inline-flex rotate-[-2deg] items-center justify-center" style={{ width: size, height: size }} role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Skor kecocokan">
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="7" className="stroke-line" />
        <circle
          cx="50" cy="50" r={radius} fill="none" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" className={toneStroke[tone]}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`hand text-5xl ${toneClass[tone]}`}>{score}</div>
        <div className="label text-muted text-[10px] uppercase tracking-widest">/ 100</div>
      </div>
    </div>
  )
}
