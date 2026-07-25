"use client"

import React from "react"
import { motion } from "framer-motion"
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@dilirik/shared"
import { cn } from "@/lib/utils"

const toneByStatus: Record<ApplicationStatus, string> = {
  DISIMPAN: "bg-line/40 text-ink border-line",
  DILAMAR: "bg-blue/20 text-blue border-blue/40",
  SCREENING: "bg-yellow/30 text-ink border-yellow/60",
  INTERVIEW: "bg-blue/30 text-blue border-blue/60",
  OFFER: "bg-green/25 text-green border-green/60",
  DITOLAK: "bg-red/20 text-red border-red/60",
}

export function StatusBadge({
  status,
  lang = "id",
  className = "",
}: {
  status: ApplicationStatus
  lang?: "id" | "en"
  className?: string
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.05, rotate: -1 }}
      className={cn(
        "label inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide border shadow-paper select-none",
        toneByStatus[status],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {APPLICATION_STATUS_LABELS[status][lang]}
    </motion.span>
  )
}
