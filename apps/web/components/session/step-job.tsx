"use client"

import { useEffect, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { JobOption, Patch, SessionDetail } from "./types"

export function StepJob({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const [tab, setTab] = useState<"paste" | "pilih">("paste")
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [jobId, setJobId] = useState("")
  const [rawText, setRawText] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ jobs: JobOption[] }>("/api/jobs")
      .then((r) => setJobs(r.data.jobs))
      .catch(() => {})
  }, [])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      let id = jobId
      if (tab === "paste") {
        const { data } = await api.post<{ job: { id: string } }>("/api/jobs", {
          rawText,
          ...(sourceUrl ? { sourceUrl } : {}),
        })
        id = data.job.id
      }
      // Ganti lowongan = hasil analisis & revisi lama tidak berlaku lagi
      await patch({ jobPostingId: id, analysisId: null, revisedCvId: null, step: "REVIEW" })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card className="relative space-y-5">
      <span className="tape-blue" aria-hidden />
      <h2 className="hand text-3xl font-bold">Langkah 2 — Target lowongan 🎯</h2>
      <p className="text-muted text-sm">
        CV terpilih: <span className="font-bold text-ink">{session.cv ? `${session.cv.title} (v${session.cv.version})` : "—"}</span>{" "}
        <button onClick={() => patch({ step: "CV" })} className="label text-xs underline hover:text-ink">
          ganti
        </button>
      </p>

      <div className="flex flex-wrap gap-2">
        {([
          ["paste", "📋 Tempel lowongan baru"],
          ["pilih", "🗂 Pilih yang tersimpan"],
        ] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={`label rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              tab === m ? "bg-ink text-paper shadow-paper -rotate-1" : "bg-paper border-2 border-line text-ink hover:border-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "paste" ? (
        <>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            placeholder="Paste deskripsi lowongan (requirements, kualifikasi, dll)…"
            className="w-full p-4 rounded-xl border-2 border-line bg-paper text-ink font-mono text-xs leading-relaxed outline-none focus:border-ink shadow-inner"
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Link lowongan (opsional)"
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
          />
        </>
      ) : (
        <Select value={jobId} onValueChange={setJobId}>
          <SelectTrigger className="w-full bg-paper border-2 border-line text-sm font-semibold rounded-xl">
            <SelectValue placeholder="— pilih lowongan —" />
          </SelectTrigger>
          <SelectContent>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.parsedJson.jobTitle || "Lowongan"}
                {job.parsedJson.company ? ` @ ${job.parsedJson.company}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {error && <p className="text-red text-xs font-semibold">{error}</p>}

      <Button
        onClick={submit}
        isLoading={busy}
        disabled={busy || (tab === "paste" ? rawText.trim().length < 30 : !jobId)}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {busy ? "Menyimpan lowongan…" : "Analisis sekarang ⚡"}
      </Button>
    </Card>
  )
}
