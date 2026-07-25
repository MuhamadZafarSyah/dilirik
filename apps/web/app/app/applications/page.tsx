"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { FiLayers, FiZap, FiBriefcase, FiArrowRight, FiCheckCircle } from "react-icons/fi"
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  scoreTone,
  type ApplicationStatus,
  type JobParsed,
} from "@dilirik/shared"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { useI18n } from "@/lib/i18n"

type AppItem = {
  id: string
  status: ApplicationStatus
  matchScore: number | null
  updatedAt: string
  cv: { id: string; title: string; version: number }
  jobPosting: { id: string; parsedJson: JobParsed }
}

const toneText = { red: "text-red", yellow: "text-yellow", green: "text-green" } as const

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
}

function ApplicationsList() {
  const params = useSearchParams()
  const { lang, t } = useI18n()
  const [filter, setFilter] = useState<ApplicationStatus | "">(
    (params.get("status") as ApplicationStatus) ?? ""
  )
  const [items, setItems] = useState<AppItem[] | null>(null)

  const load = useCallback(() => {
    api
      .get<{ applications: AppItem[] }>(`/api/applications${filter ? `?status=${filter}` : ""}`)
      .then((r) => setItems(r.data.applications))
      .catch(() => setItems([]))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="hand text-4xl sm:text-5xl font-bold flex items-center gap-2">
            Tracker Pelamaran 📌
          </h1>
          <p className="scrawl text-muted text-xl mt-1">
            Pantau status setiap lowongan yang telah kamu lamar atau simpan.
          </p>
        </div>

        <Link href="/app/analyze">
          <Button variant="danger" icon={<FiZap />} tape="red">
            + Analisis & Tambah Lamaran
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="bg-panel/80 border-2 border-line rounded-2xl p-2 shadow-paper backdrop-blur-xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("")}
          className={`label rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase transition-all select-none ${
            filter === "" ? "bg-ink text-paper shadow-paper -rotate-1" : "bg-paper border border-line text-ink hover:border-ink"
          }`}
        >
          Semua Status
        </button>
        {APPLICATION_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`label rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase transition-all select-none ${
              filter === status ? "bg-ink text-paper shadow-paper -rotate-1" : "bg-paper border border-line text-ink hover:border-ink"
            }`}
          >
            {APPLICATION_STATUS_LABELS[status][lang]}
          </button>
        ))}
      </div>

      {/* List */}
      {!items ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-line/20 h-24 animate-pulse rounded-xl border border-line" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum Ada Lamaran di Kategori Ini"
          note="Jalankan sesi analisis CV + lowongan, lalu simpan ke tracker lamaran."
          ctaLabel={t("newAnalysis")}
          ctaHref="/app/analyze"
        />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
          {items.map((item, i) => (
            <motion.div key={item.id} variants={itemVariants}>
              <Link href={`/app/applications/${item.id}`} className="block">
                <Card
                  rotate={i % 2 === 0 ? 0.4 : -0.4}
                  className="group flex flex-wrap items-center justify-between gap-4 p-4 hover:scale-[1.01] transition-transform"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="hand text-2xl font-bold text-ink group-hover:text-blue transition-colors truncate">
                      {item.jobPosting.parsedJson.jobTitle || "Posisi Tanpa Judul"}
                    </h3>
                    <p className="label text-muted text-xs uppercase font-bold tracking-wider">
                      {item.jobPosting.parsedJson.company ?? "Perusahaan"} · CV: {item.cv.title} (v{item.cv.version})
                    </p>
                    <p className="text-muted text-[11px]">
                      Diubah {new Date(item.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {item.matchScore !== null && (
                      <div className="text-right">
                        <span className={`hand text-3xl font-bold ${toneText[scoreTone(item.matchScore)]}`}>
                          {item.matchScore}
                        </span>
                        <span className="scrawl text-muted text-xs block -mt-1">Match Score</span>
                      </div>
                    )}
                    <StatusBadge status={item.status} lang={lang} />
                    <FiArrowRight className="h-4 w-4 text-muted group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<p className="scrawl text-2xl">Memuat Tracker Pelamaran...</p>}>
      <ApplicationsList />
    </Suspense>
  )
}
