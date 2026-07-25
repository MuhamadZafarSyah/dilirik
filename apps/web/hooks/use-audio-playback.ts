"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { base64ToArrayBuffer, pcm16ToFloat32 } from "@/lib/live/audio-utils"

const VOLUME_STORAGE_KEY = "dilirik:interview-volume"
const OUTPUT_SAMPLE_RATE = 24000 // output Gemini Live: PCM16 24kHz

/**
 * Playback suara pewawancara (T-M5-07): tiap chunk dijadwalkan sekuensial
 * (nextStart) supaya mulus tanpa jeda/tabrakan, plus GainNode untuk volume
 * yang diingat di localStorage.
 */
export function useAudioPlayback() {
  const contextRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const nextStartRef = useRef(0)
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>())
  const volumeRef = useRef(1)
  const [volume, setVolumeState] = useState(1)

  useEffect(() => {
    const saved = window.localStorage.getItem(VOLUME_STORAGE_KEY)
    const parsed = saved === null ? NaN : Number(saved)
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(1, Math.max(0, parsed))
      volumeRef.current = clamped
      setVolumeState(clamped)
    }
  }, [])

  const ensureContext = useCallback((): AudioContext => {
    if (!contextRef.current) {
      const context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
      const gain = context.createGain()
      gain.gain.value = volumeRef.current
      gain.connect(context.destination)
      contextRef.current = context
      gainRef.current = gain
    }
    return contextRef.current
  }, [])

  const enqueue = useCallback(
    (base64Pcm24k: string) => {
      const context = ensureContext()
      void context.resume().catch(() => undefined)
      const samples = pcm16ToFloat32(base64ToArrayBuffer(base64Pcm24k))
      if (samples.length === 0) return
      const buffer = context.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE)
      buffer.copyToChannel(samples, 0)
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(gainRef.current!)
      const startAt = Math.max(context.currentTime, nextStartRef.current)
      source.start(startAt)
      nextStartRef.current = startAt + buffer.duration
      sourcesRef.current.add(source)
      source.onended = () => sourcesRef.current.delete(source)
    },
    [ensureContext],
  )

  /** Interupsi (kandidat memotong) → buang antrean audio yang belum terputar. */
  const flush = useCallback(() => {
    sourcesRef.current.forEach((source) => {
      try {
        source.stop()
      } catch {
        // sudah berhenti — aman diabaikan
      }
    })
    sourcesRef.current.clear()
    if (contextRef.current) nextStartRef.current = contextRef.current.currentTime
  }, [])

  /** Tunggu antrean audio selesai terputar (untuk auto-end kalimat penutup). */
  const waitUntilDrained = useCallback(async (maxWaitMs = 15000) => {
    const startedAt = Date.now()
    while (Date.now() - startedAt < maxWaitMs) {
      const context = contextRef.current
      if (!context || nextStartRef.current <= context.currentTime + 0.05) return
      await new Promise((r) => setTimeout(r, 200))
    }
  }, [])

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value))
    volumeRef.current = clamped
    setVolumeState(clamped)
    if (gainRef.current) gainRef.current.gain.value = clamped
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped))
  }, [])

  const dispose = useCallback(() => {
    flush()
    void contextRef.current?.close().catch(() => undefined)
    contextRef.current = null
    gainRef.current = null
    nextStartRef.current = 0
  }, [flush])

  useEffect(() => dispose, [dispose]) // cleanup saat unmount

  return { enqueue, flush, waitUntilDrained, volume, setVolume, dispose }
}
