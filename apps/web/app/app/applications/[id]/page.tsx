"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { APPLICATION_STATUSES, type ApplicationStatus, type JobParsed } from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { useI18n } from "@/lib/i18n"

type AppDetail = {
  id: string
  status: ApplicationStatus
  notes: string | null
  matchScore: number | null
  appliedAt: string | null
  cv: { id: string; title: string; version: number }
  jobPosting: { id: string; parsedJson: JobParsed }
  analyses: Array<{ id: string; matchScore: number; createdAt: string }>
}

/** Detail lamaran: ubah status pipeline + catatan (Flow D). */
export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang, t } = useI18n()
  const [item, setItem] = useState<AppDetail | null>(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get<{ application: AppDetail }>(`/api/applications/${id}`)
      .then((r) => {
        setItem(r.data.application)
        setNotes(r.data.application.notes ?? "")
      })
      .catch(() => router.push("/app/applications"))
  }, [id, router])

  if (!item) return <p className="scrawl text-2xl">{t("loading")}</p>

  async function update(payload: { status?: ApplicationStatus; notes?: string }) {
    setError(null)
    try {
      const { data } = await api.patch(`/api/applications/${id}`, payload)
      setItem((prev) => (prev ? { ...prev, ...data.application } : prev))
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="hand text-4xl">{item.jobPosting.parsedJson.jobTitle || "Untitled"}</h1>
          <p className="label text-muted text-xs uppercase">{item.jobPosting.parsedJson.company ?? "—"}</p>
        </div>
        <StatusBadge status={item.status} lang={lang} />
      </div>

      {/* Pipeline status */}
      <Card>
        <p className="label text-xs font-bold uppercase">Status lamaran</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {APPLICATION_STATUSES.map((status) => (
            <button key={status} onClick={() => update({ status })}
              className={`label rounded-sm px-3 py-1.5 text-xs font-bold uppercase transition-transform hover:rotate-[-2deg] ${
                item.status === status ? "bg-ink text-paper" : "bg-panel border-line border-2"
              }`}>
              {status}
            </button>
          ))}
        </div>
      </Card>

      {/* Info CV + analisis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rotate-[-0.5deg]">
          <p className="label text-xs font-bold uppercase">CV yang dipakai</p>
          <Link href={`/app/cv/${item.cv.id}`} className="hand mt-1 block text-2xl underline">{item.cv.title} (v{item.cv.version})</Link>
          {item.matchScore !== null ? <p className="text-muted mt-2 text-sm">Skor kecocokan: <span className="hand text-ink text-2xl">{item.matchScore}</span></p> : null}
        </Card>
        <Card className="rotate-[0.5deg]">
          <p className="label text-xs font-bold uppercase">Riwayat analisis</p>
          {item.analyses.length === 0 ? <p className="text-muted mt-2 text-sm">Belum ada.</p> : (
            <ul className="mt-2 space-y-1">
              {item.analyses.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/analyze/${a.id}`} className="text-sm underline">Skor {a.matchScore} · {new Date(a.createdAt).toLocaleDateString("id-ID")}</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Catatan */}
      <Card>
        <p className="label text-xs font-bold uppercase">Catatan</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}
          placeholder="Mis. “Interview HR hari Jumat jam 10, siapkan portofolio…”"
          className="border-line bg-paper mt-2 w-full rounded-md border-2 p-3 text-sm outline-none focus:border-ink" />
        <div className="mt-2 flex items-center gap-3">
          <Button onClick={() => update({ notes })}>Simpan catatan</Button>
          {saved ? <span className="scrawl text-green text-xl">tersimpan ✓</span> : null}
        </div>
      </Card>

      {error ? <p className="text-red text-sm">{error}</p> : null}

      <div className="flex items-center justify-between">
        <Link href="/app/applications" className="label text-sm underline">← semua lamaran</Link>
        <Button variant="danger" onClick={async () => {
          if (confirm("Hapus lamaran ini dari tracker?")) {
            await api.delete(`/api/applications/${id}`)
            router.push("/app/applications")
          }
        }}>Hapus lamaran</Button>
      </div>
    </div>
  )
}
