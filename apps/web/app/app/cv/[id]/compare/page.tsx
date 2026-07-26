"use client"

import { Suspense, use, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { CvDesignPanel } from "@/components/pdf/cv-design-panel"
import { DownloadCvMenu } from "@/components/pdf/download-cv-menu"

type CvVersion = {
  id: string
  title: string
  version: number
  language: string
  rawText: string
  fileKey: string | null
}

/**
 * Compare 2 versi CV berdampingan (Flow C) — ala iLovePDF:
 * desain asli tiap versi dirender sebagai PDF (DOCX otomatis dikonversi),
 * dengan toggle ke mode teks. Versi tanpa file desain fallback ke teks.
 */
function ComparePageInner({ id }: { id: string }) {
  const params = useSearchParams()
  const otherId = params.get("with")
  const { t } = useI18n()
  const [mode, setMode] = useState<"design" | "text">("design")

  const compareQuery = useQuery({
    queryKey: ["cv-compare", id, otherId],
    enabled: Boolean(otherId),
    queryFn: async () => {
      const { data } = await api.get<{ before: CvVersion; after: CvVersion }>(
        `/api/cv/${id}/compare/${otherId}`,
      )
      return data
    },
  })

  if (!otherId) return <p className="text-red">Parameter ?with=cvId dibutuhkan.</p>
  const data = compareQuery.data
  if (!data) return <p className="scrawl text-2xl">{t("loading")}</p>

  const hasDesign = Boolean(data.before.fileKey || data.after.fileKey)
  const effectiveMode = hasDesign ? mode : "text"

  const columns = [
    { label: t("before"), cv: data.before, tone: "tape", rotate: "lg:rotate-[-0.35deg]" },
    { label: t("after"), cv: data.after, tone: "tape-blue", rotate: "lg:rotate-[0.35deg]" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="hand text-4xl">
            {t("compare")}: {data.before.title}
          </h1>
          <p className="scrawl text-muted mt-1 text-lg">
            v{data.before.version} → v{data.after.version} — lihat perubahannya langsung di desain aslinya ✨
          </p>
        </div>
        <Link href={`/app/cv/${id}`} className="label text-sm underline">
          ← kembali
        </Link>
      </div>

      {hasDesign && (
        <div className="border-line bg-panel shadow-paper inline-flex items-center gap-1 rounded-lg border-2 p-1">
          {(
            [
              ["design", "🎨 Desain (PDF)"],
              ["text", "📝 Teks"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={effectiveMode === value}
              className={`label rounded-md px-4 py-1.5 text-xs font-bold uppercase transition-colors ${
                effectiveMode === value ? "bg-ink text-paper shadow-paper" : "text-muted hover:bg-line/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {columns.map(({ label, cv, tone, rotate }, i) => (
          <motion.div
            key={cv.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`card bg-panel border-line shadow-paper relative rounded-lg border-2 p-5 ${rotate}`}
          >
            <span className={tone} aria-hidden />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="hand text-2xl">{label}</span>
                <span className="label bg-ink text-paper rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase">
                  v{cv.version}
                </span>
              </div>
              <DownloadCvMenu cv={cv} compact />
            </div>
            {effectiveMode === "design" ? (
              <CvDesignPanel
                cvId={cv.id}
                fileKey={cv.fileKey}
                fallbackText={cv.rawText}
                maxHeightClassName="max-h-[42rem]"
              />
            ) : (
              <pre className="bg-paper border-line max-h-[42rem] overflow-auto rounded-md border p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {cv.rawText}
              </pre>
            )}
          </motion.div>
        ))}
      </div>

      <p className="text-muted text-xs">
        💡 Panel di atas merender file desain asli tiap versi — DOCX otomatis dikonversi ke PDF, jadi yang kamu lihat sama persis dengan hasil download. Versi tanpa file desain ditampilkan sebagai teks.
      </p>
    </div>
  )
}

export default function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense>
      <ComparePageInner id={id} />
    </Suspense>
  )
}
