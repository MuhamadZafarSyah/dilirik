import React from "react"
import { cn } from "@/lib/utils"

export interface LogoProps {
  className?: string
  iconClassName?: string
  showText?: boolean
  textClassName?: string
}

/**
 * Logo Resmi Dilirik — Custom Branding Mark (Eye Focus & Spark Icon + Typography)
 */
export function DilirikLogo({
  className,
  iconClassName = "h-9 w-9",
  showText = false,
  textClassName = "hand text-2xl sm:text-3xl font-bold text-ink",
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2 group shrink-0", className)}>
      <div
        className={cn(
          "bg-ink text-paper flex items-center justify-center rounded-xl shadow-paper transition-transform group-hover:scale-105 group-hover:rotate-3 shrink-0",
          iconClassName
        )}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/5 h-3/5"
        >
          {/* Eye Outer Contour */}
          <path
            d="M3 16C3 16 8 7 16 7C24 7 29 16 29 16C29 16 24 25 16 25C8 25 3 16 3 16Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Inner Iris */}
          <circle
            cx="16"
            cy="16"
            r="5"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          {/* Red Pupil Focus Dot */}
          <circle cx="16" cy="16" r="2.2" fill="#E53E3E" />
          {/* Yellow Spark Highlight */}
          <circle cx="21" cy="11" r="1.2" fill="#ECC94B" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={cn("leading-none tracking-tight", textClassName)}>
            Dilirik
          </span>
          <span className="label text-[9px] uppercase font-bold text-muted tracking-wider leading-none mt-0.5">
            AI CV Matcher
          </span>
        </div>
      )}
    </div>
  )
}
