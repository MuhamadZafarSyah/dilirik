"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { FiMic, FiPlus, FiClock, FiAward, FiArrowRight, FiZap, FiTrash2, FiPlay } from "react-icons/fi"
import { INTERVIEW_PERSONA_LABELS, type InterviewPersona, type InterviewStatus } from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type InterviewListItem = {
  id: string
  status: InterviewStatus
  persona: InterviewPersona
  language: string
  title: string
  durationSec: number
  createdAt: string
  overallScore: number | null
}

type InterviewQuota = { quota: number | null; used: number; remaining: number | null; resetAt: string }

const STATUS_BADGES: Record<InterviewStatus, { labelId: string; labelEn: string; color: string }> = {
  CREATED: { labelId: "Belum Mulai", labelEn: "Not Started", color: "bg-yellow/20 text-ink border-yellow/60" },
  LIVE: { labelId: "Sedang Berlangsung", labelEn: "In Progress", color: "bg-red/20 text-red border-red/60 animate-pulse" },
  ENDED: { labelId: "Menunggu Feedback", labelEn: "Feedback Pending", color: "bg-blue/20 text-blue border-blue/60" },
  FEEDBACK_READY: { labelId: "Feedback Siap", labelEn: "Feedback Ready", color: "bg-green/20 text-green border-green/60" },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function getScoreBadgeColor(score: number | null) {
  if (score === null) return "bg-panel text-muted border-line"
  if (score >= 85) return "bg-green/20 text-green border-green"
  if (score >= 70) return "bg-yellow/30 text-ink border-yellow"
  return "bg-red/20 text-red border-red"
}

function cleanEmoji(str: string): string {
  if (!str) return "🎙️"
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
  } catch {
    return str
  }
}

