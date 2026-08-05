"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FiBriefcase, FiPlus, FiZap, FiSearch, FiArrowRight, FiGlobe } from "react-icons/fi"
import type { JobParsed } from "@dilirik/shared"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Skeleton } from "boneyard-js/react"
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
  const [search, setSearch] = useState("")

  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data } = await api.get<{ jobs: JobItem[] }>("/api/jobs")
      return data.jobs
    },
  })
  const jobs = jobsQuery.data ?? (jobsQuery.isError ? [] : null)

  const filteredJobs = jobs?.filter((job) => {
    const title = job.parsedJson.jobTitle?.toLowerCase() || ""
    const company = job.parsedJson.company?.toLowerCase() || ""
    const query = search.toLowerCase()
    return title.includes(query) || company.includes(query)
  }) ?? []

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
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
      </motion.div>

      <Skeleton name="jobs-list" loading={!jobs} animate="shimmer" fallback={<JobsListSkeleton />}>
        {jobs ? (
          jobs.length === 0 ? (
            <motion.div variants={itemVariants}>
              <EmptyState
                title={t("emptyJobTitle")}
                note="Paste teks deskripsi lowongan atau tautkan link pekerjaan."
                ctaLabel={t("emptyJobCta")}
                ctaHref="/app/jobs/new"
              />
            </motion.div>
          ) : filteredJobs.length === 0 ? (
            <motion.div variants={itemVariants} className="text-center py-12">
              <p className="scrawl text-muted text-2xl">Lowongan tidak ditemukan 🔍</p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-4 md:grid-cols-2"
            >
              {filteredJobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                >
                  <Card tape={i % 2 === 0 ? "blue" : "yellow"} className="space-y-3 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="hand text-2xl font-bold text-ink leading-tight">
                          {job.parsedJson.jobTitle || "Posisi Tanpa Judul"}
                        </h3>
                        {job.sourceUrl && (
                          <a
                            href={job.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted hover:text-ink transition-colors p-1"
                            title="Buka Link Lowongan Asli"
                          >
                            <FiGlobe className="h-4 w-4" />
                          </a>
                        )}
                      </div>

                      <p className="label text-muted text-xs uppercase font-bold tracking-wider mt-1">
                        {job.parsedJson.company ? `🏢 ${job.parsedJson.company}` : "🏢 Perusahaan"}
                        {job.parsedJson.level ? ` · 📈 ${job.parsedJson.level}` : ""}
                      </p>

                      {job.parsedJson.requirements && job.parsedJson.requirements.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {job.parsedJson.requirements.slice(0, 4).map((req, idx) => (
                            <span
                              key={idx}
                              className="label bg-paper/80 border border-line text-ink rounded-md px-2 py-0.5 text-[11px] font-bold"
                            >
                              {req}
                            </span>
                          ))}
                          {job.parsedJson.requirements.length > 4 && (
                            <span className="label text-muted text-[11px] font-bold self-center">
                              +{job.parsedJson.requirements.length - 4} lagi
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-line/60 flex items-center justify-between">
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
          )
        ) : null}
      </Skeleton>
    </motion.div>
  )
}

function JobsListSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-2 border-line bg-panel/60 p-5 rounded-2xl space-y-3 shadow-paper">
            <div className="h-6 w-2/3 bg-line/40 rounded-lg" />
            <div className="h-4 w-1/3 bg-line/25 rounded-md" />
            <div className="h-16 w-full bg-line/30 rounded-xl" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-4 w-24 bg-line/30 rounded" />
              <div className="h-8 w-28 bg-line/40 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
