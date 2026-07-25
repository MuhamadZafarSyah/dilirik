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
    api.get<{ jobs: JobOption[] }>("/api/jobs").then((r) => setJobs(r.data.jobs)).catch(() => {})
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
      await patch({ jobPostingId: id, analysisId: null, revisedCvId: null, step: "REVIEW" })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card tape="blue" pin className="space-y-6">
      <div>
        <h2 className="hand text-3xl font-bold">Langkah 2 — Lowongan Incaran Kamu 🎯</h2>
        <p className="scrawl text-muted text-lg mt-0.5">
          CV terpilih: <span className="font-bold text-ink">{session.cv ? `${session.cv.title} (v${session.cv.version})` : "—"}</span>{" "}
          <button onClick={() => patch({ step: "CV" })} className="label text-xs text-red underline font-bold ml-1">
            Ganti CV
          </button>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["paste", "📋 Tempel Job Posting Baru"],
          ["pilih", "🗂 Pilih Lowongan Tersimpan"],
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
        <div className="space-y-4">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            placeholder="Paste deskripsi pekerjaan (requirements, kualifikasi, skill)..."
            className="w-full p-4 rounded-xl border-2 border-line bg-paper text-ink font-mono text-xs leading-relaxed outline-none focus:border-ink shadow-inner"
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Link URL Lowongan (Opsional)"
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label className="label text-xs font-bold uppercase tracking-wider block text-ink">Lowongan Tersimpan</label>
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="w-full bg-paper border-2 border-line text-sm font-semibold rounded-xl">
              <SelectValue placeholder="— Pilih Lowongan Target —" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.parsedJson.jobTitle || "Lowongan"}{job.parsedJson.company ? ` @ ${job.parsedJson.company}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <p className="text-red text-xs font-semibold">{error}</p>}

      <Button
        onClick={submit}
        isLoading={busy}
        disabled={busy || (tab === "paste" ? rawText.trim().length < 30 : !jobId)}
        variant="danger"
        size="lg"
        className="w-full"
      >
        Jalankan AI Match Analysis ⚡
      </Button>
    </Card>
  )
}
