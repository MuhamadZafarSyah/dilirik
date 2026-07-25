"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { CvStructured, Gap, JobParsed, SessionStep, Suggestion } from "@dilirik/shared"
import { api, errorMessage, isQuotaExceeded } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ScoreGauge } from "@/components/ui/gauge"
import { DownloadCvButton } from "@/components/pdf/download-cv-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"

/* ================= Types ================= */

type SessionDetail = {
  id: string
  step: SessionStep
  status: "DRAFT" | "COMPLETED"
  cvId: string | null
  jobPostingId: string | null
  analysisId: string | null
  revisedCvId: string | null
  applicationId: string | null
  cv: { id: string; title: string; version: number; language: string } | null
  job: { id: string; parsedJson: JobParsed } | null
  revisedCv: { id: string; title: string; version: number; language: string } | null
}

type Patch = (input: Record<string, unknown>) => Promise<void>
type CvOption = { id: string; title: string; version: number }
type JobOption = { id: string; parsedJson: JobParsed }
type CvFull = { id: string; title: string; version: number; language: string; rawText: string; structuredJson: CvStructured }
type AnalysisDetail = {
  id: string
  matchScore: number
  gapsJson: Gap[]
  suggestionsJson: { suggestions: Suggestion[] }
  language: string
}

const STEPS: Array<{ key: SessionStep; label: string }> = [
  { key: "CV", label: "CV" },
  { key: "JOB", label: "Lowongan" },
  { key: "REVIEW", label: "Hasil" },
  { key: "REVISE", label: "Revisi" },
  { key: "FINISH", label: "Selesai" },
]

/* ================= Helpers ================= */

function squash(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Terapkan 1 saran ke teks CV: exact match dulu, lalu toleran spasi/baris baru. */
function applySuggestionToText(text: string, s: Suggestion): { text: string; applied: boolean } {
  if (!s.before || !s.after) return { text, applied: false }
  if (text.includes(s.before)) return { text: text.replace(s.before, s.after), applied: true }
  try {
    const pattern = s.before.trim().split(/\s+/).map(escapeRegExp).join("\\s+")
    const re = new RegExp(pattern)
    if (re.test(text)) return { text: text.replace(re, s.after), applied: true }
  } catch {
    /* pattern tidak valid — biarkan manual */
  }
  return { text, applied: false }
}

/* ================= Page ================= */

/**
 * Wizard sesi analisis — SATU sesi utuh:
 * 1. CV (pilih master / upload / paste) → 2. lowongan → 3. hasil AI →
 * 4. revisi (timpa teks CV → versi baru, tampilan data tidak diubah) →
 * 5. download PDF + simpan ke lamaran.
 * Setiap langkah tersimpan ke server — keluar kapan pun, sesi jadi draft.
 */
export default function SessionWizardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const [session, setSession] = useState<SessionDetail | null>(null)

  const patch: Patch = useCallback(async (input) => {
    const { data } = await api.patch<{ session: SessionDetail }>(`/api/sessions/${sessionId}`, input)
    setSession(data.session)
  }, [sessionId])

  useEffect(() => {
    api.get<{ session: SessionDetail }>(`/api/sessions/${sessionId}`)
      .then((r) => setSession(r.data.session))
      .catch(() => router.push("/app/analyze"))
  }, [sessionId, router])

  if (!session) return <p className="scrawl text-2xl">{t("loading")}</p>
  const stepIndex = STEPS.findIndex((s) => s.key === session.step)

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="hand text-4xl">Sesi analisis ⚡</h1>
          <p className="label text-muted text-xs uppercase">
            {session.status === "DRAFT" ? "draft — progres tersimpan otomatis, aman ditinggal" : "sesi selesai"}
          </p>
        </div>
        <Link href="/app/analyze" className="label text-sm underline">← semua sesi</Link>
      </div>

      {/* Stepper — langkah yang sudah lewat bisa diklik untuk mundur */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => {
          const isCurrent = i === stepIndex
          const isPast = i < stepIndex
          return (
            <button
              key={s.key}
              disabled={!isPast}
              onClick={() => patch({ step: s.key })}
              className={`label rounded-sm px-3 py-1.5 text-xs font-bold uppercase ${
                isCurrent
                  ? "bg-ink text-paper rotate-[-1deg]"
                  : isPast
                    ? "bg-green/20 text-green cursor-pointer"
                    : "bg-panel border-line border-2 opacity-60"
              }`}
            >
              {i + 1}. {s.label}{isPast ? " ✓" : ""}
            </button>
          )
        })}
      </div>

      {session.step === "CV" ? <StepCv patch={patch} /> : null}
      {session.step === "JOB" ? <StepJob session={session} patch={patch} /> : null}
      {session.step === "REVIEW" ? <StepReview session={session} patch={patch} /> : null}
      {session.step === "REVISE" ? <StepRevise session={session} patch={patch} /> : null}
      {session.step === "FINISH" ? <StepFinish session={session} patch={patch} /> : null}
    </div>
  )
}

