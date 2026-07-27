"use client"

import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { FiMic, FiMicOff, FiPhoneOff, FiVolume2, FiMessageSquare } from "react-icons/fi"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useInterviewSession, type TranscriptEntry } from "@/hooks/use-interview-session"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type SessionDetail = { id: string; title: string; status: string; maxDurationSec: number }

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function VoiceVisualizer({
  interviewerSpeaking,
  micLevel,
  muted,
  lang,
}: {
  interviewerSpeaking: boolean
  micLevel: number
  muted: boolean
  lang: "id" | "en"
}) {
  const bars = [0.4, 0.7, 1.0, 0.6, 0.9, 0.5, 0.8]

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-4">
      {/* State Status Pill */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "label px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs border transition-colors",
            muted
              ? "bg-red/20 text-red border-red/60"
              : interviewerSpeaking
                ? "bg-blue/20 text-blue border-blue/60 animate-pulse"
                : "bg-green/20 text-green border-green/60"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              muted ? "bg-red" : interviewerSpeaking ? "bg-blue animate-ping" : "bg-green"
            )}
          />
          {muted
            ? lang === "id"
              ? "Microphone Dimatikan"
              : "Microphone Muted"
            : interviewerSpeaking
              ? lang === "id"
                ? "🗣️ Pewawancara AI Bicara..."
                : "🗣️ AI Interviewer Speaking..."
              : lang === "id"
                ? "🎙️ Giliran Kamu Bicara"
                : "🎙️ Your Turn to Speak"}
        </span>
      </div>

      {/* Center Avatar & Dynamic Waveform */}
      <div className="relative flex items-center justify-center gap-4 sm:gap-6 h-36">
        {/* Left Soundwave Bars */}
        <div className="flex items-center gap-1.5 h-16">
          {bars.slice(0, 3).map((factor, i) => {
            const h = muted
              ? 8
              : interviewerSpeaking
                ? 16 + Math.sin(i * 1.5) * 20
                : 8 + micLevel * 48 * factor
            return (
              <motion.div
                key={i}
                animate={{ height: Math.max(8, Math.min(56, h)) }}
                transition={{ duration: 0.08 }}
                className={cn(
                  "w-2 rounded-full border border-line transition-colors",
                  interviewerSpeaking ? "bg-blue" : micLevel > 0.08 ? "bg-green" : "bg-line/60"
                )}
              />
            )
          })}
        </div>

        {/* Center Pulsing Circle */}
        <motion.div
          animate={{
            scale: muted
              ? 1
              : interviewerSpeaking
                ? [1, 1.08, 1]
                : 1 + micLevel * 0.35,
          }}
          transition={{
            duration: interviewerSpeaking ? 0.6 : 0.08,
            repeat: interviewerSpeaking ? Infinity : 0,
          }}
          className={cn(
            "relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-ink shadow-paper transition-colors",
            muted
              ? "bg-red/10 border-red/60"
              : interviewerSpeaking
                ? "bg-blue/20 border-blue"
                : "bg-yellow/40 border-ink"
          )}
        >
          <span className="text-4xl select-none">
            {muted ? "🔇" : interviewerSpeaking ? "🗣️" : "🎙️"}
          </span>


        </motion.div>

        {/* Right Soundwave Bars */}
        <div className="flex items-center gap-1.5 h-16">
          {bars.slice(3).map((factor, i) => {
            const h = muted
              ? 8
              : interviewerSpeaking
                ? 16 + Math.cos(i * 1.5) * 20
                : 8 + micLevel * 48 * factor
            return (
              <motion.div
                key={i}
                animate={{ height: Math.max(8, Math.min(56, h)) }}
                transition={{ duration: 0.08 }}
                className={cn(
                  "w-2 rounded-full border border-line transition-colors",
                  interviewerSpeaking ? "bg-blue" : micLevel > 0.08 ? "bg-green" : "bg-line/60"
                )}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function InterviewLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang } = useI18n()
  const [confirmEnd, setConfirmEnd] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

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

  // Auto-scroll transkrip ke paling bawah
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [live.transcript])

  const remaining = session ? Math.max(0, session.maxDurationSec - live.elapsedSec) : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <h1 className="hand text-3xl sm:text-4xl font-bold text-ink flex items-center gap-2">
            🎙️ {session?.title ?? "Sesi Interview Suara"}
          </h1>
          <p className="scrawl text-muted text-lg mt-0.5">
            {lang === "id" ? "Bicara langsung dengan AI secara real-time" : "Speak out loud with real-time AI"}
          </p>
        </div>

        {live.phase === "live" && (
          <div className="label bg-yellow/40 border border-yellow/70 px-3 py-1.5 rounded-xl text-xs font-bold text-ink shrink-0 self-start sm:self-auto shadow-xs">
            {lang === "id" ? "Sisa Waktu" : "Time Left"}: <span className="font-mono text-sm">{formatClock(remaining)}</span>
          </div>
        )}
      </div>

      {/* Phase 1: Idle (Before Start) */}
      {live.phase === "idle" && (
        <Card tape="yellow" pin className="space-y-4 p-6 sm:p-8">
          <h2 className="hand text-2xl font-bold text-ink flex items-center gap-2">
            📋 {lang === "id" ? "Petunjuk Sebelum Mulai Arena" : "Before You Start"}
          </h2>
          <ul className="space-y-2 text-xs sm:text-sm text-ink font-medium">
            <li className="flex items-start gap-2">
              <span className="text-green font-bold">✓</span>
              <span>{lang === "id" ? "Gunakan earphone / headphone dan tempat yang tenang." : "Use headphones & find a quiet environment."}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green font-bold">✓</span>
              <span>{lang === "id" ? "Pewawancara AI akan menyapa terlebih dahulu — jawab dengan suara seperti interview sungguhan." : "AI interviewer speaks first — answer out loud naturally."}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green font-bold">✓</span>
              <span>{lang === "id" ? "Sesi akan tersimpan otomatis saat pewawancara menutup percakapan." : "Session transcript will save automatically when done."}</span>
            </li>
          </ul>
          <div className="pt-2 flex justify-center">
            <Button variant="danger" size="lg" icon={<FiMic />} tape="red" onClick={() => void live.start()} className="w-full sm:w-auto px-8">
              {lang === "id" ? "🔥 Mulai Interview Suara Live" : "🔥 Start Live Voice Interview"}
            </Button>
          </div>
        </Card>
      )}

      {/* Phase 2: Connecting */}
      {live.phase === "connecting" && (
        <Card tape="blue" className="text-center py-10 space-y-3">
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-4xl inline-block">
            🎙️
          </motion.div>
          <p className="hand text-2xl font-bold text-ink">
            {lang === "id" ? "Menghubungkan ke Pewawancara AI…" : "Connecting to AI Interviewer…"}
          </p>
          <p className="scrawl text-muted text-base">
            {lang === "id" ? "Izinkan akses mikrofon jika diminta browser kamu" : "Please allow mic access if prompted"}
          </p>
        </Card>
      )}

      {/* Phase 3 & 4: Live & Ending */}
      {(live.phase === "live" || live.phase === "ending") && (
        <div className="space-y-6">
          {/* Dynamic Waveform Visualizer */}
          <VoiceVisualizer
            interviewerSpeaking={live.interviewerSpeaking}
            micLevel={live.micLevel}
            muted={live.muted}
            lang={lang}
          />

          {/* Live Transcript Stream */}
          <Card tape="blue" className="space-y-3 p-5">
            <div className="flex items-center justify-between border-b border-line/60 pb-2">
              <span className="label text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <FiMessageSquare className="h-3.5 w-3.5 text-blue" />
                {lang === "id" ? "Transkrip Live Percakapan" : "Live Conversation Transcript"}
              </span>
              <span className="label bg-panel border border-line px-2 py-0.5 rounded text-[10px] text-muted font-bold">
                {live.transcript.length} Pesan
              </span>
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto pr-1 text-xs sm:text-sm custom-scrollbar">
              {live.transcript.length === 0 ? (
                <p className="scrawl text-muted text-base py-4 text-center">
                  {lang === "id" ? "Transkrip ucapan akan muncul di sini secara real-time…" : "Transcript appears here in real-time…"}
                </p>
              ) : (
                live.transcript.map((entry: TranscriptEntry, i: number) => {
                  const isAi = entry.role === "interviewer"
                  return (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-2xl border-2 space-y-1 max-w-[88%]",
                        isAi
                          ? "bg-blue/10 border-blue/40 text-ink mr-auto"
                          : "bg-paper border-line text-ink ml-auto"
                      )}
                    >
                      <span className="label text-[10px] font-bold uppercase tracking-wider block text-muted">
                        {isAi ? (lang === "id" ? "🗣️ Pewawancara AI" : "🗣️ AI Interviewer") : (lang === "id" ? "🎙️ Kamu" : "🎙️ You")}
                      </span>
                      <p className="font-semibold leading-relaxed">{entry.text}</p>
                    </div>
                  )
                })
              )}
              <div ref={transcriptEndRef} />
            </div>
          </Card>

          {/* Control Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 bg-panel border-2 border-line rounded-2xl p-4 shadow-paper">
            <Button
              variant={live.muted ? "danger" : "secondary"}
              size="sm"
              icon={live.muted ? <FiMicOff /> : <FiMic />}
              onClick={() => live.setMuted(!live.muted)}
              disabled={live.phase !== "live"}
            >
              {live.muted ? (lang === "id" ? "Unmute Mic" : "Unmute Mic") : (lang === "id" ? "Mute Mic" : "Mute Mic")}
            </Button>

            <div className="flex items-center gap-2 bg-paper border border-line px-3 py-1.5 rounded-xl shadow-xs">
              <FiVolume2 className="h-4 w-4 text-muted shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={live.volume}
                onChange={(e) => live.setVolume(Number(e.target.value))}
                className="w-24 accent-ink cursor-pointer"
              />
            </div>

            <Button
              variant="danger"
              size="sm"
              icon={<FiPhoneOff />}
              onClick={() => setConfirmEnd(true)}
              isLoading={live.phase === "ending"}
              disabled={live.phase !== "live"}
            >
              {lang === "id" ? "Akhiri Interview" : "End Session"}
            </Button>
          </div>
        </div>
      )}

      {/* Phase 5: Ended / Transitioning (Fixes Blank Screen Bug!) */}
      {(live.phase === "ended" || (live.phase === "ending" && live.transcript.length === 0)) && (
        <Card tape="yellow" className="text-center py-10 space-y-3">
          <motion.div className="text-4xl inline-block">
            ⌛
          </motion.div>
          <h2 className="hand text-3xl font-bold text-ink">
            {lang === "id" ? "Sesi Selesai! Menyimpan Transkrip..." : "Session Complete! Saving Transcript..."}
          </h2>
          <p className="scrawl text-muted text-lg">
            {lang === "id" ? "Mengarahkan kamu ke halaman hasil & feedback..." : "Redirecting to your session results..."}
          </p>
        </Card>
      )}

      {/* Phase 6: Error */}
      {live.phase === "error" && (
        <Sticky tone="red" rotate={-0.5} className="p-6 space-y-3 text-center">
          <p className="hand text-2xl font-bold text-red">{live.error ?? (lang === "id" ? "Ada masalah koneksi audio." : "Connection error occurred.")}</p>
          <div>
            <Button variant="secondary" size="sm" onClick={() => void live.start()}>
              {lang === "id" ? "Coba Sambungkan Lagi" : "Try Reconnecting"}
            </Button>
          </div>
        </Sticky>
      )}

      {/* Confirm End Dialog */}
      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title={lang === "id" ? "Akhiri sesi interview ini?" : "End this interview session?"}
        description={
          lang === "id"
            ? "Transkrip ucapan akan disimpan dan kamu akan langsung diarahkan ke analisis feedback."
            : "The transcript will be saved and you will be redirected to feedback analysis."
        }
        confirmLabel={lang === "id" ? "Ya, Akhiri" : "Yes, End"}
        cancelLabel={lang === "id" ? "Lanjutkan Sesi" : "Continue"}
        onConfirm={() => {
          setConfirmEnd(false)
          live.stop()
        }}
      />
    </div>
  )
}
