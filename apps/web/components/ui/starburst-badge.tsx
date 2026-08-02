"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type StarburstBadgeProps = {
  text: string
  color?: "green" | "pink" | "yellow" | "blue"
  rotate?: number
  className?: string
}

export function StarburstBadge({
  text,
  color = "green",
  rotate = 12,
  className = "",
}: StarburstBadgeProps) {
  const fillColors = {
    green: "#38d9a9",
    pink: "#f783ac",
    yellow: "#ffe066",
    blue: "#74c0fc",
  }

  return (
    <div
      style={{ transform: `rotate(${rotate}deg)` }}
      className={cn(
        "absolute z-20 drop-shadow-paper transition-transform hover:scale-110 hover:rotate-0 select-none cursor-pointer",
        className
      )}
    >
      <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full filter drop-shadow-xs">
          <path
            d="M50 0 L58 10 L69 4 L73 16 L85 15 L85 27 L97 31 L93 43 L100 50 L93 57 L97 69 L85 73 L85 85 L73 84 L69 96 L58 90 L50 100 L42 90 L31 96 L27 84 L15 85 L15 73 L3 69 L7 57 L0 50 L7 43 L3 31 L15 27 L15 15 L27 16 L31 4 L42 10 Z"
            fill={fillColors[color]}
            stroke="#1c1917"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </svg>
        <span className="relative z-10 hand text-[10px] sm:text-xs font-black text-ink text-center leading-none px-1 uppercase tracking-tighter max-w-[54px] sm:max-w-[64px] drop-shadow-xs">
          {text}
        </span>
      </div>
    </div>
  )
}
