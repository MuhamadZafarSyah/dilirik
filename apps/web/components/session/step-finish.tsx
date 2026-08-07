"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  FiArrowRight,
  FiAward,
  FiCheckCircle,
  FiFileText,
  FiHome,
  FiLayers,
  FiMic,
  FiPlusCircle,
} from "react-icons/fi"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, errorMessage } from "@/lib/api"
import { track } from "@/lib/analytics/track"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { DownloadCvMenu } from "@/components/pdf/download-cv-menu"
import { useI18n } from "@/lib/i18n"
import type { CvFull, Patch, SessionDetail } from "./types"

export function StepFinish({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const revisedQuery = useQuery({
    queryKey: ["cv", session.revisedCvId],
    enabled: Boolean(session.revisedCvId),
    queryFn: async () => {
      const { data } = await api.get<{ cv: CvFull }>(`/api/cv/${session.revisedCvId}`)
      return data.cv
    },
  })
  const revised = revisedQuery.data ?? null

  const hasDesignDocx = Boolean(revised?.fileKey?.toLowerCase().endsWith(".docx"))

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ application: { id: string } }>("/api/applications", {
        cvId: session.revisedCvId ?? session.cvId,
        jobPostingId: session.jobPostingId,
        ...(session.analysisId ? { analysisId: session.analysisId } : {}),
      })
      return data.application.id
    },
    onSuccess: async (applicationId) => {
      track("application_saved", { source: "analysis_session" })
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      await patch({ applicationId, status: "COMPLETED" })
    },
  })

  const busy = saveMutation.isPending
  const error = saveMutation.error ? errorMessage(saveMutation.error) : null

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-6">
      {/* Hero Success Header */}
      <Card tape="red" pin className="relative text-center py-8 px-6 sm:px-10  space-y-6">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="inline-block bg-green text-paper p-4 rounded-full shadow-paper border-2 border-ink"
        >
          <FiCheckCircle className="h-10 w-10 sm:h-12 sm:w-12" />

        </motion.div>

        <div className="space-y-2">
          <h2 className="hand text-3xl sm:text-4xl font-bold text-ink">
            Revisi CV Siap Digunakan! 🎉
          </h2>
          <p className="scrawl text-muted text-base sm:text-lg max-w-lg mx-auto">
            Tersimpan sebagai <strong className="text-ink underline">{revised ? `${revised.title} (v${revised.version})` : "Versi Baru"}</strong>. Master CV asli kamu tetap aman tanpa diubah.
          </p>
        </div>

        {/* Core Output Hub Container (Double-Bezel Layout) */}
        <div className="bg-panel border-2 border-line rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 max-w-2xl mx-auto text-left">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-paper border border-line rounded-lg text-ink font-bold text-xs">
                📄
              </span>
              <span className="label text-xs font-bold text-ink uppercase tracking-wider">
                Unduh & Salin Teks CV
              </span>
            </div>
            {revised && (
              <span className="text-[11px] font-mono font-bold text-muted bg-paper px-2 py-0.5 rounded border border-line">
                v{revised.version}
              </span>
            )}
          </div>

          {/* Action Row 1: Export Menu + Copy Text */}
          <div className="flex justify-center sm:justify-start">
            {revised && <DownloadCvMenu cv={revised} copyText={revised.rawText} />}
          </div>

          <p className="text-muted text-[11px] leading-relaxed text-center sm:text-left bg-paper/60 p-3 rounded-xl border border-line/60">
            {hasDesignDocx
              ? "🎨 File PDF & Word di atas menggunakan desain asli kamu — layout, font, dan format tabel tetap 100% dipertahankan."
              : "🎨 Catatan: PDF dirender memakai template Dilirik. Kamu juga bisa menyalin teks revisi langsung ke file Canva/Word asli kamu."}
          </p>

          {/* Action Row 2: Tracker Status */}
          <div className="pt-2 border-t border-line/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <p className="label text-xs font-bold text-ink">Tracker Lamaran Kerja</p>
              <p className="text-[11px] text-muted">Simpan ke daftar lamaran untuk melacak progress wawancara kamu.</p>
            </div>

            {session.applicationId ? (
              <div className="flex items-center gap-2 bg-green/10 text-green border border-green/30 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-bold font-mono">Tersimpan ✓</span>
                <Link href="/app/applications" className="text-xs font-bold text-ink underline hover:text-green">
                  Lihat Tracker →
                </Link>
              </div>
            ) : (
              <Button
                onClick={() => saveMutation.mutate()}
                isLoading={busy}
                variant="primary"
                size="sm"
                className="w-full sm:w-auto font-bold shrink-0"
              >
                {busy ? "Menyiapkan…" : `📌 ${t("saveToTracker")}`}
              </Button>
            )}
          </div>
          {error && <p className="text-red text-xs font-semibold text-center sm:text-left">{error}</p>}
        </div>
      </Card>

      {/* Recommended Next Steps (Clean 3-Card Grid) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="label text-xs font-bold uppercase text-muted tracking-wider">
            🚀 Langkah Selanjutnya (Opsional)
          </h3>
          <span className="text-[11px] text-muted font-medium">Pilih fitur tambahan yang dibutuhkan</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Tile 1: Cover Letter */}
          {session.jobPostingId && (
            <Card className="p-4 flex flex-col justify-between space-y-3 hover:border-ink transition-all hover:shadow-paper">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-ink font-bold text-sm">
                  <span className="p-1.5 bg-yellow/30 rounded-lg text-ink">✉️</span>
                  <span>Surat Lamaran</span>
                </div>
                <p className="text-muted text-xs leading-relaxed">
                  Buat Cover Letter AI yang disesuaikan secara khusus dengan posisi dan perusahaan target ini.
                </p>
              </div>
              <Link
                href={`/app/cover-letters?cvId=${session.revisedCvId ?? session.cvId ?? ""}&jobId=${session.jobPostingId}${session.analysisId ? `&analysisId=${session.analysisId}` : ""}`}
                className="w-full pt-1"
              >
                <Button variant="outline" size="sm" icon={<FiFileText />} className="w-full text-xs font-bold">
                  Buat Cover Letter →
                </Button>
              </Link>
            </Card>
          )}

          {/* Tile 2: Mock Interview */}
          {session.jobPostingId && (
            <Card className="p-4 flex flex-col justify-between space-y-3 hover:border-ink transition-all hover:shadow-paper">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-ink font-bold text-sm">
                  <span className="p-1.5 bg-yellow/30 rounded-lg text-ink">🎙️</span>
                  <span>Simulasi Interview</span>
                </div>
                <p className="text-muted text-xs leading-relaxed">
                  Latihan wawancara kerja AI interaktif untuk melatih jawaban pertanyaan posisi target ini.
                </p>
              </div>
              <Link
                href={`/app/interview/new?cvId=${session.revisedCvId ?? session.cvId ?? ""}&jobId=${session.jobPostingId}${session.analysisId ? `&analysisId=${session.analysisId}` : ""}`}
                className="w-full pt-1"
              >
                <Button variant="yellow" size="sm" icon={<FiMic />} className="w-full text-xs font-bold">
                  Mulai Interview →
                </Button>
              </Link>
            </Card>
          )}

          {/* Tile 3: Version Comparison */}
          {session.revisedCvId && session.cvId && (
            <Card className="p-4 flex flex-col justify-between space-y-3 hover:border-ink transition-all hover:shadow-paper">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-ink font-bold text-sm">
                  <span className="p-1.5 bg-panel border border-line rounded-lg text-ink">📊</span>
                  <span>Perbandingan CV</span>
                </div>
                <p className="text-muted text-xs leading-relaxed">
                  Bandingkan teks versi awal sebelum dan sesudah revisi secara side-by-side.
                </p>
              </div>
              <Link
                href={`/app/cv/${session.revisedCvId}/compare?with=${session.cvId}`}
                className="w-full pt-1"
              >
                <Button variant="outline" size="sm" icon={<FiLayers />} className="w-full text-xs font-bold">
                  Bandingkan Versi →
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* End Session Bar (Redirects to /app/analyze) */}
      <Sticky tone="yellow" className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
        <div className="text-center sm:text-left space-y-0.5">
          <p className="label text-xs font-bold uppercase text-ink">🏁 Selesai Dengan Sesi Ini?</p>
          <p className="text-xs text-muted">
            Kamu bisa mengakhiri sesi ini dan memulai analisis lowongan baru. Sesi ini tetap tersimpan di riwayat.
          </p>
        </div>
        <Link href="/app/analyze" className="w-full sm:w-auto shrink-0">
          <Button variant="primary" size="md" icon={<FiPlusCircle />} className="w-full sm:w-auto font-bold shadow-lift">
            Selesai & Mulai Sesi Baru →
          </Button>
        </Link>
      </Sticky>
    </div>
  )
}
