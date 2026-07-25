"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FiArrowLeft, FiMic, FiTrash2 } from "react-icons/fi"
import { scoreTone, type InterviewStatus } from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"

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

  // Sesi selesai tapi feedback belum ada → auto-generate sekali.
  useEffect(() => {
    if (session?.status === "ENDED" && !session.feedbackJson && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true
      feedbackMutation.mutate()
    }
  }, [feedbackMutation, session])

  if (detailQuery.isLoading) return <p className="p-8 text-center opacity-70">Memuat…</p>
  if (!session) return <p className="p-8 text-center opacity-70">{lang === "id" ? "Sesi tidak ditemukan." : "Session not found."}</p>

  const feedback = session.feedbackJson
  const tone = feedback ? scoreTone(feedback.overallScore) : "yellow"

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/app/interview" className="inline-flex items-center gap-1 text-sm underline">
          <FiArrowLeft /> {lang === "id" ? "Semua Latihan" : "All Practices"}
        </Link>
        <Button variant="ghost" size="sm" icon={<FiTrash2 />} onClick={() => setConfirmDelete(true)}>
          {lang === "id" ? "Hapus" : "Delete"}
        </Button>
      </div>

      <h1 className="scrawl text-3xl font-bold">🎙️ {session.title}</h1>

      {(session.status === "CREATED" || session.status === "LIVE") && (
        <Card tape="yellow">
          <p className="font-bold">{lang === "id" ? "Sesi ini belum selesai." : "This session isn’t finished yet."}</p>
          <div className="mt-3">
            <Link href={`/app/interview/${session.id}/live`}>
              <Button variant="primary" icon={<FiMic />}>
                {lang === "id" ? "Masuk ke Ruang Interview" : "Enter Interview Room"}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {session.status === "ENDED" && !feedback && (
        <Card tape="blue">
          <p className="animate-pulse font-bold">
            {feedbackMutation.isPending
              ? lang === "id" ? "✨ Menilai jawabanmu & menyusun feedback…" : "✨ Scoring your answers & writing feedback…"
              : lang === "id" ? "Feedback belum dibuat." : "Feedback not generated yet."}
          </p>
          {!feedbackMutation.isPending && (
            <div className="mt-3">
              <Button variant="primary" onClick={() => feedbackMutation.mutate()}>
                {lang === "id" ? "✨ Buat Feedback" : "✨ Generate Feedback"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {feedback && (
        <>
          <Card tape={tone === "green" ? "yellow" : tone} pin>
            <div className="flex items-center gap-6">
              <span className="scrawl text-6xl font-bold">{feedback.overallScore}</span>
              <p>{feedback.summary}</p>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Sticky tone="green" rotate={-0.5}>
              <h2 className="mb-2 font-bold">💪 {lang === "id" ? "Yang Sudah Bagus" : "What Went Well"}</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Sticky>
            <Sticky tone="red" rotate={0.5}>
              <h2 className="mb-2 font-bold">🎯 {lang === "id" ? "Perlu Dilatih" : "Needs Practice"}</h2>
              <ul className="space-y-2 text-sm">
                {feedback.improvements.map((imp, i) => (
                  <li key={i}>
                    <span className="font-bold">{imp.point}</span>
                    <span className="mt-0.5 block italic opacity-80">“{imp.example}”</span>
                  </li>
                ))}
              </ul>
            </Sticky>
          </div>

          {feedback.questionReviews.length > 0 && (
            <Card tape="blue">
              <h2 className="mb-3 font-bold">📝 {lang === "id" ? "Review per Pertanyaan" : "Per-Question Review"}</h2>
              <div className="space-y-4">
                {feedback.questionReviews.map((qr, i) => (
                  <div key={i} className="border-b border-ink/10 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold">{i + 1}. {qr.question}</p>
                      <span className="scrawl shrink-0 text-xl font-bold">{qr.score}</span>
                    </div>
                    <p className="mt-1 text-sm opacity-70">{qr.answerSummary}</p>
                    <p className="mt-1 text-sm">{qr.feedback}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {Array.isArray(session.transcriptJson) && session.transcriptJson.length > 0 && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setShowTranscript((v) => !v)}>
            {showTranscript
              ? lang === "id" ? "Sembunyikan Transkrip" : "Hide Transcript"
              : lang === "id" ? "Lihat Transkrip Lengkap" : "Show Full Transcript"}
          </Button>
          {showTranscript && (
            <Card tape="yellow" className="mt-2">
              <div className="max-h-96 space-y-2 overflow-y-auto text-sm">
                {session.transcriptJson.map((entry, i) => (
                  <p key={i}>
                    <span className="font-bold">
                      {entry.role === "interviewer" ? (lang === "id" ? "Pewawancara" : "Interviewer") : (lang === "id" ? "Kamu" : "You")}:
                    </span>{" "}
                    {entry.text}
                  </p>
                ))}
              </div>
            </Card>
          )}
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
