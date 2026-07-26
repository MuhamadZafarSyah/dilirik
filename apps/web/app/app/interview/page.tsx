"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { FiMic, FiPlus, FiClock, FiAward, FiArrowRight, FiZap } from "react-icons/fi"
import { INTERVIEW_PERSONA_LABELS, type InterviewPersona, type InterviewStatus } from "@dilirik/shared"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
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

export default function InterviewListPage() {
  const { lang, t } = useI18n()

  const listQuery = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => (await api.get<{ sessions: InterviewListItem[] }>("/api/interview/sessions")).data.sessions,
  })
  const quotaQuery = useQuery({
    queryKey: ["interview-quota"],
    queryFn: async () => (await api.get<InterviewQuota>("/api/interview/quota")).data,
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
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      {/* Header & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-line pb-6">
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
          <Button variant="danger" size="lg" icon={<FiPlus />} tape="red" disabled={quotaHabis} className="w-full md:w-auto">
            {lang === "id" ? "Mulai Latihan Baru 🔥" : "New Practice Match 🔥"}
          </Button>
        </Link>
      </div>

      {/* Quota Exhausted Warning */}
      {quotaHabis && (
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
      )}

      {/* Gamified Summary Stats Widgets */}
      {sessions.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          <Card tape="yellow" className="p-4 text-center space-y-1">
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
        </div>
      )}

      {/* Sessions List Showcase */}
      {listQuery.isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-panel/60 border-2 border-line rounded-2xl p-4 shadow-paper" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
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
      ) : (
        <div className="space-y-4">
          <h2 className="hand text-3xl font-bold text-ink flex items-center gap-2">
            📜 {lang === "id" ? "Daftar Riwayat Tanding" : "Match History List"}
          </h2>

          <div className="grid gap-4">
            {sessions.map((session, i) => {
              const personaLabel = INTERVIEW_PERSONA_LABELS[session.persona]
              const statusBadge = STATUS_BADGES[session.status]
              const href =
                session.status === "CREATED" || session.status === "LIVE"
                  ? `/app/interview/${session.id}/live`
                  : `/app/interview/${session.id}`

              return (
                <Link key={session.id} href={href} className="block group">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Card
                      tape={i % 3 === 0 ? "yellow" : i % 3 === 1 ? "blue" : "red"}
                      rotate={i % 2 === 0 ? 0.3 : -0.3}
                      className="p-5 sm:p-6 transition-all group-hover:border-ink group-hover:shadow-lift"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="hand text-2xl font-bold text-ink group-hover:text-red transition-colors flex items-center gap-2">
                              <FiMic className="text-red shrink-0" />
                              {session.title}
                            </span>
                            <span className={cn("label px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border", statusBadge.color)}>
                              {lang === "id" ? statusBadge.labelId : statusBadge.labelEn}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted font-medium">
                            <span className="flex items-center gap-1">
                              {personaLabel.emoji} {lang === "id" ? personaLabel.id : personaLabel.en}
                            </span>
                            {session.durationSec > 0 && (
                              <span className="flex items-center gap-1">
                                <FiClock className="h-3.5 w-3.5" /> {formatDuration(session.durationSec)}
                              </span>
                            )}
                            <span>
                              {new Date(session.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/50">
                          {session.overallScore !== null ? (
                            <div className="flex items-center gap-2">
                              <div className={cn("px-3 py-1 rounded-xl border font-mono font-bold text-lg", getScoreBadgeColor(session.overallScore))}>
                                {session.overallScore} <span className="text-xs text-muted font-sans font-normal">/100</span>
                              </div>
                            </div>
                          ) : (
                            <span className="label text-xs font-bold text-red group-hover:underline flex items-center gap-1">
                              Lanjutkan Sesi <FiArrowRight />
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