/* ================= Step 1: CV ================= */

function StepCv({ patch }: { patch: Patch }) {
  const [tab, setTab] = useState<"pilih" | "upload" | "paste">("pilih")
  const [cvs, setCvs] = useState<CvOption[]>([])
  const [cvId, setCvId] = useState("")
  const [title, setTitle] = useState("")
  const [rawText, setRawText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      const ext = droppedFile.name.toLowerCase()
      if (ext.endsWith(".pdf") || ext.endsWith(".docx")) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError("Format file harus PDF atau DOCX.")
      }
    }
  }

  useEffect(() => {
    api.get<{ cvs: CvOption[] }>("/api/cv").then((r) => {
      setCvs(r.data.cvs)
      if (r.data.cvs.length === 0) setTab("upload")
    }).catch(() => {})
  }, [])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      let newCvId = cvId
      if (tab === "upload") {
        if (!file) throw new Error("__PILIH_FILE__")
        const form = new FormData()
        form.append("file", file)
        if (title) form.append("title", title)
        const { data } = await api.post<{ cv: { id: string } }>("/api/cv/upload", form)
        newCvId = data.cv.id
      } else if (tab === "paste") {
        const { data } = await api.post<{ cv: { id: string } }>("/api/cv", { title: title || "CV Saya", rawText })
        newCvId = data.cv.id
      }
      await patch({ cvId: newCvId, step: "JOB" })
    } catch (err) {
      setError(err instanceof Error && err.message === "__PILIH_FILE__" ? "Pilih file dulu ya" : errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card className="relative space-y-5">
      <span className="tape" aria-hidden />
      <h2 className="hand text-3xl">Langkah 1 — CV kamu 📄</h2>

      <div className="flex flex-wrap gap-2">
        {([["pilih", "🗂 Pilih master CV"], ["upload", "📎 Upload file"], ["paste", "✏︎ Paste teks"]] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={`label rounded-md px-4 py-2 text-sm font-bold ${tab === m ? "bg-ink text-paper rotate-[-1deg]" : "bg-panel border-line border-2"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pilih" ? (
        <div className="space-y-2">
          <label className="label text-xs font-bold uppercase">Master CV tersimpan</label>
          <Select value={cvId} onValueChange={setCvId}>
            <SelectTrigger><SelectValue placeholder="— pilih CV —" /></SelectTrigger>
            <SelectContent>
              {cvs.map((cv) => (
                <SelectItem key={cv.id} value={cv.id}>{cv.title} (v{cv.version})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cvs.length === 0 ? <p className="text-muted text-xs">Belum ada CV tersimpan — pakai tab upload / paste.</p> : null}
        </div>
      ) : (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Judul CV (mis. “CV Frontend 2026”)'
          className="border-line bg-paper focus:border-ink w-full rounded-md border-2 px-3 py-2 text-sm outline-none"
        />
      )}

      {tab === "upload" ? (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed block cursor-pointer rounded-md p-8 text-center transition-all ${
            isDragging
              ? "border-ink bg-yellow/30 scale-[1.02] shadow-paper -rotate-1"
              : "border-line bg-paper hover:border-ink"
          }`}
        >
          <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <span className="hand text-2xl">
            {isDragging ? "Lepaskan File di Sini! 📥" : file ? file.name : "Jatuhkan PDF/DOCX di sini 📄"}
          </span>
          <p className="text-muted mt-1 text-xs">Maks. 5MB · otomatis tersimpan juga ke master CV</p>
        </label>
      ) : null}

      {tab === "paste" ? (
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={10}
          placeholder="Paste seluruh isi CV kamu di sini…"
          className="border-line bg-paper focus:border-ink w-full rounded-md border-2 px-3 py-2 font-mono text-sm outline-none"
        />
      ) : null}

      {error ? <p className="text-red text-sm">{error}</p> : null}
      <Button
        onClick={submit}
        disabled={busy || (tab === "pilih" && !cvId) || (tab === "paste" && rawText.trim().length < 50)}
        className="w-full justify-center"
      >
        {busy ? "Memproses CV…" : "Lanjut ke lowongan →"}
      </Button>
    </Card>
  )
}

