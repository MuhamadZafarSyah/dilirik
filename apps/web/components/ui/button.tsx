"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "yellow" | "outline"
export type ButtonSize = "sm" | "md" | "lg"

const styles: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:shadow-lift border-2 border-ink",
  secondary: "bg-panel text-ink border-2 border-line hover:border-ink",
  ghost: "bg-transparent text-ink hover:bg-panel/80",
  danger: "bg-red text-paper hover:shadow-lift border-2 border-red",
  yellow: "bg-yellow text-ink border-2 border-ink/80 hover:shadow-lift",
  outline: "bg-paper text-ink border-2 border-ink/30 hover:border-ink",
}

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2.5 font-bold",
}

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">> &
  Omit<HTMLMotionProps<"button">, "children"> & {
    variant?: ButtonVariant
    size?: ButtonSize
    isLoading?: boolean
    icon?: ReactNode
    tape?: "yellow" | "blue" | "red"
    children?: ReactNode
  }

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  tape,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -2, rotate: variant === "primary" ? -1 : 1, scale: 1.01 }}
      whileTap={{ scale: 0.96, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      disabled={disabled || isLoading}
      className={cn(
        "label relative inline-flex items-center justify-center font-bold shadow-paper transition-colors duration-150 cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        sizes[size],
        tape === "yellow" && "tape",
        tape === "blue" && "tape-blue",
        tape === "red" && "tape-red",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg className="h-4 w-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </motion.button>
  )
}
