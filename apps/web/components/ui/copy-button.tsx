"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

/** Tombol salin ke clipboard dengan feedback "✓ tersalin" (Fase 1a — copy per-saran). */
export function CopyButton({ text, label = "📋 salin" }: { text: string; label?: string }) {
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

  return (
    <Button variant="secondary" onClick={copy}>
      {copied ? "✓ tersalin" : label}
    </Button>
  )
}
