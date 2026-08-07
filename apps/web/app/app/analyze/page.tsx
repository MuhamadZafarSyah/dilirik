"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { FiZap, FiTrash2, FiArrowRight, FiCheckCircle, FiClock, FiAlertTriangle } from "react-icons/fi"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, errorMessage, type QuotaInfo } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
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
  JOB: "2/5 · Lowongan",
  REVIEW: "3/5 · Analisis",
  REVISE: "4/5 · Revisi",
  FINISH: "5/5 · Selesai",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 26 },
  },
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

  const quotaQuery = useQuery({
    queryKey: ["quota"],
    queryFn: async () => {
      const { data } = await api.get<QuotaInfo>("/api/analyze/quota")
      return data
    },
  })
  const quota = quotaQuery.data ?? null
  const isQuotaExhausted = quota !== null && quota.quota !== null && (quota.remaining ?? 0) <= 0

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
      if (isQuotaExhausted) {
        throw new Error("Kuota bulan ini habis. Draft sesi ini tersimpan aman.")
      }
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
      toast("Draft sesi berhasil dihapus.", "success")
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Minimalist Header */}
      <motion.div variants={itemVariants} className="space-y-1">
        <h1 className="hand text-3xl font-bold text-ink">
          Analisis Match CV ⚡
        </h1>
        <p className="scrawl text-muted text-lg">
          Bandingkan kualifikasi CV dengan lowongan target, dapatkan skor match & saran revisi.
        </p>
      </motion.div>

      {/* Red Quota Exhausted Banner at outermost list level */}
      {isQuotaExhausted && (
        <motion.div variants={itemVariants}>
          <Sticky tone="red" className="space-y-3 py-6 text-center shadow-paper">
            <FiAlertTriangle className="mx-auto h-10 w-10 text-red " />
            <h3 className="hand text-3xl font-bold">{t("quotaExhausted")}</h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              Draft sesi ini tersimpan aman. Kamu bisa melanjutkan lagi setelah kuota bulanan ter-reset.
            </p>
            <Link href="/pricing" className="inline-block mt-1">
              <Button variant="danger" size="md">
                Upgrade ke Pro (Unlimited)
              </Button>
            </Link>
          </Sticky>
        </motion.div>
      )}

      {/* Start New Session Hero Card (Hidden when quota is exhausted) */}
      {!isQuotaExhausted && (
        <motion.div variants={itemVariants}>
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
                className="w-full sm:w-auto px-8 font-bold"
              >
                ⚡ Mulai Sesi Analisis Sekarang
              </Button>
            </div>
            {error && <p className="text-red text-xs font-semibold">{error}</p>}
          </Card>
        </motion.div>
      )}

      {/* Active Draft Sessions */}
      <motion.section variants={itemVariants} className="space-y-3">
        <h2 className="hand text-2xl font-bold text-ink flex items-center gap-1.5">
          📌 Draft Sesi Berjalan ({drafts.length})
        </h2>

        {sessions === null ? (
          <p className="scrawl text-muted text-base">{t("loading")}</p>
        ) : drafts.length === 0 ? (
          <Card className="text-center py-6">
            <p className="scrawl text-muted text-base">Belum ada draft aktif.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {drafts.map((s, i) => (
              <motion.div key={s.id} whileHover={{ scale: 1.005 }}>
                <Card
                  rotate={i % 2 === 0 ? 0.3 : -0.3}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:border-ink transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="label bg-yellow/40 border border-yellow/70 text-ink rounded px-2 py-0.5 text-[10px] font-bold uppercase">
                        {STEP_LABELS[s.step]}
                      </span>
                      {isQuotaExhausted && !s.analysisId && (
                        <span className="label bg-red/15 text-red border border-red/40 rounded px-2 py-0.5 text-[10px] font-bold uppercase">
                          Butuh Kuota
                        </span>
                      )}
                      <span className="text-[10px] text-muted">
                        {new Date(s.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="hand text-xl font-bold text-ink truncate">
                      {s.cv ? `${s.cv.title} (v${s.cv.version})` : "CV Belum Dipilih"}
                      <span className="text-muted font-sans text-xs mx-1">➔</span>
                      {s.job?.parsedJson?.jobTitle ?? "Lowongan Belum Diisi"}
                      {s.job?.parsedJson?.company ? ` @ ${s.job.parsedJson.company}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-line/40">
                    <Link
                      href={isQuotaExhausted && !s.analysisId ? "#" : `/app/analyze/session/${s.id}`}
                      onClick={(e) => {
                        if (isQuotaExhausted && !s.analysisId) {
                          e.preventDefault()
                          toast("Kuota bulan ini habis. Draft sesi ini tersimpan aman.", "error")
                          router.push("/pricing")
                        }
                      }}
                    >
                      <Button
                        size="sm"
                        variant={isQuotaExhausted && !s.analysisId ? "secondary" : "primary"}
                        icon={<FiArrowRight />}
                      >
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
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Completed Sessions */}
      {completed.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-2.5">
          <h2 className="hand text-2xl font-bold text-ink flex items-center gap-1.5">
            ✔︎ Riwayat Analisis Selesai
          </h2>
          <div className="space-y-2">
            {completed.map((s) => (
              <div
                key={s.id}
                className="bg-panel border border-line flex items-center justify-between gap-3 rounded-xl p-3 text-xs font-semibold shadow-xs"
              >
                <div className="truncate min-w-0">
                  <span className="text-ink font-bold">{s.cv ? s.cv.title : "CV"}</span>
                  <span className="text-muted mx-1">➔</span>
                  <span className="text-muted">{s.job?.parsedJson?.jobTitle ?? "Lowongan"}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link href={`/app/analyze/session/${s.id}`} className="label text-[11px] font-bold text-muted hover:text-ink">
                    Lihat Sesi
                  </Link>
                  {s.analysisId && (
                    <Link
                      href={`/app/analyze/${s.analysisId}`}
                      className="label text-[11px] font-bold text-ink hover:underline"
                    >
                      Detail Analisis →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Konfirmasi hapus draft */}
      <ConfirmDialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null)
        }}
        title="Hapus draft sesi ini?"
        description="CV & lowongan tersimpan tidak ikut terhapus."
        confirmLabel="Ya, hapus draft"
        onConfirm={async () => {
          if (sessionToDelete) await deleteMutation.mutateAsync(sessionToDelete.id).catch(() => { })
        }}
      />
    </motion.div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<p className="scrawl text-2xl">Memuat Hub Analisis...</p>}>
      <AnalyzeHub />
    </Suspense>
  )
}
