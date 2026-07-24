"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { JobParsed } from "@dilirik/shared"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"

type JobDetail = { id: string; parsedJson: JobParsed; rawText: string; sourceUrl: string | null }

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const [job, setJob] = useState<JobDetail | null>(null)

  useEffect(() => {
    api.get<{ job: JobDetail }>(`/api/jobs/${id}`).then((r) => setJob(r.data.job)).catch(() => router.push("/app/jobs"))
  }, [id, router])

  if (!job) return <p className="scrawl text-2xl">{t("loading")}</p>
  const p = job.parsedJson

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="hand text-4xl">{p.jobTitle || "Untitled"}</h1>
          <p className="label text-muted text-xs uppercase">{p.company ?? "—"}{p.level ? ` · ${p.level}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/analyze?jobId=${job.id}`} className="label bg-red text-paper rounded-md px-4 py-2 text-sm font-bold">⚡ Analisis dengan CV-ku</Link>
          <Button variant="danger" onClick={async () => {
            if (confirm("Hapus lowongan ini?")) {
              await api.delete(`/api/jobs/${job.id}`)
              router.push("/app/jobs")
            }
          }}>Hapus</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="rotate-[-0.5deg]">
            <h3 className="label text-red text-xs font-bold uppercase">Wajib (must-have)</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.mustHaveSkills.map((skill) => (
                <span key={skill} className="label bg-red/15 text-red rounded-sm px-2 py-0.5 text-xs font-bold">{skill}</span>
              ))}
            </div>
          </Card>
          <Card className="rotate-[0.5deg]">
            <h3 className="label text-blue text-xs font-bold uppercase">Nilai plus (nice-to-have)</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.niceToHaveSkills.length === 0 ? <span className="text-muted text-xs">—</span> : null}
              {p.niceToHaveSkills.map((skill) => (
                <span key={skill} className="label bg-blue/15 text-blue rounded-sm px-2 py-0.5 text-xs font-semibold">{skill}</span>
              ))}
            </div>
          </Card>
          {p.requirements.length > 0 ? (
            <Card className="rotate-[-0.5deg]">
              <h3 className="label text-xs font-bold uppercase">Requirements</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {p.requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </Card>
          ) : null}
        </div>
        <div>
          <h2 className="scrawl text-2xl">Teks asli</h2>
          <pre className="card bg-paper border-line mt-4 max-h-[32rem] overflow-auto rounded-lg border-2 p-4 text-xs whitespace-pre-wrap">{job.rawText}</pre>
          {job.sourceUrl ? <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="label mt-2 inline-block text-xs underline">Buka sumber ↗</a> : null}
        </div>
      </div>
    </div>
  )
}
