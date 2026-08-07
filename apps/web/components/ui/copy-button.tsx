"use client"

import { useState, type ReactNode } from "react"
import { FiCheck, FiCopy } from "react-icons/fi"
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button"

/** Tombol salin ke clipboard dengan feedback "✓ Tersalin". */
export function CopyButton({
  text,
  label = "Salin Teks",
  variant = "secondary",
  size = "md",
  icon,
  className = "",
  title,
}: {
  text: string
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  className?: string
  title?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard tidak tersedia (http non-secure) — abaikan */
    }
  }

  // Jika label sudah mengandung emoji (misal "📋 Salin"), jangan tambah icon default
  const defaultIcon = icon ?? (typeof label === "string" && label.includes("📋") ? null : <FiCopy />)

  return (
    <Button
      variant={variant}
      size={size}
      onClick={copy}
      icon={copied ? <FiCheck className="text-green font-bold" /> : defaultIcon}
      className={className}
      title={title}
    >
      {copied ? "Tersalin!" : label}
    </Button>
  )
}
