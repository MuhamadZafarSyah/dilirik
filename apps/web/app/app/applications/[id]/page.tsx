"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiArrowLeft, FiTrash2, FiCheck, FiFileText, FiZap, FiEdit3 } from "react-icons/fi"
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, type ApplicationStatus, type JobParsed } from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { useI18n } from "@/lib/i18n"
import { useToast } from "@/components/ui/toast"

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

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang, t } = useI18n()
  const { toast } = useToast()
  const [item, setItem] = useState<AppDetail | null>(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    api
      .get<{ application: AppDetail }>(`/api/applications/${id}`)
      .then((r) => {
        setItem(r.data.application)
        setNotes(r.data.application.notes ?? "")
      })
      .catch(() => router.push("/app/applications"))
  }, [id, router])

  if (!item) {
    return (
      <div className="space-y-6">
        <div className="bg-line/30 h-10 w-48 animate-pulse rounded-lg" />
        <div className="bg-line/20 h-96 animate-pulse rounded-xl border border-line" />
      </div>
    )
  }

  async function update(payload: { status?: ApplicationStatus; notes?: string }) {
    setError(null)
    if (payload.notes !== undefined) setSavingNotes(true)
    try {
      const { data } = await api.patch<{ application: AppDetail }>(`/api/applications/${id}`, payload)
      setItem((prev) => (prev ? { ...prev, ...data.application } : prev))
      toast("Status lamaran berhasil diperbarui!", "success")
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Back button */}
      <Link href="/app/applications" className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1">
        <FiArrowLeft /> Kembali ke Tracker Pelamaran
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="label bg-blue/20 text-blue border border-blue/40 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">
              {item.jobPosting.parsedJson.company ?? "Perusahaan"}
            </span>
          </div>
          <h1 className="hand text-4xl sm:text-5xl font-bold mt-1 text-ink">
            {item.jobPosting.parsedJson.jobTitle || "Posisi Tanpa Judul"}
          </h1>
        </div>
        <StatusBadge status={item.status} lang={lang} />
      </div>

      {/* Status Selector Card */}
      <Card tape="yellow" pin className="space-y-3">
        <h3 className="label text-xs font-bold uppercase tracking-wider text-muted">
          Ubah Status Pipeline Pelamaran
        </h3>
        <div className="flex flex-wrap gap-2">
          {APPLICATION_STATUSES.map((status) => {
            const active = item.status === status
            return (
              <button
                key={status}
                onClick={() => update({ status })}
                className={`label rounded-xl px-3.5 py-2 text-xs font-bold uppercase transition-all select-none cursor-pointer ${
                  active
                    ? "bg-ink text-paper shadow-paper -rotate-1"
                    : "bg-paper border-2 border-line text-ink hover:border-ink"
                }`}
              >
                {APPLICATION_STATUS_LABELS[status][lang]} {active ? "✓" : ""}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Info CV & Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card rotate={-0.5} tape="blue">
          <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-2">
            CV yang Digunakan
          </h3>
          <Link href={`/app/cv/${item.cv.id}`} className="hand text-2xl font-bold text-ink hover:text-blue transition-colors block">
            {item.cv.title} (v{item.cv.version}) 📄
          </Link>
          {item.matchScore !== null && (
            <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
              <span className="scrawl text-muted text-sm font-bold">Skor Kecocokan AI:</span>
              <span className="hand text-3xl font-bold text-ink">{item.matchScore}/100</span>
            </div>
          )}
        </Card>

        <Card rotate={0.5}>
          <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-2">
            Riwayat Sesi Analisis
          </h3>
          {item.analyses.length === 0 ? (
            <p className="scrawl text-muted text-sm">Belum ada riwayat analisis khusus.</p>
          ) : (
            <ul className="space-y-2">
              {item.analyses.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-xs border-b border-line/60 pb-1.5">
                  <Link href={`/app/analyze/${a.id}`} className="label text-red hover:underline font-bold">
                    ⚡ Skor {a.matchScore}/100
                  </Link>
                  <span className="text-muted text-[11px]">
                    {new Date(a.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Catatan Pelamaran */}
      <Card tape="red">
        <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1">
          <FiEdit3 className="h-4 w-4" /> Catatan Pribadi Pelamaran
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Misal: Interview HR tanggal 28 Juli via Google Meet, persiapkan portofolio UI/UX..."
          className="w-full p-4 rounded-xl border-2 border-line bg-paper text-ink text-sm font-medium outline-none focus:border-ink shadow-inner leading-relaxed"
        />
        <div className="mt-3 flex items-center justify-between">
          <Button onClick={() => update({ notes })} isLoading={savingNotes} variant="primary">
            Simpan Catatan
          </Button>
          {error && <p className="text-red text-xs font-semibold">{error}</p>}
        </div>
      </Card>

      {/* Footer controls */}
      <div className="flex items-center justify-between pt-4 border-t border-line">
        <Link href="/app/applications">
          <Button variant="outline">← Kembali ke Semua Lamaran</Button>
        </Link>
        <Button
          variant="danger"
          icon={<FiTrash2 />}
          onClick={async () => {
            if (confirm("Hapus lamaran ini dari tracker?")) {
              await api.delete(`/api/applications/${id}`)
              router.push("/app/applications")
            }
          }}
        >
          Hapus Lamaran
        </Button>
      </div>
    </div>
  )
}
