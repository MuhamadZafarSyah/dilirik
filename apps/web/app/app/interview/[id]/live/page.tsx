"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { FiMic, FiMicOff, FiPhoneOff } from "react-icons/fi"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useInterviewSession, type TranscriptEntry } from "@/hooks/use-interview-session"
import { useI18n } from "@/lib/i18n"

type SessionDetail = { id: string; title: string; status: string; maxDurationSec: number }

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export default function InterviewLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang } = useI18n()
  const [confirmEnd, setConfirmEnd] = useState(false)

  const detailQuery = useQuery({
    queryKey: ["interview", id],
    queryFn: async () => (await api.get<{ session: SessionDetail }>(`/api/interview/sessions/${id}`)).data.session,
  })

  const live = useInterviewSession(id)
  const session = detailQuery.data

  // Sesi sudah selesai → langsung ke halaman hasil.
  useEffect(() => {
    if (session && (session.status === "ENDED" || session.status === "FEEDBACK_READY")) {
      router.replace(`/app/interview/${id}`)
    }
  }, [id, router, session])

  const remaining = session ? Math.max(0, session.maxDurationSec - live.elapsedSec) : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="scrawl text-3xl font-bold">🎙️ {session?.title ?? "…"}</h1>
        {live.phase === "live" && (
          <p className="mt-1 text-sm opacity-70">
            {lang === "id" ? "Sisa waktu" : "Time left"}: <span className="font-bold">{formatClock(remaining)}</span>
          </p>
        )}
      </div>

      {live.phase === "idle" && (
        <Card tape="yellow">
          <h2 className="mb-2 font-bold">{lang === "id" ? "Sebelum mulai" : "Before you start"}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>{lang === "id" ? "Cari tempat tenang & izinkan akses microphone saat diminta." : "Find a quiet spot & allow microphone access when asked."}</li>
            <li>{lang === "id" ? "Pewawancara bicara duluan — jawab dengan suara seperti interview sungguhan." : "The interviewer speaks first — answer out loud like a real interview."}</li>
            <li>{lang === "id" ? "Sesi maksimal 10 menit dan berakhir otomatis saat pewawancara menutup." : "Sessions run up to 10 minutes and end automatically when the interviewer wraps up."}</li>
          </ul>
          <div className="mt-4 flex justify-center">
            <Button variant="primary" size="lg" icon={<FiMic />} onClick={() => void live.start()}>
              {lang === "id" ? "Mulai Sekarang" : "Start Now"}
            </Button>
          </div>
        </Card>
      )}

      {live.phase === "connecting" && (
        <Card tape="blue">
          <p className="animate-pulse text-center font-bold">
            {lang === "id" ? "Menghubungkan ke pewawancara…" : "Connecting to your interviewer…"}
          </p>
        </Card>
      )}

      {(live.phase === "live" || live.phase === "ending") && (
        <>
          {/* Visualizer sederhana: lingkaran membesar mengikuti suara */}
          <div className="flex justify-center py-4">
            <motion.div
              animate={{ scale: 1 + (live.interviewerSpeaking ? 0.25 : live.micLevel * 0.6) }}
              transition={{ duration: 0.12 }}
              className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-ink bg-paper-yellow shadow-lg"
            >
              <span className="text-4xl">{live.interviewerSpeaking ? "🗣️" : "🎙️"}</span>
            </motion.div>
          </div>

          {/* Transkrip live */}
          <Card tape="blue">
            <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {live.transcript.length === 0 ? (
                <p className="opacity-60">
                  {lang === "id" ? "Transkrip muncul di sini setelah giliran pertama selesai…" : "The transcript appears here after the first turn…"}
                </p>
              ) : (
                live.transcript.map((entry: TranscriptEntry, i: number) => (
                  <p key={i}>
                    <span className="font-bold">
                      {entry.role === "interviewer" ? (lang === "id" ? "Pewawancara" : "Interviewer") : (lang === "id" ? "Kamu" : "You")}:
                    </span>{" "}
                    {entry.text}
                  </p>
                ))
              )}
            </div>
          </Card>

          {/* Kontrol */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant={live.muted ? "danger" : "secondary"}
              icon={live.muted ? <FiMicOff /> : <FiMic />}
              onClick={() => live.setMuted(!live.muted)}
              disabled={live.phase !== "live"}
            >
              {live.muted ? (lang === "id" ? "Mic Mati" : "Muted") : "Mic"}
            </Button>
            <label className="flex items-center gap-2 text-sm">
              🔊
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={live.volume}
                onChange={(e) => live.setVolume(Number(e.target.value))}
                className="w-28 accent-ink"
              />
            </label>
            <Button
              variant="danger"
              icon={<FiPhoneOff />}
              onClick={() => setConfirmEnd(true)}
              isLoading={live.phase === "ending"}
              disabled={live.phase !== "live"}
            >
              {lang === "id" ? "Akhiri Sesi" : "End Session"}
            </Button>
          </div>
          {live.phase === "ending" && (
            <p className="text-center text-sm opacity-70">
              {lang === "id" ? "Menyimpan transkrip sesi…" : "Saving your session transcript…"}
            </p>
          )}
        </>
      )}

      {live.phase === "error" && (
        <Sticky tone="red" rotate={-0.5}>
          <p className="font-bold">{live.error ?? (lang === "id" ? "Ada masalah koneksi." : "Something went wrong.")}</p>
          <div className="mt-3">
            <Button variant="secondary" onClick={() => void live.start()}>
              {lang === "id" ? "Coba Lagi" : "Try Again"}
            </Button>
          </div>
        </Sticky>
      )}

      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title={lang === "id" ? "Akhiri sesi interview?" : "End this interview session?"}
        description={
          lang === "id"
            ? "Transkrip akan disimpan dan kamu langsung diarahkan ke halaman feedback."
            : "The transcript will be saved and you’ll be taken to the feedback page."
        }
        confirmLabel={lang === "id" ? "Akhiri" : "End"}
        cancelLabel={lang === "id" ? "Lanjut Dulu" : "Keep Going"}
        onConfirm={() => {
          setConfirmEnd(false)
          live.stop()
        }}
      />
    </div>
  )
}
