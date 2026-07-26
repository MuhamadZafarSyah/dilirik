"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { FiChevronLeft, FiChevronRight, FiFileText } from "react-icons/fi"
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

/** Warna sticky note per kolom status — selaras dengan StatusBadge & Sticky. */
const noteTone: Record<ApplicationStatus, string> = {
  DISIMPAN: "bg-panel border-line",
  DILAMAR: "bg-blue/10 border-blue/60",
  SCREENING: "bg-yellow/25 border-yellow/70",
  INTERVIEW: "bg-blue/20 border-blue/70",
  OFFER: "bg-green/15 border-green/60",
  DITOLAK: "bg-red/10 border-red/60",
}

const scoreText = { red: "text-red", yellow: "text-yellow", green: "text-green" } as const

/**
 * Kartu lamaran bergaya sticky note.
 * Root-nya div biasa (bukan motion.div) karena framer-motion membajak prop
 * onDragStart/onDragEnd untuk gesture-nya sendiri — drag & drop native HTML5
 * butuh event DOM asli.
 */
export function KanbanCard({
  item,
  rotate,
  isDragging,
  onDragStart,
  onDragEnd,
  onMovePrev,
  onMoveNext,
}: {
  item: KanbanItem
  rotate: number
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onMovePrev?: () => void
  onMoveNext?: () => void
}) {
  const router = useRouter()
  const dragHappened = useRef(false)
  const title = item.jobPosting.parsedJson.jobTitle || "Posisi Tanpa Judul"

  const openDetail = () => {
    if (dragHappened.current) return
    router.push(`/app/applications/${item.id}`)
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
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter") openDetail()
      }}
      role="button"
      tabIndex={0}
      aria-label={`Buka detail lamaran ${title}`}
      className={cn(
        "group cursor-grab select-none outline-none transition-opacity active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <motion.div
        whileHover={{ rotate: 0, scale: 1.03, y: -3 }}
        transition={{ type: "spring", stiffness: 350, damping: 22 }}
        className={cn(
          "sticky-note relative rounded-sm border-l-4 p-3.5 shadow-paper backdrop-blur-xs",
          noteTone[item.status]
        )}
      >
        <h3 className="hand line-clamp-2 text-xl font-bold leading-tight text-ink transition-colors group-hover:text-blue">
          {title}
        </h3>
        <p className="label mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-muted">
          {item.jobPosting.parsedJson.company ?? "Perusahaan"}
        </p>

        <p className="mt-2 flex items-center gap-1 truncate text-[11px] text-muted">
          <FiFileText className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {item.cv.title} · v{item.cv.version}
          </span>
        </p>

        <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-line/70 pt-2">
          <span className="text-[10px] text-muted">
            {new Date(item.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          </span>

          <div className="flex items-center gap-1.5">
            {item.matchScore !== null && (
              <span
                className={cn("hand text-xl font-bold leading-none", scoreText[scoreTone(item.matchScore)])}
                title="Match Score"
              >
                {item.matchScore}
              </span>
            )}

            {/* Fallback tanpa drag (layar sentuh / keyboard): pindah kolom via panah */}
            <div className="flex gap-0.5 opacity-70 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {onMovePrev && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMovePrev()
                  }}
                  aria-label="Pindah ke status sebelumnya"
                  className="rounded-md border border-line bg-paper/80 p-1 text-ink transition-colors hover:bg-ink hover:text-paper"
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
                  className="rounded-md border border-line bg-paper/80 p-1 text-ink transition-colors hover:bg-ink hover:text-paper"
                >
                  <FiChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
