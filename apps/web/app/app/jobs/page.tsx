"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { JobParsed } from "@dilirik/shared"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { useI18n } from "@/lib/i18n"

type JobItem = { id: string; parsedJson: JobParsed; sourceUrl: string | null; createdAt: string }

export default function JobsPage() {
  const { t } = useI18n()
  const [jobs, setJobs] = useState<JobItem[] | null>(null)

  useEffect(() => {
    api.get<{ jobs: JobItem[] }>("/api/jobs").then((r) => setJobs(r.data.jobs)).catch(() => setJobs([]))
  }, [])

  if (!jobs) return <p className="scrawl text-2xl">{t("loading")}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="hand text-4xl">{t("jobs")}</h1>
        <Link href="/app/jobs/new" className="label bg-ink text-paper rounded-md px-4 py-2 text-sm font-bold transition-transform hover:rotate-[-2deg]">
          + Tambah lowongan
        </Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState title={t("emptyJobTitle")} note="Copy-paste job posting dari LinkedIn, Jobstreet, atau mana pun." ctaLabel={t("emptyJobCta")} ctaHref="/app/jobs/new" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job, i) => (
            <Link key={job.id} href={`/app/jobs/${job.id}`}>
              <Card className={i % 2 ? "rotate-[0.5deg]" : "rotate-[-0.5deg]"}>
                <p className="hand text-2xl">{job.parsedJson.jobTitle || "Untitled"}</p>
                <p className="label text-muted text-xs uppercase">{job.parsedJson.company ?? "—"}{job.parsedJson.level ? ` · ${job.parsedJson.level}` : ""}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {job.parsedJson.mustHaveSkills.slice(0, 6).map((skill) => (
                    <span key={skill} className="label bg-red/15 text-red rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase">{skill}</span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
