"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FiArrowRight, FiBriefcase, FiClock, FiFileText, FiTrash2, FiZap } from "react-icons/fi"
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

export function getJobDetails(
  cl: {
    text?: string | null
    jobPosting?: {
      title?: string | null
      company?: string | null
      parsedJson?: any
    } | null
  },
  lang: "id" | "en" = "id"
) {
  const parsed = cl?.jobPosting?.parsedJson

  const jobTitle =
    parsed?.jobTitle ||
    cl?.jobPosting?.title ||
    parsed?.title ||
    (lang === "id" ? "Posisi Pekerjaan" : "Job Position")

  let company = parsed?.company || cl?.jobPosting?.company || ""

  if (!company && cl?.text) {
    const matchGreeting = cl.text.match(
      /Kepada\s+(?:Tim\s+Rekrutmen|HRD|Hiring\s+Manager|Rekrutmen)\s+([^,\n]+)/i
    )
    if (matchGreeting?.[1]) {
      company = matchGreeting[1].trim()
    } else {
      const matchMelamar = cl.text.match(/melamar\s+posisi\s+.*?\s+di\s+([^,.\n]+)/i)
      if (matchMelamar?.[1]) {
        company = matchMelamar[1].trim()
      }
    }
  }

  if (!company) {
    company = lang === "id" ? "Perusahaan" : "Company"
  }

  const level = parsed?.level || null

  return { jobTitle, company, level }
}

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
  const { jobTitle, company, level } = getJobDetails(cl, lang)
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
        className="h-full flex flex-col justify-between p-5 space-y-4 border-2 border-line group-hover:border-ink transition-all relative bg-panel"
      >
        <div className="space-y-3">
          {/* Top Row: Company & Match Score Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted font-bold mb-1">
                <span className="flex items-center gap-1 text-ink font-bold truncate">
                  <FiBriefcase className="h-3.5 w-3.5 text-muted shrink-0" />
                  {company}
                </span>
                {level && (
                  <>
                    <span className="text-line">•</span>
                    <span className="text-[11px] text-muted font-semibold truncate max-w-[140px]">
                      {level}
                    </span>
                  </>
                )}
              </div>
              <h3 className="hand text-2xl font-bold text-ink leading-snug line-clamp-1 group-hover:text-blue transition-colors">
                {jobTitle}
              </h3>
            </div>

            {cl.relevanceScore !== null && (
              <span
                className={cn(
                  "label text-xs font-bold border px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 shadow-2xs",
                  scoreText[scoreTone(cl.relevanceScore)]
                )}
                title="Match Score"
              >
                <FiZap className="h-3.5 w-3.5" />
                {cl.relevanceScore}%
              </span>
            )}
          </div>

          {/* Clean 2-Line Text Snippet */}
          <p className="text-xs text-muted/90 font-mono leading-relaxed line-clamp-2 italic bg-paper/60 p-3 rounded-xl border border-line/60">
            "{cl.text.slice(0, 140)}…"
          </p>

          {/* Template & Metadata Tags */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
            <span className="bg-paper border border-line px-2 py-0.5 rounded text-ink uppercase">
              {templateLabel}
            </span>
            <span className="bg-ink text-paper px-1.5 py-0.5 rounded uppercase">
              {cl.language.toUpperCase()}
            </span>
            {cl.cv?.title && (
              <span className="bg-blue/10 border border-blue/30 text-blue px-2 py-0.5 rounded truncate max-w-[160px]">
                📄 {cl.cv.title}
              </span>
            )}
          </div>
        </div>

        {/* Footer Bar */}
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

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => onDeleteClick(cl.id, e)}
              disabled={isDeleting}
              className="p-1.5 rounded-lg border border-transparent hover:border-line hover:bg-red/15 text-muted hover:text-red transition-all cursor-pointer"
              aria-label={lang === "id" ? "Hapus" : "Delete"}
              title={lang === "id" ? "Hapus" : "Delete"}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
            <span className="p-1.5 rounded-lg bg-paper border border-line text-ink group-hover:bg-ink group-hover:text-paper transition-colors">
              <FiArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </Polaroid>
    </Link>
  )
}


