"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FiArrowRight, FiClock, FiFileText, FiTrash2, FiZap } from "react-icons/fi"
import {
  COVER_LETTER_TEMPLATE_LABELS,
  scoreTone,
  type CoverLetterDto,
  type CoverLetterTemplate,
} from "@dilirik/shared"
import { Polaroid } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const tapeColors = ["yellow", "blue", "red"] as const
const scoreText = { red: "text-red border-red/40 bg-red/10", yellow: "text-yellow border-yellow/50 bg-yellow/10", green: "text-green border-green/40 bg-green/10" } as const

export function CoverLetterCard({
  coverLetter: cl,
  index,
  lang,
  onDeleteClick,
  isDeleting = false,
}: {
  coverLetter: CoverLetterDto
  index: number
  lang: "id" | "en"
  onDeleteClick: (id: string, e: React.MouseEvent) => void
  isDeleting?: boolean
}) {
  const jobTitle = cl.jobPosting?.title || (lang === "id" ? "Posisi Pekerjaan" : "Job Position")
  const company = cl.jobPosting?.company || (lang === "id" ? "Perusahaan" : "Company")
  const templateKey = (cl.template as CoverLetterTemplate) || "professional"
  const templateObj = COVER_LETTER_TEMPLATE_LABELS[templateKey]
  const templateLabel = templateObj ? (lang === "id" ? templateObj.id : templateObj.en) : cl.template

  const rotate = (index % 3 === 0 ? -1 : index % 2 === 0 ? 1 : 0) * 0.75
  const tape = tapeColors[index % tapeColors.length]!

  return (
    <Link href={`/app/cover-letters/${cl.id}`} className="block group">
      <Polaroid
        rotate={rotate}
        tape={tape}
        className="h-full flex flex-col justify-between p-5 space-y-4 group-hover:border-ink transition-colors relative "
      >
        <div className="space-y-3">
          {/* Header Badges: Template & Language + Match Score */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="label uppercase text-[10px] font-bold bg-panel border border-line px-2 py-0.5 rounded-md text-ink truncate">
                {templateLabel}
              </span>
              <span className="label uppercase text-[10px] font-bold bg-ink text-paper px-1.5 py-0.5 rounded-md shrink-0">
                {cl.language.toUpperCase()}
              </span>
            </div>

            {cl.relevanceScore !== null && (
              <span
                className={cn(
                  "label text-[11px] font-bold border px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1",
                  scoreText[scoreTone(cl.relevanceScore)]
                )}
                title="Match Score"
              >
                <FiZap className="h-3 w-3" />
                {cl.relevanceScore}%
              </span>
            )}
          </div>

          {/* Title & Company */}
          <div>
            <h3 className="hand text-xl font-bold text-ink leading-snug line-clamp-1 group-hover:text-blue transition-colors">
              {jobTitle}
            </h3>
            <p className="scrawl text-sm font-bold text-muted line-clamp-1">{company}</p>
          </div>

          {/* Cover Letter Text Snippet */}
          <div className="bg-paper/80 border border-line/80 p-3 rounded-xl text-xs text-ink/80 italic line-clamp-3 font-mono leading-relaxed relative">
            "{cl.text.slice(0, 150)}…"
          </div>
        </div>

        {/* Footer Info & Actions */}
        <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted font-bold">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FiClock className="h-3.5 w-3.5 shrink-0" />
              {new Date(cl.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                day: "numeric",
                month: "short",
              })}
            </span>
            {cl.wordCount ? (
              <span className="flex items-center gap-1 text-[11px] opacity-75">
                <FiFileText className="h-3 w-3 shrink-0" />
                {cl.wordCount} {lang === "id" ? "kata" : "words"}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => onDeleteClick(cl.id, e)}
              disabled={isDeleting}
              className="p-1.5 rounded-lg border border-transparent hover:border-line hover:bg-red/15 text-muted hover:text-red transition-all cursor-pointer"
              aria-label={lang === "id" ? "Hapus surat lamaran" : "Delete cover letter"}
              title={lang === "id" ? "Hapus" : "Delete"}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
            <span className="p-1.5 rounded-lg bg-panel border border-line text-ink group-hover:bg-ink group-hover:text-paper transition-colors">
              <FiArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </Polaroid>
    </Link>
  )
}
