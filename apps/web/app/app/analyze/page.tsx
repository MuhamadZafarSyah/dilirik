"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"

type SessionItem = {
  id: string
  step: "CV" | "JOB" | "REVIEW" | "REVISE" | "FINISH"
  status: "DRAFT" | "COMPLETED"
  analysisId: string | null
  cv: { id: string; title: string; version: number } | null
  job: { id: string; parsedJson: { jobTitle?: string; company?: string | null } } | null
  updatedAt: string
}

const STEP_LABELS: Record<SessionItem["step"], string> = {
  CV: "1/5 · Pilih CV",
  JOB: "2/5 · Lowongan",
  REVIEW: "3/5 · Hasil analisis",
  REVISE: "4/5 · Revisi",
  FINISH: "5/5 · Selesai",
}

/**
 * Hub sesi analisis — satu alur utuh dalam 1 sesi:
 * upload/pilih CV → input lowongan → hasil AI → revisi (timpa teks) → download + simpan lamaran.
 * Sesi yang ditinggalkan otomatis jadi draft dan bisa dilanjutkan dari sini.
 */
function AnalyzeHub() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const cvIdParam = searchParams.get("cvId")
  const [sessions, setSessions] = useState<SessionItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api.get<{ sessions: SessionItem[] }>("/api/sessions")
      .then((r) => setSessions(r.data.sessions))
      .catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => { load() }, [load])

  async function startSession() {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<{ session: { id: string } }>("/api/sessions", {})
      // Datang dari halaman CV? Langsung pakai CV itu dan lompat ke step lowongan.
      if (cvIdParam) {
        await api.patch(`/api/sessions/${data.session.id}`, { cvId: cvIdParam, step: "JOB" })
      }
      router.push(`/app/analyze/session/${data.session.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  async function removeSession(id: string) {
    if (!confirm("Hapus draft sesi ini? CV & lowongan yang sudah tersimpan tidak ikut terhapus.")) return
    await api.delete(`/api/sessions/${id}`)
    load()
  }

  const drafts = (sessions ?? []).filter((s) => s.status === "DRAFT")
  const completed = (sessions ?? []).filter((s) => s.status === "COMPLETED").slice(0, 5)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="hand text-4xl">Analisis ⚡</h1>
        <p className="text-muted mt-1 text-sm">
          Satu sesi utuh: pilih/upload CV → tempel lowongan → lihat hasil AI → revisi (timpa teks CV jadi versi baru) → download PDF → simpan ke lamaran. Keluar di tengah jalan? Aman — otomatis jadi draft.
        </p>
      </div>

      <Card className="relative space-y-3 text-center">
        <span className="tape" aria-hidden />
        <p className="scrawl text-2xl">Mulai dari sini ↓</p>
        <Button onClick={startSession} disabled={busy} className="w-full justify-center">
          {busy ? t("loading") : "⚡ Mulai sesi analisis baru"}
        </Button>
        {error ? <p className="text-red text-sm">{error}</p> : null}
      </Card>

      <section className="space-y-3">
        <h2 className="scrawl text-2xl">Draft sesi 📌</h2>
        {sessions === null ? (
          <p className="text-muted text-sm">{t("loading")}</p>
        ) : drafts.length === 0 ? (
          <p className="text-muted text-sm">Belum ada draft — semua sesi kamu sudah tuntas ✔︎</p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((s) => (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="label bg-yellow/30 inline-block rounded-sm px-2 py-0.5 text-xs font-bold uppercase">{STEP_LABELS[s.step]}</p>
                    <p className="mt-1 truncate text-sm font-bold">
                      {s.cv ? `${s.cv.title} (v${s.cv.version})` : "CV belum dipilih"}
                      {" → "}
                      {s.job?.parsedJson?.jobTitle ?? "lowongan belum diisi"}
                      {s.job?.parsedJson?.company ? ` @ ${s.job.parsedJson.company}` : ""}
                    </p>
                    <p className="text-muted text-xs">terakhir diubah {new Date(s.updatedAt).toLocaleString("id-ID")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/app/analyze/session/${s.id}`} className="label bg-ink text-paper rounded-md px-4 py-2 text-sm font-bold">Lanjutkan →</Link>
                    <Button variant="danger" onClick={() => removeSession(s.id)}>Hapus</Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {completed.length > 0 ? (
        <section className="space-y-3">
          <h2 className="scrawl text-2xl">Sesi selesai ✔︎</h2>
          <ul className="space-y-2">
            {completed.map((s) => (
              <li key={s.id} className="border-line bg-panel flex flex-wrap items-center justify-between gap-2 rounded-md border-2 px-4 py-2">
                <p className="truncate text-sm">
                  {s.cv ? `${s.cv.title}` : "CV"} → {s.job?.parsedJson?.jobTitle ?? "lowongan"}
                </p>
                <div className="flex gap-3">
                  <Link href={`/app/analyze/session/${s.id}`} className="label text-xs underline">buka sesi</Link>
                  {s.analysisId ? (
                    <Link href={`/app/analyze/${s.analysisId}`} className="label text-xs underline">detail analisis</Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<p className="scrawl text-2xl">Memuat…</p>}>
      <AnalyzeHub />
    </Suspense>
  )
}
