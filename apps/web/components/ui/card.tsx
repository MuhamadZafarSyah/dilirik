"use client"

import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  tape?: "yellow" | "blue" | "red"
  pin?: boolean
  rotate?: number | string
  interactive?: boolean
  children?: ReactNode
}

/** Kartu kertas scrapbook interaktif dengan Hardware-Accelerated CSS Transitions (Zero JS Lag). */
export function Card({
  tape,
  pin,
  rotate,
  interactive = false,
  className = "",
  children,
  style,
  ...props
}: CardProps) {
  const rotNum =
    typeof rotate === "number"
      ? rotate
      : typeof rotate === "string"
        ? parseFloat(rotate) || 0
        : 0

  return (
    <div
      style={{
        transform: rotNum ? `rotate(${rotNum}deg)` : undefined,
        ...style,
      }}
      className={cn(
        "card bg-panel border-line relative rounded-xl border-2 p-5 shadow-paper transition-all duration-150 ease-out will-change-transform transform-gpu",
        interactive && "hover:-translate-y-1 hover:shadow-lift cursor-pointer",
        tape === "yellow" && "tape",
        tape === "blue" && "tape-blue",
        tape === "red" && "tape-red",
        className
      )}
      {...props}
    >
      {pin && (
        <span
          className="bg-red shadow-paper absolute -top-2.5 left-1/2 z-10 h-5 w-5 -translate-x-1/2 rounded-full border border-paper pointer-events-none"
          aria-hidden
        />
      )}
      {children}
    </div>
  )
}

/** Polaroid card — dipakai untuk CV & karya (GPU Accelerated). */
export function Polaroid({
  tape,
  pin,
  rotate = -1,
  className = "",
  children,
  style,
  ...props
}: CardProps) {
  const rotNum =
    typeof rotate === "number"
      ? rotate
      : typeof rotate === "string"
        ? parseFloat(rotate) || 0
        : -1

  return (
    <div
      style={{
        transform: `rotate(${rotNum}deg)`,
        ...style,
      }}
      className={cn(
        "polaroid bg-panel border-line relative rounded-sm border p-3.5 pb-8 shadow-lift transition-all duration-200 ease-out will-change-transform transform-gpu hover:rotate-0 hover:-translate-y-1.5 hover:shadow-2xl",
        tape === "yellow" && "tape",
        tape === "blue" && "tape-blue",
        tape === "red" && "tape-red",
        className
      )}
      {...props}
    >
      {pin && (
        <span
          className="bg-red shadow-paper absolute -top-2 left-1/2 z-10 h-4 w-4 -translate-x-1/2 rounded-full border border-paper pointer-events-none"
          aria-hidden
        />
      )}
      {children}
    </div>
  )
}

/** Sticky note — dipakai untuk gap, catatan, dan tips (GPU Accelerated). */
export function Sticky({
  tone = "yellow",
  rotate = 1,
  className = "",
  children,
  style,
  ...props
}: CardProps & { tone?: "yellow" | "red" | "green" | "blue" }) {
  const tones = {
    yellow: "bg-yellow/30 border-yellow/60 text-ink",
    red: "bg-red/15 border-red/60 text-ink",
    green: "bg-green/15 border-green/60 text-ink",
    blue: "bg-blue/15 border-blue/60 text-ink",
  }
  const rotNum =
    typeof rotate === "number"
      ? rotate
      : typeof rotate === "string"
        ? parseFloat(rotate) || 0
        : 1

  return (
    <div
      style={{
        transform: `rotate(${rotNum}deg)`,
        ...style,
      }}
      className={cn(
        "sticky-note relative rounded-sm border-l-4 p-4 shadow-paper backdrop-blur-xs transition-all duration-150 ease-out will-change-transform transform-gpu hover:rotate-0 hover:-translate-y-0.5",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
