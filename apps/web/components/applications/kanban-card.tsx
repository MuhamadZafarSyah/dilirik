"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { FiChevronLeft, FiChevronRight, FiFileText, FiMessageSquare, FiPaperclip, FiUser } from "react-icons/fi"
import { scoreTone, type ApplicationStatus, type JobParsed } from "@dilirik/shared"
import { cn } from "@/lib/utils"

export type KanbanItem = {
  id: string
  status: ApplicationStatus
  matchScore: number | null
  updatedAt: string
  cv: { id: string; title: string; version: number }
  jobPosting: { id: string; parsedJson: JobParsed }
}

const statusDotColor: Record<ApplicationStatus, string> = {
  DISIMPAN: "bg-blue-500",
  DILAMAR: "bg-yellow-500",
  SCREENING: "bg-purple-500",
  INTERVIEW: "bg-blue-600",
  OFFER: "bg-green-500",
  DITOLAK: "bg-red-500",
}

const scoreText = { red: "text-red", yellow: "text-yellow", green: "text-green" } as const

export function KanbanCard({
  item,
  rotate,
  isDragging,
  dropIndicator,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDragLeaveCard,
  onDropOnCard,
  onMovePrev,
  onMoveNext,
}: {
  item: KanbanItem
  rotate: number
  isDragging: boolean
  dropIndicator?: "before" | "after" | null
  onDragStart: () => void
  onDragEnd: () => void
  onDragOverCard?: (e: React.DragEvent, position: "before" | "after") => void
  onDragLeaveCard?: (e: React.DragEvent) => void
  onDropOnCard?: (e: React.DragEvent, position: "before" | "after") => void
  onMovePrev?: () => void
  onMoveNext?: () => void
}) {
  const router = useRouter()
  const dragHappened = useRef(false)
  const title = item.jobPosting.parsedJson.jobTitle || "Posisi Tanpa Judul"
  const company = item.jobPosting.parsedJson.company ?? "Perusahaan"
  const initial = company.charAt(0).toUpperCase()

  const openDetail = () => {
    if (dragHappened.current) return
    router.push(`/app/applications/${item.id}`)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? "before" : "after"
    onDragOverCard?.(e, position)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? "before" : "after"
    onDropOnCard?.(e, position)
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        dragHappened.current = true
        e.dataTransfer.setData("text/plain", item.id)
        e.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          dragHappened.current = false
        }, 80)
        onDragEnd()
      }}
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        e.stopPropagation()
        onDragLeaveCard?.(e)
      }}
      onDrop={handleDrop}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter") openDetail()
      }}
      role="button"
      tabIndex={0}
      aria-label={`Buka detail lamaran ${title}`}
      className={cn(
        "group cursor-grab select-none outline-none transition-all active:cursor-grabbing relative",
        isDragging && "opacity-30"
      )}
      style={{ transform: `rotate(${rotate * 0.4}deg)` }}
    >
      {dropIndicator === "before" && (
        <div className="absolute -top-2 left-0 right-0 h-1 bg-blue rounded-full shadow-sm z-20 animate-pulse pointer-events-none" />
      )}

      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: "spring", stiffness: 350, damping: 22 }}
        className={cn(
          "bg-paper border-2 border-line/80 rounded-2xl p-4 shadow-paper space-y-2.5 hover:border-ink transition-colors relative",
          dropIndicator && "border-blue ring-2 ring-blue/30"
        )}
      >
        {/* Top Header: Dot + Date */}
        <div className="flex items-center justify-between text-[11px] text-muted font-bold">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", statusDotColor[item.status])} />
            <span>
              {new Date(item.updatedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <span className="label bg-panel border border-line px-1.5 py-0.5 rounded text-[9px] font-bold text-muted">
            {company}
          </span>
        </div>

        {/* Title */}
        <h3 className="hand text-lg font-bold leading-snug text-ink line-clamp-2 group-hover:text-blue transition-colors">
          {title}
        </h3>

        {/* Sub Info: CV details */}
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <FiFileText className="h-3.5 w-3.5 text-ink shrink-0" />
          <span className="truncate text-[11px]">
            {item.cv.title} <span className="opacity-75">(v{item.cv.version})</span>
          </span>
        </div>

        {/* Bottom Footer: Icons & Avatar */}
        <div className="pt-2 border-t border-line/50 flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-3">
            {item.matchScore !== null ? (
              <span
                className={cn("hand text-lg font-bold leading-none", scoreText[scoreTone(item.matchScore)])}
                title="Match Score"
              >
                {item.matchScore}<span className="text-[10px] text-muted font-sans font-normal">/100</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1"><FiMessageSquare className="h-3 w-3" /> 0</span>
                <span className="flex items-center gap-1"><FiPaperclip className="h-3 w-3" /> 1</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Move Buttons for Touch / Fallback */}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onMovePrev && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMovePrev()
                  }}
                  aria-label="Pindah ke status sebelumnya"
                  className="rounded-md border border-line bg-panel p-1 text-ink hover:bg-ink hover:text-paper"
                >
                  <FiChevronLeft className="h-3 w-3" />
                </button>
              )}
              {onMoveNext && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveNext()
                  }}
                  aria-label="Pindah ke status berikutnya"
                  className="rounded-md border border-line bg-panel p-1 text-ink hover:bg-ink hover:text-paper"
                >
                  <FiChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Avatar Pill */}
            <div
              className="h-6 w-6 rounded-full bg-ink text-paper flex items-center justify-center font-bold text-[10px] shadow-xs shrink-0"
              title={company}
            >
              {initial}
            </div>
          </div>
        </div>
      </motion.div>

      {dropIndicator === "after" && (
        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-blue rounded-full shadow-sm z-20 animate-pulse pointer-events-none" />
      )}
    </div>
  )
}
