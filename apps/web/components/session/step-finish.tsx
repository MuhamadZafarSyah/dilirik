"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FiCheckCircle, FiLayers } from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CopyButton } from "@/components/ui/copy-button"
import { DownloadCvButton } from "@/components/pdf/download-cv-button"
import { useI18n } from "@/lib/i18n"
import type { CvFull, Patch, SessionDetail } from "./types"

export function StepFinish({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const { t } = useI18n()
  const [revised, setRevised] = useState<CvFull | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloadingDocx, setDownloadingDocx] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session.revisedCvId) return
    api
      .get<{ cv: CvFull }>(`/api/cv/${session.revisedCvId}`)
      .then((r) => setRevised(r.data.cv))
      .catch(() => {})
  }, [session.revisedCvId])

  const hasDesignDocx = Boolean(revised?.fileKey?.toLowerCase().endsWith(".docx"))

  async function downloadOriginalDocx() {
    if (!revised) return
    setDownloadingDocx(true)
    try {
      const res = await api.get<Blob>(`/api/cv/${revised.id}/file`, { responseType: "blob" })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement("a")
      const slug = revised.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cv"
      a.href = url
      a.download = `${slug}-v${revised.version}-dilirik.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDownloadingDocx(false)
    }
  }

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
    <Card tape="red" pin className="relative space-y-6 text-center py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="inline-block bg-green text-paper p-4 rounded-full shadow-paper"
      >
        <FiCheckCircle className="h-12 w-12" />
      </motion.div>

      <div>
        <h2 className="hand text-4xl font-bold">Revisi CV Siap Digunakan! 🎉</h2>
        <p className="scrawl text-muted text-xl mt-1">
          Tersimpan sebagai <strong className="text-ink">{revised ? `${revised.title} (v${revised.version})` : "Versi Baru"}</strong>. Master CV asli kamu tetap aman.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {hasDesignDocx && (
          <Button onClick={downloadOriginalDocx} isLoading={downloadingDocx} variant="primary">
            {downloadingDocx ? "Menyiapkan DOCX…" : "⬇ DOCX (desain asli)"}
          </Button>
        )}
        {revised && (
          <DownloadCvButton rawText={revised.rawText} title={revised.title} version={revised.version} language={revised.language} />
        )}
        {revised && <CopyButton text={revised.rawText} label="📋 Salin Semua Teks Revisi" />}
        {session.revisedCvId && session.cvId && (
          <Link href={`/app/cv/${session.revisedCvId}/compare?with=${session.cvId}`}>
            <Button variant="outline" icon={<FiLayers />}>
              Compare Sebelum / Sesudah
            </Button>
          </Link>
        )}
      </div>

      <p className="text-muted mx-auto max-w-xl text-xs leading-relaxed">
        {hasDesignDocx
          ? "🎨 DOCX di atas adalah file asli kamu yang teksnya direvisi — desain, font, dan tabel tidak diubah sama sekali. Buka di Word lalu save-as-PDF untuk hasil akhir."
          : "🎨 Catatan jujur: PDF di atas dirender ulang pakai template Dilirik (file PDF tidak menyimpan struktur desain, jadi tidak bisa diedit langsung). Untuk mempertahankan desain 100%: salin teks revisi ke file Word/Canva asli kamu — atau lain kali upload CV versi .docx agar Dilirik merevisi file-nya langsung."}
      </p>

      {session.applicationId ? (
        <p className="scrawl text-green text-2xl font-bold">
          Tersimpan ke Tracker Lamaran ✓{" "}
          <Link href="/app/applications" className="underline text-ink hover:text-green">
            Lihat Semua Lamaran
          </Link>
        </p>
      ) : (
        <Button onClick={saveApplication} isLoading={busy} variant="primary" size="lg">
          {busy ? "Menyiapkan…" : `📌 ${t("saveToTracker")}`}
        </Button>
      )}
      {error && <p className="text-red text-xs font-semibold">{error}</p>}

      <p className="text-muted text-xs">
        Sesi ini otomatis masuk ke riwayat — kamu bisa memulai sesi baru kapan saja dari halaman Analisis.
      </p>
    </Card>
  )
}
