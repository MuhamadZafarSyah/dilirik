"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiArrowLeft,
  FiMic,
  FiTrash2,
  FiAward,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiMessageSquare,
  FiZap,
  FiChevronDown,
} from "react-icons/fi"
import { scoreTone, type InterviewStatus } from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky, Polaroid } from "@/components/ui/card"
import { ScoreGauge } from "@/components/ui/gauge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type TranscriptEntry = { role: "interviewer" | "candidate"; text: string; at: number }
type Feedback = {
  overallScore: number
  summary: string
  strengths: string[]
  improvements: Array<{ point: string; example: string }>
  questionReviews: Array<{ question: string; answerSummary: string; feedback: string; score: number }>
}
type SessionDetail = {
  id: string
  title: string
  status: InterviewStatus
  durationSec: number
  createdAt: string
  transcriptJson: TranscriptEntry[] | null
  feedbackJson: Feedback | null
}

function getScoreRank(score: number) {
  if (score >= 90) return { rank: "🏆 S-TIER MAESTRO", color: "bg-yellow/40 text-ink border-yellow/80" }
  if (score >= 75) return { rank: "⭐ A-TIER SOLID", color: "bg-green/20 text-green border-green/50" }
  if (score >= 60) return { rank: "🛡️ B-TIER PROSPECT", color: "bg-blue/20 text-blue border-blue/50" }
  return { rank: "💪 C-TIER RECRUIT", color: "bg-red/20 text-red border-red/50" }
}

