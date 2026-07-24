import type { HTMLAttributes } from "react"

/** Kartu kertas scrapbook (Design System §Components). */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card bg-panel border-line rounded-lg border-2 p-5 shadow-paper ${className}`} {...props} />
}

/** Polaroid — dipakai untuk kartu CV. */
export function Polaroid({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`polaroid bg-panel border-line rotate-[-1deg] rounded-sm border p-3 pb-6 shadow-lift transition-transform hover:rotate-0 ${className}`} {...props} />
}

/** Sticky note — dipakai untuk gap & catatan. */
export function Sticky({ tone = "yellow", className = "", ...props }: HTMLAttributes<HTMLDivElement> & { tone?: "yellow" | "red" | "green" | "blue" }) {
  const tones = {
    yellow: "bg-yellow/30 border-yellow",
    red: "bg-red/15 border-red",
    green: "bg-green/15 border-green",
    blue: "bg-blue/15 border-blue",
  }
  return <div className={`sticky-note rotate-[1deg] rounded-sm border-l-4 p-4 ${tones[tone]} ${className}`} {...props} />
}
