"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { FiMic, FiPlus } from "react-icons/fi"
import { INTERVIEW_PERSONA_LABELS, type InterviewPersona, type InterviewStatus } from "@dilirik/shared"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { useI18n } from "@/lib/i18n"

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

const STATUS_LABELS: Record<InterviewStatus, { id: string; en: string }> = {
  CREATED: { id: "Belum mulai", en: "Not started" },
  LIVE: { id: "Berlangsung", en: "In progress" },
  ENDED: { id: "Selesai — feedback belum dibuat", en: "Done — feedback pending" },
  FEEDBACK_READY: { id: "Feedback siap", en: "Feedback ready" },
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="scrawl text-3xl font-bold">🎙️ {t("interview")}</h1>
          <p className="mt-1 opacity-70">
            {lang === "id"
              ? "Latihan interview suara dengan pewawancara AI, lalu dapatkan feedback per jawaban."
              : "Practice voice interviews with an AI interviewer, then get per-answer feedback."}
          </p>
          {quota && (
            <p className="mt-1 text-sm opacity-60">
              {quota.remaining === null
                ? t("unlimited")
                : lang === "id"
                  ? `Sisa kuota bulan ini: ${quota.remaining}/${quota.quota}`
                  : `Quota left this month: ${quota.remaining}/${quota.quota}`}
            </p>
          )}
        </div>
        <Link href="/app/interview/new">
          <Button variant="primary" icon={<FiPlus />} disabled={quotaHabis}>
            {lang === "id" ? "Latihan Baru" : "New Practice"}
          </Button>
        </Link>
      </div>

      {quotaHabis && (
        <Card tape="red">
          <p className="font-bold">
            {lang === "id"
              ? "Kuota latihan bulan ini habis — reset otomatis awal bulan depan."
              : "You’ve used up this month’s practice quota — it resets at the start of next month."}
          </p>
        </Card>
      )}

      {listQuery.isLoading ? (
        <p className="opacity-70">{t("loading")}</p>
      ) : sessions.length === 0 ? (
        <EmptyState
          title={lang === "id" ? "Belum ada sesi latihan interview" : "No practice sessions yet"}
          ctaLabel={lang === "id" ? "🎙️ Mulai Latihan Pertamamu" : "🎙️ Start Your First Practice"}
          ctaHref="/app/interview/new"
          note={
            lang === "id"
              ? "Sesi berlangsung maksimal 10 menit — cukup untuk 5–8 pertanyaan."
              : "Sessions run up to 10 minutes — enough for 5–8 questions."
          }
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const personaLabel = INTERVIEW_PERSONA_LABELS[session.persona]
            const href =
              session.status === "CREATED" || session.status === "LIVE"
                ? `/app/interview/${session.id}/live`
                : `/app/interview/${session.id}`
            return (
              <Link key={session.id} href={href} className="block">
                <Card tape="yellow" className="transition hover:-translate-y-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        <FiMic className="mr-1 inline" />
                        {session.title}
                      </p>
                      <p className="mt-1 text-sm opacity-70">
                        {personaLabel.emoji} {lang === "id" ? personaLabel.id : personaLabel.en}
                        {" · "}
                        {lang === "id" ? STATUS_LABELS[session.status].id : STATUS_LABELS[session.status].en}
                        {session.durationSec > 0 ? ` · ${formatDuration(session.durationSec)}` : ""}
                        {" · "}
                        {new Date(session.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {session.overallScore !== null && (
                      <span className="scrawl text-2xl font-bold">{session.overallScore}</span>
                    )}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