export default function InterviewListPage() {
  const { lang, t } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [sessionToDelete, setSessionToDelete] = useState<InterviewListItem | null>(null)

  const listQuery = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => (await api.get<{ sessions: InterviewListItem[] }>("/api/interview/sessions")).data.sessions,
  })
  const quotaQuery = useQuery({
    queryKey: ["interview-quota"],
    queryFn: async () => (await api.get<InterviewQuota>("/api/interview/quota")).data,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/interview/sessions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] })
      queryClient.invalidateQueries({ queryKey: ["interview-quota"] })
      toast("Sesi interview berhasil dihapus.", "success")
    },
    onError: (err) => toast(errorMessage(err), "error"),
  })

  const sessions = listQuery.data ?? []
  const quota = quotaQuery.data
  const quotaHabis = quota ? quota.remaining !== null && quota.remaining <= 0 : false

  // Stats calculation
  const completedSessions = sessions.filter((s) => s.overallScore !== null)
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((acc, curr) => acc + (curr.overallScore ?? 0), 0) / completedSessions.length)
    : null

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-5xl space-y-8 p-4 md:p-8"
    >
      {/* Header & CTA */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-line pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="label bg-yellow/40 text-ink px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              🎮 Simulation Hub
            </span>
            {quota && (
              <span className="label bg-panel border border-line text-muted px-3 py-1 rounded-full text-xs font-bold">
                {quota.remaining === null
                  ? "⚡ Unlimited Quota"
                  : `⚡ Sisa Kuota: ${quota.remaining}/${quota.quota}`}
              </span>
            )}
          </div>
          <h1 className="hand text-4xl sm:text-5xl font-bold text-ink">
            🎙️ {lang === "id" ? "Arena Latihan Interview AI" : "AI Voice Interview Arena"}
          </h1>
          <p className="scrawl text-muted text-xl max-w-2xl">
            {lang === "id"
              ? "Uji kemampuan menjawab pertanyaan HR & Tech Lead lewat percakapan suara live!"
              : "Test your interview skills with real-time voice AI interviewers!"}
          </p>
        </div>

        <Link href="/app/interview/new" className="shrink-0">
          <Button variant="danger" size="lg" icon={<FiPlus />} tape="red" disabled={quotaHabis} className="w-full md:w-auto font-bold">
            {lang === "id" ? "Mulai Latihan Baru 🔥" : "New Practice Match 🔥"}
          </Button>
        </Link>
      </motion.div>

      {/* Quota Exhausted Warning */}
      {quotaHabis && (
        <motion.div variants={itemVariants}>
          <Sticky tone="red" className="text-center py-4 space-y-2">
            <p className="hand text-2xl font-bold text-red">
              {lang === "id"
                ? "⚠️ Kuota latihan bulan ini telah terpakai habis!"
                : "⚠️ Monthly practice quota exhausted!"}
            </p>
            <p className="text-xs text-muted">
              Kuota akan ter-reset otomatis awal bulan depan.
            </p>
          </Sticky>
        </motion.div>
      )}

      {/* Gamified Summary Stats Widgets */}
      {sessions.length > 0 && (
        <motion.div variants={itemVariants} className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          <Card tape="yellow" pin className="p-4 text-center space-y-1">
            <span className="label text-muted text-[10px] uppercase font-bold">Total Latihan</span>
            <p className="hand text-4xl font-bold text-ink">{sessions.length}</p>
          </Card>
          <Card tape="blue" className="p-4 text-center space-y-1">
            <span className="label text-muted text-[10px] uppercase font-bold">Rata-Rata Skor</span>
            <p className="hand text-4xl font-bold text-ink">{avgScore !== null ? avgScore : "—"}</p>
          </Card>
          <Card tape="red" className="p-4 text-center space-y-1 col-span-2 sm:col-span-1">
            <span className="label text-muted text-[10px] uppercase font-bold">Status Arena</span>
            <p className="hand text-3xl font-bold text-green">Siap Bertanding ⚡</p>
          </Card>
        </motion.div>
      )}

      {/* Sessions List Showcase */}
      {listQuery.isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-panel/60 border-2 border-line rounded-2xl p-4 shadow-paper" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <motion.div variants={itemVariants}>
          <EmptyState
            title={lang === "id" ? "Belum ada sesi latihan interview" : "No practice sessions yet"}
            ctaLabel={lang === "id" ? "🎙️ Mulai Latihan Pertama Kamu" : "🎙️ Start Your First Practice"}
            ctaHref="/app/interview/new"
            note={
              lang === "id"
                ? "Sesi berlangsung maksimal 10 menit — AI menyapa langsung via suara!"
                : "Sessions run up to 10 minutes — AI talks directly via live audio!"
            }
          />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="hand text-3xl font-bold text-ink flex items-center gap-2">
            📜 {lang === "id" ? "Daftar Riwayat Tanding" : "Match History List"}
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {sessions.map((session, i) => {
              const personaLabel = INTERVIEW_PERSONA_LABELS[session.persona]
              const statusBadge = STATUS_BADGES[session.status]
              const href =
                session.status === "CREATED" || session.status === "LIVE"
                  ? `/app/interview/${session.id}/live`
                  : `/app/interview/${session.id}`

              const tapeColor = i % 3 === 0 ? "yellow" : i % 3 === 1 ? "blue" : "red"

              return (
                <motion.div
                  key={session.id}
                  variants={itemVariants}
                  className="h-full"
                >
                  <Card
                    tape={tapeColor}
                    rotate={i % 2 === 0 ? 0.4 : -0.4}
                    className="p-5 space-y-4 h-full flex flex-col justify-between hover:border-ink hover:shadow-lift transition-all"
                  >
                    {/* Card Header & Content */}
                    <div className="space-y-3">
                      {/* Badges Bar */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="label bg-yellow/30 border border-yellow/70 text-ink rounded-lg px-2.5 py-0.5 text-xs font-bold flex items-center gap-1">
                          <span className="text-base">{cleanEmoji(personaLabel?.emoji ?? "🎙️")}</span>
                          {lang === "id" ? personaLabel?.id : personaLabel?.en}
                        </span>

                        <span className={cn("label px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border", statusBadge.color)}>
                          {lang === "id" ? statusBadge.labelId : statusBadge.labelEn}
                        </span>
                      </div>

                      {/* Title */}
                      <div>
                        <Link href={href} className="group/title">
                          <h3 className="hand text-2xl font-bold text-ink group-hover/title:text-red transition-colors flex items-center gap-2 line-clamp-1">
                            <FiMic className="text-red shrink-0 h-5 w-5" />
                            {session.title}
                          </h3>
                        </Link>
                        <p className="text-[11px] text-muted font-medium mt-1">
                          Disimpan {new Date(session.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      {/* Score & Duration Box */}
                      <div className="flex items-center justify-between gap-2 bg-paper/60 border border-line/60 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted font-semibold">
                          <FiClock className="h-4 w-4 text-ink" />
                          <span>{session.durationSec > 0 ? formatDuration(session.durationSec) : "0:00"}</span>
                        </div>

                        {session.overallScore !== null ? (
                          <div className={cn("px-2.5 py-0.5 rounded-lg border font-mono font-bold text-sm", getScoreBadgeColor(session.overallScore))}>
                            🎯 {session.overallScore}/100
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-muted italic">
                            Belum dinilai
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<FiTrash2 />}
                        onClick={() => setSessionToDelete(session)}
                        className="text-red hover:bg-red/10"
                        title="Hapus Sesi Interview"
                      >
                        Hapus
                      </Button>

                      <Link href={href}>
                        <Button
                          size="sm"
                          variant={session.status === "FEEDBACK_READY" ? "outline" : "danger"}
                          icon={session.status === "FEEDBACK_READY" ? <FiArrowRight /> : <FiPlay />}
                          className="font-bold"
                        >
                          {session.status === "FEEDBACK_READY" ? "Detail Feedback" : "Lanjutkan Sesi"}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Konfirmasi Hapus Sesi Interview */}
      <ConfirmDialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null)
        }}
        title="Hapus sesi interview ini?"
        description={
          sessionToDelete
            ? `Sesi interview "${sessionToDelete.title}" beserta transkrip dan feedback-nya akan dihapus permanen.`
            : "Sesi interview ini akan dihapus permanen."
        }
        confirmLabel="Ya, hapus sesi"
        onConfirm={async () => {
          if (sessionToDelete) await deleteMutation.mutateAsync(sessionToDelete.id).catch(() => {})
        }}
      />
    </motion.div>
  )
}
