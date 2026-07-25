"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FiBriefcase, FiPlus, FiZap, FiSearch, FiArrowRight, FiGlobe } from "react-icons/fi"
import type { JobParsed } from "@dilirik/shared"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useI18n } from "@/lib/i18n"

type JobItem = { id: string; parsedJson: JobParsed; sourceUrl: string | null; createdAt: string }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 22 } },
}

export default function JobsPage() {
  const { t } = useI18n()
  const [jobs, setJobs] = useState<JobItem[] | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    api.get<{ jobs: JobItem[] }>("/api/jobs").then((r) => setJobs(r.data.jobs)).catch(() => setJobs([]))
  }, [])

  if (!jobs) {
    return (
      <div className="space-y-6">
        <div className="bg-line/30 h-10 w-48 animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="bg-line/20 h-44 animate-pulse rounded-xl border border-line" />
          ))}
        </div>
      </div>
    )
  }

  const filteredJobs = jobs.filter((job) => {
    const title = job.parsedJson.jobTitle?.toLowerCase() || ""
    const company = job.parsedJson.company?.toLowerCase() || ""
    const query = search.toLowerCase()
    return title.includes(query) || company.includes(query)
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="hand text-4xl sm:text-5xl font-bold flex items-center gap-2">
            Target Lowongan 🎯
          </h1>
          <p className="scrawl text-muted text-xl mt-1">
            Simpan deskripsi lowongan kerja untuk di-match dengan CV milikmu.
          </p>
        </div>

        <Link href="/app/jobs/new">
          <Button variant="primary" size="lg" icon={<FiPlus />} tape="blue">
            + Simpan Lowongan Baru
          </Button>
        </Link>
      </div>

      {/* Search */}
      {jobs.length > 0 && (
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari posisi atau perusahaan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-line bg-panel text-ink text-sm font-semibold shadow-paper focus:border-ink outline-none"
          />
        </div>
      )}

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <EmptyState
          title={t("emptyJobTitle")}
          note="Copy-paste job posting dari LinkedIn, Jobstreet, Glints, atau portal kerja mana pun."
          ctaLabel={t("emptyJobCta")}
          ctaHref="/app/jobs/new"
        />
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="scrawl text-muted text-2xl">Lowongan yang kamu cari tidak ditemukan 🔍</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-5 md:grid-cols-2"
        >
          {filteredJobs.map((job, i) => (
            <motion.div key={job.id} variants={itemVariants}>
              <Card
                rotate={i % 2 === 0 ? 0.6 : -0.6}
                tape={i % 2 === 0 ? "yellow" : "blue"}
                className="group flex flex-col justify-between h-full hover:scale-[1.01] transition-transform"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="hand text-2xl sm:text-3xl font-bold text-ink group-hover:text-blue transition-colors line-clamp-1">
                        {job.parsedJson.jobTitle || "Posisi Tanpa Judul"}
                      </h3>
                      <p className="label text-muted text-xs uppercase font-bold tracking-wider mt-0.5">
                        {job.parsedJson.company ?? "Perusahaan Rahasia"}
                        {job.parsedJson.level ? ` · ${job.parsedJson.level}` : ""}
                      </p>
                    </div>
                    {job.sourceUrl && (
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:text-ink p-1 rounded-full hover:bg-paper transition-colors"
                        title="Buka Link Asli"
                      >
                        <FiGlobe className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Skills tags */}
                  {job.parsedJson.mustHaveSkills && job.parsedJson.mustHaveSkills.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <p className="scrawl text-muted text-xs font-bold">Skill Wajib Incaran:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.parsedJson.mustHaveSkills.slice(0, 6).map((skill) => (
                          <span
                            key={skill}
                            className="label bg-red/15 border border-red/40 text-red rounded-md px-2 py-0.5 text-[11px] font-bold uppercase"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.parsedJson.mustHaveSkills.length > 6 && (
                          <span className="label text-muted text-xs self-center">
                            +{job.parsedJson.mustHaveSkills.length - 6} lainnya
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card footer action */}
                <div className="mt-5 pt-3 border-t border-line/60 flex items-center justify-between">
                  <span className="text-muted text-[11px]">
                    Disimpan {new Date(job.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                  <Link href={`/app/jobs/${job.id}`}>
                    <Button size="sm" variant="outline" icon={<FiArrowRight />}>
                      Detail & Analisis
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
