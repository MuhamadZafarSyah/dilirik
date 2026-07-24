"use client"

import type { ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const styles: Record<Variant, string> = {
  primary:
    "bg-ink text-paper hover:rotate-[-1deg] hover:shadow-lift active:rotate-0",
  secondary:
    "bg-panel text-ink border-2 border-line hover:border-ink hover:rotate-[1deg]",
  ghost: "bg-transparent text-ink hover:bg-panel",
  danger: "bg-red text-paper hover:shadow-lift",
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`label inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
