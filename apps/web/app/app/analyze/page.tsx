"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import type { JobParsed } from "@dilirik/shared"
import { api, errorMessage, isQuotaExceeded } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Sticky } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"

type CvOption = { id: string; title: string; version: number }
type JobOption = { id: string; parsedJson: JobParsed }

/** Analisis baru (Flow B inti): pilih CV + lowongan → jalankan. */
function AnalyzeForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { t } = useI18n()
  const [cvs, setCvs] = useState<CvOption[]>([])
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [cvId, setCvId] = useState(params.get("cvId") ?? "")
  const [jobPostingId, setJobPostingId] = useState(params.get("jobId") ?? "")
  const [error, setError] = useState<string | null>(null)
  const [quotaError, setQuotaError] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<{ cvs: CvOption[] }>("/api/cv").then((r) => setCvs(r.data.cvs)).catch(() => {})
    api.get<{ jobs: JobOption[] }>("/api/jobs").then((r) => setJobs(r.data.jobs)).catch(() => {})
  }, [])

  async function run() {
    setLoading(true)
    setError(null)
    setQuotaError(false)
    try {
      const { data } = await api.post("/api/analyze", { cvId, jobPostingId })
      router.push(`/app/analyze/${data.analysis.id}`)
    } catch (err) {
      if (isQuotaExceeded(err)) setQuotaError(true)
      else setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="hand text-4xl">{t("newAnalysis")} ⚡</h1>

      <div className="card bg-panel border-line relative space-y-5 rounded-lg border-2 p-6 shadow-paper">
        <span className="tape-red" aria-hidden />
        <div>
          <label className="label text-xs font-bold uppercase">1. Pilih CV</label>
          <select value={cvId} onChange={(e) => setCvId(e.target.value)}
            className="border-line bg-paper mt-1 w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink">
            <option value="">— pilih CV —</option>
            {cvs.map((cv) => <option key={cv.id} value={cv.id}>{cv.title} (v{cv.version})</option>)}
          </select>
          {cvs.length === 0 ? <Link href="/app/cv/new" className="text-red mt-1 inline-block text-xs underline">Belum ada CV → tambah dulu</Link> : null}
        </div>
        <div>
          <label className="label text-xs font-bold uppercase">2. Pilih lowongan</label>
          <select value={jobPostingId} onChange={(e) => setJobPostingId(e.target.value)}
            className="border-line bg-paper mt-1 w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink">
            <option value="">— pilih lowongan —</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.parsedJson.jobTitle || "Untitled"}{job.parsedJson.company ? ` — ${job.parsedJson.company}` : ""}</option>)}
          </select>
          {jobs.length === 0 ? <Link href="/app/jobs/new" className="text-red mt-1 inline-block text-xs underline">Belum ada lowongan → tambah dulu</Link> : null}
        </div>

        {quotaError ? (
          <Sticky tone="red">
            <p className="hand text-xl">{t("quotaExhausted")} 😢</p>
            <p className="mt-1 text-sm">Kuota reset otomatis awal bulan depan. <Link href="/pricing" className="underline">{t("seePricing")}</Link></p>
          </Sticky>
        ) : null}
        {error ? <p className="text-red text-sm">{error}</p> : null}

        <Button onClick={run} disabled={!cvId || !jobPostingId || loading} className="w-full justify-center">
          {loading ? "Menganalisis… (±15 detik)" : `⚡ ${t("runAnalysis")}`}
        </Button>
        <p className="text-muted text-center text-xs">Analisis pasangan CV+lowongan yang sama tidak memakan kuota (cache).</p>
      </div>
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense>
      <AnalyzeForm />
    </Suspense>
  )
}
