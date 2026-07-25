"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { FiZap, FiPlus, FiTrash2, FiArrowRight, FiCheckCircle, FiClock } from "react-icons/fi"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
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
  JOB: "2/5 · Input Lowongan",
  REVIEW: "3/5 · Hasil Analisis",
  REVISE: "4/5 · Revisi Teks",
  FINISH: "5/5 · Selesai",
}

function AnalyzeHub() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const cvIdParam = searchParams.get("cvId")
  const jobIdParam = searchParams.get("jobId")
  const [sessionToDelete, setSessionToDelete] = useState<SessionItem | null>(null)

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data } = await api.get<{ sessions: SessionItem[] }>("/api/sessions")
      return data.sessions
    },
  })
  const sessions = sessionsQuery.data ?? null

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ session: { id: string } }>("/api/sessions", {})
      const patchData: Record<string, unknown> = {}
      if (cvIdParam) patchData.cvId = cvIdParam
      if (jobIdParam) patchData.jobPostingId = jobIdParam
      if (cvIdParam && !jobIdParam) patchData.step = "JOB"
      if (cvIdParam && jobIdParam) patchData.step = "REVIEW"

      if (Object.keys(patchData).length > 0) {
        await api.patch(`/api/sessions/${data.session.id}`, patchData)
      }
      return data.session.id
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      router.push(`/app/analyze/session/${sessionId}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/sessions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      toast("Draft sesi dihapus. CV & lowongan tetap aman.", "success")
    },
    onError: (err) => toast(errorMessage(err), "error"),
  })

  const busy = startMutation.isPending
  const error = sessionsQuery.isError
    ? errorMessage(sessionsQuery.error)
    : startMutation.error
      ? errorMessage(startMutation.error)
      : null

  const drafts = (sessions ?? []).filter((s) => s.status === "DRAFT")
  const completed = (sessions ?? []).filter((s) => s.status === "COMPLETED").slice(0, 5)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="hand text-4xl sm:text-5xl font-bold flex items-center gap-2">
          Analisis Match CV ⚡
        </h1>
        <p className="scrawl text-muted text-xl mt-1">
          Satu sesi interaktif utuh: Pilih CV → Tempel lowongan → Lihat Skor AI → Revisi Teks → Export PDF & Simpan Lamaran.
        </p>
      </div>

      {/* Start New Session Hero Card */}
      <Card tape="red" pin className="text-center py-8 px-6 space-y-4">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 2 }}
          className="inline-block bg-red text-paper p-4 rounded-full shadow-paper"
        >
          <FiZap className="h-10 w-10" />
        </motion.div>
        <div>
          <h2 className="hand text-3xl font-bold">Mulai Sesi Analisis Baru</h2>
          <p className="text-muted text-sm max-w-md mx-auto mt-1">
            Progres kamu tersimpan otomatis sebagai draft. Kamu bisa keluar kapan saja tanpa takut kehilangan data.
          </p>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => startMutation.mutate()}
            isLoading={busy}
            variant="danger"
            size="lg"
            className="w-full sm:w-auto px-8"
          >
            ⚡ Mulai Sesi Analisis Sekarang
          </Button>
        </div>
        {error && <p className="text-red text-xs font-semibold">{error}</p>}
      </Card>

      {/* Active Draft Sessions */}
      <section className="space-y-4">
        <h2 className="scrawl text-2xl font-bold flex items-center gap-2">
          <FiClock className="text-yellow" /> Draft Sesi Tersimpan
        </h2>

        {sessions === null ? (
          <p className="scrawl text-muted text-lg">{t("loading")}</p>
        ) : drafts.length === 0 ? (
          <Card className="text-center py-6">
            <p className="scrawl text-muted text-lg">Semua sesi kamu sudah selesai ✔︎ Belum ada draft aktif.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {drafts.map((s, i) => (
              <Card
                key={s.id}
                rotate={i % 2 === 0 ? 0.5 : -0.5}
                className="flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <span className="label bg-yellow/30 border border-yellow/60 text-ink rounded-md px-2.5 py-0.5 text-xs font-bold uppercase">
                    {STEP_LABELS[s.step]}
                  </span>
                  <p className="truncate text-base font-bold text-ink">
                    {s.cv ? `${s.cv.title} (v${s.cv.version})` : "CV Belum Dipilih"}
                    {" → "}
                    {s.job?.parsedJson?.jobTitle ?? "Lowongan Belum Diisi"}
                    {s.job?.parsedJson?.company ? ` @ ${s.job.parsedJson.company}` : ""}
                  </p>
                  <p className="text-muted text-xs">
                    Terakhir diubah {new Date(s.updatedAt).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/app/analyze/session/${s.id}`}>
                    <Button size="sm" variant="primary" icon={<FiArrowRight />}>
                      Lanjutkan
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<FiTrash2 />}
                    onClick={() => setSessionToDelete(s)}
                    className="text-red hover:bg-red/10"
                  >
                    Hapus
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Completed Sessions */}
      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="scrawl text-2xl font-bold flex items-center gap-2">
            <FiCheckCircle className="text-green" /> Sesi yang Tuntas ✔︎
          </h2>
          <div className="space-y-2">
            {completed.map((s) => (
              <div
                key={s.id}
                className="card bg-panel border-line flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-sm shadow-paper"
              >
                <p className="truncate font-bold">
                  {s.cv ? s.cv.title : "CV"} → {s.job?.parsedJson?.jobTitle ?? "Lowongan"}
                </p>
                <div className="flex items-center gap-3">
                  <Link href={`/app/analyze/session/${s.id}`} className="label text-xs font-bold underline">
                    Lihat Sesi
                  </Link>
                  {s.analysisId && (
                    <Link
                      href={`/app/analyze/${s.analysisId}`}
                      className="label text-xs font-bold text-red underline"
                    >
                      Detail Analisis
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Konfirmasi hapus draft — pengganti window.confirm */}
      <ConfirmDialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null)
        }}
        title="Hapus draft sesi ini?"
        description="CV & lowongan yang sudah tersimpan tidak ikut terhapus — hanya progres draft sesi ini yang hilang."
        confirmLabel="Ya, hapus draft"
        onConfirm={async () => {
          if (sessionToDelete) await deleteMutation.mutateAsync(sessionToDelete.id).catch(() => {})
        }}
      />
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<p className="scrawl text-2xl">Memuat Hub Analisis...</p>}>
      <AnalyzeHub />
    </Suspense>
  )
}
