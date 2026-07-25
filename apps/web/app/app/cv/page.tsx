"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FiFileText, FiPlus, FiZap, FiSearch, FiArrowRight } from "react-icons/fi"
import { api } from "@/lib/api"
import { Polaroid } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useI18n } from "@/lib/i18n"

type CvItem = {
  id: string
  title: string
  language: string
  version: number
  parentCvId: string | null
  createdAt: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 15 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
}

export default function CvListPage() {
  const { t } = useI18n()
  const [cvs, setCvs] = useState<CvItem[] | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    api.get<{ cvs: CvItem[] }>("/api/cv").then((r) => setCvs(r.data.cvs)).catch(() => setCvs([]))
  }, [])

  if (!cvs) {
    return (
      <div className="space-y-6">
        <div className="bg-line/30 h-10 w-48 animate-pulse rounded-lg" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-line/20 h-64 animate-pulse rounded-lg border border-line" />
          ))}
        </div>
      </div>
    )
  }

  const roots = cvs.filter((cv) => !cv.parentCvId)
  const versionsOf = (rootId: string) => cvs.filter((cv) => cv.parentCvId === rootId)

  const filteredRoots = roots.filter((cv) =>
    cv.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="hand text-4xl sm:text-5xl font-bold flex items-center gap-2">
            Dokumen CV 📄
          </h1>
          <p className="scrawl text-muted text-xl mt-1">Kelola master CV dan versi revisi hasil AI.</p>
        </div>

        <Link href="/app/cv/new">
          <Button variant="primary" size="lg" icon={<FiPlus />} tape="yellow">
            + Tambah Master CV
          </Button>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      {roots.length > 0 && (
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul CV..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-line bg-panel text-ink text-sm font-semibold shadow-paper focus:border-ink outline-none"
          />
        </div>
      )}

      {/* List / Empty State */}
      {roots.length === 0 ? (
        <EmptyState
          title={t("emptyCvTitle")}
          note="Upload PDF/DOCX atau tempel teks CV kamu — Bahasa Indonesia maupun Inggris."
          ctaLabel={t("emptyCvCta")}
          ctaHref="/app/cv/new"
        />
      ) : filteredRoots.length === 0 ? (
        <div className="text-center py-12">
          <p className="scrawl text-muted text-2xl">CV yang kamu cari tidak ditemukan 🔍</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredRoots.map((cv, i) => {
            const versions = versionsOf(cv.id)
            const tapeColor = i % 3 === 0 ? "yellow" : i % 3 === 1 ? "blue" : "red"
            return (
              <motion.div key={cv.id} variants={itemVariants}>
                <Polaroid tape={tapeColor} pin rotate={i % 2 === 0 ? -1.5 : 1.5} className="group h-full">
                  <Link href={`/app/cv/${cv.id}`} className="block">
                    <div className="bg-paper/80 border-line flex h-36 items-center justify-center rounded-lg border-2 shadow-inner group-hover:bg-paper transition-colors relative overflow-hidden">
                      <FiFileText className="h-14 w-14 text-ink/70 group-hover:scale-110 transition-transform" />
                      <span className="label bg-ink text-paper absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] uppercase font-bold">
                        {cv.language}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="hand text-2xl font-bold text-ink group-hover:text-red transition-colors line-clamp-1">
                        {cv.title}
                      </h3>
                      <p className="label text-muted text-xs uppercase tracking-wider mt-1">
                        v{cv.version} Master · {new Date(cv.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </Link>

                  {/* Version Pills */}
                  {versions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-line/60">
                      <p className="scrawl text-muted text-xs mb-1.5 font-bold">Riwayat Revisi:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {versions.map((v) => (
                          <Link
                            key={v.id}
                            href={`/app/cv/${v.id}`}
                            className="label bg-yellow/30 border border-yellow/80 hover:bg-yellow text-ink rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors"
                          >
                            v{v.version} (Revisi)
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs font-bold pt-2">
                    <Link href={`/app/analyze?cvId=${cv.id}`} className="label text-red hover:underline flex items-center gap-1">
                      <FiZap /> Analisis CV Ini
                    </Link>
                    <Link href={`/app/cv/${cv.id}`} className="label text-ink hover:underline flex items-center gap-1">
                      Detail <FiArrowRight />
                    </Link>
                  </div>
                </Polaroid>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