export default function InterviewResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { lang } = useI18n()
  const { toast } = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const autoTriggeredRef = useRef(false)

  const detailQuery = useQuery({
    queryKey: ["interview", id],
    queryFn: async () => (await api.get<{ session: SessionDetail }>(`/api/interview/sessions/${id}`)).data.session,
  })

  const feedbackMutation = useMutation({
    mutationFn: async () =>
      (await api.post<{ session: SessionDetail }>(`/api/interview/sessions/${id}/feedback`)).data.session,
    onSuccess: (session) => {
      queryClient.setQueryData(["interview", id], session)
      queryClient.invalidateQueries({ queryKey: ["interviews"] })
    },
    onError: (err) => toast(errorMessage(err), "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/api/interview/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] })
      toast(lang === "id" ? "Sesi latihan dihapus" : "Practice session deleted", "success")
      router.push("/app/interview")
    },
    onError: (err) => toast(errorMessage(err), "error"),
  })

  const session = detailQuery.data

  useEffect(() => {
    if (session?.status === "ENDED" && !session.feedbackJson && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true
      feedbackMutation.mutate()
    }
  }, [feedbackMutation, session])

  if (detailQuery.isLoading) return <p className="scrawl text-2xl text-center py-20">Memuat Hasil Latihan…</p>
  if (!session) return <p className="scrawl text-2xl text-center py-20">{lang === "id" ? "Sesi tidak ditemukan." : "Session not found."}</p>

  const feedback = session.feedbackJson
  const rank = feedback ? getScoreRank(feedback.overallScore) : null
  const durationMin = Math.round(session.durationSec / 60)

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-8">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <Link href="/app/interview" className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1">
          <FiArrowLeft /> {lang === "id" ? "Semua Riwayat Latihan" : "All Practice History"}
        </Link>
        <Button variant="outline" size="sm" icon={<FiTrash2 />} onClick={() => setConfirmDelete(true)}>
          {lang === "id" ? "Hapus Sesi" : "Delete Session"}
        </Button>
      </div>

      {/* Main Title & Gamified Badges */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label bg-yellow/40 border border-yellow/70 text-ink px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            🎙️ Sesi Interview Suara Live
          </span>
          {session.durationSec > 0 && (
            <span className="label bg-panel border border-line text-muted px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1">
              <FiClock className="h-3.5 w-3.5" /> {durationMin} Mins
            </span>
          )}
        </div>
        <h1 className="hand text-4xl sm:text-5xl font-bold text-ink">{session.title}</h1>
      </div>

      {/* Unfinished Session State */}
      {(session.status === "CREATED" || session.status === "LIVE") && (
        <Card tape="yellow" pin className="p-6 text-center space-y-4">
          <div className="inline-block bg-yellow text-ink p-3 rounded-full animate-bounce">
            <FiMic className="h-8 w-8" />
          </div>
          <h2 className="hand text-3xl font-bold">
            {lang === "id" ? "Sesi Ini Belum Selesai Ditandingkan! ⚡" : "This Match Session Isn't Finished Yet! ⚡"}
          </h2>
          <p className="scrawl text-muted text-lg max-w-md mx-auto">
            {lang === "id"
              ? "Masuk kembali ke ruang interview live untuk menjawab pertanyaan AI."
              : "Enter the live room again to respond to AI questions."}
          </p>
          <div className="pt-2">
            <Link href={`/app/interview/${session.id}/live`}>
              <Button variant="danger" size="lg" icon={<FiMic />} tape="red">
                {lang === "id" ? "Masuk ke Ruang Interview Live →" : "Enter Live Interview Room →"}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Generating Feedback Loader State */}
      {session.status === "ENDED" && !feedback && (
        <Card tape="blue" className="p-8 text-center space-y-3">
          <div className="inline-block animate-spin text-3xl">✨</div>
          <h2 className="hand text-3xl font-bold">
            {feedbackMutation.isPending
              ? lang === "id" ? "AI Coach Sedang Menilai Performa Kamu..." : "AI Coach is Scoring Your Performance..."
              : lang === "id" ? "Feedback Belum Dibuat" : "Feedback Not Generated Yet"}
          </h2>
          <p className="scrawl text-muted text-lg max-w-md mx-auto">
            Mengekstrak skor, kekuatan jawaban, dan area perbaikan spesifik.
          </p>
          {!feedbackMutation.isPending && (
            <div className="pt-2">
              <Button variant="primary" size="lg" icon={<FiZap />} onClick={() => feedbackMutation.mutate()}>
                {lang === "id" ? "✨ Buat Feedback Sekarang" : "✨ Generate Feedback Now"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Gamified Completed Feedback Showcase */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Main Leaderboard Score Hero Card */}
          <Card tape="red" pin className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <ScoreGauge score={feedback.overallScore} size={180} />

            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
                <span className={cn("label px-3 py-1 rounded-full text-xs font-bold uppercase border", rank?.color)}>
                  {rank?.rank}
                </span>
                <span className="label bg-ink text-paper px-3 py-1 rounded-full text-xs font-bold uppercase">
                  Hasil Evaluasi AI
                </span>
              </div>
              <h2 className="hand text-3xl sm:text-4xl font-bold text-ink">
                Rangkuman Performa Latihan
              </h2>
              <p className="text-muted text-xs sm:text-sm leading-relaxed">
                "{feedback.summary}"
              </p>
            </div>
          </Card>

          {/* Strengths & Weaknesses Gamified Sticky Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Strengths */}
            <Sticky tone="green" rotate={-0.8} className="p-6 space-y-3">
              <div className="flex items-center gap-2 border-b border-green/30 pb-2">
                <span className="text-2xl">💪</span>
                <h3 className="hand text-2xl font-bold text-ink">
                  {lang === "id" ? "Pencapaian & Poin Bagus" : "What Went Well"}
                </h3>
              </div>
              <ul className="space-y-2">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-medium text-ink">
                    <span className="text-green font-bold shrink-0 mt-0.5">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Sticky>

            {/* Improvements */}
            <Sticky tone="red" rotate={0.8} className="p-6 space-y-3">
              <div className="flex items-center gap-2 border-b border-red/30 pb-2">
                <span className="text-2xl">🎯</span>
                <h3 className="hand text-2xl font-bold text-ink">
                  {lang === "id" ? "Area Upgrade Skill" : "Needs Practice"}
                </h3>
              </div>
              <ul className="space-y-3">
                {feedback.improvements.map((imp, i) => (
                  <li key={i} className="space-y-1 text-xs">
                    <p className="font-bold text-ink flex items-center gap-1.5">
                      <span className="text-red font-bold">⚡</span> {imp.point}
                    </p>
                    <p className="p-2.5 bg-paper/80 border border-line rounded-lg font-mono text-[11px] text-muted italic">
                      “{imp.example}”
                    </p>
                  </li>
                ))}
              </ul>
            </Sticky>
          </div>

          {/* Per-Question Review Cards */}
          {feedback.questionReviews.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="hand text-sm md:text-3xl font-bold text-ink flex items-center gap-2">
                  📝 {lang === "id" ? "Review Pertanyaan demi Pertanyaan" : "Per-Question Review Breakdown"}
                </h2>
                <span className="label bg-yellow/40 text-ink px-2.5 py-0.5 rounded text-xs font-bold">
                  {feedback.questionReviews.length} Pertanyaan
                </span>
              </div>

              <div className="space-y-4">
                {feedback.questionReviews.map((qr, i) => (
                  <Card key={i} rotate={i % 2 === 0 ? 0.3 : -0.3} className="p-6 space-y-3">
                    <div className="flex items-start justify-between gap-4 border-b border-line/60 pb-3">
                      <h3 className="hand text-2xl font-bold text-ink">
                        {i + 1}. {qr.question}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="hand text-3xl font-bold text-ink">{qr.score}</span>
                        <span className="scrawl text-muted text-xs">/100</span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="space-y-1">
                        <span className="label text-[10px] uppercase font-bold text-muted">Ringkasan Jawaban Kamu:</span>
                        <p className="p-3 bg-paper/70 rounded-lg border border-line text-ink font-medium leading-relaxed">
                          {qr.answerSummary}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="label text-[10px] uppercase font-bold text-blue">Evaluasi & Saran AI:</span>
                        <p className="p-3 bg-blue/10 rounded-lg border border-blue/30 text-ink font-medium leading-relaxed">
                          {qr.feedback}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Transcript Log Section with Custom Scrollbar */}
      {Array.isArray(session.transcriptJson) && session.transcriptJson.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-line">
          <Button variant="outline" size="sm" icon={<FiMessageSquare />} onClick={() => setShowTranscript((v) => !v)}>
            {showTranscript
              ? lang === "id" ? "Sembunyikan Transkrip percakapan" : "Hide Audio Transcript"
              : lang === "id" ? "Lihat Transkrip Percakapan Lengkap 💬" : "Show Full Audio Transcript 💬"}
          </Button>

          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <Card tape="yellow" className="p-4 sm:p-6 mt-2">
                  <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    Transkrip Suara Live (Log Dialog)
                  </h3>
                  <div className="max-h-96 overflow-y-auto pr-2 space-y-3 text-xs custom-scrollbar">
                    {session.transcriptJson.map((entry, i) => {
                      const isInterviewer = entry.role === "interviewer"
                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-3 rounded-xl border max-w-xl space-y-1",
                            isInterviewer
                              ? "bg-paper border-line text-ink mr-auto"
                              : "bg-ink text-paper border-ink ml-auto",
                          )}
                        >
                          <span className="label text-[10px] uppercase font-bold block opacity-80">
                            {isInterviewer ? "🎙️ Pewawancara AI" : "🙋 Kamu"}
                          </span>
                          <p className="leading-relaxed font-medium">{entry.text}</p>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={lang === "id" ? "Hapus sesi latihan ini?" : "Delete this practice session?"}
        description={
          lang === "id"
            ? "Transkrip dan feedback sesi ini akan hilang permanen. Kuota yang sudah terpakai tidak kembali."
            : "The transcript and feedback will be gone permanently. Used quota is not refunded."
        }
        confirmLabel={lang === "id" ? "Hapus" : "Delete"}
        cancelLabel={lang === "id" ? "Batal" : "Cancel"}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
