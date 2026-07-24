"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import type { JobParsed } from "@dilirik/shared"
import { api, errorMessage, isQuotaExceeded } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Sticky } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
          <Select value={cvId} onValueChange={setCvId}>
            <SelectTrigger className="mt-1" aria-label="Pilih CV">
              <SelectValue placeholder="— pilih CV —" />
            </SelectTrigger>
            <SelectContent>
              {cvs.map((cv) => (
                <SelectItem key={cv.id} value={cv.id}>{cv.title} (v{cv.version})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cvs.length === 0 ? <Link href="/app/cv/new" className="text-red mt-1 inline-block text-xs underline">Belum ada CV → tambah dulu</Link> : null}
        </div>
        <div>
          <label className="label text-xs font-bold uppercase">2. Pilih lowongan</label>
          <Select value={jobPostingId} onValueChange={setJobPostingId}>
            <SelectTrigger className="mt-1" aria-label="Pilih lowongan">
              <SelectValue placeholder="— pilih lowongan —" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.parsedJson.jobTitle || "Untitled"}{job.parsedJson.company ? ` — ${job.parsedJson.company}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