/* ================= Step 2: Lowongan ================= */

function StepJob({ session, patch }: { session: SessionDetail; patch: Patch }) {
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
      <h2 className="hand text-3xl">Langkah 2 — Target lowongan 🎯</h2>
      <p className="text-muted text-sm">
        CV terpilih: <span className="font-bold">{session.cv ? `${session.cv.title} (v${session.cv.version})` : "—"}</span>{" "}
        <button onClick={() => patch({ step: "CV" })} className="label text-xs underline">ganti</button>
      </p>

      <div className="flex flex-wrap gap-2">
        {([["paste", "📋 Tempel lowongan baru"], ["pilih", "🗂 Pilih yang tersimpan"]] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={`label rounded-md px-4 py-2 text-sm font-bold ${tab === m ? "bg-ink text-paper rotate-[-1deg]" : "bg-panel border-line border-2"}`}
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
            className="border-line bg-paper focus:border-ink w-full rounded-md border-2 px-3 py-2 text-sm outline-none"
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Link lowongan (opsional)"
            className="border-line bg-paper focus:border-ink w-full rounded-md border-2 px-3 py-2 text-sm outline-none"
          />
        </>
      ) : (
        <Select value={jobId} onValueChange={setJobId}>
          <SelectTrigger><SelectValue placeholder="— pilih lowongan —" /></SelectTrigger>
          <SelectContent>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.parsedJson.jobTitle || "Lowongan"}{job.parsedJson.company ? ` @ ${job.parsedJson.company}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {error ? <p className="text-red text-sm">{error}</p> : null}
      <Button
        onClick={submit}
        disabled={busy || (tab === "paste" ? rawText.trim().length < 30 : !jobId)}
        className="w-full justify-center"
      >
        {busy ? "Menyimpan lowongan…" : "Analisis sekarang ⚡"}
      </Button>
    </Card>
  )
}

/* ================= Step 3: Hasil analisis ================= */

function StepReview({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const { t } = useI18n()
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null)
  const [quotaError, setQuotaError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (session.analysisId) {
          const r = await api.get<{ analysis: AnalysisDetail }>(`/api/analyze/${session.analysisId}`)
          if (!cancelled) setAnalysis(r.data.analysis)
        } else {
          const r = await api.post<{ analysis: AnalysisDetail }>("/api/analyze", {
            cvId: session.cvId,
            jobPostingId: session.jobPostingId,
          })
          if (cancelled) return
          setAnalysis(r.data.analysis)
          await patch({ analysisId: r.data.analysis.id })
        }
      } catch (err) {
        if (isQuotaExceeded(err)) setQuotaError(true)
        else setError(errorMessage(err))
      }
    }
    load()
    return () => { cancelled = true }
  }, [session.analysisId, session.cvId, session.jobPostingId, patch])

  if (quotaError) {
    return (
      <Sticky tone="red" className="space-y-2">
        <p className="font-bold">{t("quotaExhausted")}</p>
        <p className="text-sm">Draft sesi ini tersimpan — lanjutkan lagi setelah kuota di-reset.</p>
      </Sticky>
    )
  }
  if (error) {
    return (
      <Card className="space-y-3">
        <p className="text-red text-sm">{error}</p>
        <Button variant="secondary" onClick={() => patch({ step: "JOB" })}>← kembali ke lowongan</Button>
      </Card>
    )
  }
  if (!analysis) return <p className="scrawl text-2xl">AI lagi baca CV vs lowongan… (±15 detik) ⏳</p>

  const realGaps = analysis.gapsJson.filter((g) => g.type === "real")
  const presentationGaps = analysis.gapsJson.filter((g) => g.type !== "real")
  const suggestions = analysis.suggestionsJson.suggestions ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-6">
        <ScoreGauge score={analysis.matchScore} />
        <div>
          <h2 className="hand text-3xl">Langkah 3 — Hasil analisis 🔍</h2>
          <p className="text-muted text-sm">
            {session.cv?.title} (v{session.cv?.version}) vs {session.job?.parsedJson?.jobTitle ?? "lowongan"}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="scrawl text-2xl">Yang kurang / perlu ditonjolkan</h3>
        {analysis.gapsJson.length === 0 ? (
          <p className="text-muted text-sm">Tidak ada gap berarti — CV kamu sudah relevan ✔︎</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {realGaps.map((gap, i) => (
              <Sticky key={`r-${i}`} tone="red" className="space-y-1 text-sm">
                <p className="label text-xs font-bold uppercase">{t("realGap")} · {gap.skill}</p>
                <p>{gap.explanation}</p>
                <p className="font-bold">💡 {gap.advice}</p>
              </Sticky>
            ))}
            {presentationGaps.map((gap, i) => (
              <Sticky key={`p-${i}`} tone="yellow" className="space-y-1 text-sm">
                <p className="label text-xs font-bold uppercase">{t("presentationGap")} · {gap.skill}</p>
                <p>{gap.explanation}</p>
                <p className="font-bold">💡 {gap.advice}</p>
              </Sticky>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="scrawl text-2xl">Saran revisi ({suggestions.length})</h3>
        {suggestions.length === 0 ? (
          <p className="text-muted text-sm">Tidak ada saran revisi yang lolos cek fakta.</p>
        ) : (
          <ul className="space-y-3">
            {suggestions.map((s, i) => (
              <li key={i}>
                <Card className="space-y-2 text-sm">
                  <p className="label text-xs font-bold uppercase">{s.section}</p>
                  <p className="text-muted line-through">{s.before}</p>
                  <p className="font-bold">{s.after}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => patch({ step: "REVISE" })}>✏︎ Lanjut revisi CV →</Button>
        <Button variant="secondary" onClick={() => patch({ step: "JOB", analysisId: null })}>← ganti lowongan</Button>
      </div>
    </div>
  )
}

/* ================= Step 4: Revisi (timpa teks CV) ================= */

function StepRevise({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const [cvFull, setCvFull] = useState<CvFull | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null)
  const [text, setText] = useState("")
  const [applied, setApplied] = useState<Record<number, "ok" | "manual">>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session.cvId || !session.analysisId) return
    Promise.all([
      api.get<{ cv: CvFull }>(`/api/cv/${session.cvId}`),
      api.get<{ analysis: AnalysisDetail }>(`/api/analyze/${session.analysisId}`),
    ]).then(([cvR, aR]) => {
      setCvFull(cvR.data.cv)
      setAnalysis(aR.data.analysis)
      setText(cvR.data.cv.rawText)
    }).catch(() => setError("Gagal memuat data revisi — coba muat ulang halaman"))
  }, [session.cvId, session.analysisId])

  if (error && !cvFull) return <p className="text-red text-sm">{error}</p>
  if (!cvFull || !analysis) return <p className="scrawl text-2xl">Memuat…</p>

  const suggestions = analysis.suggestionsJson.suggestions ?? []
  const changed = squash(text) !== squash(cvFull.rawText)

  function applyOne(i: number) {
    const suggestion = suggestions[i]
    if (!suggestion) return
    const res = applySuggestionToText(text, suggestion)
    setApplied((prev) => ({ ...prev, [i]: res.applied ? "ok" : "manual" }))
    if (res.applied) setText(res.text)
  }

  function applyAll() {
    let current = text
    const state: Record<number, "ok" | "manual"> = {}
    suggestions.forEach((s, i) => {
      const res = applySuggestionToText(current, s)
      state[i] = res.applied ? "ok" : "manual"
      if (res.applied) current = res.text
    })
    setText(current)
    setApplied(state)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<{ cv: { id: string } }>(`/api/analyze/${session.analysisId}/apply`, { newRawText: text })
      await patch({ revisedCvId: data.cv.id, step: "FINISH" })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="hand text-3xl">Langkah 4 — Revisi teks CV ✏︎</h2>
        <p className="text-muted text-sm">
          Teks CV DITIMPA jadi <span className="font-bold">versi baru</span> — versi lama tetap aman untuk compare. Tampilan/struktur datanya tidak diubah.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="scrawl text-2xl">Saran ({suggestions.length})</h3>
            {suggestions.length > 0 ? (
              <Button variant="secondary" onClick={applyAll}>Terapkan semua</Button>
            ) : null}
          </div>
          {suggestions.length === 0 ? (
            <p className="text-muted text-sm">Tidak ada saran otomatis — edit teks langsung di kanan.</p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <Card className="space-y-2 text-sm">
                    <p className="label text-xs font-bold uppercase">{s.section}</p>
                    <p className="text-muted line-through">{s.before}</p>
                    <p className="font-bold">{s.after}</p>
                    {applied[i] === "ok" ? (
                      <p className="label text-green text-xs font-bold uppercase">✓ diterapkan ke teks</p>
                    ) : applied[i] === "manual" ? (
                      <p className="label text-red text-xs font-bold uppercase">teks asli tidak ketemu persis — edit manual ya</p>
                    ) : (
                      <Button variant="secondary" onClick={() => applyOne(i)}>Terapkan</Button>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="scrawl text-2xl">Teks CV (bisa diedit)</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={22}
            className="border-line bg-paper focus:border-ink w-full rounded-md border-2 px-3 py-2 font-mono text-xs outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={busy || !changed}>
              {busy ? "Menyimpan versi baru…" : "💾 Simpan sebagai versi baru →"}
            </Button>
            <Button variant="secondary" onClick={() => { setText(cvFull.rawText); setApplied({}) }}>Reset</Button>
          </div>
          {!changed ? (
            <p className="text-muted text-xs">Belum ada perubahan — terapkan saran atau edit teks dulu supaya hasil compare tidak sama persis.</p>
          ) : null}
          {error ? <p className="text-red text-sm">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}

/* ================= Step 5: Selesai ================= */

function StepFinish({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const { t } = useI18n()
  const [revised, setRevised] = useState<CvFull | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session.revisedCvId) return
    api.get<{ cv: CvFull }>(`/api/cv/${session.revisedCvId}`).then((r) => setRevised(r.data.cv)).catch(() => {})
  }, [session.revisedCvId])

  async function saveApplication() {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<{ application: { id: string } }>("/api/applications", {
        cvId: session.revisedCvId ?? session.cvId,
        jobPostingId: session.jobPostingId,
        ...(session.analysisId ? { analysisId: session.analysisId } : {}),
      })
      await patch({ applicationId: data.application.id, status: "COMPLETED" })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card className="relative space-y-5 text-center">
      <span className="tape-red" aria-hidden />
      <h2 className="hand text-3xl">Revisi CV siap! 🎉</h2>
      <p className="text-muted text-sm">
        Tersimpan sebagai <span className="font-bold">{revised ? `${revised.title} (v${revised.version})` : "versi baru"}</span> — versi lama tidak berubah.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {revised ? (
          <DownloadCvButton rawText={revised.rawText} title={revised.title} version={revised.version} language={revised.language} />
        ) : null}
        {session.revisedCvId && session.cvId ? (
          <Link
            href={`/app/cv/${session.revisedCvId}/compare?with=${session.cvId}`}
            className="label bg-panel border-line rounded-md border-2 px-4 py-2 text-sm font-bold"
          >
            {t("compare")} sebelum/sesudah
          </Link>
        ) : null}
      </div>

      {session.applicationId ? (
        <p className="scrawl text-green text-2xl">
          tersimpan ke lamaran ✓ <Link href="/app/applications" className="underline">lihat semua lamaran</Link>
        </p>
      ) : (
        <Button onClick={saveApplication} disabled={busy}>
          {busy ? "Menyimpan…" : `📌 ${t("saveToTracker")}`}
        </Button>
      )}
      {error ? <p className="text-red text-sm">{error}</p> : null}

      <p className="text-muted text-xs">Sesi ini masuk riwayat — mulai sesi baru kapan saja dari halaman Analisis.</p>
    </Card>
  )
}
