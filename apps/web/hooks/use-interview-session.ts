"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { INTERVIEW_CLOSING_PHRASES } from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { InterviewLiveClient } from "@/lib/live/live-client"
import { useAudioPlayback } from "./use-audio-playback"
import { useMicCapture } from "./use-mic-capture"

export type LivePhase = "idle" | "connecting" | "live" | "ending" | "ended" | "error"
export type TranscriptEntry = { role: "interviewer" | "candidate"; text: string; at: number }
type EndReason = "user" | "closing" | "timeout" | "connection"

type TokenResponse = {
  token: string
  model: string
  systemPrompt: string
  language: string
  maxDurationSec: number
}

const KICKOFF_TEXT = "(Sesi dimulai — sapa kandidat dengan singkat lalu ajukan pertanyaan pertamamu.)"

/**
 * Orkestrasi SATU sesi live (T-M5-09): ambil ephemeral token → connect →
 * mic in / audio out → kumpulkan transkrip → auto-end (tunggu giliran & audio penutup selesai penuh) →
 * simpan transkrip TEPAT SEKALI → redirect ke halaman hasil.
 */
export function useInterviewSession(sessionId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const mic = useMicCapture()
  const playback = useAudioPlayback()

  const [phase, setPhase] = useState<LivePhase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false)

  const clientRef = useRef<InterviewLiveClient | null>(null)
  const phaseRef = useRef<LivePhase>("idle")
  const savedRef = useRef(false)
  const endingRef = useRef(false)
  const closingDetectedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)
  const maxDurationRef = useRef(600)
  const inputBufferRef = useRef("") // ucapan kandidat (giliran berjalan)
  const outputBufferRef = useRef("") // ucapan pewawancara (giliran berjalan)
  const transcriptRef = useRef<TranscriptEntry[]>([])

  const setPhaseSafe = useCallback((p: LivePhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const pushEntry = useCallback((role: TranscriptEntry["role"], text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const at = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
    transcriptRef.current = [...transcriptRef.current, { role, text: trimmed, at }]
    setTranscript(transcriptRef.current)
  }, [])

  /** Commit buffer giliran berjalan ke transkrip (kandidat dulu, lalu pewawancara). */
  const commitBuffers = useCallback(() => {
    pushEntry("candidate", inputBufferRef.current)
    inputBufferRef.current = ""
    pushEntry("interviewer", outputBufferRef.current)
    outputBufferRef.current = ""
  }, [pushEntry])

  const endSession = useCallback(
    async (reason: EndReason) => {
      if (endingRef.current) return
      endingRef.current = true // guard: auto-end & tombol stop tidak boleh dobel
      setPhaseSafe("ending")
      if (timerRef.current) clearInterval(timerRef.current)
      mic.stop()

      if (reason === "closing") {
        // Biarkan seluruh suara penutup AI terputar hingga habis di speaker user
        await playback.waitUntilDrained(15000)
        await new Promise((r) => setTimeout(r, 1000))
      }

      clientRef.current?.disconnect()
      playback.dispose()
      commitBuffers()
      const durationSec = Math.min(
        maxDurationRef.current + 60,
        Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)),
      )
      try {
        if (!savedRef.current) {
          savedRef.current = true // transkrip disimpan TEPAT SEKALI
          await api.patch(`/api/interview/sessions/${sessionId}`, {
            transcriptJson: transcriptRef.current,
            durationSec,
          })
          queryClient.invalidateQueries({ queryKey: ["interviews"] })
          queryClient.invalidateQueries({ queryKey: ["interview", sessionId] })
        }
        setPhaseSafe("ended")
        router.push(`/app/interview/${sessionId}`)
      } catch (err) {
        savedRef.current = false // gagal simpan → user boleh coba "Akhiri" lagi
        endingRef.current = false
        setError(errorMessage(err))
        setPhaseSafe("error")
      }
    },
    [commitBuffers, mic, playback, queryClient, router, sessionId, setPhaseSafe],
  )

  const start = useCallback(async () => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "error") return
    setError(null)
    setPhaseSafe("connecting")
    try {
      const { data } = await api.post<TokenResponse>(`/api/interview/sessions/${sessionId}/token`)
      maxDurationRef.current = data.maxDurationSec

      const client = new InterviewLiveClient()
      clientRef.current = client
      await client.connect({
        token: data.token,
        model: data.model,
        systemInstruction: data.systemPrompt,
        language: data.language,
        callbacks: {
          onAudioChunk: (chunk) => {
            setInterviewerSpeaking(true)
            playback.enqueue(chunk)
          },
          onInputTranscript: (text) => {
            inputBufferRef.current += text
          },
          onOutputTranscript: (text) => {
            outputBufferRef.current += text
            // Tandai frasa penutup baku — tunggu giliran audio selesai penuh baru di-end
            const spoken = outputBufferRef.current.toLowerCase()
            if (!closingDetectedRef.current && INTERVIEW_CLOSING_PHRASES.some((p) => spoken.includes(p))) {
              closingDetectedRef.current = true
            }
          },
          onTurnComplete: () => {
            setInterviewerSpeaking(false)
            commitBuffers()
            // Jika frasa penutup terdeteksi & giliran selesai, akhiri sesi setelah audio drained
            if (closingDetectedRef.current && !endingRef.current) {
              void endSession("closing")
            }
          },
          onInterrupted: () => {
            playback.flush() // kandidat memotong — buang audio yang belum terputar
            setInterviewerSpeaking(false)
          },
          onError: (message) => {
            if (phaseRef.current === "connecting" || phaseRef.current === "live") setError(message)
          },
          onClose: () => {
            if (phaseRef.current === "live" && !endingRef.current) void endSession("connection")
          },
        },
      })

      startedAtRef.current = Date.now()
      await mic.start((chunk) => clientRef.current?.sendAudioChunk(chunk))
      client.sendKickoff(KICKOFF_TEXT)
      setPhaseSafe("live")

      timerRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000)
        setElapsedSec(elapsed)
        if (elapsed >= maxDurationRef.current && !endingRef.current) void endSession("timeout")
      }, 1000)
    } catch (err) {
      mic.stop()
      clientRef.current?.disconnect()
      setError(errorMessage(err))
      setPhaseSafe("error")
    }
  }, [commitBuffers, endSession, mic, playback, sessionId, setPhaseSafe])

  // Cleanup saat unmount — tanpa menyimpan (navigasi keluar ≠ mengakhiri sesi).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      clientRef.current?.disconnect()
    }
  }, [])

  return {
    phase,
    error,
    transcript,
    elapsedSec,
    maxDurationSec: maxDurationRef.current,
    interviewerSpeaking,
    micLevel: mic.micLevel,
    muted: mic.muted,
    setMuted: mic.setMuted,
    volume: playback.volume,
    setVolume: playback.setVolume,
    start,
    stop: () => void endSession("user"),
  }
}
