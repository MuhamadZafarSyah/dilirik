"use client"

import type { HTMLAttributes, ReactNode } from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export type CardProps = Omit<HTMLAttributes<HTMLDivElement>, keyof HTMLMotionProps<"div">> &
  HTMLMotionProps<"div"> & {
    tape?: "yellow" | "blue" | "red"
    pin?: boolean
    rotate?: number | string
    children?: ReactNode
  }

/** Kartu kertas scrapbook interaktif dengan Framer Motion (Design System §6 & §7). */
export function Card({
  tape,
  pin,
  rotate,
  className = "",
  children,
  style,
  ...props
}: CardProps) {
  const rotNum = typeof rotate === "number" ? rotate : typeof rotate === "string" ? parseFloat(rotate) || 0 : 0

  return (
    <motion.div
      initial={rotate !== undefined ? { rotate: rotNum } : undefined}
      whileHover={{ y: -4, scale: 1.01, rotate: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      style={style}
      className={cn(
        "card bg-panel border-line relative rounded-xl border-2 p-5 shadow-paper transition-shadow",
        tape === "yellow" && "tape",
        tape === "blue" && "tape-blue",
        tape === "red" && "tape-red",
        className
      )}
      {...props}
    >
      {pin && (
        <span
          className="bg-red shadow-paper absolute -top-2.5 left-1/2 z-10 h-5 w-5 -translate-x-1/2 rounded-full border border-paper"
          aria-hidden
        />
      )}
      {children}
    </motion.div>
  )
}

/** Polaroid card — dipakai untuk CV & karya. */
export function Polaroid({
  tape,
  pin,
  rotate = -1,
  className = "",
  children,
  style,
  ...props
}: CardProps) {
  const rotNum = typeof rotate === "number" ? rotate : typeof rotate === "string" ? parseFloat(rotate) || 0 : -1

  return (
    <motion.div
      initial={{ rotate: rotNum }}
      whileHover={{ rotate: 0, scale: 1.015, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      style={style}
      className={cn(
        "polaroid bg-panel border-line relative rounded-sm border p-3.5 pb-8 shadow-lift",
        tape === "yellow" && "tape",
        tape === "blue" && "tape-blue",
        tape === "red" && "tape-red",
        className
      )}
      {...props}
    >
      {pin && (
        <span
          className="bg-red shadow-paper absolute -top-2 left-1/2 z-10 h-4 w-4 -translate-x-1/2 rounded-full border border-paper"
          aria-hidden
        />
      )}
      {children}
    </motion.div>
  )
}

/** Sticky note — dipakai untuk gap, catatan, dan tips. */
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
  const rotNum = typeof rotate === "number" ? rotate : typeof rotate === "string" ? parseFloat(rotate) || 0 : 1

  return (
    <motion.div
      initial={{ rotate: rotNum }}
      whileHover={{ rotate: 0, scale: 1.015, y: -2 }}
      transition={{ type: "spring", stiffness: 350, damping: 24 }}
      style={style}
      className={cn(
        "sticky-note relative rounded-sm border-l-4 p-4 shadow-paper backdrop-blur-xs",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
