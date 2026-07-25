"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  arrayBufferToBase64,
  computeRms,
  downsampleBuffer,
  floatTo16BitPcm,
  NoiseGate,
} from "@/lib/live/audio-utils"

/**
 * Tangkap mic → chunk PCM16 mono 16kHz base64 (T-M5-06).
 * ScriptProcessorNode dipakai secara sadar (deprecated tapi dukungannya paling
 * luas — sama dengan referensi Career-Vibe); buffer 4096 ≈ 85ms @48kHz.
 */
export function useMicCapture() {
  const [micLevel, setMicLevel] = useState(0)
  const [muted, setMutedState] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const gateRef = useRef(new NoiseGate())
  const mutedRef = useRef(false)

  const start = useCallback(async (onChunk: (base64Pcm16k: string) => void) => {
    if (contextRef.current) return // sudah berjalan
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    streamRef.current = stream
    const context = new AudioContext()
    contextRef.current = context
    await context.resume()

    const source = context.createMediaStreamSource(stream)
    const processor = context.createScriptProcessor(4096, 1, 1)
    sourceRef.current = source
    processorRef.current = processor
    gateRef.current.reset()

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0)
      const rms = computeRms(input)
      setMicLevel(mutedRef.current ? 0 : Math.min(1, rms * 12))
      if (mutedRef.current) return
      if (!gateRef.current.process(rms)) return // senyap → jangan kirim (hemat & bersih)
      const downsampled = downsampleBuffer(input, context.sampleRate, 16000)
      onChunk(arrayBufferToBase64(floatTo16BitPcm(downsampled)))
    }

    source.connect(processor)
    processor.connect(context.destination) // wajib tersambung agar onaudioprocess jalan
  }, [])

  const stop = useCallback(() => {
    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    void contextRef.current?.close().catch(() => undefined)
    processorRef.current = null
    sourceRef.current = null
    streamRef.current = null
    contextRef.current = null
    setMicLevel(0)
  }, [])

  const setMuted = useCallback((value: boolean) => {
    mutedRef.current = value
    setMutedState(value)
  }, [])

  useEffect(() => stop, [stop]) // cleanup saat unmount

  return { start, stop, micLevel, muted, setMuted }
}
