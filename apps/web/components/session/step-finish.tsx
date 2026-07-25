"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FiCheckCircle, FiLayers } from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DownloadCvButton } from "@/components/pdf/download-cv-button"
import { useToast } from "@/components/ui/toast"
import type { CvFull, Patch, SessionDetail } from "./types"

export function StepFinish({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const { toast } = useToast()
  const [revised, setRevised] = useState<CvFull | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session.revisedCvId) return
    api
      .get<{ cv: CvFull }>(`/api/cv/${session.revisedCvId}`)
      .then((r) => setRevised(r.data.cv))
      .catch(() => {})
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
      toast("Berhasil disimpan ke Tracker Pelamaran!", "success")
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card tape="red" pin className="relative space-y-6 text-center py-10 px-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
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
        {revised && (
          <DownloadCvButton rawText={revised.rawText} title={revised.title} version={revised.version} language={revised.language} />
        )}
        {session.revisedCvId && session.cvId && (
          <Link href={`/app/cv/${session.revisedCvId}/compare?with=${session.cvId}`}>
            <Button variant="outline" icon={<FiLayers />}>
              Compare Sebelum / Sesudah
            </Button>
          </Link>
        )}
      </div>

      <div className="pt-4 border-t border-line">
        {session.applicationId ? (
          <div className="p-3 rounded-xl border border-green bg-green/10 text-green font-bold text-sm flex items-center justify-center gap-2">
            <FiCheckCircle /> Tersimpan ke Tracker Pelamaran ·{" "}
            <Link href="/app/applications" className="underline">
              Lihat Pipeline
            </Link>
          </div>
        ) : (
          <Button onClick={saveApplication} isLoading={busy} variant="yellow" size="lg" className="w-full sm:w-auto">
            📌 Simpan Ke Tracker Pelamaran
          </Button>
        )}
      </div>

      {error && <p className="text-red text-xs font-semibold">{error}</p>}
    </Card>
  )
}
